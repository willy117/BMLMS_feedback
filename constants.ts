import { SystemModule } from './types';

export const SYSTEM_MODULES: SystemModule[] = [
  {
    id: 0,
    name: '-- 全域或不指定 --',
    features: [],
  },
  {
    id: 1,
    name: '最新消息',
    features: ['公告事項', '會議資訊', '庶務工作'],
  },
  {
    id: 2,
    name: '討論預約',
    features: ['一般預約', '會議室管理'],
  },
  {
    id: 3,
    name: '研究進度',
    features: ['研究專案進度追蹤', '甘特圖'],
  },
  {
    id: 4,
    name: '計畫管理',
    features: ['經費總覽', '計畫資料', '人事費用', '收支管理', '請購核銷'],
  },
  {
    id: 5,
    name: '差勤請假',
    features: ['實驗室行事曆', '我的申請', '簽核管理'],
  },
  {
    id: 6,
    name: '人員管理',
    features: ['人員列表', '行政分組', '研究分組', '學術系譜'],
  },
  {
    id: 7,
    name: '學術成果',
    features: ['期刊/研討會論文', '獲獎紀錄', '學術演講'],
  },
  {
    id: 8,
    name: '財產管理',
    features: ['資產清冊', '我的保管', '財產盤點', '設備借用', '維修申請'],
  },
  {
    id: 9,
    name: '圖書管理',
    features: ['借閱/歸還', '圖書管理'],
  },
  {
    id: 10,
    name: '資訊管理',
    features: ['資訊設備', '網路管理', '資訊服務申請與障礙申告', 'NAS資料夾權限'],
  },
  {
    id: 11,
    name: '系統管理',
    features: ['使用者管理', '待審核帳號', '權限管理', '通知管理'],
  },
];