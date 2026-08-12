import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Category, MenuItem, CartSettings } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_ITEMS, DEFAULT_SETTINGS } from '../data/defaultData';

// Storage Keys for Local Storage Fallback & Queue
const LOCAL_STORAGE_KEY_CATEGORIES = 'crepe_cart_categories_v1';
const LOCAL_STORAGE_KEY_ITEMS = 'crepe_cart_items_v1';
const LOCAL_STORAGE_KEY_SETTINGS = 'crepe_cart_settings_v1';
const LOCAL_STORAGE_KEY_SUPABASE_CONFIG = 'crepe_cart_supabase_credentials';
const LOCAL_STORAGE_KEY_PENDING_QUEUE = 'crepe_cart_pending_queue_v1';

export interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

export interface PendingOp {
  id: string;
  type: 'save_category' | 'delete_category' | 'save_item' | 'update_price' | 'toggle_available' | 'delete_item' | 'save_settings';
  payload: any;
  timestamp: number;
}

export interface SyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
}

type SyncListener = (status: SyncStatus) => void;

const syncListeners: Set<SyncListener> = new Set();
let isFlushing = false;
let lastSyncedTime: Date | null = null;
let realtimeChannel: any = null;

export function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim().replace(/^["']|["']$/g, '');
  if (!url) return '';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch (e) {
    return url.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');
  }
}

export function sanitizeSupabaseKey(rawKey: string): string {
  if (!rawKey) return '';
  return rawKey.trim().replace(/^["']|["']$/g, '');
}

// Get saved Supabase config from env or localStorage
export function getSavedCredentials(): SupabaseCredentials {
  let envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  let envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  // Check URL query search parameters first (e.g. ?sb_url=...&sb_key=...)
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get('sb_url') || params.get('supabase_url');
      const keyParam = params.get('sb_key') || params.get('supabase_key');
      if (urlParam && keyParam) {
        const cleanU = sanitizeSupabaseUrl(urlParam);
        const cleanK = sanitizeSupabaseKey(keyParam);
        saveSupabaseCredentials({ url: cleanU, anonKey: cleanK });
        return { url: cleanU, anonKey: cleanK };
      }
    } catch (e) {
      console.error('Error reading URL parameters for Supabase', e);
    }
  }

  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SUPABASE_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        envUrl = parsed.url;
        envKey = parsed.anonKey;
      }
    }
  } catch (e) {
    console.error('Error reading saved Supabase credentials', e);
  }

  // Default connected credentials
  if (!envUrl || !envKey) {
    envUrl = 'https://yqxjvxvfsqkddzsjrlxg.supabase.co';
    envKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxeGp2eHZmc3FrZGR6c2pybHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzODYwNzksImV4cCI6MjEwMTk2MjA3OX0.9yy2MrLPLYXGBmL2kgxg9QFaRkAhVqLQnheeE9hT8eg';
  }

  return {
    url: sanitizeSupabaseUrl(envUrl),
    anonKey: sanitizeSupabaseKey(envKey),
  };
}

export function saveSupabaseCredentials(creds: SupabaseCredentials) {
  try {
    const cleanCreds = {
      url: sanitizeSupabaseUrl(creds.url),
      anonKey: sanitizeSupabaseKey(creds.anonKey),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY_SUPABASE_CONFIG, JSON.stringify(cleanCreds));
    initSupabaseClient(true);
  } catch (e) {
    console.error('Error saving Supabase credentials', e);
  }
}

// Custom in-memory storage to prevent GoTrueClient from instantiating duplicate localStorage listeners
const noopStorage = {
  getItem: (_key: string) => null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
};

let supabaseInstance: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function initSupabaseClient(forceRefresh = false): SupabaseClient | null {
  const creds = getSavedCredentials();
  const cleanUrl = sanitizeSupabaseUrl(creds.url);
  const cleanKey = sanitizeSupabaseKey(creds.anonKey);

  if (cleanUrl && cleanKey && !cleanUrl.includes('your-project')) {
    if (!forceRefresh && supabaseInstance && cachedUrl === cleanUrl && cachedKey === cleanKey) {
      return supabaseInstance;
    }
    try {
      supabaseInstance = createClient(cleanUrl, cleanKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storage: noopStorage,
          storageKey: 'crepe_cart_auth_client',
        },
      });
      cachedUrl = cleanUrl;
      cachedKey = cleanKey;
      return supabaseInstance;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      supabaseInstance = null;
      cachedUrl = '';
      cachedKey = '';
    }
  } else {
    supabaseInstance = null;
    cachedUrl = '';
    cachedKey = '';
  }
  return supabaseInstance;
}

