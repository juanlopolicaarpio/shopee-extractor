export interface Product {
  name: string;
  price: string;
  price_numeric: number;
  original_price: string | null;
  discount: string | null;
  historical_sold: string;
  monthly_sold: string;
  rating: string;
  item_id: number;
  shop_name: string;
  sold_out: string;
  status: string;

  // 👇 add these
  monthly_sold_numeric?: number;
  adjusted_monthly_sold?: number;
  monthly_sold_sales?: number;
}


export interface ShopeeItemCard {
  itemid: number;
  is_sold_out?: boolean;
  item_status?: string;
  item_card_display_price?: {
    price: number;
    strikethrough_price?: number;
    discount?: number;
  };
  item_card_display_sold_count?: {
    historical_sold_count_text?: string;
    monthly_sold_count_text?: string;
  };
  item_card_displayed_asset?: {
    name?: string;
    rating?: {
      rating_text?: string;
    };
  };
  shop_data?: {
    shop_name?: string;
  };
}

export interface ShopeeResponse {
  data?: {
    centralize_item_card?: {
      item_cards?: ShopeeItemCard[];
    };
    total?: number;
    total_count?: number;
    no_more?: boolean;
    nomore?: boolean;
  };
  centralize_item_card?: {
    item_cards?: ShopeeItemCard[];
  };
  total_count?: number;
  nomore?: boolean;
}
