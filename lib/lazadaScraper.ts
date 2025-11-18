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
      timeout: 30000,
      maxProducts: 100,
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

  async scrapeProductPage(url: string): Promise<ScrapedProduct> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    
    try {
      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to the page
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.options.timeout
      });

      // Wait for main content to load
      await page.waitForSelector('.pdp-mod-product-badge-wrapper', { timeout: 10000 }).catch(() => {});
      
      // Extract product data
      const productData = await page.evaluate(() => {
        // Helper function to get text content
        const getText = (selector: string): string => {
          const el = document.querySelector(selector);
          return el?.textContent?.trim() || '';
        };

        // Helper function to get attribute
        const getAttr = (selector: string, attr: string): string => {
          const el = document.querySelector(selector);
          return el?.getAttribute(attr) || '';
        };

        // Extract data
        const name = getText('.pdp-mod-product-badge-title') || getText('h1');
        
        // Price
        const priceText = getText('.pdp-price_type_normal') || getText('.pdp-price');
        const price = parseFloat(priceText.replace(/[₱,\s]/g, '')) || 0;
        
        // Original price
        const originalPriceText = getText('.pdp-price_type_deleted');
        const originalPrice = originalPriceText ? parseFloat(originalPriceText.replace(/[₱,\s]/g, '')) : null;
        
        // Discount
        const discount = getText('.pdp-product-price__discount');
        
        // Rating
        const ratingText = getText('.score-average');
        const rating = ratingText ? parseFloat(ratingText) : null;
        
        // Review count
        const reviewText = getText('.pdp-review-summary__link');
        const reviewMatch = reviewText.match(/\d+/);
        const reviewCount = reviewMatch ? parseInt(reviewMatch[0]) : 0;
        
        // Sold count
        const soldCount = getText('.pdp-product-sold') || '0';
        
        // Shop name
        const shopName = getText('.pdp-seller-name') || getText('.seller-name__title');
        
        // Location
        const location = getText('.location__text') || getText('.seller-location');
        
        // Image
        const imageUrl = getAttr('.gallery-preview-panel__image', 'src') || 
                        getAttr('.pdp-mod-common-image img', 'src');
        
        // Brand
        const brand = getText('.pdp-product-brand__brand-link');
        
        // Stock status
        const inStockText = getText('.pdp-product-stock');
        const inStock = !inStockText.toLowerCase().includes('out of stock');
        
        // Item ID from URL
        const urlMatch = window.location.href.match(/i(\d+)-/);
        const itemId = urlMatch ? urlMatch[1] : '';

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
          brand,
          inStock,
          itemId,
          productUrl: window.location.href
        };
      });

      await page.close();
      return productData as ScrapedProduct;

    } catch (error) {
      await page.close();
      throw new Error(`Failed to scrape product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async scrapeSearchResults(searchUrl: string): Promise<ScrapedProduct[]> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    const products: ScrapedProduct[] = [];
    
    try {
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to search page
      await page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: this.options.timeout
      });

      // Wait for products to load
      await page.waitForSelector('[data-qa-locator="product-item"]', { timeout: 10000 });

      // Scroll to load more products
      await this.autoScroll(page);

      // Extract product URLs
      const productUrls = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('[data-qa-locator="product-item"]'));
        return items.map(item => {
          const link = item.querySelector('a');
          return link?.href || '';
        }).filter(url => url.length > 0);
      });

      await page.close();

      // Scrape each product (limit to maxProducts)
      const urlsToScrape = productUrls.slice(0, this.options.maxProducts);
      
      for (const url of urlsToScrape) {
        try {
          const product = await this.scrapeProductPage(url);
          products.push(product);
          
          // Add delay between requests to avoid blocking
          await this.delay(1000 + Math.random() * 2000);
        } catch (error) {
          console.error(`Failed to scrape ${url}:`, error);
        }
      }

      return products;

    } catch (error) {
      await page.close();
      throw new Error(`Failed to scrape search results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async scrapeCategoryPage(categoryUrl: string): Promise<ScrapedProduct[]> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    const products: ScrapedProduct[] = [];
    
    try {
      await page.setViewport({ width: 1920, height: 1080 });
      
      await page.goto(categoryUrl, {
        waitUntil: 'networkidle2',
        timeout: this.options.timeout
      });

      // Wait for products
      await page.waitForSelector('.Bm3ON', { timeout: 10000 }).catch(() => {});

      // Scroll to load more
      await this.autoScroll(page);

      // Extract products from the page
      const pageProducts = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.Bm3ON'));
        
        return items.map(item => {
          const getText = (selector: string): string => {
            const el = item.querySelector(selector);
            return el?.textContent?.trim() || '';
          };

          const getAttr = (selector: string, attr: string): string => {
            const el = item.querySelector(selector);
            return el?.getAttribute(attr) || '';
          };

          const name = getText('.RfADt');
          const priceText = getText('.ooOxS');
          const price = parseFloat(priceText.replace(/[₱,\s]/g, '')) || 0;
          
          const originalPriceText = getText('.IaHHh');
          const originalPrice = originalPriceText ? parseFloat(originalPriceText.replace(/[₱,\s]/g, '')) : null;
          
          const discount = getText('.WNoq3');
          const location = getText('.oa6ri');
          const soldCount = getText('.m2RZo') || '0';
          
          const ratingText = getText('.qzqFw');
          const rating = ratingText ? parseFloat(ratingText) : null;
          
          const imageUrl = getAttr('img', 'src');
          const productUrl = getAttr('a', 'href');
          
          // Extract item ID from URL
          const urlMatch = productUrl.match(/i(\d+)-/);
          const itemId = urlMatch ? urlMatch[1] : '';

          return {
            name,
            price,
            originalPrice,
            discount,
            rating,
            reviewCount: 0,
            soldCount,
            shopName: '',
            location,
            imageUrl,
            productUrl: productUrl.startsWith('http') ? productUrl : `https:${productUrl}`,
            brand: null,
            inStock: true,
            itemId
          };
        });
      });

      await page.close();
      return pageProducts;

    } catch (error) {
      await page.close();
      throw new Error(`Failed to scrape category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async autoScroll(page: Page) {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight || totalHeight > 5000) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export a singleton instance
export const lazadaScraper = new LazadaScraper();