export function isSupabaseConnected(): boolean {
  const creds = getSavedCredentials();
  const cleanUrl = sanitizeSupabaseUrl(creds.url);
  const cleanKey = sanitizeSupabaseKey(creds.anonKey);
  return Boolean(cleanUrl && cleanKey && !cleanUrl.includes('your-project'));
}

// Payload cleaners to prevent unknown schema properties from failing PostgREST
function getCleanCategoryPayload(cat: Category) {
  return {
    id: String(cat.id),
    name: cat.name,
    icon: cat.icon || '🥞',
    sort_order: Number(cat.sort_order) || 1,
  };
}

function getCleanMenuItemPayload(item: MenuItem) {
  return {
    id: String(item.id),
    category_id: String(item.category_id),
    name: item.name,
    description: item.description || '',
    price: Number(item.price) || 0,
    image_url: item.image_url || null,
    is_available: item.is_available ?? true,
    badge: item.badge || null,
  };
}

function getCleanSettingsPayload(settings: CartSettings) {
  return {
    id: 'main_settings',
    cart_name: settings.cart_name || 'عربة كريب الملوك',
    cart_tagline: settings.cart_tagline || '',
    cart_logo_url: settings.cart_logo_url || null,
    currency: settings.currency || '$',
    whatsapp_number: settings.whatsapp_number || '',
    enable_whatsapp_order: settings.enable_whatsapp_order ?? true,
    admin_pin: settings.admin_pin || '1234',
    enable_dual_currency: settings.enable_dual_currency ?? true,
    base_currency: settings.base_currency || 'USD',
    exchange_rate: Number(settings.exchange_rate) || 89500,
    updated_at: new Date().toISOString(),
  };
}

// ==========================================
// LOCAL STORAGE CACHE HELPERS
// ==========================================
export function getLocalCategories(): Category[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY_CATEGORIES);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY_CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
  return DEFAULT_CATEGORIES;
}

function setLocalCategories(cats: Category[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY_CATEGORIES, JSON.stringify(cats));
}

export function getLocalItems(): MenuItem[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY_ITEMS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY_ITEMS, JSON.stringify(DEFAULT_ITEMS));
  return DEFAULT_ITEMS;
}

function setLocalItems(items: MenuItem[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY_ITEMS, JSON.stringify(items));
}

export function getLocalSettings(): CartSettings {
  const creds = getSavedCredentials();
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY_SETTINGS);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        supabase_url: parsed.supabase_url || creds.url,
        supabase_anon_key: parsed.supabase_anon_key || creds.anonKey,
      };
    }
  } catch (e) {
    console.error(e);
  }
  const initSettings = {
    ...DEFAULT_SETTINGS,
    supabase_url: creds.url,
    supabase_anon_key: creds.anonKey,
  };
  localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(initSettings));
  return initSettings;
}

function setLocalSettings(settings: CartSettings) {
  localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(settings));
}

// ==========================================
// PENDING MUTATION QUEUE (OFFLINE-FIRST ENGINE)
// ==========================================
export function getPendingQueue(): PendingOp[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY_PENDING_QUEUE);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  return [];
}

function setPendingQueue(queue: PendingOp[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_PENDING_QUEUE, JSON.stringify(queue));
  } catch (e) {
    console.error(e);
  }
  notifySyncListeners();
}

