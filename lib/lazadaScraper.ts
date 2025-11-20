import puppeteer, { Browser, Page } from 'puppeteer';

export interface LazadaScraperOptions {
  headless?: boolean;
  timeout?: number;
  maxProducts?: number;
}

export interface ScrapedProduct {
  name: string;
  price: number;
  originalPrice: number | null;
  discount: string | null;
  rating: number | null;
  reviewCount: number;
  soldCount: string;
  itemId: string;
  shopName: string;
  location: string;
  imageUrl: string;
  productUrl: string;
  brand: string | null;
  inStock: boolean;
}

export class LazadaScraper {
  private browser: Browser | null = null;
  private options: LazadaScraperOptions;

  constructor(options: LazadaScraperOptions = {}) {
    this.options = {
      headless: true,
      timeout: 60000,
      maxProducts: 500,
      ...options
    };
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async scrapeShopPage(url: string): Promise<ScrapedProduct[]> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    const products: ScrapedProduct[] = [];
    
    try {
      await page.setViewport({ width: 1920, height: 1080 });
      
      console.log('Navigating to:', url);
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: this.options.timeout
      });

      // Wait a bit for page to fully load
      await this.delay(3000);

      // Try multiple product container selectors
      const productSelectors = [
        '.Bm3ON',
        '[data-qa-locator="product-item"]',
        '.gridItem',
        '.product-item',
        '.item-card'
      ];

      let workingSelector = '';
      for (const selector of productSelectors) {
        const count = await page.evaluate((sel) => {
          return document.querySelectorAll(sel).length;
        }, selector);
        
        console.log(`Selector "${selector}": ${count} products found`);
        
        if (count > 0) {
          workingSelector = selector;
          console.log(`✓ Using selector: ${selector}`);
          break;
        }
      }

      if (!workingSelector) {
        throw new Error('Could not find product elements on page');
      }

      let previousCount = 0;
      let stableCount = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = 100; // Increased for more products

