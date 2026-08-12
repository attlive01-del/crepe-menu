import React, { useState, useEffect } from 'react';
import { Category, MenuItem, CartSettings } from '../types';
import { ImagePicker } from './ImagePicker';
import { QRCodeSVG } from 'qrcode.react';
import { formatDualPrice, convertCurrency } from '../lib/currency';
import { testSupabaseConnection, SUPABASE_SQL_SCRIPT, syncAllLocalToSupabase } from '../lib/supabase';
import { compressImageFile, handleImgError } from '../lib/imageUtils';
import { SyncStatusPill } from './SyncStatusPill';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  Database,
  QrCode,
  Settings,
  DollarSign,
  Tag,
  Check,
  X,
  ExternalLink,
  Smartphone,
  Share2,
  Printer,
  Download,
  HelpCircle,
  Sparkles,
  Layers,
  Upload,
  RefreshCw,
  AlertCircle,
  Copy,
  Sliders,
  Loader2,
  CheckCircle2,
  XCircle,
  Menu,
  Home,
  Calculator,
  TrendingUp,
  Zap,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ChevronDown,
  Activity,
} from 'lucide-react';

interface AdminDashboardProps {
  categories: Category[];
  items: MenuItem[];
  settings: CartSettings;
  isSupabaseConnected: boolean;
  onGoToMenu: () => void;
  onSaveCategory: (category: Partial<Category>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onSaveItem: (item: Partial<MenuItem>) => Promise<void>;
  onUpdatePrice: (id: string, newPrice: number) => Promise<void>;
  onToggleAvailability: (id: string, isAvailable: boolean) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onSaveSettings: (settings: CartSettings) => Promise<void>;
  onOpenSupabaseModal: () => void;
  onReloadData?: () => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  categories,
  items,
  settings,
  isSupabaseConnected,
  onGoToMenu,
  onSaveCategory,
  onDeleteCategory,
  onSaveItem,
  onUpdatePrice,
  onToggleAvailability,
  onDeleteItem,
  onSaveSettings,
  onOpenSupabaseModal,
  onReloadData,
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'items' | 'categories' | 'qrcode' | 'supabase_vercel' | 'settings'>('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Quick Exchange Rate Calculator State for Homepage
  const [calcUsd, setCalcUsd] = useState<string>('10');
  const [calcLbp, setCalcLbp] = useState<string>('895000');

  // Fast inline price edit state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [fastPriceUsd, setFastPriceUsd] = useState<string>('');
  const [fastPriceLbp, setFastPriceLbp] = useState<string>('');

  // Item Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [modalPriceUsd, setModalPriceUsd] = useState<string>('');
  const [modalPriceLbp, setModalPriceLbp] = useState<string>('');
  const [isSavingItem, setIsSavingItem] = useState(false);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  // Cart Settings Form & Popups State
  const [cartSettingsForm, setCartSettingsForm] = useState<CartSettings>(settings);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [activeSettingModal, setActiveSettingModal] = useState<'none' | 'general' | 'currency' | 'logo' | 'supabase' | 'sql'>('none');
  const [supabaseTestLoading, setSupabaseTestLoading] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    setCartSettingsForm(settings);
  }, [settings]);

