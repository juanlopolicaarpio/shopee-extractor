import { NextRequest, NextResponse } from 'next/server';
import { LazadaScraper } from '@/lib/lazadaScraper';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export const maxDuration = 300; // 5 minutes for Vercel

export async function POST(request: NextRequest) {
  const scraper = new LazadaScraper({
    headless: true,
    timeout: 60000,
    maxProducts: 500
  });

  try {
    const body = await request.json();
    const { urls, format } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'Please provide an array of Lazada shop URLs' },
        { status: 400 }
      );
    }

    await scraper.initialize();

    let allProducts: any[] = [];

    // Scrape each shop page
    for (const url of urls) {
      try {
        console.log(`Scraping ${url}...`);
        const products = await scraper.scrapeShopPage(url);
        console.log(`Found ${products.length} products from ${url}`);
        allProducts = [...allProducts, ...products];
      } catch (error) {
        console.error(`Failed to scrape ${url}:`, error);
      }
    }

    await scraper.close();

    if (allProducts.length === 0) {
      return NextResponse.json(
        { error: 'No products found or scraping failed' },
        { status: 400 }
      );
    }

    console.log(`Total products scraped: ${allProducts.length}`);

    // Generate file based on format
    let fileContent: Buffer | string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'excel':
        fileContent = generateExcel(allProducts);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = 'lazada_scraped_products.xlsx';
        break;
      
      case 'csv':
        fileContent = generateCSV(allProducts);
        contentType = 'text/csv';
        filename = 'lazada_scraped_products.csv';
        break;
      
      case 'json':
      default:
        fileContent = JSON.stringify(allProducts, null, 2);
        contentType = 'application/json';
        filename = 'lazada_scraped_products.json';
        break;
    }

    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Total-Products': allProducts.length.toString()
      }
    });

  } catch (error) {
    await scraper.close();
    console.error('Scraping error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function generateExcel(products: any[]): Buffer {
  const rows = products.map(p => ({
    'Product Name': p.name,
    'Price (₱)': p.price,
    'Original Price (₱)': p.originalPrice || '',
    'Discount': p.discount || '',
    'Rating': p.rating || '',
    'Reviews': p.reviewCount || 0,
    'Sold Count': p.soldCount || '0',
    'Item ID': p.itemId,
    'Shop Name': p.shopName || '',
    'Location': p.location || '',
    'Brand': p.brand || '',
    'In Stock': p.inStock ? 'Yes' : 'No',
    'Image URL': p.imageUrl,
    'Product URL': p.productUrl
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 50 }, // Product Name
    { wch: 12 }, // Price
    { wch: 15 }, // Original Price
    { wch: 10 }, // Discount
    { wch: 8 },  // Rating
    { wch: 10 }, // Reviews
    { wch: 15 }, // Sold Count
    { wch: 15 }, // Item ID
    { wch: 20 }, // Shop Name
    { wch: 15 }, // Location
    { wch: 15 }, // Brand
    { wch: 10 }, // In Stock
    { wch: 50 }, // Image URL
    { wch: 50 }  // Product URL
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Scraped Products');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function generateCSV(products: any[]): string {
  const data = products.map(p => ({
    'Product Name': p.name,
    'Price (₱)': p.price,
    'Original Price (₱)': p.originalPrice || '',
    'Discount': p.discount || '',
    'Rating': p.rating || '',
    'Reviews': p.reviewCount || 0,
    'Sold Count': p.soldCount || '0',
    'Item ID': p.itemId,
    'Shop Name': p.shopName || '',
    'Location': p.location || '',
    'Brand': p.brand || '',
    'In Stock': p.inStock ? 'Yes' : 'No',
    'Image URL': p.imageUrl,
    'Product URL': p.productUrl
  }));

  return Papa.unparse(data);
}