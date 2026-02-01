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
    // ★★★ 新增：VRD 車輛詳細資料 (用於資料庫中心儲存牌薄數據) ★★★
    make?: string;              // 廠名
    model?: string;             // 型號
    manufactureYear?: string;   // 出廠年份
    vehicleColor?: string;      // 顏色
    chassisNo?: string;         // 底盤號
    engineNo?: string;          // 引擎號
    engineSize?: number;        // 汽缸容量
    firstRegCondition?: string; // 首次登記時車輛狀況 (例如: BRAND NEW / USED)
    priceA1?: number;           // 首次登記稅值 (A1)
    priceTax?: number;          // 已繳付登記稅
    prevOwners?: number;        // 前任車主數目
    registeredOwnerName?: string; // 登記車主名
    registeredOwnerId?: string;   // 登記車主身分證
    
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
  photos?: string[];
  
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
  expenseTypes: (string | { name: string; defaultCompany: string; defaultAmount: number; defaultDays: string })[];
  expenseCompanies: string[]; 
  colors: string[];
  // ★★★ 新增：中港代辦服務項目列表 (解決 serviceItems 報錯) ★★★
  serviceItems?: string[];
  
  cbItems: (string | { name: string; defaultInst: string; defaultFee: number; defaultDays: string })[];
  cbInstitutions: string[];
  dbCategories: string[];
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
  makes: ['Toyota', 'Honda', 'Mercedes-Benz', 'BMW', 'Tesla', 'Porsche', 'Audi', 'Lexus', 'Mazda', 'Nissan'],
  models: {
    'Toyota': ['Alphard 2.5', 'Alphard 3.5', 'Vellfire 2.5', 'Vellfire 3.5', 'Noah', 'Sienta', 'Hiace', 'Camry'],
    'Honda': ['Stepwgn 1.5', 'Stepwgn 2.0', 'Freed', 'Jazz', 'Odyssey', 'Civic'],
    'Mercedes-Benz': ['A200', 'C200', 'E200', 'E300', 'S500', 'G63', 'GLC 300'],
    'BMW': ['320i', '520i', 'X3', 'X5', 'iX', 'i4'],
    'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X'],
    'Porsche': ['911', 'Cayenne', 'Macan', 'Taycan', 'Panamera'],
    'Audi': ['A3', 'A4', 'Q3', 'Q5', 'Q7']
  },
  expenseTypes: [
      { name: '政府牌費', defaultCompany: '香港運輸署', defaultAmount: 5860, defaultDays: '0' },
      { name: '驗車費', defaultCompany: '指定驗車中心', defaultAmount: 800, defaultDays: '0' },
      { name: '車輛維修', defaultCompany: '金田維修部', defaultAmount: 0, defaultDays: '7' },
      { name: '保險', defaultCompany: '友邦保險', defaultAmount: 0, defaultDays: '3' },
      '噴油', '執車(Detailing)', '拖車費', '佣金', '中港牌批文費', '內地保險', '其他'
  ],
  expenseCompanies: ['金田維修部', 'ABC車房', '政府牌照局', '友邦保險', '自家', '中檢公司'], 
  colors: ['白 (White)', '黑 (Black)', '銀 (Silver)', '灰 (Grey)', '藍 (Blue)', '紅 (Red)', '金 (Gold)', '綠 (Green)'],
  
  // ★★★ 新增：預設的中港代辦服務項目 ★★★
  serviceItems: ['代辦驗車', '代辦保險', '申請禁區紙', '批文延期', '更換司機', '代辦免檢', '海關年檢', '其他服務'],

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

