'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Car, FileText, LayoutDashboard, Plus, Printer, Trash2, DollarSign, 
  Menu, X, Building2, Database, Loader2, DownloadCloud, AlertTriangle, 
  Users, LogOut, UserCircle, ArrowRight, Settings, Save, Wrench, 
  Calendar, CheckCircle, XCircle, Filter, ChevronDown, ChevronUp, Edit,
  ArrowUpDown, Briefcase, BarChart3, FileBarChart, ExternalLink,
  StickyNote, CreditCard, Armchair, Fuel, Zap, Search, ChevronLeft, ChevronRight, Layout,
  Receipt, FileCheck, CalendarDays, Bell, ShieldCheck, Clock, CheckSquare,
  Check, AlertCircle, Link,
  CreditCard as PaymentIcon, MapPin, Info, RefreshCw, Globe, Upload, Image as ImageIcon, File // Added Upload, Image as ImageIcon, File
} from 'lucide-react';


// --- Firebase Imports ---
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, 
  User, initializeAuth, browserLocalPersistence, inMemoryPersistence, Auth 
} from "firebase/auth";
import { 
  getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, 
  orderBy, serverTimestamp, writeBatch, Firestore, updateDoc, getDoc, setDoc,
  getDocs, where 
} from "firebase/firestore";

// ------------------------------------------------------------------
// ★★★ Firebase 設定 (已鎖定) ★★★
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCHt7PNXd5NNh8AsdSMDzNfbvhyEsBG2YY",
  authDomain: "gold-land-auto.firebaseapp.com",
  projectId: "gold-land-auto",
  storageBucket: "gold-land-auto.firebasestorage.app",
  messagingSenderId: "817229766566",
  appId: "1:817229766566:web:73314925fe0a4d43917967",
  measurementId: "G-DQ9N75DH5V"
};

// --- Global Firebase Instances ---
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// --- Initialize Firebase ---
const initFirebaseSystem = () => {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    try {
      auth = getAuth(app);
    } catch (e) {
      if (!auth) {
        try {
          auth = initializeAuth(app, { persistence: [browserLocalPersistence, inMemoryPersistence] });
        } catch (err) {
          try { auth = initializeAuth(app, { persistence: inMemoryPersistence }); } catch(final) {}
        }
      }
    }
    db = getFirestore(app);
    return true;
  } catch (e) {
    console.error("Firebase Init Failed:", e);
    return false;
  }
};

// --- 輔助函數：將顏色名稱轉為 CSS 顏色代碼 ---
const getColorHex = (colorName: string) => {
    if (!colorName) return '#e2e8f0'; // Default gray
    const lower = colorName.toLowerCase();
    if (lower.includes('white') || lower.includes('白')) return '#ffffff';
    if (lower.includes('black') || lower.includes('黑')) return '#000000';
    if (lower.includes('silver') || lower.includes('銀')) return '#c0c0c0';
    if (lower.includes('grey') || lower.includes('gray') || lower.includes('灰')) return '#808080';
    if (lower.includes('blue') || lower.includes('藍')) return '#3b82f6';
    if (lower.includes('red') || lower.includes('紅')) return '#ef4444';
    if (lower.includes('gold') || lower.includes('金')) return '#eab308';
    if (lower.includes('green') || lower.includes('綠')) return '#22c55e';
    if (lower.includes('purple') || lower.includes('紫')) return '#a855f7';
    if (lower.includes('brown') || lower.includes('啡')) return '#a52a2a';
    if (lower.includes('yellow') || lower.includes('黃')) return '#facc15';
    if (lower.includes('orange') || lower.includes('橙')) return '#f97316';
    return '#94a3b8'; // Unknown color
};

const isFirebaseReady = initFirebaseSystem();
const appId = firebaseConfig.projectId || 'gold-land-auto';

// --- 公司資料 ---
const COMPANY_INFO = {
  name_en: "GOLD LAND AUTO",
  name_ch: "金田汽車",
  address_en: "Rm 11, 22/F, Blk B, New Trade Plaza, 6 On Ping St, Shek Mun, Shatin, N.T., HK",
  address_ch: "香港沙田石門安平街6號新貿中心B座22樓11室",
  phone: "+852 3490 6112",
  logo_url: "/GL_APPLOGO.png" 
};

type DatabaseEntry = {
    id: string;
    // 四大核心分類
    category: 'Person' | 'Company' | 'Vehicle' | 'CrossBorder'; 
    relatedPlateNo?: string;
    
    // 1. 人員資料
    roles?: string[]; // 角色: 客戶/員工/司機/代辦 (可多選)
    name: string; // 姓名 或 公司名稱
    phone?: string; // 聯絡電話
    address?: string; // 地址
    idNumber?: string; // 香港身份證 / 回鄉證 / BR號碼
    
    // 2. 車輛資料
    plateNoHK?: string; // 香港車牌
    plateNoCN?: string; // 國內車牌

    // 3. 中港指標資料
    quotaNo?: string; // 指標號
    receiptNo?: string; // 回執號

    // 通用資料
    docType?: string; // 文件類型 (e.g. 牌薄, BR, 批文卡)
    description: string; // 備註/文字說明
    
    // 附件與標籤
    attachments: DatabaseAttachment[]; // 取代舊的 images string[]
    tags: string[]; // 用於多重分類搜尋
    
    createdAt: any;
    updatedAt?: any;
    // ★★★ 新增：提醒與續期功能欄位 ★★★
    reminderEnabled?: boolean;      // 是否激活提醒
    expiryDate?: string;            // 到期日 (YYYY-MM-DD)
    renewalCount?: number;          // 續期次數
    renewalDuration?: number;       // 續期區間數值 (例如: 1)
    renewalUnit?: 'year' | 'month'; // 續期區間單位 (年/月)
};

// --- 類型定義 ---
type Expense = {
  id: string;
  type: string; 
  company: string; 
  amount: number;
  description: string;
  status: 'Paid' | 'Unpaid';
  paymentMethod: 'Cash' | 'Cheque' | 'Offset' | 'Transfer';
  date: string;
  invoiceNo?: string;
};

type Payment = {
  id: string;
  date: string;
  type: 'Deposit' | 'Part Payment' | 'Balance' | 'Full Payment' | 'Service Fee'; 
  amount: number;
  method: 'Cash' | 'Cheque' | 'Transfer';
  note?: string; 
  relatedTaskId?: string; // Link payment to a specific CB task
  isCbFee?: boolean; // Helper flag
};

// 中港業務流程項目
type CrossBorderTask = {
    id: string;
    date: string; // 提醒/辦理時間
    item: string; // 項目
    institution: string; // 辦理機構
    handler: string; // 辦理人
    days: string; // 流程時間(天數)
    fee: number; // 應收費用金額 (Receivable)
    currency: 'HKD' | 'RMB'; // 幣種
    note: string; // 備注
    isPaid: boolean; // 是否已付款
};

// 中港車專屬資料結構
type CrossBorderData = {
    isEnabled: boolean; 
    mainlandPlate?: string; 
    driver1?: string; // 主司機
    driver2?: string; // 副司機 1
    driver3?: string; // 副司機 2
    insuranceAgent?: string; 
    quotaNumber?: string; // 指標號
    ports?: string[]; // 口岸 (多選)
    hkCompany?: string;       // 香港公司
    mainlandCompany?: string; // 內地公司
    
    // 日期管理 (YYYY-MM-DD)
    dateHkInsurance?: string; 
    dateReservedPlate?: string; 
    dateBr?: string; 
    dateLicenseFee?: string; 
    dateMainlandJqx?: string; 
    dateMainlandSyx?: string; 
    dateClosedRoad?: string; 
    dateApproval?: string; 
    dateMainlandLicense?: string; 
    dateHkInspection?: string; 

    // 新增：業務流程列表
    tasks?: CrossBorderTask[];
};

// --- 新增：業務辦理模組類型定義 ---

// 1. 流程模板 (配置用，存於 Settings)
type WorkflowTemplate = {
  id: string;
  name: string; // e.g., "港車北上 (2026)"
  description: string;
  steps: WorkflowStepTemplate[];
};

// 2. 流程步驟定義
type WorkflowStepTemplate = {
  id: string;
  stepName: string; // e.g., "網上抽籤"
  description: string; // 操作指引
  externalLink?: string; // 政府網址
  requiredDocs: string[]; // 需收集的文件名稱 (對應資料庫)
  defaultFee: number; // 標準收費
  estimatedDays: number; // 預計耗時
};

// 3. 實際辦理案件 (存於 Database/Inventory 或獨立 Collection)
type ServiceCase = {
  id: string;
  vehicleId: string; // 關聯車輛
  templateId: string; // 使用哪個模板
  status: 'Active' | 'Completed' | 'Suspended';
  currentStepIndex: number; // 當前走到第幾步
  startDate: string;
  
  // 每個步驟的執行狀況
  stepsData: {
    stepId: string;
    status: 'Pending' | 'In Progress' | 'Done' | 'Skipped';
    startDate?: string;
    completedDate?: string;
    collectedDocs: string[]; // 已收集的文件 ID (關聯 dbEntries)
    fee: number; // 實際收費
    isPaid: boolean;
    notes?: string;
  }[];
  
  createdAd: any;
  updatedAt: any;
};

type Vehicle = {
  id: string;
  regMark: string;
  make: string;
  model: string;
  year: string;
  chassisNo: string;
  engineNo: string;
  purchaseType: 'Used' | 'New' | 'Consignment'; 
  colorExt: string; 
  colorInt: string; 
  licenseExpiry: string;
  transmission?: 'Automatic' | 'Manual';
  
  previousOwners?: string; 
  mileage?: number;      
  remarks?: string;

  seating?: number; 
  priceA1?: number; 
  priceTax?: number; 
  priceRegistered?: number; 
  
  fuelType?: 'Petrol' | 'Diesel' | 'Electric';
  engineSize?: number; 
  licenseFee?: number; 

  price: number; 
  costPrice?: number; 
  status: 'In Stock' | 'Sold' | 'Reserved';
  stockInDate?: string; 
  stockOutDate?: string; 
  
  expenses: Expense[]; 
  
  customerName?: string;
  customerPhone?: string;
  customerID?: string; 
  customerAddress?: string;
  
  payments?: Payment[]; 
  
  soldDate?: any;
  soldPrice?: number;
  deposit?: number;

  crossBorder?: CrossBorderData;

  createdAt?: any;
  updatedAt?: any;
};

type SystemSettings = {
  makes: string[];
  models: Record<string, string[]>; 
  expenseTypes: string[];
  expenseCompanies: string[]; 
  colors: string[];
  cbItems: (string | { name: string; defaultInst: string; defaultFee: number; defaultDays: string })[];
  cbInstitutions: string[];
  dbCategories: string[];
  // ★★★ 新增：資料庫設置 ★★★
  dbRoles: string[]; 
  dbDocTypes: Record<string, string[]>;
};

type Customer = {
  name: string;
  phone: string;
  hkid: string;
  address: string;
};

type DocType = 'sales_contract' | 'purchase_contract' | 'invoice' | 'receipt';

type DatabaseAttachment = {
    name: string; // 檔案名稱 (e.g. 身份證正面.jpg)
    data: string; // Base64 string
};

const DEFAULT_SETTINGS: SystemSettings = {
  makes: ['Toyota', 'Honda', 'Mercedes-Benz', 'BMW', 'Tesla', 'Porsche', 'Audi'],
  models: {
    'Toyota': ['Alphard 2.5', 'Alphard 3.5', 'Vellfire 2.5', 'Vellfire 3.5', 'Noah', 'Sienta', 'Hiace', 'Camry'],
    'Honda': ['Stepwgn 1.5', 'Stepwgn 2.0', 'Freed', 'Jazz', 'Odyssey', 'Civic'],
    'Mercedes-Benz': ['A200', 'C200', 'E200', 'E300', 'S500', 'G63', 'GLC 300'],
    'BMW': ['320i', '520i', 'X3', 'X5', 'iX', 'i4'],
    'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X'],
    'Porsche': ['911', 'Cayenne', 'Macan', 'Taycan', 'Panamera'],
    'Audi': ['A3', 'A4', 'Q3', 'Q5', 'Q7']
  },
  expenseTypes: ['車輛維修', '噴油', '執車(Detailing)', '政府牌費', '驗車費', '保險', '拖車費', '佣金', '中港牌批文費', '內地保險', '其他'],
  expenseCompanies: ['金田維修部', 'ABC車房', '政府牌照局', '友邦保險', '自家', '中檢公司'], 
  colors: ['白 (White)', '黑 (Black)', '銀 (Silver)', '灰 (Grey)', '藍 (Blue)', '紅 (Red)', '金 (Gold)', '綠 (Green)'],
  cbItems: [
      { name: '批文延期', defaultInst: '廣東省公安廳', defaultFee: 500, defaultDays: '10' },
      { name: '禁區紙續期', defaultInst: '香港運輸署', defaultFee: 540, defaultDays: '5' },
      { name: '內地驗車', defaultInst: '中國檢驗有限公司', defaultFee: 800, defaultDays: '1' },
      { name: '海關年檢', defaultInst: '梅林海關', defaultFee: 0, defaultDays: '1' },
      { name: '封關/解封', defaultInst: '深圳灣口岸', defaultFee: 0, defaultDays: '1' },
      { name: '換司機', defaultInst: '廣東省公安廳', defaultFee: 1000, defaultDays: '14' }
  ],
  cbInstitutions: ['廣東省公安廳', '香港運輸署', '中國檢驗有限公司', '梅林海關', '深圳灣口岸', '港珠澳大橋口岸'],
  dbCategories: ['一般客戶', '中港司機', '公司客戶', '車輛文件', '保險文件', '其他'],
  
  // ★★★ 新增：資料庫預設值 ★★★
  dbRoles: ['客戶', '員工', '司機', '代辦'],
  dbDocTypes: {
    'Person': ['香港身份證', '回鄉證', '護照', '通行證', '地址證明', '香港電子認證', '香港駕照', '國內駕照', '海外駕照', '其他'],
    'Company': ['商業登記(BR)', '註冊證書(CI)', 'NAR1', '週年申報表', '營業執照', '工商年報', '其他'],
    'Vehicle': ['牌薄(VRD)', '香港保險', '澳門保險', '國內交強保', '國內商業險', '國內關稅險', '其他'],
    'CrossBorder': ['批文卡', '新辦回執', '換車回執', '司機更換回執', '中檢資料', '其他']
  }
};

const HZMB_WORKFLOW: WorkflowTemplate = {
  id: 'hzmb_northbound_2026',
  name: '港車北上 (HZMB Northbound 2026)',
  description: '適用於 8 座以下非營運私家車，需每年續期',
  steps: [
    {
      id: 'step_1',
      stepName: '1. 登記與抽籤 (Lottery)',
      description: '於官網登記電腦抽籤。中籤後 72 小時內需遞交正式申請。',
      externalLink: 'https://www.hzmbqfs.gov.hk/', // 官方指定網站
      requiredDocs: ['香港身份證', '回鄉證', '車輛牌簿(VRD)'],
      defaultFee: 0,
      estimatedDays: 14 
    },
    {
      id: 'step_2',
      stepName: '2. 內地審核與驗車 (Vetting & Inspection)',
      description: '待運輸署初步審核後，預約並前往香港指定地點(中檢)驗車。',
      externalLink: 'https://www.cic.com.hk/', // 中檢預約
      requiredDocs: ['驗車合格紙(中檢)', '審核通知書'],
      defaultFee: 800, // 假設代辦費
      estimatedDays: 10
    },
    {
      id: 'step_3',
      stepName: '3. 購買保險 (Insurance)',
      description: '購買「等效先認」保險或內地「交強險」，並上傳至內地系統。',
      externalLink: '', 
      requiredDocs: ['內地交強險單', '內地商業險單(選購)'],
      defaultFee: 3000, // 假設保費+手續費
      estimatedDays: 3
    },
    {
      id: 'step_4',
      stepName: '4. 獲發牌證 (Permit Issuance)',
      description: '內地審核通過發出「電子牌證」，運輸署發出「封閉道路通行許可證」。',
      externalLink: '',
      requiredDocs: ['電子牌證', '封閉道路通行許可證', '電子批准信'],
      defaultFee: 540, // 港府許可證費用
      estimatedDays: 5
    },
    {
      id: 'step_5',
      stepName: '5. 預約出行 (Booking)',
      description: '透過系統預約日子，需留意每年停留不超過 180 天限制。',
      externalLink: 'https://www.hzmbqfs.gov.hk/tc/booking/',
      requiredDocs: ['出行預約單'],
      defaultFee: 0,
      estimatedDays: 1
    }
  ]
};

// ★★★ 修改：重新定義口岸分類 ★★★
const PORTS_HK_GD = ['皇崗', '深圳灣', '蓮塘', '沙頭角', '文錦渡', '港珠澳大橋(港)'];
const PORTS_MO_GD = ['港珠澳大橋(澳)', '關閘(拱北)', '橫琴', '青茂'];
// 合併所有口岸以供資料讀取使用
const ALL_CB_PORTS = [...PORTS_HK_GD, ...PORTS_MO_GD];

const AVAILABLE_PORTS = ['皇崗', '深圳灣', '蓮塘', '沙頭角', '文錦渡', '大橋'];

const formatCurrency = (amount: number) => new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD' }).format(amount);
const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });

//移除舊的 DB_ROLES 和 DB_DOC_TYPES 常數定義 (因為已經移入 settings)
// ★★★ 新增：資料庫分類常數 ★★★
//const DB_ROLES = ['客戶', '員工', '司機', '代辦'];

//const DB_DOC_TYPES: Record<string, string[]> = {
//    'Person': ['香港身份證', '回鄉證', '護照', '通行證', '地址證明', '香港電子認證', '香港駕照', '國內駕照', '海外駕照', '其他'],
//    'Company': ['商業登記(BR)', '註冊證書(CI)', 'NAR1', '週年申報表', '營業執照', '工商年報', '其他'],
//    'Vehicle': ['牌薄(VRD)', '香港保險', '澳門保險', '國內交強保', '國內商業險', '國內關稅險', '其他'],
//    'CrossBorder': ['批文卡', '新辦回執', '換車回執', '司機更換回執', '中檢資料', '其他']
//};

const DB_CATEGORIES = [
    { id: 'Person', label: '人員 / 身份資料 (Person)' },
    { id: 'Company', label: '公司資料 (Company)' },
    { id: 'Vehicle', label: '車輛文件 (Vehicle Doc)' },
    { id: 'CrossBorder', label: '中港指標文件 (Quota Doc)' }
];

// ... existing code ...
const formatNumberInput = (value: string) => {
  // 1. 移除非數字、非小數點、非負號的字符
  let cleanVal = value.replace(/[^0-9.-]/g, '');

  // 2. 處理負號：只允許在開頭出現一次
  const isNegative = cleanVal.startsWith('-');
  cleanVal = cleanVal.replace(/-/g, ''); // 先移除所有負號

  // 3. 處理小數點：只允許出現一次
  const parts = cleanVal.split('.');
  if (parts.length > 2) {
      cleanVal = parts[0] + '.' + parts.slice(1).join('');
  }

  // 4. 如果為空，根據是否為負數返回
  if (!cleanVal) return isNegative ? '-' : '';

  // 5. 格式化整數部分 (千分位)
  const [integer, decimal] = cleanVal.split('.');
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  let result = formattedInteger;
  if (decimal !== undefined) {
      result += '.' + decimal;
  }
  
  return isNegative ? '-' + result : result;
};
// ... existing code ...

const calculateLicenseFee = (fuelType: 'Petrol' | 'Diesel' | 'Electric', engineSize: number) => {
  if (!engineSize) return 0;
  if (fuelType === 'Petrol') {
    if (engineSize <= 1500) return 5074;
    if (engineSize <= 2500) return 7498;
    if (engineSize <= 3500) return 9929;
    if (engineSize <= 4500) return 12360;
    return 14694;
  }
  if (fuelType === 'Diesel') {
    if (engineSize <= 1500) return 6972;
    if (engineSize <= 2500) return 9396;
    if (engineSize <= 3500) return 11827;
    if (engineSize <= 4500) return 14258;
    return 16592;
  }
  if (fuelType === 'Electric') {
    if (engineSize <= 75) return 1614;
    if (engineSize <= 125) return 2114;
    if (engineSize <= 175) return 2614;
    if (engineSize <= 225) return 3114;
    return 5114;
  }
  return 0;
};

// 計算日期剩餘天數
const getDaysRemaining = (targetDate?: string) => {
    if (!targetDate) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

// 狀態標籤組件 (日期)
const DateStatusBadge = ({ date, label }: { date?: string, label: string }) => {
    if (!date) return <div className="text-gray-300 text-xs text-center">-</div>;
    const days = getDaysRemaining(date);
    let colorClass = "text-green-600 bg-green-50 border-green-200";
    let statusText = "正常";

    if (days === null) return null;

    if (days < 0) {
        colorClass = "text-red-600 bg-red-50 border-red-200 font-bold";
        statusText = `過期 ${Math.abs(days)}天`;
    } else if (days <= 30) {
        colorClass = "text-amber-600 bg-amber-50 border-amber-200 font-bold";
        statusText = `剩 ${days}天`;
    } else {
        statusText = "正常";
    }

    return (
        <div className={`border rounded px-1 py-1 text-[10px] inline-flex flex-col items-center justify-center w-20 text-center leading-tight ${colorClass}`} title={`${label}: ${date}`}>
            <div className="font-bold mb-0.5 scale-90">{label}</div>
            <div className="scale-90">{date}</div>
            <div className="scale-90">{statusText}</div>
        </div>
    );
};

// --- Components: Staff Login Screen ---
const StaffLoginScreen = ({ onLogin }: { onLogin: (id: string) => void }) => {
  const [input, setInput] = useState('charles');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(input.trim()) onLogin(input.trim().toUpperCase());
  };
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md border border-slate-100 p-2">
             <img src={COMPANY_INFO.logo_url} alt="Gold Land Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.parentElement!.innerHTML='<svg class="w-12 h-12 text-yellow-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>'; }} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">金田汽車DMS系統</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">v3.0.3 Sales & Management</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">員工編號 / Staff ID</label>
            <input 
              type="text" 
              className="w-full p-4 border border-slate-300 rounded-xl text-lg text-slate-900 font-bold focus:ring-2 focus:ring-yellow-500 outline-none transition placeholder:text-slate-400" 
              placeholder="e.g. BOSS, SALES01" 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              autoFocus 
            />
          </div>
          <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-xl font-bold text-lg flex items-center justify-center transition transform active:scale-95 shadow-lg">Login <ArrowRight className="ml-2" /></button>
        </form>
      </div>
    </div>
  );
};


// --- 1. InfoWidget (外部組件) ---
const InfoWidget = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [portStatus, setPortStatus] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const PORT_MAPPING: Record<string, string> = {
        'SBC': '深圳灣', 'LMC': '皇崗(落馬洲)', 'HZM': '港珠澳大橋',
        'HYW': '蓮塘/香園圍', 'MKT': '文錦渡', 'STK': '沙頭角'
    };

    const getStatusText = (code: number) => {
        if (code === 0) return '正常'; if (code === 1) return '繁忙';
        if (code === 2) return '擠塞'; if (code === 99) return '關閉'; return '-';
    };

    const getStatusColor = (code: number) => {
        if (code === 0) return 'text-green-400'; if (code === 1) return 'text-amber-400';
        if (code === 2) return 'text-red-500 font-bold'; return 'text-slate-600';
    };

    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchTraffic = async () => {
            try {
                const res = await fetch('/api/traffic');
                if (!res.ok) throw new Error('API Error');
                const data = await res.json();
                if (data && typeof data === 'object') {
                    const formatted = Object.keys(data).filter(key => PORT_MAPPING[key]).map(key => {
                        const info = data[key];
                        return { name: PORT_MAPPING[key], up: info.depQueue, down: info.arrQueue };
                    });
                    const sortOrder = ['深圳灣', '皇崗(落馬洲)', '港珠澳大橋', '蓮塘/香園圍', '文錦渡', '沙頭角'];
                    formatted.sort((a, b) => sortOrder.indexOf(a.name) - sortOrder.indexOf(b.name));
                    setPortStatus(formatted);
                }
            } catch (e) { console.error("Traffic fetch failed:", e); setPortStatus([]); } 
            finally { setLoading(false); }
        };
        fetchTraffic();
        const trafficTimer = setInterval(fetchTraffic, 300000);
        return () => clearInterval(trafficTimer);
    }, []);

    const getLunarDate = () => {
        try { return new Intl.DateTimeFormat('zh-HK', { calendar: 'chinese', month: 'long', day: 'numeric' }).format(currentTime); } catch (e) { return ''; }
    };

    return (
        <div className="mx-3 mb-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700 text-xs backdrop-blur-sm transition-all hover:bg-slate-800/80">
            <div className="mb-3 border-b border-slate-700 pb-2">
                <div className="text-xl font-mono font-bold text-white tracking-widest text-center">{currentTime.toLocaleTimeString('en-GB', { hour12: false })}</div>
                <div className="flex justify-between mt-1 text-slate-400"><span>{currentTime.toLocaleDateString('zh-HK')}</span><span>{['日','一','二','三','四','五','六'][currentTime.getDay()]}</span></div>
                <div className="text-center mt-1 text-yellow-500 font-medium">{getLunarDate().replace('年', '年 ')}</div>
            </div>
            {portStatus.length > 0 ? (
                <div className="space-y-1.5 animate-fade-in">
                    <div className="flex justify-between text-slate-500 text-[10px] mb-1 px-1"><span>口岸</span><div className="flex gap-3"><span>北上</span><span>南下</span></div></div>
                    {portStatus.map((port, idx) => (
                        <div key={idx} className="flex justify-between items-center text-slate-300 border-b border-slate-700/50 pb-1 last:border-0 last:pb-0 px-1 hover:bg-slate-700/30 rounded">
                            <span className="truncate mr-2 font-medium text-slate-200">{port.name}</span>
                            <div className="flex gap-3 text-right font-bold whitespace-nowrap min-w-[60px] justify-end">
                                <span className={getStatusColor(port.up)}>{getStatusText(port.up)}</span>
                                <span className={getStatusColor(port.down)}>{getStatusText(port.down)}</span>
                            </div>
                        </div>
                    ))}
                    <div className="text-[9px] text-right text-slate-600 mt-2 italic pr-1">數據: 入境處 (每5分鐘更新)</div>
                </div>
            ) : (<div className="text-center text-slate-600 italic py-2">{loading ? '更新數據中...' : '暫無即時數據'}</div>)}
        </div>
    );
};

// --- 2. Sidebar (外部組件) ---
type SidebarProps = {
    activeTab: string;
    setActiveTab: (tab: any) => void;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (open: boolean) => void;
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
    staffId: string | null;
    setStaffId: (id: string | null) => void;
};

