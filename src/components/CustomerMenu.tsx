import React, { useState, useMemo } from 'react';
import { Category, MenuItem, CartSettings } from '../types';
import { formatDualPrice } from '../lib/currency';
import { handleImgError } from '../lib/imageUtils';
import { Search, ShoppingBag, Send, ArrowRight } from 'lucide-react';

interface CustomerMenuProps {
  categories: Category[];
  items: MenuItem[];
  settings: CartSettings;
  isQrCodeMode?: boolean;
  onBackToAdmin?: () => void;
}

export const CustomerMenu: React.FC<CustomerMenuProps> = ({
  categories,
  items,
  settings,
  onBackToAdmin,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemForOrder, setSelectedItemForOrder] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  // Filter items based on selected category & search query
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  // Send WhatsApp order
  const handleSendWhatsAppOrder = () => {
    if (!selectedItemForOrder) return;
    const cleanPhone = settings.whatsapp_number.replace(/[^0-9]/g, '');
    const itemTotal = selectedItemForOrder.price * quantity;
    const priceInfo = formatDualPrice(itemTotal, settings);
    const textMessage = `مرحباً عربة *${settings.cart_name}* 👋\n\nأود طلب الأصناف التالية:\n- *${selectedItemForOrder.name}* (العدد: ${quantity})\n- السعر الإجمالي: ${priceInfo.fullDisplay}\n${notes ? `- ملاحظات إضافية: ${notes}\n` : ''}\nشكراً جزيلاً!`;
    const encoded = encodeURIComponent(textMessage);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    setSelectedItemForOrder(null);
    setQuantity(1);
    setNotes('');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D2D2D] pb-16 select-none overflow-x-hidden">
      {/* Top Banner for Admin Preview Mode */}
      {onBackToAdmin && (
        <div className="bg-slate-900 text-white px-3.5 py-2 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] flex items-center justify-between text-xs font-bold border-b border-slate-800 sticky top-0 z-40 shadow-sm">
          <span className="flex items-center gap-1.5 text-yellow-400">
            <span>👁️</span> معاينة قائمة الزبائن
          </span>
          <button
            onClick={onBackToAdmin}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 px-3 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة للوحة الإدارة</span>
          </button>
        </div>
      )}

      {/* Mobile Top Navigation / Header */}
      <header className={`sticky ${onBackToAdmin ? 'top-[41px]' : 'top-0'} z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-3.5 py-2.5 ${!onBackToAdmin ? 'pt-[calc(0.625rem+env(safe-area-inset-top,0px))]' : ''} shadow-xs`}>
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-xs text-lg overflow-hidden shrink-0">
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
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#2D2D2D] leading-snug">{settings.cart_name}</h1>
              {settings.cart_tagline && (
                <p className="text-[10px] text-yellow-700 font-semibold">{settings.cart_tagline}</p>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mt-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن المأكولات والمشروبات..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-9 pl-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-400/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-700 p-0.5"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto px-3 py-3 space-y-4">
        {/* Categories Scroll Horizontal */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-scroll py-1 text-xs -mx-1 px-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
              selectedCategory === 'all'
                ? 'bg-yellow-400 text-slate-950 border-yellow-500 shadow-sm'
                : 'bg-white text-slate-700 border-gray-200 hover:border-gray-300'
            }`}
          >
            <span>🍽️</span> الكل ({items.length})
          </button>

          {categories.map((cat) => {
            const itemCount = items.filter((i) => i.category_id === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-yellow-400 text-slate-950 border-yellow-500 shadow-sm'
                    : 'bg-white text-slate-700 border-gray-200 hover:border-gray-300'
                }`}
              >
                <span>{cat.icon || '🥞'}</span>
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-slate-950/10 text-slate-950' : 'bg-gray-100 text-slate-500'}`}>
                  {itemCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Menu Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 p-6 space-y-2 shadow-xs">
            <div className="text-3xl">🥞</div>
            <p className="text-xs text-slate-800 font-bold">لم يتم العثور على أي صنف</p>
            <p className="text-[11px] text-slate-500">جرب البحث بكلمة أخرى أو تصفح كافة الفئات</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`bg-white border rounded-2xl p-3 flex gap-3 transition-all relative overflow-hidden ${
                  !item.is_available
                    ? 'border-gray-200 opacity-60'
                    : 'border-gray-200 hover:border-yellow-400 shadow-xs hover:shadow-sm'
                }`}
              >
                {/* Item Image */}
                <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={(e) => handleImgError(e)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl bg-yellow-50/50">
                      🥞
                    </div>
                  )}

                  {!item.is_available && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center text-center p-1">
                      <span className="text-[10px] font-bold text-red-600 bg-white/90 border border-red-200 px-1.5 py-0.5 rounded shadow-xs">
                        غير متوفر
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-0.5">
                      <h3 className="text-xs font-bold text-slate-900 truncate leading-snug">{item.name}</h3>
                      {item.badge && item.is_available && (
                        <span className="shrink-0 text-[9px] font-extrabold bg-yellow-100 text-yellow-800 border border-yellow-300 px-1.5 py-0.5 rounded-md">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-1.5">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Price & Action */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 mt-auto">
                    {(() => {
                      const pInfo = formatDualPrice(item.price, settings);
                      return (
                        <div className="flex flex-col items-start leading-tight">
                          <span className="text-sm font-black text-yellow-600">{pInfo.primary}</span>
                          {pInfo.secondary && (
                            <span className="text-[10px] text-slate-500 font-bold">{pInfo.secondary}</span>
                          )}
                        </div>
                      );
                    })()}

                    {settings.enable_whatsapp_order && item.is_available && (
                      <button
                        onClick={() => setSelectedItemForOrder(item)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition-colors shadow-xs"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        طلب
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Customer Order Modal */}
      {selectedItemForOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto touch-scroll">
          <div className="bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[92vh] flex flex-col my-auto sm:my-auto">
            {/* Header */}
            <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">تفاصيل الطلب المباشر</h3>
              </div>
              <button
                onClick={() => setSelectedItemForOrder(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs overflow-y-auto touch-scroll flex-1 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
              <div className="flex gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                {selectedItemForOrder.image_url && (
                  <img
                    src={selectedItemForOrder.image_url}
                    alt={selectedItemForOrder.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{selectedItemForOrder.name}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{selectedItemForOrder.description}</p>
                  <div className="text-yellow-600 font-black text-xs mt-1">
                    {formatDualPrice(selectedItemForOrder.price, settings).fullDisplay}
                  </div>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span className="font-bold text-slate-700">الكمية:</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 bg-white hover:bg-gray-100 text-slate-800 font-bold rounded-lg flex items-center justify-center text-sm border border-gray-200 shadow-xs"
                  >
                    -
                  </button>
                  <span className="font-extrabold text-yellow-600 text-sm w-4 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-7 h-7 bg-white hover:bg-gray-100 text-slate-800 font-bold rounded-lg flex items-center justify-center text-sm border border-gray-200 shadow-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Additional notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">ملاحظات خاصة (مثل: بدون شوكولاتة بيضاء):</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="اكتب ملاحظتك هنا..."
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
                />
              </div>

              {/* Total & Submit Button */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2.5">
                  <span>المجموع الإجمالي:</span>
                  <span className="text-sm font-black text-yellow-600">
                    {formatDualPrice(selectedItemForOrder.price * quantity, settings).fullDisplay}
                  </span>
                </div>

                <button
                  onClick={handleSendWhatsAppOrder}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Send className="w-4 h-4" />
                  إرسال الطلب عبر الواتساب
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer info */}
      <footer className="max-w-md mx-auto text-center py-6 text-[10px] text-slate-400">
        <p>© {settings.cart_name}</p>
      </footer>
    </div>
  );
};