function enqueueOperation(opType: PendingOp['type'], payload: any) {
  const queue = getPendingQueue();
  let newQueue = queue;

  // Smart deduplication for rapid consecutive edits
  if (opType === 'update_price' || opType === 'toggle_available' || opType === 'save_item') {
    newQueue = queue.filter((op) => !(op.payload?.id === payload?.id && op.type === opType));
  } else if (opType === 'save_category') {
    newQueue = queue.filter((op) => !(op.payload?.id === payload?.id && op.type === 'save_category'));
  } else if (opType === 'save_settings') {
    newQueue = queue.filter((op) => op.type !== 'save_settings');
  }

  newQueue.push({
    id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: opType,
    payload,
    timestamp: Date.now(),
  });

  setPendingQueue(newQueue);
}

// Flush pending offline changes to Supabase safely
export async function flushPendingQueue(): Promise<number> {
  const client = initSupabaseClient();
  if (!client) return getPendingQueue().length;
  if (isFlushing) return getPendingQueue().length;

  const queue = getPendingQueue();
  if (queue.length === 0) return 0;

  isFlushing = true;
  notifySyncListeners();

  const remainingQueue: PendingOp[] = [];

  for (const op of queue) {
    try {
      if (op.type === 'save_category') {
        const clean = getCleanCategoryPayload(op.payload);
        const { error } = await client.from('categories').upsert(clean);
        if (error) throw error;
      } else if (op.type === 'delete_category') {
        const { error: catErr } = await client.from('categories').delete().eq('id', op.payload.id);
        await client.from('menu_items').delete().eq('category_id', op.payload.id);
        if (catErr) throw catErr;
      } else if (op.type === 'save_item') {
        const clean = getCleanMenuItemPayload(op.payload);
        let { error } = await client.from('menu_items').upsert(clean);
        if (error && (error.code === '23503' || error.message?.includes('foreign key constraint'))) {
          // Sync categories first to satisfy FK constraint
          const localCats = getLocalCategories();
          if (localCats.length > 0) {
            await client.from('categories').upsert(localCats.map(getCleanCategoryPayload));
            const retry = await client.from('menu_items').upsert(clean);
            error = retry.error;
          }
        }
        if (error) throw error;
      } else if (op.type === 'update_price') {
        const { error } = await client.from('menu_items').update({ price: op.payload.price }).eq('id', op.payload.id);
        if (error) throw error;
      } else if (op.type === 'toggle_available') {
        const { error } = await client.from('menu_items').update({ is_available: op.payload.is_available }).eq('id', op.payload.id);
        if (error) throw error;
      } else if (op.type === 'delete_item') {
        const { error } = await client.from('menu_items').delete().eq('id', op.payload.id);
        if (error) throw error;
      } else if (op.type === 'save_settings') {
        const clean = getCleanSettingsPayload(op.payload);
        const { error } = await client.from('cart_settings').upsert(clean);
        if (error) throw error;
      }
    } catch (err) {
      console.warn(`Failed to process pending op ${op.type}:`, err);
      remainingQueue.push(op); // retain in queue for next retry
    }
  }

  setPendingQueue(remainingQueue);
  isFlushing = false;
  if (remainingQueue.length === 0) {
    lastSyncedTime = new Date();
  }
  notifySyncListeners();

  return remainingQueue.length;
}

// In-flight promise caches to deduplicate concurrent fetch requests
let activeCategoriesPromise: Promise<Category[]> | null = null;
let activeItemsPromise: Promise<MenuItem[]> | null = null;
let activeSettingsPromise: Promise<CartSettings> | null = null;

