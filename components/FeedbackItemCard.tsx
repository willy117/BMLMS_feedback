import React, { useState } from 'react';
import { 
  MessageSquare, 
  ChevronDown, 
  ChevronUp, 
  Wrench, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  CornerDownRight, 
  Upload, 
  X, 
  Image as ImageIcon, 
  Loader2, 
  ExternalLink, 
  FileImage 
} from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale/zh-TW';
import { FeedbackItem, Comment, DevResponse, DEV_STATUSES, DevStatus, CATEGORIES, Attachment } from '../types';

const MAX_IMAGES_COMMENT = 3;

interface FeedbackItemCardProps {
  item: FeedbackItem;
  onAddComment: (itemId: string, comment: Omit<Comment, 'id' | 'timestamp'> & { attachments: Attachment[] }) => Promise<boolean>;
  onUpdateDevResponse: (itemId: string, response: Omit<DevResponse, 'timestamp'>) => Promise<boolean>;
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
        // 降低最大解析度以確保 GAS 能接收
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;

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
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = () => resolve(event.target?.result as string);
    };
    reader.onerror = () => resolve('');
  });
};

// 處理圖片連結
const resolveImageUrl = (url: string) => {
  if (!url) return '';
  // 如果已經是 http 開頭 (Google Drive 連結或其他網址)，直接回傳
  if (url.startsWith('http') || url.startsWith('https')) return url;
  // 如果是 base64 (舊資料)，保留原樣
  if (url.startsWith('data:')) return url;
  // 如果是純 base64 字串 (無標頭)，補上標頭
  return `data:image/jpeg;base64,${url}`;
};

// 安全的日期格式化函式
const safeFormatDate = (timestamp: number | string | undefined) => {
  if (!timestamp) return '';
  try {
    const date = new Date(Number(timestamp));
    if (isNaN(date.getTime())) return '';
    return format(date, 'yyyy/MM/dd HH:mm', { locale: zhTW });
  } catch (e) {
    return '';
  }
};

// Image Links Component (Replaced Thumbnails)
const ImageThumbnails = ({ urls }: { urls?: string[] }) => {
  if (!urls || urls.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {urls.map((url, index) => {
        const resolvedUrl = resolveImageUrl(url);
        return (
          <a 
            key={index}
            href={resolvedUrl}
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-blue-600 hover:border-blue-200 transition-all group no-underline"
            title="點擊開啟圖片"
          >
            <FileImage className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
            <span className="text-sm font-medium">附件圖片 {index + 1}</span>
            <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
          </a>
        );
      })}
    </div>
  );
};

const CategoryBadge = ({ category }: { category: string }) => {
  const styles: Record<string, string> = {
    '新增功能': 'bg-blue-100 text-blue-700 border-blue-200',
    '修改建議': 'bg-purple-100 text-purple-700 border-purple-200',
    '問題回報': 'bg-red-100 text-red-700 border-red-200',
    '其他': 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${styles[category] || styles['其他']}`}>
      {category}
    </span>
  );
};

const StatusBadge = ({ status }: { status?: DevStatus }) => {
  if (!status) return <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-medium">待處理</span>;
  
  const styles: Record<string, string> = {
    '已增加': 'bg-green-100 text-green-700 border-green-200',
    '已修正': 'bg-teal-100 text-teal-700 border-teal-200',
    '需更一步討論': 'bg-orange-100 text-orange-700 border-orange-200',
    '無法達成': 'bg-red-100 text-red-700 border-red-200',
    '其他': 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full border font-medium flex items-center gap-1 ${styles[status] || styles['其他']}`}>
      {status === '已增加' || status === '已修正' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {status}
    </span>
  );
};

