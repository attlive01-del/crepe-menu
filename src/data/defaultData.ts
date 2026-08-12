import { Category, MenuItem, CartSettings, PresetImage } from '../types';

export const DEFAULT_SETTINGS: CartSettings = {
  cart_name: 'عربة كريب الملوك',
  cart_tagline: 'أشهى أنواع الكريب والوافل الطازج يومياً',
  cart_logo_url: '',
  currency: '$',
  whatsapp_number: '+96103000000',
  enable_whatsapp_order: true,
  admin_pin: '1234',
  enable_dual_currency: true,
  base_currency: 'USD',
  exchange_rate: 89500,
  supabase_url: '',
  supabase_anon_key: '',
};

export const DEFAULT_CATEGORIES: Category[] = [];

export const DEFAULT_ITEMS: MenuItem[] = [];

export const PRESET_IMAGES: PresetImage[] = [
  {
    id: 'p1',
    title: 'كريب نوتيلا وموز',
    category: 'sweet',
    url: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'p2',
    title: 'كريب شوكولاتة وفواكه',
    category: 'sweet',
    url: 'https://images.unsplash.com/photo-1626844131082-256783844137?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'p3',
    title: 'كريب التوت والكراميل',
    category: 'sweet',
    url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'p4',
    title: 'كريب مالح بالدجاج والجبن',
    category: 'salty',
    url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'p5',
    title: 'كريب مالح بالأجبان',
    category: 'salty',
    url: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'p6',
    title: 'وافل بلجيكي فواخر',
    category: 'waffle',
    url: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'p7',
    title: 'عصير طازج بارد',
    category: 'drink',
    url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'p8',
    title: 'ميلك شيك كافيه',
    category: 'drink',
    url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
  },
];