// Timeout helper for network requests
function withTimeout<T>(promiseLike: PromiseLike<T>, ms = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout of ${ms}ms exceeded`));
    }, ms);
    Promise.resolve(promiseLike)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ==========================================
// SYNC STATUS SUBSCRIBERS
// ==========================================
export function getCurrentSyncStatus(): SyncStatus {
  const isConnected = isSupabaseConnected();
  const queue = getPendingQueue();
  return {
    isConnected,
    isSyncing: isFlushing,
    pendingCount: queue.length,
    lastSyncedAt: lastSyncedTime,
  };
}

export function subscribeSyncStatus(listener: SyncListener): () => void {
  syncListeners.add(listener);
  listener(getCurrentSyncStatus());
  return () => {
    syncListeners.delete(listener);
  };
}

function notifySyncListeners() {
  const status = getCurrentSyncStatus();
  syncListeners.forEach((fn) => {
    try {
      fn(status);
    } catch (e) {}
  });
}

// ==========================================
// REALTIME WEBSOCKET SUBSCRIPTION
// ==========================================
export function setupRealtimeSubscription(onRealtimeChange: () => void): () => void {
  const client = initSupabaseClient();
  if (!client) return () => {};

  if (realtimeChannel) {
    try {
      client.removeChannel(realtimeChannel);
    } catch (e) {}
  }

  try {
    realtimeChannel = client
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        onRealtimeChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        onRealtimeChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_settings' }, () => {
        onRealtimeChange();
      })
      .subscribe((status: string) => {
        console.log('Supabase Realtime status:', status);
      });

    return () => {
      if (realtimeChannel && client) {
        try {
          client.removeChannel(realtimeChannel);
        } catch (e) {}
        realtimeChannel = null;
      }
    };
  } catch (err) {
    console.warn('Failed to setup Realtime subscription:', err);
    return () => {};
  }
}

// ==========================================
// API DATA AGNOSTIC FETCHERS & MERGERS (SUPABASE IS SINGLE SOURCE OF TRUTH)
// ==========================================

export async function fetchCategories(): Promise<Category[]> {
  if (activeCategoriesPromise) return activeCategoriesPromise;

  activeCategoriesPromise = (async () => {
    const client = initSupabaseClient();
    if (!client) return getLocalCategories();

    try {
      const { data, error } = (await withTimeout(
        client.from('categories').select('*').order('sort_order', { ascending: true }),
        10000
      )) as any;

      if (!error && data) {
        const remoteCats: Category[] = data.map((cat: any) => ({
          id: String(cat.id),
          name: cat.name || '',
          icon: cat.icon || '🥞',
          sort_order: Number(cat.sort_order) || 1,
          created_at: cat.created_at,
        }));

        setLocalCategories(remoteCats);
        lastSyncedTime = new Date();
        notifySyncListeners();
        return remoteCats;
      }
    } catch (e) {
      console.warn('Supabase fetchCategories fallback to local storage:', e);
    }

    return getLocalCategories();
  })();

  try {
    return await activeCategoriesPromise;
  } finally {
    activeCategoriesPromise = null;
  }
}

function getNextSequentialId(list: { id: string }[]): string {
  if (!list || list.length === 0) return 'cat-1';
  const existingIds = new Set(list.map((item) => String(item.id)));
  const numericIds = list.map((item) => {
    if (!item.id) return 0;
    const digits = String(item.id).replace(/\D/g, '');
    const num = parseInt(digits, 10);
    if (isNaN(num) || num >= 1000000) return 0;
    return num;
  });
  let nextNum = Math.max(0, ...numericIds) + 1;
  const prefix = 'cat-';
  while (existingIds.has(`${prefix}${nextNum}`) || existingIds.has(`${nextNum}`)) {
    nextNum++;
  }
  return `${prefix}${nextNum}`;
}

function getNextItemId(list: { id: string }[]): string {
  if (!list || list.length === 0) return 'item-1';
  const existingIds = new Set(list.map((item) => String(item.id)));
  const numericIds = list.map((item) => {
    if (!item.id) return 0;
    const digits = String(item.id).replace(/\D/g, '');
    const num = parseInt(digits, 10);
    if (isNaN(num) || num >= 1000000) return 0;
    return num;
  });
  let nextNum = Math.max(0, ...numericIds) + 1;
  while (existingIds.has(`item-${nextNum}`) || existingIds.has(`${nextNum}`)) {
    nextNum++;
  }
  return `item-${nextNum}`;
}

export async function saveCategory(category: Partial<Category>): Promise<Category> {
  const categories = getLocalCategories();
  let updatedCategory: Category;

  if (category.id) {
    const idx = categories.findIndex((c) => c.id === category.id);
    if (idx !== -1) {
      categories[idx] = { ...categories[idx], ...category };
      updatedCategory = categories[idx];
    } else {
      updatedCategory = {
        id: category.id,
        name: category.name || 'فئة جديدة',
        icon: category.icon || '🥞',
        sort_order: category.sort_order || categories.length + 1,
      };
      categories.push(updatedCategory);
    }
  } else {
    const nextId = getNextSequentialId(categories);
    updatedCategory = {
      id: nextId,
      name: category.name || 'فئة جديدة',
      icon: category.icon || '🥞',
      sort_order: category.sort_order || categories.length + 1,
    };
    categories.push(updatedCategory);
  }

  setLocalCategories(categories);

  const client = initSupabaseClient();
  if (client) {
    try {
      const clean = getCleanCategoryPayload(updatedCategory);
      const { error } = await client.from('categories').upsert(clean);
      if (error) {
        console.warn('Direct save category to Supabase error:', error);
        enqueueOperation('save_category', updatedCategory);
      } else {
        lastSyncedTime = new Date();
        notifySyncListeners();
      }
    } catch (e) {
      console.warn('Direct save category exception:', e);
      enqueueOperation('save_category', updatedCategory);
    }
  }

  return updatedCategory;
}

export async function deleteCategory(id: string): Promise<void> {
  const categories = getLocalCategories().filter((c) => c.id !== id);
  setLocalCategories(categories);

  const items = getLocalItems().filter((item) => item.category_id !== id);
  setLocalItems(items);

  const client = initSupabaseClient();
  if (client) {
    try {
      await client.from('menu_items').delete().eq('category_id', id);
      const { error } = await client.from('categories').delete().eq('id', id);
      if (error) {
        console.warn('Direct delete category from Supabase error:', error);
        enqueueOperation('delete_category', { id });
      } else {
        lastSyncedTime = new Date();
        notifySyncListeners();
      }
    } catch (e) {
      console.warn('Direct delete category exception:', e);
      enqueueOperation('delete_category', { id });
    }
  }
}

export async function fetchMenuItems(): Promise<MenuItem[]> {
  if (activeItemsPromise) return activeItemsPromise;

  activeItemsPromise = (async () => {
    const client = initSupabaseClient();
    if (!client) return getLocalItems();

    try {
      const { data, error } = (await withTimeout(
        client.from('menu_items').select('*').order('created_at', { ascending: false }),
        10000
      )) as any;

      if (!error && data) {
        const remoteItems: MenuItem[] = data.map((item: any) => ({
          id: String(item.id),
          category_id: String(item.category_id || ''),
          name: item.name || '',
          description: item.description || '',
          price: Number(item.price) || 0,
          image_url: item.image_url || '',
          is_available: item.is_available ?? true,
          badge: item.badge || undefined,
          created_at: item.created_at,
        }));

        setLocalItems(remoteItems);
        lastSyncedTime = new Date();
        notifySyncListeners();
        return remoteItems;
      }
    } catch (e) {
      console.warn('Supabase fetchMenuItems fallback to local storage:', e);
    }

    return getLocalItems();
  })();

  try {
    return await activeItemsPromise;
  } finally {
    activeItemsPromise = null;
  }
}

export async function saveMenuItem(item: Partial<MenuItem>): Promise<MenuItem> {
  const items = getLocalItems();
  let newItem: MenuItem;

  if (item.id) {
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...item };
      newItem = items[idx];
    } else {
      newItem = {
        id: item.id,
        category_id: item.category_id || '',
        name: item.name || '',
        description: item.description || '',
        price: Number(item.price) || 0,
        image_url: item.image_url || '',
        is_available: item.is_available ?? true,
        badge: item.badge || '',
      };
      items.push(newItem);
    }
  } else {
    const nextId = getNextItemId(items);
    newItem = {
      id: nextId,
      category_id: item.category_id || '',
      name: item.name || '',
      description: item.description || '',
      price: Number(item.price) || 0,
      image_url: item.image_url || '',
      is_available: item.is_available ?? true,
      badge: item.badge || '',
      created_at: new Date().toISOString(),
    };
    items.push(newItem);
  }

  setLocalItems(items);

  const client = initSupabaseClient();
  if (client) {
    try {
      const clean = getCleanMenuItemPayload(newItem);
      const { error } = await client.from('menu_items').upsert(clean);
      if (error) {
        console.warn('Direct save item to Supabase error:', error);
        enqueueOperation('save_item', newItem);
      } else {
        lastSyncedTime = new Date();
        notifySyncListeners();
      }
    } catch (e) {
      console.warn('Direct save item exception:', e);
      enqueueOperation('save_item', newItem);
    }
  }

  return newItem;
}

export async function updateItemPrice(id: string, newPrice: number): Promise<void> {
  const items = getLocalItems();
  const item = items.find((i) => i.id === id);
  if (item) {
    item.price = newPrice;
    setLocalItems(items);

    const client = initSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('menu_items').update({ price: newPrice }).eq('id', id);
        if (error) {
          console.warn('Direct update price error:', error);
          enqueueOperation('update_price', { id, price: newPrice });
        } else {
          lastSyncedTime = new Date();
          notifySyncListeners();
        }
      } catch (e) {
        console.warn('Direct update price exception:', e);
        enqueueOperation('update_price', { id, price: newPrice });
      }
    }
  }
}

export async function toggleItemAvailability(id: string, isAvailable: boolean): Promise<void> {
  const items = getLocalItems();
  const item = items.find((i) => i.id === id);
  if (item) {
    item.is_available = isAvailable;
    setLocalItems(items);

    const client = initSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('menu_items').update({ is_available: isAvailable }).eq('id', id);
        if (error) {
          console.warn('Direct toggle availability error:', error);
          enqueueOperation('toggle_available', { id, is_available: isAvailable });
        } else {
          lastSyncedTime = new Date();
          notifySyncListeners();
        }
      } catch (e) {
        console.warn('Direct toggle availability exception:', e);
        enqueueOperation('toggle_available', { id, is_available: isAvailable });
      }
    }
  }
}

export async function deleteMenuItem(id: string): Promise<void> {
  const items = getLocalItems().filter((i) => i.id !== id);
  setLocalItems(items);

  const client = initSupabaseClient();
  if (client) {
    try {
      const { error } = await client.from('menu_items').delete().eq('id', id);
      if (error) {
        console.warn('Direct delete item error:', error);
        enqueueOperation('delete_item', { id });
      } else {
        lastSyncedTime = new Date();
        notifySyncListeners();
      }
    } catch (e) {
      console.warn('Direct delete item exception:', e);
      enqueueOperation('delete_item', { id });
    }
  }
}

export async function fetchCartSettings(): Promise<CartSettings> {
  if (activeSettingsPromise) return activeSettingsPromise;

  activeSettingsPromise = (async () => {
    const local = getLocalSettings();
    const client = initSupabaseClient();
    const creds = getSavedCredentials();
    if (!client) return local;

    try {
      const { data, error } = (await withTimeout(
        client.from('cart_settings').select('*').limit(1),
        10000
      )) as any;

      if (!error && data && data.length > 0) {
        const row = data[0];
        const fullSettings: CartSettings = {
          ...DEFAULT_SETTINGS,
          ...row,
          cart_name: row.cart_name || DEFAULT_SETTINGS.cart_name,
          cart_tagline: row.cart_tagline || DEFAULT_SETTINGS.cart_tagline,
          currency: row.currency || DEFAULT_SETTINGS.currency,
          whatsapp_number: row.whatsapp_number || DEFAULT_SETTINGS.whatsapp_number,
          enable_whatsapp_order: row.enable_whatsapp_order ?? true,
          admin_pin: row.admin_pin || '1234',
          enable_dual_currency: row.enable_dual_currency ?? true,
          base_currency: row.base_currency || 'USD',
          exchange_rate: Number(row.exchange_rate) || 89500,
          supabase_url: creds.url,
          supabase_anon_key: creds.anonKey,
        };
        setLocalSettings(fullSettings);
        lastSyncedTime = new Date();
        notifySyncListeners();
        return fullSettings;
      }
    } catch (e) {
      console.warn('Supabase fetchCartSettings fallback to local storage:', e);
    }

    return getLocalSettings();
  })();

  try {
    return await activeSettingsPromise;
  } finally {
    activeSettingsPromise = null;
  }
}

export async function saveCartSettings(settings: CartSettings): Promise<CartSettings> {
  if (settings.supabase_url && settings.supabase_anon_key) {
    saveSupabaseCredentials({
      url: settings.supabase_url.trim(),
      anonKey: settings.supabase_anon_key.trim(),
    });
  }

  setLocalSettings(settings);

  const client = initSupabaseClient();
  if (client) {
    try {
      const clean = getCleanSettingsPayload(settings);
      const { error } = await client.from('cart_settings').upsert(clean);
      if (error) {
        console.warn('Direct save settings error:', error);
        enqueueOperation('save_settings', settings);
      } else {
        lastSyncedTime = new Date();
        notifySyncListeners();
      }
    } catch (e) {
      console.warn('Direct save settings exception:', e);
      enqueueOperation('save_settings', settings);
    }
  }

  return settings;
}

export async function syncAllLocalToSupabase(): Promise<{
  success: boolean;
  message: string;
  details?: string;
}> {
  const client = initSupabaseClient(true);
  if (!client) {
    return {
      success: false,
      message: 'لم يتم الاتصال بـ Supabase.',
      details: 'يرجى إدخال رابط المشروع والرمز السري Anon Key وحفظ البيانات أولاً.',
    };
  }

  try {
    const localCategories = getLocalCategories();
    const localItems = getLocalItems();
    const localSettings = getLocalSettings();

    const categoriesPayload = localCategories.map(getCleanCategoryPayload);
    const settingsPayload = getCleanSettingsPayload(localSettings);

    if (categoriesPayload.length > 0) {
      const { error: catErr } = await client.from('categories').upsert(categoriesPayload);
      if (catErr) {
        if (catErr.code === '42P01' || catErr.message?.includes('does not exist') || catErr.message?.includes('relation')) {
          throw new Error('جداول Supabase غير موجودة! يرجى تشغيل سكريبت SQL في SQL Editor أولاً لإنشاء الجداول.');
        }
        throw new Error(`خطأ في نقل الفئات: ${catErr.message}`);
      }
    }

    const categoryIds = new Set(localCategories.map((c) => c.id));
    const fallbackCatId = localCategories[0]?.id || 'cat-1';

    const itemsPayload = localItems.map((item) => {
      const clean = getCleanMenuItemPayload(item);
      if (!clean.category_id || !categoryIds.has(clean.category_id)) {
        clean.category_id = fallbackCatId;
      }
      return clean;
    });

    if (itemsPayload.length > 0) {
      const { error: itemErr } = await client.from('menu_items').upsert(itemsPayload);
      if (itemErr) {
        if (itemErr.code === '42P01' || itemErr.message?.includes('does not exist')) {
          throw new Error('جدول الأصناف menu_items غير موجود في Supabase!');
        }
        throw new Error(`خطأ في نقل الأصناف: ${itemErr.message}`);
      }
    }

    const { error: setErr } = await client.from('cart_settings').upsert(settingsPayload);
    if (setErr) {
      if (setErr.code === '42P01' || setErr.message?.includes('does not exist')) {
        throw new Error('جدول الإعدادات cart_settings غير موجود في Supabase!');
      }
      throw new Error(`خطأ في نقل الإعدادات: ${setErr.message}`);
    }

    // Clear queue after full sync
    setPendingQueue([]);
    lastSyncedTime = new Date();
    notifySyncListeners();

    return {
      success: true,
      message: 'تم نقل ورفع جميع البيانات إلى Supabase بنجاح! 🎉',
      details: `تم رفع ${localCategories.length} فئات و ${localItems.length} أصناف وإعدادات المنيو بنجاح.`,
    };
  } catch (err: any) {
    console.error('syncAllLocalToSupabase error:', err);
    return {
      success: false,
      message: 'فشل نقل البيانات إلى Supabase.',
      details: err?.message || 'تأكد من إنشاء الجداول بـ SQL وضبط صلاحيات RLS.',
    };
  }
}

export async function forceFullSync(): Promise<{ success: boolean; message: string; details?: string }> {
  return await syncAllLocalToSupabase();
}

export async function testSupabaseConnection(customUrl?: string, customKey?: string): Promise<{
  success: boolean;
  message: string;
  details?: string;
}> {
  const url = (customUrl !== undefined ? customUrl : getSavedCredentials().url).trim();
  const anonKey = (customKey !== undefined ? customKey : getSavedCredentials().anonKey).trim();

  if (!url || !anonKey) {
    return {
      success: false,
      message: 'لم يتم إدخال رابط مشروع Supabase أو الرمز السري.',
      details: 'يرجى إدخال رابط Project URL والرمز السري Anon Key أولاً ثم الضغط على فحص الاتصال.',
    };
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return {
      success: false,
      message: 'صيغة رابط مشروع Supabase غير صحيحة.',
      details: 'يجب أن يبدأ الرابط بـ https:// (مثال: https://xyz.supabase.co)',
    };
  }

  try {
    const tempClient = (url === cachedUrl && anonKey === cachedKey && supabaseInstance)
      ? supabaseInstance
      : createClient(url, anonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storage: noopStorage,
            storageKey: `crepe_cart_test_${Date.now()}`,
          },
        });
    const startTime = Date.now();
    const { error } = await tempClient.from('cart_settings').select('id').limit(1);
    const duration = Date.now() - startTime;

    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return {
          success: true,
          message: 'تم الاتصال بالسيرفر بنجاح! ⚠️ الجداول غير أنشأت بعد.',
          details: `تمت الاستجابة خلال ${duration}ms. يرجى تشغيل سكريبت SQL المرفق لإنشاء الجداول في Supabase.`,
        };
      }

      return {
        success: false,
        message: `تعذر الاتصال بـ Supabase (الكود: ${error.code || 'غير معروف'})`,
        details: error.message || 'يرجى التأكد من صحة الرمز السري وإعدادات RLS.',
      };
    }

    return {
      success: true,
      message: 'تم الاتصال بقاعدة بيانات Supabase بنجاح! 🎉',
      details: `زمن الاستجابة السريع: ${duration}ms | البيانات متزامنة مع السحاب.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'فشل الاتصال الخارجي بـ Supabase.',
      details: err?.message || 'تأكد من الاتصال بالإنترنت وصحة البيانات المدخلة.',
    };
  }
}