const Sidebar = ({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen, isSidebarCollapsed, setIsSidebarCollapsed, staffId, setStaffId }: SidebarProps) => (
    <>
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-40 bg-slate-900 text-white transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:h-screen flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-64'} print:hidden shadow-xl border-r border-slate-800`}>
        <div className={`p-4 h-16 border-b border-slate-700 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} transition-all flex-none`}>
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center"><img src={COMPANY_INFO.logo_url} alt="Logo" className="w-full h-full object-contain" /></div>
                <div className={`transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}><h1 className="text-lg font-bold text-yellow-500 tracking-tight leading-tight whitespace-nowrap">金田汽車<br/><span className="text-xs text-slate-400">DMS系統</span></h1></div>
            </div>
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:flex text-slate-400 hover:text-white hover:bg-slate-800 p-1 rounded transition-colors" title={isSidebarCollapsed ? "展開選單" : "縮起選單"}>{isSidebarCollapsed ? null : <ChevronLeft size={20} />}</button>
        </div>
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {[
            { id: 'dashboard', label: '業務儀表板', icon: LayoutDashboard }, { id: 'inventory', label: '車輛管理', icon: Car },
            { id: 'create_doc', label: '開單系統', icon: FileText }, { id: 'reports', label: '統計報表', icon: FileBarChart },
            { id: 'cross_border', label: '中港業務', icon: Globe }, { id: 'database', label: '資料庫中心', icon: Database },
            { id: 'business', label: '業務辦理流程', icon: Briefcase }, { id: 'settings', label: '系統設置', icon: Settings }
          ].map(item => (
             <button key={item.id} onClick={() => { setActiveTab(item.id as any); setIsMobileMenuOpen(false); }} className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 group relative ${activeTab === item.id ? 'bg-yellow-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300 hover:text-white'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? item.label : ''}>
                <item.icon size={22} className={`flex-shrink-0 ${!isSidebarCollapsed && 'mr-3'} ${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                {!isSidebarCollapsed && <span className="whitespace-nowrap font-medium">{item.label}</span>}
                {isSidebarCollapsed && <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-slate-700">{item.label}</div>}
             </button>
          ))}
        </nav>
        {!isSidebarCollapsed && <InfoWidget />}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex-none">
             {isSidebarCollapsed ? (
                 <button onClick={() => {if(confirm("確定登出？")) setStaffId(null);}} className="w-full flex justify-center text-red-400 hover:text-red-300 transition" title="登出"><LogOut size={20} /></button>
             ) : (
                 <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-2 overflow-hidden">
                         <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-yellow-500"><UserCircle size={20} /></div>
                         <div className="flex-1 min-w-0"><p className="text-sm font-bold text-white truncate">{staffId}</p><p className="text-[10px] text-slate-500">已登入</p></div>
                     </div>
                     <button onClick={() => {if(confirm("確定登出？")) setStaffId(null);}} className="text-slate-500 hover:text-red-400 transition p-2"><LogOut size={18} /></button>
                 </div>
             )}
             {isSidebarCollapsed && <button onClick={() => setIsSidebarCollapsed(false)} className="w-full mt-4 flex justify-center text-slate-500 hover:text-white py-2 border-t border-slate-800 md:flex hidden"><ChevronRight size={20} /></button>}
        </div>
        <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden absolute top-4 right-4 text-slate-400 hover:text-white"><X size={24} /></button>
      </div>
    </>
);

// --- 3. DatabaseModule (外部組件) ---
type DatabaseModuleProps = {
    db: Firestore | null;
    staffId: string | null;
    appId: string;
    settings: SystemSettings;
    editingEntry: DatabaseEntry | null;
    setEditingEntry: React.Dispatch<React.SetStateAction<DatabaseEntry | null>>;
    isDbEditing: boolean;
    setIsDbEditing: React.Dispatch<React.SetStateAction<boolean>>;
    inventory: Vehicle[];
};

// 3. DatabaseModule (含重複比對功能 + 儲存優化)
const DatabaseModule = ({ db, staffId, appId, settings, editingEntry, setEditingEntry, isDbEditing, setIsDbEditing, inventory }: DatabaseModuleProps) => {
    const [entries, setEntries] = useState<DatabaseEntry[]>([]);
    const [selectedCatFilter, setSelectedCatFilter] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [tagInput, setTagInput] = useState('');
    
    // ★★★ 新增：重複資料處理狀態 ★★★
    const [dupeGroups, setDupeGroups] = useState<DatabaseEntry[][]>([]);
    const [showDupeModal, setShowDupeModal] = useState(false);

    useEffect(() => {
        if (!db || !staffId) return;
        const currentDb = db; 
        const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
        const colRef = collection(currentDb, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'database');
        
        // 依照建立時間排序
        const q = query(colRef, orderBy('createdAt', 'desc'));
        
        const unsub = onSnapshot(q, (snapshot) => {
            const list: DatabaseEntry[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                let attachments = data.attachments || [];
                // 兼容舊資料的 images 欄位
                if (!attachments.length && data.images && Array.isArray(data.images)) {
                    attachments = data.images.map((img: string, idx: number) => ({ name: `圖片 ${idx+1}`, data: img }));
                }
                list.push({ 
                    id: doc.id, 
                    category: data.category || 'Person', 
                    name: data.name || data.title || '',
                    phone: data.phone || '', 
                    address: data.address || '', 
                    idNumber: data.idNumber || '',
                    plateNoHK: data.plateNoHK || '', 
                    plateNoCN: data.plateNoCN || '', 
                    quotaNo: data.quotaNo || '',
                    receiptNo: data.receiptNo || '', 
                    docType: data.docType || '', 
                    description: data.description || '',
                    tags: data.tags || [], 
                    roles: data.roles || [], 
                    attachments: attachments,
                    createdAt: data.createdAt, 
                    updatedAt: data.updatedAt,
                    reminderEnabled: data.reminderEnabled || false, 
                    expiryDate: data.expiryDate || '',
                    renewalCount: data.renewalCount || 0, 
                    renewalDuration: data.renewalDuration || 1, 
                    renewalUnit: data.renewalUnit || 'year',
                    relatedPlateNo: data.relatedPlateNo || '' // 確保讀取關聯車牌
                } as DatabaseEntry);
            });
            setEntries(list);
        });
        return () => unsub();
    }, [staffId, db, appId]);

    // ... (handleFileUpload, downloadImage, handleQuickRenew 保持不變) ...
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... 保留原有代碼 ... */ };
    const downloadImage = (dataUrl: string, filename: string) => { /* ... 保留原有代碼 ... */ };
    const handleQuickRenew = () => { /* ... 保留原有代碼 ... */ };

    // ★★★ 修改：handleSave (儲存後不跳回列表，保留在編輯頁面) ★★★
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); 
        if (!db || !staffId || !editingEntry) return;
        const currentDb = db; 
        const autoTags = new Set(editingEntry.tags || []);
        if(editingEntry.name) autoTags.add(editingEntry.name);
        
        const finalEntry = { ...editingEntry, tags: Array.from(autoTags), roles: editingEntry.roles || [], attachments: editingEntry.attachments || [] };
        const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
        
        try {
            if (editingEntry.id) {
                const docRef = doc(currentDb, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'database', editingEntry.id);
                await updateDoc(docRef, { ...finalEntry, updatedAt: serverTimestamp() });
                alert('資料已更新 (已保留在當前頁面)');
                // ★★★ 重點：這裡刪除了 setIsDbEditing(false)，讓用戶繼續編輯 ★★★
            } else {
                const { id, ...dataToSave } = finalEntry;
                const colRef = collection(currentDb, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'database');
                const newRef = await addDoc(colRef, { ...dataToSave, createdAt: serverTimestamp() });
                // ★★★ 重點：更新當前 ID，讓它變成編輯模式，而不是新增模式 ★★★
                setEditingEntry({ ...finalEntry, id: newRef.id }); 
                alert('新資料已建立');
            }
        } catch (err) { console.error(err); alert('儲存失敗'); }
    };

    // ... (handleDelete, toggleRole, addTag 保持不變) ...
    const handleDelete = async (id: string) => { /* ... 保留原有代碼 ... */ };
    const toggleRole = (role: string) => { /* ... 保留原有代碼 ... */ };
    const addTag = () => { /* ... 保留原有代碼 ... */ };

    // ★★★ 新增：檢查重複邏輯 ★★★
    const scanForDuplicates = () => {
        const nameMap = new Map<string, DatabaseEntry[]>();
        entries.forEach(e => {
            const key = e.name.trim(); // 以名稱做為比對鍵值 (也可加入電話)
            if (!key) return;
            if (!nameMap.has(key)) nameMap.set(key, []);
            nameMap.get(key)?.push(e);
        });

        const duplicates: DatabaseEntry[][] = [];
        nameMap.forEach((group) => {
            if (group.length > 1) duplicates.push(group);
        });

        if (duplicates.length === 0) {
            alert("未發現重複資料 (根據名稱)");
        } else {
            setDupeGroups(duplicates);
            setShowDupeModal(true);
        }
    };

    // ★★★ 新增：合併/保留邏輯 ★★★
    const resolveDuplicate = async (keepId: string, group: DatabaseEntry[]) => {
        if (!confirm("確定保留選中的資料，並刪除其他重複項？")) return;
        if (!db || !staffId) return;
        const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
        
        const deleteIds = group.filter(e => e.id !== keepId).map(e => e.id);
        
        try {
            const batch = writeBatch(db);
            deleteIds.forEach(id => {
                const ref = doc(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'database', id);
                batch.delete(ref);
            });
            await batch.commit();
            
            // 更新 UI
            const newGroups = dupeGroups.map(g => g.filter(e => !deleteIds.includes(e.id))).filter(g => g.length > 1);
            setDupeGroups(newGroups);
            if (newGroups.length === 0) setShowDupeModal(false);
            
        } catch (e) { console.error(e); alert("處理失敗"); }
    };

    const filteredEntries = entries.filter(entry => { /* ... 保留原有過濾邏輯 ... */ return true; }); // 請保留原本的 filter 代碼

    return (
        <div className="flex h-full bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden relative">
            {/* 左側列表 */}
            <div className="w-1/3 border-r border-slate-100 flex flex-col bg-slate-50">
                <div className="p-4 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center text-slate-700"><Database className="mr-2" size={20}/> 資料庫</h2>
                        <div className="flex gap-2">
                             {/* ★★★ 新增：重複比對按鈕 ★★★ */}
                            <button onClick={scanForDuplicates} className="bg-amber-100 text-amber-700 p-2 rounded-full hover:bg-amber-200" title="檢查重複"><RefreshCw size={18}/></button>
                            <button onClick={(e) => { e.preventDefault(); setEditingEntry({ id: '', category: 'Person', name: '', description: '', attachments: [], tags: [], roles: [], createdAt: null }); setIsDbEditing(true); }} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"><Plus size={20}/></button>
                        </div>
                    </div>
                    {/* ... (Search & Filter UI 保持不變) ... */}
                </div>
                {/* ... (列表渲染保持不變) ... */}
            </div>

            {/* 右側編輯區 */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                {/* ... (編輯表單 UI 保持不變，注意 handleSave 已更新) ... */}
                {editingEntry ? (
                     <form onSubmit={handleSave} className="flex flex-col h-full">
                         {/* ... (保留原本的 Form 內容) ... */}
                     </form>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400"><Database size={48} className="mb-4"/><p>請選擇或新增資料</p></div>
                )}
            </div>

            {/* ★★★ 新增：重複處理 Modal ★★★ */}
            {showDupeModal && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-amber-50 rounded-t-xl">
                            <h3 className="font-bold text-amber-800 flex items-center"><AlertTriangle className="mr-2"/> 發現重複資料 ({dupeGroups.length} 組)</h3>
                            <button onClick={() => setShowDupeModal(false)}><X/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {dupeGroups.map((group, idx) => (
                                <div key={idx} className="border rounded-lg p-3 bg-slate-50">
                                    <h4 className="font-bold mb-2 text-slate-700">名稱: {group[0].name}</h4>
                                    <div className="space-y-2">
                                        {group.map(item => (
                                            <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border">
                                                <div className="text-xs">
                                                    <div><span className="font-bold">ID:</span> {item.id}</div>
                                                    <div><span className="font-bold">電話:</span> {item.phone || '-'}</div>
                                                    <div><span className="font-bold">建立:</span> {item.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}</div>
                                                </div>
                                                <button 
                                                    onClick={() => resolveDuplicate(item.id, group)}
                                                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                                >
                                                    保留此筆 (刪除其他)
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- 主應用程式 ---
export default function GoldLandAutoDMS() {
  const [user, setUser] = useState<User | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'create_doc' | 'settings' | 'inventory_add' | 'reports' | 'cross_border' | 'business' | 'database'>('dashboard');
  
  // Data States
  const [inventory, setInventory] = useState<Vehicle[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [dbEntries, setDbEntries] = useState<DatabaseEntry[]>([]);
  // UI States
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null); 
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null); 
  
  // ★★★ 新增：將資料庫編輯狀態提升到這裡，讓 Dashboard 也能控制 ★★★
  const [editingEntry, setEditingEntry] = useState<DatabaseEntry | null>(null);
  const [isDbEditing, setIsDbEditing] = useState(false);

  // Cross Border UI State
  const [activeCbVehicleId, setActiveCbVehicleId] = useState<string | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Doc Preview State
  const [previewDoc, setPreviewDoc] = useState<{ 
      type: DocType, 
      vehicle: Vehicle, 
      payment?: Payment, // 保留舊有兼容性
      selectedItems?: (Payment | CrossBorderTask)[] // 新增：支援多選列表
  } | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState(''); 
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Vehicle; direction: 'asc' | 'desc' } | null>(null);

  // Report States
  const [reportType, setReportType] = useState<'receivable' | 'payable' | 'sales'>('receivable');
  const [reportStartDate, setReportStartDate] = useState(new Date().getFullYear() + '-01-01');
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportCompany, setReportCompany] = useState('');

  // Legacy Forms
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '', hkid: '', address: '' });
  const [deposit, setDeposit] = useState<number>(0);
  const [docType, setDocType] = useState<DocType>('sales_contract');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => { window.print(); };

  // --- Auth & Data Loading ---
  useEffect(() => {
    // 修正：強化 PWA/App Icon 及瀏覽器 Favicon 更新邏輯
    const setAppIcon = () => {
        const logoPath = COMPANY_INFO.logo_url;
        const appName = "金田汽車DMS系統";
        
        // 移除舊的所有 icon 連結
        const existingIcons = document.querySelectorAll("link[rel*='icon']");
        existingIcons.forEach(el => el.parentNode?.removeChild(el));

        // 建立新連結的輔助函數，加入時間戳版本號強制更新緩存
        const setLink = (rel: string, href: string) => {
            const link = document.createElement('link');
            link.rel = rel;
            // 加入 ?v= 時間戳，確保瀏覽器不會讀取舊緩存
            link.href = `${href}?v=${new Date().getTime()}`;
            document.getElementsByTagName('head')[0].appendChild(link);
        };

        const setMeta = (propertyOrName: string, content: string, isProperty: boolean = false) => {
            const attr = isProperty ? 'property' : 'name';
            let meta = document.querySelector(`meta[${attr}='${propertyOrName}']`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute(attr, propertyOrName);
                document.getElementsByTagName('head')[0].appendChild(meta);
            }
            meta.setAttribute('content', content);
        };

        // 設定標題與各類 Icon
        document.title = appName;
        setLink('icon', logoPath);
        setLink('shortcut icon', logoPath); // 針對舊版或特定瀏覽器
        setLink('apple-touch-icon', logoPath); 

        // Web App Meta
        setMeta('apple-mobile-web-app-title', appName); 
        setMeta('application-name', appName); 
        setMeta('apple-mobile-web-app-capable', 'yes');
        setMeta('mobile-web-app-capable', 'yes');

        // Social Media / Open Graph Meta
        setMeta('og:title', appName, true);
        setMeta('og:site_name', appName, true);
        setMeta('og:image', logoPath, true);
    };
    
    setAppIcon();
    
    // 監控標題防止被外部竄改
    const observer = new MutationObserver(() => {
        if (document.title !== "金田汽車DMS系統") {
            document.title = "金田汽車DMS系統";
        }
    });
    observer.observe(document.querySelector('title') || document.head, { subtree: true, characterData: true, childList: true });

    // ... (後續 Auth 邏輯保持不變)
    const currentAuth = auth;
    if (!currentAuth) { setLoading(false); return; }

    const initAuth = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).__initial_auth_token) {
          await signInWithCustomToken(currentAuth, (window as any).__initial_auth_token);
        } else {
          await signInAnonymously(currentAuth);
        }
      } catch (error: any) {
        if (!error.message?.includes('storage')) setAuthError(error.message);
        setLoading(false);
      }
    };
    const unsubscribe = onAuthStateChanged(currentAuth, (u) => { setUser(u); setLoading(false); });
    initAuth();
    return () => unsubscribe();
  }, []);

  // Fetch Inventory & Settings
  useEffect(() => {
    if (!db || !staffId) return;
    const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
    
    const invRef = collection(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'inventory');
    const q = query(invRef, orderBy('createdAt', 'desc')); 
    const unsubInv = onSnapshot(q, (snapshot) => {
      const list: Vehicle[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Vehicle));
      setInventory(list);
    }, (err) => console.error("Inv sync error", err));

    const settingsDocRef = doc(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'system_config', 'general_settings');
    getDoc(settingsDocRef).then(docSnap => {
      if (docSnap.exists()) {
        const loadedSettings = docSnap.data() as SystemSettings;
        setSettings({
            ...DEFAULT_SETTINGS,
            ...loadedSettings,
            models: { ...DEFAULT_SETTINGS.models, ...loadedSettings.models },
            expenseCompanies: loadedSettings.expenseCompanies || DEFAULT_SETTINGS.expenseCompanies,
            cbItems: loadedSettings.cbItems || DEFAULT_SETTINGS.cbItems,
            cbInstitutions: loadedSettings.cbInstitutions || DEFAULT_SETTINGS.cbInstitutions
        });
      } else {
        setDoc(settingsDocRef, DEFAULT_SETTINGS);
      }
    });

    return () => { unsubInv(); };
  }, [staffId]);

useEffect(() => {
        if (!db || !staffId) return;
        const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
        const dbRef = collection(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'database');
        
        // 這裡只需要監聽，不用太複雜的排序，減輕負載
        const unsubDb = onSnapshot(dbRef, (snapshot) => {
            const list: DatabaseEntry[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // 我們只需要計算提醒，所以只讀取必要欄位即可，不需要讀圖片
                list.push({ 
                    id: doc.id, 
                    category: data.category || 'Person',
                    name: data.name || '',
                    reminderEnabled: data.reminderEnabled || false,
                    expiryDate: data.expiryDate || '',
                    // 其他欄位對於統計來說不重要，可以省略或給預設值
                    attachments: [], tags: [], description: '', createdAt: null 
                } as DatabaseEntry);
            });
            setDbEntries(list);
        }, (err) => console.error("Db sync error", err));

        return () => unsubDb();
    }, [staffId]);

  if (!staffId) return <StaffLoginScreen onLogin={setStaffId} />;



  // --- CRUD Actions ---

// ★★★ 新增：自動同步資料至資料庫中心 (連動邏輯) ★★★
  const syncToDatabase = async (data: { name: string, phone?: string, plate?: string, quota?: string }, role: string) => {
      // 確保 db 存在且有姓名才執行
      if (!db || !staffId || !data.name) return;
      const currentDb = db;
      const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
      const dbRef = collection(currentDb, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'database');
      
      try {
          // 1. 檢查是否已存在 (根據姓名和分類)
          // 這裡我們假設主要檢查 'Person' 類別
          const q = query(dbRef, where('category', '==', 'Person'), where('name', '==', data.name));
          const snapshot = await getDocs(q);

          if (snapshot.empty) {
              // 2. 若不存在，自動建立新檔案
              await addDoc(dbRef, {
                  category: 'Person',
                  name: data.name,
                  phone: data.phone || '',
                  roles: [role], // 自動標記角色 (客戶/司機)
                  plateNoCN: data.plate || '', // 如果是司機，帶入內地車牌
                  quotaNo: data.quota || '',   // 如果是司機，帶入指標號
                  description: `[系統自動建立] 來源: ${role} - ${new Date().toLocaleDateString()}`,
                  tags: ['自動同步', role],
                  attachments: [],
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
              });
              console.log(`[DMS] 已自動將 ${data.name} 加入資料庫`);
          } else {
              // 3. 若已存在，可選擇是否更新 (這裡暫時選擇不覆蓋，避免誤刪用戶編輯過的資料)
              console.log(`[DMS] ${data.name} 已存在於資料庫，跳過同步`);
          }
      } catch (e) {
          console.error("Auto-sync failed:", e);
      }
  };

const saveVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !staffId) return;
    const formData = new FormData(e.currentTarget);
    const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
    
    // 基本欄位讀取
    const status = formData.get('status') as any;
    const priceRaw = formData.get('price') as string;
    const costPriceRaw = formData.get('costPrice') as string;
    const mileageRaw = formData.get('mileage') as string;
    
    // 價格計算
    const priceA1Raw = formData.get('priceA1') as string;
    const priceTaxRaw = formData.get('priceTax') as string;
    const valA1 = Number(priceA1Raw.replace(/,/g, '') || 0);
    const valTax = Number(priceTaxRaw.replace(/,/g, '') || 0);
    const valRegistered = valA1 + valTax;

    // 車輛規格
    const fuelType = formData.get('fuelType') as 'Petrol' | 'Diesel' | 'Electric';
    
    // ★★★ 新增：波箱 (Transmission) ★★★
    const transmission = formData.get('transmission') as 'Automatic' | 'Manual';

    const engineSizeRaw = formData.get('engineSize') as string;
    const engineSize = Number(engineSizeRaw.replace(/,/g, '') || 0);
    const licenseFee = calculateLicenseFee(fuelType, engineSize);

    // Cross Border Data Capture
    const cbEnabled = formData.get('cb_isEnabled') === 'on';
    
    const selectedPorts: string[] = [];
    ALL_CB_PORTS.forEach(port => {
        if (formData.get(`cb_port_${port}`) === 'on') {
            selectedPorts.push(port);
        }
    });

    // 構建中港資料物件
    const crossBorderData: CrossBorderData = {
        isEnabled: cbEnabled,
        mainlandPlate: formData.get('cb_mainlandPlate') as string || '',
        
        // ★★★ 新增：公司資料 ★★★
        hkCompany: formData.get('cb_hkCompany') as string || '',
        mainlandCompany: formData.get('cb_mainlandCompany') as string || '',
        
        driver1: formData.get('cb_driver1') as string || '',
        driver2: formData.get('cb_driver2') as string || '',
        driver3: formData.get('cb_driver3') as string || '',
        insuranceAgent: formData.get('cb_insuranceAgent') as string || '',
        quotaNumber: formData.get('cb_quotaNumber') as string || '',
        ports: selectedPorts,
        dateHkInsurance: formData.get('cb_dateHkInsurance') as string || '',
        dateReservedPlate: formData.get('cb_dateReservedPlate') as string || '',
        dateBr: formData.get('cb_dateBr') as string || '',
        dateLicenseFee: formData.get('cb_dateLicenseFee') as string || '',
        dateMainlandJqx: formData.get('cb_dateMainlandJqx') as string || '',
        dateMainlandSyx: formData.get('cb_dateMainlandSyx') as string || '',
        dateClosedRoad: formData.get('cb_dateClosedRoad') as string || '',
        dateApproval: formData.get('cb_dateApproval') as string || '',
        dateMainlandLicense: formData.get('cb_dateMainlandLicense') as string || '',
        dateHkInspection: formData.get('cb_dateHkInspection') as string || '',
        tasks: editingVehicle?.crossBorder?.tasks || []
    };

    // 構建主車輛資料物件
    const vData = {
      purchaseType: formData.get('purchaseType'),
      regMark: (formData.get('regMark') as string).toUpperCase(),
      make: formData.get('make'),
      model: formData.get('model'),
      year: formData.get('year'),
      colorExt: formData.get('colorExt'),
      colorInt: formData.get('colorInt'),
      chassisNo: (formData.get('chassisNo') as string).toUpperCase(),
      engineNo: (formData.get('engineNo') as string).toUpperCase(),
      licenseExpiry: formData.get('licenseExpiry') || '',
      price: Number(priceRaw.replace(/,/g, '')),
      costPrice: Number(costPriceRaw.replace(/,/g, '') || 0),
      previousOwners: formData.get('previousOwners') || '', 
      mileage: Number(mileageRaw.replace(/,/g, '') || 0), 
      remarks: formData.get('remarks') || '', 
      seating: Number(formData.get('seating') || 5), 
      priceA1: valA1,
      priceTax: valTax,
      priceRegistered: valRegistered,
      fuelType: fuelType,
      
      // ★★★ 新增：波箱 ★★★
      transmission: transmission,
      
      engineSize: engineSize,
      licenseFee: licenseFee,
      customerName: formData.get('customerName') as string,
      customerPhone: formData.get('customerPhone') as string,
      customerID: formData.get('customerID') as string,
      customerAddress: formData.get('customerAddress') as string,
      status: status,
      stockInDate: formData.get('stockInDate'),
      stockOutDate: status === 'Sold' ? formData.get('stockOutDate') : null, 
      expenses: editingVehicle?.expenses || [], 
      payments: editingVehicle?.payments || [], 
      updatedAt: serverTimestamp(),
      crossBorder: crossBorderData
    };

    try {
      if (editingVehicle && editingVehicle.id) {
        await updateDoc(doc(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'inventory', editingVehicle.id), vData);
        alert('車輛資料已更新');
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'inventory'), {
          ...vData,
          createdAt: serverTimestamp(),
          expenses: [],
          payments: []
        });
        alert('新車輛已入庫');
      }

      // ★★★ 資料連動邏輯：自動建立客戶與司機檔案 ★★★
      
      // 1. 同步客戶資料
      if (vData.customerName) {
          await syncToDatabase({
              name: vData.customerName,
              phone: vData.customerPhone
          }, '客戶');
      }

      // 2. 同步司機資料
      if (crossBorderData.isEnabled) {
          if (crossBorderData.driver1) {
              await syncToDatabase({
                  name: crossBorderData.driver1,
                  plate: crossBorderData.mainlandPlate,
                  quota: crossBorderData.quotaNumber
              }, '司機');
          }
          if (crossBorderData.driver2) await syncToDatabase({ name: crossBorderData.driver2 }, '司機');
          if (crossBorderData.driver3) await syncToDatabase({ name: crossBorderData.driver3 }, '司機');
      }

      setEditingVehicle(null);
      if (activeTab === 'inventory_add') {
          setActiveTab('inventory');
      }
    } catch (e) { alert('儲存失敗'); console.error(e); }
  };

