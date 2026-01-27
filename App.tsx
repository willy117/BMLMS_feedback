import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Filter, Search, BarChart3, List, ChevronDown, Loader2, AlertTriangle } from 'lucide-react';
import { FeedbackForm } from './components/FeedbackForm';
import { FeedbackStats } from './components/FeedbackStats';
import { FeedbackItemCard } from './components/FeedbackItemCard';
import { SystemNotice } from './components/SystemNotice';
import { FeedbackItem, Comment, DevResponse, CATEGORIES } from './types';
import { SYSTEM_MODULES } from './constants';

// !!! =============================================================== !!!
// !!!  請將 'YOUR_GOOGLE_APPS_SCRIPT_URL' 換成您部署後取得的網址   !!!
// !!! =============================================================== !!!
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwj3KYSEUeeJvohd6inwnx6wqJcXhFAEy9fDtG8WhhrLHCQCPMBNYgveNkGsOFMQdZ11Q/exec';

// Helper function for API calls
async function postToAction(action: string, payload: any): Promise<{ success: boolean; error?: any; data?: any }> {
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      // REMOVED: mode: 'no-cors' - This was preventing us from reading the response.
      headers: {
        // Using 'application/json' is more standard, but 'text/plain' works fine with GAS.
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, payload }),
      // Redirect is needed because Apps Script can issue redirects
      redirect: 'follow', 
    });

    if (!response.ok) {
        // The server responded with an error status code (4xx or 5xx)
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || JSON.stringify(errorData);
        } catch (e) {
            // Response was not JSON or couldn't be parsed
        }
        throw new Error(errorMessage);
    }
    
    // Apps Script in this setup returns a JSON response that we need to parse
    const result = await response.json();

    if (result.status === 'error') {
      throw new Error(result.message);
    }

    return { success: true, data: result };

  } catch (error) {
    console.error(`Failed to perform action '${action}':`, error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}


function AppContent() {
  const location = useLocation();
  
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 取得資料
  const fetchFeedbackData = useCallback(async () => {
    // Don't set loading to true on refetch, to avoid screen flicker
    setError(null);
    try {
      const response = await fetch(SCRIPT_URL);
      if (!response.ok) {
        throw new Error('無法從後端讀取資料，請檢查 Apps Script 部署設定與權限。');
      }
      const data = await response.json();
      setFeedbackItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生未知的錯誤');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbackData();
  }, [fetchFeedbackData]);

  // Handlers
  const handleAddFeedback = async (newItem: Omit<FeedbackItem, 'id' | 'timestamp' | 'comments'>): Promise<boolean> => {
    const item = { ...newItem, timestamp: Date.now() };
    
    // Now we can correctly check the success status
    const { success, error } = await postToAction('addFeedback', item);

    if (success) {
      // Short delay to give sheet a moment to process, then refetch data
      setTimeout(() => fetchFeedbackData(), 1500); 
    } else {
      alert(`提交失敗：${error}`);
    }
    return success;
  };

  const handleAddComment = async (itemId: string, newComment: Omit<Comment, 'id' | 'timestamp'>): Promise<boolean> => {
    const comment: Comment = {
      ...newComment,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
     const payload = { ...comment, feedbackId: itemId, commentId: comment.id };
    
    const { success, error } = await postToAction('addComment', payload);
    if (success) {
      setTimeout(() => fetchFeedbackData(), 1500);
    } else {
       alert(`提交留言失敗：${error}`);
    }
    return success;
  };

  const handleUpdateDevResponse = async (itemId: string, response: Omit<DevResponse, 'timestamp'>): Promise<boolean> => {
     const devResponse: DevResponse = {
        ...response,
        timestamp: Date.now()
     };
     const payload = { ...devResponse, feedbackId: itemId };

    const { success, error } = await postToAction('updateDevResponse', payload);
     if (success) {
      setTimeout(() => fetchFeedbackData(), 1500);
    } else {
       alert(`更新開發者回覆失敗：${error}`);
    }
    return success;
  };

  // Filtering
  const filteredItems = feedbackItems.filter(item => {
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesModule = filterModule === 'all' || item.moduleId.toString() === filterModule;
    const matchesSearch = searchTerm === '' || 
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.moduleName.toLowerCase().includes(searchTerm.toLowerCase());
      
    return matchesCategory && matchesModule && matchesSearch;
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-20">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-600" />
          <p className="mt-4 text-slate-500">正在從資料庫載入回饋...</p>
        </div>
      );
    }
    if (error) {
       return (
        <div className="text-center py-20 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500" />
          <p className="mt-4 text-red-700 font-semibold">資料載入失敗</p>
          <p className="mt-2 text-red-600 text-sm">{error}</p>
          <p className="mt-2 text-slate-500 text-xs">請確認您的 Apps Script 網址是否正確，以及您已建立了 `Feedback`, `Comments`, `DevResponses` 三個工作表。</p>
        </div>
      );
    }
    if (feedbackItems.length === 0 && !isLoading) {
         return (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-500 font-medium">目前尚無回饋資料</p>
            <p className="text-slate-400 text-sm">請在上方表單新增第一筆回饋！</p>
          </div>
        );
    }
    if (filteredItems.length === 0) {
        return (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
            <Filter className="w-12 h-12 mx-auto opacity-50 text-slate-400" />
            <p className="text-slate-500 font-medium">沒有符合條件的回饋資料</p>
            <p className="text-slate-400 text-sm">請嘗試調整篩選條件</p>
          </div>
        )
    }
    return filteredItems.map(item => (
        <FeedbackItemCard 
            key={item.id} 
            item={item} 
            onAddComment={handleAddComment}
            onUpdateDevResponse={handleUpdateDevResponse}
        />
    ));
  }


  // Page Components
  const StatsPage = () => (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">統計報表</h2>
        <p className="text-slate-500">檢視回饋類型的分佈與目前的處理進度概況。</p>
      </div>
      <FeedbackStats items={feedbackItems} />
    </div>
  );

  const HomePage = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmitFeedback = async (newItem: Omit<FeedbackItem, 'id' | 'timestamp' | 'comments'>) => {
        setIsSubmitting(true);
        const success = await handleAddFeedback(newItem);
        setIsSubmitting(false);
        return success;
    };
      
    return (
        <div className="animate-fadeIn">
        <SystemNotice />

        <FeedbackForm onSubmit={handleSubmitFeedback} isSubmitting={isSubmitting} />

        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-6 border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            回饋列表 
            <span className="bg-slate-200 text-slate-600 text-sm px-2 py-1 rounded-full">{filteredItems.length}</span>
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative group">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="搜尋關鍵字..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white text-black border border-slate-300 rounded-lg text-sm w-full sm:w-48 focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
                <div className="relative">
                <select 
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-8 border border-slate-300 rounded-lg text-sm bg-white text-black focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="all">所有分類</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <ChevronDown className="w-4 h-4" />
                </div>
                </div>

                <div className="relative">
                <select 
                    value={filterModule}
                    onChange={(e) => setFilterModule(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-8 border border-slate-300 rounded-lg text-sm bg-white text-black focus:ring-2 focus:ring-blue-500 outline-none max-w-[150px]"
                >
                    <option value="all">所有頁面</option>
                    {SYSTEM_MODULES.filter(m => m.id !== 0).map(m => <option key={m.id} value={m.id}>{m.id}. {m.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <ChevronDown className="w-4 h-4" />
                </div>
                </div>
            </div>
            </div>
        </div>

        <div className="space-y-6">
            {renderContent()}
        </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <nav className="bg-slate-900 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-6 h-6 text-blue-500" />
              <span className="font-bold text-xl tracking-tight hidden sm:inline">BML 管理系統 <span className="text-slate-400 font-light">| 前端回饋表單</span></span>
              <span className="font-bold text-lg tracking-tight sm:hidden">BML 回饋</span>
            </div>

            <div className="flex items-center gap-2">
              <Link 
                to="/" 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <List className="w-4 h-4" />
                <span>列表</span>
              </Link>
              <Link 
                to="/stats" 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/stats' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>統計</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