      // Aggressive scrolling to load all products
      while (scrollAttempts < maxScrollAttempts) {
        // Check for "Load More" button and click it
        const loadMoreClicked = await page.evaluate(() => {
          const loadMoreButtons = [
            'button[class*="load"]',
            'button[class*="more"]',
            '.ant-pagination-next',
            '[class*="loadMore"]'
          ];
          
          for (const selector of loadMoreButtons) {
            const btn = document.querySelector(selector) as HTMLElement;
            if (btn && btn.offsetParent !== null) {
              btn.click();
              return true;
            }
          }
          return false;
        });

        if (loadMoreClicked) {
          console.log('Clicked "Load More" button');
          await this.delay(2000);
        }

        // Scroll down
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        // Wait for new content to load
        await this.delay(2000);

        // Count current products
        const currentCount = await page.evaluate((sel) => {
          return document.querySelectorAll(sel).length;
        }, workingSelector);

        console.log(`Scroll ${scrollAttempts + 1}: Found ${currentCount} products`);

        // Check if we're still loading new products
        if (currentCount === previousCount) {
          stableCount++;
          // If count hasn't changed for 5 attempts, we're done
          if (stableCount >= 5) {
            console.log('No new products loaded for 5 attempts, finishing...');
            break;
          }
        } else {
          stableCount = 0;
        }

        previousCount = currentCount;
        scrollAttempts++;

        // Also scroll back up a bit to trigger lazy loading
        if (scrollAttempts % 2 === 0) {
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight * 0.5);
          });
          await this.delay(1000);
        }
      }

      // Final scroll to top to ensure all images loaded
      await page.evaluate(() => window.scrollTo(0, 0));
      await this.delay(2000);

      // Extract all products
      console.log('Extracting product data...');
      const pageProducts = await page.evaluate((selector) => {
        const items = Array.from(document.querySelectorAll(selector));
        console.log(`Extracting ${items.length} products...`);
        
        return items.map((item, index) => {
          const getText = (selectors: string[]): string => {
            for (const sel of selectors) {
              const el = item.querySelector(sel);
              if (el?.textContent?.trim()) {
                return el.textContent.trim();
              }
            }
            return '';
          };

          const getAttr = (selectors: string[], attr: string): string => {
            for (const sel of selectors) {
              const el = item.querySelector(sel);
              const value = el?.getAttribute(attr);
              if (value) return value;
            }
            return '';
          };

          // Product name - try multiple selectors
          const name = getText([
            '.RfADt',
            '[class*="title"]',
            '[class*="name"]',
            'a[title]'
          ]) || `Unknown Product ${index + 1}`;
          
          // Price - try multiple selectors
          const priceText = getText([
            '.ooOxS',
            '._43F-s',
            '[class*="price"]',
            '.price'
          ]);
          const price = parseFloat(priceText.replace(/[₱,\s]/g, '')) || 0;
          
          // Original price
          const originalPriceText = getText([
            '.IaHHh',
            '[class*="origin"]',
            '[class*="original"]'
          ]);
          const originalPrice = originalPriceText ? parseFloat(originalPriceText.replace(/[₱,\s]/g, '')) : null;
          
          // Discount
          const discount = getText([
            '.WNoq3',
            '[class*="discount"]',
            '[class*="off"]'
          ]) || null;
          
          // Location
          const location = getText([
            '.oa6ri',
            '[class*="location"]',
            '[class*="region"]'
          ]) || '';
          
          // ⭐ SOLD COUNT - Using correct Lazada selector: ._1cEkb
          let soldCount = '';
          
          // Method 1: Lazada's specific sold count class
          soldCount = getText([
            '._1cEkb',           // Lazada's sold count container
            '._1cEkb span',      // First span inside (contains "10 sold")
            '.m2RZo',            // Backup selector
            '[class*="sold"]',   // Any class containing "sold"
          ]);
          
          // Method 2: Search all text for "X sold" pattern if not found
          if (!soldCount) {
            const allSpans = item.querySelectorAll('span');
            for (const span of Array.from(allSpans)) {
              const text = span.textContent?.trim() || '';
              // Match patterns like "10 sold", "1.3K sold", "20.0K sold"
              if (text.match(/^[\d.,]+[kK]?\s+sold$/i)) {
                soldCount = text;
                break;
              }
            }
          }
          
          // Clean up sold count (remove "sold" text)
          if (soldCount) {
            soldCount = soldCount.replace(/\s*sold\s*/gi, '').trim();
          }
          
          // Final fallback
          if (!soldCount || soldCount === '') {
            soldCount = '0';
          }
          
          // Rating
          const ratingText = getText([
            '.qzqFw',
            '[class*="rating"]',
            '.rating-score'
          ]);
          const rating = ratingText ? parseFloat(ratingText) : null;
          
          // Review count
          const reviewText = getText([
            '[class*="review"]'
          ]);
          const reviewMatch = reviewText.match(/\d+/);
          const reviewCount = reviewMatch ? parseInt(reviewMatch[0]) : 0;
          
          // Image
          const imageUrl = getAttr(['img'], 'src') || getAttr(['img'], 'data-src');
          
          // Product URL
          const productUrl = getAttr(['a'], 'href');
          
          // Extract item ID from URL
          const urlMatch = productUrl.match(/i(\d+)-/) || productUrl.match(/products\/[^\/]*-i(\d+)/);
          const itemId = urlMatch ? urlMatch[1] : '';

          // Shop name (might not be visible in grid view)
          const shopName = getText([
            '[class*="shop"]',
            '[class*="store"]'
          ]);

          return {
            name,
            price,
            originalPrice,
            discount,
            rating,
            reviewCount,
            soldCount,
            shopName,
            location,
            imageUrl,
            productUrl: productUrl.startsWith('http') ? productUrl : `https:${productUrl}`,
            brand: null,
            inStock: true,
            itemId
          };
        });
      }, workingSelector);

      await page.close();
      
      console.log(`Successfully extracted ${pageProducts.length} products`);
      
      // Log sample of sold counts for debugging
      const soldCountSamples = pageProducts.slice(0, 5).map(p => `"${p.soldCount}"`).join(', ');
      console.log(`Sample sold counts: ${soldCountSamples}`);
      
      return pageProducts;

    } catch (error) {
      await page.close();
      throw new Error(`Failed to scrape shop page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const lazadaScraper = new LazadaScraper();