  // Handler for uploading logo image file from device
  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingLogo(true);
      try {
        const compressedUrl = await compressImageFile(file, 500, 0.8);
        if (compressedUrl) {
          setCartSettingsForm((prev) => ({ ...prev, cart_logo_url: compressedUrl }));
        } else {
          alert('تعذر معالجة هذه الصورة، يرجى اختيار صورة أخرى بصيغة JPG أو PNG أو WebP');
        }
      } catch (err) {
        console.error('Logo compression failed', err);
        alert('حدث خطأ أثناء تحميل الشعار، يرجى اختيار صورة أخرى');
      } finally {
        setIsUploadingLogo(false);
        e.target.value = '';
      }
    }
  };

  // QR Code URL calculation with ?mode=qr parameter
  const getQrMenuUrl = () => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?mode=qr`;
  };

  const qrUrl = getQrMenuUrl();

  // Handler to print QR Code ONLY (no text/words on page)
  const handlePrintQrCode = () => {
    const svgElement = document.getElementById('qr-code-svg-element');
    let popupOpened = false;

    if (svgElement) {
      try {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const printWindow = window.open('', '_blank', 'width=700,height=700');
        if (printWindow) {
          popupOpened = true;
          printWindow.document.open();
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>QR Code</title>
              <style>
                @page { size: auto; margin: 0; }
                html, body {
                  margin: 0;
                  padding: 0;
                  width: 100vw;
                  height: 100vh;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  background-color: #ffffff;
                }
                .qr-box {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  width: 100%;
                  height: 100%;
                }
                svg {
                  width: 350px !important;
                  height: 350px !important;
                  max-width: 85vw;
                  max-height: 85vh;
                }
              </style>
            </head>
            <body>
              <div class="qr-box">
                ${svgData}
              </div>
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                    window.close();
                  }, 300);
                };
              </script>
            </body>
            </html>
          `);
          printWindow.document.close();
        }
      } catch (e) {
        console.warn('Print popup failed', e);
      }
    }

    if (!popupOpened) {
      window.print();
    }
  };

  // Handler to download QR Code as a JPG image
  const handleDownloadQrJpg = () => {
    const svgElement = document.getElementById('qr-code-svg-element');
    if (!svgElement) return;

    try {
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobURL = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 1000; // High resolution JPG output
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill white background (required for JPG format)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, size, size);

          // Draw QR code centered with slight padding
          const padding = 60;
          ctx.drawImage(image, padding, padding, size - padding * 2, size - padding * 2);

          const jpgUrl = canvas.toDataURL('image/jpeg', 0.95);
          const downloadLink = document.createElement('a');
          downloadLink.href = jpgUrl;
          downloadLink.download = 'menu-qr-code.jpg';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
        URL.revokeObjectURL(blobURL);
      };
      image.src = blobURL;
    } catch (e) {
      console.error('Failed to download QR Code as JPG', e);
      alert('حدث خطأ أثناء تحميل صورة الـ QR Code');
    }
  };

  // Handlers for Item editing
  const handleOpenAddItem = () => {
    const rate = settings.exchange_rate || 89500;
    const defaultPrice = settings.base_currency === 'LBP' ? 450000 : 5;
    setEditingItem({
      category_id: categories[0]?.id || '',
      name: '',
      description: '',
      price: defaultPrice,
      image_url: '',
      is_available: true,
      badge: '',
    });
    if (settings.base_currency === 'LBP') {
      setModalPriceLbp('450000');
      setModalPriceUsd(rate > 0 ? (450000 / rate).toFixed(2) : '5.00');
    } else {
      setModalPriceUsd('5');
      setModalPriceLbp(Math.round(5 * rate).toString());
    }
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    const rate = settings.exchange_rate || 89500;
    if (settings.base_currency === 'LBP') {
      setModalPriceLbp(item.price.toString());
      setModalPriceUsd(rate > 0 ? (item.price / rate).toFixed(2) : '0');
    } else {
      setModalPriceUsd(item.price.toString());
      setModalPriceLbp(Math.round(item.price * rate).toString());
    }
    setIsItemModalOpen(true);
  };

  const handleModalUsdChange = (val: string) => {
    setModalPriceUsd(val);
    const rate = settings.exchange_rate || 89500;
    const num = parseFloat(val);
    const convertedLbp = !isNaN(num) && num >= 0 ? Math.round(num * rate) : 0;
    setModalPriceLbp(convertedLbp ? convertedLbp.toString() : '');

    if (editingItem) {
      const priceToStore = settings.base_currency === 'LBP' ? convertedLbp : (isNaN(num) ? 0 : num);
      setEditingItem({ ...editingItem, price: priceToStore });
    }
  };

  const handleModalLbpChange = (val: string) => {
    setModalPriceLbp(val);
    const rate = settings.exchange_rate || 89500;
    const num = parseFloat(val);
    const convertedUsd = !isNaN(num) && num >= 0 && rate > 0 ? Number((num / rate).toFixed(2)) : 0;
    setModalPriceUsd(convertedUsd ? convertedUsd.toString() : '');

    if (editingItem) {
      const priceToStore = settings.base_currency === 'LBP' ? (isNaN(num) ? 0 : num) : convertedUsd;
      setEditingItem({ ...editingItem, price: priceToStore });
    }
  };

  const handleSaveItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name || !editingItem.category_id || isSavingItem) return;
    setIsSavingItem(true);
    try {
      await onSaveItem(editingItem);
      setIsItemModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Error saving item:', err);
    } finally {
      setIsSavingItem(false);
    }
  };

  // Handlers for Category editing
  const handleOpenAddCategory = () => {
    setEditingCategory({ name: '', icon: '🥞', sort_order: categories.length + 1 });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name) return;
    await onSaveCategory(editingCategory);
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  // Fast Price Inline Editing Handlers
  const handleStartPriceEdit = (item: MenuItem) => {
    setEditingPriceId(item.id);
    const rate = settings.exchange_rate || 89500;
    if (settings.base_currency === 'LBP') {
      setFastPriceLbp(item.price.toString());
      setFastPriceUsd(rate > 0 ? (item.price / rate).toFixed(2) : '0');
    } else {
      setFastPriceUsd(item.price.toString());
      setFastPriceLbp(Math.round(item.price * rate).toString());
    }
  };

  const handleFastPriceUsdChange = (val: string) => {
    setFastPriceUsd(val);
    const rate = settings.exchange_rate || 89500;
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setFastPriceLbp(Math.round(num * rate).toString());
    } else {
      setFastPriceLbp('');
    }
  };

  const handleFastPriceLbpChange = (val: string) => {
    setFastPriceLbp(val);
    const rate = settings.exchange_rate || 89500;
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && rate > 0) {
      setFastPriceUsd((num / rate).toFixed(2));
    } else {
      setFastPriceUsd('');
    }
  };

  const handleSaveFastPrice = async (id: string) => {
    let num = 0;
    if (settings.base_currency === 'LBP') {
      num = parseFloat(fastPriceLbp) || 0;
    } else {
      num = parseFloat(fastPriceUsd) || 0;
    }
    await onUpdatePrice(id, num);
    setEditingPriceId(null);
  };

  // Save Cart Settings
  const handleSaveCartSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await onSaveSettings(cartSettingsForm);
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 2500);
  };

  // Test Supabase Connection Handler
  const handleTestSupabaseConnection = async (urlToTest?: string, keyToTest?: string) => {
    setSupabaseTestLoading(true);
    setSupabaseTestResult(null);
    try {
      const res = await testSupabaseConnection(
        urlToTest !== undefined ? urlToTest : cartSettingsForm.supabase_url,
        keyToTest !== undefined ? keyToTest : cartSettingsForm.supabase_anon_key
      );
      setSupabaseTestResult(res);
      if (res.success && onReloadData) {
        await onReloadData();
      }
    } catch (e: any) {
      setSupabaseTestResult({
        success: false,
        message: 'حدث خطأ غير متوقع عند إجراء الفحص.',
        details: e?.message || '',
      });
    } finally {
      setSupabaseTestLoading(false);
    }
  };

  // Sync All Data to Supabase Handler
  const handleSyncDataToSupabase = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      await onSaveSettings(cartSettingsForm);
      const res = await syncAllLocalToSupabase();
      setSyncResult(res);
      if (res.success && onReloadData) {
        await onReloadData();
      }
    } catch (e: any) {
      setSyncResult({
        success: false,
        message: 'حدث خطأ أثناء نقل البيانات إلى Supabase.',
        details: e?.message || '',
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const filteredItems = items.filter(
    (item) => selectedCategoryFilter === 'all' || item.category_id === selectedCategoryFilter
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D2D2D] pb-20 select-none">
      {/* Mobile Header with Side Drawer Hamburger Toggle */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 px-3.5 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* HAMBURGER MENU BUTTON FOR SIDE DRAWER */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl transition-all shadow-xs active:scale-95 flex items-center justify-center cursor-pointer"
              title="فتح القائمة الجانبية"
            >
              <Menu className="w-5 h-5 stroke-[2.5]" />
            </button>

            {/* CART LOGO & TITLE */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSettingModal('logo')}
                className="w-8 h-8 rounded-xl bg-yellow-400 flex items-center justify-center text-slate-950 font-black text-sm shadow-xs overflow-hidden shrink-0 hover:ring-2 hover:ring-yellow-500 transition-all cursor-pointer"
                title="انقر لتغيير صورة الشعار"
              >
                {settings.cart_logo_url ? (
                  <img
                    src={settings.cart_logo_url}
                    alt="Logo"
                    referrerPolicy="no-referrer"
                    onError={(e) => handleImgError(e)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  '🥞'
                )}
              </button>
              <div>
                <h1 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  {settings.cart_name}
                </h1>
              </div>
            </div>
          </div>

          {/* STATUS DROPDOWN (منسدلة الحالة) */}
          <div className="relative">
            <button
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>الحالة</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Content */}
            {isStatusDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsStatusDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-2 z-50 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 text-right space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-500" />
                      حالة النظام والاتصال
                    </span>
                    <button
                      onClick={() => setIsStatusDropdownOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Sync status pill section */}
                  <div className="bg-gray-50 rounded-xl p-2.5 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500">حالة التزامن مع السحاب:</div>
                    <SyncStatusPill onRefreshData={onReloadData} />
                  </div>

                  {/* Supabase Connection Status */}
                  <div className="flex items-center justify-between px-1 py-1 text-xs">
                    <span className="text-slate-600 font-semibold">قاعدة البيانات:</span>
                    <span className={`font-bold flex items-center gap-1 ${isSupabaseConnected ? 'text-emerald-600' : 'text-amber-600'}`}>
                      <span className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {isSupabaseConnected ? 'Supabase متصل' : 'مستودع محلي'}
                    </span>
                  </div>

                  {/* Open Menu Button */}
                  <button
                    onClick={() => {
                      setIsStatusDropdownOpen(false);
                      onGoToMenu();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <Eye className="w-4 h-4" />
                    <span>معاينة المنيو للزبائن</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* SIDE NAVIGATION DRAWER (منسدلة جانبية) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-start">
          {/* Backdrop Overlay */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Sliding Side Panel (Drawer) */}
          <aside className="relative z-10 w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between border-l border-gray-200 animate-in slide-in-from-right duration-250 overflow-hidden">
            {/* Drawer Header */}
            <div className="flex-1 flex flex-col overflow-y-auto touch-scroll">
              <div className="p-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setActiveSettingModal('logo');
                    }}
                    className="w-9 h-9 rounded-xl bg-yellow-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-sm overflow-hidden shrink-0 hover:ring-2 hover:ring-yellow-300 transition-all cursor-pointer"
                    title="تغيير صورة الشعار"
                  >
                    {settings.cart_logo_url ? (
                      <img
                        src={settings.cart_logo_url}
                        alt="Logo"
                        referrerPolicy="no-referrer"
                        onError={(e) => handleImgError(e)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      '🥞'
                    )}
                  </button>
                  <div>
                    <h2 className="font-bold text-xs text-white">{settings.cart_name}</h2>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="إغلاق القائمة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items List */}
              <nav className="p-3 space-y-1.5 text-xs font-semibold overflow-y-auto touch-scroll flex-1">
                <div className="text-[10px] font-bold text-slate-400 px-3 pt-2 pb-1">الأقسام الرئيسية:</div>

                {/* 1. HOME / DASHBOARD */}
                <button
                  onClick={() => {
                    setActiveTab('home');
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'home'
                      ? 'bg-yellow-400 text-slate-950 font-black shadow-xs'
                      : 'text-slate-700 hover:bg-gray-100 hover:text-slate-950'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Home className="w-4 h-4 shrink-0" />
                    <span>الصفحة الرئيسية</span>
                  </div>
                  {activeTab === 'home' && <Check className="w-4 h-4 stroke-[3]" />}
                </button>

                {/* 2. ITEMS & PRICES */}
                <button
                  onClick={() => {
                    setActiveTab('items');
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'items'
                      ? 'bg-yellow-400 text-slate-950 font-black shadow-xs'
                      : 'text-slate-700 hover:bg-gray-100 hover:text-slate-950'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 shrink-0" />
                    <span>الأصناف والأسعار</span>
                  </div>
                  <span className="text-[10px] bg-white/80 px-2 py-0.5 rounded-md font-bold text-slate-800 border border-gray-200">
                    {items.length} صنف
                  </span>
                </button>

                {/* 3. CATEGORIES */}
                <button
                  onClick={() => {
                    setActiveTab('categories');
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'categories'
                      ? 'bg-yellow-400 text-slate-950 font-black shadow-xs'
                      : 'text-slate-700 hover:bg-gray-100 hover:text-slate-950'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Tag className="w-4 h-4 shrink-0" />
                    <span>الفئات والأقسام</span>
                  </div>
                  <span className="text-[10px] bg-white/80 px-2 py-0.5 rounded-md font-bold text-slate-800 border border-gray-200">
                    {categories.length} فئة
                  </span>
                </button>

                {/* 4. QR CODE */}
                <button
                  onClick={() => {
                    setActiveTab('qrcode');
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'qrcode'
                      ? 'bg-yellow-400 text-slate-950 font-black shadow-xs'
                      : 'text-slate-700 hover:bg-gray-100 hover:text-slate-950'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <QrCode className="w-4 h-4 shrink-0" />
                    <span>رمز QR ومشاركة المنيو</span>
                  </div>
                </button>

                {/* 5. CART SETTINGS */}
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-yellow-400 text-slate-950 font-black shadow-xs'
                      : 'text-slate-700 hover:bg-gray-100 hover:text-slate-950'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4 shrink-0" />
                    <span>إعدادات النظام والعملة</span>
                  </div>
                </button>
              </nav>
            </div>

            {/* Drawer Bottom Info */}
            <div className="p-3 bg-amber-50 border-t border-amber-200 m-3 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-[11px] font-extrabold text-amber-950">
                <span>سعر الصرف الحالي:</span>
                <span className="bg-white px-2 py-0.5 rounded-md border border-amber-300">
                  1$ = {settings.exchange_rate?.toLocaleString() || 89500} ل.ل.
                </span>
              </div>
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  setActiveTab('settings');
                  setActiveSettingModal('currency');
                }}
                className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-xl text-center transition-colors cursor-pointer"
              >
                تعديل سعر الصرف والعملة 💵
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* TAB 0: HOMEPAGE (الصفحة الرئيسية / لوحة الملخص الإحصائي) */}
      {activeTab === 'home' && (
        <main className="max-w-md mx-auto px-3 py-3.5 space-y-3.5 text-xs">
          {/* WELCOME BANNER */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white rounded-2xl p-4 shadow-md space-y-2.5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setActiveSettingModal('logo')}
                  className="w-10 h-10 rounded-2xl bg-yellow-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-md shrink-0 overflow-hidden hover:ring-2 hover:ring-yellow-300 transition-all cursor-pointer"
                  title="تغيير صورة الشعار"
                >
                  {settings.cart_logo_url ? (
                    <img src={settings.cart_logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    '🥞'
                  )}
                </button>
                <div>
                  <h2 className="text-sm font-black text-white">{settings.cart_name} 👋</h2>
                  <p className="text-[10px] text-yellow-200/90 font-medium">لوحة التحكم والملخص الإحصائي الشامل</p>
                </div>
              </div>

              {/* DYNAMIC SUPABASE CONNECTION STATUS */}
              {isSupabaseConnected ? (
                <button
                  onClick={onOpenSupabaseModal}
                  className="text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                  title="انقر لإدارة الاتصال بـ Supabase"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  متصل بـ Supabase 🟢
                </button>
              ) : (
                <button
                  onClick={onOpenSupabaseModal}
                  className="text-[9px] font-extrabold bg-amber-500/30 text-amber-200 border border-amber-400/50 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 hover:bg-amber-500/40 transition-colors cursor-pointer"
                  title="انقر لربط قاعدة بيانات Supabase"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  غير متصل (تخزين محلي) 🔗
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-[11px] text-slate-300">
              <span className="font-semibold">سعر صرف الدولار الحالي:</span>
              <span className="font-black text-yellow-300 bg-yellow-400/10 px-2 py-0.5 rounded-lg border border-yellow-400/30">
                1$ = {settings.exchange_rate?.toLocaleString() || 89500} ل.ل.
              </span>
            </div>
          </div>

          {/* 4 KPI CARDS */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* KPI 1: Total Items */}
            <div
              onClick={() => setActiveTab('items')}
              className="bg-white border border-gray-200 hover:border-yellow-400 rounded-2xl p-3 shadow-2xs space-y-1.5 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500">إجمالي الأصناف</span>
                <div className="p-1.5 bg-yellow-50 text-yellow-800 rounded-lg group-hover:bg-yellow-400 group-hover:text-slate-950 transition-colors">
                  <Layers className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-lg font-black text-slate-900">{items.length} <span className="text-xs font-normal text-slate-500">صنف</span></div>
              <div className="text-[9.5px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {items.filter((i) => i.is_available).length} صنف متوفر بالمنيو
              </div>
            </div>

            {/* KPI 2: Categories */}
            <div
              onClick={() => setActiveTab('categories')}
              className="bg-white border border-gray-200 hover:border-yellow-400 rounded-2xl p-3 shadow-2xs space-y-1.5 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500">أقسام المنيو</span>
                <div className="p-1.5 bg-amber-50 text-amber-800 rounded-lg group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                  <Tag className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-lg font-black text-slate-900">{categories.length} <span className="text-xs font-normal text-slate-500">فئات</span></div>
              <div className="text-[9.5px] font-bold text-slate-500">
                تعديل وإضافة الفئات
              </div>
            </div>

            {/* KPI 3: Exchange Rate */}
            <div
              onClick={() => {
                setActiveTab('settings');
                setActiveSettingModal('currency');
              }}
              className="bg-amber-50/70 border border-amber-200 hover:border-amber-400 rounded-2xl p-3 shadow-2xs space-y-1.5 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-amber-900">سعر الصرف</span>
                <div className="p-1.5 bg-amber-200 text-amber-900 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xs font-black text-amber-950">
                1$ = {settings.exchange_rate?.toLocaleString() || 89500} ل.ل.
              </div>
              <div className="text-[9.5px] font-bold text-amber-800 underline">
                تعديل السعر ➔
              </div>
            </div>

            {/* KPI 4: Customer Menu View */}
            <div
              onClick={onGoToMenu}
              className="bg-slate-900 text-white border border-slate-800 hover:bg-black rounded-2xl p-3 shadow-2xs space-y-1.5 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-300">منيو الزبائن</span>
                <div className="p-1.5 bg-yellow-400 text-slate-950 rounded-lg">
                  <Eye className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xs font-black text-yellow-300">معاينة مباشرة</div>
              <div className="text-[9.5px] font-bold text-slate-400 flex items-center gap-1">
                <span>فتح المنيو الآن</span> ➔
              </div>
            </div>
          </div>

          {/* QUICK ACTIONS BAR */}
          <div className="bg-white border border-gray-200 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-yellow-600" />
              عمليات وإجراءات سريعة:
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleOpenAddItem}
                className="py-2.5 px-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                إضافة صنف جديد
              </button>

              <button
                onClick={handleOpenAddCategory}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-gray-200"
              >
                <Tag className="w-4 h-4 text-yellow-700" />
                إضافة قسم جديد
              </button>

              <button
                onClick={() => setActiveTab('qrcode')}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-gray-200"
              >
                <QrCode className="w-4 h-4 text-yellow-700" />
                طباعة QR Code
              </button>

              <button
                onClick={() => {
                  setActiveTab('settings');
                  setActiveSettingModal('currency');
                }}
                className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <DollarSign className="w-4 h-4" />
                تعديل الصرف
              </button>
            </div>
          </div>

          {/* QUICK EXCHANGE RATE CALCULATOR WIDGET */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                <Calculator className="w-4 h-4 text-amber-700" />
                <span>حاسبة تحويل العملة السريعة ($ و ل.ل.)</span>
              </div>
              <span className="text-[10px] font-extrabold text-amber-800 bg-white px-2 py-0.5 rounded-md border border-amber-300">
                1$ = {settings.exchange_rate?.toLocaleString() || 89500} ل.ل.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700">المبلغ بالدولار ($):</label>
                <input
                  type="number"
                  step="any"
                  value={calcUsd}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCalcUsd(val);
                    const rate = settings.exchange_rate || 89500;
                    const num = parseFloat(val);
                    if (!isNaN(num) && num >= 0) {
                      setCalcLbp(Math.round(num * rate).toString());
                    } else {
                      setCalcLbp('');
                    }
                  }}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-amber-950 font-black focus:outline-none focus:border-amber-500"
                  placeholder="10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700">المبلغ بالليرة (ل.ل.):</label>
                <input
                  type="number"
                  step="1000"
                  value={calcLbp}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCalcLbp(val);
                    const rate = settings.exchange_rate || 89500;
                    const num = parseFloat(val);
                    if (!isNaN(num) && num >= 0 && rate > 0) {
                      setCalcUsd((num / rate).toFixed(2));
                    } else {
                      setCalcUsd('');
                    }
                  }}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-amber-950 font-black focus:outline-none focus:border-amber-500"
                  placeholder="895000"
                />
              </div>
            </div>

            <div className="text-[10px] font-extrabold text-amber-950 bg-white/90 p-2 rounded-xl border border-amber-200 text-center">
              ✨ النتيجة: {parseFloat(calcUsd) || 0}$ تعادل{' '}
              <span className="text-amber-800 font-black">
                {formatDualPrice(parseFloat(calcUsd) || 0, { ...settings, base_currency: 'USD' }).lbpFormatted}
              </span>
            </div>
          </div>

          {/* FEATURED / TOP MENU ITEMS PREVIEW */}
          <div className="bg-white border border-gray-200 rounded-2xl p-3.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-yellow-600" />
                أبرز أصناف المنيو والاكثر طلباً 🔥
              </h3>
              <button
                onClick={() => setActiveTab('items')}
                className="text-[10px] font-bold text-yellow-800 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                عرض الكل ({items.length}) ➔
              </button>
            </div>

            <div className="space-y-2">
              {items.slice(0, 4).map((item) => {
                const dualPrice = formatDualPrice(item.price, settings);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200 hover:border-yellow-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-gray-200 overflow-hidden shrink-0 border border-gray-300">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            onError={(e) => handleImgError(e)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">🥞</div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <h4 className="font-bold text-slate-900 text-xs">{item.name}</h4>
                          {item.badge && (
                            <span className="text-[8px] font-extrabold bg-yellow-400 text-slate-950 px-1.5 py-0.2 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-amber-900 font-extrabold">{dualPrice.fullDisplay}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onToggleAvailability(item.id, !item.is_available)}
                        className={`text-[10px] font-extrabold px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                          item.is_available
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {item.is_available ? 'متوفر' : 'نفذت'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      )}

      {/* TAB 1: MENU ITEMS & FAST PRICE EDITING */}
      {activeTab === 'items' && (
        <main className="max-w-md mx-auto px-3 py-3 space-y-3">
          {/* Top Actions */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleOpenAddItem}
              className="flex-1 py-2 px-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              إضافة صنف كريب جديد
            </button>
          </div>

          {/* Category Filter Horizontal */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-scroll py-1 text-xs -mx-1 px-1">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap border ${
                selectedCategoryFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-gray-50 border-gray-200'
              }`}
            >
              الكل ({items.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1 border ${
                  selectedCategoryFilter === cat.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-gray-50 border-gray-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Items List */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 p-4 space-y-2 shadow-xs">
              <p className="text-xs text-slate-600 font-medium">لا توجد أصناف في هذه الفئة حالياً</p>
              <button
                onClick={handleOpenAddItem}
                className="text-xs text-yellow-700 font-bold underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> اضغط لإضافة أول صنف
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white border rounded-2xl p-3 space-y-2 transition-all shadow-xs ${
                    !item.is_available ? 'border-red-200 bg-red-50/20 opacity-75' : 'border-gray-200'
                  }`}
                >
                  <div className="flex gap-2.5">
                    {/* Image */}
                    <div className="w-16 h-16 rounded-xl bg-gray-50 shrink-0 overflow-hidden border border-gray-200 relative">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => handleImgError(e)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl bg-yellow-50/50">🥞</div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="text-xs font-bold text-slate-900 truncate">{item.name}</h3>
                        <span className="text-[9px] text-slate-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 shrink-0 font-medium">
                          {categories.find((c) => c.id === item.category_id)?.name || 'عام'}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{item.description}</p>
                      )}

                      {/* FAST PRICE EDIT AREA */}
                      <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-gray-100">
                        {editingPriceId === item.id ? (
                          <div className="flex flex-col gap-1.5 w-full bg-yellow-50/90 p-2.5 rounded-xl border border-yellow-300">
                            <div className="text-[10px] font-extrabold text-amber-900 flex items-center justify-between">
                              <span>تعديل السعر بـ (الدولار $ أو الليرة ل.ل.):</span>
                              <span className="text-[9px] font-semibold text-amber-700">
                                1$ = {settings.exchange_rate?.toLocaleString() || 89500} ل.ل.
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                              <div className="space-y-0.5">
                                <label className="text-[9px] font-bold text-slate-700">بالدولار ($):</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={fastPriceUsd}
                                  onChange={(e) => handleFastPriceUsdChange(e.target.value)}
                                  placeholder="5.00"
                                  className="w-full bg-white border border-yellow-400 rounded px-2 py-1 text-xs text-slate-900 font-extrabold focus:outline-none focus:ring-1 focus:ring-yellow-400"
                                />
                              </div>

                              <div className="space-y-0.5">
                                <label className="text-[9px] font-bold text-slate-700">بالليرة (ل.ل.):</label>
                                <input
                                  type="number"
                                  step="100"
                                  value={fastPriceLbp}
                                  onChange={(e) => handleFastPriceLbpChange(e.target.value)}
                                  placeholder="450000"
                                  className="w-full bg-white border border-yellow-400 rounded px-2 py-1 text-xs text-slate-900 font-extrabold focus:outline-none focus:ring-1 focus:ring-yellow-400"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-yellow-200/60">
                              <div className="text-[10px] font-extrabold text-slate-800">
                                النتيجة:{' '}
                                <span className="text-amber-900">
                                  {
                                    formatDualPrice(
                                      settings.base_currency === 'LBP'
                                        ? parseFloat(fastPriceLbp) || 0
                                        : parseFloat(fastPriceUsd) || 0,
                                      settings
                                    ).fullDisplay
                                  }
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleSaveFastPrice(item.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                                  title="حفظ السعر"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" /> حفظ
                                </button>
                                <button
                                  onClick={() => setEditingPriceId(null)}
                                  className="p-1 bg-gray-200 text-slate-600 rounded-lg hover:text-slate-900"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartPriceEdit(item)}
                            className="flex items-center gap-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-900 border border-yellow-300 px-2.5 py-1 rounded-lg text-xs font-black transition-all group"
                            title="انقر لتعديل السعر مباشرة"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-yellow-600 group-hover:scale-110 transition-transform" />
                            <span>{formatDualPrice(item.price, settings).fullDisplay}</span>
                            <span className="text-[9px] text-yellow-700 font-normal mr-1">(تعديل السعر)</span>
                          </button>
                        )}

                        {/* Availability Toggle */}
                        <button
                          onClick={() => onToggleAvailability(item.id, !item.is_available)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors shrink-0 ${
                            item.is_available
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {item.is_available ? 'متوفر' : 'غير متوفر'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-gray-100 text-xs">
                    <button
                      onClick={() => handleOpenEditItem(item)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Edit2 className="w-3 h-3 text-yellow-700" />
                      تعديل التفاصيل والصورة
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`هل أنت تأكد من حذف صنف "${item.name}"؟`)) {
                          onDeleteItem(item.id);
                        }
                      }}
                      className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 border border-red-200 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* TAB 2: CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <main className="max-w-md mx-auto px-3 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800">فئات الكريب والوجبات ({categories.length})</h2>
            <button
              onClick={handleOpenAddCategory}
              className="py-1.5 px-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              إضافة فئة جديدة
            </button>
          </div>

          <div className="space-y-2">
            {categories.map((cat) => {
              const count = items.filter((i) => i.category_id === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center justify-between shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl bg-yellow-50 p-1.5 rounded-xl border border-yellow-200">{cat.icon || '🥞'}</span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">{cat.name}</h3>
                      <p className="text-[10px] text-slate-500">{count} أصناف تابعة لهذه الفئة</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditCategory(cat)}
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-lg text-xs"
                      title="تعديل"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-yellow-700" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`هل تريد حذف فئة "${cat.name}"؟ سيتم حذف الأصناف التابعة لها أيضاً.`)) {
                          onDeleteCategory(cat.id);
                        }
                      }}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs border border-red-200"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* TAB 3: QR CODE & MENU LINK */}
      {activeTab === 'qrcode' && (
        <main className="max-w-md mx-auto px-3 py-3 space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center space-y-3 shadow-xs">
            <div className="inline-flex p-2 bg-yellow-100 text-yellow-800 rounded-2xl border border-yellow-300">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">رمز QR للمنيو المباشر للزبائن</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                عند مسح هذا الرمز بواسطة هاتف الزبون، سيفتح المنيو في وضع الزبائن وتختفي زر العودة للبرنامج تلقائياً.
              </p>
            </div>

            {/* QR Code Canvas Frame */}
            <div className="bg-white p-4 rounded-2xl inline-block shadow-md border-4 border-yellow-400 my-2">
              <QRCodeSVG
                id="qr-code-svg-element"
                value={qrUrl || 'https://crepe-cart.app?mode=qr'}
                size={185}
                bgColor="#ffffff"
                fgColor="#1e293b"
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Standalone hidden container for clean direct window printing */}
            <div id="printable-qr-standalone" className="hidden">
              <QRCodeSVG
                value={qrUrl || 'https://crepe-cart.app?mode=qr'}
                size={340}
                bgColor="#ffffff"
                fgColor="#1e293b"
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Print & Download Actions */}
            <div className="pt-1 space-y-2">
              <button
                onClick={handleDownloadQrJpg}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 text-xs"
              >
                <Download className="w-4.5 h-4.5 text-slate-950" />
                تنزيل QR Code كصورة (JPG)
              </button>

              <button
                onClick={handlePrintQrCode}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 text-xs"
              >
                <Printer className="w-4.5 h-4.5 text-emerald-200" />
                طباعة QR Code فقط (بدون أي نصوص)
              </button>
            </div>

            {/* Link Container */}
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-left dir-ltr space-y-1">
              <div className="text-[10px] text-yellow-800 font-mono break-all select-all font-semibold">{qrUrl}</div>
            </div>

            {/* Copy / Open Actions */}
            <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-1">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrUrl);
                  alert('تم نسخ رابط QR الخاص بالزبائن إلى الحافظة!');
                }}
                className="py-2.5 px-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                نسخ رابط QR
              </button>

              <button
                onClick={() => window.open(qrUrl, '_blank')}
                className="py-2.5 px-3 bg-[#2D2D2D] hover:bg-black text-white rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5 text-yellow-400" />
                تجربة المنيو بـ QR
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-3.5 text-xs text-slate-700 space-y-2 shadow-xs">
            <h3 className="font-bold text-yellow-800 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              كيف يعمل قفل العودة في QR Code؟
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              عندما يتصفح الزبون المنيو من خلال ماسح QR (حيث يتضمن الرابط <code className="text-yellow-800 bg-yellow-100 px-1 rounded font-bold">?mode=qr</code>)، يتم إخفاء زر العودة إلى البرنامج أو لوحة التحكم نهائياً، مما يضمن أمان معلوماتك وأسعارك من التعديل بواسطة أي زبون.
            </p>
          </div>
        </main>
      )}

      {/* TAB 4: SUPABASE & VERCEL SETUP GUIDE */}
      {activeTab === 'supabase_vercel' && (
        <main className="max-w-md mx-auto px-3 py-3 space-y-4 text-xs">
          {/* Supabase Status Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">ربط Supabase</h3>
                  <p className="text-[10px] text-slate-500">مزامنة البيانات سحابياً عبر كافة الأجهزة</p>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isSupabaseConnected
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                }`}
              >
                {isSupabaseConnected ? 'متصل ومفعل' : 'تخزين محلي'}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              يمكنك ربط هذا التطبيق بقاعدة بيانات Supabase مجاناً لتخزين أسعار الكريب وفئاته في السحاب، وتحديث المنيو فورياً لدى جميع الزبائن!
            </p>

            <button
              onClick={onOpenSupabaseModal}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <Database className="w-4 h-4" />
              {isSupabaseConnected ? 'إدارة مفاتيح Supabase' : 'ربط قاعدة بيانات Supabase الآن'}
            </button>
          </div>

          {/* Vercel Deployment Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-xs">تشغيل البرنامج على Vercel</h3>
                <p className="text-[10px] text-slate-500">استضافة مجانية وسريعة جداً</p>
              </div>
            </div>

            <ol className="list-decimal list-inside text-[11px] text-slate-600 space-y-2 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-200">
              <li>
                قم بتنزيل أوراق المشروع كـ <strong className="text-yellow-800">ZIP</strong> أو رفعه إلى <strong className="text-yellow-800">GitHub</strong>.
              </li>
              <li>
                افتح <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline">Vercel.com</a> وسجل دخولك ثم اضغط <strong className="text-slate-900">Add New Project</strong>.
              </li>
              <li>
                اختر المستودع واضغط <strong className="text-slate-900">Deploy</strong>. تم إعداد ملف <code className="text-yellow-800">vercel.json</code> تلقائياً لدعم التوجيه السليم.
              </li>
              <li>
                أضف متغيرات البيئة <code className="text-yellow-800">VITE_SUPABASE_URL</code> و <code className="text-yellow-800">VITE_SUPABASE_ANON_KEY</code> في إعدادات Vercel إذا أردت.
              </li>
            </ol>
          </div>
        </main>
      )}

      {/* TAB 5: CART SETTINGS VIA POPUP MODALS */}
      {activeTab === 'settings' && (
        <main className="max-w-md mx-auto px-3 py-3 space-y-3.5 text-xs">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-yellow-100 text-yellow-800 flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-xs">إعدادات النظام والعملة</h2>
                  <p className="text-[10px] text-slate-500">اختر القسم المراد تعديله في نافذة منبثقة</p>
                </div>
              </div>
            </div>

            {/* BUTTON CARDS GRID */}
            <div className="grid grid-cols-1 gap-2.5 pt-1">
              {/* BUTTON 1: LOGO CUSTOMIZATION */}
              <button
                onClick={() => setActiveSettingModal('logo')}
                className="w-full bg-yellow-50/80 hover:bg-yellow-100 border border-yellow-200 rounded-xl p-3 flex items-center justify-between text-right transition-all group shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-yellow-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-xs overflow-hidden shrink-0">
                    {cartSettingsForm.cart_logo_url ? (
                      <img
                        src={cartSettingsForm.cart_logo_url}
                        alt="Logo"
                        referrerPolicy="no-referrer"
                        onError={(e) => handleImgError(e)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      '🥞'
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs group-hover:text-yellow-950">
                      تغيير صورة / شعار البرنامج بالرأس
                    </h3>
                    <p className="text-[10px] text-slate-600">رفع صورة خاصة من جهازك، اختيار شعار جاهز أو إدخال رابط</p>
                  </div>
                </div>
              </button>

              {/* BUTTON 2: GENERAL SETTINGS */}
              <button
                onClick={() => setActiveSettingModal('general')}
                className="w-full bg-slate-50 hover:bg-yellow-50/60 border border-gray-200 hover:border-yellow-300 rounded-xl p-3 flex items-center justify-between text-right transition-all group shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white rounded-lg border border-gray-200 text-slate-800 group-hover:border-yellow-400 group-hover:text-yellow-800 transition-colors">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs group-hover:text-yellow-950">
                      معلومات العربة والواتساب
                    </h3>
                    <p className="text-[10px] text-slate-500">اسم المقهى، الوصف، ورقم الطلبات عبر الواتساب</p>
                  </div>
                </div>
              </button>

              {/* BUTTON 3: CURRENCY & EXCHANGE RATE SETTINGS */}
              <button
                onClick={() => setActiveSettingModal('currency')}
                className="w-full bg-amber-50/50 hover:bg-amber-100/60 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-right transition-all group shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white rounded-lg border border-amber-300 text-amber-800 shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-950 text-xs">إعدادات العملتين وسعر الصرف</h3>
                    <p className="text-[10px] text-amber-800/80">
                      تحديد سعر الدولار مقابل الليرة وتفعيل التحويل التلقائي
                    </p>
                  </div>
                </div>
              </button>

              {/* BUTTON 4: SUPABASE CONNECTION & TEST */}
              <button
                onClick={() => {
                  setSupabaseTestResult(null);
                  setActiveSettingModal('supabase');
                }}
                className="w-full bg-emerald-50/50 hover:bg-emerald-100/60 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-right transition-all group shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white rounded-lg border border-emerald-300 text-emerald-800 shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-950 text-xs">ربط وحساب Supabase السحابي</h3>
                    <p className="text-[10px] text-emerald-800/80">إدخال المفاتيح وفحص الاتصال المباشر بقاعدة البيانات</p>
                  </div>
                </div>
              </button>

              {/* BUTTON 5: SQL SCRIPT FOR SUPABASE */}
              <button
                onClick={() => setActiveSettingModal('sql')}
                className="w-full bg-gray-50 hover:bg-slate-100 border border-gray-200 rounded-xl p-3 flex items-center justify-between text-right transition-all group shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white rounded-lg border border-gray-300 text-slate-700 shrink-0">
                    <Copy className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">كود SQL لتجهيز الجداول في Supabase</h3>
                    <p className="text-[10px] text-slate-500">نسخ السكريبت وإنشاء الجداول بنقرة واحدة</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* HELPFUL ADVICE */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-xs">
            <h3 className="font-bold text-yellow-800 flex items-center gap-1.5 text-xs">
              <HelpCircle className="w-4 h-4" />
              أفكار ونصائح مفيدة لعربة الكريب الخاصة بك 💡
            </h3>

            <div className="space-y-2.5 text-[11px] text-slate-600 leading-relaxed">
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span className="font-bold text-slate-900 block mb-0.5">1. كريب الشهر / الوجبة المميزة</span>
                <p className="text-slate-500">
                  قم بإضافة وسم <strong className="text-yellow-800">"الأكثر طلباً 🔥"</strong> على الكريب الحلو مثل النوتيلا واللوتس لجذب انتباه الزبون فوراً.
                </p>
              </div>

              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span className="font-bold text-slate-900 block mb-0.5">2. تعديل الأسعار السريع بالعملتين</span>
                <p className="text-slate-500">
                  يمكنك النقر المباشر على زر السعر في قائمة الأصناف لتعديل السعر بالدولار أو بالليرة اللبنانية مع تحويل تلقائي فوري!
                </p>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* MODAL 0: LOGO & APP IMAGE CUSTOMIZATION */}
      {activeSettingModal === 'logo' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-3.5 bg-yellow-400 text-slate-950 border-b border-yellow-500 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-black flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 fill-slate-950" />
                تغيير صورة وشعار البرنامج في الرأس
              </h3>
              <button
                onClick={() => setActiveSettingModal('none')}
                className="text-slate-950 hover:bg-yellow-500/50 rounded-lg p-1 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                await handleSaveCartSettings(e);
                setActiveSettingModal('none');
              }}
              className="p-4 space-y-4 text-xs overflow-y-auto touch-scroll flex-1 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
            >
              {/* Current Preview */}
              <div className="flex flex-col items-center justify-center bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-center space-y-2">
                <span className="text-[10px] font-bold text-slate-500">معاينة الشعار الحالي للبرنامج والمنيو:</span>
                <div className="w-16 h-16 rounded-2xl bg-yellow-400 text-slate-950 flex items-center justify-center font-black text-3xl shadow-md overflow-hidden border-2 border-white">
                  {cartSettingsForm.cart_logo_url ? (
                    <img src={cartSettingsForm.cart_logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    '🥞'
                  )}
                </div>
                {cartSettingsForm.cart_logo_url && (
                  <button
                    type="button"
                    onClick={() => setCartSettingsForm({ ...cartSettingsForm, cart_logo_url: '' })}
                    className="text-[10px] text-red-600 hover:underline font-bold cursor-pointer"
                  >
                    إعادة الشعار إلى الأيقونة الافتراضية 🥞
                  </button>
                )}
              </div>

              {/* Option 1: Device Upload */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                  {isUploadingLogo ? (
                    <Loader2 className="w-3.5 h-3.5 text-yellow-600 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-yellow-600" />
                  )}
                  {isUploadingLogo ? 'جاري معالجة وضغط الشعار...' : 'رفع صورة جديدة من جهازك:'}
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/*"
                  onChange={handleLogoFileUpload}
                  disabled={isUploadingLogo}
                  className="w-full text-xs text-slate-500 file:ml-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-yellow-400 file:text-slate-950 hover:file:bg-yellow-300 cursor-pointer border border-gray-200 rounded-xl p-1 bg-white disabled:opacity-50"
                />
              </div>

              {/* Option 2: Image URL */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-800">أو إدخال رابط صورة مباشرة (URL):</label>
                <input
                  type="url"
                  value={cartSettingsForm.cart_logo_url || ''}
                  onChange={(e) => setCartSettingsForm({ ...cartSettingsForm, cart_logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 dir-ltr text-left"
                />
              </div>

              {/* Option 3: Presets */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-slate-800">أو اختر من الشعارات الجاهزة المقترحة:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'كريب نوتيلا 🥞', url: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?auto=format&fit=crop&w=300&q=80' },
                    { name: 'وافل وشوكولاتة 🧇', url: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=300&q=80' },
                    { name: 'شوكولاتة فاخرة 🍫', url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=300&q=80' },
                    { name: 'عصائر ومشروبات 🥤', url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=300&q=80' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCartSettingsForm({ ...cartSettingsForm, cart_logo_url: preset.url })}
                      className={`p-1.5 rounded-xl border flex items-center gap-2 text-right transition-all cursor-pointer ${
                        cartSettingsForm.cart_logo_url === preset.url
                          ? 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-400/50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => handleImgError(e)}
                        className="w-7 h-7 rounded-lg object-cover shrink-0"
                      />
                      <span className="text-[10px] font-bold text-slate-800 truncate">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveSettingModal('none')}
                  className="px-3.5 py-2 bg-gray-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-gray-200 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" /> اعتماد وحفظ الشعار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: GENERAL CART SETTINGS */}
      {activeSettingModal === 'general' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-yellow-600" />
                تعديل معلومات العربة والواتساب
              </h3>
              <button
                onClick={() => setActiveSettingModal('none')}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                await handleSaveCartSettings(e);
                setActiveSettingModal('none');
              }}
              className="p-4 space-y-3.5 text-xs overflow-y-auto touch-scroll flex-1 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
            >
              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-semibold">اسم العربة / المقهى:</label>
                <input
                  type="text"
                  value={cartSettingsForm.cart_name || ''}
                  onChange={(e) => setCartSettingsForm({ ...cartSettingsForm, cart_name: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-semibold">الشعار / الوصف القصير:</label>
                <input
                  type="text"
                  value={cartSettingsForm.cart_tagline || ''}
                  onChange={(e) => setCartSettingsForm({ ...cartSettingsForm, cart_tagline: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-semibold">رقم الواتساب للطلبات:</label>
                <input
                  type="text"
                  value={cartSettingsForm.whatsapp_number || ''}
                  onChange={(e) => setCartSettingsForm({ ...cartSettingsForm, whatsapp_number: e.target.value })}
                  placeholder="+961..."
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 dir-ltr text-right"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="enable-whatsapp-modal"
                  checked={cartSettingsForm.enable_whatsapp_order ?? true}
                  onChange={(e) =>
                    setCartSettingsForm({ ...cartSettingsForm, enable_whatsapp_order: e.target.checked })
                  }
                  className="w-4 h-4 accent-yellow-500 rounded"
                />
                <label htmlFor="enable-whatsapp-modal" className="text-[11px] text-slate-700 font-medium cursor-pointer">
                  تفعيل أزرار الطلب المباشر عبر الواتساب للزبائن
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveSettingModal('none')}
                  className="px-3.5 py-2 bg-gray-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-gray-200 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" /> حفظ الإعدادات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CURRENCY & EXCHANGE RATE SETTINGS */}
      {activeSettingModal === 'currency' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-3.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-700" />
                تعديل إعدادات العملتين وسعر الصرف
              </h3>
              <button
                onClick={() => setActiveSettingModal('none')}
                className="text-amber-800 hover:text-amber-950 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                await handleSaveCartSettings(e);
                setActiveSettingModal('none');
              }}
              className="p-4 space-y-3.5 text-xs overflow-y-auto touch-scroll flex-1 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
            >
              <div className="flex items-center justify-between p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <label htmlFor="modal-enable-dual" className="text-xs font-bold text-amber-950 cursor-pointer">
                  تفعيل العرض الثنائي (بالدولار والليرة اللبنانية معاً):
                </label>
                <input
                  type="checkbox"
                  id="modal-enable-dual"
                  checked={cartSettingsForm.enable_dual_currency ?? true}
                  onChange={(e) =>
                    setCartSettingsForm({ ...cartSettingsForm, enable_dual_currency: e.target.checked })
                  }
                  className="w-4 h-4 accent-amber-600 rounded"
                />
              </div>

              {cartSettingsForm.enable_dual_currency ?? true ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">عملة إدخال الأسعار الأساسية:</label>
                    <select
                      value={cartSettingsForm.base_currency || 'USD'}
                      onChange={(e) =>
                        setCartSettingsForm({
                          ...cartSettingsForm,
                          base_currency: e.target.value as 'USD' | 'LBP',
                          currency: e.target.value === 'USD' ? '$' : 'ل.ل.',
                        })
                      }
                      className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option value="USD">دولار أمريكي ($)</option>
                      <option value="LBP">ليرة لبنانية (ل.ل.)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">سعر الصرف (1 دولار = كم ليرة لبنانية):</label>
                    <input
                      type="number"
                      min={1}
                      step={100}
                      value={cartSettingsForm.exchange_rate ?? 89500}
                      onChange={(e) =>
                        setCartSettingsForm({
                          ...cartSettingsForm,
                          exchange_rate: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="89500"
                      className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-xs font-black text-amber-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Realtime calculation preview */}
                  <div className="bg-amber-50/90 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-950 leading-relaxed font-semibold space-y-1">
                    <span className="block font-extrabold text-amber-900">✨ طريقة ظهور الأسعار للزبائن الآن:</span>
                    {cartSettingsForm.base_currency === 'USD' ? (
                      <div>
                        صنف سعره <strong className="text-emerald-700 font-bold">$5.00</strong> سيظهر كـ:{' '}
                        <span className="text-slate-900 font-extrabold bg-white px-2 py-0.5 rounded border border-amber-300">
                          {formatDualPrice(5, cartSettingsForm).fullDisplay}
                        </span>
                      </div>
                    ) : (
                      <div>
                        صنف سعره <strong className="text-emerald-700 font-bold">450,000 ل.ل.</strong> سيظهر كـ:{' '}
                        <span className="text-slate-900 font-extrabold bg-white px-2 py-0.5 rounded border border-amber-300">
                          {formatDualPrice(450000, cartSettingsForm).fullDisplay}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-semibold">رمز العملة الأحادي:</label>
                  <input
                    type="text"
                    value={cartSettingsForm.currency || '$'}
                    onChange={(e) => setCartSettingsForm({ ...cartSettingsForm, currency: e.target.value })}
                    placeholder="$"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-bold"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveSettingModal('none')}
                  className="px-3.5 py-2 bg-gray-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-gray-200 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" /> حفظ إعدادات العملة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SUPABASE CONFIGURATION & LIVE TEST */}
      {activeSettingModal === 'supabase' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-3.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-700" />
                ربط وفحص اتصال Supabase
              </h3>
              <button
                onClick={() => setActiveSettingModal('none')}
                className="text-emerald-800 hover:text-emerald-950 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs overflow-y-auto touch-scroll flex-1 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">رابط مشروع Supabase (Project URL):</label>
                <input
                  type="text"
                  value={cartSettingsForm.supabase_url || ''}
                  onChange={(e) => setCartSettingsForm({ ...cartSettingsForm, supabase_url: e.target.value })}
                  placeholder="https://xyz...supabase.co"
                  className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs text-slate-800 dir-ltr text-left font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">الرمز السري (Supabase Anon Key):</label>
                <input
                  type="password"
                  value={cartSettingsForm.supabase_anon_key || ''}
                  onChange={(e) => setCartSettingsForm({ ...cartSettingsForm, supabase_anon_key: e.target.value })}
                  placeholder="eyJhbGciOiJIUzI1NiI..."
                  className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs text-slate-800 dir-ltr text-left font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* TEST CONNECTION BUTTON IN MODAL */}
              <div className="grid grid-cols-1 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleTestSupabaseConnection()}
                  disabled={supabaseTestLoading || syncLoading}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {supabaseTestLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> جاري اختبار الاتصال...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" /> 🔍 فحص الاتصال بـ Supabase الآن
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSyncDataToSupabase()}
                  disabled={syncLoading || supabaseTestLoading}
                  className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {syncLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> جاري نقل البيانات...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> 🚀 رفع ونقل الأصناف والبيانات إلى Supabase الآن
                    </>
                  )}
                </button>
              </div>

              {/* TEST CONNECTION RESULT BANNER */}
              {supabaseTestResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold leading-relaxed border ${
                    supabaseTestResult.success
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : 'bg-red-50 text-red-900 border-red-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                    {supabaseTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{supabaseTestResult.message}</span>
                  </div>
                  {supabaseTestResult.details && (
                    <p className="text-[10px] opacity-85 font-mono mt-1 bg-white/80 p-1.5 rounded dir-ltr text-left border border-gray-200">
                      {supabaseTestResult.details}
                    </p>
                  )}
                </div>
              )}

              {/* SYNC DATA RESULT BANNER */}
              {syncResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold leading-relaxed border ${
                    syncResult.success
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : 'bg-red-50 text-red-900 border-red-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                    {syncResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{syncResult.message}</span>
                  </div>
                  {syncResult.details && (
                    <p className="text-[10px] opacity-85 font-mono mt-1 bg-white/80 p-1.5 rounded dir-ltr text-left border border-gray-200">
                      {syncResult.details}
                    </p>
                  )}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveSettingModal('none')}
                  className="px-3.5 py-2 bg-gray-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-gray-200 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleSaveCartSettings();
                    setActiveSettingModal('none');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" /> حفظ بيانات الربط
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: SQL SCRIPT FOR SUPABASE */}
      {activeSettingModal === 'sql' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-3.5 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Copy className="w-4 h-4 text-yellow-400" />
                كود SQL لتجهيز الجداول في Supabase
              </h3>
              <button
                onClick={() => setActiveSettingModal('none')}
                className="text-slate-400 hover:text-white text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs overflow-y-auto touch-scroll flex-1 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
              <p className="text-[11px] text-slate-600 leading-relaxed">
                انسخ هذا الكود والصقه في <strong className="text-slate-900">Supabase ➔ SQL Editor ➔ Run</strong> لإنشاء الجداول التلقائية مجاناً:
              </p>

              <div className="relative">
                <pre className="bg-slate-950 text-emerald-400 font-mono text-[10px] p-3 rounded-xl max-h-48 overflow-y-auto dir-ltr text-left border border-slate-800">
                  {SUPABASE_SQL_SCRIPT}
                </pre>
                <button
                  onClick={handleCopySql}
                  className="absolute top-2 right-2 px-2.5 py-1 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-lg text-[10px] flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                  {copiedSql ? 'تم النسخ!' : 'نسخ الكود'}
                </button>
              </div>

              <div className="pt-2 flex justify-end border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveSettingModal('none')}
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-black cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT ITEM */}
      {isItemModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold text-slate-900">
                {editingItem.id ? 'تعديل صنف كريب' : 'إضافة صنف كريب جديد'}
              </h3>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItemSubmit} className="p-4 space-y-3.5 text-xs overflow-y-auto touch-scroll flex-1 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">اسم الصنف (مثل: كريب نوتيلا بابل):</label>
                <input
                  type="text"
                  required
                  value={editingItem.name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">الفئة:</label>
                <select
                  value={editingItem.category_id || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, category_id: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-yellow-400"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* DUAL CURRENCY PRICE INPUTS IN ITEM MODAL */}
              <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-extrabold text-amber-950 border-b border-amber-200/60 pb-1">
                  <span>إدخال السعر (بالدولار $ أو بالليرة ل.ل.):</span>
                  <span className="text-[10px] text-amber-800 font-bold">
                    1$ = {settings.exchange_rate?.toLocaleString() || 89500} ل.ل.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700">السعر بالدولار ($):</label>
                    <input
                      type="number"
                      step="any"
                      value={modalPriceUsd}
                      onChange={(e) => handleModalUsdChange(e.target.value)}
                      placeholder="5.00"
                      className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-amber-950 font-black focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700">السعر بالليرة (ل.ل.):</label>
                    <input
                      type="number"
                      step="100"
                      value={modalPriceLbp}
                      onChange={(e) => handleModalLbpChange(e.target.value)}
                      placeholder="450000"
                      className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-amber-950 font-black focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-amber-950 font-extrabold bg-white/90 p-1.5 rounded-md border border-amber-200 text-center">
                  ✨ سيظهر للزبون كـ: {formatDualPrice(editingItem.price || 0, settings).fullDisplay}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">الوصف والمكونات:</label>
                <textarea
                  rows={2}
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="شوكولاتة، بسكويت لوتس، مكسرات..."
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">وسم مميز (اختياري):</label>
                <input
                  type="text"
                  value={editingItem.badge || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, badge: e.target.value })}
                  placeholder="الأكثر طلباً 🔥 / جديد 🌟"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-yellow-400"
                />
              </div>

              {/* IMAGE PICKER INTEGRATION */}
              <ImagePicker
                currentUrl={editingItem.image_url}
                onSelectUrl={(url) => setEditingItem({ ...editingItem, image_url: url })}
                categoryFilter={editingItem.category_id}
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  disabled={isSavingItem}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingItem}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isSavingItem ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    'حفظ الصنف'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CATEGORY */}
      {isCategoryModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold text-slate-900">
                {editingCategory.id ? 'تعديل الفئة' : 'إضافة فئة كريب جديدة'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategorySubmit} className="p-4 space-y-3.5 text-xs overflow-y-auto touch-scroll flex-1 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">اسم الفئة:</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  placeholder="مثال: كريب مالح / وافل بابل"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">رمز أو إيموجي الفئة:</label>
                <input
                  type="text"
                  value={editingCategory.icon || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                  placeholder="🥞 / 🧀 / 🧇 / 🥤"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-yellow-400 text-base"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs shadow-xs cursor-pointer"
                >
                  حفظ الفئة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
