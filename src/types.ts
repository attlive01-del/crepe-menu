export interface Category {
  id: string;
  name: string;
  icon?: string;
  sort_order: number;
  created_at?: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  badge?: string; // e.g., "الأكثر طلباً", "جديد", "مميز"
  created_at?: string;
}

export interface CartSettings {
  cart_name: string;
  currency: string;
  whatsapp_number: string;
  enable_whatsapp_order: boolean;
  cart_tagline: string;
  admin_pin: string;
  cart_logo_url?: string;
  
  // Dual currency settings (USD & LBP)
  enable_dual_currency?: boolean;
  base_currency?: 'USD' | 'LBP';
  exchange_rate?: number; // 1 USD = X LBP (e.g. 89500)
  
  // Supabase Credentials
  supabase_url?: string;
  supabase_anon_key?: string;
}

export interface PresetImage {
  id: string;
  title: string;
  category: 'sweet' | 'salty' | 'waffle' | 'drink' | 'topping';
  url: string;
}
