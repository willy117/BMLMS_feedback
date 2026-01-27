import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { FeedbackItem, CATEGORIES, DEV_STATUSES } from '../types';

interface FeedbackStatsProps {
  items: FeedbackItem[];
}

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b'];

export const FeedbackStats: React.FC<FeedbackStatsProps> = ({ items }) => {
  // Calculate Category Stats
  const categoryData = CATEGORIES.map(cat => ({
    name: cat,
    value: items.filter(i => i.category === cat).length
  })).filter(d => d.value > 0);

  // Calculate Status Stats
  const statusData: { name: string; value: number }[] = DEV_STATUSES.map(status => ({
    name: status,
    value: items.filter(i => i.devResponse?.status === status).length
  }));
  // Add Pending
  const pendingCount = items.filter(i => !i.devResponse).length;
  if (pendingCount > 0) {
    statusData.unshift({ name: '待處理', value: pendingCount });
  }
  const activeStatusData = statusData.filter(d => d.value > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">回饋類型分佈</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [value, '件數']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">處理狀態概況</h3>
        <div className="h-64 w-full">
           <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activeStatusData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} name="件數" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};