export const FeedbackItemCard: React.FC<FeedbackItemCardProps> = ({ item, onAddComment, onUpdateDevResponse }) => {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isDevOpen, setIsDevOpen] = useState(!!item.devResponse);
  
  // Comment Form State
  const [commentName, setCommentName] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [commentImages, setCommentImages] = useState<string[]>([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isProcessingCommentImages, setIsProcessingCommentImages] = useState(false);

  // Dev Response Form State
  const [devStatus, setDevStatus] = useState<DevStatus>(item.devResponse?.status || '需更一步討論');
  const [devContent, setDevContent] = useState(item.devResponse?.content || '');
  const [isSubmittingDevResponse, setIsSubmittingDevResponse] = useState(false);

  const handleCommentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    const remainingSlots = MAX_IMAGES_COMMENT - commentImages.length;
    if (files.length > remainingSlots) {
      alert(`您最多只能再上傳 ${remainingSlots} 張圖片。`);
    }
    const filesToProcess = files.slice(0, remainingSlots);
    setIsProcessingCommentImages(true);
    
    try {
        const compressed = await Promise.all(filesToProcess.map(f => compressImage(f)));
        setCommentImages(prev => [...prev, ...compressed].filter(Boolean));
    } catch (error) {
        console.error("Compression error", error);
        alert("圖片處理失敗");
    } finally {
        setIsProcessingCommentImages(false);
    }
  };

  const handleRemoveCommentImage = (index: number) => {
    setCommentImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName.trim() || !commentContent.trim() || isSubmittingComment || isProcessingCommentImages) return;
    setIsSubmittingComment(true);

    // 處理圖片附件與命名
    // 命名原則：YYYYMMDD_R{ID}_R{Sequence}
    // 注意：這裡使用 item.displayId (如 R001) 作為檔名中間的 ID
    const dateStr = format(new Date(), 'yyyyMMdd');
    const displayId = item.displayId || `R${String(item.id).substring(0, 6)}`; // Fallback if no displayId

    const attachments: Attachment[] = commentImages.map((img, index) => {
      const content = img.includes(',') ? img.split(',')[1] : img;
      return {
        fileName: `${dateStr}_${displayId}_R${index + 1}.jpg`,
        mimeType: 'image/jpeg',
        content: content
      };
    });

    console.log(`Submitting comment with ${attachments.length} attachments. ID used: ${displayId}`);

    const success = await onAddComment(item.id, { 
      userName: commentName, 
      content: commentContent, 
      attachments, // 傳送附件物件
    });
    if (success) {
      setCommentContent('');
      setCommentImages([]);
      // Keep name for convenience
    }
    setIsSubmittingComment(false);
  };

  const handleDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devContent.trim() || isSubmittingDevResponse) return;
    setIsSubmittingDevResponse(true);
    const success = await onUpdateDevResponse(item.id, { status: devStatus, content: devContent, userName: '開發團隊' });
    if (success) {
      setIsDevOpen(true); // Ensure it stays open after submit
    }
    setIsSubmittingDevResponse(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
      {/* Header */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 flex-wrap">
             {/* ID Badge: Show simplified Display ID if available, otherwise simplified UUID */}
             <span className="font-mono text-sm bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-semibold">
                {item.displayId || `R${String(item.id).substring(0, 4)}..`}
             </span>
             <CategoryBadge category={item.category} />
             <div className="text-sm text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
               <span className="font-semibold text-slate-700">{item.moduleName}</span>
               {item.featureName && <>
                 <span className="text-slate-300">/</span>
                 <span>{item.featureName}</span>
               </>}
             </div>
          </div>
          <StatusBadge status={item.devResponse?.status} />
        </div>
        
        <p className="text-slate-800 text-lg whitespace-pre-wrap leading-relaxed">{item.description}</p>
        <ImageThumbnails urls={item.imageUrls} />
        
        <div className="flex items-center justify-between text-sm text-slate-500 mt-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <User className="w-4 h-4" />
              {item.userName}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {safeFormatDate(item.timestamp)}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsCommentsOpen(!isCommentsOpen)}
               className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
             >
               <MessageSquare className="w-4 h-4" />
               追加意見 ({item.comments.length})
               {isCommentsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
             </button>
             
             <button 
               onClick={() => setIsDevOpen(!isDevOpen)}
               className="flex items-center gap-1 text-slate-600 hover:text-slate-800 font-medium transition-colors"
             >
               <Wrench className="w-4 h-4" />
               開發者回應
               {isDevOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
             </button>
          </div>
        </div>
      </div>

      {/* Developer Response Section */}
      {isDevOpen && (
        <div className="bg-slate-50 p-6 border-t border-slate-200 animate-fadeIn">
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Wrench className="w-4 h-4" /> 開發團隊回覆
          </h4>
          
          {item.devResponse && (
            <div className="bg-white p-4 rounded-lg border border-slate-200 border-l-4 border-l-blue-500 mb-4">
              <div className="flex justify-between items-start mb-2">
                <StatusBadge status={item.devResponse.status} />
                <span className="text-xs text-slate-400">
                  {safeFormatDate(item.devResponse.timestamp)}
                </span>
              </div>
              <p className="text-slate-700 whitespace-pre-wrap">{item.devResponse.content}</p>
            </div>
          )}

          <form onSubmit={handleDevSubmit}>
              <div className="relative mb-2">
                <select 
                  value={devStatus}
                  onChange={(e) => setDevStatus(e.target.value as DevStatus)}
                  className="w-full appearance-none px-3 py-2 pr-8 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none text-black"
                >
                  {DEV_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            <textarea
              value={devContent}
              onChange={(e) => setDevContent(e.target.value)}
              placeholder="輸入開發者回覆..."
              className="w-full bg-white text-black px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-2 placeholder:text-slate-400"
              rows={2}
            />
            <button 
                type="submit" 
                disabled={isSubmittingDevResponse}
                className="text-sm bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors w-32 justify-center flex items-center disabled:bg-slate-500">
              {isSubmittingDevResponse ? <Loader2 className="w-4 h-4 animate-spin" /> : (item.devResponse ? '更新回覆' : '送出回覆')}
            </button>
          </form>
        </div>
      )}

      {/* Additional Comments Section */}
      {isCommentsOpen && (
        <div className="bg-slate-50 p-6 border-t border-slate-200 animate-fadeIn">
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> 追加意見
          </h4>
          
          <div className="space-y-4 mb-6">
            {item.comments.length === 0 ? (
               <p className="text-slate-400 text-sm italic">尚無追加意見</p>
            ) : (
              item.comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <CornerDownRight className="w-5 h-5 text-slate-300 shrink-0 mt-1" />
                  <div className="bg-white p-3 rounded-lg border border-slate-200 flex-1 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm text-slate-700">{comment.userName}</span>
                      <span className="text-xs text-slate-400">
                        {safeFormatDate(comment.timestamp)}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm">{comment.content}</p>
                    <ImageThumbnails urls={comment.imageUrls} />
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleCommentSubmit} className="bg-white p-4 rounded-lg border border-slate-200">
            <input
              type="text"
              placeholder="您的姓名"
              value={commentName}
              onChange={(e) => setCommentName(e.target.value)}
              className="w-full bg-white text-black px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 mb-2"
              required
            />
            <textarea
              placeholder="輸入意見內容..."
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              className="w-full bg-white text-black px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 mb-2"
              required
              rows={2}
            />
            <div className="mb-3">
                <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors border text-xs cursor-pointer ${commentImages.length >= MAX_IMAGES_COMMENT || isProcessingCommentImages ? 'bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                {isProcessingCommentImages ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                <span>{isProcessingCommentImages ? '處理中' : `附加圖片 (${commentImages.length}/${MAX_IMAGES_COMMENT})`}</span>
                <input 
                    type="file" multiple accept="image/*" className="hidden"
                    onChange={handleCommentImageUpload}
                    disabled={commentImages.length >= MAX_IMAGES_COMMENT || isProcessingCommentImages}
                />
                </label>
            </div>
            {commentImages.length > 0 && (
                <div className="mb-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {commentImages.map((img, index) => (
                    <div key={index} className="relative group aspect-square">
                    <img src={img} alt={`preview ${index}`} className="w-full h-full object-cover rounded-md border border-slate-200"/>
                    <button
                        type="button" onClick={() => handleRemoveCommentImage(index)}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                    >
                        <X className="w-3 h-3" />
                    </button>
                    </div>
                ))}
                </div>
            )}
            <div className="flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmittingComment || isProcessingCommentImages}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium w-32 flex justify-center items-center disabled:bg-blue-300">
                {(isSubmittingComment || isProcessingCommentImages) ? <Loader2 className="w-4 h-4 animate-spin" /> : '新增意見'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};