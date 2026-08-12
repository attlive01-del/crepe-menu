import React, { useState } from 'react';
import { SUPABASE_SQL_SCRIPT, getSavedCredentials, saveSupabaseCredentials, isSupabaseConnected, syncAllLocalToSupabase } from '../lib/supabase';
import { Database, Check, Copy, X, Key, ExternalLink, ShieldCheck } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose, onSaved }) => {
  const currentCreds = getSavedCredentials();
  const [url, setUrl] = useState(currentCreds.url);
  const [anonKey, setAnonKey] = useState(currentCreds.anonKey);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials({ url: url.trim(), anonKey: anonKey.trim() });
    setSavedSuccess(true);
    // Auto sync all local data to Supabase in background
    try {
      await syncAllLocalToSupabase();
    } catch (e) {
      console.warn('Auto sync on credential save:', e);
    }
    setTimeout(() => {
      setSavedSuccess(false);
      onSaved();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-yellow-50 border-b border-yellow-200 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-yellow-400 p-2 rounded-xl text-slate-950 border border-yellow-300 shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                إعداد قاعدة بيانات Supabase
                {isSupabaseConnected() && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    متصل الآن
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">حفظ البيانات سحابياً وضمان مزامنة الأسعار والقائمة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs text-slate-700 overflow-y-auto flex-1">
          {/* Step 1: SQL Setup */}
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <span className="w-5 h-5 bg-yellow-400 text-slate-950 font-black rounded-full flex items-center justify-center text-[11px]">
                  1
                </span>
                إنشاء الجداول في Supabase
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1 px-2.5 py-1 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-lg text-[11px] font-bold border border-yellow-300 transition-all shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'تم نسخ كود SQL!' : 'نسخ كود SQL'}
              </button>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              افتح حسابك في <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5">Supabase <ExternalLink className="w-3 h-3"/></a> ثم توجه إلى <strong className="text-slate-900">SQL Editor</strong> والصق الكود التالي واضغط <strong className="text-slate-900">RUN</strong>:
            </p>
            <pre className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-[10px] text-emerald-300 font-mono overflow-x-auto max-h-28">
              {SUPABASE_SQL_SCRIPT}
            </pre>
          </div>

          {/* Step 2: Credentials Form */}
          <form onSubmit={handleSave} className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-3">
            <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <span className="w-5 h-5 bg-yellow-400 text-slate-950 font-black rounded-full flex items-center justify-center text-[11px]">
                2
              </span>
              إدخال مفاتيح الربط (Project URL & Anon Key)
            </span>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-700 font-semibold flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-yellow-600" /> Project URL
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzxyz.supabase.co"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-700 font-semibold flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-yellow-600" /> Anon Key
              </label>
              <textarea
                rows={2}
                required
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR..."
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-yellow-400 font-mono text-[10px]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  تم حفظ وإقران Supabase بنجاح!
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  حفظ وتفعيل الاتصال الآن
                </>
              )}
            </button>
          </form>

          {/* Local fallback notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-[11px] text-yellow-900 leading-relaxed">
            💡 <strong className="text-yellow-950">ملاحظة:</strong> إذا لم تقم بربط Supabase بعد، سيعمل التطبيق بمرونة فائقة محلياً في متصفحك ويفعل التخزين المحلي دون أي تعارض أو توقف.
          </div>
        </div>
      </div>
    </div>
  );
};
