import React, { useState } from 'react';
import { PRESET_IMAGES } from '../data/defaultData';
import { Image as ImageIcon, Upload, Link as LinkIcon, Check, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { compressImageFile, handleImgError } from '../lib/imageUtils';

interface ImagePickerProps {
  currentUrl?: string;
  onSelectUrl: (url: string) => void;
  categoryFilter?: string;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({ currentUrl = '', onSelectUrl }) => {
  const [activeTab, setActiveTab] = useState<'preset' | 'url' | 'upload'>('preset');
  const [inputUrl, setInputUrl] = useState(currentUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      setImageLoadError(false);
      try {
        const compressedUrl = await compressImageFile(file);
        if (compressedUrl) {
          onSelectUrl(compressedUrl);
        } else {
          alert('تعذر معالجة هذه الصورة، يرجى اختيار صورة أخرى بصيغة JPG أو PNG أو WebP');
        }
      } catch (err) {
        console.error('Image compression failed', err);
        alert('حدث خطأ أثناء تحميل الصورة، يرجى اختيار صورة أخرى');
      } finally {
        setIsUploading(false);
        e.target.value = ''; // Reset input to allow re-uploading same file if needed
      }
    }
  };

  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-sm space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-slate-800 font-semibold flex items-center gap-1.5 text-xs">
          <ImageIcon className="w-4 h-4 text-yellow-600" />
          صورة الصنف
        </label>
        
        {/* Sub-tabs */}
        <div className="flex bg-white p-0.5 rounded-lg border border-gray-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('preset')}
            className={`px-2.5 py-1 rounded-md transition-all font-bold ${
              activeTab === 'preset' ? 'bg-yellow-400 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            صور جاهزة
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-2.5 py-1 rounded-md transition-all font-bold ${
              activeTab === 'upload' ? 'bg-yellow-400 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            رفع صورة
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-2.5 py-1 rounded-md transition-all font-bold ${
              activeTab === 'url' ? 'bg-yellow-400 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            رابط صورة
          </button>
        </div>
      </div>

      {/* Preview current selected image */}
      {currentUrl && (
        <div className="relative rounded-lg overflow-hidden border border-yellow-300 h-28 bg-slate-100 flex items-center justify-center">
          {!imageLoadError ? (
            <img
              src={currentUrl}
              alt="معاينة الصورة"
              referrerPolicy="no-referrer"
              onError={() => setImageLoadError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-2 text-center text-slate-500">
              <ImageIcon className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-xs font-semibold">تعذر عرض معاينة الصورة</span>
            </div>
          )}

          {/* Badges & Remove Controls */}
          <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
            الصورة الحالية
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectUrl('');
              setImageLoadError(false);
            }}
            title="حذف الصورة"
            className="absolute bottom-2 left-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1 text-[11px] font-bold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            إزالة
          </button>
        </div>
      )}

      {/* Preset tab */}
      {activeTab === 'preset' && (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-yellow-600" />
            اختر صورة جاهزة عالية الجودة للكريب والوجبات:
          </p>
          <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto touch-scroll pr-1">
            {PRESET_IMAGES.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setImageLoadError(false);
                  onSelectUrl(preset.url);
                }}
                className={`relative h-16 rounded-lg overflow-hidden border transition-all ${
                  currentUrl === preset.url
                    ? 'border-2 border-yellow-500 ring-2 ring-yellow-400/30'
                    : 'border-gray-200 hover:border-gray-400 opacity-80 hover:opacity-100'
                }`}
              >
                <img
                  src={preset.url}
                  alt={preset.title}
                  referrerPolicy="no-referrer"
                  onError={(e) => handleImgError(e)}
                  className="w-full h-full object-cover"
                />
                {currentUrl === preset.url && (
                  <div className="absolute top-1 right-1 bg-yellow-400 text-slate-950 rounded-full p-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload tab */}
      {activeTab === 'upload' && (
        <div className="text-center py-3 border-2 border-dashed border-gray-300 hover:border-yellow-400 rounded-xl transition-colors bg-white">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/*"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
            id="file-upload-input"
          />
          <label htmlFor="file-upload-input" className={`cursor-pointer flex flex-col items-center gap-1.5 ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}>
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 text-yellow-600 animate-spin" />
                <span className="text-xs text-slate-800 font-bold">جاري معالجة وضغط الصورة...</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-yellow-600" />
                <span className="text-xs text-slate-800 font-bold">اضغط لاختيار صورة من هاتفك</span>
                <span className="text-[10px] text-slate-500">ملاحظة: يتم ضغط وحفظ الصور تلقائياً للتوافق مع أندرويد وسامسونغ</span>
              </>
            )}
          </label>
        </div>
      )}

      {/* URL tab */}
      {activeTab === 'url' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full bg-white border border-gray-200 rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-yellow-400"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setImageLoadError(false);
                onSelectUrl(inputUrl);
              }}
              className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-lg text-xs transition-colors"
            >
              تطبيق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

