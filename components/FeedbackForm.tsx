import React, { useState } from 'react';
import { PlusCircle, Send, ChevronDown, Upload, X, Loader2 } from 'lucide-react';
import { CATEGORIES, FeedbackCategory, FeedbackItem } from '../types';
import { SYSTEM_MODULES } from '../constants';

const MAX_IMAGES = 5;

interface FeedbackFormProps {
  onSubmit: (item: Omit<FeedbackItem, 'id' | 'timestamp' | 'comments'>) => Promise<boolean | void>;
  isSubmitting: boolean;
}

// 圖片壓縮輔助函式
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // 壓縮為 JPEG，品質 0.7
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          // Fallback if context fails
          resolve(event.target?.result as string);
        }
      };
      img.onerror = () => {
         resolve(event.target?.result as string);
      }
    };
    reader.onerror = () => resolve('');
  });
};

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmit, isSubmitting }) => {
  const [userName, setUserName] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('新增功能');
  const [selectedModuleId, setSelectedModuleId] = useState<number>(SYSTEM_MODULES[0].id);
  const [selectedFeature, setSelectedFeature] = useState<string>('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  const currentModule = SYSTEM_MODULES.find(m => m.id === Number(selectedModuleId)) || SYSTEM_MODULES[0];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const remainingSlots = MAX_IMAGES - images.length;

    if (files.length > remainingSlots) {
      alert(`您最多只能再上傳 ${remainingSlots} 張圖片。`);
    }

    const filesToProcess = files.slice(0, remainingSlots);
    setIsProcessingImages(true);

    try {
      const compressedImages = await Promise.all(filesToProcess.map(file => compressImage(file)));
      setImages(prev => [...prev, ...compressedImages].filter(Boolean));
    } catch (error) {
      console.error("Image processing error", error);
      alert("圖片處理發生錯誤");
    } finally {
      setIsProcessingImages(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !description.trim() || isSubmitting || isProcessingImages) return;

    // 關鍵修正：在傳送給後端前，移除 Base64 的標頭 (data:image/jpeg;base64,)
    // 這能避免 Google Apps Script 的 Utilities.base64Decode 發生錯誤
    const processedImages = images.map(img => {
      if (img.includes(',')) {
        return img.split(',')[1];
      }
      return img;
    });

    const success = await onSubmit({
      userName,
      category,
      moduleId: currentModule.id,
      moduleName: currentModule.name,
      featureName: selectedFeature,
      description,
      imageUrls: processedImages,
    });

    if (success) {
      // Reset form on successful submission
      setDescription('');
      setSelectedFeature('');
      setSelectedModuleId(SYSTEM_MODULES[0].id);
      setCategory('新增功能');
      setImages([]);
      // Keep name for convenience
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mb-8">
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center gap-2">
        <PlusCircle className="w-5 h-5 text-blue-600" />
        <h2 className="font-bold text-slate-800">新增回饋</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Name */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            您的姓名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full bg-white text-black px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400"
            placeholder="請輸入姓名"
          />
        </div>

        {/* Category */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            回饋分類
          </label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
              className="w-full appearance-none px-3 py-2 pr-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-black"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Module Selection */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            相關頁面/模組
          </label>
           <div className="relative">
            <select
              value={selectedModuleId}
              onChange={(e) => {
                setSelectedModuleId(Number(e.target.value));
                setSelectedFeature(''); // Reset sub-feature
              }}
              className="w-full appearance-none px-3 py-2 pr-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-black"
            >
              {SYSTEM_MODULES.map(m => (
                <option key={m.id} value={m.id}>
                  {m.id === 0 ? m.name : `${m.id}. ${m.name}`}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Feature Selection (Sub-menu) */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            功能細項 (選填)
          </label>
          <div className="relative">
            <select
              value={selectedFeature}
              onChange={(e) => setSelectedFeature(e.target.value)}
              disabled={currentModule.features.length === 0}
              className="w-full appearance-none px-3 py-2 pr-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-black disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">-- 全域或不指定 --</option>
              {currentModule.features.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            內容描述 <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-white text-black px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder:text-slate-400"
            placeholder="請詳細描述您的建議或遇到的問題..."
          />
        </div>

        {/* Image Upload */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            上傳圖片 (選填，最多 {MAX_IMAGES} 張)
          </label>
          <div className="flex items-center gap-4">
            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border shadow-sm cursor-pointer ${images.length >= MAX_IMAGES || isProcessingImages ? 'bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
              {isProcessingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{isProcessingImages ? '處理中...' : '選擇檔案'}</span>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden"
                onChange={handleImageUpload}
                disabled={images.length >= MAX_IMAGES || isProcessingImages}
              />
            </label>
             <p className="text-sm text-slate-500">{images.length} / {MAX_IMAGES}</p>
          </div>
           {/* Image Previews */}
          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-3">
              {images.map((img, index) => (
                <div key={index} className="relative group aspect-square">
                  <img src={img} alt={`preview ${index}`} className="w-full h-full object-cover rounded-lg border border-slate-200"/>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-1 md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || isProcessingImages}
            className="flex items-center justify-center gap-2 w-36 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-sm active:scale-95 transform disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {(isSubmitting || isProcessingImages) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isProcessingImages ? '處理中...' : isSubmitting ? '提交中...' : '提交回饋'}
          </button>
        </div>
      </form>
    </div>
  );
};