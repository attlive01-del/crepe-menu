import React, { useState, useEffect } from 'react';
import { Category, MenuItem, CartSettings } from './types';
import {
  fetchCategories,
  saveCategory,
  deleteCategory,
  fetchMenuItems,
  saveMenuItem,
  updateItemPrice,
  toggleItemAvailability,
  deleteMenuItem,
  fetchCartSettings,
  saveCartSettings,
  isSupabaseConnected,
  syncAllLocalToSupabase,
  getLocalCategories,
  getLocalItems,
  getLocalSettings,
  setupRealtimeSubscription,
  flushPendingQueue,
} from './lib/supabase';
import { CustomerMenu } from './components/CustomerMenu';
import { AdminDashboard } from './components/AdminDashboard';
import { SupabaseModal } from './components/SupabaseModal';
import { DEFAULT_SETTINGS } from './data/defaultData';

export default function App() {
  const [isQrCodeMode, setIsQrCodeMode] = useState(false);
  const [viewMode, setViewMode] = useState<'admin' | 'preview' | 'customer'>('admin');
  
  // Instant initial load from local cache (0ms delay)
  const [categories, setCategories] = useState<Category[]>(() => getLocalCategories());
  const [items, setItems] = useState<MenuItem[]>(() => getLocalItems());
  const [settings, setSettings] = useState<CartSettings>(() => getLocalSettings());
  const [loading, setLoading] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [connectedToSupabase, setConnectedToSupabase] = useState(false);

  // Check URL query parameters for mode on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const isCustomerMenu = searchParams.get('mode') === 'menu';
      const isQr = searchParams.get('mode') === 'qr' || searchParams.get('qr') === '1';

      if (isCustomerMenu || isQr) {
        setViewMode('customer');
        if (isQr) {
          setIsQrCodeMode(true);
        }
      } else {
        setViewMode('admin'); // Default view in preview mode
      }
    }
  }, []);

  // Load data from Supabase & merge with local storage
  const loadData = async () => {
    try {
      const isConnected = isSupabaseConnected();
      setConnectedToSupabase(isConnected);

      const [cats, menuItems, cartSettings] = await Promise.all([
        fetchCategories(),
        fetchMenuItems(),
        fetchCartSettings(),
      ]);
      setCategories(cats);
      setItems(menuItems);
      setSettings(cartSettings);
    } catch (err) {
      console.error('Error loading crepe cart data:', err);
    }
  };

  // Initial load + Realtime WebSocket subscription setup
  useEffect(() => {
    loadData();

    // Setup Supabase Realtime listener for instantaneous multi-device sync
    const unsubscribeRealtime = setupRealtimeSubscription(() => {
      loadData();
    });

    return () => {
      unsubscribeRealtime();
    };
  }, []);

  // Online connection & window focus revalidation
  useEffect(() => {
    const handleOnlineOrFocus = () => {
      loadData();
    };

    window.addEventListener('online', handleOnlineOrFocus);
    window.addEventListener('focus', handleOnlineOrFocus);

    return () => {
      window.removeEventListener('online', handleOnlineOrFocus);
      window.removeEventListener('focus', handleOnlineOrFocus);
    };
  }, []);

  // Background heartbeat sync timer (fallback every 45 seconds)
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadData();
    }, 45000);

    return () => clearInterval(intervalId);
  }, []);

  // Handlers for Category CRUD
  const handleSaveCategory = async (cat: Partial<Category>) => {
    const saved = await saveCategory(cat);
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setItems((prev) => prev.filter((i) => i.category_id !== id));
  };

  // Handlers for Item CRUD
  const handleSaveItem = async (item: Partial<MenuItem>) => {
    const saved = await saveMenuItem(item);
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === saved.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  const handleUpdatePrice = async (id: string, newPrice: number) => {
    await updateItemPrice(id, newPrice);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, price: newPrice } : i))
    );
  };

  const handleToggleAvailability = async (id: string, isAvailable: boolean) => {
    await toggleItemAvailability(id, isAvailable);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_available: isAvailable } : i))
    );
  };

  const handleDeleteItem = async (id: string) => {
    await deleteMenuItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Handlers for Settings
  const handleSaveSettings = async (newSettings: CartSettings) => {
    const saved = await saveCartSettings(newSettings);
    setSettings(saved);
    setConnectedToSupabase(isSupabaseConnected());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4 text-center text-[#2D2D2D]">
        <div className="w-12 h-12 rounded-2xl bg-yellow-400 flex items-center justify-center text-slate-950 font-black text-2xl animate-bounce shadow-lg shadow-yellow-400/30 mb-3">
          🥞
        </div>
        <h2 className="text-sm font-bold text-slate-800">جاري تحميل قائمة عربة الكريب...</h2>
        <p className="text-xs text-slate-500 mt-1">يرجى الانتظار لحظة</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D2D2D] font-sans antialiased relative">
      {/* Render based on viewMode */}
      {viewMode === 'customer' ? (
        <CustomerMenu
          categories={categories}
          items={items}
          settings={settings}
          isQrCodeMode={isQrCodeMode}
        />
      ) : viewMode === 'preview' ? (
        <CustomerMenu
          categories={categories}
          items={items}
          settings={settings}
          isQrCodeMode={isQrCodeMode}
          onBackToAdmin={() => setViewMode('admin')}
        />
      ) : (
        <AdminDashboard
          categories={categories}
          items={items}
          settings={settings}
          isSupabaseConnected={connectedToSupabase}
          onGoToMenu={() => setViewMode('preview')}
          onSaveCategory={handleSaveCategory}
          onDeleteCategory={handleDeleteCategory}
          onSaveItem={handleSaveItem}
          onUpdatePrice={handleUpdatePrice}
          onToggleAvailability={handleToggleAvailability}
          onDeleteItem={handleDeleteItem}
          onSaveSettings={handleSaveSettings}
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          onReloadData={loadData}
        />
      )}

      {/* Supabase Configuration Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onSaved={loadData}
      />
    </div>
  );
}