const deleteVehicle = async (id: string) => {
    if (!db || !staffId) return;
    if (confirm('確定刪除？資料將無法復原。')) {
      const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
      await deleteDoc(doc(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'inventory', id));
    }
  };

  // --- Sub-Item Management (FIXED: Updates Local State) ---
  const updateSubItem = async (vehicleId: string, field: 'expenses'|'payments'|'crossBorder', newItems: any) => {
    // ★★★ 修正：使用局部變數 currentDb ★★★
    if (!db || !staffId) return;
    const currentDb = db;

    const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
    const v = inventory.find(v => v.id === vehicleId);
    if (!v) return;

    let updateData: any = {}; // 這裡加了 any 避免類型推斷錯誤
    let newVehicleState = { ...v };

    if (field === 'crossBorder') {
        updateData = { crossBorder: { ...v.crossBorder, tasks: newItems } };
        newVehicleState.crossBorder = { ...v.crossBorder!, tasks: newItems };
    } else {
        updateData = { [field]: newItems };
        newVehicleState[field] = newItems as any; // 強制轉型
    }

    // 使用 currentDb
    await updateDoc(doc(currentDb, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'inventory', vehicleId), updateData);
    
    if (editingVehicle && editingVehicle.id === vehicleId) {
        setEditingVehicle(prev => {
             if (!prev) return null;
             return { ...prev, ...newVehicleState };
        });
    }
  };

  const addPayment = (vehicleId: string, payment: Payment) => {
    const v = inventory.find(v => v.id === vehicleId);
    if (!v) return;
    updateSubItem(vehicleId, 'payments', [...(v.payments || []), payment]);
  };
  const deletePayment = (vehicleId: string, paymentId: string) => {
    const v = inventory.find(v => v.id === vehicleId);
    if (!v) return;
    updateSubItem(vehicleId, 'payments', (v.payments || []).filter(p => p.id !== paymentId));
  };
  const deleteExpense = (vehicleId: string, expenseId: string) => {
    const v = inventory.find(v => v.id === vehicleId);
    if (!v) return;
    updateSubItem(vehicleId, 'expenses', (v.expenses || []).filter(e => e.id !== expenseId));
  };
  const updateExpenseStatus = (vehicleId: string, expenseId: string, status: 'Paid'|'Unpaid') => {
    const v = inventory.find(v => v.id === vehicleId);
    if (!v) return;
    updateSubItem(vehicleId, 'expenses', (v.expenses || []).map(e => e.id===expenseId ? {...e, status} : e));
  };
  const addExpense = (vehicleId: string, expense: Expense) => {
    const v = inventory.find(v => v.id === vehicleId);
    if (!v) return;
    updateSubItem(vehicleId, 'expenses', [...(v.expenses || []), expense]);
  };

  // Cross Border Tasks Management
  const addCbTask = (vehicleId: string, task: CrossBorderTask) => {
      const v = inventory.find(v => v.id === vehicleId);
      if (!v) return;
      const newTasks = [...(v.crossBorder?.tasks || []), task];
      updateSubItem(vehicleId, 'crossBorder', newTasks);
  };

  const updateCbTask = (vehicleId: string, updatedTask: CrossBorderTask) => {
      // ★★★ 修正：確保 db 存在 ★★★
      if (!db || !staffId) return;
      
      const v = inventory.find(v => v.id === vehicleId);
      if (!v) return;
      
      // 注意：這裡我們假設 updateSubItem 已經修正為使用 db 局部變數，
      // 如果 updateSubItem 還沒修正，這裡也要改為直接調用 updateDoc
      // 為了保險起見，我們這裡直接用 updateDoc 來更新 (或者確保 updateSubItem 已修復)
      // 這裡直接使用 updateSubItem 應該沒問題，因為 updateSubItem 內部也有 db 檢查 (但最好也是在那裡修正)
      
      const newTasks = (v.crossBorder?.tasks || []).map(t => t.id === updatedTask.id ? updatedTask : t);
      updateSubItem(vehicleId, 'crossBorder', newTasks);
  };
  
  const deleteCbTask = async (vehicleId: string, taskId: string) => {
      // ★★★ 修正：使用局部變數 currentDb ★★★
      if (!db || !staffId) return;
      const currentDb = db; // 將全域 db 存為局部變數，確保它不是 null
      
      const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
      const v = inventory.find(v => v.id === vehicleId);
      if (!v) return;
      
      const newTasks = (v.crossBorder?.tasks || []).filter(t => t.id !== taskId);
      const newPayments = (v.payments || []).filter(p => p.relatedTaskId !== taskId);

      // 使用 currentDb 替代 db
      await updateDoc(doc(currentDb, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'inventory', vehicleId), {
          crossBorder: { ...v.crossBorder, tasks: newTasks },
          payments: newPayments
      });

      if (editingVehicle && editingVehicle.id === vehicleId) {
          setEditingVehicle(prev => {
              if(!prev) return null;
              return {
                  ...prev,
                  crossBorder: { ...prev.crossBorder!, tasks: newTasks },
                  payments: newPayments
              }
          });
      }
  };

  // Settings 更新配合二級菜單
  const updateSettings = async (key: keyof SystemSettings, newItem: string, action: 'add' | 'remove', parentKey?: string) => {
    if (!db || !staffId) return;
    const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
    let newSettings = { ...settings };

    // 處理 models (parentKey = Make) 或 dbDocTypes (parentKey = Category)
    if ((key === 'models' || key === 'dbDocTypes') && parentKey) {
        // @ts-ignore - 處理動態 key 存取
        const currentList = newSettings[key][parentKey] || [];
        let newList = [...currentList];
        
        if (action === 'add' && newItem && !newList.includes(newItem)) newList.push(newItem);
        else if (action === 'remove') newList = newList.filter((item: string) => item !== newItem);
        
        // @ts-ignore
        newSettings[key] = { ...newSettings[key], [parentKey]: newList };
    } else {
        // 處理一般單層列表
        const list = settings[key] as string[];
        let newList = [...list];
        if (action === 'add' && newItem && !newList.includes(newItem)) {
            newList.push(newItem);
            // 如果新增的是廠牌，同時初始化其型號列表
            if (key === 'makes' && !newSettings.models[newItem]) newSettings.models = { ...newSettings.models, [newItem]: [] };
        } else if (action === 'remove') newList = newList.filter(item => item !== newItem);
        (newSettings[key] as string[]) = newList;
    }
    setSettings(newSettings);
    await setDoc(doc(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'system_config', 'general_settings'), newSettings);
  };

  // --- Sorting & View ---
  const handleSort = (key: keyof Vehicle) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };
 
  // ★★★ 新增：標籤判斷函數 ★★★
  const getCbTags = (ports: string[] = []) => {
    const tags = [];
    if (ports && ports.some(p => PORTS_HK_GD.includes(p))) tags.push({label: '粵港', color: 'bg-blue-100 text-blue-700 border-blue-200'});
    if (ports && ports.some(p => PORTS_MO_GD.includes(p))) tags.push({label: '粵澳', color: 'bg-green-100 text-green-700 border-green-200'});
    return tags;
  };

  const getSortedInventory = () => {
    let sorted = [...inventory];
    if (filterStatus !== 'All') sorted = sorted.filter(v => v.status === filterStatus);
    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        sorted = sorted.filter(v => 
            (v.regMark && v.regMark.toLowerCase().includes(lowerSearch)) ||
            (v.make && v.make.toLowerCase().includes(lowerSearch)) ||
            (v.model && v.model.toLowerCase().includes(lowerSearch)) ||
            (v.chassisNo && v.chassisNo.toLowerCase().includes(lowerSearch))
        );
    }
    if (sortConfig) {
      sorted.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  };

  // --- Dashboard Logic ---
  const dashboardStats = () => {
    let totalStockValue = 0;
    let totalReceivable = 0; 
    let totalPayable = 0; 
    let totalSoldThisMonth = 0;

    inventory.forEach(car => {
      if (car.status === 'In Stock') totalStockValue += car.price || 0;
      (car.expenses || []).forEach(exp => {
        if (exp.status === 'Unpaid') totalPayable += exp.amount || 0;
      });
      if (car.status === 'Sold') {
        const received = (car.payments || []).reduce((acc, p) => acc + (p.amount || 0), 0);
        const balance = (car.price || 0) - received;
        totalReceivable += balance > 0 ? balance : 0;
        totalSoldThisMonth += car.price || 0;
      }
    });

    return { totalStockValue, totalReceivable, totalPayable, totalSoldThisMonth };
  };
  const stats = dashboardStats();

  // --- Cross Border Logic ---
  const crossBorderStats = () => {
      const cbVehicles = inventory.filter(v => v.crossBorder?.isEnabled);
      const today = new Date();
      today.setHours(0,0,0,0);

      let expiredCount = 0;
      let soonCount = 0;

      cbVehicles.forEach(v => {
          const dates = [
              v.crossBorder?.dateHkInsurance,
              v.crossBorder?.dateReservedPlate,
              v.crossBorder?.dateBr,
              v.crossBorder?.dateLicenseFee,
              v.crossBorder?.dateMainlandJqx,
              v.crossBorder?.dateMainlandSyx,
              v.crossBorder?.dateClosedRoad,
              v.crossBorder?.dateApproval,
              v.crossBorder?.dateMainlandLicense,
              v.crossBorder?.dateHkInspection
          ];
          
          let hasExpired = false;
          let hasSoon = false;

          dates.forEach(d => {
              if(d) {
                  const days = getDaysRemaining(d);
                  if (days !== null) {
                      if (days < 0) hasExpired = true;
                      else if (days <= 30) hasSoon = true;
                  }
              }
          });

          if (hasExpired) expiredCount++;
          else if (hasSoon) soonCount++;
      });

      return { total: cbVehicles.length, expired: expiredCount, soon: soonCount };
  };
  const cbStats = crossBorderStats();

  // --- Print Handling ---
  const openPrintPreview = (type: DocType, vehicle: Vehicle, data?: Payment | (Payment | CrossBorderTask)[]) => {
    if (Array.isArray(data)) {
        // 如果傳入的是陣列 (來自新開單模組)
        setPreviewDoc({ type, vehicle, selectedItems: data });
    } else {
        // 如果傳入的是單個物件 (來自舊的按鈕)
        setPreviewDoc({ type, vehicle, payment: data });
    }
    setIsPreviewMode(true);
  };

  // --- Report Logic ---
  const generateReportData = () => {
    let data: any[] = [];
    
    if (reportType === 'receivable') {
        data = inventory.filter(v => {
            const cbFees = (v.crossBorder?.tasks || []).reduce((sum, t) => sum + (t.fee || 0), 0);
            const totalReceivable = (v.price || 0) + cbFees;
            const received = (v.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
            const balance = totalReceivable - received;
            const isRelevantStatus = v.status === 'Sold' || v.status === 'Reserved';
            const refDate = v.stockOutDate || v.stockInDate || ''; 
            
            // Only show if there is a positive balance
            // Include In-Stock items IF they have pending cross-border fees
            const hasPendingCB = cbFees > 0 && balance > 0;
            const showItem = (isRelevantStatus && balance > 0) || hasPendingCB;

            return showItem && 
                   (!reportStartDate || refDate >= reportStartDate) &&
                   (!reportEndDate || refDate <= reportEndDate);
        }).map(v => {
            const cbFees = (v.crossBorder?.tasks || []).reduce((sum, t) => sum + (t.fee || 0), 0);
            const totalReceivable = (v.price || 0) + cbFees;
            const received = (v.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
            return {
                vehicleId: v.id,
                date: v.stockOutDate || 'Unknown',
                title: `${v.year} ${v.make} ${v.model}`,
                regMark: v.regMark,
                amount: totalReceivable - received, 
                status: v.status
            };
        });

    } else if (reportType === 'payable') {
        inventory.forEach(v => {
            (v.expenses || []).forEach(exp => {
                if (exp.status === 'Unpaid' && 
                   (!reportStartDate || exp.date >= reportStartDate) &&
                   (!reportEndDate || exp.date <= reportEndDate) &&
                   (!reportCompany || exp.company === reportCompany)) {
                    data.push({
                        vehicleId: v.id,
                        id: exp.id,
                        date: exp.date,
                        title: `${v.regMark} - ${exp.type}`,
                        company: exp.company,
                        invoiceNo: exp.invoiceNo, 
                        amount: exp.amount,
                        status: 'Unpaid'
                    });
                }
            });
        });
    } else if (reportType === 'sales') {
        data = inventory.filter(v => 
            v.status === 'Sold' &&
            (!reportStartDate || (v.stockOutDate || '') >= reportStartDate) &&
            (!reportEndDate || (v.stockOutDate || '') <= reportEndDate)
        ).map(v => {
            const totalCost = (v.costPrice || 0) + (v.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
            const cbFees = (v.crossBorder?.tasks || []).reduce((sum, t) => sum + (t.fee || 0), 0);
            const totalRevenue = (v.price || 0) + cbFees;
            const profit = totalRevenue - totalCost;
            return {
                vehicleId: v.id,
                date: v.stockOutDate,
                title: `${v.year} ${v.make} ${v.model}`,
                regMark: v.regMark,
                amount: totalRevenue, 
                cost: totalCost,
                profit: profit
            };
        });
    }
    return data;
  };

  const reportData = generateReportData();
  const totalReportAmount = reportData.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalReportProfit = reportType === 'sales' ? reportData.reduce((sum, item) => sum + (item.profit || 0), 0) : 0;

  // --- Sub-Components ---

  // 1. Vehicle Form Modal (Add/Edit)
  const VehicleFormModal = () => {
    if (!editingVehicle && activeTab !== 'inventory_add') return null; 
    const v = editingVehicle || {} as Partial<Vehicle>;
    const isNew = !v.id; 
    const [selectedMake, setSelectedMake] = useState(v.make || '');
    const [isCbExpanded, setIsCbExpanded] = useState(false); // Default collapsed
    const [transmission, setTransmission] = useState<'Automatic'|'Manual'>(v.transmission || 'Automatic');
    
    const [priceStr, setPriceStr] = useState(formatNumberInput(String(v.price || '')));
    const [costStr, setCostStr] = useState(formatNumberInput(String(v.costPrice || '')));
    const [mileageStr, setMileageStr] = useState(formatNumberInput(String(v.mileage || '')));
    const [priceA1Str, setPriceA1Str] = useState(formatNumberInput(String(v.priceA1 || '')));
    const [priceTaxStr, setPriceTaxStr] = useState(formatNumberInput(String(v.priceTax || '')));
    const [fuelType, setFuelType] = useState<'Petrol'|'Diesel'|'Electric'>(v.fuelType || 'Petrol');
    const [engineSizeStr, setEngineSizeStr] = useState(formatNumberInput(String(v.engineSize || '')));
    const [autoLicenseFee, setAutoLicenseFee] = useState(v.licenseFee || 0);

    const cbFees = (v.crossBorder?.tasks || []).reduce((sum, t) => sum + (t.fee || 0), 0);
    const totalRevenue = (v.price || 0) + cbFees;
    const totalReceived = (v.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const balance = totalRevenue - totalReceived; 
    
    //const pendingCbTasks = (v.crossBorder?.tasks || []).filter(t => (t.fee || 0) > 0 && !(v.payments || []).some(p => p.relatedTaskId === t.id));
    const pendingCbTasks = (v.crossBorder?.tasks || []).filter(t => (t.fee !== 0) && !(v.payments || []).some(p => p.relatedTaskId === t.id));


    useEffect(() => {
        const size = Number(engineSizeStr.replace(/,/g, ''));
        const fee = calculateLicenseFee(fuelType, size);
        setAutoLicenseFee(fee);
    }, [fuelType, engineSizeStr]);
    
    const calcRegisteredPrice = () => {
        const a1 = Number(priceA1Str.replace(/,/g, '')) || 0;
        const tax = Number(priceTaxStr.replace(/,/g, '')) || 0;
        return formatNumberInput(String(a1 + tax));
    };

    const [newExpense, setNewExpense] = useState({ date: new Date().toISOString().split('T')[0], type: '', company: '', amount: '', status: 'Unpaid', paymentMethod: 'Cash', invoiceNo: '' });
    const [newPayment, setNewPayment] = useState({ date: new Date().toISOString().split('T')[0], type: 'Deposit', amount: '', method: 'Cash', note: '' });

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b flex justify-between items-center bg-slate-900 text-white rounded-t-lg sticky top-0 z-10">
            <h2 className="text-xl font-bold flex items-center"><Car className="mr-2"/> {isNew ? '車輛入庫 (Stock In)' : '編輯與銷售 (Edit & Sales)'}</h2>
            <button onClick={() => {setEditingVehicle(null); if(activeTab !== 'inventory_add') {} else {setActiveTab('inventory');} }}><X /></button>
          </div>
          <form onSubmit={saveVehicle} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="md:col-span-3 pb-2 border-b flex justify-between items-end">
                <h3 className="font-bold text-gray-500">銷售狀態</h3>
                <div className="flex items-center gap-4 text-sm font-bold">
                     <label className="flex items-center"><input type="radio" name="status" value="In Stock" defaultChecked={v.status !== 'Sold' && v.status !== 'Reserved'} className="mr-1"/> 在庫</label>
                     <label className="flex items-center"><input type="radio" name="status" value="Reserved" defaultChecked={v.status === 'Reserved'} className="mr-1"/> 已訂</label>
                     <label className="flex items-center"><input type="radio" name="status" value="Sold" defaultChecked={v.status === 'Sold'} className="mr-1"/> 已售</label>
                </div>
            </div>

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-yellow-50 p-4 rounded border border-yellow-100">
                <div><label className="block text-xs font-bold text-gray-500">入庫日期</label><input name="stockInDate" type="date" defaultValue={v.stockInDate || new Date().toISOString().split('T')[0]} className="w-full border p-2 rounded bg-white"/></div>
                <div><label className="block text-xs font-bold text-green-700">出庫/成交日期 (Stock Out)</label><input name="stockOutDate" type="date" defaultValue={v.stockOutDate} className="w-full border p-2 rounded border-green-200 bg-white"/></div>
            </div>

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                <div className="md:col-span-2 flex justify-between items-end border-b pb-2 mb-2">
                    <h4 className="text-sm font-bold text-slate-700">客戶資料 (Customer Info)</h4>
                    
                    {/* ★★★ 新增：快速匯入按鈕 ★★★ */}
                    <div className="relative group">
                        <button type="button" className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full flex items-center hover:bg-blue-200">
                            <Database size={12} className="mr-1"/> 從資料庫匯入
                        </button>
                        {/* 簡單的下拉選單實作 (實際專案可用更好的 UI Library) */}
                        <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50 hidden group-hover:block max-h-60 overflow-y-auto">
                            <div className="text-xs text-gray-400 px-2 py-1">搜尋資料庫...</div>
                            {/* 這裡需要存取 dbEntries (需要在 GoldLandAutoDMS 層級傳入或在 Modal 內讀取) */}
                            {/* 為了簡化，這裡假設 dbEntries 已通過 context 或 props 可用，或者在 Modal 內 fetch */}
                            {/* 臨時解決方案：提示用戶手動輸入或在資料庫 Tab 複製 */}
                            <div className="text-xs text-slate-500 p-2 text-center">
                                (功能開發中：請先至資料庫複製資料)
                            </div>
                        </div>
                    </div>
                </div>

                {/* 為了真正的連動，我們需要在 GoldLandAutoDMS 讀取 dbEntries 並傳入 Modal */}
                {/* 這裡先提供搜尋功能的 UI 概念 */}
                
                <div>
                   <label className="text-xs text-gray-500 flex justify-between">
                       客戶姓名 (Name)
                       {/* 這裡可以加一個即時搜尋建議 */}
                   </label>
                   <input name="customerName" defaultValue={v.customerName} className="w-full border p-2 rounded" placeholder="輸入姓名自動搜尋..."/>
                </div>
                <div><label className="text-xs text-gray-500">電話 (Phone)</label><input name="customerPhone" defaultValue={v.customerPhone} className="w-full border p-2 rounded"/></div>
                <div><label className="text-xs text-gray-500">身份證 (HKID)</label><input name="customerID" defaultValue={v.customerID} className="w-full border p-2 rounded"/></div>
                <div><label className="text-xs text-gray-500">地址 (Address)</label><input name="customerAddress" defaultValue={v.customerAddress} className="w-full border p-2 rounded"/></div>
            </div>
            
            {/* 中港車管家模組 (修正：使用 style display 切換顯示) */}
            <div className="md:col-span-3 border-t mt-4 pt-4">
                <div 
                    className="flex items-center justify-between gap-2 mb-4 bg-blue-50 p-2 rounded cursor-pointer hover:bg-blue-100 transition"
                    onClick={() => setIsCbExpanded(!isCbExpanded)}
                >
                    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" id="cb_enable" name="cb_isEnabled" defaultChecked={v.crossBorder?.isEnabled} className="w-5 h-5 mr-2"/>
                        <label htmlFor="cb_enable" className="font-bold text-blue-900 flex items-center cursor-pointer"><Globe className="mr-2"/> 啟用中港車管家模組 (Cross-Border Business)</label>
                    </div>
                    {isCbExpanded ? <ChevronUp size={20} className="text-blue-500"/> : <ChevronDown size={20} className="text-blue-500"/>}
                </div>
                
                <div 
                    className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-blue-50 p-4 rounded border border-blue-100 animate-fade-in"
                    style={{ display: isCbExpanded ? 'grid' : 'none' }}
                >
                    <div className="md:col-span-1"><label className="text-[10px] text-blue-800 font-bold">內地車牌 (Mainland Plate)</label><input name="cb_mainlandPlate" defaultValue={v.crossBorder?.mainlandPlate} placeholder="粵Z..." className="w-full border p-1 rounded text-sm"/></div>
                    <div className="md:col-span-1"><label className="text-[10px] text-blue-800 font-bold">指標號 (Quota No.)</label><input name="cb_quotaNumber" defaultValue={v.crossBorder?.quotaNumber} className="w-full border p-1 rounded text-sm"/></div>
                    <div className="md:col-span-1"><label className="text-[10px] text-blue-800 font-bold">香港公司 (HK Co.)</label><input name="cb_hkCompany" defaultValue={v.crossBorder?.hkCompany} className="w-full border p-1 rounded text-sm" placeholder="從資料庫關聯..."/></div>
                    <div className="md:col-span-1"><label className="text-[10px] text-blue-800 font-bold">內地公司 (CN Co.)</label><input name="cb_mainlandCompany" defaultValue={v.crossBorder?.mainlandCompany} className="w-full border p-1 rounded text-sm"/></div>
                    <div className="md:col-span-1"><label className="text-[10px] text-blue-800 font-bold">保險代理 (Agent)</label><input name="cb_insuranceAgent" defaultValue={v.crossBorder?.insuranceAgent} className="w-full border p-1 rounded text-sm"/></div>
                    <div className="md:col-span-1"></div>

                    {/* 司機資訊 */}
                    <div className="md:col-span-1"><label className="text-[10px] text-blue-800 font-bold">主司機 (Main Driver)</label><input name="cb_driver1" defaultValue={v.crossBorder?.driver1} className="w-full border p-1 rounded text-sm"/></div>
                    <div className="md:col-span-1"><label className="text-[10px] text-blue-800 font-bold">副司機 1 (Driver 2)</label><input name="cb_driver2" defaultValue={v.crossBorder?.driver2} className="w-full border p-1 rounded text-sm"/></div>
                    <div className="md:col-span-1"><label className="text-[10px] text-blue-800 font-bold">副司機 2 (Driver 3)</label><input name="cb_driver3" defaultValue={v.crossBorder?.driver3} className="w-full border p-1 rounded text-sm"/></div>
                    
                    {/* 口岸選擇 (多選) */}
                    <div className="md:col-span-4 border-t border-blue-200 mt-2 pt-2">
                      <label className="text-[10px] text-blue-800 font-bold block mb-1">粵港口岸 (HK-GD Ports)</label>
                      <div className="flex flex-wrap gap-3">
                        {PORTS_HK_GD.map(port => (
                            <label key={port} className="flex items-center text-xs text-gray-700 bg-white px-2 py-1 rounded border border-gray-300">
                                <input 
                                    type="checkbox" 
                                    name={`cb_port_${port}`} 
                                    defaultChecked={v.crossBorder?.ports?.includes(port)} 
                                    className="mr-1 w-3 h-3"
                                />
                                {port}
                            </label>
                        ))}
                      </div>
                    
                      <label className="text-[10px] text-blue-800 font-bold block mb-1 mt-2">粵澳口岸 (MO-GD Ports)</label>
                      <div className="flex flex-wrap gap-3">
                        {PORTS_MO_GD.map(port => (
                            <label key={port} className="flex items-center text-xs text-gray-700 bg-white px-2 py-1 rounded border border-gray-300">
                                <input 
                                    type="checkbox" 
                                    name={`cb_port_${port}`} 
                                    defaultChecked={v.crossBorder?.ports?.includes(port)} 
                                    className="mr-1 w-3 h-3"
                                />
                                {port}
                            </label>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-4 border-t border-blue-200 my-2"></div>

                    {/* 10 項提醒日期 */}
                    <div><label className="text-[10px] text-gray-500">香港保險到期 (HK Ins)</label><input type="date" name="cb_dateHkInsurance" defaultValue={v.crossBorder?.dateHkInsurance} className="w-full border p-1 rounded text-sm"/></div>
                    <div><label className="text-[10px] text-gray-500">留牌紙到期 (Reserved Plate)</label><input type="date" name="cb_dateReservedPlate" defaultValue={v.crossBorder?.dateReservedPlate} className="w-full border p-1 rounded text-sm"/></div>
                    <div><label className="text-[10px] text-gray-500">商業登記到期 (BR)</label><input type="date" name="cb_dateBr" defaultValue={v.crossBorder?.dateBr} className="w-full border p-1 rounded text-sm"/></div>
                    <div><label className="text-[10px] text-gray-500">牌照費到期 (License Fee)</label><input type="date" name="cb_dateLicenseFee" defaultValue={v.crossBorder?.dateLicenseFee} className="w-full border p-1 rounded text-sm"/></div>

                    <div><label className="text-[10px] text-gray-500">內地交強險到期 (CN JQX)</label><input type="date" name="cb_dateMainlandJqx" defaultValue={v.crossBorder?.dateMainlandJqx} className="w-full border p-1 rounded text-sm"/></div>
                    <div><label className="text-[10px] text-gray-500">內地商業險到期 (CN SYX)</label><input type="date" name="cb_dateMainlandSyx" defaultValue={v.crossBorder?.dateMainlandSyx} className="w-full border p-1 rounded text-sm"/></div>
                    <div><label className="text-[10px] text-gray-500">禁區紙到期 (Closed Road)</label><input type="date" name="cb_dateClosedRoad" defaultValue={v.crossBorder?.dateClosedRoad} className="w-full border p-1 rounded text-sm"/></div>
                    <div><label className="text-[10px] text-gray-500">批文卡到期 (Approval)</label><input type="date" name="cb_dateApproval" defaultValue={v.crossBorder?.dateApproval} className="w-full border p-1 rounded text-sm"/></div>

                    <div><label className="text-[10px] text-gray-500">內地驗車(行駛證)到期 (CN Lic)</label><input type="date" name="cb_dateMainlandLicense" defaultValue={v.crossBorder?.dateMainlandLicense} className="w-full border p-1 rounded text-sm"/></div>
                    <div><label className="text-[10px] text-gray-500">香港驗車日期 (HK Insp)</label><input type="date" name="cb_dateHkInspection" defaultValue={v.crossBorder?.dateHkInspection} className="w-full border p-1 rounded text-sm"/></div>
                </div>
            </div>

            <div className="md:col-span-3 border-t my-2 pt-2"><h3 className="font-bold text-gray-500 mb-2">車輛資料</h3></div>
            <div><label className="block text-xs font-bold text-gray-500">收購類型</label><select name="purchaseType" defaultValue={v.purchaseType || 'Used'} className="w-full border p-2 rounded bg-gray-50"><option value="Used">二手收購 (Used)</option><option value="New">訂購新車 (New)</option><option value="Consignment">寄賣 (Consignment)</option></select></div>
            <div><label className="block text-xs font-bold text-gray-500">車牌 (Reg. Mark)</label><input name="regMark" defaultValue={v.regMark} placeholder="未出牌可留空" className="w-full border p-2 rounded"/></div>
            <div><label className="block text-xs font-bold text-gray-500">牌費到期日 (一般)</label><input name="licenseExpiry" type="date" defaultValue={v.licenseExpiry} className="w-full border p-2 rounded"/></div>
            <div><label className="block text-xs font-bold text-gray-500">廠牌 (Make)</label><select name="make" value={selectedMake} onChange={(e) => setSelectedMake(e.target.value)} required className="w-full border p-2 rounded"><option value="">請選擇...</option>{settings.makes.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            <div><label className="block text-xs font-bold text-gray-500">型號 (Model)</label><input list="model_list" name="model" defaultValue={v.model} required className="w-full border p-2 rounded" placeholder={selectedMake ? `選擇 ${selectedMake} 型號...` : '請先選擇廠牌'}/><datalist id="model_list">{(settings.models[selectedMake] || []).map(m => <option key={m} value={m} />)}</datalist></div>
            <div><label className="block text-xs font-bold text-gray-500">年份 (Year)</label><input name="year" type="number" defaultValue={v.year} required className="w-full border p-2 rounded"/></div>
            <div><label className="block text-xs font-bold text-gray-500">外觀顏色</label><input list="colors" name="colorExt" defaultValue={v.colorExt} className="w-full border p-2 rounded"/><datalist id="colors">{settings.colors.map(c => <option key={c} value={c} />)}</datalist></div>
            <div><label className="block text-xs font-bold text-gray-500">內飾顏色</label><input list="colors" name="colorInt" defaultValue={v.colorInt} className="w-full border p-2 rounded"/></div>
            
            <div className="md:col-span-3 bg-slate-50 p-2 rounded border mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-xs font-bold text-gray-500">燃料 (Fuel Type)</label><select name="fuelType" value={fuelType} onChange={(e) => setFuelType(e.target.value as any)} className="w-full border p-2 rounded"><option value="Petrol">汽油 (Petrol)</option><option value="Diesel">柴油 (Diesel)</option><option value="Electric">電動 (Electric)</option></select></div>
                <div>
                    <label className="block text-xs font-bold text-gray-500">波箱 (Transmission)</label>
                    <select name="transmission" value={transmission} onChange={(e) => setTransmission(e.target.value as any)} className="w-full border p-2 rounded">
                        <option value="Automatic">自動波 (Automatic)</option>
                        <option value="Manual">棍波 (Manual)</option>
                    </select>
                </div>
                <div><label className="block text-xs font-bold text-gray-500">動力 ({fuelType === 'Electric' ? 'KW' : 'cc'})</label><input name="engineSize" type="text" value={engineSizeStr} onChange={(e) => setEngineSizeStr(formatNumberInput(e.target.value))} className="w-full border p-2 rounded font-mono" placeholder="0"/></div>
                <div><label className="block text-xs font-bold text-gray-500">預計每年牌費</label><div className="w-full border p-2 rounded bg-gray-100 font-bold text-blue-700">{formatCurrency(autoLicenseFee)}</div></div>
            </div>

            <div className="md:col-span-3 grid grid-cols-3 gap-4">
               <div><label className="block text-xs font-bold text-gray-500">首數</label><input name="previousOwners" defaultValue={v.previousOwners} placeholder="e.g. 0" className="w-full border p-2 rounded"/></div>
               <div><label className="block text-xs font-bold text-gray-500">里程 (km)</label><input name="mileage" type="text" value={mileageStr} onChange={(e) => setMileageStr(formatNumberInput(e.target.value))} className="w-full border p-2 rounded" placeholder="0"/></div>
               <div><label className="block text-xs font-bold text-gray-500">座位</label><input name="seating" type="number" defaultValue={v.seating || 5} className="w-full border p-2 rounded"/></div>
            </div>
            <div className="md:col-span-3"><label className="block text-xs font-bold text-gray-500">備註</label><textarea name="remarks" defaultValue={v.remarks} className="w-full border p-2 rounded h-20 text-sm" placeholder="輸入備註..."/></div>
            
            <div className="md:col-span-3 grid grid-cols-2 gap-4">
               <div><label className="block text-xs font-bold text-gray-500">底盤號</label><input name="chassisNo" defaultValue={v.chassisNo} className="w-full border p-2 rounded font-mono"/></div>
               <div><label className="block text-xs font-bold text-gray-500">引擎號</label><input name="engineNo" defaultValue={v.engineNo} className="w-full border p-2 rounded font-mono"/></div>
            </div>

            <div className="md:col-span-3 pb-2 border-b mt-4"><h3 className="font-bold text-gray-500">價格設定</h3></div>
            <div><label className="block text-xs font-bold text-gray-500">入貨成本</label><input name="costPrice" type="text" value={costStr} onChange={(e) => setCostStr(formatNumberInput(e.target.value))} className="w-full border p-2 pl-6 rounded font-mono" placeholder="0"/></div>
            <div><label className="block text-xs font-bold text-gray-500">預計售價</label><input name="price" type="text" value={priceStr} onChange={(e) => setPriceStr(formatNumberInput(e.target.value))} required className="w-full border p-2 pl-6 rounded font-bold text-lg font-mono" placeholder="0"/></div>
            <div>
               <div className="flex gap-2">
                 <div className="flex-1"><label className="text-[10px]">A1 價</label><input name="priceA1" type="text" value={priceA1Str} onChange={(e) => setPriceA1Str(formatNumberInput(e.target.value))} className="w-full border p-1 rounded"/></div>
                 <div className="flex-1"><label className="text-[10px]">入口稅</label><input name="priceTax" type="text" value={priceTaxStr} onChange={(e) => setPriceTaxStr(formatNumberInput(e.target.value))} className="w-full border p-1 rounded"/></div>
               </div>
               <div className="text-right text-xs text-blue-800 mt-1">牌簿價: {calcRegisteredPrice()}</div>
            </div>

            {/* 交易管理 (更新：整合中港待收款) */}
            {editingVehicle && (
              <div className="md:col-span-3 mt-6 bg-blue-50 p-4 rounded border border-blue-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold flex items-center text-blue-900"><DollarSign size={16} className="mr-2"/> 銷售與收款記錄 (Payments)</h3>
                    <div className="text-right text-sm">
                        <span className="mr-4 text-gray-600">總價 (含代辦費): <strong>{formatCurrency(totalRevenue)}</strong></span>
                        <span className="mr-4 text-green-600">已收: <strong>{formatCurrency(totalReceived)}</strong></span>
                        <span className={`font-bold ${balance > 0 ? 'text-red-500' : 'text-gray-400'}`}>餘額: {formatCurrency(balance)}</span>
                    </div>
                </div>

                <div className="flex gap-2 mb-4">
                    <button type="button" onClick={() => openPrintPreview('sales_contract', v as Vehicle)} className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded text-xs hover:bg-blue-50 flex items-center"><FileText size={12} className="mr-1"/> 買賣合約</button>
                    <button type="button" onClick={() => openPrintPreview('invoice', v as Vehicle)} className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded text-xs hover:bg-blue-50 flex items-center"><FileText size={12} className="mr-1"/> 發票</button>
                </div>

                <table className="w-full text-sm bg-white border mb-4">
                  <thead><tr className="bg-blue-100 text-left"><th className="p-2">日期</th><th className="p-2">類型</th><th className="p-2">方式</th><th className="p-2">金額</th><th className="p-2">備注</th><th className="p-2">操作</th></tr></thead>
                  <tbody>
                    {/* 已收款項 */}
                    {(v.payments || []).map(pay => (
                      <tr key={pay.id} className="border-t">
                        <td className="p-2">{pay.date}</td><td className="p-2">{pay.type}</td><td className="p-2">{pay.method}</td><td className="p-2 font-mono font-bold">{formatCurrency(pay.amount)}</td><td className="p-2 text-gray-500 text-xs">{pay.note}</td>
                        <td className="p-2 flex gap-2">
                             <button type="button" onClick={() => openPrintPreview('receipt', v as Vehicle, pay)} className="text-blue-500 hover:text-blue-700 flex items-center text-xs"><Printer size={12} className="mr-1"/> 收據</button>
                             {/* 若是中港相關付款，建議不要在此刪除，防止狀態不同步 */}
                             {!pay.relatedTaskId && <button type="button" onClick={() => deletePayment(v.id!, pay.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>}
                        </td>
                      </tr>
                    ))}
                    {/* 中港待收款項 (預覽) */}
                    {pendingCbTasks.map(task => (
                        <tr key={`pending-${task.id}`} className="border-t bg-amber-50">
                            <td className="p-2 text-amber-700">{task.date}</td>
                            <td className="p-2 text-amber-700">中港待收</td>
                            <td className="p-2 text-gray-400">-</td>
                            <td className="p-2 font-mono font-bold text-amber-600">{task.currency} {task.fee}</td>
                            <td className="p-2 text-gray-500 text-xs">{task.item} - 請至中港模組收款</td>
                            <td className="p-2 flex gap-2">
                                <button type="button" disabled className="text-gray-400 cursor-not-allowed flex items-center text-xs"><Info size={12} className="mr-1"/> 待處理</button>
                            </td>
                        </tr>
                    ))}
                    {(!v.payments?.length && !pendingCbTasks.length) && <tr><td colSpan={6} className="p-4 text-center text-gray-400">暫無收款記錄</td></tr>}
                  </tbody>
                </table>

                <div className="grid grid-cols-6 gap-2 items-end bg-blue-100 p-2 rounded">
                   <div className="col-span-1"><label className="text-[10px]">日期</label><input type="date" value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} className="w-full border p-1 rounded text-xs"/></div>
                   <div className="col-span-1"><label className="text-[10px]">類型</label><select value={newPayment.type} onChange={e => setNewPayment({...newPayment, type: e.target.value as any})} className="w-full border p-1 rounded text-xs"><option>Deposit</option><option>Part Payment</option><option>Balance</option><option>Full Payment</option></select></div>
                   <div className="col-span-1"><label className="text-[10px]">方式</label><select value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value as any})} className="w-full border p-1 rounded text-xs"><option>Cash</option><option>Cheque</option><option>Transfer</option></select></div>
                   <div className="col-span-1"><label className="text-[10px]">金額</label><input type="text" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: formatNumberInput(e.target.value)})} className="w-full border p-1 rounded text-xs" placeholder="0"/></div>
                   <div className="col-span-1"><label className="text-[10px]">備注</label><input type="text" value={newPayment.note} onChange={e => setNewPayment({...newPayment, note: e.target.value})} className="w-full border p-1 rounded text-xs" placeholder="支票號/備注"/></div>
                   <div className="col-span-1"><button type="button" onClick={(e) => {e.preventDefault(); const amount = Number(newPayment.amount.replace(/,/g, '')); if(amount > 0) { addPayment(v.id!, { id: Date.now().toString(), ...newPayment, amount } as Payment); setNewPayment({...newPayment, amount: '', note: ''}); }}} className="w-full bg-blue-600 text-white p-1 rounded text-xs h-[26px]">新增收款</button></div>
                </div>
              </div>
            )}

            {/* 費用管理 */}
            {isNew ? null : (
              <div className="md:col-span-3 mt-6 bg-gray-50 p-4 rounded border">
                <h3 className="font-bold flex items-center mb-4"><Wrench size={16} className="mr-2"/> 處理費用記錄</h3>
                <table className="w-full text-sm bg-white border mb-4">
                  <thead><tr className="bg-gray-100 text-left"><th className="p-2">日期</th><th className="p-2">項目</th><th className="p-2">單號</th><th className="p-2">負責公司</th><th className="p-2">金額</th><th className="p-2">狀態</th><th className="p-2">操作</th></tr></thead>
                  <tbody>
                    {(v.expenses || []).map(exp => (
                      <tr key={exp.id} className="border-t">
                        <td className="p-2">{exp.date}</td><td className="p-2">{exp.type}</td><td className="p-2 text-gray-500">{exp.invoiceNo}</td><td className="p-2 text-gray-500">{exp.company}</td><td className="p-2">{formatCurrency(exp.amount)}</td>
                        <td className="p-2"><select value={exp.status} onChange={(e) => updateExpenseStatus(v.id!, exp.id, e.target.value as any)} className={`text-xs border rounded ${exp.status==='Paid'?'bg-green-100':'bg-red-100'}`}><option value="Unpaid">未付</option><option value="Paid">已付</option></select></td>
                        <td className="p-2"><button type="button" onClick={() => deleteExpense(v.id!, exp.id)} className="text-red-500"><X size={14}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="bg-gray-50 font-bold border-t"><td colSpan={4} className="p-2 text-right">總成本 (車價+費用):</td><td colSpan={3} className="p-2 text-blue-600">{formatCurrency((v.costPrice || 0) + (v.expenses || []).reduce((acc, cur) => acc + cur.amount, 0))}</td></tr></tfoot>
                </table>
                <div className="grid grid-cols-7 gap-2 items-end bg-gray-100 p-2 rounded">
                  <div className="col-span-1"><label className="text-[10px]">日期</label><input type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full border p-1 rounded text-xs"/></div>
                  <div className="col-span-1"><label className="text-[10px]">項目</label><select value={newExpense.type} onChange={e => setNewExpense({...newExpense, type: e.target.value})} className="w-full border p-1 rounded text-xs"><option value="">選...</option>{settings.expenseTypes.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                  <div className="col-span-1"><label className="text-[10px]">公司</label><select value={newExpense.company} onChange={e => setNewExpense({...newExpense, company: e.target.value})} className="w-full border p-1 rounded text-xs"><option value="">選...</option>{settings.expenseCompanies?.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                  <div className="col-span-1"><label className="text-[10px]">單號</label><input value={newExpense.invoiceNo} onChange={e => setNewExpense({...newExpense, invoiceNo: e.target.value})} className="w-full border p-1 rounded text-xs"/></div>
                  <div className="col-span-1"><label className="text-[10px]">金額</label><input value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: formatNumberInput(e.target.value)})} className="w-full border p-1 rounded text-xs"/></div>
                  <div className="col-span-1"><label className="text-[10px]">狀態</label><select value={newExpense.status} onChange={e => setNewExpense({...newExpense, status: e.target.value as any})} className="w-full border p-1 rounded text-xs"><option value="Unpaid">未付</option><option value="Paid">已付</option></select></div>
                  <div className="col-span-1"><button type="button" onClick={(e) => {e.preventDefault(); const amt=Number(newExpense.amount.replace(/,/g,'')); if(amt>0){addExpense(v.id!, {id:Date.now().toString(), ...newExpense, amount:amt} as any); setNewExpense({...newExpense, amount:''});}}} className="w-full bg-slate-600 text-white p-1 rounded text-xs h-[26px]">新增</button></div>
                </div>
              </div>
            )}

            <div className="md:col-span-3 flex justify-end gap-4 mt-4 pt-4 border-t sticky bottom-0 bg-white p-4 z-10 border-gray-200">
              <button type="button" onClick={() => {setEditingVehicle(null); if(activeTab !== 'inventory_add') {} else {setActiveTab('inventory');} }} className="px-6 py-2 border rounded hover:bg-gray-50">取消</button>
              <button type="submit" className="px-6 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400">儲存資料</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // 2. Report View (Linked to Edit)
  const ReportView = () => {
    const handleReportItemClick = (vehicleId: string) => {
        const vehicle = inventory.find(v => v.id === vehicleId);
        if (vehicle) {
            setEditingVehicle(vehicle);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-sm min-h-screen">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <h2 className="text-xl font-bold flex items-center"><FileBarChart className="mr-2"/> 統計報表中心</h2>
                <div className="flex space-x-2">
                    <button onClick={handlePrint} className="bg-slate-900 text-white px-4 py-2 rounded flex items-center hover:bg-slate-700"><Printer size={16} className="mr-2"/> 輸出 PDF</button>
                    <button onClick={() => setActiveTab('dashboard')} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">返回</button>
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded border mb-6 print:hidden grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">報表類型</label>
                    <select value={reportType} onChange={e => setReportType(e.target.value as any)} className="w-full border p-2 rounded">
                        <option value="receivable">應收未收報表 (Receivables)</option>
                        <option value="payable">應付未付報表 (Payables)</option>
                        <option value="sales">銷售數據統計 (Sales Stats)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">開始日期</label>
                    <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className="w-full border p-2 rounded" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">結束日期</label>
                    <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="w-full border p-2 rounded" />
                </div>
                {reportType === 'payable' && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">負責公司 (供應商)</label>
                        <select value={reportCompany} onChange={e => setReportCompany(e.target.value)} className="w-full border p-2 rounded">
                            <option value="">全部公司</option>
                            {settings.expenseCompanies?.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                )}
            </div>

            <div className="print:visible">
                <div className="text-center mb-8 hidden print:block">
                    <h1 className="text-2xl font-bold mb-2">{COMPANY_INFO.name_en} - {COMPANY_INFO.name_ch}</h1>
                    <h2 className="text-xl font-bold border-b-2 border-black inline-block pb-1 mb-2">
                        {reportType === 'receivable' ? '應收未收報表 (Accounts Receivable)' : 
                         reportType === 'payable' ? '應付未付報表 (Accounts Payable)' : 
                         '銷售數據統計 (Sales Report)'}
                    </h2>
                    <p className="text-sm text-gray-600">Period: {reportStartDate} to {reportEndDate}</p>
                </div>

                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-100 border-b-2 border-black text-left">
                            <th className="p-2 border">日期</th>
                            <th className="p-2 border">項目 / 車輛</th>
                            <th className="p-2 border">詳情 / 車牌</th>
                            {reportType === 'payable' && <th className="p-2 border">負責公司</th>}
                            {reportType === 'payable' && <th className="p-2 border">單號</th>}
                            {reportType === 'sales' && <th className="p-2 border">成本 (Cost)</th>}
                            <th className="p-2 border text-right">金額 (Amount)</th>
                            {reportType === 'sales' && <th className="p-2 border text-right">利潤 (Profit)</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.map((item, idx) => (
                            <tr 
                                key={idx} 
                                className="border-b hover:bg-yellow-50 cursor-pointer print:cursor-auto print:hover:bg-transparent"
                                onClick={() => handleReportItemClick(item.vehicleId)}
                                title="點擊編輯此車輛費用"
                            >
                                <td className="p-2 border">{item.date}</td>
                                <td className="p-2 border font-bold flex items-center">{item.title} <ExternalLink size={10} className="ml-2 text-gray-400 print:hidden"/></td>
                                <td className="p-2 border">{item.regMark}</td>
                                {reportType === 'payable' && <td className="p-2 border">{item.company}</td>}
                                {reportType === 'payable' && <td className="p-2 border">{item.invoiceNo || '-'}</td>}
                                {reportType === 'sales' && <td className="p-2 border">{formatCurrency(item.cost)}</td>}
                                <td className="p-2 border text-right font-mono">{formatCurrency(item.amount)}</td>
                                {reportType === 'sales' && <td className={`p-2 border text-right font-mono font-bold ${item.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(item.profit)}</td>}
                            </tr>
                        ))}
                        {reportData.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-gray-400">無符合條件的數據</td></tr>}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-200 font-bold">
                            <td colSpan={reportType === 'payable' ? 5 : 3} className="p-2 border text-right">Total:</td>
                            {reportType === 'sales' && <td className="p-2 border"></td>}
                            <td className="p-2 border text-right">{formatCurrency(totalReportAmount)}</td>
                            {reportType === 'sales' && <td className="p-2 border text-right">{formatCurrency(totalReportProfit)}</td>}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
  };

  // 2. Cross Border View (中港車管家 - 完整修復版：含智慧排序、搜尋、卡片與完整統計)
  const CrossBorderView = () => {
      // 搜尋狀態
      const [cbSearchTerm, setCbSearchTerm] = useState('');

      // 篩選與排序
      const cbVehicles = inventory
        .filter(v => v.crossBorder?.isEnabled)
        .filter(v => {
            if (!cbSearchTerm) return true;
            const term = cbSearchTerm.toLowerCase();
            return (
                v.regMark.toLowerCase().includes(term) ||
                (v.crossBorder?.mainlandPlate || '').toLowerCase().includes(term) ||
                (v.crossBorder?.driver1 || '').toLowerCase().includes(term) ||
                (v.crossBorder?.quotaNumber || '').includes(term)
            );
        })
        .sort((a, b) => {
            const getMinDays = (v: Vehicle) => {
                const dates = [
                    v.crossBorder?.dateHkInsurance, v.crossBorder?.dateReservedPlate, v.crossBorder?.dateBr,
                    v.crossBorder?.dateLicenseFee, v.crossBorder?.dateMainlandJqx, v.crossBorder?.dateMainlandSyx,
                    v.crossBorder?.dateClosedRoad, v.crossBorder?.dateApproval, v.crossBorder?.dateMainlandLicense,
                    v.crossBorder?.dateHkInspection
                ];
                let minDays = 9999; 
                let hasValidDate = false;
                dates.forEach(d => {
                    if (d) {
                        const days = getDaysRemaining(d);
                        if (days !== null) {
                            if (days < minDays) minDays = days;
                            hasValidDate = true;
                        }
                    }
                });
                return hasValidDate ? minDays : 9999;
            };
            return getMinDays(a) - getMinDays(b);
        });

      const activeVehicle = activeCbVehicleId ? inventory.find(v => v.id === activeCbVehicleId) : null;
      
      // 完整的統計邏輯 (恢復)
      const calculateStats = () => {
          let expired = 0, soon = 0;
          cbVehicles.forEach(v => {
              const dates = [
                  v.crossBorder?.dateHkInsurance, v.crossBorder?.dateReservedPlate, v.crossBorder?.dateBr,
                  v.crossBorder?.dateLicenseFee, v.crossBorder?.dateMainlandJqx, v.crossBorder?.dateMainlandSyx,
                  v.crossBorder?.dateClosedRoad, v.crossBorder?.dateApproval, v.crossBorder?.dateMainlandLicense,
                  v.crossBorder?.dateHkInspection
              ];
              let hasE = false, hasS = false;
              dates.forEach(d => {
                  if(d) {
                      const days = getDaysRemaining(d);
                      if (days !== null) {
                          if (days < 0) hasE = true;
                          else if (days <= 30) hasS = true;
                      }
                  }
              });
              if (hasE) expired++; else if (hasS) soon++;
          });
          return { total: cbVehicles.length, expired, soon };
      };
      
      const stats = calculateStats();
      const totalFees = activeVehicle?.crossBorder?.tasks?.reduce((sum, task) => sum + (task.fee || 0), 0) || 0;
      
      // 金額輸入狀態
      const [feeStr, setFeeStr] = useState(''); 
      
      const [newTask, setNewTask] = useState<Partial<CrossBorderTask>>({
          date: new Date().toISOString().split('T')[0],
          item: '', institution: '', handler: '', days: '', fee: 0, currency: 'HKD', note: ''
      });
      const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
      const [paymentModalTask, setPaymentModalTask] = useState<CrossBorderTask | null>(null);
      const [quickPayMethod, setQuickPayMethod] = useState<'Cash'|'Cheque'|'Transfer'>('Cash');

      // 項目連動預設值
      const handleItemChange = (itemName: string) => {
          const config = settings.cbItems.find((i: any) => (typeof i === 'string' ? i === itemName : i.name === itemName));
          let updates: any = { item: itemName };
          if (config && typeof config !== 'string') {
              updates.institution = config.defaultInst || '';
              updates.days = config.defaultDays || '';
              updates.fee = config.defaultFee || 0;
              setFeeStr(config.defaultFee ? formatNumberInput(config.defaultFee.toString()) : ''); 
          }
          setNewTask(prev => ({ ...prev, ...updates }));
      };

      const handleFeeChange = (val: string) => {
          const formatted = formatNumberInput(val);
          setFeeStr(formatted);
          const numVal = Number(formatted.replace(/,/g, ''));
          setNewTask(prev => ({ ...prev, fee: isNaN(numVal) ? 0 : numVal }));
      };

      const handleAddTask = () => {
          if (!activeCbVehicleId || !newTask.item) return;
          const task: CrossBorderTask = {
              id: Date.now().toString(),
              date: newTask.date || '',
              item: newTask.item || '',
              institution: newTask.institution || '',
              handler: newTask.handler || '',
              days: newTask.days || '',
              fee: Number(feeStr.replace(/,/g, '')) || 0,
              currency: (newTask.currency as any) || 'HKD',
              note: newTask.note || '',
              isPaid: false
          };
          addCbTask(activeCbVehicleId, task);
          setNewTask({ ...newTask, fee: 0, note: '', item: '', institution: '', days: '' });
          setFeeStr('');
      };

      const handleUpdateTask = () => { updateCbTask(activeCbVehicleId!, { ...newTask, id: editingTaskId!, fee: Number(feeStr.replace(/,/g, '')) } as any); setEditingTaskId(null); setNewTask({fee:0, note:''}); setFeeStr(''); };
      const handleEditClick = (task: CrossBorderTask) => { setEditingTaskId(task.id); setNewTask({ ...task }); setFeeStr(formatNumberInput(task.fee.toString())); };
      
      const handleQuickPay = () => {
          if (!activeCbVehicleId || !paymentModalTask) return;
          const newPayment: Payment = {
              id: `CB-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'Service Fee',
              amount: paymentModalTask.fee, method: quickPayMethod, note: `代辦費用: ${paymentModalTask.item}`, relatedTaskId: paymentModalTask.id
          };
          addPayment(activeCbVehicleId, newPayment);
          setPaymentModalTask(null);
      };

      const renderCard = (label: string, value: number, color: string) => ( <div className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${color}`}><p className="text-xs text-gray-500 uppercase">{label}</p><p className="text-2xl font-bold text-slate-800">{value}</p></div> );

      return (
          <div className="flex flex-col h-full space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-center flex-none gap-4">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center"><Globe className="mr-2"/> 中港車管家</h2>
                  {/* 搜尋框 */}
                  <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                      <input 
                        className="w-full pl-9 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
                        placeholder="搜尋車牌、司機、指標..."
                        value={cbSearchTerm}
                        onChange={e => setCbSearchTerm(e.target.value)}
                      />
                  </div>
                  {/* 卡片 (恢復) */}
                  <div className="flex gap-2">
                      {renderCard("總車輛", stats.total, "border-blue-500")}
                      {renderCard("已過期", stats.expired, "border-red-500")}
                      {renderCard("即將到期", stats.soon, "border-yellow-500")}
                  </div>
              </div>

              {/* 列表 Table */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden flex-none max-h-[40vh] flex flex-col border">
                  <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left text-sm whitespace-nowrap relative">
                        <thead className="bg-slate-50 border-b sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-3">香港車牌</th>
                                <th className="p-3">內地車牌</th>
                                <th className="p-3 bg-yellow-50 text-yellow-800 border-x border-yellow-100">指標號</th>
                                <th className="p-3">主司機</th>
                                <th className="p-3">香港保險</th>
                                <th className="p-3">留牌紙</th>
                                <th className="p-3">商業登記</th>
                                <th className="p-3">牌照費</th>
                                <th className="p-3">內地交強險</th>
                                <th className="p-3">內地商業險</th>
                                <th className="p-3">禁區紙</th>
                                <th className="p-3">批文卡</th>
                                <th className="p-3">行駛證</th>
                                <th className="p-3">香港驗車</th>
                                <th className="p-3">操作</th>
                            </tr>
                        </thead>
                          <tbody>
                              {cbVehicles.map(v => (
                                  <tr key={v.id} className={`border-b cursor-pointer transition ${activeCbVehicleId === v.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`} onClick={() => setActiveCbVehicleId(v.id)}>
                                      <td className="p-3 font-bold">{v.regMark}</td>
                                      <td className="p-3 text-blue-600">{v.crossBorder?.mainlandPlate || '-'}</td>
                                      <td className="p-3 text-yellow-700 font-mono font-bold bg-yellow-50/50 border-x border-yellow-100">{v.crossBorder?.quotaNumber || '-'}</td>
                                      <td className="p-3 text-gray-600">{v.crossBorder?.driver1 || '-'}</td>
                                      
                                      <td className="p-3"><DateStatusBadge date={v.crossBorder?.dateHkInsurance} label="香港保險"/></td>
                                      <td className="p-3"><DateStatusBadge date={v.crossBorder?.dateReservedPlate} label="留牌紙"/></td>
                                      <td className="p-3"><DateStatusBadge date={v.crossBorder?.dateBr} label="商業登記"/></td>
                                      <td className="p-3"><DateStatusBadge date={v.crossBorder?.dateLicenseFee} label="牌照費"/></td>
                                      <td className="p-3"><DateStatusBadge date={v.crossBorder?.dateMainlandJqx} label="交強險"/></td>
                                      <td className="p-3"><DateStatusBadge date={v.crossBorder?.dateMainlandSyx} label="商業險"/></td>
                                      <td className="p-3"><DateStatusBadge date={v.crossBorder?.dateClosedRoad} label="禁區紙"/></td>
                                      <td className="p-3"><DateStatusBadge date={v.crossBorder?.dateApproval} label="批文卡"/></td>
                                      <td className="p-3"><DateStatusBadge date={v.crossBorder?.dateMainlandLicense} label="行駛證"/></td>
                                      <td className="p-3"><DateStatusBadge date={v.crossBorder?.dateHkInspection} label="香港驗車"/></td>
                                      
                                      <td className="p-3"><button onClick={(e) => { e.stopPropagation(); setEditingVehicle(v); }} className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"><Edit size={14}/></button></td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>

              {/* 底部表單區 */}
              <div className="bg-white rounded-lg shadow-sm p-4 flex-1 flex flex-col min-h-0 border overflow-hidden">
                  <div className="flex justify-between items-center mb-4 flex-none border-b pb-2">
                      <h3 className="font-bold flex items-center text-slate-800"><CheckSquare className="mr-2 text-blue-600"/> {activeVehicle ? `${activeVehicle.regMark} - 辦理流程與收費` : '請在上表選擇車輛'}</h3>
                      {activeVehicle && (
                          <div className="text-xs text-gray-500">
                              共 {(activeVehicle.crossBorder?.tasks || []).length} 項記錄，
                              總費用: <span className={`font-bold ml-1 ${totalFees < 0 ? 'text-red-600' : 'text-blue-600'}`}>{formatCurrency(totalFees)}</span>
                          </div>
                      )}
                  </div>
                  
                  {activeVehicle ? (
                      <div className="flex-1 overflow-y-auto">
                          <table className="w-full text-sm border-collapse mb-4">
                              <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10"><tr><th className="p-2 border">日期</th><th className="p-2 border">項目</th><th className="p-2 border">辦理機構</th><th className="p-2 border">辦理人</th><th className="p-2 border">天數</th><th className="p-2 border text-right">費用</th><th className="p-2 border">備注</th><th className="p-2 border text-center">操作</th></tr></thead>
                              <tbody>
                                  {(activeVehicle.crossBorder?.tasks || []).map(task => {
                                      const isPaid = !!activeVehicle.payments?.find(p => p.relatedTaskId === task.id);
                                      return (
                                      <tr key={task.id} className="border-b hover:bg-gray-50"><td className="p-2 border">{task.date}</td><td className="p-2 border font-medium">{task.item}</td><td className="p-2 border text-gray-500">{task.institution}</td><td className="p-2 border text-gray-500">{task.handler}</td><td className="p-2 border text-center">{task.days}</td>
                                          <td className="p-2 border text-right font-mono font-bold">
                                              {(task.fee && task.fee !== 0) ? (
                                                  <div className="flex items-center justify-end gap-2"><span className={isPaid ? "text-green-600" : (task.fee < 0 ? "text-red-600" : "text-amber-600")}>{task.currency} {task.fee}</span>{!isPaid && (<button onClick={() => setPaymentModalTask(task)} className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200 hover:bg-green-200 flex items-center" title="收款"><DollarSign size={10} className="mr-0.5"/> 收款</button>)}{isPaid && <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">已收</span>}</div>
                                              ) : '-'}
                                          </td>
                                          <td className="p-2 border text-gray-500 text-xs max-w-xs truncate">{task.note}</td><td className="p-2 border text-center flex items-center justify-center gap-2"><button onClick={() => handleEditClick(task)} className="text-blue-400 hover:text-blue-600"><Edit size={14}/></button><button onClick={() => deleteCbTask(activeVehicle.id, task.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></td></tr>
                                      )})}
                              </tbody>
                          </table>
                          <div className="bg-blue-50 p-3 rounded grid grid-cols-8 gap-2 items-end">
                              <div className="col-span-1"><label className="text-[10px]">日期</label><input type="date" value={newTask.date} onChange={e => setNewTask({...newTask, date: e.target.value})} className="w-full border p-1 rounded text-xs"/></div>
                              <div className="col-span-1">
                                  <label className="text-[10px]">項目</label>
                                  <select 
                                    value={newTask.item} 
                                    onChange={e => handleItemChange(e.target.value)}
                                    className="w-full border p-1 rounded text-xs"
                                  >
                                      <option value="">請選擇...</option>
                                      {settings.cbItems.map((i: any) => {
                                          const name = typeof i === 'string' ? i : i.name;
                                          return <option key={name} value={name}>{name}</option>
                                      })}
                                  </select>
                              </div>
                              <div className="col-span-1"><label className="text-[10px]">機構</label><input list="cb_inst_list" value={newTask.institution} onChange={e => setNewTask({...newTask, institution: e.target.value})} className="w-full border p-1 rounded text-xs"/><datalist id="cb_inst_list">{settings.cbInstitutions.map(i => <option key={i} value={i}/>)}</datalist></div>
                              <div className="col-span-1"><label className="text-[10px]">辦理人</label><input value={newTask.handler} onChange={e => setNewTask({...newTask, handler: e.target.value})} className="w-full border p-1 rounded text-xs"/></div>
                              <div className="col-span-1"><label className="text-[10px]">天數</label><input value={newTask.days} onChange={e => setNewTask({...newTask, days: e.target.value})} className="w-full border p-1 rounded text-xs"/></div>
                              <div className="col-span-1"><label className="text-[10px]">費用 (可負數)</label>
                                  <div className="flex">
                                      <select value={newTask.currency} onChange={e => setNewTask({...newTask, currency: e.target.value as any})} className="border p-1 rounded-l text-xs bg-gray-100"><option>HKD</option><option>RMB</option></select>
                                      <input 
                                        type="text" 
                                        value={feeStr}
                                        onChange={e => handleFeeChange(e.target.value)}
                                        className="w-full border p-1 rounded-r text-xs text-right font-mono" 
                                        placeholder="0"
                                      />
                                  </div>
                              </div>
                              <div className="col-span-1"><label className="text-[10px]">備注</label><input value={newTask.note} onChange={e => setNewTask({...newTask, note: e.target.value})} className="w-full border p-1 rounded text-xs"/></div>
                              <div className="col-span-1">
                                  {editingTaskId ? (
                                    <div className="flex gap-1"><button onClick={handleUpdateTask} className="flex-1 bg-green-600 text-white p-1.5 rounded text-xs hover:bg-green-700 flex items-center justify-center font-bold shadow-sm"><RefreshCw size={14}/></button><button onClick={() => {setEditingTaskId(null); setNewTask({fee:0, note:''}); setFeeStr('');}} className="flex-1 bg-gray-400 text-white p-1.5 rounded text-xs hover:bg-gray-500 flex items-center justify-center font-bold shadow-sm"><X size={14}/></button></div>
                                  ) : (<button onClick={handleAddTask} className="w-full bg-blue-600 text-white p-1.5 rounded text-xs hover:bg-blue-700 flex items-center justify-center font-bold shadow-sm"><Plus size={14} className="mr-1"/> 新增</button>)}
                              </div>
                          </div>
                      </div>
                  ) : (<div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50 rounded border-dashed border-2"><p>請先在上表點選一台車輛</p></div>)}
              </div>
              
              {paymentModalTask && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white p-6 rounded-lg shadow-xl w-96"><h3 className="text-lg font-bold mb-4 flex items-center"><PaymentIcon className="mr-2"/> 確認收款</h3><div className="space-y-4"><div className="p-3 bg-gray-50 rounded border"><p className="text-sm text-gray-500">項目: <span className="text-gray-900 font-bold">{paymentModalTask.item}</span></p><p className="text-sm text-gray-500">金額: <span className="text-blue-600 font-bold text-lg">{paymentModalTask.currency} {paymentModalTask.fee}</span></p></div><div><label className="block text-sm font-bold mb-1">支付方式</label><div className="flex gap-2">{['Cash', 'Cheque', 'Transfer'].map(m => (<button key={m} onClick={() => setQuickPayMethod(m as any)} className={`flex-1 py-2 rounded text-sm border ${quickPayMethod === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{m}</button>))}</div></div><div className="flex gap-2 pt-2"><button onClick={() => setPaymentModalTask(null)} className="flex-1 py-2 bg-gray-200 rounded text-gray-700 hover:bg-gray-300">取消</button><button onClick={handleQuickPay} className="flex-1 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow">確認收款</button></div></div></div></div>)}
          </div>
      );
  };
  // 3. DatabaseModule (完整修復版：含列表渲染、刪除、標籤功能)
const DatabaseModule = ({ db, staffId, appId, settings, editingEntry, setEditingEntry, isDbEditing, setIsDbEditing, inventory }: DatabaseModuleProps) => {
    const [entries, setEntries] = useState<DatabaseEntry[]>([]);
    const [selectedCatFilter, setSelectedCatFilter] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [tagInput, setTagInput] = useState('');
    
    // 重複資料處理狀態
    const [dupeGroups, setDupeGroups] = useState<DatabaseEntry[][]>([]);
    const [showDupeModal, setShowDupeModal] = useState(false);

    // 資料讀取
    useEffect(() => {
        if (!db || !staffId) return;
        const currentDb = db; 
        const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
        const colRef = collection(currentDb, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'database');
        const q = query(colRef, orderBy('createdAt', 'desc'));
        
        const unsub = onSnapshot(q, (snapshot) => {
            const list: DatabaseEntry[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                let attachments = data.attachments || [];
                if (!attachments.length && data.images && Array.isArray(data.images)) {
                    attachments = data.images.map((img: string, idx: number) => ({ name: `圖片 ${idx+1}`, data: img }));
                }
                list.push({ 
                    id: doc.id, 
                    category: data.category || 'Person', 
                    name: data.name || data.title || '',
                    phone: data.phone || '', 
                    address: data.address || '', 
                    idNumber: data.idNumber || '',
                    plateNoHK: data.plateNoHK || '', 
                    plateNoCN: data.plateNoCN || '', 
                    quotaNo: data.quotaNo || '',
                    receiptNo: data.receiptNo || '', 
                    docType: data.docType || '', 
                    description: data.description || '',
                    tags: data.tags || [], 
                    roles: data.roles || [], 
                    attachments: attachments,
                    createdAt: data.createdAt, 
                    updatedAt: data.updatedAt,
                    reminderEnabled: data.reminderEnabled || false, 
                    expiryDate: data.expiryDate || '',
                    renewalCount: data.renewalCount || 0, 
                    renewalDuration: data.renewalDuration || 1, 
                    renewalUnit: data.renewalUnit || 'year',
                    relatedPlateNo: data.relatedPlateNo || ''
                } as DatabaseEntry);
            });
            setEntries(list);
        });
        return () => unsub();
    }, [staffId, db, appId]);

    // 工具函數
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
          const files = e.target.files;
          if (!files || files.length === 0) return;
          const file = files[0];
          if (file.size > 5 * 1024 * 1024) { alert(`檔案 ${file.name} 超過 5MB 限制`); return; }
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
              const img = new Image();
              img.src = event.target?.result as string;
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  let width = img.width; let height = img.height;
                  const MAX_DIMENSION = 1024;
                  if (width > height) { if (width > MAX_DIMENSION) { height *= MAX_DIMENSION / width; width = MAX_DIMENSION; } } 
                  else { if (height > MAX_DIMENSION) { width *= MAX_DIMENSION / height; height = MAX_DIMENSION; } }
                  canvas.width = width; canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  ctx.drawImage(img, 0, 0, width, height);
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                  setEditingEntry(prev => prev ? { ...prev, attachments: [...prev.attachments, { name: file.name, data: dataUrl }] } : null);
              };
          };
    };

    const downloadImage = (dataUrl: string, filename: string) => {
        const link = document.createElement('a'); link.href = dataUrl; link.download = filename || 'download.png';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const handleQuickRenew = () => {
        if (!editingEntry || !editingEntry.expiryDate) { alert("請先設定當前的到期日"); return; }
        const duration = Number(editingEntry.renewalDuration) || 1;
        const unit = editingEntry.renewalUnit || 'year';
        const currentDate = new Date(editingEntry.expiryDate);
        if (unit === 'year') { currentDate.setFullYear(currentDate.getFullYear() + duration); } 
        else { currentDate.setMonth(currentDate.getMonth() + duration); }
        const newDateStr = currentDate.toISOString().split('T')[0];
        setEditingEntry({ ...editingEntry, expiryDate: newDateStr, renewalCount: (editingEntry.renewalCount || 0) + 1 });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); 
        if (!db || !staffId || !editingEntry) return;
        const currentDb = db; 
        const autoTags = new Set(editingEntry.tags || []);
        if(editingEntry.name) autoTags.add(editingEntry.name);
        
        const finalEntry = { ...editingEntry, tags: Array.from(autoTags), roles: editingEntry.roles || [], attachments: editingEntry.attachments || [] };
        const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
        
        try {
            if (editingEntry.id) {
                const docRef = doc(currentDb, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'database', editingEntry.id);
                await updateDoc(docRef, { ...finalEntry, updatedAt: serverTimestamp() });
                alert('資料已更新 (已保留在當前頁面)');
            } else {
                const { id, ...dataToSave } = finalEntry;
                const colRef = collection(currentDb, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'database');
                const newRef = await addDoc(colRef, { ...dataToSave, createdAt: serverTimestamp() });
                setEditingEntry({ ...finalEntry, id: newRef.id }); 
                alert('新資料已建立');
            }
        } catch (err) { console.error(err); alert('儲存失敗'); }
    };

    // 恢復被省略的函數
    const handleDelete = async (id: string) => {
        if (!db || !staffId) return;
        const currentDb = db; 
        if (!confirm('確定刪除此筆資料？無法復原。')) return;
        const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
        const docRef = doc(currentDb, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'database', id);
        await deleteDoc(docRef);
        if (editingEntry?.id === id) { setEditingEntry(null); setIsDbEditing(false); }
    };

    const toggleRole = (role: string) => {
        setEditingEntry(prev => { if (!prev) return null; const currentRoles = prev.roles || []; if (currentRoles.includes(role)) return { ...prev, roles: currentRoles.filter(r => r !== role) }; return { ...prev, roles: [...currentRoles, role] }; });
    };

    const addTag = () => {
        if (tagInput.trim() && editingEntry) { setEditingEntry({ ...editingEntry, tags: [...(editingEntry.tags || []), tagInput.trim()] }); setTagInput(''); }
    };

    // 恢復被省略的過濾邏輯
    const filteredEntries = entries.filter(entry => {
        const matchCat = selectedCatFilter === 'All' || entry.category === selectedCatFilter;
        const searchContent = `${entry.name} ${entry.phone} ${entry.idNumber} ${entry.plateNoHK} ${entry.plateNoCN} ${entry.quotaNo} ${entry.tags?.join(' ')}`;
        return matchCat && searchContent.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // 重複檢查邏輯
    const scanForDuplicates = () => {
        const nameMap = new Map<string, DatabaseEntry[]>();
        entries.forEach(e => {
            const key = e.name.trim(); 
            if (!key) return;
            if (!nameMap.has(key)) nameMap.set(key, []);
            nameMap.get(key)?.push(e);
        });
        const duplicates: DatabaseEntry[][] = [];
        nameMap.forEach((group) => { if (group.length > 1) duplicates.push(group); });
        if (duplicates.length === 0) { alert("未發現重複資料 (根據名稱)"); } 
        else { setDupeGroups(duplicates); setShowDupeModal(true); }
    };

    const resolveDuplicate = async (keepId: string, group: DatabaseEntry[]) => {
        if (!confirm("確定保留選中的資料，並刪除其他重複項？")) return;
        if (!db || !staffId) return;
        const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
        const deleteIds = group.filter(e => e.id !== keepId).map(e => e.id);
        try {
            const batch = writeBatch(db);
            deleteIds.forEach(id => {
                const ref = doc(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'database', id);
                batch.delete(ref);
            });
            await batch.commit();
            const newGroups = dupeGroups.map(g => g.filter(e => !deleteIds.includes(e.id))).filter(g => g.length > 1);
            setDupeGroups(newGroups);
            if (newGroups.length === 0) setShowDupeModal(false);
        } catch (e) { console.error(e); alert("處理失敗"); }
    };

    return (
        <div className="flex h-full bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden relative">
            {/* 左側列表 */}
            <div className="w-1/3 border-r border-slate-100 flex flex-col bg-slate-50">
                <div className="p-4 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center text-slate-700"><Database className="mr-2" size={20}/> 資料庫</h2>
                        <div className="flex gap-2">
                            <button onClick={scanForDuplicates} className="bg-amber-100 text-amber-700 p-2 rounded-full hover:bg-amber-200" title="檢查重複"><RefreshCw size={18}/></button>
                            <button onClick={(e) => { e.preventDefault(); setEditingEntry({ id: '', category: 'Person', name: '', description: '', attachments: [], tags: [], roles: [], createdAt: null }); setIsDbEditing(true); }} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 shadow-sm transition-transform active:scale-95"><Plus size={20}/></button>
                        </div>
                    </div>
                    {/* 搜尋與過濾 UI (恢復) */}
                    <div className="space-y-2">
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" placeholder="搜尋姓名、車牌、標籤..." className="w-full pl-9 p-2 rounded border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">{['All', ...DB_CATEGORIES.map(c => c.id)].map(cat => (<button key={cat} type="button" onClick={() => setSelectedCatFilter(cat)} className={`px-3 py-1 text-xs rounded-full whitespace-nowrap border transition-colors ${selectedCatFilter === cat ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}>{cat === 'All' ? '全部' : (DB_CATEGORIES.find(c => c.id === cat)?.label.split(' ')[0] || cat)}</button>))}</div>
                    </div>
                </div>
                {/* 列表渲染 (恢復) */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {filteredEntries.map(entry => {
                        const isExpired = entry.reminderEnabled && entry.expiryDate && new Date(entry.expiryDate) < new Date();
                        const isSoon = entry.reminderEnabled && entry.expiryDate && getDaysRemaining(entry.expiryDate)! <= 30 && !isExpired;
                        return (
                        <div key={entry.id} onClick={() => { setEditingEntry(entry); setIsDbEditing(false); }} className={`p-3 rounded-lg border cursor-pointer transition-all ${editingEntry?.id === entry.id ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2"><div className="font-bold text-slate-800 truncate">{entry.name || '(未命名)'}</div>{entry.reminderEnabled && (<Bell size={12} className={isExpired ? "text-red-500 fill-red-500" : (isSoon ? "text-amber-500 fill-amber-500" : "text-green-500")} />)}</div>
                                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-1">
                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border">{entry.category}</span>
                                        {entry.roles?.map(r => <span key={r} className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">{r}</span>)}
                                        {entry.plateNoHK && <span className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-100">{entry.plateNoHK}</span>}
                                        {entry.quotaNo && <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100">{entry.quotaNo}</span>}
                                    </div>
                                </div>
                                {entry.attachments?.length > 0 && <span className="text-xs text-slate-400 flex items-center bg-gray-50 px-1.5 py-0.5 rounded"><File size={10} className="mr-1"/>{entry.attachments.length}</span>}
                            </div>
                        </div>
                       );
                  })}
                    {filteredEntries.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">沒有找到相關資料</div>}
                </div>
            </div>

            {/* 右側編輯區 */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                {editingEntry ? (
                    <form onSubmit={handleSave} className="flex flex-col h-full">
                        <div className="flex-none p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="font-bold text-slate-700 text-lg flex items-center">
                                {isDbEditing || !editingEntry.id ? (editingEntry.id ? '編輯資料' : '新增資料') : editingEntry.name}
                                {!isDbEditing && <span className="ml-2 text-xs font-normal text-gray-500 px-2 py-1 bg-white rounded border">{DB_CATEGORIES.find(c => c.id === editingEntry.category)?.label}</span>}
                            </div>
                            <div className="flex gap-2">
                                {isDbEditing || !editingEntry.id ? (
                                    <>
                                        <button type="button" onClick={(e) => { e.preventDefault(); setIsDbEditing(false); if(!editingEntry.id) setEditingEntry(null); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded">取消</button>
                                        <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm flex items-center"><Save size={16} className="mr-1"/> 儲存</button>
                                    </>
                                ) : (
                                    <>
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(editingEntry.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors" title="刪除"><Trash2 size={18}/></button>
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsDbEditing(true); }} className="px-4 py-2 text-sm bg-slate-800 text-white rounded hover:bg-slate-700 flex items-center transition-colors"><Edit size={16} className="mr-1"/> 編輯</button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {isDbEditing && (
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mb-4">
                                    <label className="block text-xs font-bold text-blue-800 mb-2">資料類別</label>
                                    <div className="flex gap-2">{DB_CATEGORIES.map(cat => (<button key={cat.id} type="button" onClick={() => setEditingEntry({...editingEntry, category: cat.id as any, docType: ''})} className={`px-3 py-1.5 text-sm rounded-md border transition-all ${editingEntry.category === cat.id ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 hover:bg-blue-100'}`}>{cat.label}</button>))}</div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">名稱 / 標題 (Name)</label><input disabled={!isDbEditing} value={editingEntry.name} onChange={e => setEditingEntry({...editingEntry, name: e.target.value})} className="w-full p-2 border rounded text-lg font-bold" placeholder="姓名 / 公司名" required /></div>
                                    {editingEntry.category === 'Person' && (
                                        <>
                                            <div><label className="block text-xs font-bold text-slate-500 mb-1">人員角色</label><div className="flex flex-wrap gap-2">{(settings.dbRoles || ['客戶', '司機']).map(role => (<button key={role} type="button" disabled={!isDbEditing} onClick={() => toggleRole(role)} className={`px-2 py-1 text-xs rounded border ${editingEntry.roles?.includes(role) ? 'bg-green-100 text-green-800 border-green-300 font-bold' : 'bg-white text-gray-500'}`}>{role}</button>))}</div></div>
                                            <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-slate-500 mb-1">電話</label><input disabled={!isDbEditing} value={editingEntry.phone || ''} onChange={e => setEditingEntry({...editingEntry, phone: e.target.value})} className="w-full p-2 border rounded text-sm"/></div><div><label className="block text-xs font-bold text-slate-500 mb-1">證件號碼</label><input disabled={!isDbEditing} value={editingEntry.idNumber || ''} onChange={e => setEditingEntry({...editingEntry, idNumber: e.target.value})} className="w-full p-2 border rounded text-sm" placeholder="HKID / 回鄉證"/></div></div>
                                            <div><label className="block text-xs font-bold text-slate-500 mb-1">地址</label><input disabled={!isDbEditing} value={editingEntry.address || ''} onChange={e => setEditingEntry({...editingEntry, address: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                                        </>
                                    )}
                                    {editingEntry.category === 'Company' && (
                                        <>
                                            <div><label className="block text-xs font-bold text-slate-500 mb-1">商業登記號 (BR)</label><input disabled={!isDbEditing} value={editingEntry.idNumber || ''} onChange={e => setEditingEntry({...editingEntry, idNumber: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                                            <div><label className="block text-xs font-bold text-slate-500 mb-1">公司電話</label><input disabled={!isDbEditing} value={editingEntry.phone || ''} onChange={e => setEditingEntry({...editingEntry, phone: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                                            <div><label className="block text-xs font-bold text-slate-500 mb-1">公司地址</label><input disabled={!isDbEditing} value={editingEntry.address || ''} onChange={e => setEditingEntry({...editingEntry, address: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                                        </>
                                    )}
                                    {editingEntry.category === 'Vehicle' && (
                                        <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-slate-500 mb-1">香港車牌</label><input disabled={!isDbEditing} value={editingEntry.plateNoHK || ''} onChange={e => setEditingEntry({...editingEntry, plateNoHK: e.target.value})} className="w-full p-2 border rounded bg-yellow-50 font-mono"/></div><div><label className="block text-xs font-bold text-slate-500 mb-1">國內車牌</label><input disabled={!isDbEditing} value={editingEntry.plateNoCN || ''} onChange={e => setEditingEntry({...editingEntry, plateNoCN: e.target.value})} className="w-full p-2 border rounded bg-blue-50 font-mono"/></div></div>
                                    )}
                                    {editingEntry.category === 'CrossBorder' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="block text-xs font-bold text-slate-500 mb-1">指標號</label><input disabled={!isDbEditing} value={editingEntry.quotaNo || ''} onChange={e => setEditingEntry({...editingEntry, quotaNo: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">關聯香港車牌</label>
                                                {isDbEditing ? (
                                                    <select 
                                                        value={editingEntry.relatedPlateNo || ''} 
                                                        onChange={e => setEditingEntry({...editingEntry, relatedPlateNo: e.target.value})}
                                                        className="w-full p-2 border rounded text-sm bg-blue-50 text-blue-800 font-bold"
                                                    >
                                                        <option value="">-- 無關聯 --</option>
                                                        {inventory.map(v => (
                                                            <option key={v.id} value={v.regMark}>{v.regMark} {v.make} {v.model}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="w-full p-2 border rounded text-sm bg-gray-50">{editingEntry.relatedPlateNo || '-'}</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">文件類型 (Document Type)</label><input list="doctype_list" disabled={!isDbEditing} value={editingEntry.docType || ''} onChange={e => setEditingEntry({...editingEntry, docType: e.target.value})} className="w-full p-2 border rounded text-sm bg-gray-50" placeholder="選擇或輸入新類型..."/><datalist id="doctype_list">{(settings.dbDocTypes[editingEntry.category] || []).map(t => <option key={t} value={t}/>)}</datalist></div>
                                    <div className={`p-4 rounded-lg border transition-all ${editingEntry.reminderEnabled ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="flex items-center cursor-pointer"><input type="checkbox" disabled={!isDbEditing} checked={editingEntry.reminderEnabled || false} onChange={e => setEditingEntry({ ...editingEntry, reminderEnabled: e.target.checked, renewalDuration: editingEntry.renewalDuration || 1, renewalUnit: editingEntry.renewalUnit || 'year', renewalCount: editingEntry.renewalCount || 0 })} className="w-4 h-4 text-amber-600 rounded mr-2" /><span className={`text-sm font-bold flex items-center ${editingEntry.reminderEnabled ? 'text-amber-800' : 'text-gray-500'}`}><Bell size={16} className="mr-1"/> 啟用到期提醒功能</span></label>
                                            {editingEntry.reminderEnabled && (<div className="text-xs text-amber-700 font-mono bg-white px-2 py-1 rounded border border-amber-200">已續期次數: <span className="font-bold">{editingEntry.renewalCount || 0}</span></div>)}
                                        </div>
                                        {editingEntry.reminderEnabled && (
                                            <div className="grid grid-cols-2 gap-4 animate-fade-in">
                                                <div className="col-span-2 md:col-span-1"><label className="block text-xs font-bold text-amber-800 mb-1">當前到期日 (Expiry Date)</label><input type="date" disabled={!isDbEditing} value={editingEntry.expiryDate || ''} onChange={e => setEditingEntry({...editingEntry, expiryDate: e.target.value})} className="w-full p-2 border border-amber-300 rounded text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none font-bold" /><div className="mt-1"><DateStatusBadge date={editingEntry.expiryDate} label="狀態" /></div></div>
                                                <div className="col-span-2 md:col-span-1 bg-white p-2 rounded border border-amber-100"><label className="block text-xs font-bold text-gray-500 mb-1">自動續期規則 (Auto Renew Rule)</label><div className="flex gap-2 mb-2"><input type="number" disabled={!isDbEditing} value={editingEntry.renewalDuration} onChange={e => setEditingEntry({...editingEntry, renewalDuration: Number(e.target.value)})} className="w-16 p-1 border rounded text-center text-sm" min="1" /><select disabled={!isDbEditing} value={editingEntry.renewalUnit} onChange={e => setEditingEntry({...editingEntry, renewalUnit: e.target.value as any})} className="flex-1 p-1 border rounded text-sm"><option value="year">年 (Years)</option><option value="month">月 (Months)</option></select></div>{isDbEditing && (<button type="button" onClick={handleQuickRenew} className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-1.5 rounded flex items-center justify-center shadow-sm transition-transform active:scale-95"><RefreshCw size={12} className="mr-1"/> 立即續期 (更新日期 +{editingEntry.renewalDuration}{editingEntry.renewalUnit==='year'?'年':'月'})</button>)}</div>
                                            </div>
                                        )}
                                    </div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">備註 / 內容</label><textarea disabled={!isDbEditing} value={editingEntry.description || ''} onChange={e => setEditingEntry({...editingEntry, description: e.target.value})} className="w-full p-2 border rounded text-sm h-24" placeholder="輸入詳細說明..."/></div>
                                    <div><label className="block text-xs font-bold text-slate-500">標籤</label><div className="flex gap-2 mb-2 flex-wrap">{editingEntry.tags?.map(tag => <span key={tag} className="bg-slate-200 px-2 py-1 rounded text-xs flex items-center">{tag} {isDbEditing && <button type="button" onClick={() => setEditingEntry({...editingEntry, tags: editingEntry.tags.filter(t => t !== tag)})} className="ml-1 text-slate-500 hover:text-red-500"><X size={10}/></button>}</span>)}</div>{isDbEditing && <div className="flex gap-1"><input value={tagInput} onChange={e => setTagInput(e.target.value)} className="flex-1 p-1.5 border rounded text-xs" placeholder="新增..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} /><button type="button" onClick={addTag} className="bg-slate-200 px-3 py-1 rounded text-xs"><Plus size={12}/></button></div>}</div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center"><label className="block text-xs font-bold text-slate-500">文件圖片 ({editingEntry.attachments?.length || 0})</label>{isDbEditing && (<label className="cursor-pointer text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 flex items-center border border-blue-200 shadow-sm transition-colors"><Upload size={14} className="mr-1"/> 上傳圖片<input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} /></label>)}</div>
                                    <div className="grid grid-cols-1 gap-6 max-h-[800px] overflow-y-auto pr-2">{editingEntry.attachments?.map((file, idx) => (<div key={idx} className="relative group border rounded-xl overflow-hidden bg-white shadow-md flex flex-col"><div className="w-full bg-slate-50 relative p-1"><img src={file.data} className="w-full h-auto object-contain" style={{ maxHeight: 'none' }} />{isDbEditing && (<button type="button" onClick={() => setEditingEntry(prev => prev ? { ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) } : null)} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-90 hover:opacity-100 transition-opacity shadow-lg" title="刪除"><X size={18}/></button>)}<button type="button" onClick={(e) => { e.preventDefault(); downloadImage(file.data, file.name); }} className="absolute top-2 left-2 bg-blue-600 text-white p-2 rounded-full opacity-80 hover:opacity-100 transition-opacity shadow-lg" title="下載圖片"><DownloadCloud size={18}/></button></div><div className="p-3 border-t bg-white text-sm text-slate-700 font-medium flex items-center"><File size={16} className="mr-2 text-blue-600 flex-shrink-0"/>{isDbEditing ? (<input value={file.name} onChange={e => { const newAttachments = [...editingEntry.attachments]; newAttachments[idx].name = e.target.value; setEditingEntry({...editingEntry, attachments: newAttachments}); }} className="w-full bg-transparent outline-none focus:border-b-2 border-blue-400 py-1" placeholder="輸入檔名..." />) : (<span className="truncate">{file.name}</span>)}</div></div>))}{(!editingEntry.attachments || editingEntry.attachments.length === 0) && (<div className="border-2 border-dashed border-slate-200 rounded-xl h-60 flex flex-col items-center justify-center text-slate-400 text-sm bg-slate-50/30"><ImageIcon size={48} className="mb-3 opacity-30"/>暫無附件圖片</div>)}</div>
                                </div>
                            </div>
                        </div>
                    </form>
                ) : (<div className="flex-1 flex flex-col items-center justify-center text-slate-400"><Database size={48} className="mb-4"/><p>請選擇或新增資料</p></div>)}
            </div>

            {showDupeModal && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-amber-50 rounded-t-xl">
                            <h3 className="font-bold text-amber-800 flex items-center"><AlertTriangle className="mr-2"/> 發現重複資料 ({dupeGroups.length} 組)</h3>
                            <button onClick={() => setShowDupeModal(false)}><X/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {dupeGroups.map((group, idx) => (
                                <div key={idx} className="border rounded-lg p-3 bg-slate-50">
                                    <h4 className="font-bold mb-2 text-slate-700">名稱: {group[0].name}</h4>
                                    <div className="space-y-2">
                                        {group.map(item => (
                                            <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border">
                                                <div className="text-xs">
                                                    <div><span className="font-bold">ID:</span> {item.id}</div>
                                                    <div><span className="font-bold">電話:</span> {item.phone || '-'}</div>
                                                    <div><span className="font-bold">建立:</span> {item.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}</div>
                                                </div>
                                                <button onClick={() => resolveDuplicate(item.id, group)} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">保留此筆 (刪除其他)</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};





// 3. Settings Manager (系統設置 - 升級版 + 數據管理)
  const SettingsManager = () => {
    const [activeTab, setActiveTab] = useState<'dropdowns' | 'users' | 'data'>('dropdowns');
    const [selectedModule, setSelectedModule] = useState<string>('inventory');
    const [selectedSettingKey, setSelectedSettingKey] = useState<string>('makes');
    
    // 用於二級選單的狀態
    const [activeMake, setActiveMake] = useState<string>(settings.makes[0] || '');
    const [activeDocCat, setActiveDocCat] = useState<string>('Person');
    const [isProcessing, setIsProcessing] = useState(false);

    // 模擬用戶資料
    const [systemUsers, setSystemUsers] = useState<{id: string, name: string, modules: string[]}[]>([
        { id: 'BOSS', name: '管理員', modules: ['全部權限'] },
        { id: 'SALES', name: '銷售人員', modules: ['車輛管理', '開單系統'] }
    ]);

    // 定義設置結構
    const settingModules = [
        { 
            id: 'inventory', label: '車輛庫存管理', icon: Car,
            options: [
                { key: 'makes', label: '車輛廠牌 (Makes)' },
                { key: 'models', label: '車輛型號 (Models)' },
                { key: 'colors', label: '顏色列表 (Colors)' }
            ]
        },
        { 
            id: 'cross_border', label: '中港業務', icon: Globe,
            options: [
                { key: 'cbItems', label: '辦理項目 (Service Items)' },
                { key: 'cbInstitutions', label: '辦理機構 (Institutions)' }
            ]
        },
        { 
            id: 'database', label: '資料庫中心', icon: Database,
            options: [
                { key: 'dbRoles', label: '人員角色 (Roles)' },
                { key: 'dbDocTypes', label: '文件類型 (Doc Types)' }
            ]
        },
        { 
            id: 'finance', label: '財務與費用', icon: DollarSign,
            options: [
                { key: 'expenseTypes', label: '費用類別 (Expense Types)' },
                { key: 'expenseCompanies', label: '供應商/負責公司' }
            ]
        }
    ];

    const handleUpdate = (newItem: string, action: 'add' | 'remove', parentKey?: string) => {
        if (!newItem && action === 'add') return;
        updateSettings(selectedSettingKey as keyof SystemSettings, newItem, action, parentKey);
    };


    // --- 專用工具：解析舊系統 CSV 並轉換為新系統格式 (含新欄位) ---
const parseLegacyCSV = (csvText: string): Partial<Vehicle>[] => {
    // 1. 拆分行與標題
    const lines = csvText.split(/\r\n|\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) return []; // 只有標題或為空

    const headers = lines[0].split(',').map(h => h.trim());
    
    // 輔助：日期格式化 (支援 2026/3/25 或 2026-03-25 -> 2026-03-25)
    const fmtDate = (val: string) => {
        if (!val || val === '-' || val.trim() === '') return '';
        try {
            // 處理 Excel 可能出現的日期格式
            let dateStr = val.replace(/\//g, '-').trim();
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0];
        } catch (e) { return ''; }
    };

    const result: Partial<Vehicle>[] = [];

    for (let i = 1; i < lines.length; i++) {
        // 處理 CSV 的逗號分隔 (簡單版，假設內容無逗號)
        const row = lines[i].split(',').map(c => c.trim());
        
        // 輔助函數：根據標題名稱取值
        const getData = (headerName: string) => {
            const index = headers.indexOf(headerName);
            return (index > -1 && row[index]) ? row[index] : '';
        };

        const regMark = getData('香港車牌');
        if (!regMark) continue; // 沒有車牌則跳過

        // 讀取中港相關欄位
        const mainlandPlate = getData('內地車牌');
        const quotaNo = getData('指標號');
        const hkCo = getData('香港商號');
        const cnCo = getData('內承單位');
        
        // 判斷是否啟用中港模組：只要有任一關鍵資料就啟用
        const hasCBData = mainlandPlate || quotaNo || hkCo || cnCo || getData('批文卡到期');

        // 3. 轉換為新系統結構
        const vehicle: any = {
            id: `IMP-${Date.now()}-${i}`, // 暫時 ID
            regMark: regMark,
            
            // 預設值 (因為 CSV 沒有這些資料)
            year: new Date().getFullYear().toString(),
            make: 'TOYOTA', 
            model: 'Alphard', 
            purchaseType: 'Used',
            status: 'Sold', // 假設匯入的舊車都是已售/管理中
            transmission: 'Automatic', // 預設自動波
            colorExt: 'Black', // 預設顏色
            
            // 客戶資料
            customerName: getData('負責司機'), // 這裡對應 CSV 的負責司機作為主要聯絡人
            customerPhone: getData('聯絡電話'),
            remarks: getData('備註'),
            
            // 牌費與保險
            licenseExpiry: fmtDate(getData('牌照費')),
            
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            
            // ★ 重點：中港車管家資料對應 (包含新欄位) ★
            crossBorder: {
                isEnabled: !!hasCBData,
                mainlandPlate: mainlandPlate,
                quotaNumber: quotaNo, // 對應「指標號」
                
                // 新增公司欄位
                hkCompany: hkCo,     // 對應「香港商號」
                mainlandCompany: cnCo, // 對應「內承單位」
                
                insuranceAgent: getData('保險代理'),
                
                // 司機資料
                driver1: getData('司機1') || getData('負責司機'),
                driver2: getData('司機2'),
                driver3: getData('司機3'),
                
                // 口岸 (轉為陣列)
                ports: getData('通行口岸') ? [getData('通行口岸')] : [],

                // 十大日期欄位對應
                dateReservedPlate: fmtDate(getData('留牌紙到期')),
                dateBr: fmtDate(getData('BR到期')),
                dateLicenseFee: fmtDate(getData('牌照費')), // 與車輛牌費共用
                dateHkInsurance: fmtDate(getData('香港保險到期')),
                dateMainlandJqx: fmtDate(getData('內地交強險到期')),
                dateMainlandSyx: fmtDate(getData('內地商業險到期')),
                dateClosedRoad: fmtDate(getData('禁區紙到期')),
                dateApproval: fmtDate(getData('批文卡到期')),
                dateMainlandLicense: fmtDate(getData('行駛証')),
                dateHkInspection: fmtDate(getData('香港驗車日期')),
                
                tasks: [] // 初始化空任務列表
            },
            
            expenses: [],
            payments: []
        };
        result.push(vehicle);
    }
    return result;
};

// ★★★ 處理舊 CSV 匯入 (包含新欄位與資料連動) ★★★
    const handleLegacyCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !db || !staffId) return;

        if (!confirm("確定匯入舊系統 CSV？\n\n系統將會：\n1. 建立車輛庫存\n2. 自動填入指標號、香港/內地公司資料\n3. 同步建立客戶與司機的資料庫檔案")) {
            e.target.value = '';
            return;
        }

        setIsProcessing(true);
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            try {
                const csvText = event.target?.result as string;
                const vehicles = parseLegacyCSV(csvText);
                
                if (vehicles.length === 0) {
                    alert("無法解析 CSV 或沒有有效資料。請檢查檔案格式。");
                    setIsProcessing(false);
                    return;
                }

                const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
                const batch = writeBatch(db!);
                let count = 0;
                const BATCH_LIMIT = 450; // Firestore 批次限制

                // 寫入 Firestore
                for (const v of vehicles) {
                    if (count >= BATCH_LIMIT) break; 
                    
                    // 1. 寫入車輛庫存
                    const newDocRef = doc(collection(db!, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'inventory'));
                    const { id, ...vData } = v; // 移除暫時 ID
                    
                    batch.set(newDocRef, {
                        ...vData,
                        id: newDocRef.id,
                        importedAt: serverTimestamp()
                    });
                    
                    // 2. 自動同步：建立「客戶」檔案 (根據負責司機)
                    if (vData.customerName) {
                        const clientRef = doc(collection(db!, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'database'));
                        batch.set(clientRef, {
                            category: 'Person',
                            name: vData.customerName,
                            phone: vData.customerPhone || '',
                            roles: ['客戶'],
                            tags: ['CSV匯入', '車主'],
                            description: `匯入自車輛: ${vData.regMark}`,
                            createdAt: serverTimestamp()
                        });
                        count++;
                    }

                    // 3. 自動同步：建立「司機」檔案 (根據司機1, 2, 3)
                    const drivers = [
                        vData.crossBorder?.driver1, 
                        vData.crossBorder?.driver2, 
                        vData.crossBorder?.driver3
                    ].filter(d => d && d !== vData.customerName); // 避免重複建立同一個人

                    for (const driverName of drivers) {
                        if (driverName) {
                            const driverRef = doc(collection(db!, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'database'));
                            batch.set(driverRef, {
                                category: 'Person',
                                name: driverName,
                                roles: ['司機'],
                                tags: ['CSV匯入', '中港司機'],
                                relatedPlateNo: vData.regMark, // 關聯車牌
                                createdAt: serverTimestamp()
                            });
                            count++;
                        }
                    }

                    count++;
                }

                await batch.commit();
                alert(`匯入成功！共處理了約 ${count} 筆資料 (包含車輛與關聯人員)。\n請至「車輛庫存」與「資料庫中心」查看。`);
                
            } catch (err) {
                console.error("CSV Import failed:", err);
                alert("匯入失敗，請檢查檔案格式或網路連線。");
            }
            setIsProcessing(false);
            e.target.value = ''; // 重置 input
        };
        // 使用 readAsText 讀取 CSV
        reader.readAsText(file); 
    };

    // ★★★ 數據匯出 (Export) ★★★
    const handleExportData = async () => {
        if (!db || !staffId) return;
        setIsProcessing(true);
        try {
            const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
            
            // 1. 獲取資料庫中心資料 (因為它不在 inventory state 中)
            const dbRef = collection(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'database');
            const dbSnapshot = await getDocs(dbRef);
            const databaseData = dbSnapshot.docs.map(d => d.data());

            // 2. 打包所有資料
            const backupData = {
                version: "2.0",
                timestamp: new Date().toISOString(),
                exportedBy: staffId,
                settings: settings,
                inventory: inventory, // 包含車輛、費用、收款、中港資料
                database: databaseData // 資料庫中心資料
            };

            // 3. 下載檔案
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `GL_DMS_Backup_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            alert("數據匯出成功！");
        } catch (e) {
            console.error(e);
            alert("匯出失敗，請檢查網絡或權限。");
        }
        setIsProcessing(false);
    };

    // ★★★ 數據匯入 (Import) ★★★
    const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !db || !staffId) return;
        
        if (!confirm("警告：匯入數據將會寫入系統。\n\n- 系統設定：將被覆蓋\n- 車輛與資料庫：將以「新增」方式加入 (避免覆蓋現有資料)\n\n確定要繼續嗎？")) {
            e.target.value = ''; // Reset input
            return;
        }

        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
                const batch = writeBatch(db!);
                let operationCount = 0;
                const BATCH_LIMIT = 450; // Firestore batch limit safety

                // 1. 還原設定 (Overwrite)
                if (data.settings) {
                    const settingsRef = doc(db!, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'system_config', 'general_settings');
                    batch.set(settingsRef, data.settings);
                    setSettings(data.settings); // Update local state immediately
                    operationCount++;
                }

                // 2. 還原車輛庫存 (Append)
                if (Array.isArray(data.inventory)) {
                    data.inventory.forEach((car: any) => {
                        if (operationCount < BATCH_LIMIT) {
                            const newDocRef = doc(collection(db!, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'inventory'));
                            // 移除舊 ID，賦予新 ID，並加入匯入標記
                            const { id, ...carData } = car;
                            batch.set(newDocRef, { 
                                ...carData, 
                                id: newDocRef.id, 
                                importedAt: serverTimestamp(),
                                regMark: `${car.regMark} (匯入)` // 避免車牌重複混淆
                            });
                            operationCount++;
                        }
                    });
                }

                // 3. 還原資料庫中心 (Append)
                if (Array.isArray(data.database)) {
                    data.database.forEach((entry: any) => {
                        if (operationCount < BATCH_LIMIT) {
                            const newDocRef = doc(collection(db!, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'database'));
                            const { id, ...entryData } = entry;
                            batch.set(newDocRef, { 
                                ...entryData, 
                                id: newDocRef.id, 
                                importedAt: serverTimestamp(),
                                name: `${entry.name} (匯入)`
                            });
                            operationCount++;
                        }
                    });
                }

                await batch.commit();
                alert(`匯入完成！\n共處理了約 ${operationCount} 筆資料。\n(超過 450 筆的資料需分批處理)`);
                
            } catch (err) {
                console.error("Import failed:", err);
                alert("匯入失敗：檔案格式錯誤或網絡問題。");
            }
            setIsProcessing(false);
            e.target.value = ''; // Reset input
        };
        reader.readAsText(file);
    };

    const renderDropdownEditor = () => {
        // --- 情況 A: 車輛型號 (需關聯廠牌) ---
        if (selectedSettingKey === 'models') {
             return (
                 <div className="space-y-4 h-full flex flex-col">
                     <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 mb-2 flex-none">
                         <Info size={16} className="inline mr-1"/> 請先在左欄選擇廠牌，再於右欄編輯其型號。
                     </div>
                     <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                         <div className="border rounded-lg overflow-hidden flex flex-col bg-white">
                             <div className="bg-gray-100 p-2 font-bold text-xs text-gray-500 border-b">1. 選擇廠牌</div>
                             <div className="flex-1 overflow-y-auto p-1">
                                 {settings.makes.map(m => (
                                     <button key={m} onClick={() => setActiveMake(m)} className={`w-full text-left p-2 text-sm rounded transition-colors ${activeMake === m ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-gray-50'}`}>{m}</button>
                                 ))}
                             </div>
                         </div>
                         <div className="border rounded-lg overflow-hidden flex flex-col bg-white">
                             <div className="bg-gray-100 p-2 font-bold text-xs text-gray-500 border-b">2. 編輯 {activeMake} 的型號</div>
                             <div className="p-2 border-b bg-white flex gap-2">
                                 <input id="new-model" className="flex-1 border p-1.5 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500" placeholder={`新增型號...`} />
                                 <button onClick={() => { const el = document.getElementById('new-model') as HTMLInputElement; handleUpdate(el.value, 'add', activeMake); el.value = ''; }} className="bg-blue-600 text-white px-3 rounded hover:bg-blue-700"><Plus size={16}/></button>
                             </div>
                             <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                 {(settings.models[activeMake] || []).map(item => (
                                     <div key={item} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm group hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200">
                                         <span>{item}</span>
                                         <button onClick={() => handleUpdate(item, 'remove', activeMake)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><X size={14}/></button>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     </div>
                 </div>
             );
        }

        if (selectedSettingKey === 'cbItems') {
             const items = settings.cbItems.map((i: any) => typeof i === 'string' ? { name: i, defaultInst: '', defaultFee: 0, defaultDays: '' } : i);
             
             const handleCbItemUpdate = (idx: number, field: string, value: any) => {
                 const newItems = [...items];
                 newItems[idx] = { ...newItems[idx], [field]: value };
                 // 更新整個陣列
                 const newSettings = { ...settings, cbItems: newItems };
                 setSettings(newSettings);
                 // 觸發 Firestore 更新 (簡化版，建議使用 updateSettings 的變體)
                 if(db && staffId) {
                    const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
                    setDoc(doc(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'system_config', 'general_settings'), newSettings);
                 }
             };

             const addCbItem = () => {
                 const newItems = [...items, { name: '新項目', defaultInst: '', defaultFee: 0, defaultDays: '' }];
                 setSettings({ ...settings, cbItems: newItems });
                 // 觸發 Firestore 更新
             };
             
             const removeCbItem = (idx: number) => {
                 if(!confirm('確定刪除？')) return;
                 const newItems = items.filter((_, i) => i !== idx);
                 setSettings({ ...settings, cbItems: newItems });
                 // 觸發 Firestore 更新
             };

             return (
                 <div className="h-full flex flex-col">
                     <div className="flex justify-between items-center mb-4">
                         <div className="text-sm text-gray-500 bg-yellow-50 p-2 rounded"><Info size={14} className="inline mr-1"/> 設定辦理項目的預設值 (機構/費用/天數)，開單時將自動帶入。</div>
                         <button onClick={addCbItem} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm flex items-center"><Plus size={14} className="mr-1"/> 新增項目</button>
                     </div>
                     <div className="flex-1 overflow-y-auto border rounded-lg">
                         <table className="w-full text-sm text-left">
                             <thead className="bg-gray-100 sticky top-0">
                                 <tr>
                                     <th className="p-2">項目名稱</th>
                                     <th className="p-2">預設機構</th>
                                     <th className="p-2 w-24">預設費用</th>
                                     <th className="p-2 w-16">天數</th>
                                     <th className="p-2 w-10"></th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y">
                                 {items.map((item: any, idx: number) => (
                                     <tr key={idx} className="hover:bg-gray-50">
                                         <td className="p-2"><input value={item.name} onChange={e => handleCbItemUpdate(idx, 'name', e.target.value)} className="w-full border p-1 rounded"/></td>
                                         <td className="p-2"><input value={item.defaultInst} onChange={e => handleCbItemUpdate(idx, 'defaultInst', e.target.value)} className="w-full border p-1 rounded" placeholder="例如: 運輸署"/></td>
                                         <td className="p-2"><input type="number" value={item.defaultFee} onChange={e => handleCbItemUpdate(idx, 'defaultFee', Number(e.target.value))} className="w-full border p-1 rounded"/></td>
                                         <td className="p-2"><input value={item.defaultDays} onChange={e => handleCbItemUpdate(idx, 'defaultDays', e.target.value)} className="w-full border p-1 rounded"/></td>
                                         <td className="p-2"><button onClick={() => removeCbItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>
                 </div>
             );
        }


        // --- 情況 B: 文件類型 (需關聯分類) ---
        if (selectedSettingKey === 'dbDocTypes') {
            return (
                <div className="space-y-4 h-full flex flex-col">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 mb-2 flex-none">
                        <Info size={16} className="inline mr-1"/> 請選擇資料分類 (如: 人員、公司)，再編輯該類別下的文件選項。
                    </div>
                    <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                        {/* 左：分類選擇 */}
                        <div className="border rounded-lg overflow-hidden flex flex-col bg-white">
                            <div className="bg-gray-100 p-2 font-bold text-xs text-gray-500 border-b">1. 選擇分類</div>
                            <div className="flex-1 overflow-y-auto p-1">
                                {DB_CATEGORIES.map(cat => (
                                    <button key={cat.id} onClick={() => setActiveDocCat(cat.id)} className={`w-full text-left p-2 text-sm rounded transition-colors ${activeDocCat === cat.id ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-gray-50'}`}>{cat.label.split(' ')[0]}</button>
                                ))}
                            </div>
                        </div>
                        {/* 右：類型編輯 */}
                        <div className="border rounded-lg overflow-hidden flex flex-col bg-white">
                            <div className="bg-gray-100 p-2 font-bold text-xs text-gray-500 border-b">2. 編輯文件類型</div>
                            <div className="p-2 border-b bg-white flex gap-2">
                                <input id="new-doctype" className="flex-1 border p-1.5 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500" placeholder={`新增文件類型...`} />
                                <button onClick={() => { const el = document.getElementById('new-doctype') as HTMLInputElement; handleUpdate(el.value, 'add', activeDocCat); el.value = ''; }} className="bg-blue-600 text-white px-3 rounded hover:bg-blue-700"><Plus size={16}/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {(settings.dbDocTypes[activeDocCat] || []).map(item => (
                                    <div key={item} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm group hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200">
                                        <span>{item}</span>
                                        <button onClick={() => handleUpdate(item, 'remove', activeDocCat)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><X size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
       }

        // --- 情況 C: 一般單層列表 ---
        const currentList = (settings[selectedSettingKey as keyof SystemSettings] || []) as string[];
        return (
            <div className="flex flex-col h-full">
                <div className="flex gap-2 mb-4 flex-none">
                    <input id="new-item-input" className="flex-1 border p-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder={`輸入新的項目...`} />
                    <button onClick={() => { const el = document.getElementById('new-item-input') as HTMLInputElement; handleUpdate(el.value, 'add'); el.value = ''; }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-blue-700 flex items-center transition-colors">
                        <Plus size={18} className="mr-1"/> 新增
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto border rounded-xl bg-slate-50 p-2 space-y-2">
                    {currentList.map(item => (
                        <div key={item} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200 shadow-sm group hover:border-blue-300 transition-colors">
                            <span className="font-medium text-gray-700">{item}</span>
                            <button onClick={() => handleUpdate(item, 'remove')} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    {currentList.length === 0 && <div className="text-center text-gray-400 py-10">列表是空的</div>}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Top Tabs */}
            <div className="bg-white border-b px-8 pt-6 flex space-x-8 shadow-sm z-10 flex-none">
                <button onClick={() => setActiveTab('dropdowns')} className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center ${activeTab === 'dropdowns' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <Settings className="mr-2" size={18}/> 選單內容管理
                </button>
                <button onClick={() => setActiveTab('users')} className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <Users className="mr-2" size={18}/> 系統用戶管理
                </button>
                {/* ★★★ 新增：數據匯入/匯出 Tab ★★★ */}
                <button onClick={() => setActiveTab('data')} className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center ${activeTab === 'data' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <Database className="mr-2" size={18}/> 數據備份與還原
                </button>
            </div>

            <div className="flex-1 overflow-hidden p-6">
                {activeTab === 'dropdowns' && (
                    <div className="flex h-full gap-6">
                        {/* Col 1: Module */}
                        <div className="w-56 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                            <div className="p-3 bg-gray-50 border-b font-bold text-gray-500 text-xs">Step 1: 選擇模組</div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {settingModules.map(mod => (
                                    <button key={mod.id} onClick={() => { setSelectedModule(mod.id); setSelectedSettingKey(mod.options[0].key); }} className={`w-full flex items-center p-3 rounded-lg text-sm font-medium transition-all ${selectedModule === mod.id ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
                                        <mod.icon size={18} className={`mr-3 ${selectedModule === mod.id ? 'text-blue-600' : 'text-gray-400'}`}/> {mod.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Col 2: Field */}
                        <div className="w-56 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                             <div className="p-3 bg-gray-50 border-b font-bold text-gray-500 text-xs">Step 2: 選擇欄位</div>
                             <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                 {settingModules.find(m => m.id === selectedModule)?.options.map(opt => (
                                     <button key={opt.key} onClick={() => setSelectedSettingKey(opt.key)} className={`w-full text-left p-3 rounded-lg text-sm transition-all ${selectedSettingKey === opt.key ? 'bg-yellow-50 text-yellow-700 font-bold border border-yellow-200 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>{opt.label}</button>
                                 ))}
                             </div>
                        </div>
                        {/* Col 3: Editor */}
                        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                             <div className="p-3 border-b flex justify-between items-center bg-gray-50"><h3 className="font-bold text-gray-800 flex items-center"><Edit size={16} className="mr-2 text-blue-500"/> 編輯: <span className="ml-2 text-blue-600">{settingModules.find(m => m.id === selectedModule)?.options.find(o => o.key === selectedSettingKey)?.label}</span></h3></div>
                             <div className="flex-1 overflow-y-auto p-6">{renderDropdownEditor()}</div>
                        </div>
                    </div>
                )}
                {activeTab === 'users' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800">用戶權限管理 (預覽)</h2><button className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center"><Plus size={16} className="mr-2"/> 新增用戶</button></div>
                        <table className="w-full text-sm text-left"><thead className="bg-gray-50 text-gray-600 border-b"><tr><th className="p-4">ID</th><th className="p-4">姓名</th><th className="p-4">角色</th><th className="p-4">權限</th><th className="p-4 text-right">狀態</th></tr></thead>
                        <tbody className="divide-y">{systemUsers.map(u => (<tr key={u.id} className="hover:bg-gray-50"><td className="p-4 font-bold">{u.id}</td><td className="p-4">{u.name}</td><td className="p-4">一般員工</td><td className="p-4">{u.modules.join(', ')}</td><td className="p-4 text-right"><span className="text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs">啟用</span></td></tr>))}</tbody></table>
                    </div>
                )}
                
                {/* ★★★ 新增：數據管理 Tab UI ★★★ */}
                {activeTab === 'data' && (
                    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-8">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-slate-800">系統數據管理</h2>
                            <p className="text-gray-500 mt-2">您可以備份 (匯出) 所有系統資料，或從備份檔還原 (匯入) 資料。</p>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            
                            {/* 舊系統 CSV 遷移區塊 */}
                            <div className="col-span-2 border border-green-100 bg-green-50 rounded-xl p-6 flex flex-row items-center hover:shadow-md transition-shadow mt-4">
                                {/* ... 圖示與標題 ... */}
                                    <div className="ml-4">
                                         <label className={`px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-sm transition-colors cursor-pointer block ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                                            {isProcessing ? '資料分析中...' : '選擇 CSV 檔案匯入'}
                                            <input type="file" accept=".csv" className="hidden" onChange={handleLegacyCsvImport} disabled={isProcessing}/>
                                        </label>
                                    </div>
                            </div>
                            
                            {/* 匯出區塊 */}
                            <div className="border border-blue-100 bg-blue-50 rounded-xl p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                    <DownloadCloud size={32}/>
                                </div>
                                <h3 className="font-bold text-lg text-blue-900">匯出備份 (Export)</h3>
                                <p className="text-xs text-blue-700/70 mt-2 mb-6">下載包含系統設定、車輛庫存及資料庫中心的完整 JSON 備份檔。</p>
                                <button 
                                    onClick={handleExportData}
                                    disabled={isProcessing}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-colors disabled:opacity-50"
                                >
                                    {isProcessing ? '處理中...' : '下載備份檔案'}
                                </button>
                            </div>

                            {/* 匯入區塊 */}
                            <div className="border border-yellow-100 bg-yellow-50 rounded-xl p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                                <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4">
                                    <Upload size={32}/>
                                </div>
                                <h3 className="font-bold text-lg text-yellow-900">匯入還原 (Import)</h3>
                                <p className="text-xs text-yellow-700/70 mt-2 mb-6">上傳 JSON 備份檔。注意：這將覆蓋系統設定並新增資料。</p>
                                <label className={`w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold shadow-sm transition-colors cursor-pointer text-center block ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {isProcessing ? '匯入中...' : '選擇檔案匯入'}
                                    <input type="file" accept=".json" className="hidden" onChange={handleImportData} disabled={isProcessing}/>
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
  };

  const CompanyStamp = () => (<div className="w-[22mm] h-[22mm] rounded-full flex flex-col items-center justify-center transform -rotate-12 opacity-90 pointer-events-none select-none mix-blend-multiply" style={{ color: '#2b3d90', border: '2px solid #2b3d90', boxShadow: 'inset 0 0 0 1px rgba(43, 61, 144, 0.2), 0 0 2px rgba(43, 61, 144, 0.4)', backgroundColor: 'rgba(43, 61, 144, 0.02)', mixBlendMode: 'multiply' }}><div className="w-[90%] h-[90%] rounded-full flex flex-col items-center justify-center p-[1px]" style={{ border: '1px solid #2b3d90' }}><div className="absolute w-full h-full"><svg viewBox="0 0 100 100" className="w-full h-full absolute top-0 left-0"><defs><path id="textCircle" d="M 12, 50 A 38, 38 0 1, 1 88, 50" /></defs><text fontSize="11" fontWeight="bold" fill="#2b3d90" letterSpacing="1"><textPath href="#textCircle" startOffset="50%" textAnchor="middle">GOLD LAND AUTO</textPath></text></svg></div><div className="flex flex-col items-center justify-center mt-2 z-10"><span className="text-[6px] font-bold leading-none tracking-widest" style={{ textShadow: '0 0 0.5px #2b3d90' }}>金田</span><span className="text-[6px] font-bold leading-none tracking-widest mt-[1px]" style={{ textShadow: '0 0 0.5px #2b3d90' }}>汽車</span></div><div className="absolute bottom-1 text-[8px] font-bold text-[#2b3d90]">*</div></div></div>);
  const SignedStamp = () => (<div className="relative w-[50mm] h-[30mm] flex items-center justify-center"><svg viewBox="0 0 200 100" className="absolute top-0 left-0 w-full h-full pointer-events-none z-0" style={{ overflow: 'visible' }}><defs><filter id="ink-spread"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" /></filter></defs><path d="M20,60 C40,40 60,80 90,50 C110,30 130,70 160,40 C170,30 180,60 190,50" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" style={{ filter: 'url(#ink-spread)', opacity: 0.85 }} /><path d="M30,70 C60,60 120,60 180,55" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" style={{ filter: 'url(#ink-spread)', opacity: 0.9 }} /><path d="M50,40 Q40,80 60,70 T80,60" fill="none" stroke="black" strokeWidth="2.5" style={{ filter: 'url(#ink-spread)', opacity: 0.8 }} /></svg><div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2 w-[22mm] h-[22mm] flex items-center justify-center z-10 pointer-events-none select-none"><CompanyStamp /></div></div>);
  
  const DocumentTemplate = () => {
    const activeVehicle = previewDoc?.vehicle || selectedVehicle;
    const activeType = previewDoc?.type || docType;
    
    // 優先使用多選列表，如果沒有則嘗試使用單個 payment 轉為列表
    const itemsToRender = previewDoc?.selectedItems || (previewDoc?.payment ? [previewDoc.payment] : []);

    if (!activeVehicle) return null; 

    const safeVehicleId = activeVehicle.id || 'DRAFT';
    const displayId = safeVehicleId.length > 6 ? safeVehicleId.slice(0, 6) : safeVehicleId;
    const curCustomer = { name: activeVehicle.customerName || customer.name || '', phone: activeVehicle.customerPhone || customer.phone || '', hkid: activeVehicle.customerID || customer.hkid || '', address: activeVehicle.customerAddress || customer.address || '' };
    const today = formatDate(new Date()); 
    
    // 計算本次單據總金額
    const currentDocTotal = itemsToRender.reduce((sum, item) => {
        // 判斷是 Payment 還是 CrossBorderTask
        const amt = (item as any).amount !== undefined ? (item as any).amount : (item as any).fee;
        return sum + (amt || 0);
    }, 0);

    const Header = ({ titleEn, titleCh }: { titleEn: string, titleCh: string }) => (
        <div className="mb-8"><div className="flex items-start justify-between border-b-2 border-black pb-4 mb-2"><div className="w-24 h-24 flex-shrink-0 mr-4 flex items-center justify-center border border-gray-200 bg-white rounded-lg overflow-hidden relative"><img src={COMPANY_INFO.logo_url} alt="Logo" className="w-full h-full object-contain p-1" onError={(e) => { e.currentTarget.style.display='none'; }}/><div className="absolute inset-0 flex items-center justify-center -z-10 text-gray-200"><Building2 size={32} /></div></div><div className="flex-1 text-right"><h1 className="text-3xl font-bold tracking-wide text-black">{COMPANY_INFO.name_en}</h1><h2 className="text-2xl font-bold text-gray-800 mb-2">{COMPANY_INFO.name_ch}</h2><div className="text-xs text-gray-600 space-y-1"><p>{COMPANY_INFO.address_en}</p><p>{COMPANY_INFO.address_ch}</p><p className="font-bold">Tel: {COMPANY_INFO.phone}</p></div></div></div><div className="text-center mt-6"><h2 className="text-xl font-bold uppercase underline decoration-2 underline-offset-4">{titleEn}</h2><h3 className="text-lg font-bold mt-1">{titleCh}</h3></div></div>
    ); 
    const VehicleTable = () => (<table className="w-full border-collapse border border-black mb-6 text-sm"><tbody><tr><td className="border border-black p-2 bg-gray-100 font-bold w-1/4">車牌號碼 (Reg. Mark)</td><td className="border border-black p-2 w-1/4 font-mono font-bold text-lg">{activeVehicle.regMark}</td><td className="border border-black p-2 bg-gray-100 font-bold w-1/4">製造年份 (Year)</td><td className="border border-black p-2 w-1/4">{activeVehicle.year}</td></tr><tr><td className="border border-black p-2 bg-gray-100 font-bold">廠名 (Make)</td><td className="border border-black p-2">{activeVehicle.make}</td><td className="border border-black p-2 bg-gray-100 font-bold">型號 (Model)</td><td className="border border-black p-2">{activeVehicle.model}</td></tr><tr><td className="border border-black p-2 bg-gray-100 font-bold">顏色 (Color)</td><td className="border border-black p-2">{activeVehicle.colorExt} / {activeVehicle.colorInt}</td><td className="border border-black p-2 bg-gray-100 font-bold">收購類別</td><td className="border border-black p-2">{activeVehicle.purchaseType === 'New' ? '新車' : (activeVehicle.purchaseType === 'Consignment' ? '寄賣' : '二手')}</td></tr><tr><td className="border border-black p-2 bg-gray-100 font-bold">底盤號碼 (Chassis)</td><td className="border border-black p-2 font-mono" colSpan={3}>{activeVehicle.chassisNo}</td></tr><tr><td className="border border-black p-2 bg-gray-100 font-bold">引擎號碼 (Engine)</td><td className="border border-black p-2 font-mono" colSpan={3}>{activeVehicle.engineNo}</td></tr></tbody></table>);

    if (activeType === 'sales_contract') return (
        <div className="max-w-[210mm] mx-auto bg-white p-10 min-h-[297mm] text-black relative">
            <Header titleEn="Sales & Purchase Agreement" titleCh="汽車買賣合約" />
            <div className="flex justify-between mb-4 text-sm border-b pb-2"><span>合約編號: <span className="font-mono font-bold">SLA-{today.replace(/\//g,'')}-{displayId}</span></span><span>日期: {today}</span></div>
            <div className="mb-6"><h3 className="font-bold border-b-2 border-gray-800 mb-2 bg-gray-100 p-1">甲、買方資料</h3><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-gray-500 text-xs">姓名</p><p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{curCustomer.name}</p></div><div><p className="text-gray-500 text-xs">電話</p><p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{curCustomer.phone}</p></div><div><p className="text-gray-500 text-xs">身份證</p><p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{curCustomer.hkid}</p></div><div className="col-span-2"><p className="text-gray-500 text-xs">地址</p><p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{curCustomer.address}</p></div></div></div>
            <div className="mb-6"><h3 className="font-bold border-b-2 border-gray-800 mb-2 bg-gray-100 p-1">乙、車輛資料</h3><VehicleTable /></div>
            <div className="mb-6"><h3 className="font-bold border-b-2 border-gray-800 mb-2 bg-gray-100 p-1">丙、交易款項</h3><div className="text-sm space-y-3 px-2"><div className="flex justify-between items-end border-b border-dotted border-gray-400 pb-1"><span>成交價:</span><span className="font-bold text-lg">{formatCurrency(activeVehicle.price || 0)}</span></div><div className="flex justify-between items-end border-b border-dotted border-gray-400 pb-1"><span>已付訂金/款項:</span><span className="text-lg">{formatCurrency((activeVehicle.payments || []).reduce((acc,p)=>acc+(p.amount||0),0))}</span></div><div className="flex justify-between items-end border-b-2 border-black pb-1 mt-2"><span className="font-bold">尚餘尾數:</span><span className="font-bold text-xl">{formatCurrency((activeVehicle.price || 0) - (activeVehicle.payments || []).reduce((acc,p)=>acc+(p.amount||0),0))}</span></div></div></div>
            <div className="mb-8 text-[11px] text-justify leading-relaxed text-gray-700"><h3 className="font-bold mb-1 text-sm text-black">條款及細則:</h3><ol className="list-decimal pl-4 space-y-1"><li>買方已親自驗收上述車輛，同意以「現狀」成交。</li><li>如買方悔約，賣方有權沒收所有訂金。</li><li>賣方保證上述車輛並無涉及任何未清之財務按揭。</li></ol></div>
            <div className="grid grid-cols-2 gap-16 mt-12"><div className="relative"><div className="border-t border-black pt-2 text-center"><p className="font-bold">賣方簽署及公司蓋印</p><p className="text-xs text-gray-500">Authorized Signature & Chop</p><p className="text-xs font-bold mt-1">For and on behalf of<br/>{COMPANY_INFO.name_en}</p></div><div className="mb-2 absolute -top-8 left-1/2 transform -translate-x-1/2"><SignedStamp /></div></div><div><div className="border-t border-black pt-2 text-center"><p className="font-bold">買方簽署</p><p className="text-xs text-gray-500">Purchaser Signature</p></div></div></div>
        </div>
    );

    // ★★★ 修改重點：Invoice / Receipt 渲染邏輯 (支援多筆項目) ★★★
    return (
        <div className="max-w-[210mm] mx-auto bg-white p-10 min-h-[297mm] text-black">
            <Header 
                titleEn={activeType === 'invoice' ? "INVOICE" : (activeType === 'receipt' ? "OFFICIAL RECEIPT" : "DOCUMENT")} 
                titleCh={activeType === 'invoice' ? "發票" : (activeType === 'receipt' ? "正式收據" : "文件")} 
            />
            
            <div className="flex justify-between mb-8 border p-4 rounded-lg bg-gray-50">
                <div className="flex-1">
                    <p className="text-gray-500 text-xs">Customer:</p>
                    <p className="font-bold text-lg mt-1">{curCustomer.name}</p>
                </div>
                <div className="text-right border-l pl-8 ml-8">
                    <div>
                        <p className="text-gray-500 text-xs">No.</p>
                        <p className="font-bold">
                            {activeType.toUpperCase().slice(0,3)}-{today.replace(/\//g,'')}-{displayId}
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs">Date</p>
                        <p className="font-bold">{today}</p>
                    </div>
                </div>
            </div>
            
            <VehicleTable />

            {/* 費用明細列表 */}
            <div className="mt-8 border-t-2 border-black pt-4">
               {itemsToRender.length > 0 ? (
                   <div>
                       <table className="w-full text-sm mb-4">
                           <thead className="border-b-2 border-gray-300">
                               <tr className="text-left">
                                   <th className="py-2">Description / Item (項目說明)</th>
                                   <th className="py-2 w-24">Date (日期)</th>
                                   <th className="py-2 text-right w-32">Amount (金額)</th>
                               </tr>
                           </thead>
                           <tbody>
                               {itemsToRender.map((item, idx) => {
                                   const desc = (item as any).note || (item as any).item || (item as any).type || 'Payment';
                                   const date = (item as any).date;
                                   const amt = (item as any).amount !== undefined ? (item as any).amount : (item as any).fee;
                                   
                                   return (
                                       <tr key={idx} className="border-b border-dashed border-gray-200">
                                           <td className="py-2">
                                               <div className="font-medium">{desc}</div>
                                               {(item as any).method && <div className="text-xs text-gray-500">Method: {(item as any).method}</div>}
                                           </td>
                                           <td className="py-2 text-gray-600 text-xs">{date}</td>
                                           <td className="py-2 text-right font-mono">{formatCurrency(amt || 0)}</td>
                                       </tr>
                                   );
                               })}
                           </tbody>
                           {/* 總計放在最後 */}
                           <tfoot>
                               <tr className="font-bold text-lg border-t-2 border-black">
                                   <td colSpan={2} className="py-4 text-right">Total (總計):</td>
                                   <td className="py-4 text-right">{formatCurrency(currentDocTotal)}</td>
                               </tr>
                           </tfoot>
                       </table>
                   </div>
               ) : (
                   <div className="flex justify-between items-center text-xl font-bold py-8 border-b">
                       <span>Total:</span>
                       <span>{formatCurrency(activeVehicle.price || 0)}</span>
                   </div>
               )}
            </div>

            {/* 新增：備註區間 */}
            <div className="mt-6 mb-8">
                <div className="text-xs font-bold text-gray-500 mb-1">Remarks (備註):</div>
                <div className="border border-gray-300 rounded p-2 h-20 bg-gray-50" contentEditable={true}></div>
            </div>

            <div className="mt-12 relative">
                <div className="border-t border-black pt-4 w-1/2 text-center">
                    <p>Authorized Signature</p>
                </div>
                <div className="absolute -top-8 left-10"><SignedStamp /></div>
            </div>
        </div>
    );
  };

//5.  --- 新增組件: BusinessProcessModule ---
// 請確保引入了 lucide-react 的圖標: Check, Clock, AlertCircle, FileText, Link, ArrowRight
// 需要傳入 props: db, staffId, appId, inventory, dbEntries (資料庫中心資料)

const BusinessProcessModule = ({ db, staffId, appId, inventory, dbEntries }: any) => {
    const [cases, setCases] = useState<ServiceCase[]>([]);
    const [selectedCase, setSelectedCase] = useState<ServiceCase | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    
    // 用於新建案件的 Form State
    const [newCaseVehicleId, setNewCaseVehicleId] = useState('');
    
    // 假設目前只有一個模板，未來可從 Settings 讀取
    const activeTemplate = HZMB_WORKFLOW; 

    // 1. 初始化讀取案件 (useEffect)
    useEffect(() => {
        if (!db || !staffId) return;
        const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
        // 這裡建立一個新的 collection 'service_cases'
        const q = query(collection(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'service_cases'), orderBy('updatedAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const list: ServiceCase[] = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() } as ServiceCase));
            setCases(list);
        });
        return () => unsub();
    }, [db, staffId]);

    // 2. 創建新案件
    const handleCreateCase = async () => {
        if (!newCaseVehicleId || !db) return;
        const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
        
        const newCase: any = {
            vehicleId: newCaseVehicleId,
            templateId: activeTemplate.id,
            status: 'Active',
            currentStepIndex: 0,
            startDate: new Date().toISOString().split('T')[0],
            stepsData: activeTemplate.steps.map(step => ({
                stepId: step.id,
                status: 'Pending',
                collectedDocs: [],
                fee: step.defaultFee,
                isPaid: false
            })),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // 將第一個步驟設為進行中
        newCase.stepsData[0].status = 'In Progress';
        newCase.stepsData[0].startDate = new Date().toISOString().split('T')[0];

        await addDoc(collection(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'service_cases'), newCase);
        setIsCreating(false);
        setNewCaseVehicleId('');
    };

    // 3. 更新步驟狀態邏輯
    const updateStep = async (caseId: string, stepIndex: number, updates: any) => {
        if (!db || !selectedCase) return;
        const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
        
        const newStepsData = [...selectedCase.stepsData];
        newStepsData[stepIndex] = { ...newStepsData[stepIndex], ...updates };
        
        // 自動判斷是否進入下一步
        let newIndex = selectedCase.currentStepIndex;
        if (updates.status === 'Done' && stepIndex === selectedCase.currentStepIndex) {
            // 完成當前步，開啟下一步
            if (newIndex < activeTemplate.steps.length - 1) {
                newIndex++;
                newStepsData[newIndex].status = 'In Progress';
                newStepsData[newIndex].startDate = new Date().toISOString().split('T')[0];
            } else {
               // 全部完成
               // 這裡可以加入邏輯：自動將狀態改為 Completed
            }
        }

        await updateDoc(doc(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'service_cases', caseId), {
            stepsData: newStepsData,
            currentStepIndex: newIndex,
            updatedAt: serverTimestamp()
        });
    };

    // 4. 輔助函數：從資料庫中心尋找相關文件
    const findRelatedDocs = (docNameKeyword: string, vehicleId: string) => {
        const vehicle = inventory.find((v:any) => v.id === vehicleId);
        if (!vehicle) return [];
        // 簡單關鍵字匹配，實際可加強
        return dbEntries.filter((entry:any) => {
            const matchName = entry.name.includes(vehicle.regMark) || entry.name.includes(vehicle.customerName);
            const matchType = entry.docType?.includes(docNameKeyword) || entry.tags?.includes(docNameKeyword);
            return matchName || matchType;
        });
    };

    return (
        <div className="flex h-full bg-slate-50 gap-4">
            {/* 左側：案件列表 */}
            <div className="w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-slate-100">
                    <h2 className="font-bold text-slate-700">辦理中案件</h2>
                    <button onClick={() => setIsCreating(true)} className="bg-slate-800 text-white p-1.5 rounded hover:bg-slate-700"><Plus size={18}/></button>
                </div>
                {isCreating && (
                    <div className="p-3 bg-blue-50 border-b animate-fade-in">
                        <label className="text-xs font-bold text-blue-800">選擇車輛開啟「{activeTemplate.name}」</label>
                        <select 
                            className="w-full mt-1 p-2 border rounded text-sm"
                            value={newCaseVehicleId}
                            onChange={(e) => setNewCaseVehicleId(e.target.value)}
                        >
                            <option value="">-- 請選擇 --</option>
                            {inventory.filter((v:any) => !cases.some(c => c.vehicleId === v.id && c.status === 'Active')).map((v:any) => (
                                <option key={v.id} value={v.id}>{v.regMark} - {v.make} {v.model}</option>
                            ))}
                        </select>
                        <div className="flex gap-2 mt-2">
                            <button onClick={handleCreateCase} className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded">確認開啟</button>
                            <button onClick={() => setIsCreating(false)} className="flex-1 bg-gray-200 text-gray-600 text-xs py-1.5 rounded">取消</button>
                        </div>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {cases.map(c => {
                        const v = inventory.find((car:any) => car.id === c.vehicleId);
                        const step = activeTemplate.steps[c.currentStepIndex];
                        return (
                            <div 
                                key={c.id} 
                                onClick={() => setSelectedCase(c)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedCase?.id === c.id ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="font-bold text-slate-800">{v?.regMark || 'Unknown'}</div>
                                    <div className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{c.status}</div>
                                </div>
                                <div className="text-xs text-slate-500 mt-1">{activeTemplate.name}</div>
                                <div className="mt-2 flex items-center text-xs font-medium text-blue-600">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></div>
                                    當前: {step?.stepName.split(' ')[1]}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 右側：流程詳情 (Visual Workflow) */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                {selectedCase ? (
                    <>
                        <div className="p-6 border-b bg-slate-50">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center">
                                        {inventory.find((v:any) => v.id === selectedCase.vehicleId)?.regMark} - 流程進度
                                    </h2>
                                    <p className="text-sm text-slate-500">{activeTemplate.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400">總耗時</p>
                                    <p className="font-mono font-bold text-lg">
                                        {Math.ceil((new Date().getTime() - new Date(selectedCase.startDate).getTime()) / (1000 * 3600 * 24))} 天
                                    </p>
                                </div>
                            </div>
                            
                            {/* 頂部箭頭流程圖 */}
                            <div className="flex items-center w-full overflow-x-auto pb-2 scrollbar-hide">
                                {activeTemplate.steps.map((step, idx) => {
                                    const stepData = selectedCase.stepsData[idx];
                                    const isCurrent = idx === selectedCase.currentStepIndex;
                                    const isDone = stepData.status === 'Done';
                                    
                                    return (
                                        <div key={step.id} className="flex items-center flex-shrink-0">
                                            <div className={`flex flex-col items-center w-32 px-2 relative`}>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2 border-2 transition-colors ${isDone ? 'bg-green-500 border-green-500 text-white' : (isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110' : 'bg-white border-gray-300 text-gray-400')}`}>
                                                    {isDone ? <CheckSquare size={14}/> : idx + 1}
                                                </div>
                                                <div className={`text-[10px] text-center font-bold ${isCurrent ? 'text-blue-700' : 'text-gray-500'}`}>{step.stepName.split(' ')[1]}</div>
                                                {isCurrent && <div className="text-[9px] text-blue-500 bg-blue-50 px-1 rounded mt-1">進行中</div>}
                                            </div>
                                            {idx < activeTemplate.steps.length - 1 && (
                                                <div className={`h-1 w-10 ${isDone ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 步驟詳細內容 */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                            {activeTemplate.steps.map((step, idx) => {
                                const stepData = selectedCase.stepsData[idx];
                                const isActive = idx === selectedCase.currentStepIndex;
                                if (idx > selectedCase.currentStepIndex) return null; // 只顯示到當前步驟

                                return (
                                    <div key={step.id} className={`mb-6 rounded-xl border overflow-hidden transition-all ${isActive ? 'bg-white shadow-lg border-blue-200 ring-1 ring-blue-100' : 'bg-gray-50 border-gray-200 opacity-80'}`}>
                                        <div className={`p-4 border-b flex justify-between items-center ${isActive ? 'bg-blue-50' : 'bg-gray-100'}`}>
                                            <h3 className="font-bold text-slate-800 flex items-center">
                                                <span className={`mr-2 w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${isActive ? 'bg-blue-600' : 'bg-gray-500'}`}>{idx+1}</span>
                                                {step.stepName}
                                            </h3>
                                            <div className="flex gap-2">
                                                {step.externalLink && (
                                                    <a href={step.externalLink} target="_blank" rel="noreferrer" className="flex items-center px-3 py-1 bg-white border border-blue-200 text-blue-600 text-xs rounded-full hover:bg-blue-50">
                                                        <ExternalLink size={12} className="mr-1"/> 開啟辦理網頁
                                                    </a>
                                                )}
                                                {isActive && (
                                                    <button 
                                                        onClick={() => updateStep(selectedCase.id, idx, { status: 'Done', completedDate: new Date().toISOString().split('T')[0] })}
                                                        className="flex items-center px-3 py-1 bg-green-600 text-white text-xs rounded-full hover:bg-green-700 shadow-sm"
                                                    >
                                                        <CheckSquare size={12} className="mr-1"/> 完成此步驟
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* 左：文件收集 */}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase flex items-center"><FileText size={12} className="mr-1"/> 所需文件 (Documents)</h4>
                                                <div className="space-y-2">
                                                    {step.requiredDocs.map(docReq => {
                                                        const isCollected = stepData.collectedDocs.includes(docReq);
                                                        // 模擬：尋找資料庫是否有此文件
                                                        const matchedDbEntries = findRelatedDocs(docReq, selectedCase.vehicleId);
                                                        
                                                        return (
                                                            <div key={docReq} className="flex justify-between items-center p-2 bg-slate-50 border rounded text-sm">
                                                                <span className={isCollected ? 'text-green-700 font-bold decoration-green-500' : 'text-gray-600'}>{docReq}</span>
                                                                {isCollected ? (
                                                                    <span className="text-green-600 text-xs flex items-center"><CheckCircle size={12} className="mr-1"/> 已存檔</span>
                                                                ) : (
                                                                    <div className="flex gap-1">
                                                                        {matchedDbEntries.length > 0 ? (
                                                                            <button 
                                                                                onClick={() => updateStep(selectedCase.id, idx, { collectedDocs: [...stepData.collectedDocs, docReq] })}
                                                                                className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200 hover:bg-blue-200"
                                                                            >
                                                                                連結資料庫 ({matchedDbEntries.length})
                                                                            </button>
                                                                        ) : (
                                                                           <span className="text-[10px] text-red-400">未在庫</span>
                                                                        )}
                                                                        <button 
                                                                            onClick={() => updateStep(selectedCase.id, idx, { collectedDocs: [...stepData.collectedDocs, docReq] })} // 簡化：直接標記
                                                                            className="text-[10px] bg-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-300"
                                                                        >
                                                                            手動確認
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* 右：費用與備註 */}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase flex items-center"><DollarSign size={12} className="mr-1"/> 費用與狀態 (Fees & Status)</h4>
                                                <div className="bg-yellow-50 p-3 rounded border border-yellow-100 space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-yellow-800">本環節費用</span>
                                                        <input 
                                                            type="number" 
                                                            value={stepData.fee}
                                                            onChange={(e) => updateStep(selectedCase.id, idx, { fee: Number(e.target.value) })}
                                                            className="w-20 p-1 text-right text-sm border rounded"
                                                            disabled={!isActive}
                                                        />
                                                    </div>
                                                    <label className="flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={stepData.isPaid}
                                                            onChange={(e) => updateStep(selectedCase.id, idx, { isPaid: e.target.checked })}
                                                            disabled={!isActive}
                                                            className="mr-2"
                                                        />
                                                        <span className={`text-sm font-bold ${stepData.isPaid ? 'text-green-600' : 'text-red-500'}`}>{stepData.isPaid ? '已付款 (Paid)' : '未付款 (Unpaid)'}</span>
                                                    </label>
                                                </div>
                                                <textarea 
                                                    className="w-full mt-2 p-2 text-sm border rounded h-16 resize-none"
                                                    placeholder="備註..."
                                                    value={stepData.notes || ''}
                                                    onChange={(e) => updateStep(selectedCase.id, idx, { notes: e.target.value })}
                                                    disabled={!isActive}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <Briefcase size={64} className="mb-4 opacity-20"/>
                        <p>請選擇或建立一個業務案件</p>
                    </div>
                )}
            </div>
        </div>
    );
};

  // 4. Create Document Module (開單系統) - 最終修復版 (Layout Fixed)
  const CreateDocModule = () => {
      const [selectedCarId, setSelectedCarId] = useState<string>('');
      const [docType, setDocType] = useState<DocType>('sales_contract');
      const [selectedItems, setSelectedItems] = useState<string[]>([]); // 儲存選中的項目 ID
      
      const vehicle = inventory.find(v => v.id === selectedCarId);
      
      // 整合所有可選項目 (一般收款 + 中港待收款)
      const allBillableItems = vehicle ? [
          // 1. 一般收款紀錄 (已收)
          ...(vehicle.payments || []).map(p => ({ 
              id: p.id, 
              date: p.date, 
              amount: p.amount, 
              type: 'payment', // 標記類型
              category: p.type, // 顯示類別 (Deposit, Balance...)
              desc: `[已收] ${p.type} (${p.method}) ${p.note ? '- ' + p.note : ''}`,
              raw: p // 保留原始物件
          })),
          // 2. 中港業務待收款 (未付)
          ...(vehicle.crossBorder?.tasks || []).filter(t => (t.fee || 0) !== 0 && !(vehicle.payments || []).some(p => p.relatedTaskId === t.id)).map(t => ({
              id: t.id,
              date: t.date,
              amount: t.fee,
              type: 'task', // 標記類型
              category: 'Service Fee',
              desc: `[待收] ${t.item} (${t.institution})`,
              raw: t // 保留原始物件
          }))
      ] : [];

      // 全選/取消全選
      const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
          if (e.target.checked) {
              setSelectedItems(allBillableItems.map(i => i.id));
          } else {
              setSelectedItems([]);
          }
      };

      // 單選
      const handleSelectItem = (id: string) => {
          if (selectedItems.includes(id)) {
              setSelectedItems(selectedItems.filter(i => i !== id));
          } else {
              setSelectedItems([...selectedItems, id]);
          }
      };

      const handlePrintDoc = () => {
          if(!vehicle) return;
          
          // 找出選中的項目原始物件
          // 使用 as any[] 規避 TypeScript 檢查，因為 openPrintPreview 已經更新
          const itemsToPrint: any[] = allBillableItems
              .filter(i => selectedItems.includes(i.id))
              .map(i => i.raw); 
          
          openPrintPreview(docType, vehicle, itemsToPrint);
      };

      return (
          // ★★★ 修改 Layout: flex flex-col h-full overflow-hidden 確保按鈕不會被推出去 ★★★
          <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex-none p-6 border-b border-slate-100 flex items-center">
                  <div className="p-2 bg-blue-50 rounded-lg mr-3">
                      <FileText className="text-blue-600" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">開立單據中心</h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Step 1: Select Vehicle */}
                  <div className="space-y-3">
                      <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">1. 選擇車輛 (Select Vehicle)</label>
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <select 
                              className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium text-slate-700"
                              value={selectedCarId}
                              onChange={(e) => { setSelectedCarId(e.target.value); setSelectedItems([]); }}
                          >
                              <option value="">-- 請選擇車輛 --</option>
                              {getSortedInventory().map(v => (
                                  <option key={v.id} value={v.id}>
                                      {v.regMark ? `[${v.regMark}]` : '[未出牌]'} {v.make} {v.model} ({v.year})
                                  </option>
                              ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                      </div>
                  </div>

                  {vehicle && (
                      <>
                          {/* Step 2: Select Doc Type */}
                          <div className="space-y-3">
                              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">2. 單據類型 (Document Type)</label>
                              <div className="grid grid-cols-3 gap-4">
                                  {[
                                      {id: 'sales_contract', label: '買賣合約', icon: FileText},
                                      {id: 'invoice', label: '發票 (Invoice)', icon: Receipt},
                                      {id: 'receipt', label: '收據 (Receipt)', icon: CheckSquare}
                                  ].map(type => {
                                      const Icon = type.icon;
                                      return (
                                          <button
                                              key={type.id}
                                              onClick={() => setDocType(type.id as any)}
                                              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                                                  docType === type.id 
                                                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                                                  : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                              }`}
                                          >
                                              <Icon size={24} className="mb-2" />
                                              <span className="font-bold">{type.label}</span>
                                          </button>
                                      )
                                  })}
                              </div>
                          </div>

                          {/* Step 3: Select Fees (Only for Invoice/Receipt) */}
                          {docType !== 'sales_contract' && (
                              <div className="space-y-3">
                                  <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">
                                      3. 選擇包含款項 (Select Items) <span className="text-slate-400 font-normal ml-2 text-xs">已選 {selectedItems.length} 項</span>
                                  </label>
                                  
                                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                                      <table className="w-full text-sm">
                                          <thead className="bg-slate-50 border-b border-slate-200">
                                              <tr>
                                                  <th className="p-3 w-12 text-center">
                                                      <input 
                                                          type="checkbox" 
                                                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                                          onChange={handleSelectAll}
                                                          checked={allBillableItems.length > 0 && selectedItems.length === allBillableItems.length}
                                                      />
                                                  </th>
                                                  <th className="p-3 text-left font-bold text-slate-600">日期</th>
                                                  <th className="p-3 text-left font-bold text-slate-600">類別</th>
                                                  <th className="p-3 text-left font-bold text-slate-600">項目說明</th>
                                                  <th className="p-3 text-right font-bold text-slate-600">金額</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                              {allBillableItems.map((item) => (
                                                  <tr 
                                                      key={item.id} 
                                                      className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${selectedItems.includes(item.id) ? 'bg-blue-50/30' : ''}`}
                                                      onClick={() => handleSelectItem(item.id)}
                                                  >
                                                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                                                          <input 
                                                              type="checkbox" 
                                                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                                              checked={selectedItems.includes(item.id)}
                                                              onChange={() => handleSelectItem(item.id)}
                                                          />
                                                      </td>
                                                      <td className="p-3 text-slate-500">{item.date}</td>
                                                      <td className="p-3">
                                                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                              item.type === 'payment' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                          }`}>
                                                              {item.category}
                                                          </span>
                                                      </td>
                                                      <td className="p-3 font-medium text-slate-700">{item.desc}</td>
                                                      <td className={`p-3 text-right font-mono font-bold ${item.amount < 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                                          {formatCurrency(item.amount)}
                                                      </td>
                                                  </tr>
                                              ))}
                                              {allBillableItems.length === 0 && (
                                                  <tr>
                                                      <td colSpan={5} className="p-8 text-center text-slate-400">
                                                          此車輛暫無任何相關款項紀錄
                                                      </td>
                                                  </tr>
                                              )}
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                          )}
                      </>
                  )}
              </div>

              {/* Action Button - Fixed at bottom */}
              {vehicle && (
                  <div className="flex-none p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                      <button 
                          onClick={handlePrintDoc}
                          disabled={docType !== 'sales_contract' && selectedItems.length === 0}
                          className={`
                              px-8 py-3 rounded-lg font-bold flex items-center shadow-lg transition-all transform active:scale-95
                              ${(docType !== 'sales_contract' && selectedItems.length === 0) 
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                                  : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:from-slate-800 hover:to-slate-700'}
                          `}
                      >
                          <Printer className="mr-2" size={20} />
                          產生並預覽 PDF
                      </button>
                  </div>
              )}
          </div>
      );
  };



  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 font-sans">
      <Sidebar 
      activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          staffId={staffId}
          setStaffId={setStaffId}/>

      <main className="flex-1 w-full min-w-0 md:ml-0 p-4 md:p-8 print:m-0 print:p-0 transition-all duration-300 flex flex-col h-screen overflow-hidden">
        <div className="md:hidden flex items-center justify-between mb-6 bg-white p-4 rounded-lg shadow-sm print:hidden flex-none"><button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-700"><Menu size={28} /></button><span className="font-bold text-lg text-slate-800">Gold Land</span><div className="w-7"></div></div>

        {isPreviewMode && (
          <div className="fixed top-0 left-0 right-0 bg-slate-800 text-white p-3 md:p-4 flex flex-col md:flex-row justify-between items-center z-50 shadow-xl print:hidden gap-3">
            <div className="font-bold flex items-center text-sm md:text-base"><FileText className="mr-2" /> 預覽文件</div>
            <div className="flex space-x-3 w-full md:w-auto"><button onClick={() => setIsPreviewMode(false)} className="flex-1 md:flex-none px-4 py-2 bg-gray-600 rounded hover:bg-gray-500 text-sm">返回</button><button onClick={handlePrint} className="flex-1 md:flex-none px-4 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400 flex items-center justify-center text-sm shadow-md"><Printer size={18} className="mr-2" /> 列印 / PDF</button></div>
          </div>
        )}

        {/* 修正：僅在預覽模式下打印文檔模板區域，且不為空時才佔位 */}
        <div className={`${isPreviewMode ? 'block mt-24 md:mt-16' : 'hidden'} ${isPreviewMode ? 'print:block' : 'print:hidden'} print:mt-0 flex-1 overflow-y-auto`}><div ref={printAreaRef} className="print:w-full"><DocumentTemplate /></div></div>

        {/* 修正：如果是報表模式 (reports)，則在打印時允許顯示主要內容區 */}
        <div className={`${isPreviewMode ? 'hidden' : 'block'} ${activeTab === 'reports' ? 'print:block' : 'print:hidden'} flex flex-col h-full overflow-hidden`}>
          
          {/* Modal for Add/Edit Vehicle */}
          {(activeTab === 'inventory_add' || editingVehicle) && <VehicleFormModal />}
          
          {/* Report Tab - 讓它內部也可以滾動 */}
          {activeTab === 'reports' && <div className="flex-1 overflow-y-auto"><ReportView /></div>}

          {/* Cross Border Tab - 讓它內部也可以滾動 */}
          {activeTab === 'cross_border' && <div className="flex-1 overflow-y-auto"><CrossBorderView /></div>}

          
          {/* Dashboard Tab - Split into Sections */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col h-full overflow-hidden space-y-4 animate-fade-in">
              <h2 className="text-2xl font-bold text-slate-800 flex-none">業務儀表板</h2>
              
              {/* 1. 原有的財務卡片 (Financial Cards) - 保持不變 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-none">
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500"><p className="text-xs text-gray-500 uppercase">庫存總值</p><p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalStockValue)}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500"><p className="text-xs text-gray-500 uppercase">未付費用</p><p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalPayable)}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500"><p className="text-xs text-gray-500 uppercase">應收尾數</p><p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalReceivable)}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500"><p className="text-xs text-gray-500 uppercase">本月銷售額</p><p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalSoldThisMonth)}</p></div>
              </div>

              {/* ★★★ 2. 新增：提醒中心 (Notification Center) - 列表滾動版 ★★★ */}
              {(() => {
                  // --- A. 處理資料庫文件提醒 (Database) ---
                  const docAlerts: any[] = [];
                  dbEntries.forEach(d => {
                      if (d.reminderEnabled && d.expiryDate) {
                          const days = getDaysRemaining(d.expiryDate);
                          if (days !== null && days <= 30) {
                              docAlerts.push({
                                  id: d.id,
                                  title: d.name,
                                  desc: d.docType || d.category,
                                  date: d.expiryDate,
                                  days: days,
                                  status: days < 0 ? 'expired' : 'soon',
                                  raw: d
                              });
                          }
                      }
                  });
                  // 排序：過期的排前面
                  docAlerts.sort((a, b) => a.days - b.days);

                  // --- B. 處理中港業務提醒 (Cross-Border) ---
                  const cbAlerts: any[] = [];
                  const cbDateFields = {
                      dateHkInsurance: '香港保險', dateReservedPlate: '留牌紙', dateBr: '商業登記(BR)',
                      dateLicenseFee: '香港牌費', dateMainlandJqx: '內地交強險', dateMainlandSyx: '內地商業險',
                      dateClosedRoad: '禁區紙', dateApproval: '批文卡', dateMainlandLicense: '內地行駛證',
                      dateHkInspection: '香港驗車'
                  };

                  inventory.filter(v => v.crossBorder?.isEnabled).forEach(v => {
                      // 檢查 10 個日期欄位
                      Object.entries(cbDateFields).forEach(([field, label]) => {
                          // @ts-ignore
                          const dateStr = v.crossBorder?.[field];
                          if (dateStr) {
                              const days = getDaysRemaining(dateStr);
                              if (days !== null && days <= 30) {
                                  cbAlerts.push({
                                      id: v.id, // 車輛 ID
                                      title: v.regMark || '未出牌',
                                      desc: label, // 項目名稱 (如：香港保險)
                                      date: dateStr,
                                      days: days,
                                      status: days < 0 ? 'expired' : 'soon',
                                      raw: v
                                  });
                              }
                          }
                      });
                  });
                  // 排序：過期的排前面
                  cbAlerts.sort((a, b) => a.days - b.days);

                  // 統計數字
                  const cbExpiredCount = cbAlerts.filter(a => a.status === 'expired').length;
                  const cbSoonCount = cbAlerts.filter(a => a.status === 'soon').length;
                  const docExpiredCount = docAlerts.filter(a => a.status === 'expired').length;
                  const docSoonCount = docAlerts.filter(a => a.status === 'soon').length;

                  // 共用的列表渲染組件
                  const AlertList = ({ items, onItemClick }: { items: any[], onItemClick: (item:any)=>void }) => (
                      <div className="flex-1 bg-black/20 rounded-lg overflow-hidden flex flex-col h-32 md:h-36">
                          {items.length > 0 ? (
                              <div className="overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/20">
                                  {items.map((item, idx) => (
                                      <div 
                                          key={`${item.id}-${idx}`}
                                          onClick={() => onItemClick(item)}
                                          className={`flex justify-between items-center p-2 rounded text-xs cursor-pointer transition-colors hover:bg-white/10 border-l-2 ${item.status === 'expired' ? 'border-red-500 bg-red-900/10' : 'border-amber-400 bg-amber-900/10'}`}
                                      >
                                          <div className="flex-1 min-w-0 mr-2">
                                              <div className="font-bold truncate text-white">{item.title}</div>
                                              <div className="text-white/60 truncate">{item.desc}</div>
                                          </div>
                                          <div className="text-right whitespace-nowrap">
                                              <div className={`font-bold ${item.status === 'expired' ? 'text-red-400' : 'text-amber-400'}`}>
                                                  {item.status === 'expired' ? `過期 ${Math.abs(item.days)}天` : `剩 ${item.days}天`}
                                              </div>
                                              <div className="text-white/40 scale-90">{item.date}</div>
                                          </div>
                                          <ArrowRight size={12} className="ml-2 text-white/30" />
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="flex items-center justify-center h-full text-white/30 text-xs italic">
                                  目前沒有需要提醒的項目
                              </div>
                          )}
                      </div>
                  );

                  return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-none">
                          {/* 1. 中港業務提醒卡片 */}
                          <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg p-4 text-white shadow-sm flex gap-4 relative overflow-hidden">
                              {/* 左側：統計 */}
                              <div className="w-1/3 flex flex-col justify-center z-10 border-r border-white/10 pr-4">
                                  <div className="flex items-center text-slate-300 text-xs uppercase font-bold mb-2"><Globe size={14} className="mr-1"/> 中港提醒</div>
                                  <div className="space-y-2">
                                      <div>
                                          <div className="text-2xl font-bold text-red-400 leading-none">{cbExpiredCount}</div>
                                          <div className="text-[10px] text-slate-400">過期項目</div>
                                      </div>
                                      <div>
                                          <div className="text-2xl font-bold text-amber-400 leading-none">{cbSoonCount}</div>
                                          <div className="text-[10px] text-slate-400">即將到期</div>
                                      </div>
                                  </div>
                              </div>
                              {/* 右側：滾動列表 */}
                              <AlertList 
                                  items={cbAlerts} 
                                  onItemClick={(item) => {
                                      // 跳轉邏輯：切換 Tab -> 設定選中車輛 ID -> 設定編輯車輛 (為了確保數據加載)
                                      setActiveTab('cross_border');
                                      setActiveCbVehicleId(item.id);
                                      // 這裡不需要 setEditingVehicle，因為 CrossBorderView 是靠 activeCbVehicleId 驅動的
                                      // 但如果是編輯車輛詳情，可以考慮: setEditingVehicle(item.raw);
                                  }} 
                              />
                              <Globe size={100} className="absolute -left-6 -bottom-6 text-slate-950 opacity-20 pointer-events-none" />
                          </div>

                          {/* 2. 資料庫文件提醒卡片 */}
                          <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-4 text-white shadow-sm flex gap-4 relative overflow-hidden">
                              {/* 左側：統計 */}
                              <div className="w-1/3 flex flex-col justify-center z-10 border-r border-white/10 pr-4">
                                  <div className="flex items-center text-blue-200 text-xs uppercase font-bold mb-2"><Database size={14} className="mr-1"/> 文件提醒</div>
                                  <div className="space-y-2">
                                      <div>
                                          <div className="text-2xl font-bold text-red-400 leading-none">{docExpiredCount}</div>
                                          <div className="text-[10px] text-blue-300">過期文件</div>
                                      </div>
                                      <div>
                                          <div className="text-2xl font-bold text-amber-400 leading-none">{docSoonCount}</div>
                                          <div className="text-[10px] text-blue-300">即將到期</div>
                                      </div>
                                  </div>
                              </div>
                              {/* 右側：滾動列表 */}
                              <AlertList 
                                  items={docAlerts} 
                                  onItemClick={(item) => {
                                      // 跳轉邏輯：切換 Tab -> 設定正在編輯的 Entry -> 開啟編輯模式
                                      setActiveTab('database');
                                      setEditingEntry(item.raw);
                                      setIsDbEditing(true);
                                  }} 
                              />
                              <Bell size={100} className="absolute -left-6 -bottom-6 text-blue-950 opacity-20 pointer-events-none" />
                          </div>
                      </div>
                  );
              })()}

              {/* Data Calculation & Tables (保持原有的車輛列表邏輯) */}
              {(() => {
                  const allVehicles = getSortedInventory();
                  const unfinished: Vehicle[] = [];
                  const finished: Vehicle[] = [];

                  allVehicles.forEach(car => {
                      const received = (car.payments || []).reduce((acc, p) => acc + (p.amount || 0), 0);
                      const balance = (car.price || 0) - received;
                      const hasUnpaidExpenses = (car.expenses || []).some(e => e.status === 'Unpaid');
                      
                      const isFinished = car.status === 'Sold' && balance <= 0 && !hasUnpaidExpenses;

                      if (isFinished) finished.push(car);
                      else unfinished.push(car);
                  });

                  const renderTableRows = (list: Vehicle[]) => list.map(car => {
                      const unpaidExps = (car.expenses || []).filter(e => e.status === 'Unpaid').length || 0;
                      const received = (car.payments || []).reduce((acc, p) => acc + (p.amount || 0), 0);
                      const balance = (car.price || 0) - received;
                      const cbTags = getCbTags(car.crossBorder?.ports);
                      
                      return (
                        <tr key={car.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-500 text-xs">{car.stockInDate || 'N/A'}</td>
                          <td className="p-3">
                              <span className={`px-2 py-1 rounded text-xs ${car.status === 'In Stock' ? 'bg-green-100 text-green-800' : (car.status === 'Sold' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-50 text-yellow-700')}`}>{car.status}</span>
                          </td>
                          <td className="p-3 font-medium">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                  <span>{car.regMark || '未出牌'}</span>
                                  <div className="flex gap-1">
                                    {car.crossBorder?.isEnabled && cbTags.map(tag => (
                                        <span key={tag.label} className={`text-[10px] px-1 rounded border ${tag.color} whitespace-nowrap`}>
                                            {tag.label}
                                        </span>
                                    ))}
                                    {car.crossBorder?.isEnabled && cbTags.length === 0 && <Globe size={12} className="text-blue-500"/>}
                                  </div>
                              </div>
                          </td>
                          <td className="p-3">
                              {car.year} {car.make} {car.model}
                              {car.engineSize ? <span className="text-xs text-gray-500 ml-1">({car.engineSize} {car.fuelType === 'Electric' ? 'KW' : 'cc'})</span> : ''}
                          </td>
                          <td className="p-3 font-bold text-yellow-600">{formatCurrency(car.price)}</td>
                          <td className="p-3 text-gray-500 text-xs">{car.licenseExpiry || '-'}</td>
                          <td className="p-3 text-right">
                              {unpaidExps > 0 && <span className="text-red-500 text-xs font-bold block">{unpaidExps} 筆未付</span>}
                              {balance > 0 && car.status !== 'In Stock' && <span className="text-blue-500 text-xs font-bold block">欠款 {formatCurrency(balance)}</span>}
                              {unpaidExps === 0 && (balance <= 0 || car.status === 'In Stock') && <span className="text-green-500 text-xs"><CheckCircle size={14} className="inline"/></span>}
                          </td>
                        </tr>
                      );
                  });

                  return (
                    <>
                      {/* Section 1: In Progress (Fixed Height) */}
                      <div className="bg-white rounded-lg shadow-sm p-4 flex-none flex flex-col overflow-hidden max-h-[35vh]">
                        <h3 className="font-bold mb-4 flex-none text-yellow-600 flex items-center"><AlertTriangle size={18} className="mr-2"/> 進行中的車輛 (In Progress)</h3>
                        <div className="flex-1 overflow-y-auto border rounded-lg">
                          <table className="w-full text-left text-sm whitespace-nowrap relative">
                            <thead className="sticky top-0 bg-yellow-50 z-10 shadow-sm text-yellow-800">
                                <tr className="border-b">
                                    <th className="p-3">入庫日</th>
                                    <th className="p-3">狀態</th>
                                    <th className="p-3">車牌</th>
                                    <th className="p-3">車型</th>
                                    <th className="p-3">售價</th>
                                    <th className="p-3">牌費到期</th>
                                    <th className="p-3 text-right">狀況</th>
                                </tr>
                            </thead>
                            <tbody>
                              {unfinished.length > 0 ? renderTableRows(unfinished) : <tr><td colSpan={7} className="p-4 text-center text-gray-400">目前沒有進行中的案件</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Section 2: Completed (Fills Remaining Space) */}
                      <div className="bg-white rounded-lg shadow-sm p-4 flex-1 flex flex-col overflow-hidden min-h-0">
                        <h3 className="font-bold mb-4 flex-none text-green-600 flex items-center"><CheckCircle size={18} className="mr-2"/> 已成交車輛 (Completed)</h3>
                        <div className="flex-1 overflow-y-auto border rounded-lg">
                          <table className="w-full text-left text-sm whitespace-nowrap relative">
                            <thead className="sticky top-0 bg-green-50 z-10 shadow-sm text-green-800">
                                <tr className="border-b">
                                    <th className="p-3">入庫日</th>
                                    <th className="p-3">狀態</th>
                                    <th className="p-3">車牌</th>
                                    <th className="p-3">車型</th>
                                    <th className="p-3">售價</th>
                                    <th className="p-3">牌費到期</th>
                                    <th className="p-3 text-right">狀況</th>
                                </tr>
                            </thead>
                            <tbody>
                              {finished.length > 0 ? renderTableRows(finished) : <tr><td colSpan={7} className="p-4 text-center text-gray-400">目前沒有已完成的案件</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  );
              })()}
            </div>
          )}

          {/* Inventory Tab - 固定頂部，Grid 滾動 */}
          {activeTab === 'inventory' && (
            <div className="flex flex-col h-full overflow-hidden space-y-4 animate-fade-in">
              {/* Header Controls */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 flex-none">
                  <h2 className="text-xl font-bold text-slate-800 whitespace-nowrap">車輛庫存 ({getSortedInventory().length})</h2>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                      <div className="relative flex-1 md:w-64">
                          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
                          <input 
                              type="text" 
                              placeholder="搜尋車牌、型號..." 
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full pl-9 pr-4 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
                          />
                      </div>
                      <button onClick={() => {setEditingVehicle({} as Vehicle); setActiveTab('inventory_add');}} className="bg-slate-900 text-white px-3 py-1.5 rounded text-sm flex items-center shadow-sm whitespace-nowrap"><Plus size={16} className="mr-1"/> 入庫</button>
                  </div>
              </div>
              
              {/* Filter Bar */}
              <div className="flex gap-2 overflow-x-auto pb-1 flex-none scrollbar-hide">
                  {['All', 'In Stock', 'Sold', 'Reserved'].map(s => (<button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${filterStatus === s ? 'bg-yellow-500 text-white shadow-sm' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}>{s === 'All' ? '全部' : s}</button>))}
              </div>

              {/* Grid Container - 捲動區域 */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-20">
                    {getSortedInventory().map((car) => { 
                        const received = (car.payments || []).reduce((acc, p) => acc + p.amount, 0) || 0; 
                        const balance = (car.price || 0) - received; 
                        
                        // ★★★ 獲取標籤 ★★★
                        const cbTags = getCbTags(car.crossBorder?.ports);

                        return (
                        <div key={car.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:border-yellow-400 transition group relative">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        {/* ★★★ 新增：顏色色塊 (Color Block) ★★★ */}
                                        <div 
                                            className="w-4 h-4 rounded-full border border-gray-300 shadow-sm flex-shrink-0" 
                                            style={{ backgroundColor: getColorHex(car.colorExt) }} 
                                            title={`外觀顏色: ${car.colorExt}`}
                                        />

                                        <span className="font-bold text-base text-slate-800">{car.regMark || '未出牌'}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${car.status==='In Stock'?'bg-green-50 text-green-700':(car.status==='Sold'?'bg-gray-100 text-gray-600':'bg-yellow-50 text-yellow-700')}`}>{car.status}</span>
                                        
                                        {/* 中港標籤 */}
                                        {car.crossBorder?.isEnabled && cbTags.map(tag => (
                                            <span key={tag.label} className={`text-[10px] px-1 rounded border ${tag.color}`}>
                                                {tag.label}
                                            </span>
                                        ))}
                                        {/* 如果啟用了但沒選口岸，才顯示地球 */}
                                        {car.crossBorder?.isEnabled && cbTags.length === 0 && <Globe size={14} className="text-blue-500"/>}
                                    </div>
                                    
                                    <div className="flex items-center text-sm font-medium text-gray-700 mb-1">
                                        {car.year} {car.make} {car.model}
                                    </div>

                                    {/* ★★★ 新增：波箱與動力顯示 (Transmission & Engine) ★★★ */}
                                    <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border">
                                            {car.transmission === 'Manual' ? '棍波 (MT)' : '自動波 (AT)'}
                                        </span>
                                        {car.engineSize ? (
                                            <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                {car.engineSize} {car.fuelType === 'Electric' ? 'KW' : 'cc'}
                                            </span>
                                        ) : ''}
                                    </div>

                                    {(car.status === 'Sold' || car.status === 'Reserved') && (<div className="mt-2 text-xs bg-slate-50 p-1 rounded inline-block border border-slate-100"><span className="text-green-600 mr-2">已收: {formatCurrency(received)}</span><span className={`font-bold ${balance > 0 ? 'text-red-500' : 'text-gray-400'}`}>餘: {formatCurrency(balance)}</span></div>)}
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-lg font-bold text-yellow-600">{formatCurrency(car.price)}</span>
                                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingVehicle(car)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" title="編輯/交易"><Edit size={14}/></button>
                                        <button onClick={() => deleteVehicle(car.id)} className="p-1.5 bg-red-50 hover:bg-red-100 rounded text-red-500" title="刪除"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        )})}
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && <div className="flex-1 overflow-y-auto"><SettingsManager /></div>}

        {activeTab === 'business' && (
             <BusinessProcessModule 
             db={db} 
            staffId={staffId} 
            appId={appId} 
            inventory={inventory} 
            dbEntries={dbEntries} 
            />
        )}

          {/* Create Doc Tab */}
          {activeTab === 'create_doc' && <CreateDocModule />}
          {/* ★★★ 新增：資料庫模塊渲染 ★★★ */}
          {activeTab === 'database' && <DatabaseModule 
          db={db}
                  staffId={staffId}
                  appId={appId}
                  settings={settings}
                  editingEntry={editingEntry}
                  setEditingEntry={setEditingEntry}
                  isDbEditing={isDbEditing}
                  setIsDbEditing={setIsDbEditing}
                  inventory={inventory}/>}
                  
        </div>
      </main>
    </div>
  );
}
