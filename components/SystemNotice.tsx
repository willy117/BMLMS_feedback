import React from 'react';
import { ExternalLink, Info } from 'lucide-react';

export const SystemNotice: React.FC = () => {
  return (
    <div className="space-y-4 mb-8">
      {/* Normal System Notice */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="text-blue-500 mt-1 shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-blue-800 font-bold text-lg mb-1">系統公告</h3>
              <p className="text-blue-700 text-sm md:text-base">
                該網頁僅為前端測試使用，並無串接任何資料庫
              </p>
            </div>
          </div>
          <a 
            href="http://120.126.104.222:3000" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white border border-blue-200 hover:bg-blue-100 text-blue-800 px-4 py-2 rounded-lg transition-colors font-medium text-sm whitespace-nowrap shadow-sm"
          >
            前往 BML 管理系統
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};