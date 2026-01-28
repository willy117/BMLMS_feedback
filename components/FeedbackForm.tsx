import React, { useState, useRef } from 'react';
import { PlusCircle, Send, ChevronDown, Upload, X, Loader2, ImagePlus } from 'lucide-react';
import { format } from 'date-fns';
import { CATEGORIES, FeedbackCategory, FeedbackItem, Attachment } from '../types';
import { SYSTEM_MODULES } from '../constants';

const MAX_IMAGES = 5;

interface FeedbackFormProps {
  onSubmit: (item: Omit<FeedbackItem, 'id' | 'timestamp' | 'comments'> & { attachments: Attachment[] }) => Promise<boolean | void>;
  isSubmitting: boolean;
}

// 圖片壓縮輔助函式 - 優化版
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
        // 降低最大解析度以確保 GAS 能接收 (600px 對於一般回報已足夠，且能大幅提升成功率)
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;

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
          // 降低品質至 0.5，大幅減少 Base64 字串長度
          resolve(canvas.toDataURL('image/jpeg', 0.5));
        } else {
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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentModule = SYSTEM_MODULES.find(m => m.id === Number(selectedModuleId)) || SYSTEM_MODULES[0];

  // 統一處理檔案 (來自 Input, Drop, Paste)
  const processFiles = async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const remainingSlots = MAX_IMAGES - images.length;
    
    if (remainingSlots <= 0) {
       alert(`圖片數量已達上限 (${MAX_IMAGES} 張)`);
       return;
    }

    if (imageFiles.length > remainingSlots) {
      alert(`您最多只能再上傳 ${remainingSlots} 張圖片，多餘的檔案將被忽略。`);
    }

    const filesToProcess = imageFiles.slice(0, remainingSlots);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    processFiles(Array.from(e.target.files));
    // Reset value so same file can be selected again if needed
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isProcessingImages && images.length < MAX_IMAGES) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessingImages || images.length >= MAX_IMAGES) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // 如果正在處理或滿了，忽略
    if (isProcessingImages || images.length >= MAX_IMAGES) return;

    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      processFiles(Array.from(e.clipboardData.files));
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !description.trim() || isSubmitting || isProcessingImages) return;

    // 處理附件與檔名
    // 命名原則：YYYYMMDD_R{ID}_{Sequence}
    // 由於此時還未取得 ID，前端使用 'RID' 作為佔位符，後端 GAS 需在生成 ID (例如 001) 後將 'RID' 替換為 'R001'
    // 範例結果：20260128_RID_1.jpg -> (Backend) -> 20260128_R001_1.jpg
    const dateStr = format(new Date(), 'yyyyMMdd');
    const attachments: Attachment[] = images.map((img, index) => {
      const content = img.includes(',') ? img.split(',')[1] : img;
      return {
        fileName: `${dateStr}_RID_${index + 1}.jpg`,
        mimeType: 'image/jpeg',
        content: content
      };
    });
    
    // Debug: 確認送出前的圖片資料大小
    console.log(`Submitting ${attachments.length} attachments.`);

    const success = await onSubmit({
      userName,
      category,
      moduleId: currentModule.id,
      moduleName: currentModule.name,
      featureName: selectedFeature,
      description,
      attachments, // 傳送附件物件陣列
    });

    if (success) {
      setDescription('');
      setSelectedFeature('');
      setSelectedModuleId(SYSTEM_MODULES[0].id);
      setCategory('新增功能');
      setImages([]);
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
            onPaste={handlePaste}
            rows={4}
            className="w-full bg-white text-black px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder:text-slate-400"
            placeholder="請詳細描述您的建議或遇到的問題... (支援 Ctrl+V 貼上圖片)"
          />
        </div>

        {/* Image Upload Area with Drag & Drop */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            上傳圖片 (選填，最多 {MAX_IMAGES} 張)
          </label>
          
          <div 
            className={`
              relative border-2 border-dashed rounded-lg p-6 transition-all text-center
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}
              ${(images.length >= MAX_IMAGES || isProcessingImages) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden"
              onChange={handleFileChange}
              disabled={images.length >= MAX_IMAGES || isProcessingImages}
            />
            
            <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
              {isProcessingImages ? (
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              ) : (
                <div className="p-3 bg-white rounded-full shadow-sm">
                   <Upload className={`w-6 h-6 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
                </div>
              )}
              
              <div className="text-sm">
                 {isProcessingImages ? (
                   <span className="text-blue-600 font-medium">圖片處理中...</span>
                 ) : (
                   <>
                     <span className="font-medium text-blue-600 hover:underline">點擊上傳</span>
                     <span> 或將圖片拖曳至此</span>
                   </>
                 )}
              </div>
              <p className="text-xs text-slate-400">
                支援 Ctrl+V 貼上 • {images.length} / {MAX_IMAGES}
              </p>
            </div>
          </div>

           {/* Image Previews */}
          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-3 animate-fadeIn">
              {images.map((img, index) => (
                <div key={index} className="relative group aspect-square">
                  <img src={img} alt={`preview ${index}`} className="w-full h-full object-cover rounded-lg border border-slate-200 shadow-sm"/>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(index); }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 shadow-sm transition-all hover:scale-110"
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