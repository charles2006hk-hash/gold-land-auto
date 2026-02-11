'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Car, FileText, LayoutDashboard, Plus, Printer, Trash2, DollarSign, 
  Menu, X, Building2, Database, Loader2, DownloadCloud, AlertTriangle, User as UserIcon,
  Users, LogOut, UserCircle, ArrowRight, Settings, Save, Wrench, 
  Calendar, CheckCircle, XCircle, Filter, ChevronDown, ChevronUp, Edit,
  ArrowUpDown, Briefcase, BarChart3, FileBarChart, ExternalLink,
  StickyNote, CreditCard, Armchair, Fuel, Zap, Search, ChevronLeft, ChevronRight, Layout,
  Receipt, FileCheck, CalendarDays, Bell, ShieldCheck, Clock, CheckSquare,
  Check, AlertCircle, Link, Share2,
  CreditCard as PaymentIcon, MapPin, Info, RefreshCw, Globe, Upload, Image as ImageIcon, File, ArrowLeft, // Added Upload, Image as ImageIcon, File
  Minimize2, Maximize2, Eye, Star, Clipboard, Copy, GitMerge, Play, Camera, History, BellRing
} from 'lucide-react';

import { compressImage } from '@/utils/imageHelpers';

// --- Firebase Imports ---
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, 
  initializeAuth, browserLocalPersistence, inMemoryPersistence, Auth 
} from "firebase/auth";
import type { User } from "firebase/auth";
import { 
  getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, 
  orderBy, serverTimestamp, writeBatch, Firestore, updateDoc, getDoc, setDoc,
  getDocs, where, limit 
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadString, 
  uploadBytes,      // 新增：處理 Blob/File 上傳
  getDownloadURL    // 新增：獲取下載連結
} from "firebase/storage";

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
let storage: any = null;

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
    storage = getStorage(app);
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
  phone: "+852 3996 9796",
  email: "marketing@goldlandhk.com",
  logo_url: "/GL_APPLOGO.png" 
};



type DatabaseEntry = {
    id: string;
    managedBy?: string; // ★ 新增：負責員工 ID
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

// --- 新增：媒體庫數據結構 ---
type MediaLibraryItem = {
    id: string;
    url: string;        // Firebase Storage 下載連結
    path: string;       // Storage 內部路徑，方便刪除
    fileName: string;
    tags: string[];     // AI 標籤：['Toyota', 'White', 'Exterior']
    status: 'unassigned' | 'linked'; 
    relatedVehicleId?: string;
    createdAt: any;
    isPrimary?: boolean;
    // ★★★ 新增：AI 結構化數據 (解決編譯錯誤的關鍵) ★★★
    aiData?: {
        make?: string;
        model?: string;
        year?: string;
        color?: string;
        type?: string;
    };
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

// --- 新增：文件交收紀錄 ---
type DocCustodyLog = {
    id: string;
    docName: string;      // 文件名 (牌簿, 身份證, 回鄉證...)
    action: 'CheckIn' | 'CheckOut'; // 收件 (入庫) | 交出 (出庫)
    direction: string;    // 來源/去向 (例如: 客戶陳生, 運輸署, 快遞)
    handler: string;      // 經手員工
    timestamp: string;    // 時間
    photoUrl?: string;    // 交收照片 (存證)
    note?: string;        // 備註
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

    documentLogs?: DocCustodyLog[]; // ★ 新增這一行

    // 新增：業務流程列表
    tasks?: CrossBorderTask[];
};



type Vehicle = {
  id: string;
  managedBy?: string; // ★ 新增：負責員工 ID (Email)
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
  status: 'In Stock' | 'Sold' | 'Reserved' | 'Withdrawn';
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

  activeWorkflow?: {
      type: string;        // 流程類型 (例如 'HK_NORTH')
      currentStep: number; // 當前步驟索引 (0, 1, 2...)
      startDate: string;   // 開案日期
      logs: {              // 辦理紀錄
          id: string;
          action: string;
          stage: string;
          details: string;
          timestamp: string;
          attachments: string[];
          user: string;
      }[];
  };
};

type SystemSettings = {
  makes: string[];
  models: Record<string, string[]>; 
  expenseTypes: (string | { name: string; defaultCompany: string; defaultAmount: number; defaultDays: string })[];
  expenseCompanies: string[];
  paymentTypes: string[]; 
  colors: string[];
  // ★★★ 新增：中港代辦服務項目列表 (解決 serviceItems 報錯) ★★★
  serviceItems?: string[];
  
  cbItems: (string | { name: string; defaultInst: string; defaultFee: number; defaultDays: string })[];
  cbInstitutions: string[];
  dbCategories: string[];
  dbRoles: string[]; 
  dbDocTypes: Record<string, string[]>;
  // ★★★ 新增：提醒設定結構 ★★★
  reminders?: {
      isEnabled: boolean;          // 總開關
      daysBefore: number;          // 預設提前幾天提醒 (例如 30天)
      time: string;                // 每日提醒時間 (例如 09:00)
      categories: {                // 要開啟提醒的類別
          license: boolean;        // 牌費/驗車
          insurance: boolean;      // 保險
          crossBorder: boolean;    // 中港證件
          installments: boolean;   // 供車/分期
      };
  };
  backup?: {
      frequency: 'manual' | 'daily' | 'weekly' | 'monthly'; // 頻率
      lastBackupDate: string; // 上次備份日期
      autoCloud: boolean;     // 是否開啟雲端自動備份
  };

  // ★★★ 新增：推送通知設定 ★★★
  pushConfig?: {
      isEnabled: boolean;       // 是否開啟全域推送
      vapidKey: string;         // FCM 公鑰 (Public Key)
      events: {                 // 訂閱哪些事件
          newCar: boolean;      // 新車入庫
          sold: boolean;        // 車輛售出
          expiry: boolean;      // 到期提醒
          workflow: boolean;    // 流程進度更新
      };
  };

};

type Customer = {
  name: string;
  phone: string;
  hkid: string;
  address: string;
};

type DocType = 'sales_contract' | 'purchase_contract' | 'consignment_contract' | 'invoice' | 'receipt';

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
  // ★★★ 新增：預設收款項目 ★★★
  paymentTypes: ['訂金 (Deposit)', '大訂 (Part Payment)', '尾數 (Balance)', '全數 (Full Payment)', '服務費 (Service Fee)', '代支 (Advance)'],
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
  },

  // ★★★ 新增：提醒預設值 ★★★
  reminders: {
      isEnabled: true,
      daysBefore: 30,
      time: '10:00',
      categories: {
          license: true,
          insurance: true,
          crossBorder: true,
          installments: false
      }
  },
  backup: {
      frequency: 'monthly',
      lastBackupDate: '',
      autoCloud: true
  },

  // ★★★ 新增：推送預設值 ★★★
  pushConfig: {
      isEnabled: false,
      vapidKey: 'BIpAVoyM6C6CodEmmKnsykyuQkX0g0VBBXDUWikIRhKtnCVUVCuO86EqlEgf5zuxz8nGA3DCdbEr1yKynCXFJKA', // 稍後需填入 Firebase Console 的 Key
      events: {
          newCar: true,
          sold: true,
          expiry: true,
          workflow: true
      }
  },
  
};

// ------------------------------------------------------------------
// ★★★ 新增：業務流程範本定義 (Workflow Templates) ★★★
// ------------------------------------------------------------------
const WORKFLOW_TEMPLATES = {
    'HK_NORTH': { 
        name: '港車北上 (New Application)', 
        color: 'bg-blue-600',
        steps: [
            { name: '官網抽籤', url: 'https://www.hzmbqfs.gov.hk/', fields: ['regMark', 'chassisNo'] },
            { name: '預約驗車 (中檢)', url: 'https://www.cic.com.hk/', fields: ['regMark', 'chassisNo', 'engineNo'] },
            { name: '內地系統備案', url: 'https://gcbs.gdzwfw.gov.cn/', fields: ['regMark', 'driver1'] }, // driver1_id 需確保 Vehicle 有此欄位或從 crossBorder 讀取
            { name: '購買內地保險', url: '', fields: [] },
            { name: '上傳驗車報告', url: 'https://gcbs.gdzwfw.gov.cn/', fields: [] },
            { name: '獲取電子牌證', url: '', fields: [] }
        ]
    },
    'Z_LICENSE_NEW': { 
        name: '粵Z新辦 (New License)', 
        color: 'bg-purple-600',
        steps: [
            { name: '省廳批文申請', url: 'http://gdga.gd.gov.cn/', fields: ['hkCompany', 'mainlandCompany'] },
            { name: '商務廳核准', url: '', fields: [] },
            { name: '海關備案', url: 'https://www.singlewindow.cn/', fields: ['chassisNo', 'colorExt'] },
            { name: '司機體檢', url: '', fields: ['driver1'] },
            { name: '驗車 (中檢)', url: 'https://www.cic.com.hk/', fields: ['regMark'] },
            { name: '領取行駛證', url: '', fields: [] }
        ]
    },
    'DRIVER_CHANGE': {
        name: '更換司機 (Change Driver)',
        color: 'bg-orange-500',
        steps: [
            { name: '省廳批文變更', url: 'http://gdga.gd.gov.cn/', fields: ['hkCompany', 'driver1'] },
            { name: '海關變更', url: 'https://www.singlewindow.cn/', fields: [] },
            { name: '預約禁區紙', url: 'https://www.td.gov.hk/', fields: ['regMark'] }
        ]
    }
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

// --- Components: Modern Staff Login Screen v2.1 (Fix: Case Sensitivity) ---
const StaffLoginScreen = ({ onLogin, systemUsers }: { onLogin: (user: any) => void, systemUsers: any[] }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 自動登入檢查
  useEffect(() => {
      const savedUser = localStorage.getItem('gla_saved_user');
      if (savedUser) {
          try {
              const parsed = JSON.parse(savedUser);
              // 簡單驗證過期時間 (例如 7 天)
              if (new Date().getTime() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
                  onLogin(parsed.user);
              }
          } catch (e) { localStorage.removeItem('gla_saved_user'); }
      }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 模擬網路延遲
    await new Promise(r => setTimeout(r, 500));

    const inputId = userId.trim();

    // 1. 超級管理員後門 (緊急用，不分大小寫)
    if (inputId.toUpperCase() === 'BOSS' && password === '8888') {
        const adminUser = { email: 'BOSS', role: 'admin', modules: ['all'] };
        handleSuccess(adminUser);
        return;
    }

    // 2. 驗證用戶 (★ 關鍵修正：大小寫不敏感比對 ★)
    // 這樣無論輸入 "Charles" 還是 "charles"，只要密碼對，都能找到資料庫裡那個正確的 user 物件
    // 注意：systemUsers 是從主程式傳進來的，裡面是資料庫的正確名單
    const validUser = systemUsers.find(u => 
        u.email.toLowerCase() === inputId.toLowerCase() && 
        u.password === password
    );
    
    if (validUser) {
        handleSuccess(validUser);
    } else {
        setError('帳號或密碼錯誤 (Invalid Credentials)');
        setIsLoading(false);
    }
  };

  const handleSuccess = (user: any) => {
      if (rememberMe) {
          localStorage.setItem('gla_saved_user', JSON.stringify({ user, timestamp: new Date().getTime() }));
      }
      onLogin(user);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景裝飾 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-yellow-600 rounded-full blur-[100px]"></div>
      </div>

      <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-white/20 relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg p-2">
             <img src={COMPANY_INFO.logo_url} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display='none'; }} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">GOLD LAND AUTO</h1>
          <p className="text-blue-200 text-xs mt-1 font-medium tracking-widest uppercase">Secure DMS Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-200 ml-1 uppercase">User ID</label>
            <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18}/>
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-yellow-500 outline-none transition" 
                  placeholder="員工帳號" 
                  value={userId} 
                  onChange={e => setUserId(e.target.value)} 
                  autoFocus 
                />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-200 ml-1 uppercase">Password</label>
            <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18}/>
                <input 
                  type="password" 
                  className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-yellow-500 outline-none transition" 
                  placeholder="密碼" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-blue-200">
              <label className="flex items-center cursor-pointer hover:text-white transition">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="mr-2 rounded text-yellow-500 focus:ring-yellow-500 bg-white/10 border-white/20"/>
                  鎖定本機 (Keep me signed in)
              </label>
          </div>

          {error && <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-xs text-center flex items-center justify-center"><AlertTriangle size={14} className="mr-2"/>{error}</div>}

          <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black p-3.5 rounded-xl font-bold text-sm flex items-center justify-center transition transform active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? <Loader2 className="animate-spin" size={20}/> : <><span className="mr-2">安全登入</span> <ArrowRight size={16}/></>}
          </button>
        </form>
        
        <div className="mt-6 text-center">
            <p className="text-[10px] text-white/20">Authorized Personnel Only</p>
        </div>
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

// --- 2. Sidebar (外部組件 - v2.2: 含權限過濾與登出修復) ---
type SidebarProps = {
    activeTab: string;
    setActiveTab: (tab: any) => void;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (open: boolean) => void;
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
    staffId: string | null;
    setStaffId: (id: string | null) => void;
    // ★★★ 新增：接收當前用戶權限物件 ★★★
    currentUser: { email: string, modules: string[] } | null;
};