// SQL Script generator to create tables in Supabase Editor
export const SUPABASE_SQL_SCRIPT = `-- ===============================================
-- سكريبت إنشاء الجداول لقاعدة بيانات عربة الكريب
-- انسخ هذا الكود والصقه في Supabase -> SQL Editor
-- ===============================================

-- 1. جدول فئات الكريب والوجبات (Categories)
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول أنواع المنتجات والأصناف (Menu Items)
CREATE TABLE IF NOT EXISTS public.menu_items (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    badge TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول إعدادات العربة والعملة (Cart Settings)
CREATE TABLE IF NOT EXISTS public.cart_settings (
    id TEXT PRIMARY KEY DEFAULT 'main_settings',
    cart_name TEXT DEFAULT 'عربة كريب الملوك',
    cart_tagline TEXT DEFAULT 'أشهى أنواع الكريب والوافل الطازج يومياً',
    cart_logo_url TEXT,
    currency TEXT DEFAULT '$',
    whatsapp_number TEXT,
    enable_whatsapp_order BOOLEAN DEFAULT TRUE,
    admin_pin TEXT DEFAULT '1234',
    enable_dual_currency BOOLEAN DEFAULT TRUE,
    base_currency TEXT DEFAULT 'USD',
    exchange_rate NUMERIC DEFAULT 89500,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إتاحة صلاحيات القراءة والعموم (Row Level Security)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow Public Read Categories" ON public.categories;
DROP POLICY IF EXISTS "Allow Public Write Categories" ON public.categories;
CREATE POLICY "Allow Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow Public Write Categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow Public Read Items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow Public Write Items" ON public.menu_items;
CREATE POLICY "Allow Public Read Items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Allow Public Write Items" ON public.menu_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow Public Read Settings" ON public.cart_settings;
DROP POLICY IF EXISTS "Allow Public Write Settings" ON public.cart_settings;
CREATE POLICY "Allow Public Read Settings" ON public.cart_settings FOR SELECT USING (true);
CREATE POLICY "Allow Public Write Settings" ON public.cart_settings FOR ALL USING (true) WITH CHECK (true);

-- 4. تفعيل البث المباشر (Supabase Realtime) للتزامن التلقائي اللحظي بين كل الهواتف
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
    ELSE
        ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.cart_settings;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
`;
