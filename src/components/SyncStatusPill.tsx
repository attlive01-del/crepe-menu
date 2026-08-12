import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
  subscribeSyncStatus,
  flushPendingQueue,
  forceFullSync,
  SyncStatus,
  getCurrentSyncStatus,
} from '../lib/supabase';

interface SyncStatusPillProps {
  onRefreshData?: () => void;
  compact?: boolean;
}

export const SyncStatusPill: React.FC<SyncStatusPillProps> = ({ onRefreshData, compact = false }) => {
  const [status, setStatus] = useState<SyncStatus>(() => getCurrentSyncStatus());
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      const remaining = await flushPendingQueue();
      if (onRefreshData) {
        await onRefreshData();
      }
      if (remaining === 0) {
        showToast('تم التزامن مع السحاب بنجاح! 🎉');
      } else {
        const fullRes = await forceFullSync();
        if (fullRes.success) {
          showToast(fullRes.message);
          if (onRefreshData) await onRefreshData();
        } else {
          showToast(fullRes.message || 'تعذر التزامن المباشر، ستتم المحاولة تلقائياً.');
        }
      }
    } catch (err) {
      console.error('Manual sync error:', err);
      showToast('حدث خطأ أثناء التزامن.');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const isSpinning = status.isSyncing || isManualSyncing;

  return (
    <div className="relative inline-block text-right">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-16 right-4 z-50 bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xl border border-slate-800 animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2">
          <SparklesIcon className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Status Pill */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setPopoverOpen(!popoverOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all border shadow-2xs cursor-pointer active:scale-95 ${
            !status.isConnected
              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              : status.pendingCount > 0
              ? 'bg-yellow-100 text-yellow-950 border-yellow-300 hover:bg-yellow-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
          }`}
          title="انقر لعرض حالة التزامن وتحديث البيانات"
        >
          {isSpinning ? (
            <Loader2 className="w-3 h-3 animate-spin text-yellow-600 shrink-0" />
          ) : !status.isConnected ? (
            <CloudOff className="w-3 h-3 text-amber-600 shrink-0" />
          ) : status.pendingCount > 0 ? (
            <AlertCircle className="w-3 h-3 text-yellow-600 shrink-0 animate-pulse" />
          ) : (
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          )}

          <span className="truncate max-w-[140px]">
            {isSpinning
              ? 'جاري التزامن...'
              : !status.isConnected
              ? 'وضع محلي'
              : status.pendingCount > 0
              ? `${status.pendingCount} معلق`
              : 'متزامن مع السحاب'}
          </span>
        </button>

        {/* Quick Sync Button */}
        <button
          onClick={handleManualSync}
          disabled={isSpinning}
          className="p-1 bg-white hover:bg-gray-100 border border-gray-200 rounded-full text-slate-700 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-50"
          title="تحديث وتزامن البيانات الآن"
        >
          <RefreshCw className={`w-3 h-3 ${isSpinning ? 'animate-spin text-yellow-600' : ''}`} />
        </button>
      </div>

      {/* Popover Details Dropdown */}
      {popoverOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopoverOpen(false)} />
          <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 p-3.5 z-50 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-yellow-500" />
                حالة التزامن المباشر
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                  status.isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-slate-600'
                }`}
              >
                {status.isConnected ? 'متصل' : 'غير متصل'}
              </span>
            </div>

            <div className="space-y-2 text-[11px] text-slate-600">
              <div className="flex items-center justify-between">
                <span>التغييرات المعلقة:</span>
                <span className="font-extrabold text-slate-900">
                  {status.pendingCount > 0 ? (
                    <span className="text-yellow-600 font-black">{status.pendingCount} تغييرات محفظة محلياً</span>
                  ) : (
                    'لا يوجد (الكل متزامن 0)'
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>آخر تزامن ناجح:</span>
                <span className="font-semibold text-slate-700">
                  {status.lastSyncedAt
                    ? new Date(status.lastSyncedAt).toLocaleTimeString('ar-SA', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : 'الآن'}
                </span>
              </div>

              <p className="text-[10px] text-slate-500 pt-1 leading-relaxed bg-slate-50 p-2 rounded-xl">
                💡 التغييرات تحفظ في جهازك فوراً، ثم تترحل تلقائياً للسحاب عند توفر الإنترنت دون فقدان أي بيانات.
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => {
                  setPopoverOpen(false);
                  handleManualSync();
                }}
                disabled={isSpinning}
                className="w-full py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>تزامن وتحديث الآن</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function SparklesIcon(props: any) {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M12 2l2.4 5.4L20 10l-5.6 2.6L12 18l-2.4-5.4L4 10l5.6-2.6z" />
    </svg>
  );
}