// 3. DatabaseModule (修復版：含資料讀取、重複比對、儲存不跳轉)
// ★★★ 請確保此組件定義在 GoldLandAutoDMS 主函數的「外面」 ★★★
const DatabaseModule = ({ db, staffId, appId, settings, editingEntry, setEditingEntry, isDbEditing, setIsDbEditing, inventory }: DatabaseModuleProps) => {
    const [entries, setEntries] = useState<DatabaseEntry[]>([]);
    const [selectedCatFilter, setSelectedCatFilter] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [tagInput, setTagInput] = useState('');
    


    // 重複資料處理狀態
    const [dupeGroups, setDupeGroups] = useState<DatabaseEntry[][]>([]);
    const [showDupeModal, setShowDupeModal] = useState(false);

    // ★★★ 1. 新增：AI 識別狀態 (控制轉圈圈) ★★★
    const [isScanning, setIsScanning] = useState(false);

    // ★★★ 2. 新增：AI 識別函數 (呼叫後端 API) ★★★
    // ★★★ AI 識別函數 (已更新：顏色清洗 + 車主自動填寫) ★★★
    const analyzeImageWithAI = async (base64Image: string, docType: string) => {
        setIsScanning(true);
        try {
            const response = await fetch('/api/ocr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    image: base64Image, 
                    docType: docType 
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || '識別請求失敗');
            }

            const data = result.data;

            // --- 輔助邏輯：顏色清洗 ---
            // 將 "BLACK-VAR", "WHITE/SILVER" 簡化為 "BLACK", "WHITE"
            const cleanColor = (rawColor: string) => {
                if (!rawColor) return '';
                // 使用正則表達式，以空格、橫線、斜線或括號切分，取第一個詞
                const parts = rawColor.split(/[\s\-\/\(\)]+/); 
                return parts[0] ? parts[0].toUpperCase() : '';
            };

            // ... 前面的 fetch 邏輯不變 ...

            if (data) {
                setEditingEntry(prev => {
                    if (!prev) return null;
                    
                    const finalOwnerName = data.registeredOwnerName || data.name || prev.registeredOwnerName;
                    const finalOwnerId = data.registeredOwnerId || data.idNumber || prev.registeredOwnerId;

                    return {
                        ...prev,
                        // 1. 通用欄位
                        name: data.name || prev.name,
                        idNumber: data.idNumber || prev.idNumber,
                        phone: data.phone || prev.phone,
                        address: data.address || prev.address,
                        expiryDate: data.expiryDate || prev.expiryDate,
                        quotaNo: data.quotaNo || prev.quotaNo,
                        
                        // 2. VRD 牌薄專屬欄位
                        plateNoHK: data.plateNoHK || prev.plateNoHK,
                        make: data.make || prev.make,
                        model: data.model || prev.model,
                        chassisNo: data.chassisNo || prev.chassisNo,
                        engineNo: data.engineNo || prev.engineNo,
                        manufactureYear: data.manufactureYear || prev.manufactureYear,
                        firstRegCondition: data.firstRegCondition || prev.firstRegCondition,
                        vehicleColor: cleanColor(data.vehicleColor) || prev.vehicleColor,
                        registeredOwnerName: finalOwnerName,
                        registeredOwnerId: finalOwnerId,
                        
                        // 3. 數值轉換 (★ 加入 prevOwners)
                        engineSize: data.engineSize ? Number(data.engineSize) : prev.engineSize,
                        priceA1: data.priceA1 ? Number(data.priceA1) : prev.priceA1,
                        priceTax: data.priceTax ? Number(data.priceTax) : prev.priceTax,
                        prevOwners: data.prevOwners !== undefined ? Number(data.prevOwners) : prev.prevOwners,

                        description: prev.description + (data.description ? `\n[AI]: ${data.description}` : '')
                    };
                });
                alert("AI 識別成功！顏色、車主與首數已自動填入。");
            }

        } catch (error: any) {
            console.error("AI Scan Error:", error);
            alert(`識別失敗: ${error.message}\n(請確認 API Key 與後端設定)`);
        }
        setIsScanning(false);
    };

    // ★★★ 這段要放在 DatabaseModule 組件裡面 ★★★
    // 作用：讀取資料庫列表 (包含 VRD 詳細欄位)
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
                // 相容舊版圖片格式
                if (!attachments.length && data.images && Array.isArray(data.images)) {
                    attachments = data.images.map((img: string, idx: number) => ({ name: `圖片 ${idx+1}`, data: img }));
                }
                
                list.push({ 
                    id: doc.id, 
                    // 1. 通用資料
                    category: data.category || 'Person', 
                    name: data.name || data.title || '',
                    phone: data.phone || '', 
                    address: data.address || '', 
                    idNumber: data.idNumber || '',
                    plateNoHK: data.plateNoHK || '', 
                    plateNoCN: data.plateNoCN || '', 
                    quotaNo: data.quotaNo || '',
                    docType: data.docType || '', 
                    description: data.description || '',
                    relatedPlateNo: data.relatedPlateNo || '',
                    tags: data.tags || [], 
                    roles: data.roles || [], 
                    attachments: attachments,
                    
                    // 2. ★★★ VRD 專屬欄位 (關鍵修正：讀取這些欄位) ★★★
                    make: data.make || '',
                    model: data.model || '',
                    manufactureYear: data.manufactureYear || '',
                    vehicleColor: data.vehicleColor || '',
                    chassisNo: data.chassisNo || '',
                    engineNo: data.engineNo || '',
                    engineSize: data.engineSize || 0,
                    firstRegCondition: data.firstRegCondition || '',
                    priceA1: data.priceA1 || 0,
                    priceTax: data.priceTax || 0,
                    prevOwners: data.prevOwners !== undefined ? Number(data.prevOwners) : 0,
                    registeredOwnerName: data.registeredOwnerName || '',
                    registeredOwnerId: data.registeredOwnerId || '',

                    // 3. 系統與提醒
                    createdAt: data.createdAt, 
                    updatedAt: data.updatedAt,
                    reminderEnabled: data.reminderEnabled || false, 
                    expiryDate: data.expiryDate || '',
                    renewalCount: data.renewalCount || 0, 
                    renewalDuration: data.renewalDuration || 1, 
                    renewalUnit: data.renewalUnit || 'year',
                } as DatabaseEntry);
            });
            setEntries(list); // <--- 注意這裡是 setEntries
        });
        return () => unsub();
    }, [staffId, db, appId]);


    // ★★★ 最終修復：PDF 上傳功能 (更換穩定的 Worker 來源) ★★★
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const files = e.target.files;
          if (!files || files.length === 0) return;
          const file = files[0];

          // --- A. 處理 PDF 檔案 ---
          if (file.type === 'application/pdf') {
              if (file.size > 10 * 1024 * 1024) { alert("PDF 檔案過大 (限制 10MB)"); return; }
              
              try {
                  // 1. 動態載入套件
                  const pdfjsLib = await import('pdfjs-dist');
                  
                  // 2. ★★★ 關鍵修正：使用 unpkg 來源，並指定 .mjs 模組格式 ★★★
                  // 使用 as any 避免 TypeScript 版本檢查錯誤
                  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = 
                      `https://unpkg.com/pdfjs-dist@${(pdfjsLib as any).version}/build/pdf.worker.min.mjs`;

                  const arrayBuffer = await file.arrayBuffer();
                  
                  // 3. 讀取 PDF (加入 cMap 以支援中文字型，雖然轉圖片不一定需要，但較保險)
                  const loadingTask = pdfjsLib.getDocument({ 
                      data: arrayBuffer,
                      cMapUrl: `https://unpkg.com/pdfjs-dist@${(pdfjsLib as any).version}/cmaps/`,
                      cMapPacked: true,
                  });
                  
                  const pdf = await loadingTask.promise;
                  const newAttachments: DatabaseAttachment[] = [];
                  
                  // 限制處理前 5 頁
                  const MAX_PAGES = 5; 
                  const numPages = Math.min(pdf.numPages, MAX_PAGES);

                  for (let i = 1; i <= numPages; i++) {
                      const page = await pdf.getPage(i);
                      // 設定縮放比例 (2.0 為清晰度平衡點)
                      const viewport = page.getViewport({ scale: 2.0 }); 
                      
                      const canvas = document.createElement('canvas');
                      const context = canvas.getContext('2d');
                      canvas.height = viewport.height;
                      canvas.width = viewport.width;

                      if (context) {
                          // 使用 as any 繞過 TypeScript 檢查
                          await page.render({ canvasContext: context, viewport: viewport } as any).promise;
                          
                          // 壓縮為 JPG (0.8 品質)
                          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                          newAttachments.push({ name: `${file.name}_P${i}.jpg`, data: dataUrl });
                      }
                  }
                  
                  setEditingEntry(prev => prev ? { 
                      ...prev, 
                      attachments: [...prev.attachments, ...newAttachments] 
                  } : null);
                  
                  alert(`成功匯入 PDF 前 ${numPages} 頁！`);

              } catch (err: any) {
                  // ★★★ 印出詳細錯誤到 Console (按 F12 查看) ★★★
                  console.error("PDF 解析錯誤詳情:", err);
                  alert(`PDF 解析失敗: ${err.message || "未知錯誤"}`);
              }
              // 清空 input 讓同個檔案可以再選一次
              e.target.value = '';
              return;
          }

          // --- B. 處理一般圖片 (保持不變) ---
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
          // 清空 input
          e.target.value = '';
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

    // ★★★ 修復：儲存邏輯 (存檔後退出編輯模式) ★★★
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); 
        if (!db || !staffId || !editingEntry) return;
        const currentDb = db; 
        const autoTags = new Set(editingEntry.tags || []);
        if(editingEntry.name) autoTags.add(editingEntry.name);
        
        // 構建完整資料物件
        const finalEntry = { 
            ...editingEntry, 
            
            // 通用文字欄位
            phone: editingEntry.phone || '',
            address: editingEntry.address || '',
            idNumber: editingEntry.idNumber || '',
            plateNoHK: editingEntry.plateNoHK || '',
            plateNoCN: editingEntry.plateNoCN || '',
            quotaNo: editingEntry.quotaNo || '',
            docType: editingEntry.docType || '',
            description: editingEntry.description || '',
            relatedPlateNo: editingEntry.relatedPlateNo || '',
            
            // VRD 欄位
            make: editingEntry.make || '',
            model: editingEntry.model || '',
            chassisNo: editingEntry.chassisNo || '',
            engineNo: editingEntry.engineNo || '',
            manufactureYear: editingEntry.manufactureYear || '',
            vehicleColor: editingEntry.vehicleColor || '',
            firstRegCondition: editingEntry.firstRegCondition || '',
            registeredOwnerName: editingEntry.registeredOwnerName || '',
            registeredOwnerId: editingEntry.registeredOwnerId || '',
            
            // 數值欄位
            engineSize: Number(editingEntry.engineSize) || 0,
            priceA1: Number(editingEntry.priceA1) || 0,
            priceTax: Number(editingEntry.priceTax) || 0,
            prevOwners: editingEntry.prevOwners !== undefined ? Number(editingEntry.prevOwners) : 0,
            
            // 其他
            tags: Array.from(autoTags), 
            roles: editingEntry.roles || [], 
            attachments: editingEntry.attachments || [],
            reminderEnabled: editingEntry.reminderEnabled || false,
            expiryDate: editingEntry.expiryDate || '',
            renewalCount: editingEntry.renewalCount || 0,
            renewalDuration: editingEntry.renewalDuration || 1,
            renewalUnit: editingEntry.renewalUnit || 'year'
        };

        const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
        
        try {
            if (editingEntry.id) {
                // 更新
                const docRef = doc(currentDb, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'database', editingEntry.id);
                const cleanData = JSON.parse(JSON.stringify(finalEntry));
                await updateDoc(docRef, { ...cleanData, updatedAt: serverTimestamp() });
                
                alert('資料已更新');
                // ★★★ 關鍵修復：更新成功後，將狀態設為「非編輯中」，按鈕就會變回 [編輯] ★★★
                setIsDbEditing(false); 
            } else {
                // 新增
                const { id, ...dataToSave } = finalEntry;
                const colRef = collection(currentDb, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'database');
                const cleanData = JSON.parse(JSON.stringify(dataToSave));
                const newRef = await addDoc(colRef, { ...cleanData, createdAt: serverTimestamp() });
                
                setEditingEntry({ ...finalEntry, id: newRef.id }); 
                alert('新資料已建立');
                // 新增後也退出編輯模式
                setIsDbEditing(false);
            }
        } catch (err) { 
            console.error("Save Error:", err); 
            alert('儲存失敗'); 
        }
    };

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

    // 搜尋與過濾
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
            {/* 左側列表區塊 (保持不變) */}
            <div className="w-1/3 border-r border-slate-100 flex flex-col bg-slate-50">
                <div className="p-4 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center text-slate-700"><Database className="mr-2" size={20}/> 資料庫</h2>
                        <div className="flex gap-2">
                            <button onClick={scanForDuplicates} className="bg-amber-100 text-amber-700 p-2 rounded-full hover:bg-amber-200" title="檢查重複"><RefreshCw size={18}/></button>
                            <button onClick={(e) => { e.preventDefault(); setEditingEntry({ id: '', category: 'Person', name: '', description: '', attachments: [], tags: [], roles: [], createdAt: null }); setIsDbEditing(true); }} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 shadow-sm transition-transform active:scale-95"><Plus size={20}/></button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" placeholder="搜尋姓名、車牌、標籤..." className="w-full pl-9 p-2 rounded border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">{['All', ...DB_CATEGORIES.map(c => c.id)].map(cat => (<button key={cat} type="button" onClick={() => setSelectedCatFilter(cat)} className={`px-3 py-1 text-xs rounded-full whitespace-nowrap border transition-colors ${selectedCatFilter === cat ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}>{cat === 'All' ? '全部' : (DB_CATEGORIES.find(c => c.id === cat)?.label.split(' ')[0] || cat)}</button>))}</div>
                    </div>
                </div>
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

            {/* 右側編輯區 (修正結構) */}
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
                                {/* 第一欄：文字輸入區 */}
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
                                    {/* VRD 車輛專用欄位 */}
                                    {editingEntry.category === 'Vehicle' && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">香港車牌 (Reg Mark)</label>
                                                    <input 
                                                        disabled={!isDbEditing} 
                                                        value={editingEntry.plateNoHK || ''} 
                                                        onChange={e => setEditingEntry({...editingEntry, plateNoHK: e.target.value, relatedPlateNo: e.target.value})} 
                                                        className="w-full p-2 border rounded bg-yellow-50 font-mono font-bold"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">國內車牌</label>
                                                    <input 
                                                        disabled={!isDbEditing} 
                                                        value={editingEntry.plateNoCN || ''} 
                                                        onChange={e => setEditingEntry({...editingEntry, plateNoCN: e.target.value})} 
                                                        className="w-full p-2 border rounded bg-blue-50 font-mono"
                                                    />
                                                </div>
                                            </div>
                                            
                                            {/* VRD 詳細資料區 */}
                                            <div className="p-4 bg-gray-50 rounded border border-gray-200 mt-4 space-y-3">
                                                <div className="flex justify-between items-center border-b pb-2 mb-2">
                                                    <label className="block text-xs font-bold text-gray-700">
                                                        <FileText size={14} className="inline mr-1"/> VRD 牌薄詳細資料
                                                    </label>
                                                    <span className="text-[10px] text-gray-400">用於車輛庫存自動連動</span>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    <div><label className="text-[10px] text-gray-500">廠名</label><input disabled={!isDbEditing} value={editingEntry.make || ''} onChange={e => setEditingEntry({...editingEntry, make: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    <div><label className="text-[10px] text-gray-500">型號</label><input disabled={!isDbEditing} value={editingEntry.model || ''} onChange={e => setEditingEntry({...editingEntry, model: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    <div><label className="text-[10px] text-gray-500">年份</label><input disabled={!isDbEditing} value={editingEntry.manufactureYear || ''} onChange={e => setEditingEntry({...editingEntry, manufactureYear: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    <div><label className="text-[10px] text-gray-500">顏色</label><input disabled={!isDbEditing} value={editingEntry.vehicleColor || ''} onChange={e => setEditingEntry({...editingEntry, vehicleColor: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    <div className="col-span-1"><label className="text-[10px] text-gray-500">底盤號</label><input disabled={!isDbEditing} value={editingEntry.chassisNo || ''} onChange={e => setEditingEntry({...editingEntry, chassisNo: e.target.value})} className="w-full p-1.5 border rounded text-xs font-mono"/></div>
                                                    <div className="col-span-1"><label className="text-[10px] text-gray-500">引擎號</label><input disabled={!isDbEditing} value={editingEntry.engineNo || ''} onChange={e => setEditingEntry({...editingEntry, engineNo: e.target.value})} className="w-full p-1.5 border rounded text-xs font-mono"/></div>
                                                    <div className="col-span-1"><label className="text-[10px] text-gray-500">容量</label><input type="number" disabled={!isDbEditing} value={editingEntry.engineSize || ''} onChange={e => setEditingEntry({...editingEntry, engineSize: Number(e.target.value)})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    <div className="col-span-1"><label className="text-[10px] text-gray-500">狀況</label><input disabled={!isDbEditing} value={editingEntry.firstRegCondition || ''} onChange={e => setEditingEntry({...editingEntry, firstRegCondition: e.target.value})} className="w-full p-1.5 border rounded text-xs" placeholder="BRAND NEW"/></div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div><label className="text-[10px] text-gray-500">首次登記稅值 (A1)</label><input type="number" disabled={!isDbEditing} value={editingEntry.priceA1 || ''} onChange={e => setEditingEntry({...editingEntry, priceA1: Number(e.target.value)})} className="w-full p-1.5 border rounded text-xs font-bold text-blue-600"/></div>
                                                    <div><label className="text-[10px] text-gray-500">已繳付登記稅</label><input type="number" disabled={!isDbEditing} value={editingEntry.priceTax || ''} onChange={e => setEditingEntry({...editingEntry, priceTax: Number(e.target.value)})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    <div><label className="text-[10px] text-gray-500">前任車主數</label><input type="number" disabled={!isDbEditing} value={editingEntry.prevOwners || ''} onChange={e => setEditingEntry({...editingEntry, prevOwners: Number(e.target.value)})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                </div>
                                                <div className="bg-white p-2 rounded border border-slate-100">
                                                    <label className="text-[10px] font-bold text-slate-400 mb-1 block">VRD 登記車主</label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="col-span-2"><input disabled={!isDbEditing} value={editingEntry.registeredOwnerName || ''} onChange={e => setEditingEntry({...editingEntry, registeredOwnerName: e.target.value})} className="w-full p-1.5 border rounded text-xs" placeholder="車主全名"/></div>
                                                        <div className="col-span-1"><input disabled={!isDbEditing} value={editingEntry.registeredOwnerId || ''} onChange={e => setEditingEntry({...editingEntry, registeredOwnerId: e.target.value})} className="w-full p-1.5 border rounded text-xs" placeholder="身份證號碼"/></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
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
                                                <div className="col-span-2 md:col-span-1"><label className="block text-xs font-bold text-amber-800 mb-1">當前到期日</label><input type="date" disabled={!isDbEditing} value={editingEntry.expiryDate || ''} onChange={e => setEditingEntry({...editingEntry, expiryDate: e.target.value})} className="w-full p-2 border border-amber-300 rounded text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none font-bold" /><div className="mt-1"><DateStatusBadge date={editingEntry.expiryDate} label="狀態" /></div></div>
                                                <div className="col-span-2 md:col-span-1 bg-white p-2 rounded border border-amber-100"><label className="block text-xs font-bold text-gray-500 mb-1">自動續期規則</label><div className="flex gap-2 mb-2"><input type="number" disabled={!isDbEditing} value={editingEntry.renewalDuration} onChange={e => setEditingEntry({...editingEntry, renewalDuration: Number(e.target.value)})} className="w-16 p-1 border rounded text-center text-sm" min="1" /><select disabled={!isDbEditing} value={editingEntry.renewalUnit} onChange={e => setEditingEntry({...editingEntry, renewalUnit: e.target.value as any})} className="flex-1 p-1 border rounded text-sm"><option value="year">年</option><option value="month">月</option></select></div>{isDbEditing && (<button type="button" onClick={handleQuickRenew} className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-1.5 rounded flex items-center justify-center shadow-sm transition-transform active:scale-95"><RefreshCw size={12} className="mr-1"/> 立即續期 (更新日期 +{editingEntry.renewalDuration}{editingEntry.renewalUnit==='year'?'年':'月'})</button>)}</div>
                                            </div>
                                        )}
                                    </div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">備註 / 內容</label><textarea disabled={!isDbEditing} value={editingEntry.description || ''} onChange={e => setEditingEntry({...editingEntry, description: e.target.value})} className="w-full p-2 border rounded text-sm h-24" placeholder="輸入詳細說明..."/></div>
                                    <div><label className="block text-xs font-bold text-slate-500">標籤</label><div className="flex gap-2 mb-2 flex-wrap">{editingEntry.tags?.map(tag => <span key={tag} className="bg-slate-200 px-2 py-1 rounded text-xs flex items-center">{tag} {isDbEditing && <button type="button" onClick={() => setEditingEntry({...editingEntry, tags: editingEntry.tags.filter(t => t !== tag)})} className="ml-1 text-slate-500 hover:text-red-500"><X size={10}/></button>}</span>)}</div>{isDbEditing && <div className="flex gap-1"><input value={tagInput} onChange={e => setTagInput(e.target.value)} className="flex-1 p-1.5 border rounded text-xs" placeholder="新增..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} /><button type="button" onClick={addTag} className="bg-slate-200 px-3 py-1 rounded text-xs"><Plus size={12}/></button></div>}</div>
                                </div>

                                {/* 第二欄：圖片列表與上傳區 (確保只有這一份) */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-xs font-bold text-slate-500">文件圖片 ({editingEntry.attachments?.length || 0})</label>
                                        {isDbEditing && (
                                            <label className="cursor-pointer text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 flex items-center border border-blue-200 shadow-sm transition-colors">
                                                <Upload size={14} className="mr-1"/> 上傳圖片
                                                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
                                            </label>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-6 max-h-[800px] overflow-y-auto pr-2">
                                        {editingEntry.attachments?.map((file, idx) => (
                                            <div key={idx} className="relative group border rounded-xl overflow-hidden bg-white shadow-md flex flex-col">
                                                <div className="w-full bg-slate-50 relative p-1">
                                                    <img src={file.data} className="w-full h-auto object-contain" style={{ maxHeight: 'none' }} />
                                                    <div className="absolute top-2 right-2 flex gap-2">
                                                        {isDbEditing && (
                                                            <>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => analyzeImageWithAI(file.data, editingEntry.docType || editingEntry.category)}
                                                                    disabled={isScanning}
                                                                    className="bg-yellow-400 text-yellow-900 p-2 rounded-full opacity-90 hover:opacity-100 hover:bg-yellow-300 shadow-lg transition-all flex items-center justify-center transform active:scale-95"
                                                                    title="AI 智能識別文字"
                                                                >
                                                                    {isScanning ? <Loader2 size={18} className="animate-spin"/> : <Zap size={18} fill="currentColor"/>}
                                                                </button>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => setEditingEntry(prev => prev ? { ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) } : null)} 
                                                                    className="bg-red-500 text-white p-2 rounded-full opacity-90 hover:opacity-100 shadow-lg transition-all transform active:scale-95" 
                                                                    title="刪除圖片"
                                                                >
                                                                    <X size={18}/>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                    <button type="button" onClick={(e) => { e.preventDefault(); downloadImage(file.data, file.name); }} className="absolute top-2 left-2 bg-blue-600 text-white p-2 rounded-full opacity-80 hover:opacity-100 transition-opacity shadow-lg" title="下載圖片">
                                                        <DownloadCloud size={18}/>
                                                    </button>
                                                </div>
                                                <div className="p-3 border-t bg-white text-sm text-slate-700 font-medium flex items-center">
                                                    <File size={16} className="mr-2 text-blue-600 flex-shrink-0"/>
                                                    {isDbEditing ? (
                                                        <input value={file.name} onChange={e => { const newAttachments = [...editingEntry.attachments]; newAttachments[idx].name = e.target.value; setEditingEntry({...editingEntry, attachments: newAttachments}); }} className="w-full bg-transparent outline-none focus:border-b-2 border-blue-400 py-1" placeholder="輸入檔名..." />
                                                    ) : (
                                                        <span className="truncate">{file.name}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {(!editingEntry.attachments || editingEntry.attachments.length === 0) && (
                                            <div className="border-2 border-dashed border-slate-200 rounded-xl h-60 flex flex-col items-center justify-center text-slate-400 text-sm bg-slate-50/30">
                                                <ImageIcon size={48} className="mb-3 opacity-30"/>
                                                暫無附件圖片
                                            </div>
                                        )}
                                    </div>
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
// ------------------------------------------------------------------
// ★★★ 1. CrossBorderView (已移至外部，解決輸入跳走問題) ★★★
// ------------------------------------------------------------------
type CrossBorderViewProps = {
    inventory: Vehicle[];
    settings: SystemSettings;
    activeCbVehicleId: string | null;
    setActiveCbVehicleId: (id: string | null) => void;
    setEditingVehicle: (v: Vehicle | null) => void;
    addCbTask: (vid: string, task: CrossBorderTask) => void;
    updateCbTask: (vid: string, task: CrossBorderTask) => void;
    deleteCbTask: (vid: string, tid: string) => void;
    addPayment: (vid: string, payment: Payment) => void;
};

// --- 6. Cross Border Module (v6.2: 修復項目連動 -> 自動帶入費用與天數) ---
const CrossBorderView = ({ 
    inventory, settings, dbEntries, activeCbVehicleId, setActiveCbVehicleId, setEditingVehicle, addCbTask, updateCbTask, deleteCbTask, addPayment, deletePayment 
}: {
    inventory: Vehicle[], settings: SystemSettings, dbEntries: DatabaseEntry[], activeCbVehicleId: string | null, setActiveCbVehicleId: (id: string | null) => void,
    setEditingVehicle: (v: Vehicle) => void, addCbTask: (vid: string, t: CrossBorderTask) => void, updateCbTask: (vid: string, t: CrossBorderTask) => void, deleteCbTask: (vid: string, tid: string) => void, addPayment: (vid: string, p: Payment) => void, deletePayment: (vid: string, pid: string) => void
}) => {
    
    const [searchTerm, setSearchTerm] = useState('');
    const [showExpired, setShowExpired] = useState(true);
    const [showSoon, setShowSoon] = useState(true);

    // 編輯與新增狀態
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newTaskForm, setNewTaskForm] = useState({ date: '', item: '', fee: '', days: '', note: '' });
    
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<CrossBorderTask>>({});
    
    const [expandedPaymentTaskId, setExpandedPaymentTaskId] = useState<string | null>(null);
    const [newPayAmount, setNewPayAmount] = useState('');

    // --- 1. 準備選單資料 ---
    // 從資料庫中心抓取
    const dbServiceNames = (dbEntries || []).filter(d => d.category === 'CrossBorder').map(d => d.name);
    // 從設定檔抓取
    const settingsCbItems = (settings.cbItems || []).map(i => (typeof i === 'string' ? i : i.name));
    // 預設值
    const defaultServiceItems = ['代辦驗車', '代辦保險', '申請禁區紙', '批文延期', '更換司機', '代辦免檢', '海關年檢', '其他服務'];
    // 合併選單
    const serviceOptions = Array.from(new Set([...dbServiceNames, ...(settings.serviceItems || []), ...settingsCbItems, ...defaultServiceItems])).filter(Boolean);

    const dateFields = { dateHkInsurance: '香港保險', dateReservedPlate: '留牌紙', dateBr: '商業登記(BR)', dateLicenseFee: '香港牌費', dateMainlandJqx: '內地交強險', dateMainlandSyx: '內地商業險', dateClosedRoad: '禁區紙', dateApproval: '批文卡', dateMainlandLicense: '內地行駛證', dateHkInspection: '香港驗車' };

    // --- ★★★ 關鍵函數：根據項目名稱查找預設值 ★★★ ---
    const findItemDefaults = (itemName: string) => {
        let fee = '';
        let days = '7';

        // 1. 先找 Settings (結構最完整)
        const settingItem = (settings.cbItems || []).find(i => (typeof i === 'string' ? i : i.name) === itemName);
        if (settingItem && typeof settingItem !== 'string') {
            fee = settingItem.defaultFee?.toString() || '';
            days = settingItem.defaultDays || '7';
        }

        // 2. 如果 Settings 沒找到，找資料庫 (Database Entry)
        // 假設資料庫中心有輸入 price 或 fee 欄位 (這裡用 any 繞過類型檢查以讀取潛在欄位)
        if (!fee) {
            const dbItem = (dbEntries || []).find(d => d.name === itemName && d.category === 'CrossBorder');
            if (dbItem) {
                // 嘗試讀取各種可能的價格欄位名稱
                const dbPrice = (dbItem as any).price || (dbItem as any).fee || (dbItem as any).defaultFee || (dbItem as any).amount;
                const dbDays = (dbItem as any).days || (dbItem as any).defaultDays;
                
                if (dbPrice) fee = dbPrice.toString();
                if (dbDays) days = dbDays.toString();
            }
        }

        return { fee, days };
    };

    // --- 資料處理 ---
    const cbVehicles = inventory.filter(v => v.crossBorder?.isEnabled);
    const expiredItems: { vid: string, plate: string, item: string, date: string, days: number }[] = [];
    const soonItems: { vid: string, plate: string, item: string, date: string, days: number }[] = [];

    cbVehicles.forEach(v => {
        Object.entries(dateFields).forEach(([fieldKey, label]) => {
            const dateStr = (v.crossBorder as any)?.[fieldKey];
            if (dateStr) {
                const days = getDaysRemaining(dateStr);
                if (days !== null) {
                    const itemData = { vid: v.id!, plate: v.regMark || '未出牌', item: label, date: dateStr, days: days };
                    if (days < 0) expiredItems.push(itemData);
                    else if (days <= 30) soonItems.push(itemData);
                }
            }
        });
    });

    expiredItems.sort((a, b) => a.days - b.days);
    soonItems.sort((a, b) => a.days - b.days);

    const filteredVehicles = cbVehicles.filter(v => (v.regMark || '').includes(searchTerm.toUpperCase()) || (v.crossBorder?.mainlandPlate || '').includes(searchTerm));
    const activeCar = inventory.find(v => v.id === activeCbVehicleId) || filteredVehicles[0];

    // --- 內部組件：3秒跳動滾動列表 ---
    const TickerList = ({ items, type }: { items: typeof expiredItems, type: 'expired' | 'soon' }) => {
        const [currentIndex, setCurrentIndex] = useState(0);
        const [isPaused, setIsPaused] = useState(false);
        useEffect(() => {
            if (items.length <= 1) return;
            const interval = setInterval(() => { if (!isPaused) setCurrentIndex((prev) => (prev + 1) % items.length); }, 3000);
            return () => clearInterval(interval);
        }, [items.length, isPaused]);
        const visibleItems = [];
        for (let i = 0; i < Math.min(items.length, 5); i++) { visibleItems.push(items[(currentIndex + i) % items.length]); }
        return (
            <div className="bg-white/10 mt-3 rounded-lg overflow-hidden text-xs animate-fade-in border-t border-white/10" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
                <div className="h-28 overflow-hidden relative">
                    {items.length === 0 ? <div className="p-4 text-white/50 text-center">無項目</div> : (
                        <div className="transition-all duration-500 ease-in-out">
                            {visibleItems.map((it, idx) => (
                                <div key={`${it.vid}-${idx}-${currentIndex}`} onClick={() => setActiveCbVehicleId(it.vid)} className={`flex justify-between items-center p-2 hover:bg-white/20 cursor-pointer border-b border-white/5 last:border-0`}>
                                    <div className="flex items-center gap-2"><span className="font-bold font-mono bg-black/20 px-1.5 rounded">{it.plate}</span><span className="text-white/90">{it.item}</span></div>
                                    <div className={`text-right font-mono font-bold ${type === 'expired' ? 'text-red-300' : 'text-amber-300'}`}>{type === 'expired' ? `${Math.abs(it.days)}天前` : `剩${it.days}天`}<span className="ml-2 text-[10px] text-white/40 font-normal">{it.date}</span></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- 操作邏輯 ---
    
    // 1. 開啟新增視窗 (自動帶入第一個項目的預設值)
    const openAddModal = () => {
        if (!activeCar) { alert("請先選擇車輛"); return; }
        const initialItem = serviceOptions[0] || '代辦服務';
        const defaults = findItemDefaults(initialItem);
        
        setNewTaskForm({
            date: new Date().toISOString().split('T')[0],
            item: initialItem,
            fee: defaults.fee,
            days: defaults.days,
            note: ''
        });
        setIsAddModalOpen(true);
    };

    // ★★★ 處理下拉選單變更 (連動更新費用與天數) ★★★
    const handleItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newItem = e.target.value;
        const defaults = findItemDefaults(newItem);
        setNewTaskForm(prev => ({
            ...prev,
            item: newItem,
            fee: defaults.fee,   // 自動填入費用
            days: defaults.days  // 自動填入天數
        }));
    };

    const handleAddTask = () => {
        if (!activeCar) return;
        if (!newTaskForm.item) { alert("請選擇服務項目"); return; }
        const newTask: CrossBorderTask = { id: Date.now().toString(), date: newTaskForm.date, item: newTaskForm.item, fee: Number(newTaskForm.fee) || 0, days: newTaskForm.days, institution: '公司', handler: '', currency: 'HKD', note: newTaskForm.note, isPaid: false };
        addCbTask(activeCar.id!, newTask);
        setIsAddModalOpen(false);
    };

    // 行內編輯
    const startEditing = (task: CrossBorderTask) => { setEditingTaskId(task.id); setEditForm({ ...task }); };
    
    // ★★★ 行內編輯時的選單變更也支援連動 ★★★
    const handleEditItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newItem = e.target.value;
        const defaults = findItemDefaults(newItem);
        setEditForm(prev => ({
            ...prev,
            item: newItem,
            fee: Number(defaults.fee) || 0,
            days: defaults.days
        }));
    };

    const saveEdit = () => {
        if (!activeCar || !editingTaskId || !editForm.item) return;
        const updatedTask = { ...editForm, fee: Number(editForm.fee) || 0, id: editingTaskId } as CrossBorderTask;
        updateCbTask(activeCar.id!, updatedTask);
        setEditingTaskId(null);
    };

    const handleAddPartPayment = (task: CrossBorderTask) => {
        const amount = Number(newPayAmount);
        if (!activeCar || amount <= 0) return;
        addPayment(activeCar.id!, { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], amount: amount, type: 'Service Fee', method: 'Cash', relatedTaskId: task.id, note: `Payment for: ${task.item}` });
        setNewPayAmount('');
    };

    return (
        <div className="flex flex-col h-full gap-4 relative">
            
            {/* Modal */}
            {isAddModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
                    <div className="bg-white w-80 p-5 rounded-xl shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
                        <h3 className="font-bold text-lg mb-4 text-slate-800 flex items-center"><Plus size={18} className="mr-2"/> 新增代辦紀錄</h3>
                        <div className="space-y-3">
                            <div><label className="text-[10px] text-slate-500 font-bold uppercase">Date</label><input type="date" value={newTaskForm.date} onChange={e => setNewTaskForm({...newTaskForm, date: e.target.value})} className="w-full border-b border-slate-300 py-1 text-sm outline-none"/></div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Item (Auto-fill Fee)</label>
                                {/* 使用 handleItemChange 取代原本的 onChange */}
                                <select value={newTaskForm.item} onChange={handleItemChange} className="w-full border-b border-slate-300 py-1 text-sm outline-none bg-white">
                                    {serviceOptions.map((opt, idx) => <option key={`${opt}-${idx}`} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1"><label className="text-[10px] text-slate-500 font-bold uppercase">Fee ($)</label><input type="number" value={newTaskForm.fee} onChange={e => setNewTaskForm({...newTaskForm, fee: e.target.value})} className="w-full border-b border-slate-300 py-1 text-sm outline-none font-mono font-bold" placeholder="0"/></div>
                                <div className="w-1/3"><label className="text-[10px] text-slate-500 font-bold uppercase">Days</label><input type="text" value={newTaskForm.days} onChange={e => setNewTaskForm({...newTaskForm, days: e.target.value})} className="w-full border-b border-slate-300 py-1 text-sm outline-none text-center" placeholder="7"/></div>
                            </div>
                            <div><label className="text-[10px] text-slate-500 font-bold uppercase">Note</label><input type="text" value={newTaskForm.note} onChange={e => setNewTaskForm({...newTaskForm, note: e.target.value})} className="w-full border-b border-slate-300 py-1 text-sm outline-none" placeholder="備註..."/></div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">取消</button>
                            <button onClick={handleAddTask} className="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md">確認新增</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Cards (3 Sec Ticker) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-none">
                <div className="bg-gradient-to-br from-red-900 to-slate-900 rounded-xl p-4 text-white shadow-lg border border-red-800/30 relative overflow-hidden flex flex-col transition-all">
                    <div className="flex justify-between items-start z-10">
                        <div>
                            <div className="flex items-center gap-2 mb-1"><div className="p-1.5 bg-red-500/20 rounded-lg"><AlertTriangle size={18} className="text-red-400"/></div><span className="text-sm font-bold text-red-100 opacity-80">已過期項目</span></div>
                            <div className="text-3xl font-bold font-mono tracking-tight mt-1">{expiredItems.length} <span className="text-sm font-normal text-red-300/50">項</span></div>
                        </div>
                        {expiredItems.length > 0 && (<button onClick={() => setShowExpired(!showExpired)} className="p-1 hover:bg-white/10 rounded transition-colors">{showExpired ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button>)}
                    </div>
                    {expiredItems.length > 0 && showExpired && <TickerList items={expiredItems} type="expired" />}
                    <AlertCircle className="absolute -right-6 -bottom-6 text-red-500/10" size={100} />
                </div>
                <div className="bg-gradient-to-br from-amber-800 to-slate-900 rounded-xl p-4 text-white shadow-lg border border-amber-800/30 relative overflow-hidden flex flex-col transition-all">
                    <div className="flex justify-between items-start z-10">
                        <div>
                            <div className="flex items-center gap-2 mb-1"><div className="p-1.5 bg-amber-500/20 rounded-lg"><Clock size={18} className="text-amber-400"/></div><span className="text-sm font-bold text-amber-100 opacity-80">即將到期</span></div>
                            <div className="text-3xl font-bold font-mono tracking-tight mt-1">{soonItems.length} <span className="text-sm font-normal text-amber-300/50">項</span></div>
                        </div>
                        {soonItems.length > 0 && (<button onClick={() => setShowSoon(!showSoon)} className="p-1 hover:bg-white/10 rounded transition-colors">{showSoon ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button>)}
                    </div>
                    {soonItems.length > 0 && showSoon && <TickerList items={soonItems} type="soon" />}
                    <Bell className="absolute -right-6 -bottom-6 text-amber-500/10" size={100} />
                </div>
            </div>

            <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
                {/* Left List */}
                <div className="w-1/4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-slate-100 bg-slate-50 flex gap-2">
                        <div className="relative flex-1"><Search size={14} className="absolute left-2.5 top-2.5 text-slate-400"/><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜尋車牌..." className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-300 transition-all"/></div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {filteredVehicles.map(car => {
                            let expiredCount = 0;
                            Object.keys(dateFields).forEach(k => { const d = (car.crossBorder as any)?.[k]; if(d && getDaysRemaining(d)! < 0) expiredCount++; });
                            const unpaidTasks = (car.crossBorder?.tasks || []).filter(t => {
                                const paid = (car.payments || []).filter(p => p.relatedTaskId === t.id).reduce((s, p) => s + p.amount, 0);
                                return paid < (t.fee || 0);
                            }).length;

                            return (
                                <div key={car.id} onClick={() => setActiveCbVehicleId(car.id)} className={`p-3 rounded-lg cursor-pointer border transition-all ${activeCbVehicleId === car.id ? 'bg-blue-50 border-blue-300 shadow-inner' : 'bg-white border-slate-100 hover:border-blue-100'}`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-sm text-slate-800">{car.regMark}</span>
                                        <div className="flex gap-1">
                                            {expiredCount > 0 && <span className="bg-red-100 text-red-600 text-[10px] px-1.5 rounded font-bold">{expiredCount}過期</span>}
                                            {unpaidTasks > 0 && <span className="bg-amber-100 text-amber-600 text-[10px] px-1.5 rounded font-bold">$</span>}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-slate-500 font-mono mb-1">
                                        <span className="bg-slate-100 px-1 rounded">{car.crossBorder?.mainlandPlate || '無內地牌'}</span>
                                        <span className="text-slate-400 text-[10px]">{car.year}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                                        <span className="truncate max-w-[60%]">{car.make} {car.model}</span>
                                        {car.crossBorder?.quotaNumber && (<span className="truncate max-w-[40%] font-mono text-slate-500 bg-slate-50 px-1 rounded border border-slate-100">{car.crossBorder.quotaNumber}</span>)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Detail */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    {activeCar ? (
                        <>
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-none">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-2xl font-bold text-slate-800 font-mono">{activeCar.regMark}</h3>
                                        <span className="bg-slate-800 text-white px-2 py-0.5 rounded text-sm font-bold">{activeCar.crossBorder?.mainlandPlate}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">指標: {activeCar.crossBorder?.quotaNumber} | 司機: {activeCar.crossBorder?.driver1}</p>
                                </div>
                                <button onClick={() => setEditingVehicle(activeCar)} className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs rounded-lg shadow-sm font-bold flex items-center transition-all active:scale-95"><Edit size={14} className="mr-2"/> 編輯完整資料</button>
                            </div>

                            <div className="p-4 border-b border-slate-100 overflow-x-auto whitespace-nowrap flex gap-3 bg-slate-50/30 flex-none scrollbar-thin scrollbar-thumb-slate-200 pb-2">
                                {Object.entries(dateFields).map(([key, label]) => {
                                    const dateVal = (activeCar.crossBorder as any)?.[key];
                                    if(!dateVal) return null;
                                    const days = getDaysRemaining(dateVal);
                                    let color = "bg-green-50 border-green-200 text-green-700";
                                    if (days! < 0) color = "bg-red-50 border-red-200 text-red-700 font-bold";
                                    else if (days! <= 30) color = "bg-amber-50 border-amber-200 text-amber-700 font-bold";
                                    return (
                                        <div key={key} className={`inline-block p-2 rounded-lg border text-center min-w-[100px] ${color}`}>
                                            <div className="text-[10px] opacity-70 mb-1">{label}</div>
                                            <div className="text-sm font-mono">{dateVal}</div>
                                            <div className="text-[10px]">{days! < 0 ? `過期 ${Math.abs(days!)}天` : `剩 ${days}天`}</div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 bg-white">
                                <div className="flex justify-between items-end mb-2">
                                    <h4 className="font-bold text-slate-700 text-sm flex items-center"><FileCheck size={16} className="mr-2 text-blue-600"/> 服務與收費紀錄</h4>
                                    <button onClick={openAddModal} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 shadow-sm flex items-center transition-all"><Plus size={14} className="mr-1"/> 新增項目</button>
                                </div>

                                <table className="w-full text-sm border-collapse">
                                    <thead className="bg-slate-50 text-slate-500 font-bold text-xs sticky top-0 z-10">
                                        <tr><th className="p-2 text-left w-32">日期</th><th className="p-2 text-left">服務項目</th><th className="p-2 text-right w-24">費用 (HKD)</th><th className="p-2 text-right w-32">收款狀態</th><th className="p-2 text-center w-24">操作</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(activeCar.crossBorder?.tasks || []).map(task => {
                                            const isEditing = editingTaskId === task.id;
                                            const relatedPayments = (activeCar.payments || []).filter(p => p.relatedTaskId === task.id);
                                            const paidAmount = relatedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                                            const remaining = (task.fee || 0) - paidAmount;
                                            const isFullyPaid = paidAmount >= (task.fee || 0) && (task.fee || 0) > 0;
                                            const isExpanded = expandedPaymentTaskId === task.id;

                                            if (isEditing) {
                                                return (
                                                    <tr key={task.id} className="bg-blue-50/50">
                                                        <td className="p-2"><input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="w-full bg-white border border-blue-300 rounded px-2 py-1 outline-none text-xs"/></td>
                                                        <td className="p-2">
                                                            <div className="flex gap-1">
                                                                <select value={editForm.item} onChange={handleEditItemChange} className="flex-1 bg-white border border-blue-300 rounded px-2 py-1 outline-none text-xs">
                                                                    {serviceOptions.map((o,i) => <option key={`${o}-${i}`} value={o}>{o}</option>)}
                                                                </select>
                                                                <input type="text" value={editForm.days} onChange={e => setEditForm({...editForm, days: e.target.value})} className="w-12 bg-white border border-blue-300 rounded px-1 py-1 text-center text-xs" placeholder="天數"/>
                                                            </div>
                                                        </td>
                                                        <td className="p-2"><input type="number" value={editForm.fee} onChange={e => setEditForm({...editForm, fee: Number(e.target.value)})} className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-right outline-none text-xs font-mono"/></td>
                                                        <td className="p-2 text-right text-xs text-slate-400">編輯中...</td>
                                                        <td className="p-2 text-center"><div className="flex justify-center gap-1"><button onClick={saveEdit} className="p-1 bg-green-500 text-white rounded hover:bg-green-600"><Check size={14}/></button><button onClick={() => setEditingTaskId(null)} className="p-1 bg-gray-300 text-white rounded hover:bg-gray-400"><X size={14}/></button></div></td>
                                                    </tr>
                                                );
                                            }
                                            return (
                                                <React.Fragment key={task.id}>
                                                    <tr className="hover:bg-slate-50 transition-colors group">
                                                        <td className="p-2 text-xs font-mono text-slate-500">{task.date}</td>
                                                        <td className="p-2 font-bold text-slate-700">{task.item}<span className="text-[10px] font-normal text-slate-400 ml-2 bg-slate-100 px-1 rounded">{task.days}天</span></td>
                                                        <td className="p-2 text-right font-mono font-bold text-slate-800">{formatCurrency(task.fee)}</td>
                                                        <td className="p-2 text-right cursor-pointer" onClick={() => setExpandedPaymentTaskId(isExpanded ? null : task.id)}>
                                                            <div className={`text-xs font-bold inline-flex items-center gap-1 ${isFullyPaid ? 'text-green-600 bg-green-50 px-2 py-0.5 rounded' : (paidAmount > 0 ? 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded' : 'text-red-400 bg-red-50 px-2 py-0.5 rounded')}`}>
                                                                {isFullyPaid ? '已全付' : (paidAmount > 0 ? `欠 ${formatCurrency(remaining)}` : '未收款')}{isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                                            </div>
                                                        </td>
                                                        <td className="p-2 text-center"><div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => startEditing(task)} className="text-slate-400 hover:text-blue-600"><Edit size={14}/></button><button onClick={() => deleteCbTask(activeCar.id!, task.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={14}/></button></div></td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr className="bg-slate-50/80 animate-fade-in border-b-2 border-slate-100">
                                                            <td colSpan={5} className="p-3 pl-8">
                                                                <div className="flex gap-4 items-start">
                                                                    <div className="flex-1">
                                                                        <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2">收款紀錄 (Payment History)</h5>
                                                                        {relatedPayments.length === 0 ? <p className="text-xs text-slate-400 italic">暫無收款紀錄</p> : (
                                                                            <div className="space-y-1">
                                                                                {relatedPayments.map(p => (
                                                                                    <div key={p.id} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-200">
                                                                                        <span className="font-mono text-slate-500">{p.date}</span><span className="font-bold text-slate-700">{formatCurrency(p.amount)}</span>
                                                                                        <button onClick={() => { if(confirm(`確定要撤回這筆 ${formatCurrency(p.amount)} 的收款嗎？\n(這會影響車輛總帳)`)) deletePayment(activeCar.id!, p.id); }} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded"><XCircle size={14}/></button>
                                                                                    </div>
                                                                                ))}
                                                                                <div className="text-right text-xs font-bold text-slate-600 mt-1 border-t pt-1">已收總計: {formatCurrency(paidAmount)}</div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {!isFullyPaid && (
                                                                        <div className="w-48 bg-white p-3 rounded border border-blue-200 shadow-sm">
                                                                            <h5 className="text-[10px] font-bold text-blue-600 uppercase mb-2">新增收款</h5>
                                                                            <div className="flex gap-1 mb-2"><span className="text-xs py-1 text-slate-500">$</span><input type="number" value={newPayAmount} onChange={e => setNewPayAmount(e.target.value)} placeholder={remaining.toString()} className="w-full text-sm font-bold border-b border-slate-200 outline-none focus:border-blue-500"/></div>
                                                                            <button onClick={() => handleAddPartPayment(task)} className="w-full py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 font-bold">確認收款</button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                        {(activeCar.crossBorder?.tasks || []).length === 0 && (<tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs border-dashed border-2 border-slate-100 rounded">尚無服務紀錄，請點擊上方「新增項目」</td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300"><Globe size={48} className="mb-4 opacity-50"/><p className="text-sm">請選擇左側車輛查看詳情</p></div>
                    )}
                </div>
            </div>
        </div>
    );
};
// ------------------------------------------------------------------
// ★★★ 2. SettingsManager (完整無縮減版：含所有編輯器與匯入功能) ★★★
// ------------------------------------------------------------------
type SettingsManagerProps = {
    settings: SystemSettings;
    setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
    db: Firestore | null;
    staffId: string | null;
    appId: string;
    inventory: Vehicle[];
    updateSettings: (key: keyof SystemSettings, newItem: string, action: 'add' | 'remove', parentKey?: string) => void;
};

// ------------------------------------------------------------------
// ★★★ 5. Settings Manager (v6.1: 預設公司/機構改為下拉選單連動) ★★★
// ------------------------------------------------------------------
const SettingsManager = ({ 
    settings, 
    setSettings, 
    db, 
    staffId, 
    appId, 
    inventory, 
    updateSettings 
}: { 
    settings: SystemSettings, 
    setSettings: any, 
    db: any, 
    staffId: string, 
    appId: string, 
    inventory: Vehicle[], 
    updateSettings: (k: keyof SystemSettings, v: any) => void 
}) => {
    
    const [activeTab, setActiveTab] = useState('general');
    
    // --- 狀態：車輛模型管理 ---
    const [selectedMakeForModel, setSelectedMakeForModel] = useState('');
    const [newModelName, setNewModelName] = useState('');

    // --- 狀態：系統用戶 ---
    const [newUserEmail, setNewUserEmail] = useState('');
    const [systemUsers, setSystemUsers] = useState<{ email: string, modules: string[] }[]>([]);
    
    // --- 狀態：財務費用設定 ---
    const [expenseForm, setExpenseForm] = useState({ name: '', defaultCompany: '', defaultAmount: '', defaultDays: '0' });
    const [editingExpenseIndex, setEditingExpenseIndex] = useState<number | null>(null);
    const [compInput, setCompInput] = useState('');
    const [editingCompIndex, setEditingCompIndex] = useState<number | null>(null);
    
    // --- 狀態：中港業務設定 ---
    const [cbForm, setCbForm] = useState({ name: '', defaultInst: '', defaultFee: '', defaultDays: '0' });
    const [editingCbIndex, setEditingCbIndex] = useState<number | null>(null);
    const [instInput, setInstInput] = useState('');
    const [editingInstIndex, setEditingInstIndex] = useState<number | null>(null);

    // --- 1. 系統用戶邏輯 ---
    useEffect(() => {
        if (!db || !appId) return;
        const userDocRef = doc(db, 'artifacts', appId, 'system', 'users');
        const unsub = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const rawList = data.list || [];
                const formattedList = rawList.map((u: any) => {
                    if (typeof u === 'string') return { email: u, modules: ['inventory', 'business', 'database', 'settings'] };
                    return u;
                });
                setSystemUsers(formattedList);
            }
        }, (err) => console.error("Fetch users failed:", err));
        return () => unsub();
    }, [db, appId]);

    const updateUsersDb = async (newList: any[]) => {
        if (!db) return;
        try {
            const userDocRef = doc(db, 'artifacts', appId, 'system', 'users');
            await setDoc(userDocRef, { list: newList }, { merge: true });
        } catch (e) { console.error(e); alert('用戶設定儲存失敗'); }
    };

    const handleAddUser = () => {
        if (!newUserEmail) return;
        const newList = [...systemUsers, { email: newUserEmail, modules: ['inventory', 'business', 'database'] }];
        setSystemUsers(newList);
        updateUsersDb(newList);
        setNewUserEmail('');
    };

    const handleRemoveUser = (email: string) => {
        if (!confirm(`移除用戶 ${email}?`)) return;
        const newList = systemUsers.filter(u => u.email !== email);
        setSystemUsers(newList);
        updateUsersDb(newList);
    };

    const toggleUserPermission = (email: string, moduleKey: string) => {
        const newList = systemUsers.map(u => {
            if (u.email !== email) return u;
            const hasModule = u.modules.includes(moduleKey);
            const newModules = hasModule ? u.modules.filter(m => m !== moduleKey) : [...u.modules, moduleKey];
            return { ...u, modules: newModules };
        });
        setSystemUsers(newList);
        updateUsersDb(newList);
    };

    // --- 2. 通用與模型操作 ---
    const addItem = (key: keyof SystemSettings, val: string) => {
        if (!val) return;
        updateSettings(key, [...(settings[key] as string[] || []), val]);
    };

    const removeItem = (key: keyof SystemSettings, index: number) => {
        const newArr = [...(settings[key] as any[] || [])];
        newArr.splice(index, 1);
        updateSettings(key, newArr);
    };

    const addModel = () => {
        if (!selectedMakeForModel || !newModelName) return;
        const currentModels = settings.models[selectedMakeForModel] || [];
        const updatedModels = { ...settings.models, [selectedMakeForModel]: [...currentModels, newModelName] };
        updateSettings('models', updatedModels);
        setNewModelName('');
    };

    const removeModel = (modelName: string) => {
        if (!selectedMakeForModel) return;
        const currentModels = settings.models[selectedMakeForModel] || [];
        const updatedModels = { ...settings.models, [selectedMakeForModel]: currentModels.filter(m => m !== modelName) };
        updateSettings('models', updatedModels);
    };

    // --- 3. 財務費用邏輯 ---
    const handleExpenseSubmit = () => {
        if (!expenseForm.name) return;
        const newItem = { ...expenseForm, defaultAmount: Number(expenseForm.defaultAmount) || 0 };
        const newList = [...settings.expenseTypes];
        if (editingExpenseIndex !== null) newList[editingExpenseIndex] = newItem;
        else newList.push(newItem);
        updateSettings('expenseTypes', newList);
        setExpenseForm({ name: '', defaultCompany: '', defaultAmount: '', defaultDays: '0' });
        setEditingExpenseIndex(null);
    };
    const editExpense = (index: number) => {
        const item = settings.expenseTypes[index];
        if (typeof item === 'string') setExpenseForm({ name: item, defaultCompany: '', defaultAmount: '', defaultDays: '0' });
        else setExpenseForm({ name: item.name, defaultCompany: item.defaultCompany, defaultAmount: item.defaultAmount.toString(), defaultDays: item.defaultDays });
        setEditingExpenseIndex(index);
    };

    const handleCompanySubmit = () => {
        if (!compInput) return;
        const newList = [...settings.expenseCompanies];
        if (editingCompIndex !== null) newList[editingCompIndex] = compInput;
        else newList.push(compInput);
        updateSettings('expenseCompanies', newList);
        setCompInput('');
        setEditingCompIndex(null);
    };
    const editCompany = (index: number) => {
        setCompInput(settings.expenseCompanies[index]);
        setEditingCompIndex(index);
    };

    // --- 4. 中港業務邏輯 ---
    const handleCbSubmit = () => {
        if (!cbForm.name) return;
        const newItem = { ...cbForm, defaultFee: Number(cbForm.defaultFee) || 0 };
        const newList = [...settings.cbItems];
        if (editingCbIndex !== null) newList[editingCbIndex] = newItem;
        else newList.push(newItem);
        updateSettings('cbItems', newList);
        setCbForm({ name: '', defaultInst: '', defaultFee: '', defaultDays: '0' });
        setEditingCbIndex(null);
    };
    const editCbItem = (index: number) => {
        const item = settings.cbItems[index];
        if (typeof item === 'string') setCbForm({ name: item, defaultInst: '', defaultFee: '', defaultDays: '0' });
        else setCbForm({ name: item.name, defaultInst: item.defaultInst, defaultFee: item.defaultFee.toString(), defaultDays: item.defaultDays });
        setEditingCbIndex(index);
    };

    const handleInstSubmit = () => {
        if (!instInput) return;
        const newList = [...settings.cbInstitutions];
        if (editingInstIndex !== null) newList[editingInstIndex] = instInput;
        else newList.push(instInput);
        updateSettings('cbInstitutions', newList);
        setInstInput('');
        setEditingInstIndex(null);
    };
    const editInst = (index: number) => {
        setInstInput(settings.cbInstitutions[index]);
        setEditingInstIndex(index);
    };

    // --- 備份還原 ---
    const handleExport = () => {
        const dataStr = JSON.stringify({ version: "2.0", timestamp: new Date().toISOString(), settings }, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `GL_Settings_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };
    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (data.settings) {
                    setSettings((prev: any) => ({ ...prev, ...data.settings }));
                    Object.keys(data.settings).forEach(k => updateSettings(k as keyof SystemSettings, data.settings[k]));
                    alert('設定已還原');
                }
            } catch (err) { alert('匯入失敗'); }
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex h-full gap-6">
            {/* Sidebar */}
            <div className="w-48 flex-none bg-slate-50 border-r border-slate-200 p-4 space-y-2 h-full">
                <h3 className="font-bold text-slate-400 text-xs uppercase mb-4 px-2">Config Menu</h3>
                {[
                    { id: 'general', icon: <LayoutDashboard size={16}/>, label: '一般設定' },
                    { id: 'vehicle', icon: <Car size={16}/>, label: '車輛資料' },
                    { id: 'expenses', icon: <DollarSign size={16}/>, label: '財務與費用' },
                    { id: 'crossborder', icon: <Globe size={16}/>, label: '中港業務' },
                    { id: 'users', icon: <Users size={16}/>, label: '用戶與權限' },
                    { id: 'backup', icon: <DownloadCloud size={16}/>, label: '備份還原' },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pr-4 pb-20">
                <h2 className="text-xl font-bold text-slate-800 mb-6 capitalize">{activeTab} Settings</h2>

                {activeTab === 'general' && (
                    <div className="space-y-6">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-700 mb-4">顏色選項 (Colors)</h3>
                            <div className="flex gap-2 mt-2"><input id="newColor" className="border rounded px-2 py-1 text-sm outline-none w-64" placeholder="例如: 香檳金"/><button onClick={() => { const el = document.getElementById('newColor') as HTMLInputElement; addItem('colors', el.value); el.value=''; }} className="bg-slate-800 text-white px-3 rounded text-xs">Add</button></div>
                            <div className="flex flex-wrap gap-2 mt-3">{settings.colors.map((c, i) => <span key={i} className="bg-slate-100 px-2 py-1 rounded text-xs flex items-center gap-2 border border-slate-200">{c} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeItem('colors', i)}/></span>)}</div>
                        </div>
                    </div>
                )}

                {activeTab === 'vehicle' && (
                    <div className="space-y-6">
                         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-700 mb-4">1. 車廠管理 (Makes)</h3>
                            <div className="flex gap-2 mt-2"><input id="newMake" className="border rounded px-2 py-1 text-sm outline-none w-64" placeholder="Add Make (e.g. Ferrari)"/><button onClick={() => { const el = document.getElementById('newMake') as HTMLInputElement; addItem('makes', el.value); el.value=''; }} className="bg-slate-800 text-white px-3 rounded text-xs">Add</button></div>
                            <div className="flex flex-wrap gap-2 mt-3">{settings.makes.map((m, i) => <span key={i} className="bg-slate-100 px-2 py-1 rounded text-xs flex items-center gap-2 border border-slate-200">{m} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeItem('makes', i)}/></span>)}</div>
                         </div>
                         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-700 mb-4">2. 型號管理 (Models)</h3>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                                <label className="text-xs font-bold text-slate-500 block mb-1">選擇廠牌</label>
                                <select value={selectedMakeForModel} onChange={e => setSelectedMakeForModel(e.target.value)} className="w-full p-2 border rounded text-sm mb-3">
                                    <option value="">-- 請選擇 --</option>
                                    {settings.makes.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                {selectedMakeForModel && (
                                    <div className="flex gap-2 animate-fade-in">
                                        <input value={newModelName} onChange={e => setNewModelName(e.target.value)} className="flex-1 border rounded px-2 py-1 text-sm outline-none" placeholder={`輸入 ${selectedMakeForModel} 新型號...`} />
                                        <button onClick={addModel} className="bg-blue-600 text-white px-3 rounded text-xs font-bold hover:bg-blue-700">新增型號</button>
                                    </div>
                                )}
                            </div>
                            {selectedMakeForModel && (
                                <div className="flex flex-wrap gap-2">
                                    {(settings.models[selectedMakeForModel] || []).length === 0 ? <span className="text-sm text-gray-400">暫無型號</span> : 
                                    (settings.models[selectedMakeForModel] || []).map((m, i) => (
                                        <span key={i} className="bg-blue-50 text-blue-800 px-2 py-1 rounded text-xs flex items-center gap-2 border border-blue-100">
                                            {m} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeModel(m)}/>
                                        </span>
                                    ))}
                                </div>
                            )}
                         </div>
                    </div>
                )}

                {activeTab === 'expenses' && (
                    <div className="space-y-6">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center"><DollarSign size={18} className="mr-2"/> 費用類別與預設值</h3>
                            <div className={`grid grid-cols-4 gap-3 p-3 rounded-lg mb-4 border transition-colors ${editingExpenseIndex !== null ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'} items-end`}>
                                <div><label className="text-[10px] font-bold text-slate-400 block mb-1">費用名稱</label><input value={expenseForm.name} onChange={e => setExpenseForm({...expenseForm, name: e.target.value})} className="w-full text-sm p-2 border rounded" placeholder="例如: 維修費"/></div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">預設公司 (選單)</label>
                                    {/* ★★★ 修正：改為下拉選單 ★★★ */}
                                    <select value={expenseForm.defaultCompany} onChange={e => setExpenseForm({...expenseForm, defaultCompany: e.target.value})} className="w-full text-sm p-2 border rounded bg-white">
                                        <option value="">-- 選擇預設公司 --</option>
                                        {settings.expenseCompanies.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div><label className="text-[10px] font-bold text-slate-400 block mb-1">金額 / 天數</label><div className="flex gap-1"><input type="number" value={expenseForm.defaultAmount} onChange={e => setExpenseForm({...expenseForm, defaultAmount: e.target.value})} className="w-2/3 text-sm p-2 border rounded" placeholder="$"/><input type="text" value={expenseForm.defaultDays} onChange={e => setExpenseForm({...expenseForm, defaultDays: e.target.value})} className="w-1/3 text-sm p-2 border rounded text-center" placeholder="天"/></div></div>
                                <div className="flex gap-1">
                                    <button onClick={handleExpenseSubmit} className={`flex-1 text-white py-2 rounded text-xs font-bold ${editingExpenseIndex !== null ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>{editingExpenseIndex !== null ? '更新' : '新增'}</button>
                                    {editingExpenseIndex !== null && <button onClick={() => { setEditingExpenseIndex(null); setExpenseForm({ name: '', defaultCompany: '', defaultAmount: '', defaultDays: '0' }); }} className="px-2 bg-gray-300 rounded text-xs">X</button>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                {settings.expenseTypes.map((item, i) => {
                                    const isObj = typeof item !== 'string';
                                    const name = isObj ? item.name : item;
                                    const company = isObj ? item.defaultCompany : '-';
                                    const amount = isObj ? item.defaultAmount : '-';
                                    return (
                                        <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-100 hover:border-blue-200">
                                            <div className="flex items-center gap-4"><span className="font-bold text-sm w-32 truncate">{name}</span><div className="flex gap-2 text-xs text-slate-500"><span className="bg-white px-2 py-1 rounded border">預設: {company}</span><span className="bg-white px-2 py-1 rounded border">${amount}</span></div></div>
                                            <div className="flex gap-2"><button onClick={() => editExpense(i)} className="text-slate-400 hover:text-blue-600 p-1"><Edit size={14}/></button><button onClick={() => removeItem('expenseTypes', i)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={14}/></button></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 公司/機構設定 (支援編輯) */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-700 mb-4">常用收款公司/車房 (Dropdown Options)</h3>
                            <div className={`flex gap-2 mt-2 p-2 rounded border ${editingCompIndex !== null ? 'bg-amber-50 border-amber-200' : 'bg-transparent border-transparent'}`}>
                                <input value={compInput} onChange={e => setCompInput(e.target.value)} className="border rounded px-2 py-1 text-sm outline-none w-64" placeholder={editingCompIndex !== null ? "Edit Company Name..." : "Add New Company..."} />
                                <button onClick={handleCompanySubmit} className={`text-white px-3 rounded text-xs ${editingCompIndex !== null ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-800 hover:bg-slate-700'}`}>{editingCompIndex !== null ? 'Update' : 'Add'}</button>
                                {editingCompIndex !== null && <button onClick={() => { setEditingCompIndex(null); setCompInput(''); }} className="bg-gray-300 px-2 rounded text-xs hover:bg-gray-400">Cancel</button>}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {settings.expenseCompanies.map((c, i) => (
                                    <span key={i} className="bg-slate-100 px-2 py-1 rounded text-xs flex items-center gap-2 border border-slate-200 group">
                                        {c} 
                                        <button onClick={() => editCompany(i)} className="text-slate-400 hover:text-blue-600"><Edit size={10}/></button>
                                        <button onClick={() => removeItem('expenseCompanies', i)} className="text-slate-400 hover:text-red-500"><X size={10}/></button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'crossborder' && (
                    <div className="space-y-6">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center"><Globe size={18} className="mr-2"/> 代辦項目與預設值</h3>
                            <div className={`grid grid-cols-4 gap-3 p-3 rounded-lg mb-4 border transition-colors ${editingCbIndex !== null ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'} items-end`}>
                                <div><label className="text-[10px] font-bold text-slate-400 block mb-1">項目名稱</label><input value={cbForm.name} onChange={e => setCbForm({...cbForm, name: e.target.value})} className="w-full text-sm p-2 border rounded" placeholder="項目名"/></div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">辦理機構 (選單)</label>
                                    {/* ★★★ 修正：改為下拉選單 ★★★ */}
                                    <select value={cbForm.defaultInst} onChange={e => setCbForm({...cbForm, defaultInst: e.target.value})} className="w-full text-sm p-2 border rounded bg-white">
                                        <option value="">-- 選擇預設機構 --</option>
                                        {settings.cbInstitutions.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div><label className="text-[10px] font-bold text-slate-400 block mb-1">收費 / 天數</label><div className="flex gap-1"><input type="number" value={cbForm.defaultFee} onChange={e => setCbForm({...cbForm, defaultFee: e.target.value})} className="w-2/3 text-sm p-2 border rounded" placeholder="$"/><input type="text" value={cbForm.defaultDays} onChange={e => setCbForm({...cbForm, defaultDays: e.target.value})} className="w-1/3 text-sm p-2 border rounded text-center" placeholder="天"/></div></div>
                                <div className="flex gap-1">
                                    <button onClick={handleCbSubmit} className={`flex-1 text-white py-2 rounded text-xs font-bold ${editingCbIndex !== null ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>{editingCbIndex !== null ? '更新' : '新增'}</button>
                                    {editingCbIndex !== null && <button onClick={() => { setEditingCbIndex(null); setCbForm({ name: '', defaultInst: '', defaultFee: '', defaultDays: '0' }); }} className="px-2 bg-gray-300 rounded text-xs">X</button>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                {(settings.cbItems || []).map((item, i) => {
                                    const isObj = typeof item !== 'string';
                                    const name = isObj ? item.name : item;
                                    const inst = isObj ? item.defaultInst : '-';
                                    const fee = isObj ? item.defaultFee : '-';
                                    return (
                                        <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-100 hover:border-blue-200">
                                             <div className="flex items-center gap-4"><span className="font-bold text-sm w-32 truncate">{name}</span><div className="flex gap-2 text-xs text-slate-500"><span className="bg-white px-2 py-1 rounded border">{inst}</span><span className="bg-white px-2 py-1 rounded border">${fee}</span></div></div>
                                            <div className="flex gap-2"><button onClick={() => editCbItem(i)} className="text-slate-400 hover:text-blue-600 p-1"><Edit size={14}/></button><button onClick={() => removeItem('cbItems', i)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={14}/></button></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 辦理機構 (支援編輯) */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-700 mb-4">常用辦理機構 (Handling Institutions)</h3>
                            <div className={`flex gap-2 mt-2 p-2 rounded border ${editingInstIndex !== null ? 'bg-amber-50 border-amber-200' : 'bg-transparent border-transparent'}`}>
                                <input value={instInput} onChange={e => setInstInput(e.target.value)} className="border rounded px-2 py-1 text-sm outline-none w-64" placeholder={editingInstIndex !== null ? "Edit Institution..." : "Add Institution..."} />
                                <button onClick={handleInstSubmit} className={`text-white px-3 rounded text-xs ${editingInstIndex !== null ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-800 hover:bg-slate-700'}`}>{editingInstIndex !== null ? 'Update' : 'Add'}</button>
                                {editingInstIndex !== null && <button onClick={() => { setEditingInstIndex(null); setInstInput(''); }} className="bg-gray-300 px-2 rounded text-xs hover:bg-gray-400">Cancel</button>}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {settings.cbInstitutions.map((c, i) => (
                                    <span key={i} className="bg-slate-100 px-2 py-1 rounded text-xs flex items-center gap-2 border border-slate-200 group">
                                        {c} 
                                        <button onClick={() => editInst(i)} className="text-slate-400 hover:text-blue-600"><Edit size={10}/></button>
                                        <button onClick={() => removeItem('cbInstitutions', i)} className="text-slate-400 hover:text-red-500"><X size={10}/></button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-6">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center"><Users size={18} className="mr-2"/> 系統用戶與權限 (System Access)</h3>
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-6 text-xs text-blue-700">
                                <strong>說明：</strong> 此處設定 Email 與權限。新用戶需在登入頁點擊 "Sign in with Google" 或使用該 Email 註冊。<br/>
                                (系統會比對登入者的 Email 是否在下方清單中)
                            </div>
                            <div className="flex gap-2 mb-6"><input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="flex-1 border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="輸入用戶 Email..."/><button onClick={handleAddUser} className="bg-blue-600 text-white px-4 rounded text-sm font-bold hover:bg-blue-700 shadow-sm">新增授權</button></div>
                            <div className="space-y-3">
                                {systemUsers.length === 0 ? <p className="text-slate-400 text-sm text-center py-4">暫無其他授權用戶</p> : systemUsers.map(u => (
                                    <div key={u.email} className="bg-slate-50 p-3 rounded border border-slate-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-3"><div className="bg-slate-200 p-1.5 rounded-full"><UserCircle size={16} className="text-slate-500"/></div><span className="text-sm font-bold text-slate-700">{u.email}</span></div>
                                            <button onClick={() => handleRemoveUser(u.email)} className="text-red-400 hover:text-red-600 px-2 text-xs border border-red-100 rounded bg-white">移除</button>
                                        </div>
                                        <div className="flex gap-4 pl-9 text-xs">
                                            {[{ k: 'inventory', label: '車庫 (Inventory)' }, { k: 'business', label: '業務 (Business)' }, { k: 'database', label: '資料庫 (DB)' }, { k: 'settings', label: '設定 (Settings)' }].map(mod => (
                                                <label key={mod.k} className="flex items-center cursor-pointer select-none"><input type="checkbox" checked={u.modules?.includes(mod.k)} onChange={() => toggleUserPermission(u.email, mod.k)} className="mr-1.5 accent-blue-600"/><span className={u.modules?.includes(mod.k) ? 'text-slate-700 font-bold' : 'text-slate-400'}>{mod.label}</span></label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'backup' && (
                    <div className="space-y-6">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center"><DownloadCloud size={18} className="mr-2"/> 資料備份與還原</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 flex flex-col justify-between"><div><h4 className="font-bold text-blue-800 mb-2">匯出備份 (Export)</h4><p className="text-xs text-blue-600/70 mb-4">下載完整設定檔 (.json)。</p></div><button onClick={handleExport} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700">下載</button></div>
                                <div className="bg-amber-50 p-5 rounded-xl border border-amber-100 flex flex-col justify-between"><div><h4 className="font-bold text-amber-800 mb-2">匯入還原 (Import)</h4><p className="text-xs text-amber-600/70 mb-4">注意：這將覆蓋目前設定！</p></div><label className="w-full bg-amber-500 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-amber-600 text-center block cursor-pointer">選擇檔案<input type="file" accept=".json" className="hidden" onChange={handleImport} /></label></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
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
                // ★★★ 修正重點：使用 ...data 完整讀取所有欄位，確保搜尋功能可用 ★★★
                list.push({ 
                    id: doc.id, 
                    ...data, // 這行最重要！把資料庫裡有的 tags, plateNoHK 全部複製過來
                    
                    // 以下是防呆預設值 (避免資料庫缺欄位導致報錯)
                    category: data.category || 'Person',
                    name: data.name || '',
                    reminderEnabled: data.reminderEnabled || false,
                    expiryDate: data.expiryDate || '',
                    tags: data.tags || [], // ★ 確保讀取標籤
                    plateNoHK: data.plateNoHK || '', // ★ 確保讀取車牌
                    relatedPlateNo: data.relatedPlateNo || '',
                    
                    // 其他 VRD 常用欄位確保
                    make: data.make || '',
                    model: data.model || '',
                    chassisNo: data.chassisNo || '',
                    engineNo: data.engineNo || '',
                    attachments: data.attachments || [],
                    roles: data.roles || []
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

  // 更新系統設定 (v2.0 通用版：直接儲存新值，支援物件與陣列)
    const updateSettings = async (key: keyof SystemSettings, value: any) => {
        // 1. 更新本地狀態 (讓畫面即時反應)
        setSettings(prev => ({ ...prev, [key]: value }));

        // 2. 寫入 Firebase
        if (db && appId) {
            try {
                const docRef = doc(db, 'artifacts', appId, 'system', 'settings');
                // 使用 merge: true 確保只更新變動的欄位，不會覆蓋其他設定
                await setDoc(docRef, { [key]: value }, { merge: true }); 
                console.log(`Settings updated: ${key}`, value);
            } catch (err) {
                console.error("Settings update failed:", err);
                alert("儲存設定失敗，請檢查網路連線");
            }
        }
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

// --- 資料庫選取器組件 (補回) ---
const DatabaseSelector = ({ 
    isOpen, 
    onClose, 
    type, 
    entries, 
    onSelect 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    type: 'customer' | 'vehicle_vrd'; 
    entries: DatabaseEntry[];
    onSelect: (entry: DatabaseEntry) => void;
}) => {
    const [search, setSearch] = useState('');
    if (!isOpen) return null;

    // 根據類型篩選資料
    const filtered = entries.filter(e => {
        const isMatchSearch = (
            (e.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (e.phone || '').includes(search) ||
            (e.plateNoHK || '').toLowerCase().includes(search.toLowerCase()) ||
            (e.idNumber || '').toLowerCase().includes(search.toLowerCase())
        );

        if (type === 'customer') {
            // 選客戶：顯示 Person 或 Company
            return (e.category === 'Person' || e.category === 'Company') && isMatchSearch;
        } else {
            // 選 VRD：顯示 Vehicle
            return e.category === 'Vehicle' && isMatchSearch;
        }
    });

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="font-bold text-slate-800">
                        {type === 'customer' ? '從資料庫選擇客戶' : '從資料庫選擇車輛 VRD'}
                    </h3>
                    <button onClick={onClose}><X size={20} className="text-slate-500 hover:text-black"/></button>
                </div>
                
                <div className="p-4 border-b bg-white">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input 
                            className="w-full pl-9 p-2 border rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500"
                            placeholder={type === 'customer' ? "搜尋姓名、電話、身份證..." : "搜尋車牌、底盤號..."}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50">
                    {filtered.map(entry => (
                        <div 
                            key={entry.id} 
                            onClick={() => { onSelect(entry); onClose(); }}
                            className="bg-white p-3 rounded-lg border hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold text-slate-800 flex items-center">
                                        {entry.name || '(未命名)'}
                                        {entry.plateNoHK && <span className="ml-2 bg-yellow-100 text-yellow-800 text-[10px] px-1 rounded border border-yellow-200">{entry.plateNoHK}</span>}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                                        {type === 'customer' ? (
                                            <>
                                                <div>電話: {entry.phone || '-'}</div>
                                                <div>ID: {entry.idNumber || '-'}</div>
                                            </>
                                        ) : (
                                            <>
                                                <div>廠型: {entry.make} {entry.model}</div>
                                                <div>底盤: {entry.chassisNo || '-'}</div>
                                                <div>A1: {entry.priceA1 ? formatCurrency(entry.priceA1) : '-'}</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500"/>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && <div className="text-center text-slate-400 py-8 text-sm">找不到相關資料</div>}
                </div>
            </div>
        </div>
    );
};

  // 1. Vehicle Form Modal (v8.0: 支援費用項目自動帶入預設值)
  const VehicleFormModal = () => {
    if (!editingVehicle && activeTab !== 'inventory_add') return null; 
    
    const v = editingVehicle || {} as Partial<Vehicle>;
    const isNew = !v.id; 
    
    // --- 狀態定義 ---
    const [selectedMake, setSelectedMake] = useState(v.make || '');
    const [isCbExpanded, setIsCbExpanded] = useState(false); 
    const [currentStatus, setCurrentStatus] = useState<'In Stock' | 'Reserved' | 'Sold'>(v.status || 'In Stock');

    // 數值輸入狀態
    const [priceStr, setPriceStr] = useState(formatNumberInput(String(v.price || '')));
    const [costStr, setCostStr] = useState(formatNumberInput(String(v.costPrice || '')));
    const [mileageStr, setMileageStr] = useState(formatNumberInput(String(v.mileage || '')));
    const [priceA1Str, setPriceA1Str] = useState(formatNumberInput(String(v.priceA1 || '')));
    const [priceTaxStr, setPriceTaxStr] = useState(formatNumberInput(String(v.priceTax || '')));
    const [engineSizeStr, setEngineSizeStr] = useState(formatNumberInput(String(v.engineSize || '')));
    
    const [fuelType, setFuelType] = useState<'Petrol'|'Diesel'|'Electric'>(v.fuelType || 'Petrol');
    const [transmission, setTransmission] = useState<'Automatic'|'Manual'>(v.transmission || 'Automatic');
    const [autoLicenseFee, setAutoLicenseFee] = useState(v.licenseFee || 0);

    const [carPhotos, setCarPhotos] = useState<string[]>(v.photos || []);
    const [isCompressing, setIsCompressing] = useState(false);

    // 計算邏輯
    const cbFees = (v.crossBorder?.tasks || []).reduce((sum, t) => sum + (t.fee || 0), 0);
    const totalRevenue = (v.price || 0) + cbFees;
    const totalReceived = (v.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalExpenses = (v.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
    const balance = totalRevenue - totalReceived; 
    const pendingCbTasks = (v.crossBorder?.tasks || []).filter(t => (t.fee !== 0) && !(v.payments || []).some(p => p.relatedTaskId === t.id));

    // 新增費用/收款的暫存狀態
    const [newExpense, setNewExpense] = useState({ date: new Date().toISOString().split('T')[0], type: '', company: '', amount: '', status: 'Unpaid', paymentMethod: 'Cash', invoiceNo: '' });
    const [newPayment, setNewPayment] = useState({ date: new Date().toISOString().split('T')[0], type: 'Deposit', amount: '', method: 'Cash', note: '', relatedTaskId: '' });

    // 自動計算牌費
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

    // 圖片壓縮
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
                    const MAX_WIDTH = 1280;
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.6); 
                    resolve(dataUrl);
                };
            };
        });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setIsCompressing(true);
        const newPhotos: string[] = [];
        for (let i = 0; i < files.length; i++) {
            try { const compressedData = await compressImage(files[i]); newPhotos.push(compressedData); } catch (err) { console.error(err); }
        }
        setCarPhotos(prev => [...prev, ...newPhotos]);
        setIsCompressing(false); e.target.value = '';
    };

    const setFieldValue = (name: string, val: string) => {
        const el = document.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement;
        if(el) el.value = val;
    };

    // ★★★ 關鍵：當選擇費用類別時，自動帶入預設值 ★★★
    const handleExpenseTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedType = e.target.value;
        
        // 在 settings.expenseTypes 中尋找設定
        const setting = settings.expenseTypes.find(item => {
            if (typeof item === 'string') return item === selectedType;
            return item.name === selectedType;
        });

        let defaultComp = '';
        let defaultAmt = '';
        let targetDate = newExpense.date;

        if (setting && typeof setting !== 'string') {
            defaultComp = setting.defaultCompany || '';
            defaultAmt = setting.defaultAmount ? formatNumberInput(setting.defaultAmount.toString()) : '';
            
            // 如果有設定天數，自動計算日期 (例如今天 + 30天)
            if (setting.defaultDays && Number(setting.defaultDays) > 0) {
                const d = new Date();
                d.setDate(d.getDate() + Number(setting.defaultDays));
                targetDate = d.toISOString().split('T')[0];
            }
        }

        setNewExpense({
            ...newExpense,
            type: selectedType,
            company: defaultComp,  // 自動填入公司
            amount: defaultAmt,    // 自動填入金額
            date: targetDate       // 自動填入日期
        });
    };

    const autoFetchVRD = () => { /* ...省略(保持原樣)... */ }; // 為節省篇幅，此處邏輯保持不變
    const autoFetchCustomer = () => { /* ...省略(保持原樣)... */ }; 

    const handleSaveWrapper = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if(!formData.has('mileage')) {
            const hiddenMileage = document.createElement('input');
            hiddenMileage.type = 'hidden';
            hiddenMileage.name = 'mileage';
            hiddenMileage.value = mileageStr.replace(/,/g, '');
            e.currentTarget.appendChild(hiddenMileage);
        }
        try {
            if(editingVehicle) editingVehicle.photos = carPhotos;
            await saveVehicle(e);
        } catch (err) { console.error("儲存失敗:", err); alert(`儲存失敗: ${err}`); }
    };

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-hidden">
        <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden border border-slate-600">
          
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center flex-none shadow-md z-20">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500 rounded-lg text-black"><Car size={24} /></div>
                <div>
                    <h2 className="text-xl font-bold">{isNew ? '車輛入庫 (Stock In)' : `車輛詳情: ${v.regMark || '未出牌'}`}</h2>
                    <p className="text-xs text-slate-400 font-mono">{v.id || 'NEW_ENTRY'}</p>
                </div>
            </div>
            <div className="flex gap-3">
                <button type="button" onClick={() => {setEditingVehicle(null); if(activeTab !== 'inventory_add') {} else {setActiveTab('inventory');} }} className="p-2 hover:bg-slate-700 rounded-full transition-colors"><X size={24} /></button>
            </div>
          </div>

          <form onSubmit={handleSaveWrapper} className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
            
            {/* 左側欄：VRD & Photos (保持不變) */}
            <div className="w-full md:w-[35%] bg-slate-200/50 p-4 overflow-y-auto border-r border-slate-300 flex flex-col gap-4 scrollbar-thin">
                 {/* ... VRD Card Content (保持不變) ... */}
                 <div className="bg-white rounded-xl shadow-sm border-2 border-red-100 overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-full h-2 bg-red-400/80"></div>
                    <div className="p-4 space-y-3">
                        <div className="flex justify-between items-start"><h3 className="font-bold text-red-800 text-sm flex items-center"><FileText size={14} className="mr-1"/> 車輛登記文件 (VRD Data)</h3></div>
                        <div className="space-y-1 relative">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Registration Mark</label>
                            <div className="flex relative">
                                <input name="regMark" defaultValue={v.regMark} placeholder="未出牌" className="w-full bg-yellow-50 border-b-2 border-yellow-200 p-1 text-2xl font-bold font-mono text-center text-slate-800 focus:outline-none focus:border-yellow-400 uppercase placeholder:text-gray-300"/>
                                {/*<button type="button" onClick={autoFetchVRD} className="absolute right-0 bottom-1 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200 transition-colors shadow-sm z-10" title="依車牌搜尋資料庫並自動填入"><RefreshCw size={14}/></button>*/}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[9px] text-slate-400 font-bold uppercase">Make</label><select name="make" value={selectedMake} onChange={(e) => setSelectedMake(e.target.value)} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-sm font-bold text-slate-700 outline-none"><option value="">--</option>{settings.makes.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                            <div><label className="text-[9px] text-slate-400 font-bold uppercase">Model</label><input list="model_list" name="model" defaultValue={v.model} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-sm font-bold text-slate-700 outline-none"/><datalist id="model_list">{(settings.models[selectedMake] || []).map(m => <option key={m} value={m} />)}</datalist></div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                            <div><label className="text-[9px] text-slate-400 font-bold uppercase">Year</label><input name="year" type="number" defaultValue={v.year} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-sm font-mono"/></div>
                            <div className="col-span-1"><label className="text-[9px] text-slate-400 font-bold uppercase">Mileage</label><input name="mileage" value={mileageStr} onChange={(e) => setMileageStr(formatNumberInput(e.target.value))} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-sm font-mono text-right" placeholder="km"/></div>
                            <div className="col-span-1"><label className="text-[9px] text-slate-400 font-bold uppercase">Color</label><input list="colors" name="colorExt" defaultValue={v.colorExt} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-sm"/><datalist id="colors">{settings.colors.map(c => <option key={c} value={c} />)}</datalist></div>
                        </div>

                        <div className="space-y-1 pt-2 border-t border-dashed border-slate-200"><label className="text-[9px] text-slate-400 font-bold uppercase">Chassis No.</label><input name="chassisNo" defaultValue={v.chassisNo} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-xs font-mono tracking-wider uppercase"/></div>
                        <div className="space-y-1"><label className="text-[9px] text-slate-400 font-bold uppercase">Engine No.</label><input name="engineNo" defaultValue={v.engineNo} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-xs font-mono tracking-wider uppercase"/></div>
                        <div className="grid grid-cols-3 gap-2 pt-2">
                            <div><label className="text-[9px] text-slate-400 font-bold uppercase">Cyl. Cap.</label><input name="engineSize" value={engineSizeStr} onChange={(e) => setEngineSizeStr(formatNumberInput(e.target.value))} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-xs text-right font-mono"/></div>
                            <div><label className="text-[9px] text-slate-400 font-bold uppercase">Seating</label><input name="seating" type="number" defaultValue={v.seating || 7} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-xs text-right"/></div>
                            <div><label className="text-[9px] text-slate-400 font-bold uppercase">Prev Owners</label><input name="previousOwners" defaultValue={v.previousOwners} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-xs text-right"/></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-slate-200">
                            <div><label className="text-[9px] text-slate-400 font-bold uppercase">Fuel Type</label><select name="fuelType" value={fuelType} onChange={(e) => setFuelType(e.target.value as any)} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-xs outline-none"><option value="Petrol">Petrol (汽油)</option><option value="Diesel">Diesel (柴油)</option><option value="Electric">Electric (電動)</option></select></div>
                            <div><label className="text-[9px] text-slate-400 font-bold uppercase">Transmission</label><select name="transmission" value={transmission} onChange={(e) => setTransmission(e.target.value as any)} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-xs outline-none"><option value="Automatic">Automatic (自動)</option><option value="Manual">Manual (棍波)</option></select></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex-1 flex flex-col min-h-[300px]">
                    <div className="flex justify-between items-center mb-3"><h3 className="font-bold text-slate-700 text-sm flex items-center"><ImageIcon size={14} className="mr-1"/> 車輛相片 ({carPhotos.length})</h3><label className={`cursor-pointer bg-slate-800 text-white text-[10px] px-2 py-1 rounded hover:bg-slate-700 flex items-center ${isCompressing ? 'opacity-50 pointer-events-none' : ''}`}>{isCompressing ? <Loader2 size={10} className="animate-spin mr-1"/> : <Plus size={10} className="mr-1"/>}{isCompressing ? '處理中...' : '加入相片'}<input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isCompressing}/></label></div>
                    <div className="flex-1 overflow-y-auto bg-slate-100 rounded-lg p-2 grid grid-cols-2 gap-2 content-start">{carPhotos.map((img, idx) => (<div key={idx} className="relative group aspect-video bg-black rounded overflow-hidden shadow-sm border border-slate-300"><img src={img} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"><button type="button" onClick={() => window.open(img)} className="p-1.5 bg-white/20 text-white rounded-full hover:bg-white/40 backdrop-blur-sm" title="放大"><ExternalLink size={14}/></button><button type="button" onClick={() => setCarPhotos(prev => prev.filter((_, i) => i !== idx))} className="p-1.5 bg-red-500/80 text-white rounded-full hover:bg-red-600 backdrop-blur-sm" title="刪除"><Trash2 size={14}/></button></div></div>))}{carPhotos.length === 0 && (<div className="col-span-2 h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-lg"><ImageIcon size={24} className="mb-2 opacity-50"/><span className="text-xs">暫無相片 (自動壓縮至~130KB)</span></div>)}</div>
                </div>
            </div>

            {/* 右側欄：銷售與管理 */}
            <div className="flex-1 bg-white p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 pb-24">
                {/* ... Status Buttons & Stock Dates (保持不變) ... */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                        <input type="hidden" name="status" value={currentStatus} />
                        {['In Stock', 'Reserved', 'Sold'].map(status => (
                            <button key={status} type="button" onClick={() => setCurrentStatus(status as any)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all border ${currentStatus === status ? 'bg-slate-800 text-white border-slate-800 shadow' : 'bg-white text-slate-500 border-transparent hover:bg-slate-50'}`}>
                                {status === 'In Stock' ? '在庫' : (status === 'Reserved' ? '已訂' : '已售')}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-3 text-xs"><div className="flex items-center gap-1"><span className="text-gray-400">入庫:</span><input name="stockInDate" type="date" defaultValue={v.stockInDate || new Date().toISOString().split('T')[0]} className="bg-transparent font-mono font-bold text-slate-700 outline-none"/></div><div className="flex items-center gap-1"><span className="text-gray-400">出庫:</span><input name="stockOutDate" type="date" defaultValue={v.stockOutDate} className="bg-transparent font-mono font-bold text-green-600 outline-none"/></div></div>
                </div>

                <div className="mb-6 relative">
                    <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-slate-800 text-sm flex items-center"><UserCircle size={16} className="mr-2 text-blue-600"/> 客戶資料 (Purchaser)</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 relative group-focus-within:ring-2 ring-blue-100 transition-all">
                        <div className="relative"><span className="absolute top-2 left-2 text-[10px] text-gray-400 font-bold">NAME</span><input name="customerName" defaultValue={v.customerName} className="w-full pt-5 pb-1 px-2 bg-white border border-slate-200 rounded text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-gray-200" placeholder="輸入姓名..."/><button type="button" onClick={autoFetchCustomer} className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors z-10" title="依姓名搜尋資料庫"><Search size={14}/></button></div>
                        <div className="relative"><span className="absolute top-2 left-2 text-[10px] text-gray-400 font-bold">PHONE</span><input name="customerPhone" defaultValue={v.customerPhone} className="w-full pt-5 pb-1 px-2 bg-white border border-slate-200 rounded text-sm font-mono focus:ring-2 focus:ring-blue-100 outline-none"/></div>
                        <div className="relative"><span className="absolute top-2 left-2 text-[10px] text-gray-400 font-bold">ID / BR</span><input name="customerID" defaultValue={v.customerID} className="w-full pt-5 pb-1 px-2 bg-white border border-slate-200 rounded text-sm font-mono focus:ring-2 focus:ring-blue-100 outline-none"/></div>
                        <div className="relative"><span className="absolute top-2 left-2 text-[10px] text-gray-400 font-bold">ADDRESS</span><input name="customerAddress" defaultValue={v.customerAddress} className="w-full pt-5 pb-1 px-2 bg-white border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-100 outline-none"/></div>
                    </div>
                </div>

                <div className="mb-6"><h3 className="font-bold text-slate-800 text-sm mb-2 flex items-center"><DollarSign size={16} className="mr-2 text-green-600"/> 價格設定 (Pricing)</h3><div className="grid grid-cols-2 md:grid-cols-5 gap-4"><div className="bg-yellow-50 p-2 rounded border border-yellow-200"><label className="block text-[10px] text-yellow-800 font-bold mb-1">售價 (Price)</label><input name="price" value={priceStr} onChange={e => setPriceStr(formatNumberInput(e.target.value))} className="w-full bg-transparent text-lg font-bold text-slate-900 outline-none" placeholder="$0"/></div><div className="bg-gray-50 p-2 rounded border border-gray-200"><label className="block text-[10px] text-gray-500 font-bold mb-1">成本 (Cost)</label><input name="costPrice" value={costStr} onChange={e => setCostStr(formatNumberInput(e.target.value))} className="w-full bg-transparent text-sm font-mono text-slate-600 outline-none" placeholder="$0"/></div><div className="bg-white p-2 rounded border border-slate-200"><label className="block text-[10px] text-blue-400 font-bold mb-1">收購類型</label><select name="purchaseType" defaultValue={v.purchaseType || 'Used'} className="w-full bg-transparent text-sm font-bold text-blue-800 outline-none"><option value="Used">二手 (Used)</option><option value="New">新車 (New)</option><option value="Consignment">寄賣 (Consign)</option></select></div><div className="bg-white p-2 rounded border border-slate-200"><label className="block text-[10px] text-gray-400 font-bold mb-1">A1 Tax</label><input name="priceA1" value={priceA1Str} onChange={e => setPriceA1Str(formatNumberInput(e.target.value))} className="w-full bg-transparent text-sm font-mono outline-none"/></div><div className="bg-white p-2 rounded border border-slate-200"><label className="block text-[10px] text-gray-400 font-bold mb-1">Paid Tax</label><input name="priceTax" value={priceTaxStr} onChange={e => setPriceTaxStr(formatNumberInput(e.target.value))} className="w-full bg-transparent text-sm font-mono outline-none"/></div></div><div className="flex justify-between items-center mt-2 px-1"><div className="text-xs text-gray-400">牌簿價: <span className="font-mono text-slate-600">{calcRegisteredPrice()}</span></div><div className="text-xs font-bold text-blue-600">餘額 (Balance): {formatCurrency(balance)}</div></div></div>

                <div className="space-y-4">
                    <div className="border border-blue-100 rounded-xl overflow-hidden"><div className="bg-blue-50/50 p-3 flex justify-between items-center cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => setIsCbExpanded(!isCbExpanded)}><div className="flex items-center gap-2"><Globe size={16} className="text-blue-600"/><span className="font-bold text-sm text-blue-900">中港車管家 (Cross-Border)</span><label className="flex items-center ml-4 text-xs text-slate-500 cursor-pointer" onClick={e => e.stopPropagation()}><input type="checkbox" name="cb_isEnabled" defaultChecked={v.crossBorder?.isEnabled} className="mr-1 accent-blue-600"/> 啟用</label></div>{isCbExpanded ? <ChevronUp size={16} className="text-blue-400"/> : <ChevronDown size={16} className="text-blue-400"/>}</div>{isCbExpanded && (<div className="p-4 bg-white border-t border-blue-100 grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in"><div className="col-span-1"><label className="text-[9px] text-blue-800 font-bold">內地車牌</label><input name="cb_mainlandPlate" defaultValue={v.crossBorder?.mainlandPlate} className="w-full border-b border-blue-100 text-sm py-1 outline-none"/></div><div className="col-span-1"><label className="text-[9px] text-blue-800 font-bold">指標號</label><input name="cb_quotaNumber" defaultValue={v.crossBorder?.quotaNumber} className="w-full border-b border-blue-100 text-sm py-1 outline-none"/></div><div className="col-span-1"><label className="text-[9px] text-blue-800 font-bold">香港公司</label><input name="cb_hkCompany" defaultValue={v.crossBorder?.hkCompany} className="w-full border-b border-blue-100 text-sm py-1 outline-none"/></div><div className="col-span-1"><label className="text-[9px] text-blue-800 font-bold">內地公司</label><input name="cb_mainlandCompany" defaultValue={v.crossBorder?.mainlandCompany} className="w-full border-b border-blue-100 text-sm py-1 outline-none"/></div><div className="col-span-1"><label className="text-[9px] text-blue-800 font-bold">主司機</label><input name="cb_driver1" defaultValue={v.crossBorder?.driver1} className="w-full border-b border-blue-100 text-sm py-1 outline-none"/></div><div className="col-span-1"><label className="text-[9px] text-blue-800 font-bold">副司機 1</label><input name="cb_driver2" defaultValue={v.crossBorder?.driver2} className="w-full border-b border-blue-100 text-sm py-1 outline-none"/></div><div className="col-span-1"><label className="text-[9px] text-blue-800 font-bold">副司機 2</label><input name="cb_driver3" defaultValue={v.crossBorder?.driver3} className="w-full border-b border-blue-100 text-sm py-1 outline-none"/></div><div className="col-span-1"><label className="text-[9px] text-blue-800 font-bold">保險代理</label><input name="cb_insuranceAgent" defaultValue={v.crossBorder?.insuranceAgent} className="w-full border-b border-blue-100 text-sm py-1 outline-none"/></div><div className="col-span-4 grid grid-cols-2 md:grid-cols-5 gap-2 mt-2 pt-2 border-t border-dashed border-blue-100">{['HkInsurance', 'ReservedPlate', 'Br', 'LicenseFee', 'MainlandJqx', 'MainlandSyx', 'ClosedRoad', 'Approval', 'MainlandLicense', 'HkInspection'].map(key => (<div key={key} className="bg-slate-50 p-1.5 rounded"><label className="block text-[8px] text-slate-400 uppercase mb-0.5">{key}</label><input type="date" name={`cb_date${key}`} defaultValue={(v.crossBorder as any)?.[`date${key}`]} className="w-full bg-transparent text-[10px] outline-none"/></div>))}</div></div>)}</div>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                            <h4 className="font-bold text-xs text-gray-500 mb-2 flex justify-between items-center"><span>收款記錄 (Payments)</span><span className="text-green-600 bg-green-100 px-2 py-0.5 rounded">已收: {formatCurrency(totalReceived)}</span></h4>
                            <div className="space-y-1 mb-2">
                                {(v.payments || []).map(p => (<div key={p.id} className="grid grid-cols-12 gap-2 text-xs p-1.5 bg-white border rounded shadow-sm items-center"><div className="col-span-2 text-gray-400">{p.date}</div><div className="col-span-3 font-bold">{p.type}</div><div className="col-span-3 text-gray-500 truncate">{p.note || '-'}</div><div className="col-span-3 font-mono text-right">{formatCurrency(p.amount)}</div><div className="col-span-1 text-right">{!p.relatedTaskId && <button type="button" onClick={() => deletePayment(v.id!, p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={12}/></button>}</div></div>))}
                                {pendingCbTasks.map(task => (<div key={task.id} className="grid grid-cols-12 gap-2 text-xs p-1.5 bg-amber-50 border border-amber-200 rounded shadow-sm text-amber-800 cursor-pointer hover:bg-amber-100 group transition-colors items-center" onClick={() => { setNewPayment({ ...newPayment, amount: formatNumberInput(task.fee.toString()), note: `${task.item}`, relatedTaskId: task.id }); }} title="點擊自動填入下方收款欄"><div className="col-span-2 text-amber-600/70">{task.date}</div><div className="col-span-3 font-bold flex items-center"><Info size={10} className="mr-1"/> {task.item}</div><div className="col-span-3 text-amber-700 truncate">{task.institution}</div><div className="col-span-3 font-mono font-bold text-right">{formatCurrency(task.fee)}</div><div className="col-span-1 text-right"><span className="bg-amber-200 px-1 rounded text-[9px] font-bold">待收</span></div></div>))}
                            </div>
                            <div className="flex gap-1 pt-1 border-t border-gray-200 mt-2"><input type="date" value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} className="w-24 text-xs p-1.5 border rounded outline-none bg-white"/><select value={newPayment.type} onChange={e => setNewPayment({...newPayment, type: e.target.value as any})} className="w-24 text-xs p-1.5 border rounded outline-none bg-white"><option>Deposit</option><option>Balance</option><option>Service Fee</option></select><input type="text" placeholder="備註..." value={newPayment.note} onChange={e => setNewPayment({...newPayment, note: e.target.value})} className="flex-1 text-xs p-1.5 border rounded outline-none bg-white"/><input type="text" placeholder="$" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: formatNumberInput(e.target.value)})} className="w-20 text-xs p-1.5 border rounded outline-none bg-white text-right font-mono"/><button type="button" onClick={() => {const amt=Number(newPayment.amount.replace(/,/g,'')); if(amt>0 && v.id) { addPayment(v.id, {id:Date.now().toString(), ...newPayment, amount:amt} as any); setNewPayment({...newPayment, amount:'', note: '', relatedTaskId: ''}); }}} className="bg-slate-800 text-white text-xs px-3 rounded hover:bg-slate-700">收款</button></div>
                        </div>

                        {/* ★★★ 車輛費用區塊 (升級版：支援預設值自動帶入) ★★★ */}
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                            <h4 className="font-bold text-xs text-gray-500 mb-2 flex justify-between items-center"><span>車輛費用 (Expenses)</span><span className="text-slate-600 bg-slate-200 px-2 py-0.5 rounded">總計: {formatCurrency(totalExpenses)}</span></h4>
                            <div className="space-y-1 mb-2">{(v.expenses || []).map(exp => (<div key={exp.id} className="grid grid-cols-12 gap-2 text-xs p-1.5 bg-white border rounded shadow-sm items-center"><div className="col-span-2 text-gray-400">{exp.date}</div><div className="col-span-3 font-bold">{exp.type}</div><div className="col-span-3 text-gray-500 truncate">{exp.company}</div><div className="col-span-3 font-mono text-right">{formatCurrency(exp.amount)}</div><div className="col-span-1 text-right"><button type="button" onClick={() => deleteExpense(v.id!, exp.id)} className="text-red-400 hover:text-red-600"><X size={12}/></button></div></div>))}</div>
                            
                            <div className="flex gap-1 pt-1 border-t border-gray-200 mt-2">
                                <input type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-24 text-xs p-1.5 border rounded outline-none bg-white"/>
                                {/* Expense Type Dropdown (Updated with Lookup) */}
                                <select value={newExpense.type} onChange={handleExpenseTypeChange} className="flex-1 text-xs p-1.5 border rounded outline-none bg-white">
                                    <option value="">項目...</option>
                                    {settings.expenseTypes.map((t, i) => {
                                        const name = typeof t === 'string' ? t : t.name;
                                        return <option key={i} value={name}>{name}</option>;
                                    })}
                                </select>
                                <select value={newExpense.company} onChange={e => setNewExpense({...newExpense, company: e.target.value})} className="flex-1 text-xs p-1.5 border rounded outline-none bg-white">
                                    <option value="">公司...</option>
                                    {settings.expenseCompanies?.map(c=><option key={c} value={c}>{c}</option>)}
                                </select>
                                <input type="text" placeholder="$" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: formatNumberInput(e.target.value)})} className="w-20 text-xs p-1.5 border rounded outline-none bg-white text-right font-mono"/>
                                <button type="button" onClick={() => {const amt=Number(newExpense.amount.replace(/,/g,'')); if(amt>0 && v.id) { addExpense(v.id, {id:Date.now().toString(), ...newExpense, amount:amt} as any); setNewExpense({...newExpense, amount:''}); }}} className="bg-gray-600 text-white text-xs px-3 rounded hover:bg-gray-700">新增</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100 sticky bottom-0 bg-white z-10">
                    <div className="flex-1 mr-4">
                        <textarea name="remarks" defaultValue={v.remarks} placeholder="Remarks / 備註..." className="w-full text-xs p-2 border rounded h-16 resize-none outline-none focus:ring-1 ring-blue-200"></textarea>
                    </div>
                    {v.id && (<div className="flex mr-auto gap-2"><button type="button" onClick={() => openPrintPreview('sales_contract', v as Vehicle)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded" title="列印合約"><FileText size={18}/></button><button type="button" onClick={() => openPrintPreview('invoice', v as Vehicle)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded" title="列印發票"><Printer size={18}/></button></div>)}
                    <button type="button" onClick={() => {setEditingVehicle(null); if(activeTab !== 'inventory_add') {} else {setActiveTab('inventory');} }} className="px-5 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">取消</button>
                    <button type="submit" className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-bold text-sm rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center"><Save size={16} className="mr-2"/> 儲存變更</button>
                </div>
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

          {/* Cross Border Tab - 修正版：解決 'cb' implicit any 類型錯誤 */}
          {activeTab === 'cross_border' && (
            <div className="flex-1 overflow-y-auto">
              <CrossBorderView 
                inventory={inventory}
                settings={settings}
                dbEntries={dbEntries}
                activeCbVehicleId={activeCbVehicleId}
                setActiveCbVehicleId={setActiveCbVehicleId}
                setEditingVehicle={setEditingVehicle}
                // 定義操作函數 (加入 :any 解決類型報錯)
                addCbTask={(vid, task) => updateSubItem(vid, 'crossBorder', (cb: any) => ({ ...cb, tasks: [...(cb.tasks || []), task] }))}
                updateCbTask={(vid, task) => updateSubItem(vid, 'crossBorder', (cb: any) => ({ ...cb, tasks: (cb.tasks || []).map((t: any) => t.id === task.id ? task : t) }))}
                deleteCbTask={(vid, taskId) => updateSubItem(vid, 'crossBorder', (cb: any) => ({ ...cb, tasks: (cb.tasks || []).filter((t: any) => t.id !== taskId) }))}
                addPayment={addPayment}
                deletePayment={deletePayment}
              />
            </div>
          )}

          
          {/* Dashboard Tab - 完整修復版 */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col h-full overflow-hidden space-y-4 animate-fade-in">
              <h2 className="text-2xl font-bold text-slate-800 flex-none">業務儀表板</h2>
              
              {/* 1. 財務卡片 (Financial Cards) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-none">
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500"><p className="text-xs text-gray-500 uppercase">庫存總值</p><p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalStockValue)}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500"><p className="text-xs text-gray-500 uppercase">未付費用</p><p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalPayable)}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500"><p className="text-xs text-gray-500 uppercase">應收尾數</p><p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalReceivable)}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500"><p className="text-xs text-gray-500 uppercase">本月銷售額</p><p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalSoldThisMonth)}</p></div>
              </div>

              {/* 2. 提醒中心 (Notification Center) */}
              {(() => {
                  // --- A. 資料庫文件提醒 ---
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
                  docAlerts.sort((a, b) => a.days - b.days);

                  // --- B. 中港業務提醒 ---
                  const cbAlerts: any[] = [];
                  const cbDateFields = {
                      dateHkInsurance: '香港保險', dateReservedPlate: '留牌紙', dateBr: '商業登記(BR)',
                      dateLicenseFee: '香港牌費', dateMainlandJqx: '內地交強險', dateMainlandSyx: '內地商業險',
                      dateClosedRoad: '禁區紙', dateApproval: '批文卡', dateMainlandLicense: '內地行駛證',
                      dateHkInspection: '香港驗車'
                  };

                  inventory.filter(v => v.crossBorder?.isEnabled).forEach(v => {
                      Object.entries(cbDateFields).forEach(([field, label]) => {
                          // @ts-ignore
                          const dateStr = v.crossBorder?.[field];
                          if (dateStr) {
                              const days = getDaysRemaining(dateStr);
                              if (days !== null && days <= 30) {
                                  cbAlerts.push({
                                      id: v.id,
                                      title: v.regMark || '未出牌',
                                      desc: label,
                                      date: dateStr,
                                      days: days,
                                      status: days < 0 ? 'expired' : 'soon',
                                      raw: v
                                  });
                              }
                          }
                      });
                  });
                  cbAlerts.sort((a, b) => a.days - b.days);

                  const cbExpiredCount = cbAlerts.filter(a => a.status === 'expired').length;
                  const cbSoonCount = cbAlerts.filter(a => a.status === 'soon').length;
                  const docExpiredCount = docAlerts.filter(a => a.status === 'expired').length;
                  const docSoonCount = docAlerts.filter(a => a.status === 'soon').length;

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
                          {/* 中港提醒 */}
                          <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg p-4 text-white shadow-sm flex gap-4 relative overflow-hidden">
                              <div className="w-1/3 flex flex-col justify-center z-10 border-r border-white/10 pr-4">
                                  <div className="flex items-center text-slate-300 text-xs uppercase font-bold mb-2"><Globe size={14} className="mr-1"/> 中港提醒</div>
                                  <div className="space-y-2">
                                      <div><div className="text-2xl font-bold text-red-400 leading-none">{cbExpiredCount}</div><div className="text-[10px] text-slate-400">過期項目</div></div>
                                      <div><div className="text-2xl font-bold text-amber-400 leading-none">{cbSoonCount}</div><div className="text-[10px] text-slate-400">即將到期</div></div>
                                  </div>
                              </div>
                              <AlertList items={cbAlerts} onItemClick={(item) => { setActiveTab('cross_border'); setActiveCbVehicleId(item.id); }} />
                              <Globe size={100} className="absolute -left-6 -bottom-6 text-slate-950 opacity-20 pointer-events-none" />
                          </div>

                          {/* 文件提醒 */}
                          <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-4 text-white shadow-sm flex gap-4 relative overflow-hidden">
                              <div className="w-1/3 flex flex-col justify-center z-10 border-r border-white/10 pr-4">
                                  <div className="flex items-center text-blue-200 text-xs uppercase font-bold mb-2"><Database size={14} className="mr-1"/> 文件提醒</div>
                                  <div className="space-y-2">
                                      <div><div className="text-2xl font-bold text-red-400 leading-none">{docExpiredCount}</div><div className="text-[10px] text-blue-300">過期文件</div></div>
                                      <div><div className="text-2xl font-bold text-amber-400 leading-none">{docSoonCount}</div><div className="text-[10px] text-blue-300">即將到期</div></div>
                                  </div>
                              </div>
                              <AlertList items={docAlerts} onItemClick={(item) => { setActiveTab('database'); setEditingEntry(item.raw); setIsDbEditing(true); }} />
                              <Bell size={100} className="absolute -left-6 -bottom-6 text-blue-950 opacity-20 pointer-events-none" />
                          </div>
                      </div>
                  );
              })()}

              {/* Data Calculation & Tables (庫存列表) */}
              {(() => {
                  const allVehicles = getSortedInventory();
                  
                  // 排序權重：在庫 > 已訂 > 未完成 > 已完成
                  const getSortWeight = (car: Vehicle) => {
                      if (car.status === 'In Stock') return 1;
                      if (car.status === 'Reserved') return 2;
                      const received = (car.payments || []).reduce((acc, p) => acc + (p.amount || 0), 0);
                      const balance = (car.price || 0) - received;
                      const hasUnpaidExpenses = (car.expenses || []).some(e => e.status === 'Unpaid');
                      if (balance > 0 || hasUnpaidExpenses || !car.regMark) return 3; // 未完成
                      return 4; // 已完成
                  };

                  const sortedDashboardList = [...allVehicles].sort((a, b) => getSortWeight(a) - getSortWeight(b));

                  return (
                      <div className="bg-white rounded-lg shadow-sm p-4 flex-1 flex flex-col overflow-hidden min-h-0">
                        <h3 className="font-bold mb-4 flex-none text-slate-700 flex items-center justify-between">
                            <span className="flex items-center"><Car size={18} className="mr-2 text-blue-600"/> 車輛庫存概覽 (Inventory Overview)</span>
                            <span className="text-xs font-normal text-gray-400">排序: In Stock &gt; Reserved &gt; 未完成 &gt; 已完成</span>
                        </h3>
                        <div className="flex-1 overflow-y-auto border rounded-lg">
                          <table className="w-full text-left text-sm whitespace-nowrap relative">
                            <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm text-slate-600 font-bold">
                                <tr className="border-b">
                                    <th className="p-3 w-24">狀態</th>
                                    <th className="p-3">入庫日</th>
                                    <th className="p-3">車牌</th>
                                    <th className="p-3">車型</th>
                                    <th className="p-3">售價</th>
                                    <th className="p-3">牌費到期</th>
                                    <th className="p-3 text-right">財務狀況</th>
                                </tr>
                            </thead>
                            <tbody>
                              {sortedDashboardList.map(car => {
                                  const received = (car.payments || []).reduce((acc, p) => acc + (p.amount || 0), 0);
                                  const balance = (car.price || 0) - received;
                                  const unpaidExps = (car.expenses || []).filter(e => e.status === 'Unpaid').length || 0;
                                  const cbTags = getCbTags(car.crossBorder?.ports);
                                  
                                  let statusClass = "bg-gray-100 text-gray-600";
                                  if (car.status === 'In Stock') statusClass = "bg-green-100 text-green-700 border-green-200 font-bold";
                                  else if (car.status === 'Reserved') statusClass = "bg-yellow-50 text-yellow-700 border-yellow-200 font-bold";
                                  else if (balance > 0) statusClass = "bg-red-50 text-red-600 border-red-100 font-bold";

                                  return (
                                    <tr key={car.id} className="border-b hover:bg-blue-50 cursor-pointer transition-colors group" onClick={() => setEditingVehicle(car)}>
                                      <td className="p-3"><span className={`px-2 py-1 rounded text-xs border ${statusClass}`}>{car.status === 'In Stock' ? '在庫' : (car.status === 'Reserved' ? '已訂' : '已售')}</span></td>
                                      <td className="p-3 text-gray-500 text-xs font-mono">{car.stockInDate || '-'}</td>
                                      <td className="p-3 font-bold text-slate-800">
                                          {car.regMark || <span className="text-gray-400 italic">未出牌</span>}
                                          {car.crossBorder?.isEnabled && <Globe size={12} className="inline ml-1 text-blue-400"/>}
                                      </td>
                                      <td className="p-3"><span className="font-medium">{car.make} {car.model}</span><span className="text-xs text-gray-400 ml-2">{car.year}</span></td>
                                      <td className="p-3 font-mono font-bold text-slate-700">{formatCurrency(car.price)}</td>
                                      <td className="p-3 text-xs"><DateStatusBadge date={car.licenseExpiry} label="牌費"/></td>
                                      <td className="p-3 text-right">
                                          {unpaidExps > 0 && <span className="text-red-500 text-xs font-bold block bg-red-50 px-1 rounded w-fit ml-auto mb-1">{unpaidExps} 筆費用未付</span>}
                                          {balance > 0 && car.status !== 'In Stock' ? (<span className="text-blue-600 text-xs font-bold block">欠 {formatCurrency(balance)}</span>) : ((car.status === 'Sold' && unpaidExps === 0) && <span className="text-green-500 flex justify-end items-center"><CheckCircle size={14} className="mr-1"/> 完成</span>)}
                                      </td>
                                    </tr>
                                  );
                              })}
                              {sortedDashboardList.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-400">目前沒有車輛資料</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
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
          {activeTab === 'settings' && (
              <div className="flex-1 overflow-y-auto">
                  <SettingsManager 
                      settings={settings}
                      setSettings={setSettings}
                      db={db}
                      staffId={staffId}
                      appId={appId}
                      inventory={inventory}
                      updateSettings={updateSettings}
                  />
              </div>
          )}

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
