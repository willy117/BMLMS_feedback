export type FeedbackCategory = '新增功能' | '修改建議' | '問題回報' | '其他';

export type DevStatus = '已增加' | '已修正' | '需更一步討論' | '無法達成' | '其他';

export interface SubFeature {
  id: string;
  name: string;
}

export interface SystemModule {
  id: number;
  name: string;
  features: string[];
}

export interface Comment {
  id: string;
  userName: string;
  content: string;
  timestamp: number;
  imageUrls?: string[];
}

export interface DevResponse {
  status: DevStatus;
  content: string;
  timestamp: number;
  userName: string; // Usually "Developer", but editable
}

export interface FeedbackItem {
  id: string;
  userName: string;
  category: FeedbackCategory;
  moduleId: number;
  moduleName: string;
  featureName: string; // Can be empty if only module selected
  description: string;
  timestamp: number;
  comments: Comment[];
  devResponse?: DevResponse;
  imageUrls?: string[];
}

export const CATEGORIES: FeedbackCategory[] = ['新增功能', '修改建議', '問題回報', '其他'];

export const DEV_STATUSES: DevStatus[] = ['已增加', '已修正', '需更一步討論', '無法達成', '其他'];