export interface AddToCartParams {
  query?: string;           // Search query
  asin?: string;            // Amazon ASIN
  quantity?: number;        // Quantity to add (default: 1)
}

export interface CartItem {
  title: string;
  price: string;
  quantity: number;
  asin: string;
  imageUrl: string;
}

export interface SearchResult {
  title: string;
  asin: string;
  price: string;
  rating: string;
  imageUrl: string;
}

export interface OperationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}