const Sidebar = ({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen, isSidebarCollapsed, setIsSidebarCollapsed, staffId, setStaffId, currentUser }: SidebarProps) => {
    
    const handleLogout = () => {
        if (confirm("確定登出系統？(Confirm Logout?)")) {
            localStorage.removeItem('gla_saved_user');
            setStaffId(null);
        }
    };

    // ★★★ 定義完整選單與權限對應 ★★★
    const allMenuItems = [
        { id: 'dashboard', label: '業務儀表板', icon: LayoutDashboard, permission: 'dashboard' },
        { id: 'inventory', label: '車輛管理', icon: Car, permission: 'inventory' },
        { id: 'create_doc', label: '開單系統', icon: FileText, permission: 'inventory' }, // 開單通常跟隨車庫
        { id: 'reports', label: '統計報表', icon: FileBarChart, permission: 'reports' },
        { id: 'cross_border', label: '中港業務', icon: Globe, permission: 'business' }, 
        { id: 'business', label: '業務辦理流程', icon: Briefcase, permission: 'business' },
        { id: 'database', label: '資料庫中心', icon: Database, permission: 'database' },
        { id: 'media_center', label: '智能圖庫', icon: ImageIcon, permission: 'inventory' },
        { id: 'settings', label: '系統設置', icon: Settings, permission: 'settings' }
    ];

    // ★★★ 過濾選單邏輯 ★★★
    const visibleMenuItems = allMenuItems.filter(item => {
        // 1. 還沒登入或資料未載入 -> 不顯示
        if (!currentUser) return false;

        // 2. 超級管理員 (BOSS) 或擁有 'all' 權限 -> 全部顯示
        if (currentUser.modules?.includes('all') || currentUser.email.toUpperCase() === 'BOSS') return true;
        
        // 3. Dashboard 預設每個人都能看 (或者您可以限制)
        if (item.id === 'dashboard') return true;

        // 4. 檢查用戶的 modules 陣列是否包含該項目的 permission
        return currentUser.modules?.includes(item.permission);
    });

    return (
        <>
          {isMobileMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
          <div className={`fixed inset-y-0 left-0 z-40 bg-slate-900 text-white transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:h-screen flex flex-col ${isSidebarCollapsed ? 'w-16' : 'w-64'} print:hidden shadow-xl border-r border-slate-800`}>
            
            {/* Header 區域 */}
            <div className={`h-16 border-b border-slate-700 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between px-4'} transition-all flex-none`}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-white/5 rounded-lg border border-slate-600">
                        <img src={COMPANY_INFO.logo_url} alt="Logo" className="w-full h-full object-contain p-0.5" />
                    </div>
                    <div className={`transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                        <h1 className="text-base font-bold text-yellow-500 tracking-tight leading-none">金田汽車</h1>
                        <span className="text-[10px] text-slate-400 font-medium">DMS 智能管理系統</span>
                    </div>
                </div>
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:flex text-slate-400 hover:text-white hover:bg-slate-800 p-1 rounded transition-colors" title={isSidebarCollapsed ? "展開選單" : "縮起選單"}>{isSidebarCollapsed ? null : <ChevronLeft size={16} />}</button>
            </div>

            {/* 導航列表 (使用 visibleMenuItems 渲染) */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {visibleMenuItems.map(item => (
                 <button 
                    key={item.id} 
                    onClick={() => { setActiveTab(item.id as any); setIsMobileMenuOpen(false); }} 
                    className={`flex items-center w-full p-2.5 rounded-lg transition-all duration-200 group relative ${activeTab === item.id ? 'bg-yellow-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300 hover:text-white'} ${isSidebarCollapsed ? 'justify-center' : ''}`} 
                    title={isSidebarCollapsed ? item.label : ''}
                 >
                    <item.icon size={18} className={`flex-shrink-0 ${!isSidebarCollapsed && 'mr-3'} ${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                    {!isSidebarCollapsed && <span className="whitespace-nowrap text-sm font-medium tracking-wide">{item.label}</span>}
                    
                    {isSidebarCollapsed && <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-slate-700">{item.label}</div>}
                 </button>
              ))}
            </nav>
            
            {!isSidebarCollapsed && <InfoWidget />}
            
            {/* 底部登入資訊 */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex-none">
                 {isSidebarCollapsed ? (
                     <button onClick={handleLogout} className="w-full flex justify-center text-slate-500 hover:text-red-400 transition" title="登出"><LogOut size={18} /></button>
                 ) : (
                     <div className="flex items-center justify-between px-1">
                         <div className="flex items-center space-x-2 overflow-hidden">
                             <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center text-yellow-500 border border-slate-700"><UserCircle size={16} /></div>
                             <div className="flex-1 min-w-0"><p className="text-xs font-bold text-white truncate">{staffId}</p><p className="text-[9px] text-slate-500">在線</p></div>
                         </div>
                         <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition p-1.5 hover:bg-slate-800 rounded"><LogOut size={16} /></button>
                     </div>
                 )}
                 {isSidebarCollapsed && <button onClick={() => setIsSidebarCollapsed(false)} className="w-full mt-3 flex justify-center text-slate-600 hover:text-white py-1 md:flex hidden"><ChevronRight size={16} /></button>}
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden absolute top-4 right-4 text-slate-400 hover:text-white"><X size={24} /></button>
          </div>
        </>
    );
};



// ------------------------------------------------------------------
// ★★★ 3. DatabaseModule (v18.0: 含數據權限隔離 + AI + PDF) ★★★
// ------------------------------------------------------------------
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
    // ★★★ 新增：接收權限相關參數 ★★★
    currentUser: any;
    systemUsers: any[];
};

const DatabaseModule = ({ db, staffId, appId, settings, editingEntry, setEditingEntry, isDbEditing, setIsDbEditing, inventory, currentUser, systemUsers }: DatabaseModuleProps) => {
    const [entries, setEntries] = useState<DatabaseEntry[]>([]);
    const [selectedCatFilter, setSelectedCatFilter] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [tagInput, setTagInput] = useState('');
    
    // 重複資料處理狀態
    const [dupeGroups, setDupeGroups] = useState<DatabaseEntry[][]>([]);
    const [showDupeModal, setShowDupeModal] = useState(false);

    // AI 識別狀態
    const [isScanning, setIsScanning] = useState(false);

    // ★★★ AI 識別函數 (保持不變) ★★★
    const analyzeImageWithAI = async (base64Image: string, docType: string) => {
        setIsScanning(true);
        try {
            const response = await fetch('/api/ocr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image, docType: docType })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || '識別請求失敗');
            const data = result.data;

            const cleanColor = (rawColor: string) => {
                if (!rawColor) return '';
                const parts = rawColor.split(/[\s\-\/\(\)]+/); 
                return parts[0] ? parts[0].toUpperCase() : '';
            };

            if (data) {
                setEditingEntry(prev => {
                    if (!prev) return null;
                    const finalOwnerName = data.registeredOwnerName || data.name || prev.registeredOwnerName;
                    const finalOwnerId = data.registeredOwnerId || data.idNumber || prev.registeredOwnerId;

                    return {
                        ...prev,
                        name: data.name || prev.name,
                        idNumber: data.idNumber || prev.idNumber,
                        phone: data.phone || prev.phone,
                        address: data.address || prev.address,
                        expiryDate: data.expiryDate || prev.expiryDate,
                        quotaNo: data.quotaNo || prev.quotaNo,
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
            alert(`識別失敗: ${error.message}`);
        }
        setIsScanning(false);
    };

    // ★★★ 資料讀取與權限過濾 ★★★
    useEffect(() => {
        if (!db || !staffId) return;
        const colRef = collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'database');
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
                    docType: data.docType || '', 
                    description: data.description || '',
                    relatedPlateNo: data.relatedPlateNo || '',
                    tags: data.tags || [], 
                    roles: data.roles || [], 
                    attachments: attachments,
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
                    createdAt: data.createdAt, 
                    updatedAt: data.updatedAt,
                    reminderEnabled: data.reminderEnabled || false, 
                    expiryDate: data.expiryDate || '',
                    renewalCount: data.renewalCount || 0, 
                    renewalDuration: data.renewalDuration || 1, 
                    renewalUnit: data.renewalUnit || 'year',
                    // ★ 讀取負責人欄位
                    managedBy: data.managedBy || '', 
                } as DatabaseEntry);
            });

            // ★★★ 核心：資料權限過濾 ★★★
            const filteredList = list.filter(entry => {
                // 1. 管理員 (BOSS / all 權限 / 資料視角=all) -> 看全部
                if (staffId === 'BOSS' || currentUser?.modules?.includes('all') || currentUser?.dataAccess === 'all') {
                    return true;
                }
                // 2. 普通員工 -> 只看自己負責的 OR 公用資料(無負責人)
                return entry.managedBy === staffId || !entry.managedBy;
            });

            setEntries(filteredList); 
        });
        return () => unsub();
    }, [staffId, db, appId, currentUser]); // 加入 currentUser 依賴

    // PDF 與圖片上傳 (保持不變)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const files = e.target.files;
          if (!files || files.length === 0) return;
          const file = files[0];
          if (file.type === 'application/pdf') {
              if (file.size > 10 * 1024 * 1024) { alert("PDF 檔案過大 (限制 10MB)"); return; }
              try {
                  const pdfjsLib = await import('pdfjs-dist');
                  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${(pdfjsLib as any).version}/build/pdf.worker.min.mjs`;
                  const arrayBuffer = await file.arrayBuffer();
                  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, cMapUrl: `https://unpkg.com/pdfjs-dist@${(pdfjsLib as any).version}/cmaps/`, cMapPacked: true });
                  const pdf = await loadingTask.promise;
                  const newAttachments: DatabaseAttachment[] = [];
                  const MAX_PAGES = 5; 
                  const numPages = Math.min(pdf.numPages, MAX_PAGES);
                  for (let i = 1; i <= numPages; i++) {
                      const page = await pdf.getPage(i);
                      const viewport = page.getViewport({ scale: 2.0 }); 
                      const canvas = document.createElement('canvas');
                      const context = canvas.getContext('2d');
                      canvas.height = viewport.height; canvas.width = viewport.width;
                      if (context) {
                          await page.render({ canvasContext: context, viewport: viewport } as any).promise;
                          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                          newAttachments.push({ name: `${file.name}_P${i}.jpg`, data: dataUrl });
                      }
                  }
                  setEditingEntry(prev => prev ? { ...prev, attachments: [...prev.attachments, ...newAttachments] } : null);
                  alert(`成功匯入 PDF 前 ${numPages} 頁！`);
              } catch (err: any) { console.error("PDF 解析錯誤:", err); alert(`PDF 解析失敗: ${err.message}`); }
              e.target.value = ''; return;
          }
          if (file.size > 5 * 1024 * 1024) { alert(`檔案過大`); return; }
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
        setEditingEntry({ ...editingEntry, expiryDate: currentDate.toISOString().split('T')[0], renewalCount: (editingEntry.renewalCount || 0) + 1 });
    };

    // ★★★ 儲存邏輯 (含自動指派負責人) ★★★
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); 
        if (!db || !staffId || !editingEntry) return;
        const autoTags = new Set(editingEntry.tags || []);
        if(editingEntry.name) autoTags.add(editingEntry.name);
        
        const finalEntry = { 
            ...editingEntry, 
            phone: editingEntry.phone || '',
            address: editingEntry.address || '',
            idNumber: editingEntry.idNumber || '',
            plateNoHK: editingEntry.plateNoHK || '',
            plateNoCN: editingEntry.plateNoCN || '',
            quotaNo: editingEntry.quotaNo || '',
            docType: editingEntry.docType || '',
            description: editingEntry.description || '',
            relatedPlateNo: editingEntry.relatedPlateNo || '',
            make: editingEntry.make || '',
            model: editingEntry.model || '',
            chassisNo: editingEntry.chassisNo || '',
            engineNo: editingEntry.engineNo || '',
            manufactureYear: editingEntry.manufactureYear || '',
            vehicleColor: editingEntry.vehicleColor || '',
            firstRegCondition: editingEntry.firstRegCondition || '',
            registeredOwnerName: editingEntry.registeredOwnerName || '',
            registeredOwnerId: editingEntry.registeredOwnerId || '',
            engineSize: Number(editingEntry.engineSize) || 0,
            priceA1: Number(editingEntry.priceA1) || 0,
            priceTax: Number(editingEntry.priceTax) || 0,
            prevOwners: editingEntry.prevOwners !== undefined ? Number(editingEntry.prevOwners) : 0,
            tags: Array.from(autoTags), 
            roles: editingEntry.roles || [], 
            attachments: editingEntry.attachments || [],
            reminderEnabled: editingEntry.reminderEnabled || false,
            expiryDate: editingEntry.expiryDate || '',
            renewalCount: editingEntry.renewalCount || 0,
            renewalDuration: editingEntry.renewalDuration || 1,
            renewalUnit: editingEntry.renewalUnit || 'year',
            
            // ★ 新增/編輯時，確保負責人欄位正確 (若為空則預設為當前員工)
            managedBy: editingEntry.managedBy || staffId, 
        };

        try {
            if (editingEntry.id) {
                const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'database', editingEntry.id);
                const cleanData = JSON.parse(JSON.stringify(finalEntry));
                await updateDoc(docRef, { ...cleanData, updatedAt: serverTimestamp() });
                alert('資料已更新');
                setIsDbEditing(false); 
            } else {
                const { id, ...dataToSave } = finalEntry;
                const colRef = collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'database');
                const cleanData = JSON.parse(JSON.stringify(dataToSave));
                const newRef = await addDoc(colRef, { ...cleanData, createdAt: serverTimestamp() });
                setEditingEntry({ ...finalEntry, id: newRef.id }); 
                alert('新資料已建立');
                setIsDbEditing(false);
            }
        } catch (err) { console.error("Save Error:", err); alert('儲存失敗'); }
    };

    const handleDelete = async (id: string) => {
        if (!db || !staffId) return;
        if (!confirm('確定刪除此筆資料？無法復原。')) return;
        const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'database', id);
        await deleteDoc(docRef);
        if (editingEntry?.id === id) { setEditingEntry(null); setIsDbEditing(false); }
    };

    const toggleRole = (role: string) => {
        setEditingEntry(prev => { if (!prev) return null; const currentRoles = prev.roles || []; if (currentRoles.includes(role)) return { ...prev, roles: currentRoles.filter(r => r !== role) }; return { ...prev, roles: [...currentRoles, role] }; });
    };

    const addTag = () => {
        if (tagInput.trim() && editingEntry) { setEditingEntry({ ...editingEntry, tags: [...(editingEntry.tags || []), tagInput.trim()] }); setTagInput(''); }
    };

    const filteredEntries = entries.filter(entry => {
        const matchCat = selectedCatFilter === 'All' || entry.category === selectedCatFilter;
        const searchContent = `${entry.name} ${entry.phone} ${entry.idNumber} ${entry.plateNoHK} ${entry.plateNoCN} ${entry.quotaNo} ${entry.tags?.join(' ')}`;
        return matchCat && searchContent.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const scanForDuplicates = () => {
        const nameMap = new Map<string, DatabaseEntry[]>();
        entries.forEach(e => {
            const key = e.name.trim(); if (!key) return;
            if (!nameMap.has(key)) nameMap.set(key, []);
            nameMap.get(key)?.push(e);
        });
        const duplicates: DatabaseEntry[][] = [];
        nameMap.forEach((group) => { if (group.length > 1) duplicates.push(group); });
        if (duplicates.length === 0) { alert("未發現重複資料"); } 
        else { setDupeGroups(duplicates); setShowDupeModal(true); }
    };

    const resolveDuplicate = async (keepId: string, group: DatabaseEntry[]) => {
        if (!confirm("確定保留選中的資料，並刪除其他重複項？")) return;
        if (!db) return;
        const deleteIds = group.filter(e => e.id !== keepId).map(e => e.id);
        try {
            const batch = writeBatch(db);
            deleteIds.forEach(id => {
                const ref = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'database', id);
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
            {/* 左側列表區塊 */}
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
                        // 判斷是否為「他人負責的資料」（僅供標示用，實際上列表已經過濾過了）
                        const isAssignedToOther = entry.managedBy && entry.managedBy !== staffId;

                        return (
                        <div key={entry.id} onClick={() => { setEditingEntry(entry); setIsDbEditing(false); }} className={`p-3 rounded-lg border cursor-pointer transition-all ${editingEntry?.id === entry.id ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                      <div className="font-bold text-slate-800 truncate">{entry.name || '(未命名)'}</div>
                                      {entry.reminderEnabled && (<Bell size={12} className={isExpired ? "text-red-500 fill-red-500" : (isSoon ? "text-amber-500 fill-amber-500" : "text-green-500")} />)}
                                      {/* 顯示負責人標籤 (如果不是自己) */}
                                      {isAssignedToOther && <span className="text-[9px] bg-gray-200 text-gray-600 px-1 rounded flex items-center"><UserIcon size={8} className="mr-0.5"/> {entry.managedBy}</span>}
                                  </div>
                                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-1">
                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border">{entry.category}</span>
                                        {entry.roles?.map(r => <span key={r} className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">{r}</span>)}
                                        {entry.plateNoHK && <span className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-100">{entry.plateNoHK}</span>}
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
                                <div className="space-y-4">
                                     {/* ★★★ 負責人指派欄位 (新增/編輯時顯示) ★★★ */}
                                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 flex items-center">
                                        <label className="text-xs font-bold text-yellow-800 mr-2 flex-none flex items-center"><UserIcon size={14} className="mr-1"/>文件負責人:</label>
                                        <select 
                                            disabled={!(staffId === 'BOSS' || currentUser?.modules?.includes('all'))} 
                                            // ★ 修改：如果是編輯舊資料(editingEntry.id 存在)，且原本沒負責人，就保持空白
                                            value={editingEntry.id ? (editingEntry.managedBy || '') : (editingEntry.managedBy || staffId || '')}
                                            onChange={e => setEditingEntry({...editingEntry, managedBy: e.target.value})}
                                            className="..."
                                        >
                                            {/* ★ 新增未指派選項 ★ */}
                                            <option value="">-- 未指派 (Unassigned) --</option>
                                            
                                            {systemUsers && systemUsers.map((u:any) => (
                                                <option key={u.email} value={u.email}>{u.email}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                        <label className="block text-xs font-bold text-blue-800 mb-2">資料類別</label>
                                        <div className="flex gap-2">{DB_CATEGORIES.map(cat => (<button key={cat.id} type="button" onClick={() => setEditingEntry({...editingEntry, category: cat.id as any, docType: ''})} className={`px-3 py-1.5 text-sm rounded-md border transition-all ${editingEntry.category === cat.id ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 hover:bg-blue-100'}`}>{cat.label}</button>))}</div>
                                    </div>
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
                                    {/* VRD 車輛專用欄位 (省略部分重複，保持您原有結構) */}
                                    {editingEntry.category === 'Vehicle' && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div><label className="block text-xs font-bold text-slate-500 mb-1">香港車牌 (Reg Mark)</label><input disabled={!isDbEditing} value={editingEntry.plateNoHK || ''} onChange={e => setEditingEntry({...editingEntry, plateNoHK: e.target.value, relatedPlateNo: e.target.value})} className="w-full p-2 border rounded bg-yellow-50 font-mono font-bold"/></div>
                                                <div><label className="block text-xs font-bold text-slate-500 mb-1">國內車牌</label><input disabled={!isDbEditing} value={editingEntry.plateNoCN || ''} onChange={e => setEditingEntry({...editingEntry, plateNoCN: e.target.value})} className="w-full p-2 border rounded bg-blue-50 font-mono"/></div>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded border border-gray-200 mt-4 space-y-3">
                                                <div className="flex justify-between items-center border-b pb-2 mb-2"><label className="block text-xs font-bold text-gray-700"><FileText size={14} className="inline mr-1"/> VRD 牌薄詳細資料</label></div>
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
                                                    <div><label className="text-[10px] text-gray-500">A1 稅值</label><input type="number" disabled={!isDbEditing} value={editingEntry.priceA1 || ''} onChange={e => setEditingEntry({...editingEntry, priceA1: Number(e.target.value)})} className="w-full p-1.5 border rounded text-xs font-bold text-blue-600"/></div>
                                                    <div><label className="text-[10px] text-gray-500">已繳稅款</label><input type="number" disabled={!isDbEditing} value={editingEntry.priceTax || ''} onChange={e => setEditingEntry({...editingEntry, priceTax: Number(e.target.value)})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    <div><label className="text-[10px] text-gray-500">手數</label><input type="number" disabled={!isDbEditing} value={editingEntry.prevOwners || ''} onChange={e => setEditingEntry({...editingEntry, prevOwners: Number(e.target.value)})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                </div>
                                                <div className="bg-white p-2 rounded border border-slate-100"><label className="text-[10px] font-bold text-slate-400 mb-1 block">VRD 登記車主</label><div className="grid grid-cols-3 gap-2"><div className="col-span-2"><input disabled={!isDbEditing} value={editingEntry.registeredOwnerName || ''} onChange={e => setEditingEntry({...editingEntry, registeredOwnerName: e.target.value})} className="w-full p-1.5 border rounded text-xs" placeholder="車主全名"/></div><div className="col-span-1"><input disabled={!isDbEditing} value={editingEntry.registeredOwnerId || ''} onChange={e => setEditingEntry({...editingEntry, registeredOwnerId: e.target.value})} className="w-full p-1.5 border rounded text-xs" placeholder="身份證號碼"/></div></div></div>
                                            </div>
                                        </>
                                    )}
                                    
                                    {editingEntry.category === 'CrossBorder' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="block text-xs font-bold text-slate-500 mb-1">指標號</label><input disabled={!isDbEditing} value={editingEntry.quotaNo || ''} onChange={e => setEditingEntry({...editingEntry, quotaNo: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                                            <div><label className="block text-xs font-bold text-slate-500 mb-1">關聯香港車牌</label>{isDbEditing ? (<select value={editingEntry.relatedPlateNo || ''} onChange={e => setEditingEntry({...editingEntry, relatedPlateNo: e.target.value})} className="w-full p-2 border rounded text-sm bg-blue-50 text-blue-800 font-bold"><option value="">-- 無關聯 --</option>{inventory.map(v => (<option key={v.id} value={v.regMark}>{v.regMark} {v.make} {v.model}</option>))}</select>) : (<div className="w-full p-2 border rounded text-sm bg-gray-50">{editingEntry.relatedPlateNo || '-'}</div>)}</div>
                                        </div>
                                    )}
                                    
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">文件類型</label><input list="doctype_list" disabled={!isDbEditing} value={editingEntry.docType || ''} onChange={e => setEditingEntry({...editingEntry, docType: e.target.value})} className="w-full p-2 border rounded text-sm bg-gray-50" placeholder="選擇或輸入新類型..."/><datalist id="doctype_list">{(settings.dbDocTypes[editingEntry.category] || []).map(t => <option key={t} value={t}/>)}</datalist></div>
                                    <div className={`p-4 rounded-lg border transition-all ${editingEntry.reminderEnabled ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="flex items-center cursor-pointer"><input type="checkbox" disabled={!isDbEditing} checked={editingEntry.reminderEnabled || false} onChange={e => setEditingEntry({ ...editingEntry, reminderEnabled: e.target.checked })} className="w-4 h-4 text-amber-600 rounded mr-2" /><span className={`text-sm font-bold flex items-center ${editingEntry.reminderEnabled ? 'text-amber-800' : 'text-gray-500'}`}><Bell size={16} className="mr-1"/> 啟用到期提醒功能</span></label>
                                            {editingEntry.reminderEnabled && (<div className="text-xs text-amber-700 font-mono bg-white px-2 py-1 rounded border border-amber-200">已續期次數: <span className="font-bold">{editingEntry.renewalCount || 0}</span></div>)}
                                        </div>
                                        {editingEntry.reminderEnabled && (
                                            <div className="grid grid-cols-2 gap-4 animate-fade-in">
                                                <div className="col-span-2 md:col-span-1"><label className="block text-xs font-bold text-amber-800 mb-1">當前到期日</label><input type="date" disabled={!isDbEditing} value={editingEntry.expiryDate || ''} onChange={e => setEditingEntry({...editingEntry, expiryDate: e.target.value})} className="w-full p-2 border border-amber-300 rounded text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none font-bold" /><div className="mt-1"><DateStatusBadge date={editingEntry.expiryDate} label="狀態" /></div></div>
                                                <div className="col-span-2 md:col-span-1 bg-white p-2 rounded border border-amber-100"><label className="block text-xs font-bold text-gray-500 mb-1">自動續期規則</label><div className="flex gap-2 mb-2"><input type="number" disabled={!isDbEditing} value={editingEntry.renewalDuration} onChange={e => setEditingEntry({...editingEntry, renewalDuration: Number(e.target.value)})} className="w-16 p-1 border rounded text-center text-sm" min="1" /><select disabled={!isDbEditing} value={editingEntry.renewalUnit} onChange={e => setEditingEntry({...editingEntry, renewalUnit: e.target.value as any})} className="flex-1 p-1 border rounded text-sm"><option value="year">年</option><option value="month">月</option></select></div>{isDbEditing && (<button type="button" onClick={handleQuickRenew} className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-1.5 rounded flex items-center justify-center shadow-sm transition-transform active:scale-95"><RefreshCw size={12} className="mr-1"/> 立即續期</button>)}</div>
                                            </div>
                                        )}
                                    </div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">備註</label><textarea disabled={!isDbEditing} value={editingEntry.description || ''} onChange={e => setEditingEntry({...editingEntry, description: e.target.value})} className="w-full p-2 border rounded text-sm h-24" placeholder="輸入詳細說明..."/></div>
                                    <div><label className="block text-xs font-bold text-slate-500">標籤</label><div className="flex gap-2 mb-2 flex-wrap">{editingEntry.tags?.map(tag => <span key={tag} className="bg-slate-200 px-2 py-1 rounded text-xs flex items-center">{tag} {isDbEditing && <button type="button" onClick={() => setEditingEntry({...editingEntry, tags: editingEntry.tags.filter(t => t !== tag)})} className="ml-1 text-slate-500 hover:text-red-500"><X size={10}/></button>}</span>)}</div>{isDbEditing && <div className="flex gap-1"><input value={tagInput} onChange={e => setTagInput(e.target.value)} className="flex-1 p-1.5 border rounded text-xs" placeholder="新增..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} /><button type="button" onClick={addTag} className="bg-slate-200 px-3 py-1 rounded text-xs"><Plus size={12}/></button></div>}</div>
                                </div>

                                {/* 第二欄：圖片列表與上傳區 */}
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
                                                                <button type="button" onClick={() => analyzeImageWithAI(file.data, editingEntry.docType || editingEntry.category)} disabled={isScanning} className="bg-yellow-400 text-yellow-900 p-2 rounded-full opacity-90 hover:opacity-100 hover:bg-yellow-300 shadow-lg transition-all flex items-center justify-center transform active:scale-95" title="AI 智能識別文字">
                                                                    {isScanning ? <Loader2 size={18} className="animate-spin"/> : <Zap size={18} fill="currentColor"/>}
                                                                </button>
                                                                <button type="button" onClick={() => setEditingEntry(prev => prev ? { ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) } : null)} className="bg-red-500 text-white p-2 rounded-full opacity-90 hover:opacity-100 shadow-lg transition-all transform active:scale-95" title="刪除圖片"><X size={18}/></button>
                                                            </>
                                                        )}
                                                    </div>
                                                    <button type="button" onClick={(e) => { e.preventDefault(); downloadImage(file.data, file.name); }} className="absolute top-2 left-2 bg-blue-600 text-white p-2 rounded-full opacity-80 hover:opacity-100 transition-opacity shadow-lg" title="下載圖片"><DownloadCloud size={18}/></button>
                                                </div>
                                                <div className="p-3 border-t bg-white text-sm text-slate-700 font-medium flex items-center"><File size={16} className="mr-2 text-blue-600 flex-shrink-0"/>{isDbEditing ? (<input value={file.name} onChange={e => { const newAttachments = [...editingEntry.attachments]; newAttachments[idx].name = e.target.value; setEditingEntry({...editingEntry, attachments: newAttachments}); }} className="w-full bg-transparent outline-none focus:border-b-2 border-blue-400 py-1" placeholder="輸入檔名..." />) : (<span className="truncate">{file.name}</span>)}</div>
                                            </div>
                                        ))}
                                        {(!editingEntry.attachments || editingEntry.attachments.length === 0) && (<div className="border-2 border-dashed border-slate-200 rounded-xl h-60 flex flex-col items-center justify-center text-slate-400 text-sm bg-slate-50/30"><ImageIcon size={48} className="mb-3 opacity-30"/>暫無附件圖片</div>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                ) : (<div className="flex-1 flex flex-col items-center justify-center text-slate-400"><Database size={48} className="mb-4"/><p>請選擇或新增資料</p></div>)}
            </div>
            {/* 重複資料 Modal (保持不變) */}
            {showDupeModal && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-amber-50 rounded-t-xl"><h3 className="font-bold text-amber-800 flex items-center"><AlertTriangle className="mr-2"/> 發現重複資料 ({dupeGroups.length} 組)</h3><button onClick={() => setShowDupeModal(false)}><X/></button></div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">{dupeGroups.map((group, idx) => (<div key={idx} className="border rounded-lg p-3 bg-slate-50"><h4 className="font-bold mb-2 text-slate-700">名稱: {group[0].name}</h4><div className="space-y-2">{group.map(item => (<div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border"><div className="text-xs"><div><span className="font-bold">ID:</span> {item.id}</div><div><span className="font-bold">建立:</span> {item.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}</div></div><button onClick={() => resolveDuplicate(item.id, group)} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">保留此筆 (刪除其他)</button></div>))}</div></div>))}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ------------------------------------------------------------------
// ★★★ 新增：圖片壓縮工具函數 (目標約 100-150KB) ★★★
// ------------------------------------------------------------------
const compressImageSmart = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // 1. 尺寸限制：最大邊長 1280px (適合手機查看且檔案小)
                const MAX_SIZE = 1280;
                if (width > height) {
                    if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                } else {
                    if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                // 2. 輸出壓縮：JPEG 品質 0.6 (通常可壓至 100-150KB)
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error("Compression failed"));
                }, 'image/jpeg', 0.6);
            };
        };
        reader.onerror = error => reject(error);
    });
};

// ------------------------------------------------------------------
// ★★★ Media Library Module (v16.1: 使用標準壓縮工具 + 130KB 限制) ★★★
// ------------------------------------------------------------------
const MediaLibraryModule = ({ db, storage, staffId, appId, settings, inventory }: any) => {
    const [mediaItems, setMediaItems] = useState<MediaLibraryItem[]>([]);
    const [uploading, setUploading] = useState(false);
    
    const [selectedInboxIds, setSelectedInboxIds] = useState<string[]>([]);
    const [targetVehicleId, setTargetVehicleId] = useState<string>('');

    const [classifyForm, setClassifyForm] = useState({
        make: '', model: '', year: new Date().getFullYear().toString(),
        color: '', type: '外觀 (Exterior)' as '外觀 (Exterior)'|'內飾 (Interior)',
        tags: ''
    });

    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!db || !staffId) return;
        const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library'), orderBy('createdAt', 'desc'));
        return onSnapshot(q, (snap) => {
            const list: MediaLibraryItem[] = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() } as MediaLibraryItem));
            setMediaItems(list);
        });
    }, [db, staffId, appId]);

    const libraryGroups = useMemo(() => {
        const groups: Record<string, { key: string, title: string, items: MediaLibraryItem[], status: string, timestamp: number }> = {};
        const filteredItems = mediaItems.filter(i => {
            if (i.status !== 'linked') return false;
            if (!searchQuery) return true;
            return `${i.aiData?.year} ${i.aiData?.make} ${i.aiData?.model} ${i.aiData?.color}`.toLowerCase().includes(searchQuery.toLowerCase());
        });

        filteredItems.forEach(item => {
            let groupKey = item.relatedVehicleId || `${item.aiData?.year}-${item.aiData?.make}-${item.aiData?.model}`;
            let groupTitle = `${item.aiData?.year || ''} ${item.aiData?.make || ''} ${item.aiData?.model || ''}`.trim() || '未分類車輛';
            let status = 'Unknown';

            if (item.relatedVehicleId) {
                const car = inventory.find((v:any) => v.id === item.relatedVehicleId);
                if (car) { groupTitle = `${car.year} ${car.make} ${car.model} (${car.regMark || '未出牌'})`; status = car.status; }
            } else {
                const matchCar = inventory.find((v:any) => v.make === item.aiData?.make && v.model === item.aiData?.model && v.year == item.aiData?.year);
                if (matchCar) status = matchCar.status;
            }

            if (!groups[groupKey]) { groups[groupKey] = { key: groupKey, title: groupTitle, items: [], status: status, timestamp: item.createdAt?.seconds || 0 }; }
            groups[groupKey].items.push(item);
        });

        Object.values(groups).forEach(group => { group.items.sort((a, b) => (b.isPrimary?1:0) - (a.isPrimary?1:0)); });
        return Object.values(groups).sort((a, b) => b.timestamp - a.timestamp);
    }, [mediaItems, inventory, searchQuery]);

    // ★★★ 修改點：使用標準壓縮工具 compressImage (目標 130KB) ★★★
    const handleSmartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !storage) return;
        setUploading(true);
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                // 1. 調用 utils 中的壓縮工具，設定目標為 130KB
                const compressedBase64 = await compressImage(file, 130);
                
                // 2. 上傳到 Firebase Storage (使用 uploadString 上傳 Base64)
                const filePath = `media/${appId}/${Date.now()}_${file.name}`;
                const storageRef = ref(storage, filePath);
                
                // 注意：uploadBytes 改為 uploadString，因為 compressImage 回傳的是 data_url 字串
                await uploadString(storageRef, compressedBase64, 'data_url');
                
                const downloadURL = await getDownloadURL(storageRef);
                await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library'), { url: downloadURL, path: filePath, fileName: file.name, tags: ["Inbox"], status: 'unassigned', aiData: {}, createdAt: serverTimestamp() });
            } catch (err) { console.error(err); }
        }
        setUploading(false);
    };

    const handleSetPrimary = async (targetId: string, groupItems: MediaLibraryItem[]) => {
        if (!db) return;
        const batch = writeBatch(db);
        groupItems.forEach(item => { if (item.isPrimary) batch.update(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', item.id), { isPrimary: false }); });
        batch.update(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', targetId), { isPrimary: true });
        await batch.commit();
    };

    const handleClassify = async () => {
        if (!db || selectedInboxIds.length === 0) return;
        const batch = writeBatch(db);
        let finalRelatedId = targetVehicleId;
        if (!finalRelatedId) {
            const matchCar = inventory.find((v:any) => v.make === classifyForm.make && v.model === classifyForm.model && v.year == classifyForm.year && v.colorExt === classifyForm.color);
            if (matchCar) finalRelatedId = matchCar.id;
        }
        selectedInboxIds.forEach(id => {
            const ref = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', id);
            batch.update(ref, { status: 'linked', relatedVehicleId: finalRelatedId || null, tags: [classifyForm.make, classifyForm.model, classifyForm.year, classifyForm.color, classifyForm.type], aiData: { ...classifyForm } });
        });
        await batch.commit();
        setSelectedInboxIds([]); setTargetVehicleId('');
    };

    const handleDeleteImage = async (id: string) => { if(!confirm("確定刪除此圖片？")) return; if (!db) return; await deleteDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', id)); };
    const inboxItems = mediaItems.filter(i => i.status !== 'linked');

    return (
        <div className="flex flex-col md:flex-row h-full gap-4 bg-slate-100 p-2 overflow-hidden relative">
            
            {/* --- 左欄：來源 (Inbox) --- */}
            <div className="w-full md:w-1/4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[200px]">
                <div className="p-3 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center"><Upload size={16} className="mr-2"/> 待處理 ({inboxItems.length})</h3>
                    <label className={`bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-700 flex items-center shadow-sm ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        {uploading ? <Loader2 className="animate-spin mr-1" size={12}/> : <Plus size={12} className="mr-1"/>} 匯入
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleSmartUpload} disabled={uploading}/>
                    </label>
                </div>
                <div className="flex-1 overflow-y-auto p-2 grid grid-cols-3 gap-1 content-start">
                    {inboxItems.map(item => (
                        <div key={item.id} onClick={() => setSelectedInboxIds(p => p.includes(item.id) ? p.filter(i=>i!==item.id) : [...p, item.id])} className={`relative aspect-square rounded overflow-hidden cursor-pointer transition-all ${selectedInboxIds.includes(item.id) ? 'ring-2 ring-blue-500 opacity-100' : 'opacity-80 hover:opacity-100'}`}>
                            <img src={item.url} className="w-full h-full object-cover"/>
                            {selectedInboxIds.includes(item.id) && <div className="absolute top-0 right-0 bg-blue-600 text-white p-0.5"><Check size={10}/></div>}
                        </div>
                    ))}
                    {inboxItems.length === 0 && <div className="col-span-3 py-10 text-center text-slate-300 text-xs">暫無新圖片</div>}
                </div>
            </div>

            {/* --- 中欄：歸類工作台 --- */}
            <div className="w-full md:w-1/4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[250px]">
                <div className="p-3 border-b bg-slate-50 flex items-center"><h3 className="font-bold text-slate-700 flex items-center"><Settings size={16} className="mr-2"/> 歸類</h3><span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">已選: {selectedInboxIds.length}</span></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                        <label className="text-[10px] font-bold text-blue-800 mb-1 block">配對庫存</label>
                        <select value={targetVehicleId} onChange={(e) => { const vId = e.target.value; setTargetVehicleId(vId); const v = inventory.find((i:any) => i.id === vId); if (v) setClassifyForm(prev => ({ ...prev, make: v.make || '', model: v.model || '', year: v.year || '', color: v.colorExt || '' })); }} className="w-full p-1 text-xs border rounded"><option value="">-- 手動 / 不關聯 --</option>{inventory.map((v: Vehicle) => <option key={v.id} value={v.id}>{v.regMark || '(未出牌)'} - {v.make} {v.model}</option>)}</select>
                    </div>
                    <div className="space-y-2">
                        <div><label className="text-[10px] font-bold text-slate-500">Year</label><input value={classifyForm.year} onChange={e => setClassifyForm({...classifyForm, year: e.target.value})} className="w-full p-1 border rounded text-xs"/></div>
                        <div><label className="text-[10px] font-bold text-slate-500">Make</label><input list="makeList" value={classifyForm.make} onChange={e => setClassifyForm({...classifyForm, make: e.target.value})} className="w-full p-1 border rounded text-xs"/><datalist id="makeList">{settings?.makes?.map((m:string) => <option key={m} value={m}/>)}</datalist></div>
                        <div><label className="text-[10px] font-bold text-slate-500">Model</label><input list="modelList" value={classifyForm.model} onChange={e => setClassifyForm({...classifyForm, model: e.target.value})} className="w-full p-1 border rounded text-xs"/><datalist id="modelList">{(settings?.models?.[classifyForm.make] || []).map((m:string) => <option key={m} value={m}/>)}</datalist></div>
                        <div><label className="text-[10px] font-bold text-slate-500">Color</label><input list="colorList" value={classifyForm.color} onChange={e => setClassifyForm({...classifyForm, color: e.target.value})} className="w-full p-1 border rounded text-xs"/><datalist id="colorList">{settings?.colors?.map((c:string) => <option key={c} value={c}/>)}</datalist></div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 mb-1 block">Type</label>
                            <div className="flex gap-1">
                                {['外觀', '內飾', '細節'].map(t => (
                                    <button key={t} onClick={() => setClassifyForm({...classifyForm, type: t as any})} className={`text-[10px] py-1 px-2 rounded border ${classifyForm.type.includes(t) ? 'bg-blue-600 text-white' : 'bg-white'}`}>{t}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-3 border-t bg-slate-50"><button onClick={handleClassify} disabled={selectedInboxIds.length === 0} className="w-full bg-slate-800 text-white py-2 rounded-lg text-xs font-bold disabled:opacity-50">歸檔</button></div>
            </div>

            {/* --- 右欄：車輛圖庫 --- */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-3 border-b bg-slate-50 flex justify-between items-center gap-2"><h3 className="font-bold text-slate-700 flex items-center"><ImageIcon size={18} className="mr-2"/> 圖庫</h3><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜尋..." className="w-32 md:w-48 px-2 py-1 text-xs border rounded-full"/></div>
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {libraryGroups.map(group => {
                            const isExpanded = expandedGroupKey === group.key;
                            const primaryImage = group.items[0];
                            return (
                                <div key={group.key} className={`bg-white border rounded-xl shadow-sm overflow-hidden ${isExpanded ? 'col-span-full ring-2 ring-blue-200' : ''}`}>
                                    <div className="p-3 flex justify-between items-center cursor-pointer bg-white border-b border-slate-100" onClick={() => setExpandedGroupKey(isExpanded ? null : group.key)}>
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-12 h-12 rounded bg-slate-200 flex-shrink-0 overflow-hidden"><img src={primaryImage?.url} className="w-full h-full object-cover"/></div>
                                            <div className="min-w-0"><h4 className="font-bold text-sm truncate">{group.title}</h4><div className="text-[10px] text-slate-500">{group.items.length}張</div></div>
                                        </div>
                                        {isExpanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
                                    </div>
                                    {isExpanded && (
                                        <div>
                                            <div className="w-full h-64 bg-gray-100 relative" onClick={() => setPreviewImage(primaryImage?.url)}><img src={primaryImage?.url} className="w-full h-full object-cover" /></div>
                                            <div className="p-3 grid grid-cols-4 gap-2">
                                                {group.items.map(img => (
                                                    <div key={img.id} className={`relative aspect-square rounded overflow-hidden cursor-zoom-in border ${img.isPrimary ? 'ring-2 ring-yellow-400' : ''}`}>
                                                        <img src={img.url} className="w-full h-full object-cover" onClick={() => setPreviewImage(img.url)}/>
                                                        <button onClick={(e) => { e.stopPropagation(); handleSetPrimary(img.id, group.items); }} className="absolute top-1 left-1 p-1 bg-black/40 text-white rounded-full hover:bg-yellow-400"><Star size={10}/></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteImage(img.id); }} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"><X size={10}/></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {previewImage && (<div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}><img src={previewImage} className="max-w-full max-h-[90vh] object-contain"/><button className="absolute top-4 right-4 text-white"><X size={32}/></button></div>)}
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

// ------------------------------------------------------------------
// ★★★ Document Custody Modal (v14.0: 文件交收打卡視窗 - 保持不變) ★★★
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// ★★★ Document Custody Modal (v16.1: 壓縮<100KB + 放大預覽) ★★★
// ------------------------------------------------------------------
const DocumentCustodyModal = ({ vehicle, onClose, onSaveLog, staffId }: any) => {
    const [action, setAction] = useState<'CheckIn' | 'CheckOut'>('CheckIn');
    const [docName, setDocName] = useState('牌簿 (VRD)');
    const [target, setTarget] = useState(action === 'CheckIn' ? (vehicle.customerName || '客戶') : '客戶');
    const [photo, setPhoto] = useState<string | null>(null);
    const [note, setNote] = useState('');
    
    // ★ 新增狀態
    const [isCompressing, setIsCompressing] = useState(false);
    const [previewZoom, setPreviewZoom] = useState<string | null>(null);

    const commonDocs = ['牌簿 (VRD)', '行車證', '香港身份證', '回鄉證', '公司註冊證 (CI)', '商業登記 (BR)', '批文卡', '禁區紙', '驗車紙'];

    // 計算當前狀態
    const getCurrentStatus = () => {
        const statusMap: Record<string, string> = {};
        (vehicle.crossBorder?.documentLogs || []).forEach((log: any) => {
            statusMap[log.docName] = log.action === 'CheckIn' ? '🏢 在公司' : `📤 在 ${log.direction}`;
        });
        return statusMap;
    };
    const currentStatus = getCurrentStatus();

    // ★ 圖片處理邏輯 (壓縮至 100KB)
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsCompressing(true);
            try {
                // 使用工具函數，強制壓到 100KB 以下 (更適合文件傳輸)
                const compressedDataUrl = await compressImage(file, 100);
                setPhoto(compressedDataUrl);
            } catch (err) {
                console.error(err);
                alert("圖片處理失敗，請重試");
            } finally {
                setIsCompressing(false);
            }
        }
    };

    const handleSubmit = () => {
        if (!target) { alert("請輸入來源/去向"); return; }
        onSaveLog({ docName, action, direction: target, handler: staffId, note, photoUrl: photo });
        setPhoto(null); setNote(''); alert("紀錄已保存！");
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-end md:items-center justify-center p-4 backdrop-blur-sm animate-in slide-in-from-bottom-10">
            <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                    <div><h3 className="font-bold text-lg">📁 文件交收打卡</h3><p className="text-xs text-slate-400">{vehicle.regMark}</p></div>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase">當前文件位置</h4>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(currentStatus).map(([name, status]: any) => (
                                <div key={name} className={`px-2 py-1 rounded text-xs border flex items-center gap-1 ${status.includes('在公司') ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500'}`}><span className="font-bold">{name}:</span> {status}</div>
                            ))}
                            {Object.keys(currentStatus).length === 0 && <span className="text-xs text-gray-400">尚無紀錄</span>}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                            <button onClick={() => { setAction('CheckIn'); setTarget(vehicle.customerName||'客戶'); }} className={`py-2 rounded-md text-sm font-bold flex items-center justify-center transition-all ${action==='CheckIn'?'bg-white shadow text-green-600':'text-gray-500'}`}><ArrowRight size={16} className="mr-1 rotate-180"/> 收件 (Check In)</button>
                            <button onClick={() => { setAction('CheckOut'); setTarget('客戶'); }} className={`py-2 rounded-md text-sm font-bold flex items-center justify-center transition-all ${action==='CheckOut'?'bg-white shadow text-red-500':'text-gray-500'}`}>交出 (Check Out) <ArrowRight size={16} className="ml-1"/></button>
                        </div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">文件</label><div className="flex flex-wrap gap-2 mb-2">{commonDocs.map(d => (<button key={d} onClick={() => setDocName(d)} className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${docName===d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'}`}>{d}</button>))}</div><input value={docName} onChange={e=>setDocName(e.target.value)} className="w-full border-b-2 border-slate-200 p-2 text-sm font-bold outline-none bg-transparent" placeholder="輸入文件名稱..."/></div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">{action === 'CheckIn' ? '來自' : '交給'}</label><input value={target} onChange={e=>setTarget(e.target.value)} className="w-full bg-gray-50 p-3 rounded-lg text-sm outline-none font-bold" /><div className="flex gap-2 mt-1">{['客戶', '運輸署', '中檢', '快遞'].map(t => <button key={t} onClick={() => setTarget(t)} className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-600">{t}</button>)}</div></div>
                        
                        <div className="flex items-center gap-4">
                            <label className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer border border-dashed transition-colors ${isCompressing ? 'bg-gray-200 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                {isCompressing ? <Loader2 size={20} className="animate-spin text-blue-600"/> : <ImageIcon size={20}/>}
                                <span className="text-[9px]">{isCompressing ? '壓縮中' : '相機'}</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isCompressing}/>
                            </label>
                            
                            {photo && (
                                <div className="relative w-16 h-16 rounded-lg overflow-hidden border cursor-zoom-in" onClick={() => setPreviewZoom(photo)}>
                                    <img src={photo} className="w-full h-full object-cover"/>
                                    <button onClick={(e) => { e.stopPropagation(); setPhoto(null); }} className="absolute top-0 right-0 bg-red-500 text-white p-0.5"><X size={10}/></button>
                                </div>
                            )}
                            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="備註..." className="flex-1 text-xs border-b p-2 outline-none h-16 align-top"/>
                        </div>
                    </div>

                    {/* ★ 歷史紀錄顯示區 (含放大功能) */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-slate-500 mb-2">最近紀錄</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {[...(vehicle.crossBorder?.documentLogs || [])].reverse().slice(0, 10).map((log:any, idx:number) => (
                                <div key={idx} className="flex justify-between items-start text-xs p-2 bg-gray-50 rounded border">
                                    <div>
                                        <div className="font-bold">{log.docName} <span className={log.action==='CheckIn'?'text-green-600':'text-red-500'}>{log.action==='CheckIn'?'收':'交'}</span></div>
                                        <div className="text-gray-400 scale-90 origin-left">{log.timestamp.split(' ')[0]} - {log.handler}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500">{log.direction}</span>
                                        {log.photoUrl && (
                                            <button onClick={() => setPreviewZoom(log.photoUrl)} className="text-blue-600 flex items-center bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                <ImageIcon size={10} className="mr-1"/> 查看
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t bg-slate-50"><button onClick={handleSubmit} disabled={isCompressing} className={`w-full py-3 rounded-xl text-white font-bold text-sm shadow-lg active:scale-95 transition-transform flex items-center justify-center ${action==='CheckIn'?'bg-green-600 hover:bg-green-700':'bg-red-500 hover:bg-red-600'} ${isCompressing ? 'opacity-50' : ''}`}>{isCompressing ? '處理中...' : (action==='CheckIn' ? <><DownloadCloud size={18} className="mr-2"/> 確認紀錄</> : <><Upload size={18} className="mr-2"/> 確認紀錄</>)}</button></div>
            </div>

            {/* ★ 圖片放大 Lightbox */}
            {previewZoom && (
                <div className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-2 animate-in fade-in" onClick={() => setPreviewZoom(null)}>
                    <img src={previewZoom} className="max-w-full max-h-full object-contain" />
                    <button className="absolute top-4 right-4 p-2 bg-white/20 text-white rounded-full"><X size={24}/></button>
                </div>
            )}
        </div>
    );
};

// ------------------------------------------------------------------
// ★★★ 新增：業務辦理流程模組 (Business Process Module) - v17.1 修復版 ★★★
// ------------------------------------------------------------------
const BusinessProcessModule = ({ 
    db, staffId, appId, inventory, updateVehicle 
}: { 
    db: any, 
    staffId: string, 
    appId: string, 
    inventory: Vehicle[], // ★ 修復：明確定義這是 Vehicle 陣列
    updateVehicle: any 
}) => {
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // 內部狀態：記錄輸入框
    const [note, setNote] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // 處理日誌保存與下一步
    const handleSaveLog = async (currentStepName: string, nextStepIndex: number) => {
        if (!editingVehicle || !editingVehicle.id) return;
        setIsSaving(true);

        const newLog = {
            id: Date.now().toString(),
            action: 'Step Completed',
            stage: currentStepName,
            details: note || '完成步驟',
            timestamp: new Date().toLocaleString(),
            attachments: photo ? [photo] : [],
            user: staffId || 'System'
        };

        const currentWf = editingVehicle.activeWorkflow!;
        const updatedWf = { 
            ...currentWf, 
            currentStep: nextStepIndex, 
            logs: [...(currentWf.logs || []), newLog] 
        };

        await updateVehicle(editingVehicle.id, { activeWorkflow: updatedWf });
        
        // 更新本地狀態
        setEditingVehicle(prev => prev ? { ...prev, activeWorkflow: updatedWf } : null);
        setNote('');
        setPhoto(null);
        setIsSaving(false);
    };

    // 處理新開案件
    const handleStartWorkflow = async (typeKey: string) => {
        if (!editingVehicle || !editingVehicle.id) return;
        if (!confirm("確定為此車輛開啟新案件？")) return;

        const newWf = { 
            type: typeKey, 
            currentStep: 0, 
            startDate: new Date().toISOString().split('T')[0], 
            logs: [] 
        };
        await updateVehicle(editingVehicle.id, { activeWorkflow: newWf });
        setEditingVehicle(prev => prev ? { ...prev, activeWorkflow: newWf } : null);
    };

    // 讀取欄位資料 (包含 CrossBorder 內的資料)
    const getFieldValue = (field: string) => {
        if (!editingVehicle) return '';
        // 優先找根目錄，再找 crossBorder
        const val = (editingVehicle as any)[field] || 
                    editingVehicle.crossBorder?.[field as keyof CrossBorderData] || 
                    (editingVehicle.crossBorder as any)?.[`cb_${field}`] || '';
        return val;
    };

    // 篩選列表 (現在 v 會自動被識別為 Vehicle 類型，不會報錯了)
    const activeCases = inventory.filter(v => v.activeWorkflow);
    const filteredCases = activeCases.filter(v => (v.regMark || '').includes(searchTerm.toUpperCase()));

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50 animate-fade-in">
            
            {/* 1. 頂部工具列 */}
            <div className="flex justify-between items-center p-4 bg-white border-b border-slate-200 flex-none shadow-sm z-10">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center"><Briefcase size={24} className="mr-2 text-blue-600"/> 業務辦理中心</h2>
                    <p className="text-xs text-slate-500">集中處理港車北上、兩地牌新辦及維護流程</p>
                </div>
                {/* 簡單的選車按鈕 */}
                <div className="relative">
                    <select 
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 font-bold text-sm outline-none cursor-pointer appearance-none pr-8"
                        onChange={(e) => {
                            const v = inventory.find(i => i.id === e.target.value);
                            if(v) setEditingVehicle(v);
                            e.target.value = ""; // 重置
                        }}
                    >
                        <option value="">+ 開啟新案件 (選擇車輛)</option>
                        {inventory.filter(v => !v.activeWorkflow).map(v => (
                            <option key={v.id} value={v.id}>{v.regMark} - {v.make} {v.model}</option>
                        ))}
                    </select>
                    <Plus size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white pointer-events-none"/>
                </div>
            </div>

            {/* 2. 主工作區 (左右分割) */}
            <div className="flex flex-1 overflow-hidden">
                
                {/* 左側：案件列表 (Case List) */}
                <div className="w-80 bg-white border-r border-slate-200 flex flex-col flex-none">
                    <div className="p-3 border-b bg-slate-50 relative">
                        <Search size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="搜尋案件 / 車牌..." 
                            className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 ring-blue-100"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {filteredCases.map(car => {
                            const wf = car.activeWorkflow!;
                            const template = (WORKFLOW_TEMPLATES as any)[wf.type] || { name: '未知流程', steps: [], color: 'bg-gray-500' };
                            const progress = Math.round(((wf.currentStep + 1) / template.steps.length) * 100);
                            
                            return (
                                <div key={car.id} onClick={() => setEditingVehicle(car)} className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${editingVehicle?.id === car.id ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' : 'bg-white border-slate-200'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold font-mono text-sm bg-yellow-400 px-1 rounded text-black">{car.regMark}</span>
                                        <span className="text-[10px] text-gray-400">{wf.startDate}</span>
                                    </div>
                                    <div className="font-bold text-slate-700 text-sm mb-1">{template.name}</div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full ${template.color}`} style={{width: `${progress}%`}}></div></div>
                                        <span className="text-[10px] font-bold text-blue-600">{wf.currentStep + 1}/{template.steps.length}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate">當前: {template.steps[wf.currentStep]?.name}</div>
                                </div>
                            );
                        })}
                        
                        {filteredCases.length === 0 && (
                            <div className="text-center py-10 text-slate-400 text-xs">
                                <p>尚無進行中的案件</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 右側：智能辦事助手 (The Action Window) */}
                <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden relative">
                    {editingVehicle ? (
                        editingVehicle.activeWorkflow ? (() => {
                            const wf = editingVehicle.activeWorkflow;
                            const template = (WORKFLOW_TEMPLATES as any)[wf.type];
                            const stepIndex = wf.currentStep;
                            const stepData = template.steps[stepIndex];
                            
                            if (!template || !stepData) return <div className="p-10">流程數據錯誤</div>;

                            return (
                                <div className="flex flex-col h-full">
                                    {/* A. 流程進度條 */}
                                    <div className="bg-white border-b border-slate-200 p-4 shadow-sm flex-none">
                                        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide pb-2">
                                            {template.steps.map((s:any, i:number) => (
                                                <div key={i} className={`flex-none flex flex-col items-center min-w-[80px] relative ${i <= stepIndex ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1 transition-all ${i < stepIndex ? 'bg-green-500 text-white' : (i === stepIndex ? 'bg-blue-600 text-white scale-110 shadow-lg ring-4 ring-blue-100' : 'bg-slate-200 text-slate-500')}`}>
                                                        {i < stepIndex ? <Check size={14}/> : i + 1}
                                                    </div>
                                                    <span className={`text-[10px] font-bold whitespace-nowrap ${i === stepIndex ? 'text-blue-700' : 'text-slate-500'}`}>{s.name}</span>
                                                    {i < template.steps.length - 1 && <div className="absolute top-4 left-[50%] w-full h-[2px] bg-slate-200 -z-10"></div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* B. 辦事工作區 */}
                                    <div className="flex-1 overflow-y-auto p-6">
                                        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            
                                            {/* 左：資料準備 (Source) */}
                                            <div className="space-y-6">
                                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                                    <h4 className="font-bold text-slate-700 mb-4 flex items-center"><Clipboard size={18} className="mr-2 text-blue-500"/> 資料準備 (點擊複製)</h4>
                                                    <div className="space-y-3">
                                                        {(stepData.fields || []).map((field: string) => {
                                                            const val = getFieldValue(field);
                                                            const labels: any = { regMark: '香港車牌', chassisNo: '車架號', engineNo: '引擎號', driver1: '主司機', driver1_id: '證件號', hkCompany: '香港公司', mainlandCompany: '內地公司', colorExt: '顏色' };
                                                            return (
                                                                <div key={field} onClick={() => {navigator.clipboard.writeText(val); alert("已複製: "+val)}} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 cursor-pointer group transition-all">
                                                                    <div><div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{labels[field] || field}</div><div className="font-mono font-bold text-slate-800 text-lg">{val || '-'}</div></div>
                                                                    <div className="p-2 bg-white rounded-lg text-slate-300 group-hover:text-blue-500 shadow-sm"><Copy size={16}/></div>
                                                                </div>
                                                            );
                                                        })}
                                                        {(!stepData.fields || stepData.fields.length === 0) && <div className="text-slate-400 text-sm italic text-center py-4 bg-slate-50 rounded-xl">此步驟無需複製特定資料</div>}
                                                    </div>
                                                </div>

                                                <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                                                    <h4 className="font-bold text-indigo-800 mb-3 flex items-center"><Globe size={18} className="mr-2"/> 外部辦事傳送門</h4>
                                                    {stepData.url ? (
                                                        <button onClick={() => window.open(stepData.url, 'GovWindow', 'width=1280,height=800')} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all flex items-center justify-center">
                                                            <ExternalLink size={18} className="mr-2"/> 開啟: {stepData.name} 官網
                                                        </button>
                                                    ) : (
                                                        <div className="text-indigo-400 text-center text-sm border-2 border-dashed border-indigo-200 rounded-xl py-3">需線下辦理 (如驗車) 或無固定網址</div>
                                                    )}
                                                    <p className="text-[10px] text-indigo-500 mt-3 text-center">提示：點擊後將彈出政府網站，請在該視窗完成操作後，回來記錄結果。</p>
                                                </div>
                                            </div>

                                            {/* 右：結果紀錄 (Result) */}
                                            <div className="flex flex-col bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-full">
                                                <h4 className="font-bold text-slate-700 mb-4 flex items-center"><FileCheck size={18} className="mr-2 text-green-600"/> 辦理結果紀錄</h4>
                                                
                                                {/* 歷史紀錄預覽 */}
                                                <div className="flex-1 bg-slate-50 rounded-xl p-3 mb-4 overflow-y-auto max-h-60 border border-slate-100 space-y-3">
                                                    {(wf.logs || []).slice().reverse().map((log:any, idx:number) => (
                                                        <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-xs">
                                                            <div className="flex justify-between mb-1"><span className="font-bold text-blue-600">{log.stage}</span><span className="text-gray-400">{log.timestamp?.split(' ')[0]}</span></div>
                                                            <p className="text-slate-600">{log.details}</p>
                                                            {log.attachments?.[0] && <div className="mt-2 text-blue-500 flex items-center gap-1 cursor-pointer" onClick={() => window.open(log.attachments[0])}><ImageIcon size={12}/> 查看截圖</div>}
                                                        </div>
                                                    ))}
                                                    {(wf.logs || []).length === 0 && <div className="text-center text-slate-400 text-xs py-10">尚無紀錄</div>}
                                                </div>

                                                {/* 輸入區 */}
                                                <div className="mt-auto space-y-3">
                                                    <textarea 
                                                        value={note} 
                                                        onChange={e => setNote(e.target.value)} 
                                                        className="w-full border p-3 rounded-xl text-sm focus:ring-2 ring-blue-100 outline-none resize-none bg-slate-50" 
                                                        rows={3} 
                                                        placeholder={`請記錄「${stepData.name}」的辦理結果... (例如：預約成功，編號 8888)`}
                                                    ></textarea>
                                                    <div className="flex gap-3">
                                                        <label className={`flex-1 hover:bg-gray-200 text-slate-600 py-3 rounded-xl cursor-pointer flex items-center justify-center text-xs font-bold transition-colors border border-dashed border-gray-300 ${photo ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100'}`}>
                                                            <Camera size={16} className="mr-2"/> {photo ? '已選取截圖' : '上傳截圖'}
                                                            <input 
                                                                type="file" 
                                                                accept="image/*" 
                                                                className="hidden" 
                                                                onChange={async (e) => {
                                                                    if(e.target.files?.[0]) {
                                                                        try {
                                                                            const compressed = await compressImage(e.target.files[0], 100);
                                                                            setPhoto(compressed);
                                                                        } catch(err) { alert("圖片處理失敗"); }
                                                                    }
                                                                }}
                                                            />
                                                        </label>
                                                        <button 
                                                            onClick={() => handleSaveLog(stepData.name, Math.min(stepIndex + 1, template.steps.length - 1))} 
                                                            disabled={isSaving}
                                                            className="flex-[2] bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center disabled:opacity-50"
                                                        >
                                                            {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save size={16} className="mr-2"/>}
                                                            {stepIndex >= template.steps.length - 1 ? '完成所有流程' : '保存並下一步'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            );
                        })() : (
                            // 未開案狀態：顯示開案按鈕
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10">
                                <GitMerge size={64} className="mb-4 opacity-20"/>
                                <h3 className="text-xl font-bold text-slate-600 mb-2">{editingVehicle.regMark} 尚未開啟流程</h3>
                                <p className="text-sm mb-8">請選擇一個業務類型以開始辦理</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
                                    {Object.entries(WORKFLOW_TEMPLATES).map(([key, tpl]: any) => (
                                        <button key={key} onClick={() => handleStartWorkflow(key)} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all text-left group">
                                            <div className={`w-10 h-10 rounded-lg ${tpl.color} text-white flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform`}><ArrowRight size={20}/></div>
                                            <h4 className="font-bold text-slate-800">{tpl.name}</h4>
                                            <div className="text-xs text-slate-500 mt-1">{tpl.steps.length} 個步驟</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )
                    ) : (
                        // 未選車狀態
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <Briefcase size={64} className="mb-4 opacity-20"/>
                            <p>請選擇左側案件，或點擊上方「開啟新案件」</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ------------------------------------------------------------------
// ★★★ 6. Cross Border Module (v15.5: 功能保留 + 樣式同步升級) ★★★
// ------------------------------------------------------------------
const CrossBorderView = ({ 
    inventory, settings, dbEntries, activeCbVehicleId, setActiveCbVehicleId, setEditingVehicle, addCbTask, updateCbTask, deleteCbTask, addPayment, deletePayment,
    updateVehicle // 必須傳入此函數以支援文件交收
}: any) => {
    
    // --- 1. 狀態管理 ---
    const [searchTerm, setSearchTerm] = useState('');
    const [showExpired, setShowExpired] = useState(true);
    const [showSoon, setShowSoon] = useState(true);
    const [isMobileDetail, setIsMobileDetail] = useState(false);

    // Modal 狀態
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [showDocModal, setShowDocModal] = useState(false); // v14.0 新增
    
    // 新增任務 (v13.0)
    const [newTaskDate, setNewTaskDate] = useState('');
    const [pendingTasks, setPendingTasks] = useState<{item: string, fee: number, note: string, days: string}[]>([]);

    // 編輯任務
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<CrossBorderTask>>({});
    
    // 付款與報表
    const [expandedPaymentTaskId, setExpandedPaymentTaskId] = useState<string | null>(null);
    const [newPayAmount, setNewPayAmount] = useState('');
    const [newPayMethod, setNewPayMethod] = useState('Cash');
    const [reportModalData, setReportModalData] = useState<{ title: string, type: 'expired' | 'soon', items: any[] } | null>(null);

    // --- 2. 邏輯處理 ---
    useEffect(() => { if (activeCbVehicleId && window.innerWidth < 768) setIsMobileDetail(true); }, [activeCbVehicleId]);
    const handleBackToList = () => { setIsMobileDetail(false); setActiveCbVehicleId(null); };

    // 設定與過濾
    const settingsCbItems = (settings.cbItems || []).map((i:any) => (typeof i === 'string' ? i : i.name));
    const defaultServiceItems = ['代辦驗車', '代辦保險', '申請禁區紙', '批文延期', '更換司機', '代辦免檢', '海關年檢', '其他服務'];
    const serviceOptions = Array.from(new Set([...(settings.serviceItems || []), ...settingsCbItems, ...defaultServiceItems])).filter(Boolean);
    const dateFields = { dateHkInsurance: '香港保險', dateReservedPlate: '留牌紙', dateBr: '商業登記(BR)', dateLicenseFee: '香港牌費', dateMainlandJqx: '內地交強險', dateMainlandSyx: '內地商業險', dateClosedRoad: '禁區紙', dateApproval: '批文卡', dateMainlandLicense: '內地行駛證', dateHkInspection: '香港驗車' };

    const findItemDefaults = (itemName: string) => {
        const settingItem = (settings.cbItems || []).find((i:any) => (typeof i === 'string' ? i : i.name) === itemName);
        let fee = '0'; let days = '7';
        if (settingItem && typeof settingItem !== 'string') { fee = settingItem.defaultFee?.toString() || '0'; days = settingItem.defaultDays || '7'; }
        return { fee, days };
    };

    const cbVehicles = inventory.filter((v:any) => { const cb = v.crossBorder; if (!cb) return false; return cb.isEnabled || !!cb.mainlandPlate || !!cb.quotaNumber || (cb.tasks && cb.tasks.length > 0); });
    const filteredVehicles = cbVehicles.filter((v:any) => (v.regMark || '').includes(searchTerm.toUpperCase()) || (v.crossBorder?.mainlandPlate || '').includes(searchTerm));
    const activeCar = inventory.find((v: any) => v.id === activeCbVehicleId) || filteredVehicles[0];

    // 提醒邏輯
    const expiredItems: any[] = []; const soonItems: any[] = [];
    cbVehicles.forEach((v:any) => { Object.entries(dateFields).forEach(([fieldKey, label]) => { const dateStr = (v.crossBorder as any)?.[fieldKey]; if (dateStr) { const days = getDaysRemaining(dateStr); if (days !== null) { const itemData = { vid: v.id!, plate: v.regMark || '未出牌', item: label, date: dateStr, days: days }; if (days < 0) expiredItems.push(itemData); else if (days <= 30) soonItems.push(itemData); } } }); });
    expiredItems.sort((a, b) => a.days - b.days); soonItems.sort((a, b) => a.days - b.days);

    // --- Actions ---
    const openAddModal = () => { if (!activeCar) { alert("請先選擇車輛"); return; } setNewTaskDate(new Date().toISOString().split('T')[0]); setPendingTasks([]); setIsAddModalOpen(true); };

    const toggleServiceItem = (item: string) => {
        const exists = pendingTasks.find(t => t.item === item);
        if (exists) { setPendingTasks(prev => prev.filter(t => t.item !== item)); } 
        else { const defaults = findItemDefaults(item); setPendingTasks(prev => [...prev, { item: item, fee: Number(defaults.fee) || 0, note: '', days: defaults.days }]); }
    };

    const updatePendingTask = (item: string, field: 'fee' | 'note', value: any) => { setPendingTasks(prev => prev.map(t => t.item === item ? { ...t, [field]: value } : t)); };

    const handleAddBatchTasks = () => {
        if (!activeCar) return;
        if (pendingTasks.length === 0) { alert("請至少選擇一個項目"); return; }
        pendingTasks.forEach(task => { const newTask: CrossBorderTask = { id: Date.now().toString() + Math.random().toString(36).substr(2, 5), date: newTaskDate, item: task.item, fee: Number(task.fee) || 0, days: task.days, institution: '公司', handler: '', currency: 'HKD', note: task.note, isPaid: false }; addCbTask(activeCar.id!, newTask); });
        setIsAddModalOpen(false);
    };

    const startEditing = (task: CrossBorderTask) => { setEditingTaskId(task.id); setEditForm({ ...task }); };
    const saveEdit = () => { if (!activeCar || !editingTaskId || !editForm.item) return; const updatedTask = { ...editForm, fee: Number(editForm.fee) || 0, id: editingTaskId } as CrossBorderTask; updateCbTask(activeCar.id!, updatedTask); setEditingTaskId(null); };

    const handleAddPartPayment = (task: CrossBorderTask) => { 
        const amount = Number(newPayAmount); if (!activeCar || amount <= 0) return; 
        addPayment(activeCar.id!, { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], amount: amount, type: 'Service Fee', method: newPayMethod, relatedTaskId: task.id, note: `Payment for: ${task.item}` }); 
        setNewPayAmount(''); 
    };

    const convertDateToTask = (dateKey: string, dateLabel: string, dateVal: string) => {
        if (!activeCar) return;
        const defaults = findItemDefaults(dateLabel) || { fee: '0', days: '7' };
        if(confirm(`確定轉收費？\n項目: ${dateLabel}\n費用: $${defaults.fee}`)) {
            addCbTask(activeCar.id!, { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], item: `代辦${dateLabel}`, fee: Number(defaults.fee) || 0, days: defaults.days, institution: '公司', handler: '', currency: 'HKD', note: `來自日期提醒 (${dateVal})`, isPaid: false });
        }
    };

    // 儲存交收紀錄
    const handleSaveDocLog = (logData: any) => {
        if (!activeCar || !updateVehicle) return;
        const newLog = { id: Date.now().toString(), timestamp: new Date().toLocaleString(), ...logData };
        const newLogs = [...(activeCar.crossBorder?.documentLogs || []), newLog];
        updateVehicle(activeCar.id, { crossBorder: { ...activeCar.crossBorder, documentLogs: newLogs } });
    };

    const ScrollableList = ({ items, type }: { items: typeof expiredItems, type: 'expired' | 'soon' }) => (
        <div className="bg-black/20 mt-3 rounded-lg overflow-hidden text-xs border-t border-white/10 flex-1 min-h-0">
            <div className="overflow-y-auto h-24 md:h-32 scrollbar-thin scrollbar-thumb-white/20 p-1 space-y-1">
                {items.length === 0 ? <div className="p-4 text-white/50 text-center flex flex-col items-center justify-center h-full"><span>無項目</span></div> : (
                    items.map((it, idx) => (
                        <div key={`${it.vid}-${idx}`} onClick={() => setActiveCbVehicleId(it.vid)} className="flex justify-between items-center p-2 hover:bg-white/10 cursor-pointer rounded border-b border-white/5 last:border-0 transition-colors">
                            <div className="flex items-center gap-2 min-w-0"><span className="font-bold font-mono bg-black/30 px-1.5 py-0.5 rounded text-white shadow-sm whitespace-nowrap">{it.plate}</span><span className="text-white/90 truncate">{it.item}</span></div>
                            <div className={`text-right font-mono font-bold whitespace-nowrap ml-2 ${type === 'expired' ? 'text-red-300' : 'text-amber-300'}`}>{type === 'expired' ? `${Math.abs(it.days)}天前` : `剩${it.days}天`}</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full gap-4 relative">
            {reportModalData && (<div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setReportModalData(null)}><div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[90%]" onClick={e => e.stopPropagation()}><div className={`p-4 text-white flex justify-between items-center ${reportModalData.type === 'expired' ? 'bg-red-800' : 'bg-amber-700'}`}><h3 className="font-bold text-lg">{reportModalData.title}</h3><button onClick={() => setReportModalData(null)}><X/></button></div><div className="flex-1 overflow-y-auto p-6 bg-slate-50"><table className="w-full text-sm border-collapse bg-white shadow-sm"><thead><tr className="bg-slate-100"><th className="p-2 text-left">車牌</th><th className="p-2">項目</th><th className="p-2">日期</th><th className="p-2 text-right">狀態</th></tr></thead><tbody>{reportModalData.items.map((it, i) => (<tr key={i} className="border-b"><td className="p-2 font-bold">{it.plate}</td><td className="p-2">{it.item}</td><td className="p-2">{it.date}</td><td className="p-2 text-right font-bold">{it.days < 0 ? '過期' : '剩餘'} {Math.abs(it.days)}天</td></tr>))}</tbody></table></div></div></div>)}

            {/* 文件交收 Modal */}
            {showDocModal && activeCar && <DocumentCustodyModal vehicle={activeCar} staffId={"Staff"} onClose={() => setShowDocModal(false)} onSaveLog={handleSaveDocLog} />}

            {/* 新增項目 Modal */}
            {isAddModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-[500px] p-5 rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
                        <h3 className="font-bold text-lg mb-4 flex items-center"><FileText size={20} className="mr-2 text-blue-600"/> 新增代辦項目</h3>
                        <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                            <div><label className="text-xs font-bold text-gray-500 mb-1 block">日期</label><input type="date" value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)} className="w-full border p-2 rounded text-sm"/></div>
                            <div><label className="text-xs font-bold text-gray-500 mb-2 block">1. 勾選項目</label><div className="grid grid-cols-3 gap-2">{serviceOptions.map((opt, idx) => { const isSelected = pendingTasks.some(t => t.item === opt); return (<div key={idx} onClick={() => toggleServiceItem(opt)} className={`p-2 rounded border cursor-pointer text-[10px] flex items-center transition-all ${isSelected ? 'bg-blue-100 border-blue-500 text-blue-700 font-bold' : 'bg-gray-50 hover:bg-gray-100'}`}><div className={`w-3 h-3 rounded border mr-1.5 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white'}`}>{isSelected && <Check size={8} className="text-white"/>}</div>{opt}</div>); })}</div></div>
                            {pendingTasks.length > 0 && (<div className="bg-slate-50 p-3 rounded-lg border border-slate-200"><label className="text-xs font-bold text-gray-500 mb-2 block">2. 確認費用</label><div className="space-y-2 max-h-48 overflow-y-auto pr-1">{pendingTasks.map((task, idx) => (<div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border shadow-sm"><span className="text-xs font-bold w-1/3 truncate" title={task.item}>{task.item}</span><div className="flex-1 flex gap-2"><div className="relative w-24"><span className="absolute left-2 top-1.5 text-xs text-gray-400">$</span><input type="number" value={task.fee} onChange={(e) => updatePendingTask(task.item, 'fee', Number(e.target.value))} className="w-full border rounded p-1 pl-4 text-xs font-mono text-right"/></div><input type="text" value={task.note} onChange={(e) => updatePendingTask(task.item, 'note', e.target.value)} className="flex-1 border rounded p-1 text-xs" placeholder="備註..."/></div></div>))}</div></div>)}
                        </div>
                        <div className="flex justify-end gap-2 mt-6 border-t pt-4"><button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-xs bg-gray-200 rounded hover:bg-gray-300">取消</button><button onClick={handleAddBatchTasks} className="px-6 py-2 text-xs bg-blue-600 text-white rounded font-bold hover:bg-blue-700">確認建立 ({pendingTasks.length})</button></div>
                    </div>
                </div>
            )}

            <div className={`grid grid-cols-2 gap-2 flex-none ${isMobileDetail ? 'hidden md:grid' : ''}`}> 
                <div className="bg-gradient-to-br from-red-900 to-slate-900 rounded-xl p-3 text-white shadow-lg border border-red-800/30 relative overflow-hidden flex flex-col">
                    <div className="flex justify-between items-start z-10"><div><div className="flex items-center gap-1 mb-1"><AlertTriangle size={14} className="text-red-400"/><span className="text-xs font-bold text-red-100 opacity-80">已過期</span></div><div className="text-xl font-bold font-mono">{expiredItems.length}</div></div><div className="flex gap-1"><button onClick={(e) => { e.stopPropagation(); setReportModalData({ title: '已過期項目', type: 'expired', items: expiredItems }); }} className="p-1 hover:bg-white/20 rounded"><FileText size={16}/></button><button onClick={() => setShowExpired(!showExpired)} className="p-1 hover:bg-white/10 rounded">{showExpired ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button></div></div>
                    {expiredItems.length > 0 && showExpired && <ScrollableList items={expiredItems} type="expired" />}
                </div>
                <div className="bg-gradient-to-br from-amber-800 to-slate-900 rounded-xl p-3 text-white shadow-lg border border-amber-800/30 relative overflow-hidden flex flex-col">
                    <div className="flex justify-between items-start z-10"><div><div className="flex items-center gap-1 mb-1"><Clock size={14} className="text-amber-400"/><span className="text-xs font-bold text-amber-100 opacity-80">即將到期</span></div><div className="text-xl font-bold font-mono">{soonItems.length}</div></div><div className="flex gap-1"><button onClick={(e) => { e.stopPropagation(); setReportModalData({ title: '即將到期', type: 'soon', items: soonItems }); }} className="p-1 hover:bg-white/20 rounded"><FileText size={16}/></button><button onClick={() => setShowSoon(!showSoon)} className="p-1 hover:bg-white/10 rounded">{showSoon ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button></div></div>
                    {soonItems.length > 0 && showSoon && <ScrollableList items={soonItems} type="soon" />}
                </div>
            </div>

            <div className="flex flex-1 gap-4 overflow-hidden min-h-0 relative">
                
                {/* ★★★ 左側列表：整合 v15.4 擬真車牌樣式 ★★★ */}
                <div className={`w-full md:w-1/4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden ${isMobileDetail ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-3 border-b bg-slate-50"><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜尋車牌..." className="w-full px-2 py-1.5 text-xs border rounded"/></div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {filteredVehicles.map((car:any) => {
                            let expiredCount = 0;
                            Object.keys(dateFields).forEach(k => { const d = (car.crossBorder as any)?.[k]; if(d && getDaysRemaining(d)! < 0) expiredCount++; });
                            
                            // 標籤邏輯
                            const getTags = () => {
                                const tags = [];
                                const ports = car.crossBorder?.ports || [];
                                const isHk = ports.some((p:string) => ['皇崗', '深圳灣', '蓮塘', '沙頭角', '文錦渡', '港珠澳大橋(港)'].includes(p));
                                const isMo = ports.some((p:string) => ['港珠澳大橋(澳)', '關閘(拱北)', '橫琴', '青茂'].includes(p));
                                if (isHk) tags.push({ label: '粵港', color: 'bg-indigo-600 border-indigo-800 text-white' });
                                if (isMo) tags.push({ label: '粵澳', color: 'bg-emerald-600 border-emerald-800 text-white' });
                                if (!isHk && !isMo) tags.push({ label: '中港', color: 'bg-slate-600 border-slate-800 text-white' });
                                return tags;
                            };
                            const cbTags = getTags();

                            return (
                                <div key={car.id} onClick={() => setActiveCbVehicleId(car.id)} className={`p-3 rounded-lg cursor-pointer border transition-all ${activeCbVehicleId === car.id ? 'bg-blue-50 border-blue-300 shadow-md ring-1 ring-blue-100' : 'bg-white hover:border-blue-100'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col gap-1 items-start">
                                            {/* 香港車牌 - 黃底黑字 */}
                                            <span className="bg-[#FFD600] text-black border border-black font-black font-mono text-xs px-1.5 rounded-[2px] leading-tight shadow-sm">
                                                {car.regMark || '未出牌'}
                                            </span>
                                            {/* 內地車牌 - 黑底白字 (粵Z) 或 藍底白字 */}
                                            {car.crossBorder?.mainlandPlate && (
                                                <span className={`${
                                                    car.crossBorder.mainlandPlate.startsWith('粵Z') ? 'bg-black text-white border-white' : 'bg-[#003399] text-white border-white'
                                                } border font-bold font-mono text-[10px] px-1.5 rounded-[2px] leading-tight shadow-sm`}>
                                                    {car.crossBorder.mainlandPlate}
                                                </span>
                                            )}
                                        </div>
                                        {/* 狀態燈號 */}
                                        <div className="text-right">
                                            {expiredCount > 0 ? (
                                                <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold text-[10px] animate-pulse block mb-1">{expiredCount} 過期</span>
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-green-500 ml-auto mb-1"></div>
                                            )}
                                            <ChevronRight size={14} className="text-gray-300 ml-auto"/>
                                        </div>
                                    </div>
                                    
                                    {/* 標籤區 */}
                                    <div className="flex flex-wrap gap-1 items-center justify-between mt-1">
                                        <div className="flex gap-1">
                                            {cbTags.map((tag, i) => (
                                                <span key={i} className={`text-[9px] px-1 py-0.5 rounded font-bold ${tag.color}`}>{tag.label}</span>
                                            ))}
                                        </div>
                                        {car.crossBorder?.quotaNumber && (
                                            <span className="text-[9px] font-mono text-gray-400">#{car.crossBorder.quotaNumber}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col ${isMobileDetail ? 'fixed inset-0 z-40 m-0 rounded-none' : 'hidden md:flex'}`}>
                    {activeCar ? (
                        <>
                            <div className="p-4 border-b bg-slate-50 flex justify-between items-center flex-none">
                                <div className="flex items-center gap-2"><button onClick={handleBackToList} className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800"><ChevronLeft size={24}/></button><div><h3 className="text-2xl font-bold font-mono">{activeCar.regMark}</h3><p className="text-xs text-slate-500">{activeCar.crossBorder?.mainlandPlate}</p></div></div>
                                <div className="flex gap-2">
                                    <button onClick={() => setShowDocModal(true)} className="px-3 py-2 bg-slate-800 text-white rounded text-xs hover:bg-slate-700 flex items-center shadow-md"><FileText size={14} className="mr-1"/> 文件交收</button>
                                    <button onClick={() => setEditingVehicle(activeCar)} className="px-4 py-2 border rounded text-xs hover:bg-slate-50 flex items-center"><Edit size={12} className="mr-1"/> 編輯資料</button>
                                </div>
                            </div>

                            <div className="p-4 border-b overflow-x-auto whitespace-nowrap flex gap-3 bg-slate-50/30 flex-none pb-2 scrollbar-hide">
                                {Object.entries(dateFields).map(([key, label]) => {
                                    const dateVal = (activeCar.crossBorder as any)?.[key]; if(!dateVal) return null;
                                    const days = getDaysRemaining(dateVal);
                                    let color = "bg-green-50 border-green-200 text-green-700"; if (days! < 0) color = "bg-red-50 border-red-200 text-red-700 font-bold"; else if (days! <= 30) color = "bg-amber-50 border-amber-200 text-amber-700 font-bold";
                                    return (<div key={key} className={`inline-block p-2 rounded-lg border text-center min-w-[100px] ${color} group relative snap-center`}><div className="text-[10px] opacity-70 mb-1">{label}</div><div className="text-sm font-mono">{dateVal}</div><div className="text-[10px]">{days! < 0 ? `過期 ${Math.abs(days!)}天` : `剩 ${days}天`}</div><button onClick={(e) => { e.stopPropagation(); convertDateToTask(key, label, dateVal); }} className="absolute inset-0 bg-blue-600/90 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity"><DollarSign size={12} className="mr-1"/> 轉收費</button></div>);
                                })}
                            </div>

                            {/* 最新文件狀態條 */}
                            {(activeCar.crossBorder?.documentLogs?.length || 0) > 0 && (
                                <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100 flex items-center gap-3 overflow-x-auto whitespace-nowrap scrollbar-hide">
                                    <span className="text-[10px] font-bold text-yellow-800 uppercase">文件狀態:</span>
                                    {(() => { const logs = activeCar.crossBorder.documentLogs; const lastLog = logs[logs.length-1]; return (<span className="text-xs text-slate-600 flex items-center"><span className={`w-2 h-2 rounded-full mr-1 ${lastLog.action==='CheckIn'?'bg-green-500':'bg-red-500'}`}></span>{lastLog.docName} {lastLog.action==='CheckIn'?'已收':'已交'} ({lastLog.handler} @ {lastLog.timestamp.split(' ')[0]})</span>); })()}
                                    <button onClick={() => setShowDocModal(true)} className="text-[10px] text-blue-600 underline ml-auto">查看詳情</button>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto p-4 bg-white">
                                <div className="flex justify-between items-end mb-2"><h4 className="font-bold text-slate-700 text-sm">收費項目 ({activeCar.crossBorder?.tasks?.length || 0})</h4><button onClick={openAddModal} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 flex items-center font-bold shadow-sm transition-transform active:scale-95"><Plus size={14} className="mr-1"/> 新增項目</button></div>
                                <table className="w-full text-sm border-collapse">
                                    <thead className="bg-slate-50 font-bold text-xs sticky top-0"><tr><th className="p-2 text-left">日期</th><th className="p-2 text-left">項目</th><th className="p-2 text-right">費用</th><th className="p-2 text-center">收款狀態</th><th className="p-2 text-center">操作</th></tr></thead>
                                    <tbody className="divide-y">
                                        {(activeCar.crossBorder?.tasks || []).map((task: any) => {
                                            const isEditing = editingTaskId === task.id;
                                            const taskPayments = (activeCar.payments || []).filter((p:any) => p.relatedTaskId === task.id);
                                            const paid = taskPayments.reduce((s:any,p:any)=>s+p.amount,0);
                                            const isPaid = paid >= (task.fee || 0) && (task.fee||0) > 0;
                                            const remaining = (task.fee || 0) - paid;
                                            const isExpanded = expandedPaymentTaskId === task.id;

                                            if (isEditing) {
                                                return (
                                                    <tr key={task.id} className="bg-blue-50/50">
                                                        <td className="p-2"><input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="w-full text-xs p-1 border rounded"/></td>
                                                        <td className="p-2"><input type="text" value={editForm.item} onChange={e => setEditForm({...editForm, item: e.target.value})} className="w-full text-xs p-1 border rounded"/></td>
                                                        <td className="p-2"><input type="number" value={editForm.fee} onChange={e => setEditForm({...editForm, fee: Number(e.target.value)})} className="w-full text-xs p-1 border rounded text-right"/></td>
                                                        <td className="p-2 text-center text-xs">編輯中...</td>
                                                        <td className="p-2 text-center"><button onClick={saveEdit} className="text-green-600 p-1 hover:bg-green-100 rounded"><Check size={16}/></button></td>
                                                    </tr>
                                                );
                                            }
                                            return (
                                                <React.Fragment key={task.id}>
                                                    <tr className={`hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                                                        <td className="p-2 text-xs font-mono text-gray-500">{task.date}</td><td className="p-2 font-bold text-slate-700">{task.item}</td><td className="p-2 text-right font-mono">{formatCurrency(task.fee)}</td>
                                                        <td className="p-2 text-center cursor-pointer" onClick={() => setExpandedPaymentTaskId(isExpanded ? null : task.id)}><div className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all ${isPaid ? 'bg-green-100 text-green-700 border-green-200' : (paid > 0 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-50 text-red-600 border-red-100')}`}>{isPaid ? '已結清' : (paid > 0 ? `欠 ${remaining}` : '未付款')} {isExpanded ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}</div></td>
                                                        <td className="p-2 text-center flex justify-center gap-2"><button onClick={() => startEditing(task)} className="text-blue-400 hover:text-blue-600 p-1 hover:bg-blue-50 rounded"><Edit size={14}/></button><button onClick={() => deleteCbTask(activeCar.id!, task.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={14}/></button></td>
                                                    </tr>
                                                    {isExpanded && (<tr className="bg-slate-50/80 border-b-2 border-slate-100 shadow-inner"><td colSpan={5} className="p-3 pl-8"><div className="flex gap-6 items-start"><div className="w-1/3 min-w-[200px] bg-white p-3 rounded border shadow-sm"><h5 className="text-xs font-bold text-gray-500 mb-2">新增收款</h5><div className="flex flex-col gap-2"><input type="number" value={newPayAmount} onChange={e => setNewPayAmount(e.target.value)} placeholder={`輸入金額 (餘額: ${remaining})`} className="border p-1.5 text-xs rounded w-full"/><select value={newPayMethod} onChange={e => setNewPayMethod(e.target.value)} className="border p-1.5 text-xs rounded w-full"><option value="Cash">現金 (Cash)</option><option value="Bank Transfer">銀行轉帳</option><option value="Cheque">支票</option><option value="WeChat/Alipay">微信/支付寶</option></select><button onClick={() => handleAddPartPayment(task)} className="bg-blue-600 text-white py-1.5 rounded text-xs font-bold hover:bg-blue-700 mt-1">確認收款</button></div></div><div className="flex-1"><h5 className="text-xs font-bold text-gray-500 mb-2">收款紀錄 ({taskPayments.length})</h5>{taskPayments.length === 0 ? (<p className="text-xs text-gray-400 italic">尚無收款紀錄</p>) : (<table className="w-full text-xs text-left border-collapse"><thead><tr className="border-b text-gray-400"><th>日期</th><th>金額</th><th>方式</th><th>操作</th></tr></thead><tbody>{taskPayments.map((p: any) => (<tr key={p.id} className="border-b last:border-0 h-8"><td className="font-mono text-gray-600">{p.date}</td><td className="font-bold text-green-600">{formatCurrency(p.amount)}</td><td>{p.method}</td><td><button onClick={() => deletePayment(activeCar.id!, p.id)} className="text-red-400 hover:text-red-600"><X size={12}/></button></td></tr>))}</tbody></table>)}</div></div></td></tr>)}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : ( <div className="flex-1 flex flex-col items-center justify-center text-slate-300"><p>請選擇車輛以管理中港業務</p></div> )}
                </div>
            </div>
        </div>
    );
};
// ------------------------------------------------------------------
// ★★★ 8. Smart Notification Center (首頁右上角：全域提醒與列印) ★★★
// ------------------------------------------------------------------
const SmartNotificationCenter = ({ inventory, settings }: { inventory: Vehicle[], settings: SystemSettings }) => {
    const [isOpen, setIsOpen] = useState(false);

    // --- 1. 全域掃描邏輯 (修正版：補齊所有中港欄位) ---
    const useScanReminders = () => {
        const today = new Date();
        const alerts: { id: string, vid: string, regMark: string, type: 'General' | 'CrossBorder', item: string, date: string, days: number }[] = [];
        const daysThreshold = settings.reminders?.daysBefore || 30;

        inventory.forEach(car => {
            // A. 一般證件
            const genDocs = [
                { key: 'licenseExpiry', label: '車輛牌費 (License)' }, // 注意：資料庫欄位通常是 licenseExpiry
                { key: 'dateInsurance', label: '車輛保險 (Insurance)' }
            ];
            genDocs.forEach(d => {
                const dateVal = (car as any)[d.key];
                if (dateVal) {
                    const diff = Math.ceil((new Date(dateVal).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    if (diff <= daysThreshold) {
                        alerts.push({ id: `${car.id}-${d.key}`, vid: car.id!, regMark: car.regMark || 'No Plate', type: 'General', item: d.label, date: dateVal, days: diff });
                    }
                }
            });

            // B. 中港證件 (★ 修正 2：補齊所有日期欄位 + 放寬掃描條件 ★)
            const cb = car.crossBorder;
            // 只要有資料物件，且 (已啟用 或 有車牌 或 有指標)，就進行掃描
            if (cb && (cb.isEnabled || cb.mainlandPlate || cb.quotaNumber)) {
                const cbDocs = { 
                    dateHkInsurance: '香港保險', 
                    dateReservedPlate: '留牌紙', 
                    dateBr: '商業登記(BR)', 
                    dateLicenseFee: '香港牌費', 
                    dateMainlandJqx: '內地交強險', 
                    dateMainlandSyx: '內地商業險', 
                    dateClosedRoad: '禁區紙', 
                    dateApproval: '批文卡', 
                    dateMainlandLicense: '內地行駛證', 
                    dateHkInspection: '香港驗車(中港)'
                };
                Object.entries(cbDocs).forEach(([key, label]) => {
                    const dateVal = (cb as any)?.[key];
                    if (dateVal) {
                        const diff = Math.ceil((new Date(dateVal).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        if (diff <= daysThreshold) {
                            alerts.push({ id: `${car.id}-${key}`, vid: car.id!, regMark: car.regMark || 'No Plate', type: 'CrossBorder', item: label, date: dateVal, days: diff });
                        }
                    }
                });
            }
        });
        return alerts.sort((a, b) => a.days - b.days);
    };

    const alerts = useScanReminders();
    const expiredCount = alerts.filter(a => a.days < 0).length;
    const warningCount = alerts.length - expiredCount;

    // --- 2. 列印功能 ---
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Alert Report - Gold Land Auto</title>
                        <style>
                            body { font-family: "Helvetica Neue", Arial, sans-serif; padding: 40px; color: #333; }
                            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                            h1 { margin: 0 0 5px 0; font-size: 24px; }
                            p { margin: 0; color: #666; font-size: 12px; }
                            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
                            th, td { border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left; }
                            th { background-color: #f8f9fa; font-weight: bold; color: #555; }
                            .section-title { font-size: 14px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; color: #1e40af; border-left: 4px solid #1e40af; padding-left: 8px; }
                            .tag { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
                            .tag-general { background: #e0f2fe; color: #0369a1; }
                            .tag-cb { background: #f3e8ff; color: #7e22ce; }
                            .danger { color: #dc2626; font-weight: bold; }
                            .warning { color: #d97706; font-weight: bold; }
                            .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Gold Land Auto Limited</h1>
                            <p>EXPIRY REMINDER REPORT (到期事項監控報表)</p>
                            <p>Generated: ${new Date().toLocaleString()}</p>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th width="15%">類別 (Type)</th>
                                    <th width="20%">車牌 (Plate)</th>
                                    <th width="30%">到期項目 (Item)</th>
                                    <th width="20%">到期日 (Date)</th>
                                    <th width="15%" style="text-align:right">狀態 (Status)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${alerts.map(it => `
                                    <tr>
                                        <td><span class="tag ${it.type === 'General' ? 'tag-general' : 'tag-cb'}">${it.type === 'General' ? '車輛文件' : '中港業務'}</span></td>
                                        <td style="font-family:monospace; font-weight:bold;">${it.regMark}</td>
                                        <td>${it.item}</td>
                                        <td style="font-family:monospace;">${it.date}</td>
                                        <td style="text-align:right" class="${it.days < 0 ? 'danger' : 'warning'}">
                                            ${it.days < 0 ? `已過期 ${Math.abs(it.days)} 天` : `剩餘 ${it.days} 天`}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        
                        <div style="margin-top: 20px; font-size: 12px;">
                            <strong>Summary:</strong> 
                            <span style="color:#dc2626; margin-right:15px;">Expired: ${expiredCount}</span>
                            <span style="color:#d97706;">Expiring Soon: ${warningCount}</span>
                        </div>
                        <div class="footer">Confidential System Report</div>
                        <script>window.onload = function() { window.print(); window.close(); }</script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    return (
        <>
            {/* 1. Header Button (鈴鐺) */}
            <button 
                onClick={() => setIsOpen(true)} 
                className="relative p-2 rounded-full hover:bg-slate-100 transition-colors group"
                title="到期事項提醒中心"
            >
                <Bell size={20} className={`transition-colors ${alerts.length > 0 ? 'text-slate-600' : 'text-slate-400'}`} />
                {alerts.length > 0 && (
                    <span className={`absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white border-2 border-white shadow-sm ${expiredCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}>
                        {alerts.length > 9 ? '9+' : alerts.length}
                    </span>
                )}
            </button>

            {/* 2. Detail Modal (詳情彈窗) */}
            {isOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsOpen(false)}>
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        
                        {/* Title Bar */}
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Bell size={20} className={expiredCount > 0 ? "text-red-500" : "text-amber-500"} />
                                    提醒中心 (Notification Center)
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    共發現 <span className="font-bold text-red-500">{expiredCount}</span> 個過期項目，<span className="font-bold text-amber-500">{warningCount}</span> 個即將到期。
                                </p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>

                        {/* List Content */}
                        <div className="flex-1 overflow-y-auto p-2 bg-slate-100/50">
                            {alerts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                                    <CheckCircle size={48} className="mb-4 text-green-500/50"/>
                                    <p>目前沒有任何急需處理的項目</p>
                                    <p className="text-xs">系統運作良好</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {alerts.map(item => (
                                        <div key={item.id} className={`p-3 rounded-xl border flex justify-between items-center bg-white shadow-sm transition-transform hover:scale-[1.01] ${item.days < 0 ? 'border-red-100 border-l-4 border-l-red-500' : 'border-amber-100 border-l-4 border-l-amber-500'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${item.type === 'General' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                                    {item.type === 'General' ? <FileText size={18}/> : <Globe size={18}/>}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-slate-800 font-mono">{item.regMark}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">{item.type === 'General' ? '車務' : '中港'}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-600 font-medium">{item.item}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-bold font-mono ${item.days < 0 ? 'text-red-500' : 'text-amber-500'}`}>
                                                    {item.days < 0 ? `過期 ${Math.abs(item.days)} 天` : `剩 ${item.days} 天`}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-mono">{item.date}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                            <button onClick={() => setIsOpen(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">關閉</button>
                            {alerts.length > 0 && (
                                <button onClick={handlePrint} className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 shadow-lg shadow-slate-200 flex items-center transition-all active:scale-95">
                                    <Printer size={16} className="mr-2"/> 列印報表 (Print Report)
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
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
// ★★★ 10. Settings Manager (v17.2: 含 iPhone 推送通知設定) ★★★
// ------------------------------------------------------------------
const SettingsManager = ({ 
    settings, updateSettings, setSettings, systemUsers, updateSystemUsers, db, storage, staffId, appId, inventory, addSystemLog 
}: any) => {
    
    // ★★★ 1. 選單定義 (新增 Notifications) ★★★
    const systemMainModules = [
        { key: 'dashboard', label: '業務儀表板' },
        { key: 'inventory', label: '車輛管理' },
        { key: 'create_doc', label: '開單系統' },
        { key: 'reports', label: '統計報表' },
        { key: 'cross_border', label: '中港業務' },
        { key: 'business', label: '業務辦理流程' }, // ★ 這是您新加的模組
        { key: 'database', label: '資料庫中心' },
        { key: 'media_center', label: '智能圖庫' },
        { key: 'settings', label: '系統設置' }
    ];

    // 2. 【設定頁面內部選單】 (用於：切換設定頁左側的分頁)
    const settingsInternalMenu = [
        { key: 'general', label: '一般設定', icon: <LayoutDashboard size={16}/> },
        { key: 'notifications', label: '推送通知', icon: <BellRing size={16}/> },
        { key: 'vehicle_setup', label: '車輛參數', icon: <Car size={16}/> },     // 舊稱 vehicle
        { key: 'expenses_setup', label: '財務參數', icon: <DollarSign size={16}/> }, // 舊稱 expenses
        { key: 'crossborder_setup', label: '中港參數', icon: <Globe size={16}/> }, // 舊稱 crossborder
        { key: 'users', label: '用戶與權限', icon: <Users size={16}/> },
        { key: 'database_config', label: '資料庫分類', icon: <Database size={16}/> },
        { key: 'reminders', label: '系統提醒', icon: <Bell size={16}/> },
        { key: 'logs', label: '系統日誌', icon: <FileText size={16}/> },
        { key: 'backup', label: '備份', icon: <DownloadCloud size={16}/> }
    ];

    // 3. 【權限群組】 (用於：簡化權限勾選框)
    const permissionGroups = [
        { key: 'dashboard', label: '儀表板 (Dashboard)' },
        { key: 'inventory', label: '車輛/庫存/圖庫 (Inventory)' },
        { key: 'business', label: '中港/流程業務 (Business)' },
        { key: 'reports', label: '財務報表 (Reports)' },
        { key: 'database', label: '資料庫/客戶 (Database)' },
        { key: 'settings', label: '系統設置 (Admin)' }
    ];

    const [activeTab, setActiveTab] = useState('general');
    
    // --- 內部狀態 (用於輸入框) ---
    const [newColor, setNewColor] = useState('');
    const [newMake, setNewMake] = useState('');
    const [selectedMake, setSelectedMake] = useState('');
    const [newModel, setNewModel] = useState('');
    
    const [newExpenseComp, setNewExpenseComp] = useState('');
    const [newCbInst, setNewCbInst] = useState('');
    
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState(''); 

    const [selectedDbCat, setSelectedDbCat] = useState('Person');
    const [newDocType, setNewDocType] = useState('');

    const [backupConfig, setBackupConfig] = useState(settings.backup || { frequency: 'monthly', lastBackupDate: '', autoCloud: true });
    const [isBackingUp, setIsBackingUp] = useState(false);

    const [showInspector, setShowInspector] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);

    // ★★★ 新增：推送通知權限狀態 ★★★
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermissionStatus(Notification.permission);
        }
    }, []);

    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            alert("您的瀏覽器不支援通知功能");
            return;
        }
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);
        if (permission === 'granted') {
            alert("✅ 已授權！您現在可以接收通知。");
            // 注意：實際部署時，這裡需要獲取 FCM Token 並存入資料庫
        } else {
            alert("❌ 授權失敗或被拒絕。請在瀏覽器設定中開啟。");
        }
    };

    // --- 邏輯函數 (完全保留) ---
    const addItem = (key: string, val: string) => { if(val) updateSettings(key, [...(settings[key] || []), val]); };
    const removeItem = (key: string, idx: number) => { const arr = [...(settings[key] || [])]; arr.splice(idx, 1); updateSettings(key, arr); };

    const handleExpenseTypeChange = (idx: number, field: string, val: any) => {
        const newTypes = [...(settings.expenseTypes || [])];
        newTypes[idx] = { ...newTypes[idx], [field]: val };
        updateSettings('expenseTypes', newTypes);
    };

    const handleCbItemChange = (idx: number, field: string, val: any) => {
        const newItems = [...(settings.cbItems || [])];
        newItems[idx] = { ...newItems[idx], [field]: val };
        updateSettings('cbItems', newItems);
    };

    const handleUserPermissionChange = (email: string, field: string, val: any) => {
        const newUsers = systemUsers.map((u: any) => u.email === email ? { ...u, [field]: val } : u);
        updateSystemUsers(newUsers);
    };

    const handleAddUser = () => {
        if (!newUserEmail || !newUserPassword) { alert("請輸入 Email 和密碼"); return; }
        if (systemUsers.some((u:any) => u.email.toLowerCase() === newUserEmail.toLowerCase())) { alert("該用戶已存在"); return; }
        const newUser = { email: newUserEmail, password: newUserPassword, modules: ['inventory', 'dashboard'], defaultTab: 'dashboard' };
        updateSystemUsers([...systemUsers, newUser]);
        setNewUserEmail(''); setNewUserPassword('');
        alert(`用戶 ${newUserEmail} 已新增`);
    };

    const handleRemoveUser = (email: string) => {
        if (confirm(`確定移除用戶 ${email}?`)) {
            updateSystemUsers(systemUsers.filter((u:any) => u.email !== email));
        }
    };

    const handleUnlockInspector = () => {
        const pwd = prompt(`請輸入用戶 ${staffId} 的登入密碼以解鎖：`);
        if (!pwd) return;
        const currentUser = systemUsers.find((u:any) => u.email === staffId);
        if ((staffId === 'BOSS' && pwd === '8888') || (currentUser && currentUser.password === pwd)) {
            setShowInspector(true);
        } else {
            alert("密碼錯誤");
        }
    };

    useEffect(() => {
        if (activeTab === 'logs' && db) {
            const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_logs'), orderBy('timestamp', 'desc'), limit(50)); 
            const unsub = onSnapshot(q, (snap) => {
                const list: any[] = [];
                snap.forEach(d => list.push({ id: d.id, ...d.data() }));
                setLogs(list);
            });
            return () => unsub();
        }
    }, [activeTab, db, appId]);

    // 備份邏輯
    const handleCloudBackup = async () => {
        if (!storage || !appId) return;
        setIsBackingUp(true);
        try {
            const dataStr = JSON.stringify({ version: "2.0", type: "manual", timestamp: new Date().toISOString(), settings, inventory });
            const fileName = `backups/manual_${new Date().toISOString().slice(0,10)}_${Date.now()}.json`;
            const storageRef = ref(storage, fileName);
            await uploadString(storageRef, dataStr);
            const newConfig = { ...backupConfig, lastBackupDate: new Date().toISOString() };
            setBackupConfig(newConfig);
            updateSettings('backup', newConfig);
            alert(`✅ 雲端備份成功: ${fileName}`);
        } catch (e:any) { alert("備份失敗: " + e.message); } 
        finally { setIsBackingUp(false); }
    };

    const handleExport = () => { 
        const b = new Blob([JSON.stringify({version:"2.0", timestamp:new Date().toISOString(), settings, inventory},null,2)], {type:"application/json"}); 
        const a = document.createElement('a'); 
        a.href = URL.createObjectURL(b); 
        a.download = `GL_Backup_${new Date().toISOString().slice(0,10)}.json`; 
        a.click(); 
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => { 
        const f=e.target.files?.[0]; if(!f)return; 
        const r=new FileReader(); 
        r.onload=async(ev)=>{ 
            try{ 
                const d=JSON.parse(ev.target?.result as string); 
                if(d.settings){ 
                    setSettings((p:any)=>({...p,...d.settings})); 
                    Object.keys(d.settings).forEach(k=>updateSettings(k, d.settings[k])); 
                    alert('設定已從檔案還原'); 
                } 
            }catch{alert('檔案格式錯誤');}
        }; 
        r.readAsText(f); 
    };

    const handleRescueImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !db) return;
        if(!confirm("⚠️ 這是進階功能：將從 CSV 匯入中港資料並合併到現有車輛。\n確定執行？")) return;
        alert("功能已啟動，請查看 Console");
    };

    // --- Render ---
    return (
        <div className="flex h-full gap-6">
            <div className="w-48 flex-none bg-slate-50 border-r border-slate-200 p-4 space-y-2 h-full">
                <h3 className="font-bold text-slate-400 text-xs uppercase mb-4 px-2">Config Menu</h3>
                {settingsInternalMenu.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.key ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-4 pb-20">
                <h2 className="text-xl font-bold text-slate-800 mb-6 capitalize">{activeTab.replace('_', ' ')} Settings</h2>

                {/* 1. 一般設定 */}
                {activeTab === 'general' && (
                    <div className="space-y-6">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-700 mb-4">顏色選項 (Colors)</h3>
                            <div className="flex gap-2 mt-2">
                                <input value={newColor} onChange={e=>setNewColor(e.target.value)} className="border rounded px-2 py-1 text-sm outline-none w-64" placeholder="例如: 香檳金"/>
                                <button onClick={() => { addItem('colors', newColor); setNewColor(''); }} className="bg-slate-800 text-white px-3 rounded text-xs">Add</button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {settings.colors.map((c:string, i:number) => (
                                    <span key={i} className="bg-slate-100 px-2 py-1 rounded text-xs flex items-center gap-2 border border-slate-200">{c} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeItem('colors', i)}/></span>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-900 rounded-xl border-4 border-yellow-500 overflow-hidden shadow-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-yellow-400 flex items-center"><Search size={24} className="mr-2"/> 數據透視鏡 (Data Inspector)</h3>
                                {!showInspector && <button onClick={handleUnlockInspector} className="bg-yellow-500 text-black px-4 py-2 rounded font-bold text-sm hover:bg-yellow-400">解鎖查看 (Unlock)</button>}
                            </div>
                            {!showInspector ? (
                                <div className="text-center text-slate-500 py-8 flex flex-col items-center"><ShieldCheck size={48} className="mb-2 opacity-50"/><p>此區域包含敏感數據，已被隱藏。</p></div>
                            ) : (
                                <div className="overflow-x-auto max-h-64 scrollbar-thin scrollbar-thumb-gray-600">
                                    <table className="w-full text-left text-xs font-mono text-slate-300">
                                        <thead><tr className="border-b border-slate-700 text-slate-500"><th>Reg Mark</th><th>CB Enabled</th><th>Mainland Plate</th><th>Quota</th></tr></thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {inventory.map((v:any) => {
                                                const cb = v.crossBorder;
                                                if (!cb) return null;
                                                return <tr key={v.id} className="hover:bg-white/5"><td className="p-2 text-white">{v.regMark}</td><td className="p-2">{cb.isEnabled?'T':'F'}</td><td className="p-2">{cb.mainlandPlate}</td><td className="p-2">{cb.quotaNumber}</td></tr>;
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ★★★ 新增：推送通知設定 (Notifications) ★★★ */}
                {activeTab === 'notifications' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center"><BellRing size={20} className="mr-2 text-blue-600"/> 推送通知設定 (Push Notifications)</h3>
                            
                            {/* 權限狀態卡片 */}
                            <div className={`p-4 rounded-xl border mb-6 flex justify-between items-center ${permissionStatus === 'granted' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                                <div>
                                    <div className="font-bold text-sm flex items-center mb-1">
                                        {permissionStatus === 'granted' ? <CheckCircle size={16} className="mr-1 text-green-600"/> : <AlertTriangle size={16} className="mr-1 text-amber-600"/>}
                                        裝置權限狀態: {permissionStatus === 'granted' ? '已授權 (Active)' : permissionStatus === 'denied' ? '已封鎖 (Blocked)' : '未設定 (Default)'}
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {permissionStatus === 'granted' 
                                            ? '您的裝置已準備好接收通知。' 
                                            : '請點擊右側按鈕以允許瀏覽器傳送通知。'}
                                    </p>
                                </div>
                                {permissionStatus !== 'granted' && (
                                    <button onClick={requestNotificationPermission} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm">
                                        請求權限
                                    </button>
                                )}
                            </div>

                            {/* 開關設定 */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-sm font-bold text-slate-700">啟用系統推送 (Master Switch)</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={settings.pushConfig?.isEnabled || false} onChange={(e) => updateSettings('pushConfig', { ...settings.pushConfig, isEnabled: e.target.checked })} />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                        <input type="checkbox" checked={settings.pushConfig?.events?.newCar || false} onChange={(e) => updateSettings('pushConfig', { ...settings.pushConfig, events: { ...settings.pushConfig?.events, newCar: e.target.checked } })} className="mr-3 rounded accent-blue-600" />
                                        <span className="text-xs font-bold text-slate-600">新車入庫通知</span>
                                    </label>
                                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                        <input type="checkbox" checked={settings.pushConfig?.events?.sold || false} onChange={(e) => updateSettings('pushConfig', { ...settings.pushConfig, events: { ...settings.pushConfig?.events, sold: e.target.checked } })} className="mr-3 rounded accent-blue-600" />
                                        <span className="text-xs font-bold text-slate-600">車輛售出通知</span>
                                    </label>
                                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                        <input type="checkbox" checked={settings.pushConfig?.events?.expiry || false} onChange={(e) => updateSettings('pushConfig', { ...settings.pushConfig, events: { ...settings.pushConfig?.events, expiry: e.target.checked } })} className="mr-3 rounded accent-blue-600" />
                                        <span className="text-xs font-bold text-slate-600">證件到期提醒</span>
                                    </label>
                                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                        <input type="checkbox" checked={settings.pushConfig?.events?.workflow || false} onChange={(e) => updateSettings('pushConfig', { ...settings.pushConfig, events: { ...settings.pushConfig?.events, workflow: e.target.checked } })} className="mr-3 rounded accent-blue-600" />
                                        <span className="text-xs font-bold text-slate-600">流程進度更新</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* iPhone 特別說明 (PWA Guide) */}
                        <div className="p-5 bg-slate-900 rounded-xl text-white shadow-lg border border-slate-700">
                            <h3 className="font-bold text-yellow-400 mb-2 flex items-center"><Info size={18} className="mr-2"/> iPhone / iPad 用戶必讀</h3>
                            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                                <p>受 Apple iOS 系統限制，若要在 iPhone 上接收通知，您必須執行以下步驟：</p>
                                <ol className="list-decimal pl-4 space-y-1">
                                    <li>在 Safari 瀏覽器中開啟本系統。</li>
                                    <li>點擊底部的 <span className="font-bold text-white">「分享 (Share)」</span> 按鈕。</li>
                                    <li>選擇 <span className="font-bold text-white">「加入主畫面 (Add to Home Screen)」</span>。</li>
                                    <li>從主畫面開啟 App，然後回到此頁面點擊「請求權限」。</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. 車輛資料 (完整功能) */}
                {activeTab === 'vehicle_setup' && (
                    <div className="space-y-6">
                         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-700 mb-4">1. 車廠管理 (Makes)</h3>
                            <div className="flex gap-2 mt-2">
                                <input value={newMake} onChange={e=>setNewMake(e.target.value)} className="border rounded px-2 py-1 text-sm outline-none w-64" placeholder="Add Make (e.g. Ferrari)"/>
                                <button onClick={() => { addItem('makes', newMake); setNewMake(''); }} className="bg-slate-800 text-white px-3 rounded text-xs">Add</button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {(settings.makes || []).map((m:string, i:number) => (
                                    <span key={i} className="bg-slate-100 px-2 py-1 rounded text-xs flex items-center gap-2 border border-slate-200">{m} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeItem('makes', i)}/></span>
                                ))}
                            </div>
                         </div>
                         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-700 mb-4">2. 型號管理 (Models)</h3>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                                <label className="text-xs font-bold text-slate-500 block mb-1">選擇廠牌</label>
                                <select value={selectedMake} onChange={e => setSelectedMake(e.target.value)} className="w-full p-2 border rounded text-sm mb-3"><option value="">-- 請選擇 --</option>{settings.makes.map((m:string) => <option key={m} value={m}>{m}</option>)}</select>
                                {selectedMake && (
                                    <div className="flex gap-2">
                                        <input value={newModel} onChange={e => setNewModel(e.target.value)} className="flex-1 border rounded px-2 py-1 text-sm outline-none" placeholder={`輸入 ${selectedMake} 新型號...`} />
                                        <button onClick={() => {
                                            if(selectedMake && newModel) {
                                                updateSettings('models', { ...settings.models, [selectedMake]: [...(settings.models[selectedMake] || []), newModel] });
                                                setNewModel('');
                                            }
                                        }} className="bg-blue-600 text-white px-3 rounded text-xs font-bold hover:bg-blue-700">新增型號</button>
                                    </div>
                                )}
                            </div>
                            {selectedMake && (
                                <div className="flex flex-wrap gap-2">
                                    {(settings.models[selectedMake] || []).length === 0 ? <span className="text-sm text-gray-400">暫無型號</span> : 
                                    (settings.models[selectedMake] || []).map((m:string, i:number) => (
                                        <span key={i} className="bg-blue-50 text-blue-800 px-2 py-1 rounded text-xs flex items-center gap-2 border border-blue-100">{m} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => {
                                            updateSettings('models', { ...settings.models, [selectedMake]: (settings.models[selectedMake] || []).filter((mm:string) => mm !== m) });
                                        }}/></span>
                                    ))}
                                </div>
                            )}
                         </div>
                    </div>
                )}

                {/* 3. 財務與費用 (完整功能) */}
                {activeTab === 'expenses_setup' && (
                    <div className="space-y-8 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        {/* 收款公司列表 */}
                        <div>
                            <h3 className="font-bold text-lg mb-3 pb-2 border-b">常用收款公司/車房 (Companies)</h3>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {settings.expenseCompanies.map((c:string, i:number) => (
                                    <span key={i} className="bg-slate-100 px-2 py-1 rounded text-xs flex items-center gap-2 border border-slate-200">{c} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeItem('expenseCompanies', i)}/></span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input value={newExpenseComp} onChange={e=>setNewExpenseComp(e.target.value)} className="border rounded px-2 py-1 text-sm outline-none" placeholder="新增公司名稱..." />
                                <button onClick={() => { addItem('expenseCompanies', newExpenseComp); setNewExpenseComp(''); }} className="text-xs bg-slate-800 text-white px-3 py-1 rounded">新增 (Add)</button>
                            </div>
                        </div>

                        {/* 費用預設表格 */}
                        <div>
                            <h3 className="font-bold text-lg mb-3 pb-2 border-b">財務費用預設值 (Financial Defaults)</h3>
                            <table className="w-full text-sm">
                                <thead><tr className="text-left bg-gray-50"><th className="p-2">項目名稱</th><th className="p-2">預設金額 ($)</th><th className="p-2">預設公司</th><th className="p-2">操作</th></tr></thead>
                                <tbody>
                                    {(settings.expenseTypes || []).map((type: any, idx: number) => (
                                        <tr key={idx} className="border-b hover:bg-slate-50">
                                            <td className="p-2"><input type="text" value={type.name} onChange={e => handleExpenseTypeChange(idx, 'name', e.target.value)} className="border rounded p-1 w-full bg-transparent"/></td>
                                            <td className="p-2"><input type="number" value={type.defaultAmount} onChange={e => handleExpenseTypeChange(idx, 'defaultAmount', Number(e.target.value))} className="border rounded p-1 w-24"/></td>
                                            <td className="p-2">
                                                <select value={type.defaultCompany} onChange={e => handleExpenseTypeChange(idx, 'defaultCompany', e.target.value)} className="border rounded p-1 w-full bg-transparent">
                                                    <option value="">-- 選擇 --</option>
                                                    {settings.expenseCompanies.map((c: string) => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-2"><button onClick={() => removeItem('expenseTypes', idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button onClick={() => updateSettings('expenseTypes', [...(settings.expenseTypes||[]), { name: '新費用', defaultAmount: 0, defaultCompany: '', defaultDays: '0' }])} className="mt-2 text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200 flex items-center w-fit"><Plus size={12} className="mr-1"/> 新增費用類型</button>
                        </div>
                    </div>
                )}

                {/* 4. 中港業務 (完整功能) */}
                {activeTab === 'crossborder_setup' && (
                    <div className="space-y-8 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        {/* 機構列表 */}
                        <div>
                            <h3 className="font-bold text-lg mb-3 pb-2 border-b">常用辦理機構 (Institutions)</h3>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {settings.cbInstitutions.map((c:string, i:number) => (
                                    <span key={i} className="bg-slate-100 px-2 py-1 rounded text-xs flex items-center gap-2 border border-slate-200">{c} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeItem('cbInstitutions', i)}/></span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input value={newCbInst} onChange={e=>setNewCbInst(e.target.value)} className="border rounded px-2 py-1 text-sm outline-none" placeholder="新增機構名稱..." />
                                <button onClick={() => { addItem('cbInstitutions', newCbInst); setNewCbInst(''); }} className="text-xs bg-slate-800 text-white px-3 py-1 rounded">新增 (Add)</button>
                            </div>
                        </div>

                        {/* 代辦項目表格 */}
                        <div>
                            <h3 className="font-bold text-lg mb-3 pb-2 border-b">中港代辦項目預設值 (CB Defaults)</h3>
                            <table className="w-full text-sm">
                                <thead><tr className="text-left bg-gray-50"><th className="p-2">項目名稱</th><th className="p-2">預設收費 ($)</th><th className="p-2">預設天數</th><th className="p-2">預設機構</th><th className="p-2">操作</th></tr></thead>
                                <tbody>
                                    {(settings.cbItems || []).map((item: any, idx: number) => (
                                        <tr key={idx} className="border-b hover:bg-slate-50">
                                            <td className="p-2"><input type="text" value={item.name} onChange={e => handleCbItemChange(idx, 'name', e.target.value)} className="border rounded p-1 w-full bg-transparent"/></td>
                                            <td className="p-2"><input type="number" value={item.defaultFee} onChange={e => handleCbItemChange(idx, 'defaultFee', Number(e.target.value))} className="border rounded p-1 w-24"/></td>
                                            <td className="p-2"><input type="number" value={item.defaultDays} onChange={e => handleCbItemChange(idx, 'defaultDays', e.target.value)} className="border rounded p-1 w-16"/></td>
                                            <td className="p-2">
                                                <select value={item.defaultInst} onChange={e => handleCbItemChange(idx, 'defaultInst', e.target.value)} className="border rounded p-1 w-full bg-transparent">
                                                    <option value="">-- 選擇 --</option>
                                                    {settings.cbInstitutions.map((inst: string) => <option key={inst} value={inst}>{inst}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-2"><button onClick={() => removeItem('cbItems', idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button onClick={() => updateSettings('cbItems', [...(settings.cbItems||[]), { name: '新服務', defaultFee: 0, defaultDays: '7', defaultInst: '' }])} className="mt-2 text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200 flex items-center w-fit"><Plus size={12} className="mr-1"/> 新增服務項目</button>
                        </div>
                    </div>
                )}

                {/* 5. 用戶與權限 */}
                {activeTab === 'users' && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center"><Users size={18} className="mr-2"/> 系統用戶與權限</h3>
                        <div className="flex gap-2 mb-6 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="flex-1"><label className="text-[10px] font-bold text-slate-500">Email (User ID)</label><input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="w-full border rounded px-3 py-2 text-sm outline-none" placeholder="例如: sales01"/></div>
                            <div className="w-48"><label className="text-[10px] font-bold text-slate-500">密碼 (Password)</label><input type="text" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className="w-full border rounded px-3 py-2 text-sm outline-none font-mono" placeholder="設定密碼"/></div>
                            <button onClick={handleAddUser} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 shadow-sm h-10">新增用戶</button>
                        </div>
                        <div className="space-y-4">
                            {systemUsers.map((user: any, idx: number) => (
                                <div key={idx} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4 border-b pb-2">
                                        <div>
                                            <h4 className="font-bold text-lg text-slate-800">{user.email}</h4>
                                            <div className="flex gap-2 items-center mt-1">
                                                <span className="text-xs text-gray-500">登入後預設首頁:</span>
                                                <select value={user.defaultTab || 'dashboard'} onChange={e => handleUserPermissionChange(user.email, 'defaultTab', e.target.value)} className="border rounded p-1 text-xs bg-slate-50 font-bold text-blue-700">
                                                    {/* ★ 改成 systemMainModules ★ */}
                                                    {systemMainModules.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                                                </select>
                                            </div>
                                            {/* ★★★ 新增：資料權限設定 ★★★ */}
                                            <div className="flex gap-2 items-center mt-2 pt-2 border-t border-slate-100">
                                                <span className="text-xs text-gray-500 font-bold">資料視角:</span>
                                                <select 
                                                    value={user.dataAccess || 'all'} 
                                                    onChange={e => handleUserPermissionChange(user.email, 'dataAccess', e.target.value)} 
                                                    className={`border rounded p-1 text-xs font-bold w-full ${user.dataAccess === 'assigned' ? 'bg-yellow-50 text-yellow-700' : 'bg-slate-50 text-slate-700'}`}
                                                >
                                                    <option value="all">👀 全部資料 (All Data)</option>
                                                    <option value="assigned">👤 僅限負責 (Assigned Only)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemoveUser(user.email)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 border border-red-200 rounded">移除用戶</button>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {/* ★ 改成 permissionGroups ★ */}
                                        {permissionGroups.map(mod => {
                                            const hasAccess = (user.modules || []).includes('all') || (user.modules || []).includes(mod.key);
                                            const isBoss = user.email === 'BOSS';
                                            return (
                                                <label key={mod.key} className={`flex items-center text-xs p-2 rounded ... (略) ...`}>
                                                    <input type="checkbox" checked={hasAccess} disabled={isBoss} onChange={(e) => {
                                                            let newMods = user.modules || [];
                                                            // 如果之前是全選，先展開成個別項目
                                                            if (newMods.includes('all')) newMods = permissionGroups.map(m => m.key);
                                                            
                                                            if (e.target.checked) newMods.push(mod.key);
                                                            else newMods = newMods.filter((m:string) => m !== mod.key);
                                                            
                                                            handleUserPermissionChange(user.email, 'modules', newMods);
                                                        }} className="mr-2" />
                                                    {mod.label}
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'database_config' && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-700 mb-4">資料庫文件分類</h3>
                        <div className="bg-blue-50 p-4 rounded-lg mb-4 flex gap-2">
                            {['Person', 'Company', 'Vehicle', 'CrossBorder'].map(cat => (
                                <button key={cat} onClick={() => setSelectedDbCat(cat)} className={`px-4 py-2 rounded-lg text-sm font-bold border ${selectedDbCat === cat ? 'bg-blue-600 text-white' : 'bg-white'}`}>{cat}</button>
                            ))}
                        </div>
                        <div className="flex gap-2 mb-4">
                            <input value={newDocType} onChange={e => setNewDocType(e.target.value)} className="border rounded px-3 py-2 text-sm w-64" placeholder="新類型" />
                            <button onClick={() => {
                                if(!newDocType) return;
                                const current = settings.dbDocTypes[selectedDbCat] || [];
                                updateSettings('dbDocTypes', { ...settings.dbDocTypes, [selectedDbCat]: [...current, newDocType] });
                                setNewDocType('');
                            }} className="bg-slate-800 text-white px-4 py-2 rounded text-sm">新增</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(settings.dbDocTypes?.[selectedDbCat] || []).map((type:string, idx:number) => (
                                <span key={idx} className="bg-slate-100 px-3 py-1.5 rounded-full text-sm flex items-center gap-2 border">{type} <X size={14} className="cursor-pointer hover:text-red-500" onClick={() => {
                                    const current = settings.dbDocTypes[selectedDbCat] || [];
                                    const newList = current.filter((_:any, i:number) => i !== idx);
                                    updateSettings('dbDocTypes', { ...settings.dbDocTypes, [selectedDbCat]: newList });
                                }}/></span>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'reminders' && ( <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><h3 className="font-bold text-slate-700 mb-4">系統提醒</h3><div className="bg-amber-50 p-4 rounded-lg mb-4"><label className="flex items-center"><input type="checkbox" checked={settings.reminders?.isEnabled} onChange={e=>updateSettings('reminders', {...settings.reminders, isEnabled: e.target.checked})} className="mr-2"/> 開啟提醒功能</label></div></div> )}

                {activeTab === 'logs' && ( <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><h3 className="font-bold">系統操作日誌</h3><div className="mt-4 border rounded max-h-96 overflow-y-auto"><table className="w-full text-xs text-left"><tbody className="divide-y">{logs.map(l => (<tr key={l.id} className="hover:bg-slate-50"><td className="p-2 text-gray-500">{l.timestamp?.toDate().toLocaleString()}</td><td className="p-2 font-bold">{l.user}</td><td className="p-2">{l.action}</td><td className="p-2 text-gray-600">{l.detail}</td></tr>))}</tbody></table></div></div> )}

                {/* 6. 備份與還原 (完整功能) */}
                {activeTab === 'backup' && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-6">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center"><DownloadCloud size={18} className="mr-2"/> 資料備份與還原</h3>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h4 className="font-bold text-blue-800 text-sm mb-3">雲端自動備份</h4>
                            <div className="flex gap-4 items-center">
                                <select value={backupConfig.frequency} onChange={e => {
                                    const newConf = {...backupConfig, frequency: e.target.value};
                                    setBackupConfig(newConf); updateSettings('backup', newConf);
                                }} className="text-xs p-1 border rounded"><option value="manual">手動</option><option value="daily">每日</option><option value="weekly">每週</option></select>
                                <button onClick={handleCloudBackup} disabled={isBackingUp} className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded font-bold">{isBackingUp ? '備份中...' : '立即雲端備份'}</button>
                            </div>
                            <p className="text-xs text-blue-600/70 mt-2 font-mono">Last Backup: {backupConfig.lastBackupDate || 'Never'}</p>
                        </div>

                        {/* 本地匯入/匯出按鈕 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                                <h4 className="font-bold text-gray-800 mb-2">匯出本地檔案 (Export)</h4>
                                <button onClick={handleExport} className="w-full bg-slate-700 text-white py-2 rounded-lg text-sm font-bold hover:bg-slate-600">下載 JSON</button>
                            </div>
                            <div className="bg-amber-50 p-5 rounded-xl border border-amber-200">
                                <h4 className="font-bold text-amber-800 mb-2">系統還原 (Restore)</h4>
                                <label className="w-full bg-amber-500 text-white py-2 rounded-lg text-sm font-bold hover:bg-amber-600 text-center block cursor-pointer">
                                    選擇檔案並還原
                                    <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                                </label>
                            </div>
                        </div>
                        <div className="bg-red-50 p-5 rounded-xl border border-red-200 mt-6 relative overflow-hidden">
                            <h4 className="font-bold text-red-800 mb-2">進階資料修復 (Data Rescue)</h4>
                            <p className="text-xs text-red-700/80 mb-4">此功能用於從舊 CSV 檔案「合併」中港資料到現有車輛中。</p>
                            <label className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 cursor-pointer shadow-sm inline-flex items-center">
                                <Upload size={16} className="mr-2"/> 上傳 CSV 進行修復
                                <input type="file" accept=".csv" className="hidden" onChange={handleRescueImport} />
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 新增：車輛推介單預覽組件 (iPhone 專用) ---
const VehicleShareModal = ({ vehicle, db, staffId, appId, onClose }: any) => {
    const [photos, setPhotos] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // 自動讀取該車輛的照片
    useEffect(() => {
        if (!db || !vehicle.id) return;
        const q = query(
            collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library'), 
            where('status', '==', 'linked'), 
            where('relatedVehicleId', '==', vehicle.id)
        );
        const unsub = onSnapshot(q, (snap) => {
            const list: any[] = [];
            snap.forEach(d => list.push(d.data()));
            // 簡單排序：封面優先，然後取前 6 張
            list.sort((a,b) => (b.isPrimary?1:0) - (a.isPrimary?1:0));
            setPhotos(list.map(i => i.url).slice(0, 6)); // 取前6張 (外觀+內飾)
            setLoading(false);
        });
        return () => unsub();
    }, [vehicle.id]);

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm md:max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header Actions */}
                <div className="p-3 bg-slate-900 text-white flex justify-between items-center print:hidden">
                    <span className="text-xs font-bold">預覽模式 (可截圖或列印)</span>
                    <button onClick={onClose}><X size={20}/></button>
                </div>

                {/* Content Area (白色區域，適合截圖) */}
                <div className="flex-1 overflow-y-auto p-6 bg-white" id="share-content">
                    {/* Logo & Header */}
                    <div className="flex items-center gap-4 border-b-2 border-yellow-500 pb-4 mb-4">
                        <img src={COMPANY_INFO.logo_url} className="w-16 h-16 object-contain" onError={(e) => e.currentTarget.style.display='none'}/>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 leading-none">{COMPANY_INFO.name_en}</h1>
                            <h2 className="text-sm font-bold text-slate-600 mt-1">{COMPANY_INFO.name_ch}</h2>
                        </div>
                    </div>

                    {/* Car Title */}
                    <div className="mb-4">
                        <h3 className="text-2xl font-black text-slate-800">{vehicle.make} {vehicle.model}</h3>
                        <p className="text-sm text-slate-500 font-mono mt-1">{vehicle.year} | {vehicle.regMark || "未出牌"}</p>
                    </div>

                    {/* Key Specs Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">顏色 (Color)</span>
                            <span className="font-bold text-slate-800">{vehicle.colorExt}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">手數 (Owners)</span>
                            <span className="font-bold text-slate-800">{vehicle.previousOwners || '0'} 手</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">里數 (Mileage)</span>
                            <span className="font-bold text-slate-800">{Number(vehicle.mileage||0).toLocaleString()} km</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">容積 (Engine)</span>
                            <span className="font-bold text-slate-800">{vehicle.engineSize} cc</span>
                        </div>
                    </div>

                    {/* Photos Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {loading ? <div className="col-span-2 text-center text-xs py-10">載入圖片中...</div> : 
                         photos.length > 0 ? photos.map((url, i) => (
                            <div key={i} className={`rounded-lg overflow-hidden border border-slate-100 aspect-video ${i===0 ? 'col-span-2' : ''}`}>
                                <img src={url} className="w-full h-full object-cover"/>
                            </div>
                        )) : (
                            <div className="col-span-2 text-center py-8 bg-gray-50 text-gray-400 text-xs rounded">暫無圖片</div>
                        )}
                    </div>

                    {/* Contact Footer */}
                    <div className="text-center border-t border-slate-100 pt-4 mt-4">
                        <p className="text-xs font-bold text-slate-800">有意請聯絡: {staffId}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{COMPANY_INFO.address_ch}</p>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-slate-100 border-t print:hidden">
                    <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform flex items-center justify-center">
                        <Printer size={16} className="mr-2"/> 列印 / 儲存 PDF
                    </button>
                    <p className="text-[10px] text-center text-slate-400 mt-2">提示：iPhone 可直接截圖發送 WhatsApp</p>
                </div>
            </div>
        </div>
    );
};

// --- 主應用程式 ---
export default function GoldLandAutoDMS() {
  const [user, setUser] = useState<User | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ email: string, modules: string[] } | null>(null); // 存權限物件
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'create_doc' | 'settings' | 'inventory_add' | 'reports' | 'cross_border' | 'business' | 'database'| 'media_center'>('dashboard');
  
  // --- User Management Helper (v13.1 新增) ---
    const updateSystemUsers = async (newUsers: any[]) => {
        setSystemUsers(newUsers); // 更新畫面
        if (db && appId) {
            try {
                // 同步寫入 Firebase
                const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system', 'users');
                await setDoc(docRef, { list: newUsers }, { merge: true });
            } catch (err) {
                console.error("Failed to update users:", err);
            }
        }
    };

  const addSystemLog = async (action: string, detail: string) => {
    if (!db || !appId) return;
    try {
        await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_logs'), {
            user: staffId || 'System',
            action: action,
            detail: detail,
            timestamp: serverTimestamp()
        });
    } catch (e) { console.error("Log error:", e); }
    };

  // Data States
  const [inventory, setInventory] = useState<Vehicle[]>([]);
  // 1. 定義預設設定 (修正版：補回 dbCategories 與 dbRoles)
    const defaultSettings: SystemSettings = {
        makes: ['Toyota', 'Honda', 'BMW', 'Mercedes-Benz', 'Audi', 'Lexus', 'Nissan', 'Mazda', 'Porsche', 'Tesla'],
        models: { 
            'Toyota': ['Alphard', 'Vellfire', 'Noah', 'Sienta', 'Corolla', 'Camry', 'Hiace'], 
            'Honda': ['Stepwgn', 'Freed', 'Jazz', 'Odyssey', 'Civic'], 
            'BMW': ['X5', 'X3', '520i', '320i', '118i'], 
            'Mercedes-Benz': ['E200', 'C200', 'S500', 'V250', 'A200', 'GLC'],
            'Audi': ['A3', 'A4', 'Q3', 'Q5', 'Q7'],
            'Lexus': ['RX', 'NX', 'UX', 'ES'],
            'Porsche': ['Cayenne', 'Macan', 'Panamera', '911'],
            'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X']
        },
        colors: ['White', 'Black', 'Silver', 'Grey', 'Blue', 'Red', 'Pearl White', 'Metallic Grey'],
        expenseTypes: [
            { name: '維修費', defaultCompany: '捷信車房', defaultAmount: 0, defaultDays: '0' },
            { name: '美容費', defaultCompany: '3M美容中心', defaultAmount: 0, defaultDays: '0' },
            { name: '驗車費', defaultCompany: '政府驗車中心', defaultAmount: 580, defaultDays: '0' },
            { name: '牌費', defaultCompany: '運輸署', defaultAmount: 0, defaultDays: '0' },
            { name: '保險費', defaultCompany: '安盛保險', defaultAmount: 0, defaultDays: '0' },
            { name: '入油', defaultCompany: 'Shell', defaultAmount: 0, defaultDays: '0' },
            { name: '泊車', defaultCompany: '領展', defaultAmount: 0, defaultDays: '0' }
        ],
        expenseCompanies: ['捷信車房', '3M美容中心', '政府驗車中心', '運輸署', '安盛保險', '中石化', 'Shell', 'Caltex', '領展'],
        paymentTypes: ['Deposit', 'Balance', 'Full Payment', 'Installment', 'Service Fee', 'Commission'],
        serviceItems: ['代辦驗車', '代辦保險', '申請禁區紙', '批文延期', '更換司機', '代辦免檢', '海關年檢'],
        cbItems: [
            { name: '代辦驗車', defaultInst: '中檢公司', defaultFee: 500, defaultDays: '7' },
            { name: '批文延期', defaultInst: '廣東省公安廳', defaultFee: 0, defaultDays: '14' }
        ],
        cbInstitutions: ['中檢公司', '廣東省公安廳', '海關', '邊檢', '保險公司'],
        
        // ★★★ 補回缺少的這兩個欄位 ★★★
        dbCategories: ['Person', 'Company', 'Vehicle', 'CrossBorder', 'Other'],
        dbRoles: ['Admin', 'Manager', 'Staff', 'Viewer'],
        // ★★★ 補回結束 ★★★

        dbDocTypes: {
            'Person': ['身份證', '回鄉證', '駕駛執照', '住址證明'],
            'Company': ['商業登記證 (BR)', '公司註冊證 (CI)', '周年申報表 (NAR1)'],
            'Vehicle': ['牌簿 (VRD)', '行車證', '保險單', '驗車紙'],
            'CrossBorder': ['批文卡', '禁區紙', '行駛證', '海關本']
        },
        reminders: { isEnabled: true, daysBefore: 30, time: '10:00', categories: { license: true, insurance: true, crossBorder: true, installments: true } },
        backup: { frequency: 'monthly', lastBackupDate: '', autoCloud: true }
    };

  // 1. ★★★ 定義資料權限過濾器 ★★★
  const getVisibleInventory = () => {
      // 1. 管理員看全部
      if (staffId === 'BOSS' || (currentUser?.modules?.includes('all')) || (currentUser as any)?.dataAccess === 'all') {
          return inventory;
      }

      // 2. ★ 嚴格模式：只看「負責人是自己」的車
      // 移除了 !v.managedBy 的判斷
      return inventory.filter(v => v.managedBy === staffId);
  };

  // 2. ★★★ 產生過濾後的清單 (這就是員工能看到的所有車) ★★★
  const visibleInventory = getVisibleInventory();  

  const [primaryImages, setPrimaryImages] = useState<Record<string, string>>({});
    // 2. 初始化 State (使用上面的 defaultSettings 作為初始值)
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [dbEntries, setDbEntries] = useState<DatabaseEntry[]>([]);
  // UI States
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null); 
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null); 
  const [shareVehicle, setShareVehicle] = useState<Vehicle | null>(null); // ★ 新增：控制分享彈窗

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

  const clients = useMemo(() => dbEntries.filter(e => e.category === 'Person'), [dbEntries]);

  useEffect(() => {
    if (!db || !appId) return;
    
    // 注意：這裡應該已經被替換為 'charles_data'
    const unsub = onSnapshot(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system', 'users'), (docSnap) => {
        if (docSnap.exists()) {
            const rawList = docSnap.data().list || [];
            setSystemUsers(rawList);
        } else {
            // 如果還沒有用戶名單，預設建立一個 BOSS 帳號 (密碼 8888)
            setSystemUsers([{ email: 'BOSS', password: '8888', modules: ['all'] }]);
        }
    });
    return () => unsub();
  }, [db, appId]);


  // ★★★ 2. 新增：監聽智能圖庫的封面圖 (只讀取有標記 isPrimary 的圖) ★★★
  useEffect(() => {
      if (!db || !appId) return;
      
      // 查詢條件：狀態是已連結 (linked) 且 是封面 (isPrimary)
      const q = query(
          collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library'),
          where('status', '==', 'linked'),
          where('isPrimary', '==', true)
      );

      const unsub = onSnapshot(q, (snapshot) => {
          const map: Record<string, string> = {};
          snapshot.forEach(doc => {
              const data = doc.data();
              if (data.relatedVehicleId && data.url) {
                  map[data.relatedVehicleId] = data.url;
              }
          });
          setPrimaryImages(map);
      });

      return () => unsub();
  }, [db, appId]);
  
  // -------------------------------------------------------------
  // ★★★ 系統設定讀取 (v14.5 修正版：修復 defaultSettings 可選屬性報錯) ★★★
  // -------------------------------------------------------------
  useEffect(() => {
      if (!db || !appId) return;

      const fetchSettings = async () => {
          try {
              const docRef = doc(db!, 'artifacts', appId!, 'staff', 'CHARLES_data', 'system', 'settings');
              const docSnap = await getDoc(docRef);

              if (docSnap.exists()) {
                  const dbData = docSnap.data() as Partial<SystemSettings>;
                  
                  setSettings(prev => ({
                      ...defaultSettings, 
                      ...dbData,          
                      
                      // 1. 陣列保護
                      expenseTypes: dbData.expenseTypes?.length ? dbData.expenseTypes : defaultSettings.expenseTypes,
                      expenseCompanies: dbData.expenseCompanies?.length ? dbData.expenseCompanies : defaultSettings.expenseCompanies,
                      cbItems: dbData.cbItems?.length ? dbData.cbItems : defaultSettings.cbItems,
                      cbInstitutions: dbData.cbInstitutions?.length ? dbData.cbInstitutions : defaultSettings.cbInstitutions,
                      
                      // 2. 物件保護
                      models: { ...defaultSettings.models, ...(dbData.models || {}) },
                      
                      // 3. Reminders 全欄位保護 (加上 ?. 和最終預設值)
                      reminders: { 
                          isEnabled: dbData.reminders?.isEnabled ?? defaultSettings.reminders?.isEnabled ?? true,
                          daysBefore: dbData.reminders?.daysBefore ?? defaultSettings.reminders?.daysBefore ?? 30,
                          time: dbData.reminders?.time ?? defaultSettings.reminders?.time ?? '10:00',
                          categories: {
                              license: dbData.reminders?.categories?.license ?? defaultSettings.reminders?.categories?.license ?? true,
                              insurance: dbData.reminders?.categories?.insurance ?? defaultSettings.reminders?.categories?.insurance ?? true,
                              crossBorder: dbData.reminders?.categories?.crossBorder ?? defaultSettings.reminders?.categories?.crossBorder ?? true,
                              installments: dbData.reminders?.categories?.installments ?? defaultSettings.reminders?.categories?.installments ?? false
                          }
                      },
                      
                      // 4. Backup 全欄位保護
                      backup: { 
                          frequency: dbData.backup?.frequency ?? defaultSettings.backup?.frequency ?? 'monthly',
                          lastBackupDate: dbData.backup?.lastBackupDate ?? defaultSettings.backup?.lastBackupDate ?? '',
                          autoCloud: dbData.backup?.autoCloud ?? defaultSettings.backup?.autoCloud ?? true
                      }
                  }));
                  
                  console.log("✅ 系統設定已從資料庫同步");
              } else {
                  console.log("⚠️ 首次運行：寫入預設設定到資料庫");
                  await setDoc(docRef, defaultSettings);
                  setSettings(defaultSettings);
              }
          } catch (error) {
              console.error("❌ 設定讀取失敗:", error);
          }
      };

      fetchSettings();
  }, [db, appId]);

  
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
    
    const invRef = collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory');
    const q = query(invRef, orderBy('createdAt', 'desc')); 
    const unsubInv = onSnapshot(q, (snapshot) => {
      const list: Vehicle[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Vehicle));
      setInventory(list);
    }, (err) => console.error("Inv sync error", err));

    

    return () => { unsubInv(); };
  }, [staffId]);

useEffect(() => {
        if (!db || !staffId) return;
        const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
        const dbRef = collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'database');
        
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

  if (!staffId) {
    return (
        <StaffLoginScreen 
            systemUsers={systemUsers}
            onLogin={(userObj: any) => {
                const uid = userObj.email || userObj;
                setStaffId(uid);
                setCurrentUser(userObj); 

                // 2. 登入時記錄日誌
                if (db) addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_logs'), {
                    user: uid, action: 'Login', detail: 'User logged in successfully', timestamp: serverTimestamp()
                });

                // ★★★ 修改：優先使用用戶設定的「預設首頁」 ★★★
                if (userObj.defaultTab) {
                    setActiveTab(userObj.defaultTab);
                } 
                // 若無設定，且有權限限制，則跳第一個允許的模組
                else if (userObj.modules && !userObj.modules.includes('all') && !userObj.modules.includes('dashboard') && userObj.modules.length > 0) {
                    const firstModule = userObj.modules[0];
                    const map: Record<string,any> = { 'inventory': 'inventory', 'business': 'business', 'database': 'database', 'settings': 'settings' };
                    setActiveTab(map[firstModule] || 'inventory');
                } else {
                    setActiveTab('dashboard');
                }
            }} 
        />
    );
}



  // --- CRUD Actions ---

// ★★★ 新增：自動同步資料至資料庫中心 (連動邏輯) ★★★
  const syncToDatabase = async (data: { name: string, phone?: string, plate?: string, quota?: string }, role: string) => {
      // 確保 db 存在且有姓名才執行
      if (!db || !staffId || !data.name) return;
      const currentDb = db;
      const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
      const dbRef = collection(currentDb, 'artifacts', appId, 'staff', 'CHARLES_data', 'database');
      
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

// --- 核心功能：更新單一車輛資料 (通用函數) ---
    const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
        if (!db || !appId) return;
        try {
            // 1. 更新資料庫
            const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory', id);
            await setDoc(docRef, updates, { merge: true });
            
            // 2. 更新本地狀態 (讓畫面即時反應)
            setInventory(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
        } catch (error) {
            console.error("Update Vehicle Error:", error);
            alert("資料更新失敗，請檢查網路連線。");
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
      managedBy: (formData.get('managedBy') as string) || editingVehicle?.managedBy || staffId,
      
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
            await updateDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory', editingVehicle.id), vData);
            addSystemLog('Update Vehicle', `Updated RegMark: ${vData.regMark}`); // ★ 加入日誌
            alert('車輛資料已更新');
        } else {
            await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory'), {
            ...vData,
            createdAt: serverTimestamp(),
            expenses: [],
            payments: []
            });
            addSystemLog('Create Vehicle', `Created RegMark: ${vData.regMark}`); // ★ 加入日誌
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
      await deleteDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory', id));
      addSystemLog('Delete Vehicle', `Deleted Vehicle ID: ${id}`);
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
    await updateDoc(doc(currentDb, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory', vehicleId), updateData);
    
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
      await updateDoc(doc(currentDb, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory', vehicleId), {
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

  // 更新設定並同步到資料庫
    const updateSettings = async (key: keyof SystemSettings, value: any) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings); // 更新畫面
        
        // ★ 寫入資料庫 ★
        if (db && appId) {
            try {
                const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system', 'settings');
                await setDoc(docRef, newSettings, { merge: true });
                // console.log(`Setting [${key}] saved.`);
            } catch (err) {
                console.error("Save setting failed:", err);
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
    let sorted = [...visibleInventory];
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
  // 3. ★★★ 修改 Dashboard 統計邏輯 (改用 visibleInventory) ★★★
  const dashboardStats = () => {
    let totalStockValue = 0;
    let totalReceivable = 0; 
    let totalPayable = 0; 
    let totalSoldThisMonth = 0;

    // ★ 這裡原本是 inventory.forEach，改成 visibleInventory.forEach
    visibleInventory.forEach(car => {
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
  const stats = dashboardStats(); // 這樣儀表板數字就會變了

  // --- Cross Border Logic ---
  const crossBorderStats = () => {
      // ★ 這裡原本是 inventory.filter，改成 visibleInventory.filter
      const cbVehicles = visibleInventory.filter(v => {
          const cb = v.crossBorder;
          if (!cb) return false;
          return cb.isEnabled || !!cb.mainlandPlate || !!cb.quotaNumber;
      });
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

  // --- Report Logic (v9.7: 修復中港費用顯示問題) ---
  const generateReportData = () => {
    let data: any[] = [];
    
    if (reportType === 'receivable') {
        data = inventory.filter(v => {
            // 1. 計算應收與已收
            const cbFees = (v.crossBorder?.tasks || []).reduce((sum, t) => sum + (t.fee || 0), 0);
            const totalReceivable = (v.price || 0) + cbFees;
            const received = (v.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
            const balance = totalReceivable - received;
            
            // 2. 判斷是否顯示：只要有餘額 (欠款) 就應該顯示，不論狀態
            if (balance <= 0) return false;

            // 3. 日期過濾邏輯
            // A. 如果是賣車，看依據出庫/入庫日
            const stockDate = v.stockOutDate || v.stockInDate || '';
            const isStockMatch = stockDate && (!reportStartDate || stockDate >= reportStartDate) && (!reportEndDate || stockDate <= reportEndDate);
            
            // B. 如果是純代辦，看任務日期 (只要有一個任務在區間內就顯示)
            const isTaskMatch = (v.crossBorder?.tasks || []).some(t => 
                (!reportStartDate || t.date >= reportStartDate) && 
                (!reportEndDate || t.date <= reportEndDate)
            );

            // 如果沒有選日期，或是符合日期區間
            const isDateMatch = (!reportStartDate && !reportEndDate) || isStockMatch || isTaskMatch;

            return isDateMatch;
        }).map(v => {
            const cbFees = (v.crossBorder?.tasks || []).reduce((sum, t) => sum + (t.fee || 0), 0);
            const totalReceivable = (v.price || 0) + cbFees;
            const received = (v.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
            return {
                vehicleId: v.id,
                date: v.stockOutDate || (v.crossBorder?.tasks?.[0]?.date) || 'Service', // 顯示出庫日或第一個任務日
                title: `${v.year} ${v.make} ${v.model}`,
                regMark: v.regMark,
                amount: totalReceivable - received, // 顯示欠款餘額
                status: v.status
            };
        });

    } else if (reportType === 'payable') {
        // ... (應付帳款邏輯保持不變) ...
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
        // ... (銷售報表邏輯保持不變) ...
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

// ------------------------------------------------------------------
// ★★★ 1. Vehicle Form Modal (v16.1: 擬真車牌 + 手機返回按鈕) ★★★
// ------------------------------------------------------------------
const VehicleFormModal = ({ 
    db, staffId, appId, clients, settings, editingVehicle, setEditingVehicle, activeTab, setActiveTab, saveVehicle, addPayment, deletePayment, addExpense, deleteExpense,
    addSystemLog 
}: any) => {
    if (!editingVehicle && activeTab !== 'inventory_add') return null; 
    
    const v = editingVehicle || {} as Partial<Vehicle>;
    const isNew = !v.id; 
    
    // --- 狀態定義 ---
    const [selectedMake, setSelectedMake] = useState(v.make || '');
    const [isCbExpanded, setIsCbExpanded] = useState(false); 
    const [currentStatus, setCurrentStatus] = useState<'In Stock' | 'Reserved' | 'Sold' | 'Withdrawn'>(v.status || 'In Stock');
    const [showVrdOverlay, setShowVrdOverlay] = useState(false);

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
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // VRD 搜尋狀態
    const [vrdSearch, setVrdSearch] = useState('');
    const [vrdResults, setVrdResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [vrdOwnerRaw, setVrdOwnerRaw] = useState(''); 

    // 中港車日期與口岸
    const cbDateMap: Record<string, string> = {
        'HkInsurance': '香港保險', 'ReservedPlate': '留牌紙', 'Br': '商業登記 (BR)', 'LicenseFee': '香港牌費',
        'MainlandJqx': '內地交強險', 'MainlandSyx': '內地商業險', 'ClosedRoad': '禁區紙', 'Approval': '批文卡',
        'MainlandLicense': '內地行駛證', 'HkInspection': '香港驗車(中港)'
    };
    const HK_PORTS = ['皇崗', '深圳灣', '蓮塘', '沙頭角', '文錦渡', '港珠澳大橋(港)'];
    const MO_PORTS = ['港珠澳大橋(澳)', '關閘(拱北)', '橫琴', '青茂'];

    // 計算邏輯
    const cbFees = (v.crossBorder?.tasks || []).reduce((sum: number, t: any) => sum + (t.fee || 0), 0);
    const totalRevenue = (v.price || 0) + cbFees;
    const totalReceived = (v.payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const generalExpenses = (v.expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const totalExpenses = generalExpenses + cbFees;
    const balance = totalRevenue - totalReceived; 
    const pendingCbTasks = (v.crossBorder?.tasks || []).filter((t: any) => (t.fee !== 0) && !(v.payments || []).some((p: any) => p.relatedTaskId === t.id));

    const [newExpense, setNewExpense] = useState({ date: new Date().toISOString().split('T')[0], type: '', company: '', amount: '', status: 'Unpaid', paymentMethod: 'Cash', invoiceNo: '' });
    const [newPayment, setNewPayment] = useState({ date: new Date().toISOString().split('T')[0], type: settings.paymentTypes?.[0] || 'Deposit', amount: '', method: 'Cash', note: '', relatedTaskId: '' });

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

    useEffect(() => {
        if (!v.id || !db || !staffId) return;
        const mediaRef = collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library');
        const q = query(mediaRef, where('status', '==', 'linked'), where('relatedVehicleId', '==', v.id));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const linkedUrls: string[] = [];
            let coverUrl = '';
            snapshot.forEach(doc => { const data = doc.data(); if (data.isPrimary) coverUrl = data.url; else linkedUrls.push(data.url); });
            if (coverUrl) linkedUrls.unshift(coverUrl);
            const legacyPhotos = v.photos || [];
            const combined = Array.from(new Set([...linkedUrls, ...legacyPhotos]));
            setCarPhotos(combined);
        });
        return () => unsubscribe();
    }, [v.id, db, staffId, appId]);

    const handleGoToMediaLibrary = () => { setEditingVehicle(null); setActiveTab('media_center'); };
    const setFieldValue = (name: string, val: string) => { const el = document.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement; if(el) el.value = val; };

    const handleExpenseTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedType = e.target.value;
        const setting = settings.expenseTypes.find((item: any) => (typeof item === 'string' ? item === selectedType : item.name === selectedType));
        let defaultComp = ''; let defaultAmt = ''; let targetDate = newExpense.date;
        if (setting && typeof setting !== 'string') {
            defaultComp = setting.defaultCompany || '';
            defaultAmt = setting.defaultAmount ? formatNumberInput(setting.defaultAmount.toString()) : '';
            if (setting.defaultDays && Number(setting.defaultDays) > 0) { const d = new Date(); d.setDate(d.getDate() + Number(setting.defaultDays)); targetDate = d.toISOString().split('T')[0]; }
        }
        setNewExpense({ ...newExpense, type: selectedType, company: defaultComp, amount: defaultAmt, date: targetDate });
    };

    const autoFetchCustomer = () => { /* 保留 */ }; 

    const handleSearchVRD = async () => {
        if (!vrdSearch || !db) return;
        setSearching(true); setVrdResults([]); 
        try {
            const dbRef = collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'database');
            const q = query(dbRef, where('category', '==', 'Vehicle')); 
            const snapshot = await getDocs(q);
            const searchKey = vrdSearch.toUpperCase().trim();
            const matches: any[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if ((data.plateNoHK||'').toUpperCase().includes(searchKey) || (data.chassisNo||'').toUpperCase().includes(searchKey) || (data.name||'').toUpperCase().includes(searchKey)) {
                    matches.push(data);
                }
            });
            if (matches.length > 0) { setVrdResults(matches); } else { alert("資料庫中心找不到相符的車輛"); }
        } catch (e) { console.error(e); alert("搜尋錯誤"); } finally { setSearching(false); }
    };

    const applyVrdData = (vrdData: any) => {
        if (!vrdData) return;
        setFieldValue('regMark', vrdData.plateNoHK || vrdData.regNo || '');
        const rawMake = vrdData.make || vrdData.brand || ''; 
        if (rawMake) {
            let matchedMake = settings.makes.find((m: string) => m.toLowerCase() === rawMake.toLowerCase());
            if (!matchedMake) { matchedMake = settings.makes.find((m: string) => rawMake.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(rawMake.toLowerCase())); }
            setSelectedMake(matchedMake || rawMake);
        }
        setFieldValue('model', vrdData.model || '');
        setFieldValue('year', vrdData.manufactureYear || vrdData.year || '');
        setFieldValue('chassisNo', vrdData.chassisNo || '');
        setFieldValue('engineNo', vrdData.engineNo || '');
        setFieldValue('colorExt', vrdData.vehicleColor || vrdData.color || '');
        if (vrdData.engineSize) setEngineSizeStr(formatNumberInput(vrdData.engineSize.toString()));
        if (vrdData.priceA1) setPriceA1Str(formatNumberInput(vrdData.priceA1.toString()));
        if (vrdData.priceTax) setPriceTaxStr(formatNumberInput(vrdData.priceTax.toString()));
        if (vrdData.prevOwners !== undefined) setFieldValue('previousOwners', vrdData.prevOwners.toString());
        const ownerName = vrdData.registeredOwnerName || vrdData.owner;
        if (ownerName) {
            const exist = clients.find((c: any) => c.name === ownerName);
            if (exist) {
                setFieldValue('customerName', exist.name); setFieldValue('customerPhone', exist.phone || '');
                setFieldValue('customerID', exist.idNumber || exist.hkid || ''); setFieldValue('customerAddress', exist.address || '');
                setVrdOwnerRaw(''); alert(`已成功導入 VRD 並自動配對客戶：${exist.name}`);
            } else {
                setVrdOwnerRaw(ownerName); setFieldValue('customerName', ownerName); 
                if(vrdData.registeredOwnerId) setFieldValue('customerID', vrdData.registeredOwnerId);
                alert(`VRD 導入成功。注意：系統內無客戶 "${ownerName}" 的完整檔案，已暫填姓名。`);
            }
        } else { alert("VRD 導入成功"); }
        setVrdResults([]); setVrdSearch(''); setShowVrdOverlay(false);
    };

    const handleSaveWrapper = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if(!formData.has('mileage')) { const hiddenMileage = document.createElement('input'); hiddenMileage.type = 'hidden'; hiddenMileage.name = 'mileage'; hiddenMileage.value = mileageStr.replace(/,/g, ''); e.currentTarget.appendChild(hiddenMileage); }
        try { if(editingVehicle) editingVehicle.photos = carPhotos; await saveVehicle(e); } catch (err) { alert(`儲存失敗: ${err}`); }
    };

    // 關閉函數
    const handleClose = () => {
        setEditingVehicle(null); 
        if(activeTab !== 'inventory_add') {} else {setActiveTab('inventory');} 
    };

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-0 md:p-4 overflow-hidden">
        <div className="bg-slate-100 md:rounded-2xl shadow-2xl w-full max-w-[95vw] h-full md:h-[90vh] flex flex-col overflow-hidden border border-slate-600">
          
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center flex-none shadow-md z-20 safe-area-top">
            <div className="flex items-center gap-3">
                {/* ★★★ 手機版專用返回按鈕 ★★★ */}
                <button type="button" onClick={handleClose} className="md:hidden p-2 -ml-2 mr-1 text-slate-300 hover:text-white active:scale-95 transition-transform">
                    <ChevronLeft size={28} />
                </button>

                {isNew ? (
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-yellow-500 rounded-lg text-black"><Car size={24} /></div>
                        <h2 className="text-xl font-bold">車輛入庫</h2>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        {/* 擬真車牌標題 */}
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5 hidden md:block">Registration</span>
                            <span className="bg-[#FFD600] text-black border-[3px] border-black font-black font-mono text-xl md:text-2xl px-3 py-0.5 rounded-[4px] shadow-[0_2px_4px_rgba(0,0,0,0.3)] leading-none transform -skew-x-3">
                                {v.regMark || '未出牌'}
                            </span>
                        </div>
                        {/* 內地車牌 */}
                        {v.crossBorder?.mainlandPlate && (
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5 hidden md:block">Mainland</span>
                                <span className={`${v.crossBorder.mainlandPlate.startsWith('粵Z') ? 'bg-black text-white border-white' : 'bg-[#003399] text-white border-white'} border-2 font-bold font-mono text-sm md:text-lg px-2 py-1 rounded-[3px] shadow-[0_2px_4px_rgba(0,0,0,0.3)] leading-none tracking-wide`}>
                                    {v.crossBorder.mainlandPlate}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* 電腦版關閉按鈕 */}
            <div className="flex gap-3 hidden md:block">
                <button type="button" onClick={handleClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors"><X size={24} /></button>
            </div>
          </div>

          <form onSubmit={handleSaveWrapper} className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            
            {/* 左側欄 (VRD & Photos) */}
            <div className="w-full md:w-[35%] bg-slate-200/50 border-r border-slate-300 flex flex-col h-auto md:h-full overflow-hidden relative order-2 md:order-1">
                 {showVrdOverlay && (
                    <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-sm flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6 border-b pb-2"><h3 className="font-bold text-lg text-blue-800 flex items-center"><Database size={20} className="mr-2"/> 連動資料庫中心</h3><button type="button" onClick={() => setShowVrdOverlay(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20}/></button></div>
                        <div className="flex flex-col h-full overflow-hidden pb-10">
                            <div className="flex gap-2 mb-4 flex-none"><input value={vrdSearch} onChange={e => setVrdSearch(e.target.value.toUpperCase())} placeholder="輸入車牌、底盤號或車主名" className="flex-1 p-3 border-2 border-blue-200 rounded-lg text-lg font-mono uppercase focus:border-blue-500 outline-none" autoFocus onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleSearchVRD(); }}} /><button type="button" onClick={handleSearchVRD} disabled={searching} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">{searching ? <Loader2 className="animate-spin"/> : '搜尋'}</button></div>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">{vrdResults.map((res, idx) => (<div key={idx} className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex justify-between items-center hover:bg-blue-100 transition-colors"><div><div className="font-bold text-lg text-slate-800">{res.plateNoHK || res.regNo}</div><div className="text-xs text-slate-600">{res.manufactureYear} {res.make} {res.model}</div></div><button type="button" onClick={() => applyVrdData(res)} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600 shadow-sm text-xs">導入</button></div>))}</div>
                        </div>
                    </div>
                 )}

                 <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                     {/* VRD Card */}
                     <div className="bg-white rounded-xl shadow-sm border-2 border-red-100 overflow-hidden relative group">
                        <div className="absolute top-0 left-0 w-full h-2 bg-red-400/80"></div>
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between items-center"><h3 className="font-bold text-red-800 text-sm flex items-center"><FileText size={14} className="mr-1"/> 車輛登記文件 (VRD)</h3><button type="button" onClick={() => setShowVrdOverlay(true)} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center shadow-sm transition-transform active:scale-95"><Link size={10} className="mr-1"/> 連結資料庫</button></div>
                            
                            <div className="space-y-1 relative">
                                <label className="text-[10px] text-slate-400 font-bold uppercase">Registration Mark</label>
                                <div className="flex relative">
                                    <input name="regMark" defaultValue={v.regMark} placeholder="未出牌" className="w-full bg-[#FFD600] border-[3px] border-black p-2 text-3xl font-black font-mono text-center text-black focus:outline-none focus:ring-4 focus:ring-yellow-200 rounded-md uppercase placeholder:text-yellow-700/50"/>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[9px] text-slate-400 font-bold uppercase">Make</label><select name="make" value={selectedMake} onChange={(e) => setSelectedMake(e.target.value)} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-sm font-bold text-slate-700 outline-none"><option value="">--</option>{settings.makes.map((m:string) => <option key={m} value={m}>{m}</option>)}</select></div>
                                <div><label className="text-[9px] text-slate-400 font-bold uppercase">Model</label><input list="model_list" name="model" defaultValue={v.model} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-sm font-bold text-slate-700 outline-none"/><datalist id="model_list">{(settings.models[selectedMake] || []).map((m:string) => <option key={m} value={m} />)}</datalist></div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div className="col-span-1"><label className="text-[9px] text-slate-400 font-bold uppercase">Year</label><input name="year" type="number" defaultValue={v.year} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-sm font-mono"/></div>
                                <div className="col-span-1"><label className="text-[9px] text-slate-400 font-bold uppercase">Mileage</label><input name="mileage" value={mileageStr} onChange={(e) => setMileageStr(formatNumberInput(e.target.value))} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-sm font-mono text-right" placeholder="km"/></div>
                                <div className="col-span-1"><label className="text-[9px] text-slate-400 font-bold uppercase">Prev Owners</label><input name="previousOwners" defaultValue={v.previousOwners} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-sm text-right"/></div>
                                <div className="col-span-1 bg-red-50/50 rounded px-1"><label className="text-[9px] text-red-400 font-bold uppercase">Lic. Expiry</label><input type="date" name="licenseExpiry" defaultValue={v.licenseExpiry} className="w-full bg-transparent border-b border-red-200 p-1 text-xs font-mono text-right text-red-700 outline-none"/></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div><label className="text-[9px] text-slate-400 font-bold uppercase">Color (Ext)</label><input list="colors" name="colorExt" defaultValue={v.colorExt} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-xs" placeholder="外觀"/><datalist id="colors">{settings.colors.map((c:string) => <option key={c} value={c} />)}</datalist></div>
                                <div><label className="text-[9px] text-slate-400 font-bold uppercase">Color (Int)</label><input list="colors" name="colorInt" defaultValue={v.colorInt} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-xs" placeholder="內飾"/></div>
                            </div>
                            <div className="space-y-1 pt-2 border-t border-dashed border-slate-200"><label className="text-[9px] text-slate-400 font-bold uppercase">Chassis No.</label><input name="chassisNo" defaultValue={v.chassisNo} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-xs font-mono tracking-wider uppercase"/></div>
                            <div className="space-y-1"><label className="text-[9px] text-slate-400 font-bold uppercase">Engine No.</label><input name="engineNo" defaultValue={v.engineNo} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-xs font-mono tracking-wider uppercase"/></div>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div><label className="text-[9px] text-slate-400 font-bold uppercase">Cyl. Cap.</label><input name="engineSize" value={engineSizeStr} onChange={(e) => setEngineSizeStr(formatNumberInput(e.target.value))} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-xs text-right font-mono" placeholder="cc"/></div>
                                <div><label className="text-[9px] text-slate-400 font-bold uppercase">Seating</label><input name="seating" type="number" defaultValue={v.seating || 7} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-xs text-right"/></div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-slate-200">
                                <div><label className="text-[9px] text-slate-400 font-bold uppercase">Fuel Type</label><select name="fuelType" value={fuelType} onChange={(e) => setFuelType(e.target.value as any)} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-xs outline-none"><option value="Petrol">Petrol (汽油)</option><option value="Diesel">Diesel (柴油)</option><option value="Electric">Electric (電動)</option></select></div>
                                <div><label className="text-[9px] text-slate-400 font-bold uppercase">Transmission</label><select name="transmission" value={transmission} onChange={(e) => setTransmission(e.target.value as any)} className="w-full bg-slate-50 border-b border-slate-200 p-1 text-xs outline-none"><option value="Automatic">Automatic (自動)</option><option value="Manual">Manual (棍波)</option></select></div>
                            </div>
                        </div>
                     </div>

                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex justify-between items-center mb-3"><h3 className="font-bold text-slate-700 text-sm flex items-center"><ImageIcon size={14} className="mr-1 text-blue-500"/> 車輛相片</h3><button type="button" onClick={handleGoToMediaLibrary} className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-all font-bold shadow-sm">前往圖庫整理 <ArrowRight size={10} className="inline ml-1"/></button></div>
                        <div className="grid grid-cols-3 gap-2 max-h-[180px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 pr-1">
                            {carPhotos.map((url, idx) => (<div key={idx} className="relative aspect-video rounded-lg border overflow-hidden shadow-sm group bg-gray-100 cursor-zoom-in" onClick={() => setPreviewImage(url)}><img src={url} className="w-full h-full object-cover" title="點擊放大"/></div>))}
                            {carPhotos.length === 0 && (<div className="col-span-3 py-8 text-center text-slate-400 text-[10px] border-2 border-dashed rounded-lg bg-slate-50">暫無照片<br/>請至圖庫新增</div>)}
                        </div>
                        <p className="text-[9px] text-slate-400 mt-2 italic flex items-center"><Info size={10} className="mr-1"/> 已顯示前 {carPhotos.length} 張。如需完整管理請至「智能圖庫」。</p>
                    </div>
                    {previewImage && (<div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}><img src={previewImage} className="max-w-full max-h-full object-contain shadow-2xl" /><button type="button" className="absolute top-4 right-4 text-white/70 hover:text-white p-2"><X size={32}/></button></div>)}
                 </div>
            </div>
            
            {/* 右側欄 (Sales & Finance) */}
            <div className="flex-1 flex flex-col h-full bg-white overflow-hidden order-1 md:order-2">
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin pb-24">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm"><input type="hidden" name="status" value={currentStatus} />{['In Stock', 'Reserved', 'Sold', 'Withdrawn'].map(status => (<button key={status} type="button" onClick={() => setCurrentStatus(status as any)} className={`px-3 py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all border ${currentStatus === status ? 'bg-slate-800 text-white border-slate-800 shadow' : 'bg-white text-slate-500 border-transparent hover:bg-slate-50'}`}>{status === 'In Stock' ? '在庫' : (status === 'Reserved' ? '已訂' : (status === 'Sold' ? '已售' : '撤回'))}</button>))}</div>
                        {/* ★★★ 2. 在這裡插入「負責人選單」 ★★★ */}
                    <div className="bg-white rounded-lg p-1 border border-slate-200 shadow-sm flex items-center px-2 ml-2">
                        <span className="text-[10px] text-slate-400 font-bold mr-2">負責人:</span>
                        <select 
                            name="managedBy" 
                            // ★ 邏輯修正：如果是舊車(有ID)且沒負責人->顯示空白；如果是新車->預設自己
                            defaultValue={v.id ? (v.managedBy || '') : (staffId || '')}
                            className="text-xs font-bold text-slate-700 outline-none bg-transparent cursor-pointer disabled:cursor-not-allowed"
                            // 只有管理員 (BOSS 或 all 權限) 可以修改負責人
                            disabled={!(staffId === 'BOSS' || (currentUser as any)?.modules?.includes('all'))}
                        >
                            {/* ★ 新增：未指派選項 (讓舊車可以顯示為空白) */}
                            <option value="">-- 未指派 --</option>
                            
                            {/* 顯示系統用戶列表 */}
                            {!systemUsers || systemUsers.length === 0 ? (
                                <option value={staffId || ''}>{staffId}</option>
                            ) : (
                                systemUsers.map((u:any) => <option key={u.email} value={u.email}>{u.email}</option>)
                            )}
                        </select>
                    </div>
                        <div className="flex gap-3 text-xs"><div className="flex items-center gap-1"><span className="text-gray-400">入庫:</span><input name="stockInDate" type="date" defaultValue={v.stockInDate || new Date().toISOString().split('T')[0]} className="bg-transparent font-mono font-bold text-slate-700 outline-none"/></div><div className="flex items-center gap-1"><span className="text-gray-400">出庫:</span><input name="stockOutDate" type="date" defaultValue={v.stockOutDate} className="bg-transparent font-mono font-bold text-green-600 outline-none"/></div></div>
                    </div>

                    <div className="mb-6 relative">
                        <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-slate-800 text-sm flex items-center"><UserCircle size={16} className="mr-2 text-blue-600"/> 客戶資料 (Purchaser)</h3>{vrdOwnerRaw && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded border border-yellow-200 flex items-center"><AlertTriangle size={10} className="mr-1"/> VRD 車主: {vrdOwnerRaw} (系統未建檔)</span>}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 relative group-focus-within:ring-2 ring-blue-100 transition-all">
                            <div className="relative"><span className="absolute top-2 left-2 text-[10px] text-gray-400 font-bold">NAME</span><input name="customerName" defaultValue={v.customerName} className="w-full pt-5 pb-1 px-2 bg-white border border-slate-200 rounded text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-gray-200" placeholder="輸入姓名..."/><button type="button" onClick={autoFetchCustomer} className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors z-10" title="依姓名搜尋資料庫"><Search size={14}/></button></div>
                            <div className="relative"><span className="absolute top-2 left-2 text-[10px] text-gray-400 font-bold">PHONE</span><input name="customerPhone" defaultValue={v.customerPhone} className="w-full pt-5 pb-1 px-2 bg-white border border-slate-200 rounded text-sm font-mono focus:ring-2 focus:ring-blue-100 outline-none"/></div>
                            <div className="relative"><span className="absolute top-2 left-2 text-[10px] text-gray-400 font-bold">ID / BR</span><input name="customerID" defaultValue={v.customerID} className="w-full pt-5 pb-1 px-2 bg-white border border-slate-200 rounded text-sm font-mono focus:ring-2 focus:ring-blue-100 outline-none"/></div>
                            <div className="relative"><span className="absolute top-2 left-2 text-[10px] text-gray-400 font-bold">ADDRESS</span><input name="customerAddress" defaultValue={v.customerAddress} className="w-full pt-5 pb-1 px-2 bg-white border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-100 outline-none"/></div>
                        </div>
                    </div>

                    <div className="mb-6"><h3 className="font-bold text-slate-800 text-sm mb-2 flex items-center"><DollarSign size={16} className="mr-2 text-green-600"/> 價格設定 (Pricing)</h3><div className="grid grid-cols-2 md:grid-cols-5 gap-4"><div className="bg-yellow-50 p-2 rounded border border-yellow-200"><label className="block text-[10px] text-yellow-800 font-bold mb-1">售價 (Price)</label><input name="price" value={priceStr} onChange={e => setPriceStr(formatNumberInput(e.target.value))} className="w-full bg-transparent text-lg font-bold text-slate-900 outline-none" placeholder="$0"/></div><div className="bg-gray-50 p-2 rounded border border-gray-200"><label className="block text-[10px] text-gray-500 font-bold mb-1">成本 (Cost)</label><input name="costPrice" value={costStr} onChange={e => setCostStr(formatNumberInput(e.target.value))} className="w-full bg-transparent text-sm font-mono text-slate-600 outline-none" placeholder="$0"/></div><div className="bg-white p-2 rounded border border-slate-200"><label className="block text-[10px] text-blue-400 font-bold mb-1">收購類型</label><select name="purchaseType" defaultValue={v.purchaseType || 'Used'} className="w-full bg-transparent text-sm font-bold text-blue-800 outline-none"><option value="Used">二手 (Used)</option><option value="New">新車 (New)</option><option value="Consignment">寄賣 (Consign)</option></select></div><div className="bg-white p-2 rounded border border-slate-200"><label className="block text-[10px] text-gray-400 font-bold mb-1">A1 Tax</label><input name="priceA1" value={priceA1Str} onChange={e => setPriceA1Str(formatNumberInput(e.target.value))} className="w-full bg-transparent text-sm font-mono outline-none"/></div><div className="bg-white p-2 rounded border border-slate-200"><label className="block text-[10px] text-gray-400 font-bold mb-1">Paid Tax</label><input name="priceTax" value={priceTaxStr} onChange={e => setPriceTaxStr(formatNumberInput(e.target.value))} className="w-full bg-transparent text-sm font-mono outline-none"/></div></div><div className="flex justify-between items-center mt-2 px-1"><div className="text-xs text-gray-400">牌簿價: <span className="font-mono text-slate-600">{calcRegisteredPrice()}</span></div><div className="text-xs font-bold text-blue-600">餘額 (Balance): {formatCurrency(balance)}</div></div></div>

                    <div className="space-y-4">
                        <div className="border border-blue-100 rounded-xl overflow-hidden">
                            <div className="bg-blue-50/50 p-3 flex justify-between items-center cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => setIsCbExpanded(!isCbExpanded)}>
                                <div className="flex items-center gap-2"><Globe size={16} className="text-blue-600"/><span className="font-bold text-sm text-blue-900">中港車管家 (Cross-Border)</span><label className="flex items-center ml-4 text-xs text-slate-500 cursor-pointer" onClick={e => e.stopPropagation()}><input type="checkbox" name="cb_isEnabled" defaultChecked={v.crossBorder?.isEnabled} className="mr-1 accent-blue-600"/> 啟用</label></div>{isCbExpanded ? <ChevronUp size={16} className="text-blue-400"/> : <ChevronDown size={16} className="text-blue-400"/>}
                            </div>
                            
                            {isCbExpanded && (
                                <div className="p-4 bg-white border-t border-blue-100 grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in">
                                    <div className="col-span-1"><label className="text-[9px] text-blue-800 font-bold">內地車牌</label><input name="cb_mainlandPlate" defaultValue={v.crossBorder?.mainlandPlate} className="w-full border-b border-blue-100 text-sm py-1 outline-none"/></div>
                                    <div className="col-span-1"><label className="text-[9px] text-blue-800 font-bold">指標號</label><input name="cb_quotaNumber" defaultValue={v.crossBorder?.quotaNumber} className="w-full border-b border-blue-100 text-sm py-1 outline-none"/></div>
                                    <div className="col-span-1"><label className="text-[9px] text-blue-800 font-bold">香港公司</label><input name="cb_hkCompany" defaultValue={v.crossBorder?.hkCompany} className="w-full border-b border-blue-100 text-sm py-1 outline-none"/></div>
                                    <div className="col-span-1"><label className="text-[9px] text-blue-800 font-bold">內地公司</label><input name="cb_mainlandCompany" defaultValue={v.crossBorder?.mainlandCompany} className="w-full border-b border-blue-100 text-sm py-1 outline-none"/></div>
                                    <div className="col-span-1"><label className="text-[9px] text-blue-800 font-bold">主司機</label><input name="cb_driver1" defaultValue={v.crossBorder?.driver1} className="w-full border-b border-blue-100 text-sm py-1 outline-none"/></div>
                                    <div className="col-span-1"><label className="text-[9px] text-blue-800 font-bold">副司機 1</label><input name="cb_driver2" defaultValue={v.crossBorder?.driver2} className="w-full border-b border-blue-100 text-sm py-1 outline-none"/></div>
                                    <div className="col-span-1"><label className="text-[9px] text-blue-800 font-bold">副司機 2</label><input name="cb_driver3" defaultValue={v.crossBorder?.driver3} className="w-full border-b border-blue-100 text-sm py-1 outline-none"/></div>
                                    <div className="col-span-1"><label className="text-[9px] text-blue-800 font-bold">保險代理</label><input name="cb_insuranceAgent" defaultValue={v.crossBorder?.insuranceAgent} className="w-full border-b border-blue-100 text-sm py-1 outline-none"/></div>
                                    
                                    <div className="col-span-4 mt-2 pt-2 border-t border-dashed border-blue-100">
                                        <label className="text-[9px] text-blue-800 font-bold mb-1 block">口岸選擇 (Ports)</label>
                                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                                            {[...HK_PORTS, ...MO_PORTS].map(port => (<label key={port} className="flex items-center text-[10px] text-slate-600 cursor-pointer hover:text-blue-600"><input type="checkbox" name={`cb_port_${port}`} defaultChecked={v.crossBorder?.ports?.includes(port)} className="mr-1 rounded-sm accent-blue-600"/> {port}</label>))}
                                        </div>
                                    </div>

                                    <div className="col-span-4 grid grid-cols-2 md:grid-cols-5 gap-2 mt-2 pt-2 border-t border-dashed border-blue-100">
                                        {Object.entries(cbDateMap).map(([key, label]) => (<div key={key} className="bg-slate-50 p-1.5 rounded border border-slate-100 hover:border-blue-200 transition-colors"><label className="block text-[9px] text-slate-500 font-bold mb-0.5">{label}</label><input type="date" name={`cb_date${key}`} defaultValue={(v.crossBorder as any)?.[`date${key}`]} className="w-full bg-transparent text-[10px] font-mono outline-none"/></div>))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {/* 收款區 */}
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                <h4 className="font-bold text-xs text-gray-500 mb-2 flex justify-between items-center"><span>收款記錄 (Payments)</span><span className="text-green-600 bg-green-100 px-2 py-0.5 rounded">已收: {formatCurrency(totalReceived)}</span></h4>
                                <div className="space-y-1 mb-2">
                                    {(v.payments || []).map((p: any) => (<div key={p.id} className="grid grid-cols-12 gap-2 text-xs p-1.5 bg-white border rounded shadow-sm items-center"><div className="col-span-2 text-gray-400">{p.date}</div><div className="col-span-3 font-bold">{p.type}</div><div className="col-span-3 text-gray-500 truncate">{p.note || '-'}</div><div className="col-span-3 font-mono text-right">{formatCurrency(p.amount)}</div><div className="col-span-1 text-right">{!p.relatedTaskId && <button type="button" onClick={() => deletePayment(v.id!, p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={12}/></button>}</div></div>))}
                                    {pendingCbTasks.map((task: any) => (<div key={task.id} className="grid grid-cols-12 gap-2 text-xs p-1.5 bg-amber-50 border border-amber-200 rounded shadow-sm text-amber-800 cursor-pointer hover:bg-amber-100 group transition-colors items-center" onClick={() => { setNewPayment({ ...newPayment, amount: formatNumberInput(task.fee.toString()), note: `${task.item}`, relatedTaskId: task.id }); }} title="點擊自動填入下方收款欄"><div className="col-span-2 text-amber-600/70">{task.date}</div><div className="col-span-3 font-bold flex items-center"><Info size={10} className="mr-1"/> {task.item}</div><div className="col-span-3 text-amber-700 truncate">{task.institution}</div><div className="col-span-3 font-mono font-bold text-right">{formatCurrency(task.fee)}</div><div className="col-span-1 text-right"><span className="bg-amber-200 px-1 rounded text-[9px] font-bold">待收</span></div></div>))}
                                </div>
                                <div className="flex gap-1 pt-1 border-t border-gray-200 mt-2">
                                    <input type="date" value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} className="w-24 text-xs p-1.5 border rounded outline-none bg-white"/>
                                    <select value={newPayment.type} onChange={e => setNewPayment({...newPayment, type: e.target.value as any})} className="w-24 text-xs p-1.5 border rounded outline-none bg-white font-bold">{(settings.paymentTypes || ['Deposit']).map((pt: string) => <option key={pt} value={pt}>{pt}</option>)}</select>
                                    <input type="text" placeholder="備註..." value={newPayment.note} onChange={e => setNewPayment({...newPayment, note: e.target.value})} className="flex-1 text-xs p-1.5 border rounded outline-none bg-white"/>
                                    <input type="text" placeholder="$" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: formatNumberInput(e.target.value)})} className="w-20 text-xs p-1.5 border rounded outline-none bg-white text-right font-mono"/>
                                    <button type="button" onClick={() => {const amt=Number(newPayment.amount.replace(/,/g,'')); if(amt>0 && v.id) { addPayment(v.id, {id:Date.now().toString(), ...newPayment, amount:amt} as any); setNewPayment({...newPayment, amount:'', note: '', relatedTaskId: ''}); }}} className="bg-slate-800 text-white text-xs px-3 rounded hover:bg-slate-700">收款</button>
                                </div>
                            </div>

                            {/* 費用區 */}
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                <h4 className="font-bold text-xs text-gray-500 mb-2 flex justify-between items-center">
                                    <span>車輛費用 (Expenses)</span>
                                    <span className="text-slate-600 bg-slate-200 px-2 py-0.5 rounded">總計: {formatCurrency(totalExpenses)}</span>
                                </h4>
                                <div className="space-y-1 mb-2">
                                    {(v.expenses || []).map((exp: any) => (<div key={exp.id} className="grid grid-cols-12 gap-2 text-xs p-1.5 bg-white border rounded shadow-sm items-center"><div className="col-span-2 text-gray-400">{exp.date}</div><div className="col-span-3 font-bold">{exp.type}</div><div className="col-span-3 text-gray-500 truncate">{exp.company}</div><div className="col-span-3 font-mono text-right">{formatCurrency(exp.amount)}</div><div className="col-span-1 text-right"><button type="button" onClick={() => deleteExpense(v.id!, exp.id)} className="text-red-400 hover:text-red-600"><X size={12}/></button></div></div>))}
                                    {(v.crossBorder?.tasks || []).filter((t:any) => t.fee > 0).map((task: any) => (<div key={`cb-${task.id}`} className="grid grid-cols-12 gap-2 text-xs p-1.5 bg-blue-50/50 border border-blue-100 rounded shadow-sm items-center text-blue-800"><div className="col-span-2 text-blue-400">{task.date}</div><div className="col-span-3 font-bold flex items-center"><Globe size={10} className="mr-1"/> {task.item}</div><div className="col-span-3 text-blue-600/70 truncate">中港業務</div><div className="col-span-3 font-mono text-right">{formatCurrency(task.fee)}</div><div className="col-span-1 text-right"></div></div>))}
                                </div>
                                <div className="flex gap-1 pt-1 border-t border-gray-200 mt-2">
                                    <input type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-24 text-xs p-1.5 border rounded outline-none bg-white"/>
                                    <select value={newExpense.type} onChange={handleExpenseTypeChange} className="flex-1 text-xs p-1.5 border rounded outline-none bg-white"><option value="">項目...</option>{settings.expenseTypes.map((t: any, i: number) => { const name = typeof t === 'string' ? t : t.name; return <option key={i} value={name}>{name}</option>; })}</select>
                                    <select value={newExpense.company} onChange={e => setNewExpense({...newExpense, company: e.target.value})} className="flex-1 text-xs p-1.5 border rounded outline-none bg-white"><option value="">公司...</option>{settings.expenseCompanies?.map((c: string)=><option key={c} value={c}>{c}</option>)}</select>
                                    <input type="text" placeholder="$" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: formatNumberInput(e.target.value)})} className="w-20 text-xs p-1.5 border rounded outline-none bg-white text-right font-mono"/>
                                    <button type="button" onClick={() => {const amt=Number(newExpense.amount.replace(/,/g,'')); if(amt>0 && v.id) { addExpense(v.id, {id:Date.now().toString(), ...newExpense, amount:amt} as any); setNewExpense({...newExpense, amount:''}); }}} className="bg-gray-600 text-white text-xs px-3 rounded hover:bg-gray-700">新增</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-white sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex justify-end gap-3 items-start safe-area-bottom">
                        <div className="flex-1 mr-4">
                            <textarea name="remarks" defaultValue={v.remarks} placeholder="Remarks / 備註..." className="w-full text-xs p-2 border rounded h-16 resize-none outline-none focus:ring-1 ring-blue-200"></textarea>
                        </div>
                        {v.id && (
                            <div className="flex mr-auto gap-2">
                                <button type="button" onClick={() => openPrintPreview('sales_contract', v as Vehicle)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded" title="列印合約"><FileText size={18}/></button>
                                <button type="button" onClick={() => openPrintPreview('invoice', v as Vehicle)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded" title="列印發票"><Printer size={18}/></button>
                            </div>
                        )}
                        <button type="button" onClick={handleClose} className="px-5 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">取消</button>
                        <button type="submit" className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-bold text-sm rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center"><Save size={16} className="mr-2"/> 儲存變更</button>
                    </div>
                </div>
            </div>
          </form>
        </div>
      </div>
    );
};

  // 2. Report View (v11.3: 強效容錯版 - 車價與中港費用分拆 + 日期自動補全)
  const ReportView = ({ inventory }: { inventory: Vehicle[] }) => {
    const [reportCategory, setReportCategory] = useState<'All' | 'Vehicle' | 'Service'>('All');
    const [reportSearchTerm, setReportSearchTerm] = useState('');
    
    // 預設日期範圍：本月
    const [reportStartDate, setReportStartDate] = useState(() => {
        const date = new Date();
        return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    });
    const [reportEndDate, setReportEndDate] = useState(() => {
        const date = new Date();
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
    });

    const handleReportItemClick = (vehicleId: string) => {
        const vehicle = inventory.find(v => v.id === vehicleId);
        if (vehicle) setEditingVehicle(vehicle);
    };

    // --- Report Logic (分拆顯示邏輯) ---
    const generateReportData = () => {
        let data: any[] = [];
        
        if (reportType === 'receivable') {
            inventory.forEach(v => {
                // --- 1. 車價欠款 (Vehicle Price) ---
                // 只計算沒有指定 relatedTaskId 的付款，視為車價付款
                const generalPayments = (v.payments || []).filter(p => !p.relatedTaskId).reduce((s, p) => s + (p.amount || 0), 0);
                const carBalance = (v.price || 0) - generalPayments;
                
                // 只有當車價有設定且還有欠款時，才顯示車價這一行
                if ((v.price || 0) > 0 && carBalance > 0) {
                    const date = v.stockOutDate || v.stockInDate || new Date().toISOString().split('T')[0];
                    data.push({
                        vehicleId: v.id,
                        date: date, // 車價跟隨出庫日
                        title: `${v.year} ${v.make} ${v.model}`,
                        regMark: v.regMark,
                        amount: carBalance,
                        type: 'Vehicle',
                        status: v.status,
                        rawTitle: `${v.year} ${v.make} ${v.model} ${v.regMark} 車價`
                    });
                }

                // --- 2. 中港業務欠款 (Cross Border) - 獨立顯示 ---
                const cbTasks = v.crossBorder?.tasks || [];
                cbTasks.forEach(task => {
                    const fee = Number(task.fee) || 0;
                    if (fee <= 0) return; // 沒費用的不顯示

                    // 計算這筆任務專屬的付款
                    const taskPaid = (v.payments || []).filter(p => p.relatedTaskId === task.id).reduce((s, p) => s + (p.amount || 0), 0);
                    const taskBalance = fee - taskPaid;

                    if (taskBalance > 0) {
                        // ★★★ 關鍵修正：優先使用任務日期，保證本月新增的費用會顯示 ★★★
                        // 如果任務沒填日期，才退而求其次用出庫日或今天
                        let safeDate = task.date;
                        if (!safeDate) safeDate = v.stockOutDate || new Date().toISOString().split('T')[0];

                        data.push({
                            vehicleId: v.id,
                            date: safeDate, 
                            title: `[中港] ${task.item}`, // 清楚標示這是中港項目
                            regMark: v.regMark,
                            amount: taskBalance,
                            type: 'Service',
                            status: 'Pending',
                            rawTitle: `${v.year} ${v.make} ${v.model} ${v.regMark} ${task.item}`
                        });
                    }
                });
            });

            // 統一過濾
            data = data.filter(item => {
                const isDateMatch = (!reportStartDate || !reportEndDate) || (item.date >= reportStartDate && item.date <= reportEndDate);
                const isCatMatch = reportCategory === 'All' || item.type === reportCategory;
                const isSearchMatch = !reportSearchTerm || item.rawTitle.toLowerCase().includes(reportSearchTerm.toLowerCase());
                
                return isDateMatch && isCatMatch && isSearchMatch;
            });

            // 排序：日期新的在上面
            data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        } else if (reportType === 'payable') {
            // (應付帳款邏輯保持不變)
            inventory.forEach(v => {
                (v.expenses || []).forEach(exp => {
                    if (exp.status === 'Unpaid') {
                        const rowStr = `${v.regMark} ${exp.type} ${exp.company} ${exp.invoiceNo}`;
                        if (!reportSearchTerm || rowStr.toLowerCase().includes(reportSearchTerm.toLowerCase())) {
                            data.push({
                                vehicleId: v.id, id: exp.id, date: exp.date,
                                title: `${v.regMark} - ${exp.type}`, company: exp.company, invoiceNo: exp.invoiceNo, amount: exp.amount, status: 'Unpaid'
                            });
                        }
                    }
                });
            });
            if (reportStartDate && reportEndDate) data = data.filter(d => d.date >= reportStartDate && d.date <= reportEndDate);
            data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        } else if (reportType === 'sales') {
            // (銷售報表邏輯保持不變)
            data = inventory.filter(v => v.status === 'Sold').map(v => {
                const totalCost = (v.costPrice || 0) + (v.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
                const cbFees = (v.crossBorder?.tasks || []).reduce((sum, t) => sum + (t.fee || 0), 0);
                const totalRevenue = (v.price || 0) + cbFees;
                const safeSaleDate = v.stockOutDate || new Date().toISOString().split('T')[0];
                return {
                    vehicleId: v.id, date: safeSaleDate,
                    title: `${v.year} ${v.make} ${v.model}`, regMark: v.regMark,
                    amount: totalRevenue, cost: totalCost, profit: totalRevenue - totalCost
                };
            });
            if (reportStartDate && reportEndDate) data = data.filter(d => d.date >= reportStartDate && d.date <= reportEndDate);
            if (reportSearchTerm) data = data.filter(d => (d.title+d.regMark).toLowerCase().includes(reportSearchTerm.toLowerCase()));
            data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        return data;
    };

    const reportData = generateReportData();
    const totalReportAmount = reportData.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalReportProfit = reportType === 'sales' ? reportData.reduce((sum, item) => sum + (item.profit || 0), 0) : 0;

    return (
        <div className="p-6 bg-white rounded-lg shadow-sm min-h-screen">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <h2 className="text-xl font-bold flex items-center"><FileBarChart className="mr-2"/> 統計報表中心</h2>
                <div className="flex space-x-2">
                    <button onClick={handlePrint} className="bg-slate-900 text-white px-4 py-2 rounded flex items-center hover:bg-slate-700"><Printer size={16} className="mr-2"/> 輸出 PDF</button>
                    <button onClick={() => setActiveTab('dashboard')} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">返回</button>
                </div>
            </div>

            {/* 控制面板 */}
            <div className="bg-gray-50 p-4 rounded border mb-6 print:hidden space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="col-span-1">
                        <label className="block text-xs font-bold text-gray-500 mb-1">報表類型</label>
                        <select value={reportType} onChange={e => setReportType(e.target.value as any)} className="w-full border p-2 rounded text-sm"><option value="receivable">應收未收報表 (Receivables)</option><option value="payable">應付未付報表 (Payables)</option><option value="sales">銷售數據統計 (Sales Stats)</option></select>
                    </div>
                    {reportType === 'receivable' && (
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1">業務類別</label>
                            <select value={reportCategory} onChange={e => setReportCategory(e.target.value as any)} className="w-full border p-2 rounded text-sm"><option value="All">全部 (All)</option><option value="Vehicle">車輛銷售 (Sales)</option><option value="Service">中港/代辦服務 (Services)</option></select>
                        </div>
                    )}
                    <div className="col-span-1"><label className="block text-xs font-bold text-gray-500 mb-1">開始日期</label><input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className="w-full border p-2 rounded text-sm" /></div>
                    <div className="col-span-1"><label className="block text-xs font-bold text-gray-500 mb-1">結束日期</label><input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="w-full border p-2 rounded text-sm" /></div>
                    {reportType === 'payable' && (<div className="col-span-1"><label className="block text-xs font-bold text-gray-500 mb-1">負責公司</label><select value={reportCompany} onChange={e => setReportCompany(e.target.value)} className="w-full border p-2 rounded text-sm"><option value="">全部公司</option>{settings.expenseCompanies?.map(c => <option key={c} value={c}>{c}</option>)}</select></div>)}
                </div>
                
                {/* 搜尋框 */}
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-3 text-gray-400"/>
                    <input type="text" value={reportSearchTerm} onChange={e => setReportSearchTerm(e.target.value)} placeholder="搜尋車牌、型號、項目名稱..." className="w-full border p-2 pl-10 rounded text-sm shadow-sm focus:ring-2 ring-blue-100 outline-none"/>
                </div>
            </div>

            <div className="print:visible">
                <div className="text-center mb-8 hidden print:block">
                    <h1 className="text-2xl font-bold mb-2">{COMPANY_INFO.name_en}</h1>
                    <h2 className="text-xl font-bold border-b-2 border-black inline-block pb-1 mb-2">{reportType === 'receivable' ? '應收未收報表 (Accounts Receivable)' : reportType === 'payable' ? '應付未付報表 (Accounts Payable)' : '銷售數據統計 (Sales Report)'}</h2>
                    <p className="text-sm text-gray-600">Generated: {new Date().toLocaleDateString()}</p>
                </div>

                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-100 border-b-2 border-black text-left">
                            <th className="p-2 border w-24">日期</th>
                            <th className="p-2 border">項目 (車型 / 服務)</th>
                            <th className="p-2 border w-32">車牌</th>
                            {reportType === 'receivable' && <th className="p-2 border w-20">類別</th>}
                            {reportType === 'payable' && <th className="p-2 border">負責公司</th>}
                            {reportType === 'payable' && <th className="p-2 border">單號</th>}
                            {reportType === 'sales' && <th className="p-2 border text-right">成本 (Cost)</th>}
                            <th className="p-2 border text-right w-32">應收/欠款</th>
                            {reportType === 'sales' && <th className="p-2 border text-right w-24">利潤</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.map((item, idx) => (
                            <tr key={idx} className="border-b hover:bg-yellow-50 cursor-pointer print:cursor-auto print:hover:bg-transparent" onClick={() => handleReportItemClick(item.vehicleId)}>
                                <td className="p-2 border font-mono text-gray-600">{item.date}</td>
                                <td className="p-2 border font-bold">
                                    <span className={item.type === 'Service' ? 'text-indigo-700' : 'text-slate-800'}>{item.title}</span>
                                </td>
                                <td className="p-2 border font-mono">{item.regMark}</td>
                                {reportType === 'receivable' && <td className="p-2 border text-xs"><span className={`px-2 py-0.5 rounded border ${item.type==='Vehicle'?'bg-blue-50 text-blue-700 border-blue-100':'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>{item.type === 'Vehicle' ? '車價' : '代辦'}</span></td>}
                                {reportType === 'payable' && <td className="p-2 border">{item.company}</td>}
                                {reportType === 'payable' && <td className="p-2 border">{item.invoiceNo || '-'}</td>}
                                {reportType === 'sales' && <td className="p-2 border text-right">{formatCurrency(item.cost)}</td>}
                                <td className="p-2 border text-right font-mono font-bold text-slate-800">{formatCurrency(item.amount)}</td>
                                {reportType === 'sales' && <td className={`p-2 border text-right font-mono font-bold ${item.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(item.profit)}</td>}
                            </tr>
                        ))}
                        {reportData.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-gray-400">無符合條件的數據</td></tr>}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-200 font-bold">
                            <td colSpan={reportType === 'payable' ? 5 : (reportType === 'receivable' ? 4 : 3)} className="p-2 border text-right">Total:</td>
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


// ------------------------------------------------------------------
// ★★★ Document Template (v6.0 完整版：修復編譯錯誤 + 完整功能) ★★★
// ------------------------------------------------------------------

// 1. 橢圓形公司印章 (修正版 v3：文字進一步往內縮，遠離邊框)
const CompanyStamp = ({ nameEn, nameCh }: { nameEn: string, nameCh: string }) => (
    <div className="w-[45mm] h-[28mm] flex items-center justify-center relative select-none mix-blend-multiply transform -rotate-6 opacity-90" style={{ color: '#1e3a8a' }}>
        {/* 橢圓外框 */}
        <div className="absolute w-full h-full rounded-[50%] border-[3px] border-[#1e3a8a]"></div>
        <div className="absolute w-[92%] h-[88%] rounded-[50%] border-[1px] border-[#1e3a8a]"></div>
        
        {/* 內圈文字 */}
        <div className="absolute w-full h-full flex flex-col items-center justify-center z-10">
            {/* 第一行：英文名 (改為 top-5，大幅往內縮) */}
            <div className="text-[9px] font-black tracking-widest absolute top-5 uppercase text-center w-[85%] leading-none break-words">
                {nameEn}
            </div>
            
            {/* 第二行：中文名 (保持置中) */}
            <div className="text-[14px] font-black tracking-[0.3em] leading-none">
                {nameCh}
            </div>
            
            {/* 第三行：簽名欄 (改為 bottom-5，大幅往內縮) */}
            <div className="text-[5px] font-bold tracking-widest absolute bottom-5 uppercase leading-none">
                AUTHORIZED SIGNATURE
            </div>
        </div>
    </div>
);

// 2. 簽名 (SVG Path)
const SignatureImg = () => (
    <div className="w-[30mm] h-[15mm] relative">
        <svg viewBox="0 0 150 80" className="w-full h-full text-black opacity-80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10,50 C30,30 60,70 90,40 S130,20 140,50" />
            <path d="M30,60 C50,50 80,50 110,45" strokeWidth="1.5" />
        </svg>
    </div>
);

const DocumentTemplate = () => {
    const activeVehicle = previewDoc?.vehicle || selectedVehicle;
    const activeType = previewDoc?.type || docType;

    if (!activeVehicle) return null;

    const itemsToRender = (activeVehicle as any).selectedItems || [];
    
    // ★★★ 讀取新資料 ★★★
    const depositItems = (activeVehicle as any).depositItems || []; // 收款列表
    const showTerms = (activeVehicle as any).showTerms !== false;   // 預設為 true
    
    const checklist = (activeVehicle as any).checklist || { vrd: false, keys: false, tools: false, manual: false, other: '' };
    const displayId = (activeVehicle.id || 'DRAFT').slice(0, 6).toUpperCase();
    const today = new Date().toLocaleDateString('en-GB'); 
    
    const companyEn = COMPANY_INFO.name_en;
    const companyCh = COMPANY_INFO.name_ch;
    const companyAddr = COMPANY_INFO.address_ch;
    const companyTel = COMPANY_INFO.phone;
    const companyEmail = COMPANY_INFO.email;

    const curCustomer = {
        name: activeVehicle.customerName || '',
        phone: activeVehicle.customerPhone || '',
        hkid: activeVehicle.customerID || '',
        address: activeVehicle.customerAddress || ''
    };

    const price = Number(activeVehicle.price) || 0;
    
    // ★★★ 新的計算邏輯 ★★★
    // 總雜費
    const extrasTotal = itemsToRender.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    // 總已收 (所有訂金欄位加總)
    const totalPaid = depositItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    // 餘額 = 車價 + 雜費 - 總已收
    const balance = price + extrasTotal - totalPaid;

    const soldDate = (activeVehicle as any).soldDate || today; 
    const handoverTime = (activeVehicle as any).handoverTime || '';

    let docTitleEn = "VEHICLE SALES AGREEMENT"; 
    let docTitleCh = "汽車買賣合約";
    let isPurchase = false;
    let isConsignment = false;

    if (activeType === 'purchase_contract') {
        docTitleEn = "VEHICLE PURCHASE AGREEMENT"; docTitleCh = "汽車收購合約"; isPurchase = true;
    } else if (activeType === 'consignment_contract') {
        docTitleEn = "VEHICLE CONSIGNMENT AGREEMENT"; docTitleCh = "汽車寄賣合約"; isConsignment = true;
    } else if (activeType === 'invoice') {
        docTitleEn = "INVOICE"; docTitleCh = "發票";
    } else if (activeType === 'receipt') {
        docTitleEn = "OFFICIAL RECEIPT"; docTitleCh = "正式收據";
    }

    const PrintStyle = () => (
        <style>{`
            @media print {
                @page { margin: 0; size: A4; }
                body { margin: 0; padding: 0; background: white; }
                body * { visibility: hidden; }
                #print-root, #print-root * { visibility: visible; }
                #print-root { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 10mm; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
        `}</style>
    );

    const HeaderSection = () => (
        <div className="flex justify-between items-start mb-4 border-b-2 border-slate-800 pb-2">
            <div className="flex items-center gap-3">
                <img src={COMPANY_INFO.logo_url} alt="Logo" className="w-16 h-16 object-contain" onError={(e) => { e.currentTarget.style.display='none'; }} />
                <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-wide uppercase leading-none">{companyEn}</h1>
                    <h2 className="text-lg font-bold text-slate-700 tracking-widest leading-tight mt-1">{companyCh}</h2>
                    <div className="text-[9px] text-slate-500 mt-1 leading-tight font-serif">
                        <p>{companyAddr}</p>
                        <p>Tel: {companyTel} | Email: {companyEmail}</p>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div className="text-lg font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 inline-block mb-1">{docTitleEn}</div>
                <div className="text-xs font-bold text-slate-600 tracking-[0.5em] text-center">{docTitleCh}</div>
                <div className="mt-1 text-[10px] font-mono">NO: {activeType.slice(0,3).toUpperCase()}-{today.replace(/\//g,'')}-{displayId}</div>
                <div className="text-[10px] font-mono">DATE: {today}</div>
            </div>
        </div>
    );

    const AttachmentsSection = () => (
        <div className="mb-3 border border-slate-300 p-2 text-[10px] bg-slate-50 break-inside-avoid">
            <div className="font-bold mb-1 uppercase border-b border-slate-300 pb-1">Attachments (隨車附件):</div>
            <div className="flex flex-wrap gap-4">
                <div className="flex items-center"><div className={`w-3 h-3 border border-black mr-1 flex items-center justify-center`}>{checklist.vrd && <Check size={10}/>}</div> VRD (牌薄)</div>
                <div className="flex items-center"><div className={`w-3 h-3 border border-black mr-1 flex items-center justify-center`}>{checklist.keys && <Check size={10}/>}</div> Spare Key (後備匙)</div>
                <div className="flex items-center"><div className={`w-3 h-3 border border-black mr-1 flex items-center justify-center`}>{checklist.tools && <Check size={10}/>}</div> Tools (工具)</div>
                <div className="flex items-center"><div className={`w-3 h-3 border border-black mr-1 flex items-center justify-center`}>{checklist.manual && <Check size={10}/>}</div> Manual (說明書)</div>
                {checklist.other && <div className="flex items-center font-bold border-b border-black px-2">Other: {checklist.other}</div>}
            </div>
        </div>
    );

    const SignatureSection = ({ labelLeft, labelRight }: any) => (
        <div className="mt-6 grid grid-cols-2 gap-12 break-inside-avoid">
            <div className="relative pt-8 border-t border-slate-800 text-center">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-90"><CompanyStamp nameEn={companyEn} nameCh={companyCh} /></div>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2"><SignatureImg /></div>
                <p className="font-bold text-[10px] uppercase">{labelLeft}</p>
            </div>
            <div className="pt-8 border-t border-slate-800 text-center">
                <p className="font-bold text-[10px] uppercase">{labelRight}</p>
                <p className="text-[9px] text-gray-500">ID: {curCustomer.hkid}</p>
            </div>
        </div>
    );

    // 1. 合約類 (Contract)
    if (activeType.includes('contract')) {
        return (
            <div id="print-root" className="max-w-[210mm] mx-auto bg-white p-8 min-h-[297mm] text-slate-900 font-sans relative shadow-lg print:shadow-none print:w-full print:p-0">
                <PrintStyle />
                <HeaderSection />
                
                <div className="mb-3">
                    <div className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 uppercase mb-1">Part A: {(isPurchase||isConsignment) ? 'Vendor (賣方)' : 'Purchaser (買方)'} Details</div>
                    <div className="border border-slate-300 p-2 grid grid-cols-2 gap-2 text-[10px]">
                        <div><span className="text-slate-500 block">Name:</span><span className="font-bold text-xs">{curCustomer.name}</span></div>
                        <div><span className="text-slate-500 block">Tel:</span><span className="font-bold font-mono">{curCustomer.phone}</span></div>
                        <div><span className="text-slate-500 block">ID No:</span><span className="font-bold font-mono">{curCustomer.hkid}</span></div>
                        <div><span className="text-slate-500 block">Address:</span><span className="font-bold">{curCustomer.address}</span></div>
                    </div>
                </div>

                <div className="mb-3">
                    <div className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 uppercase mb-1">Part B: Vehicle Details</div>
                    <table className="w-full text-[10px] border-collapse border border-slate-300">
                        <tbody>
                            <tr>
                                <td className="border p-1.5 bg-slate-50 font-bold w-[15%]">Reg. No.</td>
                                <td className="border p-1.5 font-mono font-bold w-[35%]">{activeVehicle.regMark}</td>
                                <td className="border p-1.5 bg-slate-50 font-bold w-[15%]">Make/Model</td>
                                <td className="border p-1.5 w-[35%]">{activeVehicle.make} {activeVehicle.model}</td>
                            </tr>
                            <tr>
                                <td className="border p-1.5 bg-slate-50 font-bold">Chassis No.</td>
                                <td className="border p-1.5 font-mono">{activeVehicle.chassisNo}</td>
                                <td className="border p-1.5 bg-slate-50 font-bold">Engine No.</td>
                                <td className="border p-1.5 font-mono">{activeVehicle.engineNo}</td>
                            </tr>
                            <tr>
                                <td className="border p-1.5 bg-slate-50 font-bold">Year</td>
                                <td className="border p-1.5">{activeVehicle.year}</td>
                                
                                {/* ★★★ 修改：顏色欄位顯示 外觀 / 內飾 ★★★ */}
                                <td className="border p-1.5 bg-slate-50 font-bold">Color (Ext/Int)</td>
                                <td className="border p-1.5">
                                    {/* 使用 (activeVehicle as any) 來略過類型檢查，並同時支援 color 和 colorExt */}
                                    {(activeVehicle as any).color || (activeVehicle as any).colorExt || '-'} / {(activeVehicle as any).colorInterior || (activeVehicle as any).colorInt || '-'}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="mb-3">
                    <div className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 uppercase mb-1">Part C: Payment Details</div>
                    <table className="w-full text-[10px] border-collapse border border-slate-300">
                        <tbody>
                            {/* 車價 */}
                            <tr><td className="border p-1.5 font-bold w-1/2">Vehicle Price (車價)</td><td className="border p-1.5 text-right font-mono font-bold">{formatCurrency(price)}</td></tr>
                            
                            {/* 雜費 Add-ons */}
                            {itemsToRender.length > 0 && itemsToRender.map((item: any, idx: number) => (
                                <tr key={`add-${idx}`}>
                                    <td className="border p-1.5 text-slate-600 pl-4">+ {item.desc}</td>
                                    <td className="border p-1.5 text-right font-mono">{formatCurrency(item.amount)}</td>
                                </tr>
                            ))}

                            {/* ★★★ 動態顯示多筆訂金 (減項) ★★★ */}
                            {depositItems.length > 0 && depositItems.map((item: any, idx: number) => (
                                <tr key={`dep-${idx}`}>
                                    <td className="border p-1.5 font-bold text-slate-600">Less: {item.label}</td>
                                    <td className="border p-1.5 text-right font-mono text-blue-600">{formatCurrency(item.amount)}</td>
                                </tr>
                            ))}

                            {/* 總餘額 */}
                            <tr className="bg-slate-50"><td className="border p-1.5 font-black uppercase">Balance (餘額)</td><td className="border p-1.5 text-right font-mono font-black text-sm text-red-600">{formatCurrency(balance)}</td></tr>
                        </tbody>
                    </table>
                </div>

                <AttachmentsSection />
                
                {/* ★★★ 法律條款 (根據 showTerms 顯示/隱藏) ★★★ */}
                {showTerms && (
                    <div className="mb-3 p-2 border-2 border-slate-800 bg-gray-50 text-[9px] leading-relaxed text-justify font-serif break-inside-avoid">
                        <p className="mb-1">
                            I, <span className="font-bold underline uppercase">{curCustomer.name || '___________'}</span>, {(isPurchase||isConsignment) ? 'the registered owner,' : ''} agree to {(isPurchase||isConsignment)?(isConsignment?'consign':'sell'):'purchase'} the vehicle to/from <span className="font-bold uppercase">{companyEn}</span> at HKD <span className="font-bold underline">{formatCurrency(price + extrasTotal)}</span> (Total) on <span className="font-bold underline mx-1">{soldDate}</span> at <span className="font-bold underline mx-1">{handoverTime}</span>. Responsibilities for traffic contraventions/liabilities transfer at this time.
                        </p>
                        <p>
                            本人 <span className="font-bold underline uppercase">{curCustomer.name || '___________'}</span> 同意{(isPurchase||isConsignment)?(isConsignment?'寄賣':'出售'):'購買'}該車輛，日期 <span className="font-bold underline mx-1">{soldDate}</span> 時間 <span className="font-bold underline mx-1">{handoverTime}</span>。成交總價港幣 <span className="font-bold underline">{formatCurrency(price + extrasTotal)}</span>。此時間點前後之交通違例及法律責任由相應方負責。
                        </p>
                    </div>
                )}

                {activeVehicle.remarks && (
                    <div className="mb-3 border border-dashed border-slate-300 p-2 bg-slate-50 rounded break-inside-avoid">
                        <p className="text-[9px] font-bold text-slate-500 mb-1">Remarks / Bank Info:</p>
                        <p className="text-[10px] whitespace-pre-wrap font-mono leading-tight">{activeVehicle.remarks}</p>
                    </div>
                )}
                
                <SignatureSection labelLeft={`For and on behalf of ${companyEn}`} labelRight={(isPurchase||isConsignment) ? "Vendor Signature (賣方/車主)" : "Purchaser Signature (買方)"} />
            </div>
        );
    }

    // 2. 發票 / 收據 (Invoice / Receipt)
    return (
        <div id="print-root" className="max-w-[210mm] mx-auto bg-white p-10 min-h-[297mm] text-slate-900 font-sans relative shadow-lg print:shadow-none print:w-full print:p-0">
            <PrintStyle />
            <HeaderSection />
            <div className="flex justify-between mb-6 border p-3 rounded bg-slate-50">
                <div className="text-[10px]">
                    <p className="text-slate-500 font-bold uppercase mb-1">Bill To:</p>
                    <p className="text-xs font-bold">{curCustomer.name}</p>
                    <p>{curCustomer.address}</p>
                    <p className="mt-1 font-mono">{curCustomer.phone}</p>
                </div>
                <div className="text-[10px] text-right">
                    <p>Reg No: <span className="font-bold text-xs">{activeVehicle.regMark}</span></p>
                    <p>{activeVehicle.make} {activeVehicle.model}</p>
                </div>
            </div>

            <table className="w-full text-[10px] border-collapse mb-6">
                <thead>
                    <tr className="bg-slate-800 text-white"><th className="p-2 text-left">Description</th><th className="p-2 text-right">Amount</th></tr>
                </thead>
                <tbody>
                    {/* 發票模式下，顯示項目列表 */}
                    {itemsToRender.length > 0 ? itemsToRender.map((item: any, i: number) => (
                        <tr key={i} className="border-b">
                            <td className="p-2 font-medium">{item.desc}</td>
                            <td className="p-2 text-right font-mono">{formatCurrency(item.amount)}</td>
                        </tr>
                    )) : (
                        <tr className="border-b">
                            <td className="p-2 font-medium">{activeType==='invoice'?'Vehicle Sales':'Deposit / Payment'} - {activeVehicle.regMark}</td>
                            <td className="p-2 text-right font-mono">{formatCurrency(activeType==='invoice'?price:totalPaid)}</td>
                        </tr>
                    )}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-50 font-bold text-xs border-t-2 border-slate-800">
                        <td className="p-2 text-right">Total</td>
                        <td className="p-2 text-right font-mono text-sm">
                            {/* 發票顯示項目總和，收據顯示已付總額 */}
                            {formatCurrency(itemsToRender.length > 0 
                                ? itemsToRender.reduce((s:number,i:any)=>s+i.amount,0) 
                                : (activeType==='invoice'?price:totalPaid))}
                        </td>
                    </tr>
                </tfoot>
            </table>

            {activeVehicle.remarks && (
                <div className="mb-6 border-t border-slate-200 pt-2">
                    <p className="text-[9px] font-bold text-slate-500 mb-1">Remarks:</p>
                    <p className="text-[10px] whitespace-pre-wrap font-mono leading-tight">{activeVehicle.remarks}</p>
                </div>
            )}

            <div className="mt-auto break-inside-avoid">
                <div className="text-[9px] text-slate-500 mb-6">
                    <p className="font-bold">Terms:</p>
                    <p>1. Cheques should be crossed and made payable to "{companyEn}".</p>
                    <p>2. Official receipt will only be issued upon clearance of cheque.</p>
                </div>
                <SignatureSection labelLeft={`For and on behalf of ${companyEn}`} labelRight="Received By" />
            </div>
        </div>
    );
};



// ------------------------------------------------------------------
// ★★★ 7. Create Document Module (v6.0: 支援多項目收費 + 公司資料修正) ★★★
// ------------------------------------------------------------------
const CreateDocModule = ({ 
    inventory, openPrintPreview, db, staffId, appId 
}: { 
    inventory: Vehicle[], openPrintPreview: (type: DocType, data: any) => void, db: any, staffId: string, appId: string 
}) => {
    // 視圖模式
    const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
    const [docHistory, setDocHistory] = useState<any[]>([]);
    
    // 編輯器狀態
    const [docId, setDocId] = useState<string | null>(null);
    const [selectedDocType, setSelectedDocType] = useState<'sales_contract' | 'purchase_contract' | 'consignment_contract' | 'invoice' | 'receipt'>('sales_contract');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
    
    // 表單數據
    const [formData, setFormData] = useState({
        companyNameEn: "GOLD LAND AUTO", companyNameCh: "金田汽車",
        companyAddress: COMPANY_INFO.address_ch, 
        companyPhone: COMPANY_INFO.phone, // ★★★ 自動讀取系統設定 ★★★
        companyEmail: COMPANY_INFO.email, // ★★★ 自動讀取系統設定 ★★★
        
        customerName: '', customerId: '', customerAddress: '', customerPhone: '',
        regMark: '', make: '', model: '', chassisNo: '', engineNo: '', year: '', color: '', colorInterior: '', seat: '',
        price: '', deposit: '', balance: '', deliveryDate: new Date().toISOString().split('T')[0], 
        handoverTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), remarks: ''
    });

    const [checklist, setChecklist] = useState({ vrd: false, keys: false, tools: false, manual: false, other: '' });

    const [savedDocs, setSavedDocs] = useState<any[]>([]);

    // ★★★ 新增：收費項目清單 (Invoice Items) ★★★
    const [docItems, setDocItems] = useState<{ id: string, desc: string, amount: number, isSelected: boolean }[]>([]);
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemAmount, setNewItemAmount] = useState('');
    // ★★★ 新增：收款項目列表 (可改名、多筆訂金) ★★★
    const [depositItems, setDepositItems] = useState<{ id: string, label: string, amount: number }[]>([
        { id: 'dep_1', label: 'Deposit (訂金)', amount: 0 }
    ]);

    // ★★★ 新增：控制條款顯示 ★★★
    const [showTerms, setShowTerms] = useState(true);

    // 放在 CreateDocModule 組件外部或內部皆可
    const DEFAULT_REMARKS = `匯豐銀行香港賬戶：747-057347-838
    賬戶名稱：GOLD LAND POWER LIMITED T/A GOLD LAND AUTO
    「轉數快」識別碼 6134530`;

    // --- 1. 歷史紀錄 ---

    useEffect(() => {
        if (!db || !appId) return;
        // 指向正確的資料庫路徑
        const q = query(
            collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'sales_documents'), 
            orderBy('updatedAt', 'desc')
        );
        
        // 監聽資料庫變化
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSavedDocs(list);
        });
        
        return () => unsubscribe();
    }, [db, appId]);

    useEffect(() => {
        if (!db || !staffId) return;
        const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
        const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'sales_documents'), orderBy('updatedAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const list: any[] = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() }));
            setDocHistory(list);
        });
        return () => unsub();
    }, [db, staffId]);

    // 在 CreateDocModule 內部加入此 useEffect
    useEffect(() => {
        if (selectedDocType === 'sales_contract') {
            // 如果備註是空的，才自動填入預設值 (避免覆蓋用戶已輸入的)
            setFormData(prev => {
                if (!prev.remarks) return { ...prev, remarks: DEFAULT_REMARKS };
                return prev;
            });
        }
    }, [selectedDocType]);

    // --- 2. 操作邏輯 ---
    const startNewDoc = () => {
        setDocId(null);
        handleSelectBlank();
        setViewMode('edit');
    };

    const editDoc = (doc: any) => {
        setDocId(doc.id);
        setSelectedDocType(doc.type);
        setFormData(doc.formData);
        setChecklist(doc.checklist || { vrd: false, keys: false, tools: false, manual: false, other: '' });
        setDocItems(doc.docItems || []);
        
        // ★★★ 修正：從資料庫讀回收款列表，如果沒有則使用預設值 ★★★
        setDepositItems(doc.depositItems || [{ id: 'dep_1', label: 'Deposit (訂金)', amount: 0 }]);
        // ★★★ 修正：讀回條款顯示狀態 ★★★
        setShowTerms(doc.showTerms !== false); // 預設為 true
        
        setViewMode('edit');
    };

    const deleteDocRecord = async (id: string) => {
        if (!confirm("確定刪除此單據記錄？")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'sales_documents', id));
        } catch (e) {
            console.error("刪除失敗", e);
            alert("刪除失敗");
        }
    };


    const saveDocRecord = async () => {
        if (!db || !staffId) return;
        const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
        
        // ★★★ 修改：摘要格式加入年份 ★★★
        // 格式：聯絡人 - 車牌 - 年份 廠牌 型號
        const summaryStr = `${formData.customerName || '無聯絡人'} - ${formData.regMark || '無車牌'} - ${formData.year || ''} ${formData.make} ${formData.model}`;

        const docData = {
            type: selectedDocType,
            formData,
            checklist,
            docItems,
            depositItems, 
            showTerms,    
            updatedAt: serverTimestamp(),
            summary: summaryStr 
        };

        try {
            if (docId) { 
                await updateDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'sales_documents', docId), docData); 
            } else { 
                const ref = await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'sales_documents'), { ...docData, createdAt: serverTimestamp() }); 
                setDocId(ref.id); 
            }
            alert("單據已儲存");
            // 重新讀取列表 (如果您有獨立的 fetch 函數，這裡可以呼叫)
        } catch (e) { console.error(e); alert("儲存失敗"); }
    };

    // --- 3. 項目管理邏輯 ---
    const addItem = () => {
        if (!newItemDesc || !newItemAmount) return;
        setDocItems([...docItems, { id: Date.now().toString(), desc: newItemDesc, amount: Number(newItemAmount), isSelected: true }]);
        setNewItemDesc(''); setNewItemAmount('');
    };
    
    const toggleItem = (id: string) => {
        setDocItems(prev => prev.map(item => item.id === id ? { ...item, isSelected: !item.isSelected } : item));
    };

    const deleteItem = (id: string) => {
        setDocItems(prev => prev.filter(item => item.id !== id));
    };

    // 計算總金額 (只計算勾選的)
    const selectedTotal = docItems.filter(i => i.isSelected).reduce((sum, i) => sum + i.amount, 0);

    // --- 4. 輔助函數 ---
    const filteredInventory = inventory.filter(v => (v.regMark || '').includes(searchTerm.toUpperCase()) || (v.make || '').toUpperCase().includes(searchTerm.toUpperCase()));

    const handleSelectCar = (car: Vehicle) => {
        setSelectedCarId(car.id);
        
        // 1. 重置表單基本資料
        setFormData(prev => ({
            ...prev,
            regMark: car.regMark || '', make: car.make || '', model: car.model || '',
            chassisNo: car.chassisNo || '', engineNo: car.engineNo || '', year: car.year || '',
            // ★★★ 修改：導入外觀與內飾顏色 ★★★
            // 車輛庫是 colorInt，合約表單是 colorInterior，這裡做了轉換
            color: (car as any).colorExt || (car as any).color || '',
            colorInterior: (car as any).colorInt || (car as any).colorInterior || (car as any).innerColor || '',
            seat: car.seating ? car.seating.toString() : '',
            price: car.price ? car.price.toString() : '',
            customerName: car.customerName || '', customerPhone: car.customerPhone || '',
            customerId: car.customerID || '', customerAddress: car.customerAddress || '',
            
            // 重置為當前時間
            deliveryDate: new Date().toISOString().split('T')[0],
            handoverTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        }));

        // 2. 自動帶入車輛訂金到「收款列表」
        setDepositItems([
            { id: 'dep_1', label: 'Deposit (訂金)', amount: Number(car.deposit) || 0 }
        ]);
        
        // 3. 重置條款顯示
        setShowTerms(true);

        // 4. 自動帶入額外收費 (★ 修改：不再加入車價，只加入中港代辦費 ★)
        const items: any[] = [];
        // 移除舊的 car_price 推送邏輯
        
        // 只加入中港代辦費
        if (car.crossBorder?.tasks) {
            car.crossBorder.tasks.forEach((t: any, i: number) => {
                if (t.fee > 0) items.push({ id: `cb_${i}`, desc: `Service: ${t.item}`, amount: t.fee, isSelected: false });
            });
        }
        setDocItems(items);
    };

    const handleSelectBlank = () => {
        setSelectedCarId('BLANK');
        setFormData(prev => ({ 
            ...prev, 
            regMark: '', make: '', model: '', chassisNo: '', engineNo: '', year: '', color: '', price: '', deposit: '', balance: '', customerName: '', customerId: '', customerAddress: '', customerPhone: '', 
            deliveryDate: new Date().toISOString().split('T')[0],
            handoverTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), 
        }));
        setChecklist({ vrd: false, keys: false, tools: false, manual: false, other: '' });
        setDocItems([]);
        
        // 重置收款與條款
        setDepositItems([{ id: 'dep_1', label: 'Deposit (訂金)', amount: 0 }]);
        setShowTerms(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePrint = () => {
        saveDocRecord();
        const dummyVehicle: any = {
            ...formData,
            price: Number(formData.price), 
            // deposit 欄位保留給舊邏輯兼容，但主要計算會用下面的 depositItems
            deposit: depositItems.reduce((sum, item) => sum + item.amount, 0),
            
            customerID: formData.customerId, 
            soldDate: formData.deliveryDate,
            handoverTime: formData.handoverTime,
            
            checklist: checklist,
            selectedItems: docItems.filter(i => i.isSelected),
            
            // ★★★ 傳遞新資料 ★★★
            depositItems: depositItems, // 收款列表
            showTerms: showTerms,       // 是否顯示條款
            
            companyNameEn: formData.companyNameEn, 
            companyNameCh: formData.companyNameCh,
            companyEmail: formData.companyEmail, 
            companyPhone: formData.companyPhone
        };
        openPrintPreview(selectedDocType as any, dummyVehicle);
    };

    // --- 5. 即時預覽 (LivePreview v7.0: 高象真 A4 縮放版) ---
    const LivePreview = () => {
        // 1. 準備預覽資料 (將表單資料轉換為文件格式)
        const isTradeIn = selectedDocType === 'purchase_contract' || selectedDocType === 'consignment_contract';
        const isBill = selectedDocType === 'invoice' || selectedDocType === 'receipt';
        
        // 計算金額
        const price = Number(formData.price) || 0;
        const deposit = depositItems.reduce((sum, item) => sum + (item.amount || 0), 0);
        const extrasTotal = docItems.filter(i => i.isSelected).reduce((sum, i) => sum + i.amount, 0);
        
        // 根據類型決定總額顯示
        const balance = price + extrasTotal - deposit;
        const totalAmount = isBill ? (selectedDocType==='invoice' ? price+extrasTotal : deposit) : (price + extrasTotal);

        // 標題對照
        const titleMap: any = {
            'sales_contract': { en: 'VEHICLE SALES AGREEMENT', ch: '汽車買賣合約' },
            'purchase_contract': { en: 'VEHICLE PURCHASE AGREEMENT', ch: '汽車收購合約' },
            'consignment_contract': { en: 'VEHICLE CONSIGNMENT AGREEMENT', ch: '汽車寄賣合約' },
            'invoice': { en: 'INVOICE', ch: '發票' },
            'receipt': { en: 'OFFICIAL RECEIPT', ch: '正式收據' }
        };
        const t = titleMap[selectedDocType] || titleMap['sales_contract'];

        // 今天的日期 (如果表單沒填日期，就用今天)
        const displayDate = formData.deliveryDate || new Date().toLocaleDateString('en-GB');

        // A4 尺寸 (210mm x 297mm)
        // 使用 transform: scale() 來適應容器，不影響排版
        return (
            <div className="w-full h-full bg-gray-300 overflow-hidden flex justify-center pt-4 relative">
                {/* 縮放容器：將 A4 縮小以適應側邊欄 */}
                <div 
                    className="bg-white shadow-2xl origin-top"
                    style={{ 
                        width: '210mm', 
                        height: '297mm', 
                        transform: 'scale(0.8)', // ★ 調整這個數值可改變縮放大小
                        marginBottom: '-40%' // 修正縮放後的底部留白
                    }}
                >
                    {/* --- 這裡開始是與列印版完全一致的排版 --- */}
                    <div className="p-10 font-sans text-slate-900 h-full flex flex-col relative">
                        
                        {/* Header */}
                        <div className="flex justify-between items-start mb-6 border-b-2 border-slate-800 pb-4">
                            <div className="flex items-center gap-4">
                                <img src={COMPANY_INFO.logo_url} alt="Logo" className="w-20 h-20 object-contain" onError={(e) => e.currentTarget.style.display='none'} />
                                <div>
                                    <h1 className="text-xl font-black text-slate-900 tracking-wide uppercase">{formData.companyNameEn}</h1>
                                    <h2 className="text-lg font-bold text-slate-700 tracking-widest">{formData.companyNameCh}</h2>
                                    <div className="text-[10px] text-slate-500 mt-1 leading-tight font-serif">
                                        <p>{formData.companyAddress}</p>
                                        <p>Tel: {formData.companyPhone} | Email: {formData.companyEmail}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 inline-block mb-1">{t.en}</div>
                                <div className="text-xs font-bold text-slate-600 tracking-[0.5em] text-center">{t.ch}</div>
                                <div className="mt-2 text-[10px] font-mono">NO: PREVIEW-DRAFT</div>
                                <div className="text-[10px] font-mono">DATE: {displayDate}</div>
                            </div>
                        </div>

                        {/* Customer Info */}
                        <div className="mb-4 border p-3 rounded bg-slate-50 flex justify-between">
                            <div className="text-[10px]">
                                <p className="text-slate-500 font-bold uppercase mb-1">Customer / Bill To:</p>
                                <p className="text-sm font-bold">{formData.customerName || '(Client Name)'}</p>
                                <p>{formData.customerAddress}</p>
                                <p className="mt-1 font-mono">{formData.customerPhone}</p>
                            </div>
                            <div className="text-[10px] text-right">
                                <p>Reg No: <span className="font-bold text-sm">{formData.regMark || 'Untitled'}</span></p>
                                <p>{formData.make} {formData.model}</p>
                            </div>
                        </div>

                        {/* Content Table */}
                        <div className="flex-1">
                            <table className="w-full text-[10px] border-collapse mb-6">
                                <thead>
                                    <tr className="bg-slate-800 text-white"><th className="p-2 text-left">Description</th><th className="p-2 text-right">Amount</th></tr>
                                </thead>
                                <tbody>
                                    {/* 1. 車價 */}
                                    {(!isBill || selectedDocType === 'invoice') && (
                                        <tr className="border-b">
                                            <td className="p-2 font-medium">Vehicle Price ({formData.make} {formData.model})</td>
                                            <td className="p-2 text-right font-mono">{formatCurrency(price)}</td>
                                        </tr>
                                    )}

                                    {/* 2. 額外項目 */}
                                    {docItems.filter(i=>i.isSelected).map((item, i) => (
                                        <tr key={i} className="border-b">
                                            <td className="p-2 font-medium text-slate-600 pl-4">+ {item.desc}</td>
                                            <td className="p-2 text-right font-mono">{formatCurrency(item.amount)}</td>
                                        </tr>
                                    ))}

                                    {/* 3. 訂金 (只在合約顯示為減項) */}
                                    {!isBill && depositItems.map((item, idx) => (
                                        <tr key={`dep-${idx}`} className="border-b">
                                            <td className="p-2 font-bold text-slate-600">Less: {item.label}</td>
                                            <td className="p-2 text-right font-mono text-blue-600">{formatCurrency(item.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50 font-bold text-xs border-t-2 border-slate-800">
                                        <td className="p-2 text-right">{isBill ? 'Total' : 'Balance'}</td>
                                        <td className="p-2 text-right font-mono text-sm text-red-600">
                                            {formatCurrency(isBill ? totalAmount : balance)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>

                            {/* 條款預覽 (僅合約) */}
                            {!isBill && showTerms && (
                                <div className="mb-4 p-2 border border-slate-300 bg-gray-50 text-[8px] leading-relaxed text-justify font-serif">
                                    <p>
                                        I, <b>{formData.customerName || '___________'}</b>, agree to {isTradeIn?'consign/sell':'purchase'} the vehicle at HKD <b>{formatCurrency(balance + deposit)}</b> on <b>{displayDate}</b>. Responsibilities transfer at this time.
                                    </p>
                                </div>
                            )}

                            {/* 備註 */}
                            {formData.remarks && (
                                <div className="mb-4 border border-dashed border-slate-300 p-2 bg-slate-50 rounded">
                                    <p className="text-[9px] font-bold text-slate-500 mb-1">Remarks:</p>
                                    <p className="text-[9px] whitespace-pre-wrap font-mono leading-tight">{formData.remarks}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer / Signature */}
                        <div className="mt-auto">
                            <div className="grid grid-cols-2 gap-12 mt-8">
                                <div className="pt-8 border-t border-slate-800 text-center relative">
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 scale-75 opacity-50"><CompanyStamp nameEn={formData.companyNameEn} nameCh={formData.companyNameCh}/></div>
                                    <p className="font-bold text-[8px] uppercase">For {formData.companyNameEn}</p>
                                </div>
                                <div className="pt-8 border-t border-slate-800 text-center">
                                    <p className="font-bold text-[8px] uppercase">Customer Signature</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        );
    };

    // --- 6. Render ---
    if (viewMode === 'list') {
        return (
            <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center"><FileText className="mr-2"/> 單據紀錄 (Document History)</h2>
                    <button onClick={startNewDoc} className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700 flex items-center"><Plus size={16} className="mr-1"/> 開新單據</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    {docHistory.length === 0 ? <div className="text-center text-slate-400 py-10">暫無紀錄</div> : (
                        <table className="w-full text-sm text-left border-collapse"><thead className="bg-slate-100 text-slate-600 border-b"><tr><th className="p-3">日期</th><th className="p-3">類型</th><th className="p-3">摘要</th><th className="p-3 text-right">操作</th></tr></thead>
                            {/* ★★★ 修改列表渲染：顯示中文類型 + 新摘要格式 ★★★ */}
                        <tbody className="divide-y divide-slate-100">
                            {savedDocs.map((doc: any) => {
                                // 1. 定義中文類型對照表
                                const typeMap: Record<string, string> = {
                                    'sales_contract': '買賣合約',
                                    'purchase_contract': '收車合約',
                                    'consignment_contract': '寄賣合約',
                                    'invoice': '發票',
                                    'receipt': '收據'
                                };
                                
                                // 2. 獲取中文名稱 (如果找不到就顯示原文)
                                const typeName = typeMap[doc.type] || doc.type;

                                // 3. 組合摘要 (優先使用即時資料，舊資料則用 saved summary)
                                const summaryText = doc.formData 
                                ? `${doc.formData.customerName || '無聯絡人'} - ${doc.formData.regMark || '無車牌'} - ${doc.formData.year || ''} ${doc.formData.make || ''} ${doc.formData.model || ''}`
                                : doc.summary;

                                return (
                                    <tr key={doc.id} className="hover:bg-slate-50 cursor-pointer text-xs" onClick={() => editDoc(doc)}>
                                        <td className="p-3 font-mono text-slate-500">{doc.updatedAt?.toDate().toLocaleDateString()}</td>
                                        
                                        {/* 顯示中文類型 */}
                                        <td className="p-3 font-bold text-blue-600">
                                            {typeName}
                                        </td>

                                        {/* 顯示摘要 */}
                                        <td className="p-3 text-slate-700">
                                            {summaryText}
                                        </td>

                                        <td className="p-3 text-right">
                                            <button onClick={(e) => { e.stopPropagation(); if(confirm('刪除此單據?')) deleteDocRecord(doc.id); }} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        </table>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full gap-4 relative overflow-hidden">
            {/* Left: Inventory */}
            <div className="w-1/4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2"><button onClick={() => setViewMode('list')} className="p-1.5 hover:bg-white rounded border"><ChevronLeft size={16}/></button><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜尋庫存..." className="flex-1 px-2 py-1.5 text-xs bg-white border rounded outline-none"/></div>
                <div className="p-2 border-b bg-slate-50"><button onClick={handleSelectBlank} className="w-full py-1 text-xs font-bold rounded border bg-white text-slate-600 hover:bg-slate-100">空白單據</button></div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">{filteredInventory.map(car => (<div key={car.id} onClick={() => handleSelectCar(car)} className={`p-3 rounded border cursor-pointer ${selectedCarId === car.id ? 'bg-blue-50 border-blue-300' : 'bg-white hover:border-blue-200'}`}><div className="flex justify-between font-bold text-sm"><span>{car.regMark}</span><span className="text-[10px] bg-gray-100 px-1 rounded">{car.status}</span></div><div className="text-xs text-gray-500">{car.make} {car.model}</div></div>))}</div>
            </div>

            {/* Middle: Editor */}
            <div className="w-[40%] bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-3 border-b bg-slate-50 flex justify-between items-center"><span className="font-bold text-slate-700 text-sm">編輯單據 {docId?'(修改)':'(新增)'}</span><div className="flex gap-2"><button onClick={saveDocRecord} className="px-3 py-1.5 bg-white border text-slate-600 rounded text-xs font-bold flex items-center"><Save size={14} className="mr-1"/> 儲存</button><button onClick={handlePrint} className="px-4 py-1.5 bg-slate-800 text-white rounded text-xs font-bold flex items-center"><Printer size={14} className="mr-1"/> 列印</button></div></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded">{[{id:'sales_contract',l:'賣車'}, {id:'purchase_contract',l:'收車'}, {id:'consignment_contract',l:'寄賣'}, {id:'invoice',l:'發票'}, {id:'receipt',l:'收據'}].map(t=>(<button key={t.id} onClick={()=>setSelectedDocType(t.id as any)} className={`flex-1 py-1.5 rounded text-[10px] font-bold ${selectedDocType===t.id?'bg-white shadow text-blue-600':'text-gray-500'}`}>{t.l}</button>))}</div>
                    <div className="space-y-3">
                        <div className="p-3 bg-blue-50 rounded border border-blue-100">
                            <div className="text-[10px] font-bold text-blue-500 mb-2">客戶資料</div>
                            <input name="customerName" value={formData.customerName} onChange={handleChange} placeholder="姓名" className="w-full text-sm border-b mb-2 bg-transparent font-bold"/>
                            <div className="flex gap-2"><input name="customerPhone" value={formData.customerPhone} onChange={handleChange} placeholder="電話" className="flex-1 text-xs border-b bg-transparent"/><input name="customerId" value={formData.customerId} onChange={handleChange} placeholder="ID" className="flex-1 text-xs border-b bg-transparent"/></div>
                            <input name="customerAddress" value={formData.customerAddress} onChange={handleChange} placeholder="地址" className="w-full text-xs border-b mt-2 bg-transparent"/>
                        </div>
                        
                        {/* 1. 基本款項與收款 (只在合約模式顯示) */}
                        {!['invoice', 'receipt'].includes(selectedDocType) && (
                            <div className="p-3 bg-yellow-50 rounded border border-yellow-200 mb-3">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-[10px] font-bold text-yellow-600">交易金額與收款 (Payment)</div>
                                    {/* ★★★ 條款隱藏開關 ★★★ */}
                                    <label className="flex items-center text-[10px] cursor-pointer text-slate-500">
                                        <input type="checkbox" checked={showTerms} onChange={e => setShowTerms(e.target.checked)} className="mr-1 accent-slate-600"/>
                                        列印法律條款
                                    </label>
                                </div>

                                {/* A. 車價 (固定) */}
                                <div className="flex justify-between items-center mb-2 pb-2 border-b border-yellow-100">
                                    <span className="text-xs font-bold text-slate-700">成交價 (Vehicle Price)</span>
                                    <div className="flex items-center">
                                        <span className="text-xs mr-1">$</span>
                                        <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-24 bg-white border border-yellow-300 rounded px-1 text-right font-bold text-sm"/>
                                    </div>
                                </div>

                                {/* B. 動態收款列表 (訂金/大訂等) */}
                                <div className="space-y-1 mb-2">
                                    {depositItems.map((item, idx) => (
                                        <div key={item.id} className="flex items-center gap-1">
                                            {/* 名稱可改 */}
                                            <input 
                                                value={item.label}
                                                onChange={(e) => {
                                                    const newArr = [...depositItems];
                                                    newArr[idx].label = e.target.value;
                                                    setDepositItems(newArr);
                                                }}
                                                className="flex-1 text-[10px] bg-transparent border-b border-dashed border-yellow-300 outline-none text-slate-600"
                                            />
                                            <span className="text-xs">$</span>
                                            {/* 金額可改 */}
                                            <input 
                                                type="number" 
                                                value={item.amount}
                                                onChange={(e) => {
                                                    const newArr = [...depositItems];
                                                    newArr[idx].amount = Number(e.target.value);
                                                    setDepositItems(newArr);
                                                }}
                                                className="w-24 bg-white border border-yellow-200 rounded px-1 text-right text-xs text-blue-600 font-bold"
                                            />
                                            {/* 刪除按鈕 (至少保留一個時不顯示，或者允許全刪) */}
                                            <button onClick={() => setDepositItems(prev => prev.filter(i => i.id !== item.id))} className="text-yellow-400 hover:text-red-500"><X size={12}/></button>
                                        </div>
                                    ))}
                                </div>

                                {/* 新增收款按鈕 */}
                                <div className="text-right">
                                    <button 
                                        onClick={() => setDepositItems([...depositItems, { id: Date.now().toString(), label: 'Second Deposit (加訂)', amount: 0 }])}
                                        className="text-[9px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200"
                                    >
                                        + 新增收款欄位
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 2. 額外收費項目 (所有單據都顯示，並支援直接修改文字/金額) */}
                        <div className="p-3 bg-green-50 rounded border border-green-200">
                            <div className="text-[10px] font-bold text-green-700 mb-2 flex justify-between">
                                <span>額外收費項目 (Add-ons)</span>
                                <span className="text-gray-400">請勾選</span>
                            </div>
                            <div className="space-y-1 mb-3">
                                {docItems.map((item) => (
                                    <div key={item.id} className="flex items-center text-xs bg-white p-1.5 rounded border">
                                        <input type="checkbox" checked={item.isSelected} onChange={() => toggleItem(item.id)} className="mr-2 accent-green-600"/>
                                        
                                        {/* 修改: 項目名稱可編輯 */}
                                        <input 
                                            value={item.desc} 
                                            onChange={(e) => {
                                                const newDesc = e.target.value;
                                                setDocItems(prev => prev.map(i => i.id === item.id ? { ...i, desc: newDesc } : i));
                                            }}
                                            className="flex-1 bg-transparent outline-none border-b border-transparent focus:border-blue-300 mr-2"
                                        />
                                        
                                        <span className="font-mono font-bold mx-1">$</span>
                                        
                                        {/* 修改: 金額可編輯 */}
                                        <input 
                                            type="number"
                                            value={item.amount}
                                            onChange={(e) => {
                                                const newAmt = Number(e.target.value);
                                                setDocItems(prev => prev.map(i => i.id === item.id ? { ...i, amount: newAmt } : i));
                                            }}
                                            className="w-16 bg-transparent outline-none border-b border-transparent focus:border-blue-300 text-right font-bold"
                                        />
                                        
                                        <button onClick={() => deleteItem(item.id)} className="text-gray-400 hover:text-red-500 ml-2"><X size={12}/></button>
                                    </div>
                                ))}
                                {docItems.length === 0 && <div className="text-gray-400 text-xs text-center italic">無額外項目</div>}
                            </div>
                            
                            {/* 新增按鈕區 */}
                            <div className="flex gap-1 pt-2 border-t border-green-200">
                                <input value={newItemDesc} onChange={e=>setNewItemDesc(e.target.value)} placeholder="新增項目 (如: 代辦費)..." className="flex-1 text-xs border rounded px-1"/>
                                <input type="number" value={newItemAmount} onChange={e=>setNewItemAmount(e.target.value)} placeholder="$" className="w-16 text-xs border rounded px-1"/>
                                <button onClick={addItem} className="bg-green-600 text-white px-2 rounded text-xs"><Plus size={12}/></button>
                            </div>
                        </div>

                        {/* 車輛資料 */}
                        <div className="p-3 bg-gray-50 rounded border border-gray-200">
                            <div className="text-[10px] font-bold text-gray-500 mb-2">車輛資料 (Vehicle Details)</div>
                            
                            {/* 第一行：車牌、年份 */}
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <input name="regMark" value={formData.regMark} onChange={handleChange} placeholder="車牌" className="border-b bg-transparent text-sm font-bold"/>
                                <input name="year" value={formData.year} onChange={handleChange} placeholder="年份" className="border-b bg-transparent text-sm"/>
                            </div>
                            
                            {/* 第二、三行：廠牌、型號 */}
                            <input name="make" value={formData.make} onChange={handleChange} placeholder="廠牌" className="w-full border-b mb-2 bg-transparent text-xs"/>
                            <input name="model" value={formData.model} onChange={handleChange} placeholder="型號" className="w-full border-b mb-2 bg-transparent text-xs"/>
                            
                            {/* ★★★ 新增第四行：外觀顏色、內飾顏色 ★★★ */}
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <input name="color" value={formData.color} onChange={handleChange} placeholder="外觀顏色 (Ext)" className="border-b bg-transparent text-xs"/>
                                <input name="colorInterior" value={formData.colorInterior || ''} onChange={handleChange} placeholder="內飾顏色 (Int)" className="border-b bg-transparent text-xs"/>
                            </div>

                            {/* 第五行：底盤號、引擎號 */}
                            <div className="grid grid-cols-2 gap-2">
                                <input name="chassisNo" value={formData.chassisNo} onChange={handleChange} placeholder="底盤號" className="border-b bg-transparent text-[10px] font-mono"/>
                                <input name="engineNo" value={formData.engineNo} onChange={handleChange} placeholder="引擎號" className="border-b bg-transparent text-[10px] font-mono"/>
                            </div>
                        </div>

                        {/* ★★★ 新增：交易條款設定 (日期與時間) ★★★ */}
                        <div className="p-3 bg-indigo-50 rounded border border-indigo-200">
                            <div className="text-[10px] font-bold text-indigo-700 mb-2">交易條款 (Terms)</div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] text-indigo-500 mb-1">交收日期 (Date)</label>
                                    <input type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleChange} className="w-full text-xs border rounded p-1 bg-white"/>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-indigo-500 mb-1">交收時間 (Time)</label>
                                    <input type="time" name="handoverTime" value={formData.handoverTime} onChange={handleChange} className="w-full text-xs border rounded p-1 bg-white"/>
                                </div>
                            </div>
                        </div>

                        {/* 附件與備註 */}
                        <div className="p-3 bg-white rounded border border-slate-300">
                            <div className="text-[10px] font-bold text-slate-600 mb-2">隨車附件</div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <label className="flex items-center text-xs"><input type="checkbox" checked={checklist.vrd} onChange={e=>setChecklist({...checklist, vrd: e.target.checked})} className="mr-1"/> 牌薄</label>
                                <label className="flex items-center text-xs"><input type="checkbox" checked={checklist.keys} onChange={e=>setChecklist({...checklist, keys: e.target.checked})} className="mr-1"/> 後備匙</label>
                                <label className="flex items-center text-xs"><input type="checkbox" checked={checklist.tools} onChange={e=>setChecklist({...checklist, tools: e.target.checked})} className="mr-1"/> 工具</label>
                                <label className="flex items-center text-xs"><input type="checkbox" checked={checklist.manual} onChange={e=>setChecklist({...checklist, manual: e.target.checked})} className="mr-1"/> 說明書</label>
                            </div>
                            <input value={checklist.other} onChange={e=>setChecklist({...checklist, other: e.target.value})} placeholder="其他附件..." className="w-full text-xs border-b outline-none"/>
                        </div>
                        <div className="p-3 bg-white rounded border border-slate-200">
                            <div className="text-[10px] font-bold text-slate-400 mb-1">備註</div>
                            <textarea name="remarks" value={formData.remarks} onChange={handleChange} className="w-full h-12 text-xs border p-1 rounded resize-none"/>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Live Preview */}
            <div className="flex-1 bg-gray-200/50 rounded-xl border border-slate-200 flex flex-col overflow-hidden items-center justify-center p-4">
                <div className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Live Preview</div>
                <div className="w-full h-full flex justify-center overflow-hidden">
                    <LivePreview />
                </div>
            </div>
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
          setStaffId={setStaffId}
          currentUser={currentUser}/>
           

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
          
          {/* Modal for Add/Edit Vehicle (完整參數版) */}
          {(activeTab === 'inventory_add' || editingVehicle) && (
              <VehicleFormModal 
                  db={db}
                  staffId={staffId}
                  appId={appId}
                  clients={clients}              // 連動 VRD 需要這個
                  settings={settings}
                  editingVehicle={editingVehicle} // ★ 關鍵：必須把要編輯的車傳進去，彈窗才會開！
                  setEditingVehicle={setEditingVehicle}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  saveVehicle={saveVehicle}
                  addPayment={addPayment}
                  deletePayment={deletePayment}
                  addExpense={addExpense}
                  deleteExpense={deleteExpense}
                  addSystemLog={addSystemLog}
              />
          )}

          {/* Report Tab - 讓它內部也可以滾動 */}
            {activeTab === 'reports' && (
                <div className="flex-1 overflow-y-auto">
                    <ReportView inventory={visibleInventory} /> {/* ★ 關鍵修改：傳入過濾後的資料 */}
                </div>
            )}

         {/* Cross Border Tab (v10.5: TypeScript 類型修復) */}
          {activeTab === 'cross_border' && (
            <div className="h-full animate-fade-in">
                <CrossBorderView 
                    inventory={visibleInventory}
                    settings={settings}
                    dbEntries={dbEntries}
                    activeCbVehicleId={activeCbVehicleId}
                    setActiveCbVehicleId={setActiveCbVehicleId}
                    setEditingVehicle={setEditingVehicle}
                    updateVehicle={updateVehicle}
                    
                    // ★★★ 修正 1: 加入類型標註 (vid: string, task: CrossBorderTask) ★★★
                    addCbTask={(vid: string, task: CrossBorderTask) => {
                        const v = inventory.find(i => i.id === vid);
                        if (v) {
                            const newTasks = [...(v.crossBorder?.tasks || []), task];
                            updateVehicle(vid, { crossBorder: { ...v.crossBorder, tasks: newTasks } } as Partial<Vehicle>);
                            if(addSystemLog) addSystemLog('CB Task', `Added task: ${task.item} to ${v.regMark}`);
                        }
                    }}
                    
                    // ★★★ 修正 2: 加入類型標註 ★★★
                    updateCbTask={(vid: string, task: CrossBorderTask) => {
                        const v = inventory.find(i => i.id === vid);
                        if (v) {
                            const newTasks = (v.crossBorder?.tasks || []).map(t => t.id === task.id ? task : t);
                            updateVehicle(vid, { crossBorder: { ...v.crossBorder, tasks: newTasks } } as Partial<Vehicle>);
                        }
                    }}
                    
                    // ★★★ 修正 3: 加入類型標註 (taskId: string) ★★★
                    deleteCbTask={(vid: string, taskId: string) => {
                        if(!confirm("確定刪除此項目？")) return;
                        const v = inventory.find(i => i.id === vid);
                        if (v) {
                            const newTasks = (v.crossBorder?.tasks || []).filter(t => t.id !== taskId);
                            updateVehicle(vid, { crossBorder: { ...v.crossBorder, tasks: newTasks } } as Partial<Vehicle>);
                        }
                    }}
                    
                    // ★★★ 修正 4: 加入類型標註 (p: Payment) ★★★
                    addPayment={(vid: string, p: Payment) => {
                        const v = inventory.find(i => i.id === vid);
                        if (v) {
                            const newPayments = [...(v.payments || []), p];
                            updateVehicle(vid, { payments: newPayments });
                            if(addSystemLog) addSystemLog('Payment', `Received ${p.amount} for ${v.regMark}`);
                        }
                    }}
                    
                    // ★★★ 修正 5: 加入類型標註 (pid: string) ★★★
                    deletePayment={(vid: string, pid: string) => {
                        const v = inventory.find(i => i.id === vid);
                        if (v) {
                            const newPayments = (v.payments || []).filter(p => p.id !== pid);
                            updateVehicle(vid, { payments: newPayments });
                        }
                    }}
                />
            </div>
          )}

          
          {/* Dashboard Tab (v15.9: 擬真車牌 + 智能縮圖 + 完整排序) */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col h-full overflow-hidden space-y-4 animate-fade-in relative">
                
                {shareVehicle && <VehicleShareModal vehicle={shareVehicle} db={db} staffId={staffId} appId={appId} onClose={()=>setShareVehicle(null)} />}

                <div className="flex justify-between items-center flex-none">
                 <h2 className="text-2xl font-bold text-slate-800">業務儀表板</h2>
                 <SmartNotificationCenter inventory={visibleInventory} settings={settings} />
                </div>
              
              {/* 卡片統計 (保持不變) */}
              <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-4 flex-none">
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500"><p className="text-xs text-gray-500 uppercase">庫存總值</p><p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalStockValue)}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500"><p className="text-xs text-gray-500 uppercase">未付費用</p><p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalPayable)}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500"><p className="text-xs text-gray-500 uppercase">應收尾數</p><p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalReceivable)}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500"><p className="text-xs text-gray-500 uppercase">本月銷售額</p><p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalSoldThisMonth)}</p></div>
              </div>

              {/* 提醒中心 (保持不變) */}
              {(() => {
                  const docAlerts: any[] = [];
                  dbEntries.forEach(d => { if (d.reminderEnabled && d.expiryDate) { const days = getDaysRemaining(d.expiryDate); if (days !== null && days <= 30) { docAlerts.push({ id: d.id, title: d.name, desc: d.docType, date: d.expiryDate, days, status: days < 0 ? 'expired' : 'soon', raw: d }); } } });
                  docAlerts.sort((a, b) => a.days - b.days);

                  const cbAlerts: any[] = [];
                  const cbDateFields = { dateHkInsurance: '香港保險', dateReservedPlate: '留牌紙', dateBr: '商業登記 (BR)', dateLicenseFee: '香港牌費', dateMainlandJqx: '內地交強險', dateMainlandSyx: '內地商業險', dateClosedRoad: '禁區紙', dateApproval: '批文卡', dateMainlandLicense: '內地行駛證', dateHkInspection: '香港驗車' };
                  inventory.forEach(v => { const cb = v.crossBorder; if (!cb) return; Object.entries(cbDateFields).forEach(([field, label]) => { const dateStr = (cb as any)?.[field]; if (dateStr) { const days = getDaysRemaining(dateStr); if (days !== null && days <= 30) { cbAlerts.push({ id: v.id, title: v.regMark || '未出牌', desc: label, date: dateStr, days, status: days < 0 ? 'expired' : 'soon', raw: v }); } } }); });
                  cbAlerts.sort((a, b) => a.days - b.days);
                  
                  const cbExpiredCount = cbAlerts.filter(a => a.status === 'expired').length;
                  const cbSoonCount = cbAlerts.filter(a => a.status === 'soon').length;
                  const docExpiredCount = docAlerts.filter(a => a.status === 'expired').length;
                  const docSoonCount = docAlerts.filter(a => a.status === 'soon').length;

                  const AlertList = ({ items, onItemClick }: any) => (
                      <div className="flex-1 bg-black/20 rounded-lg overflow-hidden flex flex-col h-32">
                          <div className="overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/20">
                              {items.map((item:any, idx:number) => (<div key={idx} onClick={() => onItemClick(item)} className={`flex justify-between items-center p-2 rounded text-xs cursor-pointer hover:bg-white/10 border-l-2 ${item.status === 'expired' ? 'border-red-500 bg-red-900/10' : 'border-amber-400 bg-amber-900/10'}`}><div className="flex-1 min-w-0 mr-2"><div className="font-bold truncate text-white">{item.title}</div><div className="text-white/60 truncate">{item.desc}</div></div><div className="text-right whitespace-nowrap"><div className={`font-bold ${item.status === 'expired' ? 'text-red-400' : 'text-amber-400'}`}>{item.status === 'expired' ? `已過期 ${Math.abs(item.days)} 天` : `還有 ${item.days} 天就過期`}</div><div className="text-white/40 scale-90">{item.date}</div></div></div>))}
                              {items.length === 0 && <div className="text-white/30 text-xs text-center mt-4">無提醒事項</div>}
                          </div>
                      </div>
                  );

                  return (
                      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-4 flex-none">
                          <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg p-4 text-white shadow-sm flex gap-4 relative overflow-hidden"><div className="w-1/3 border-r border-white/10 pr-2 flex flex-col justify-center"><div className="font-bold mb-3 flex items-center text-xs text-slate-300"><Globe size={14} className="mr-1"/> 中港提醒</div><div className="space-y-3"><div><div className="text-2xl font-bold text-red-400 leading-none">{cbExpiredCount}</div><div className="text-[10px] text-red-200/70">已過期</div></div><div><div className="text-2xl font-bold text-amber-400 leading-none">{cbSoonCount}</div><div className="text-[10px] text-amber-200/70">即將到期</div></div></div></div><AlertList items={cbAlerts} onItemClick={(item:any) => { setActiveTab('cross_border'); setActiveCbVehicleId(item.id); }} /></div>
                          <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-4 text-white shadow-sm flex gap-4 relative overflow-hidden"><div className="w-1/3 border-r border-white/10 pr-2 flex flex-col justify-center"><div className="font-bold mb-3 flex items-center text-xs text-blue-200"><Database size={14} className="mr-1"/> 文件提醒</div><div className="space-y-3"><div><div className="text-2xl font-bold text-red-400 leading-none">{docExpiredCount}</div><div className="text-[10px] text-red-200/70">已過期</div></div><div><div className="text-2xl font-bold text-amber-400 leading-none">{docSoonCount}</div><div className="text-[10px] text-amber-200/70">即將到期</div></div></div></div><AlertList items={docAlerts} onItemClick={(item:any) => { setActiveTab('database'); setEditingEntry(item.raw); setIsDbEditing(true); }} /></div>
                      </div>
                  );
              })()}
              
              {/* 3. 庫存列表 (排序 + 擬真車牌 + 縮圖) */}
              {(() => {
                  const sortedList = [...inventory].sort((a,b) => {
                      const getScore = (v: Vehicle) => {
                          if (v.status === 'In Stock') return 1;
                          if (v.status === 'Reserved') return 2;
                          if (v.status === 'Sold') {
                              const received = (v.payments || []).reduce((acc, p) => acc + (p.amount || 0), 0);
                              const cbFees = (v.crossBorder?.tasks || []).reduce((sum, t) => sum + (t.fee || 0), 0);
                              const totalReceivable = (v.price || 0) + cbFees;
                              const balance = totalReceivable - received;
                              const unpaidExps = (v.expenses || []).filter(e => e.status === 'Unpaid').length;
                              const pendingCb = (v.crossBorder?.tasks || []).filter(t => !t.isPaid).length;
                              if (balance > 0 || unpaidExps > 0 || pendingCb > 0) return 3; 
                              return 4;
                          }
                          if (v.status === 'Withdrawn') return 5;
                          return 6;
                      };
                      const scoreA = getScore(a);
                      const scoreB = getScore(b);
                      if (scoreA !== scoreB) return scoreA - scoreB;
                      return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
                  });

                  return (
                      <div className="bg-white rounded-lg shadow-sm p-4 flex-1 flex flex-col overflow-hidden min-h-0">
                        <div className="flex-1 overflow-y-auto border rounded-lg">
                          {/* 3. 庫存列表 (排序 + 擬真車牌 + 縮圖) - 響應式修復版 */}
              {(() => {
                  const sortedList = [...inventory].sort((a,b) => {
                      // ... (排序邏輯保持不變，為節省篇幅省略，請保留您原本的排序代碼) ...
                      const getScore = (v: Vehicle) => {
                          if (v.status === 'In Stock') return 1;
                          if (v.status === 'Reserved') return 2;
                          if (v.status === 'Sold') {
                              // ... (保留原本邏輯)
                              const received = (v.payments || []).reduce((acc, p) => acc + (p.amount || 0), 0);
                              const cbFees = (v.crossBorder?.tasks || []).reduce((sum, t) => sum + (t.fee || 0), 0);
                              const totalReceivable = (v.price || 0) + cbFees;
                              const balance = totalReceivable - received;
                              const unpaidExps = (v.expenses || []).filter(e => e.status === 'Unpaid').length;
                              const pendingCb = (v.crossBorder?.tasks || []).filter(t => !t.isPaid).length;
                              if (balance > 0 || unpaidExps > 0 || pendingCb > 0) return 3; 
                              return 4;
                          }
                          if (v.status === 'Withdrawn') return 5;
                          return 6;
                      };
                      const scoreA = getScore(a);
                      const scoreB = getScore(b);
                      if (scoreA !== scoreB) return scoreA - scoreB;
                      return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
                  });

                  return (
                      <div className="bg-white rounded-lg shadow-sm p-0 md:p-4 flex-1 flex flex-col overflow-hidden min-h-0">
                        <div className="flex-1 overflow-y-auto md:border md:rounded-lg">
                          
                          {/* --- 手機版視圖 (Mobile Card View) --- */}
                          <div className="md:hidden">
                              {sortedList.map(car => {
                                  const received = (car.payments || []).reduce((acc, p) => acc + (p.amount || 0), 0);
                                  const cbFees = (car.crossBorder?.tasks || []).reduce((sum, t) => sum + (t.fee || 0), 0);
                                  const totalReceivable = (car.price || 0) + cbFees;
                                  const balance = totalReceivable - received;
                                  
                                  let statusText = '在庫';
                                  let statusClass = "bg-green-100 text-green-700 border-green-200";
                                  if (car.status === 'Reserved') { statusText = '已訂'; statusClass = "bg-yellow-100 text-yellow-700 border-yellow-200"; }
                                  else if (car.status === 'Sold') { statusText = '已售'; statusClass = "bg-blue-50 text-blue-600 border-blue-100"; }
                                  else if (car.status === 'Withdrawn') { statusText = '撤回'; statusClass = "bg-gray-200 text-gray-500 border-gray-300 decoration-line-through"; }

                                  const thumbUrl = primaryImages[car.id] || (car.photos && car.photos.length > 0 ? car.photos[0] : null);

                                  return (
                                      <div key={car.id} onClick={() => setEditingVehicle(car)} className="p-3 border-b border-slate-100 active:bg-slate-50 transition-colors relative">
                                          {/* 上排：狀態 + 車牌 */}
                                          <div className="flex justify-between items-start mb-2">
                                              <div className="flex items-center gap-2">
                                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusClass}`}>{statusText}</span>
                                                  <span className="bg-[#FFD600] text-black border border-black font-black font-mono text-xs px-1.5 rounded-[2px] leading-tight shadow-sm">
                                                      {car.regMark || '未出牌'}
                                                  </span>
                                                  {car.crossBorder?.mainlandPlate && (
                                                      <span className="bg-blue-800 text-white border border-white font-bold font-mono text-[10px] px-1 rounded-[2px]">
                                                          {car.crossBorder.mainlandPlate}
                                                      </span>
                                                  )}
                                              </div>
                                              <div className="font-bold text-slate-800 text-sm">{formatCurrency(car.price)}</div>
                                          </div>

                                          {/* 中排：圖片 + 資料 */}
                                          <div className="flex gap-3">
                                              <div className="w-20 h-14 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 border border-slate-200">
                                                  {thumbUrl ? <img src={thumbUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Car size={16}/></div>}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                  {/* ★★★ 這裡補回了年份 car.year ★★★ */}
                                                  <div className="font-bold text-sm text-slate-700 truncate">
                                                      {car.year} {car.make} {car.model}
                                                  </div>
                                                  <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-2">
                                                      <span>{car.colorExt}</span>
                                                      <span>{car.mileage ? `${Number(car.mileage).toLocaleString()}km` : '-'}</span>
                                                      <span>{car.seating}座</span>
                                                  </div>
                                                  {/* 財務狀態 (如有欠款) */}
                                                  {balance > 0 && <div className="text-blue-600 font-bold text-xs mt-1">欠款: {formatCurrency(balance)}</div>}
                                              </div>
                                          </div>
                                          
                                          {/* 分享按鈕 */}
                                          <button onClick={(e)=>{e.stopPropagation(); setShareVehicle(car);}} className="absolute bottom-3 right-3 p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-full border border-slate-200">
                                              <Share2 size={16}/>
                                          </button>
                                      </div>
                                  );
                              })}
                          </div>

                          {/* --- 電腦版視圖 (Desktop Table View) - 保持原本表格，但預設 hidden --- */}
                          <table className="hidden md:table w-full text-left text-sm whitespace-nowrap relative">
                            <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm text-slate-600 font-bold text-xs uppercase">
                                <tr className="border-b">
                                    <th className="p-3 w-10 text-center">Act</th>
                                    <th className="p-3 w-20">狀態</th>
                                    <th className="p-3">車輛資料 (Vehicle)</th>
                                    <th className="p-3">規格 (Spec)</th>
                                    <th className="p-3 hidden lg:table-cell">詳情</th>
                                    <th className="p-3 text-right">牌費</th>
                                    <th className="p-3 text-right">財務狀況</th>
                                </tr>
                            </thead>
                            <tbody>
                              {sortedList.map(car => {
                                  const received = (car.payments || []).reduce((acc, p) => acc + (p.amount || 0), 0);
                                  const cbFees = (car.crossBorder?.tasks || []).reduce((sum, t) => sum + (t.fee || 0), 0);
                                  const totalReceivable = (car.price || 0) + cbFees;
                                  const balance = totalReceivable - received;
                                  const unpaidExps = (car.expenses || []).filter(e => e.status === 'Unpaid').length || 0;
                                  
                                  let statusText = '在庫';
                                  let statusClass = "bg-green-100 text-green-700 border-green-200";
                                  if (car.status === 'Reserved') { statusText = '已訂'; statusClass = "bg-yellow-100 text-yellow-700 border-yellow-200"; }
                                  else if (car.status === 'Sold') { statusText = '已售'; statusClass = "bg-blue-50 text-blue-600 border-blue-100"; }
                                  else if (car.status === 'Withdrawn') { statusText = '撤回'; statusClass = "bg-gray-200 text-gray-500 border-gray-300 decoration-line-through"; }

                                  const thumbUrl = primaryImages[car.id] || (car.photos && car.photos.length > 0 ? car.photos[0] : null);

                                  // 標籤邏輯
                                  const getTags = () => {
                                      const tags = [];
                                      const ports = car.crossBorder?.ports || [];
                                      const isHk = ports.some((p:string) => PORTS_HK_GD.includes(p));
                                      const isMo = ports.some((p:string) => PORTS_MO_GD.includes(p));
                                      if (isHk) tags.push({ label: '粵港', color: 'bg-indigo-600 border-indigo-800 text-white' });
                                      if (isMo) tags.push({ label: '粵澳', color: 'bg-emerald-600 border-emerald-800 text-white' });
                                      if (!isHk && !isMo && (car.crossBorder?.isEnabled || car.crossBorder?.mainlandPlate)) tags.push({ label: '中港', color: 'bg-slate-600 border-slate-800 text-white' });
                                      return tags;
                                  };
                                  const cbTags = getTags();

                                  return (
                                    <tr key={car.id} className="border-b hover:bg-blue-50 cursor-pointer transition-colors group text-xs md:text-sm" onClick={() => setEditingVehicle(car)}>
                                      <td className="p-3 text-center" onClick={e=>e.stopPropagation()}><button onClick={() => setShareVehicle(car)} className="text-slate-400 hover:text-blue-600 p-1"><Share2 size={16}/></button></td>
                                      <td className="p-3"><span className={`px-2 py-1 rounded text-[10px] md:text-xs font-bold border ${statusClass}`}>{statusText}</span></td>
                                      
                                      <td className="p-3">
                                          <div className="flex items-center gap-3">
                                              <div className="w-12 h-9 flex-none relative rounded-md overflow-hidden border border-slate-200 bg-gray-100 shadow-sm">
                                                  {thumbUrl ? (
                                                      <img src={thumbUrl} className="w-full h-full object-cover" alt="Car" />
                                                  ) : (
                                                      <div className="w-full h-full flex items-center justify-center text-slate-300"><Car size={16}/></div>
                                                  )}
                                              </div>
                                              
                                              <div className="flex flex-col gap-1 items-start">
                                                  <div className="flex gap-1">
                                                      <span className="bg-[#FFD600] text-black border border-black font-black font-mono text-[10px] px-1 rounded-[2px] leading-tight shadow-sm">
                                                          {car.regMark || '未出牌'}
                                                      </span>
                                                      {car.crossBorder?.mainlandPlate && (
                                                          <span className={`${
                                                              car.crossBorder.mainlandPlate.startsWith('粵Z') ? 'bg-black text-white border-white' : 'bg-[#003399] text-white border-white'
                                                          } border font-bold font-mono text-[10px] px-1 rounded-[2px] leading-tight shadow-sm`}>
                                                              {car.crossBorder.mainlandPlate}
                                                          </span>
                                                      )}
                                                  </div>
                                                  {/* ★★★ 這裡補回了年份 car.year ★★★ */}
                                                  <div className="text-xs text-slate-600 font-bold">{car.year} {car.make} {car.model}</div>
                                                  <div className="flex gap-1">{cbTags.map((t,i)=><span key={i} className={`text-[8px] px-1 rounded ${t.color}`}>{t.label}</span>)}</div>
                                              </div>
                                          </div>
                                      </td>

                                      <td className="p-3">
                                          <div className="flex flex-col gap-0.5 text-xs text-gray-600">
                                              <div className="flex items-center gap-1"><span className="text-[10px] text-gray-400 w-6">Ext:</span><span className="font-bold">{car.colorExt || '-'}</span></div>
                                              <div className="flex items-center gap-1"><span className="text-[10px] text-gray-400 w-6">Int:</span><span>{car.colorInt || '-'}</span></div>
                                              <div className="flex items-center gap-1"><span className="text-[10px] text-gray-400 w-6">Km:</span><span className="font-mono">{car.mileage ? Number(car.mileage).toLocaleString() : '-'}</span></div>
                                          </div>
                                      </td>
                                      <td className="p-3 hidden lg:table-cell">
                                          <div className="flex gap-1 text-xs text-gray-600 flex-wrap">
                                              <span className="bg-slate-50 px-1 border rounded">{car.previousOwners || 0}手</span>
                                              <span className="bg-slate-50 px-1 border rounded">{car.seating || 5}座</span>
                                              <span className="bg-slate-50 px-1 border rounded">{car.engineSize}cc</span>
                                          </div>
                                      </td>
                                      <td className="p-3 text-right"><div className="font-bold text-slate-700">{formatCurrency(car.price)}</div><div className="text-[10px] text-gray-400 mt-1">{car.licenseExpiry || '-'}</div></td>
                                      <td className="p-3 text-right">
                                          {car.status === 'Withdrawn' ? <span className="text-gray-400">-</span> : (
                                              balance > 0 ? <span className="text-blue-600 font-bold block">欠 {formatCurrency(balance)}</span> : 
                                              (unpaidExps === 0 ? <span className="text-green-500 font-bold">完成</span> : <span className="text-green-600 font-bold text-xs">已結清</span>)
                                          )}
                                          {unpaidExps > 0 && <span className="text-red-500 text-[10px] block mt-0.5">{unpaidExps} 筆未付</span>}
                                      </td>
                                    </tr>
                                  );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                  );
              })()}
                        </div>
                      </div>
                  );
              })()}
            </div>
          )}

         {/* Inventory Tab (v15.3: 擬真車牌 + 粵港澳標籤 + 智能縮圖 + 排序優化) */}
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
                  {['All', 'In Stock', 'Sold', 'Reserved', 'Withdrawn'].map(s => (
                      <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filterStatus === s ? 'bg-yellow-500 text-white shadow-sm' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}>
                          {s === 'All' ? '全部' : (s === 'Withdrawn' ? '撤回' : s)}
                      </button>
                  ))}
              </div>

              {/* Grid Container */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-20">
                    {getSortedInventory()
                        .sort((a, b) => {
                            if (sortConfig) return 0;
                            return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
                        })
                        .map((car) => { 
                        const received = (car.payments || []).reduce((acc, p) => acc + p.amount, 0) || 0; 
                        const balance = (car.price || 0) - received; 
                        
                        // ★★★ 1. 修復標籤邏輯 ★★★
                        const getRefinedTags = () => {
                            const tags = [];
                            const ports = car.crossBorder?.ports || [];
                            // 檢查是否啟用或有相關資料
                            const isCbActive = car.crossBorder?.isEnabled || car.crossBorder?.mainlandPlate || car.crossBorder?.quotaNumber;
                            
                            if (isCbActive) {
                                // 判斷口岸分類
                                const isHk = ports.some(p => PORTS_HK_GD.includes(p));
                                const isMo = ports.some(p => PORTS_MO_GD.includes(p));
                                
                                if (isHk) tags.push({ label: '粵港', color: 'bg-indigo-600 border-indigo-800 text-white' });
                                if (isMo) tags.push({ label: '粵澳', color: 'bg-emerald-600 border-emerald-800 text-white' });
                                // 如果沒選口岸但有資料，顯示通用標籤
                                if (!isHk && !isMo) tags.push({ label: '中港', color: 'bg-slate-600 border-slate-800 text-white' });
                            }
                            return tags;
                        };
                        const cbTags = getRefinedTags();
                        
                        // ★★★ 智能讀取封面圖 ★★★
                        const thumbUrl = primaryImages[car.id] || (car.photos && car.photos.length > 0 ? car.photos[0] : null);

                        return (
                        <div key={car.id} className="bg-white rounded-lg shadow-sm border border-slate-200 hover:border-yellow-400 transition group relative overflow-hidden">
                            <div className="flex h-36"> {/* 稍微加高一點以容納雙車牌 */}
                                {/* 左側：縮圖區域 (佔 35%) */}
                                <div className="w-[35%] bg-gray-100 relative overflow-hidden cursor-pointer" onClick={() => setEditingVehicle(car)}>
                                    {thumbUrl ? (
                                        <img src={thumbUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Car" loading="lazy" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                            <Car size={32} />
                                            <span className="text-[10px] mt-1">No Image</span>
                                        </div>
                                    )}
                                    {/* 狀態標籤 (左上) */}
                                    <div className="absolute top-1 left-1">
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shadow-sm ${car.status==='In Stock'?'bg-green-500 text-white':(car.status==='Sold'?'bg-blue-600 text-white':(car.status==='Reserved'?'bg-yellow-500 text-white':'bg-gray-500 text-white'))}`}>
                                            {car.status === 'In Stock' ? '在庫' : (car.status === 'Sold' ? '已售' : (car.status === 'Reserved' ? '已訂' : '撤回'))}
                                        </span>
                                    </div>
                                </div>

                                {/* 右側：詳細資料 (佔 65%) */}
                                <div className="flex-1 p-3 flex flex-col justify-between" onClick={() => setEditingVehicle(car)}>
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col gap-1.5 items-start">
                                                {/* ★★★ 2. 擬真車牌顯示區 ★★★ */}
                                                
                                                {/* 香港車牌 (黃底黑字) */}
                                                <div className="bg-[#FFD600] text-black border-2 border-black font-black font-mono text-sm leading-none px-2 py-0.5 rounded-[2px] shadow-sm tracking-wide">
                                                    {car.regMark || '未出牌'}
                                                </div>

                                                {/* 國內車牌 (黑底白字 或 藍底白字) */}
                                                {car.crossBorder?.mainlandPlate && (
                                                    <div className={`${
                                                        (car.crossBorder.mainlandPlate.startsWith('粵Z')) 
                                                        ? 'bg-black text-white border-white'  // 港車北上/Z牌 -> 黑底
                                                        : 'bg-[#003399] text-white border-white' // 內地車掛HK牌 -> 藍底
                                                    } border font-bold font-mono text-[10px] leading-none px-1.5 py-0.5 rounded-[2px] shadow-sm tracking-wide`}>
                                                        {car.crossBorder.mainlandPlate}
                                                    </div>
                                                )}
                                                
                                                {/* 車型標題 */}
                                                <div className="text-xs text-slate-500 font-bold mt-0.5">
                                                    {car.year} {car.make} {car.model}
                                                </div>
                                            </div>
                                            
                                            {/* 價格與標籤 */}
                                            <div className="flex flex-col items-end">
                                                <span className="text-sm font-bold text-yellow-600">{formatCurrency(car.price)}</span>
                                                {/* ★★★ 3. 粵港/粵澳 標籤顯示區 ★★★ */}
                                                <div className="flex flex-col gap-1 mt-1 items-end">
                                                    {cbTags.map((tag, i) => (
                                                        <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded shadow-sm font-bold ${tag.color}`}>
                                                            {tag.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {/* 顏色 */}
                                            <div className="flex items-center text-[10px] bg-slate-50 px-1.5 py-0.5 rounded border">
                                                <div className="w-2 h-2 rounded-full border border-gray-300 mr-1" style={{ backgroundColor: getColorHex(car.colorExt) }}></div>
                                                {car.colorExt}
                                            </div>
                                            {/* 手數 */}
                                            <span className="text-[10px] bg-slate-50 px-1.5 py-0.5 rounded border text-slate-600">{car.previousOwners || 0}手</span>
                                            {/* CC */}
                                            {car.engineSize && <span className="text-[10px] bg-slate-50 px-1.5 py-0.5 rounded border text-slate-600">{car.engineSize}cc</span>}
                                        </div>
                                    </div>

                                    {/* 底部：操作按鈕 */}
                                    <div className="flex justify-between items-end mt-1">
                                        <div className="text-[10px] text-gray-400">
                                            {car.licenseExpiry ? `牌費: ${car.licenseExpiry}` : ''}
                                        </div>
                                        
                                        <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); setEditingVehicle(car); }} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"><Edit size={14}/></button>
                                            <button onClick={(e) => { e.stopPropagation(); deleteVehicle(car.id); }} className="p-1.5 bg-red-50 hover:bg-red-100 rounded text-red-500"><Trash2 size={14}/></button>
                                        </div>
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
                      storage={storage}
                      staffId={staffId}
                      appId={appId}
                      inventory={visibleInventory}
                      updateSettings={updateSettings}
                      addSystemLog={addSystemLog}
                      systemUsers={systemUsers}
                      updateSystemUsers={updateSystemUsers}
                  />
              </div>
          )}

        {activeTab === 'business' && (
             <BusinessProcessModule 
                db={db} 
                staffId={staffId} 
                appId={appId} 
                inventory={visibleInventory} 
                updateVehicle={updateVehicle} // ★ 關鍵：必須傳入此函數以更新流程狀態
            />
        )}

        {/* Create Doc Tab - v5.0: 傳入 db 參數以支援歷史紀錄 */}
        {activeTab === 'create_doc' && (
              <CreateDocModule 
                  inventory={visibleInventory} 
                  openPrintPreview={openPrintPreview} 
                  db={db}
                  staffId={staffId}
                  appId={appId}
              />
          )}
          
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
                  inventory={visibleInventory}
                  currentUser={currentUser} 
                  systemUsers={systemUsers}/>}
        

        {activeTab === 'media_center' && (
            <MediaLibraryModule 
                db={db} 
                storage={storage} 
                staffId={staffId} 
                appId={appId} 
                settings={settings}   // 新增
                inventory={visibleInventory} // 新增
            />
        )}

         </div>       
      </main>
    </div>
  );
}
