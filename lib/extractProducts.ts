import { Product, ShopeeResponse, ShopeeItemCard } from '@/types/product';

export function extractProductsFromJson(jsonData: ShopeeResponse): Product[] {
  const products: Product[] = [];

  // Handle both JSON structures
  let itemCards: ShopeeItemCard[] = [];
  
  if (jsonData.data?.centralize_item_card?.item_cards) {
    itemCards = jsonData.data.centralize_item_card.item_cards;
  } else if (jsonData.centralize_item_card?.item_cards) {
    itemCards = jsonData.centralize_item_card.item_cards;
  }

  for (const item of itemCards) {
    const priceInfo = item.item_card_display_price || {};
    const price = (priceInfo.price || 0) / 100000;
    
    const soldInfo = item.item_card_display_sold_count || {};
    const historicalSold = soldInfo.historical_sold_count_text || 'N/A';
    const monthlySold = soldInfo.monthly_sold_count_text || 'N/A';
    
    const assetInfo = item.item_card_displayed_asset || {};
    const productName = assetInfo.name || 'Unknown Product';
    
    const ratingInfo = assetInfo.rating || {};
    const rating = ratingInfo.rating_text || 'N/A';
    
    const strikethroughPrice = (priceInfo.strikethrough_price || 0) / 100000;
    const discount = priceInfo.discount || 0;
    
    const isSoldOut = item.is_sold_out || false;
    const itemStatus = item.item_status || 'normal';
    
    const product: Product = {
      name: productName,
      price: `₱${price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      price_numeric: price,
      original_price: strikethroughPrice > 0 
        ? `₱${strikethroughPrice.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
        : null,
      discount: discount > 0 ? `${discount}%` : null,
      historical_sold: historicalSold,
      monthly_sold: monthlySold,
      rating: rating,
      item_id: item.itemid,
      shop_name: item.shop_data?.shop_name || 'N/A',
      sold_out: isSoldOut ? 'Yes' : 'No',
      status: itemStatus
    };
    
    products.push(product);
  }

  return products;
}

export function processMultipleJsons(jsonStrings: string[]): {
  products: Product[];
  stats: {
    totalFiles: number;
    totalProducts: number;
    soldOut: number;
    available: number;
    errors: string[];
  };
} {
  const allProducts: Product[] = [];
  const errors: string[] = [];

  jsonStrings.forEach((jsonString, index) => {
    try {
      const jsonData = JSON.parse(jsonString);
      const products = extractProductsFromJson(jsonData);
      allProducts.push(...products);
    } catch (error) {
      errors.push(`JSON ${index + 1}: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  });

  const soldOutCount = allProducts.filter(p => p.sold_out === 'Yes').length;

  return {
    products: allProducts,
    stats: {
      totalFiles: jsonStrings.length,
      totalProducts: allProducts.length,
      soldOut: soldOutCount,
      available: allProducts.length - soldOutCount,
      errors
    }
  };
}
