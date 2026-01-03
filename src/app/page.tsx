'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Car, FileText, LayoutDashboard, Plus, Printer, Trash2, DollarSign, 
  Menu, X, Building2, Database, Loader2, DownloadCloud, AlertTriangle, 
  Users, LogOut, UserCircle, ArrowRight, Settings, Save, Wrench, 
  Calendar, CheckCircle, XCircle, Filter, ChevronDown, ChevronUp, Edit,
  ArrowUpDown, Briefcase, BarChart3, FileBarChart, ExternalLink,
  StickyNote, CreditCard, Armchair, Fuel, Zap, Search, ChevronLeft, ChevronRight, Layout,
  Receipt, FileCheck, Globe, CalendarDays, Bell, ShieldCheck, Clock, CheckSquare,
  CreditCard as PaymentIcon, MapPin, Info, RefreshCw
} from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, 
  User, initializeAuth, browserLocalPersistence, inMemoryPersistence, Auth 
} from "firebase/auth";
import { 
  getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, 
  orderBy, serverTimestamp, writeBatch, Firestore, updateDoc, getDoc, setDoc 
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
  type: 'Deposit' | 'Part Payment' | 'Balance' | 'Full Payment' | 'Service Fee' | 'Refund'; 
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
    fee: number; // 應收費用金額 (Receivable)，可為負數
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
  cbItems: string[];
  cbInstitutions: string[];
};

type Customer = {
  name: string;
  phone: string;
  hkid: string;
  address: string;
};

type DocType = 'sales_contract' | 'purchase_contract' | 'invoice' | 'receipt';

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
  cbItems: ['批文延期', '禁區紙續期', '內地驗車', '海關年檢', '封關/解封', '換司機', '換車', '買保險'],
  cbInstitutions: ['廣東省公安廳', '香港運輸署', '中國檢驗有限公司', '梅林海關', '深圳灣口岸', '港珠澳大橋口岸']
};

const PORTS_HK_GD = ['皇崗', '深圳灣', '蓮塘', '沙頭角', '文錦渡', '大橋(港)'];
const PORTS_MO_GD = ['大橋(澳)', '關閘(拱北)', '橫琴', '青茂'];

const formatCurrency = (amount: number) => new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD' }).format(amount);
const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });

const formatNumberInput = (value: string) => {
  // Allow negative numbers
  let cleanVal = value.replace(/[^0-9.-]/g, '');
  
  // Ensure only one minus at start
  const isNegative = cleanVal.startsWith('-');
  cleanVal = cleanVal.replace(/-/g, '');
  
  // Ensure only one dot
  const parts = cleanVal.split('.');
  if (parts.length > 2) {
      cleanVal = parts[0] + '.' + parts.slice(1).join('');
  }

  if (!cleanVal) return isNegative ? '-' : '';

  const [integer, decimal] = cleanVal.split('.');
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  let result = formattedInteger;
  if (decimal !== undefined) {
      result += '.' + decimal;
  }
  
  return isNegative ? '-' + result : result;
};

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

// --- 主應用程式 ---
export default function GoldLandAutoDMS() {
  const [user, setUser] = useState<User | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'create_doc' | 'settings' | 'inventory_add' | 'reports' | 'cross_border'>('dashboard');
  
  // Data States
  const [inventory, setInventory] = useState<Vehicle[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  
  // UI States
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null); 
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null); 
  
  // Cross Border UI State
  const [activeCbVehicleId, setActiveCbVehicleId] = useState<string | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Doc Preview State (Updated for Multi-Item Selection)
  const [previewDoc, setPreviewDoc] = useState<{ 
      type: DocType, 
      vehicle: Vehicle, 
      selectedItems?: (Payment | CrossBorderTask)[] 
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
    // 設定 PWA/App Icon 及瀏覽器 Meta (強制覆蓋)
    const setAppIcon = () => {
        const iconPath = COMPANY_INFO.logo_url;
        const appName = "金田汽車DMS系統";
        
        const existingIcons = document.querySelectorAll("link[rel*='icon']");
        existingIcons.forEach(el => el.parentNode?.removeChild(el));

        const setLink = (rel: string, href: string) => {
            let link = document.createElement('link');
            link.rel = rel;
            link.href = href;
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

        document.title = appName;
        setLink('icon', iconPath);
        setLink('shortcut icon', iconPath);
        setLink('apple-touch-icon', iconPath); 

        setMeta('apple-mobile-web-app-title', appName); 
        setMeta('application-name', appName); 
        setMeta('apple-mobile-web-app-capable', 'yes');
        setMeta('mobile-web-app-capable', 'yes');

        setMeta('og:title', appName, true);
        setMeta('og:site_name', appName, true);
        setMeta('og:image', iconPath, true);
    };
    
    setAppIcon();
    
    const observer = new MutationObserver(() => {
        if (document.title !== "金田汽車DMS系統") {
            document.title = "金田汽車DMS系統";
        }
    });
    observer.observe(document.querySelector('title') || document.head, { subtree: true, characterData: true, childList: true });

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

  if (!staffId) return <StaffLoginScreen onLogin={setStaffId} />;

  // --- CRUD Actions ---

  const saveVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !staffId) return;
    const formData = new FormData(e.currentTarget);
    const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
    
    const status = formData.get('status') as any;
    const priceRaw = formData.get('price') as string;
    const costPriceRaw = formData.get('costPrice') as string;
    const mileageRaw = formData.get('mileage') as string;
    
    const priceA1Raw = formData.get('priceA1') as string;
    const priceTaxRaw = formData.get('priceTax') as string;
    const valA1 = Number(priceA1Raw.replace(/,/g, '') || 0);
    const valTax = Number(priceTaxRaw.replace(/,/g, '') || 0);
    const valRegistered = valA1 + valTax;

    const fuelType = formData.get('fuelType') as 'Petrol' | 'Diesel' | 'Electric';
    const engineSizeRaw = formData.get('engineSize') as string;
    const engineSize = Number(engineSizeRaw.replace(/,/g, '') || 0);
    const licenseFee = calculateLicenseFee(fuelType, engineSize);

    // Cross Border Data Capture - with safe defaults and multi-select handling
    const cbEnabled = formData.get('cb_isEnabled') === 'on';
    
    // Get all selected ports
    const selectedPorts: string[] = [];
    [...PORTS_HK_GD, ...PORTS_MO_GD].forEach(port => {
        if (formData.get(`cb_port_${port}`) === 'on') {
            selectedPorts.push(port);
        }
    });

    const crossBorderData: CrossBorderData = {
        isEnabled: cbEnabled,
        mainlandPlate: formData.get('cb_mainlandPlate') as string || '',
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
      setEditingVehicle(null);
      // Determine where to go back
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
    if (!db || !staffId) return;
    const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
    const v = inventory.find(v => v.id === vehicleId);
    if (!v) return;

    let updateData = {};
    let newVehicleState = { ...v };

    if (field === 'crossBorder') {
        updateData = { crossBorder: { ...v.crossBorder, tasks: newItems } };
        newVehicleState.crossBorder = { ...v.crossBorder!, tasks: newItems };
    } else {
        updateData = { [field]: newItems };
        newVehicleState[field] = newItems;
    }

    await updateDoc(doc(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'inventory', vehicleId), updateData);
    
    // !!! CRITICAL FIX: Update local editing state to prevent data loss on next save !!!
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
      const v = inventory.find(v => v.id === vehicleId);
      if (!v) return;
      const newTasks = (v.crossBorder?.tasks || []).map(t => t.id === updatedTask.id ? updatedTask : t);
      updateSubItem(vehicleId, 'crossBorder', newTasks);
  };

  const deleteCbTask = async (vehicleId: string, taskId: string) => {
      if (!db || !staffId) return;
      const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
      const v = inventory.find(v => v.id === vehicleId);
      if (!v) return;
      
      const newTasks = (v.crossBorder?.tasks || []).filter(t => t.id !== taskId);
      const newPayments = (v.payments || []).filter(p => p.relatedTaskId !== taskId);

      await updateDoc(doc(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'inventory', vehicleId), {
          crossBorder: { ...v.crossBorder, tasks: newTasks },
          payments: newPayments
      });

      // Update local state as well
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

  // Settings
  const updateSettings = async (key: keyof SystemSettings, newItem: string, action: 'add' | 'remove', parentKey?: string) => {
    if (!db || !staffId) return;
    const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
    let newSettings = { ...settings };

    if (key === 'models' && parentKey) {
        const currentModels = newSettings.models[parentKey] || [];
        let newModelsList = [...currentModels];
        if (action === 'add' && newItem && !newModelsList.includes(newItem)) newModelsList.push(newItem);
        else if (action === 'remove') newModelsList = newModelsList.filter(item => item !== newItem);
        newSettings.models = { ...newSettings.models, [parentKey]: newModelsList };
    } else {
        const list = settings[key] as string[];
        let newList = [...list];
        if (action === 'add' && newItem && !newList.includes(newItem)) {
            newList.push(newItem);
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
  const openPrintPreview = (type: DocType, vehicle: Vehicle, selectedItems?: any[]) => {
    setPreviewDoc({ type, vehicle, selectedItems: selectedItems || [] });
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

        // 額外加入單獨的中港業務費用 (如果只是代辦)
        inventory.forEach(v => {
            (v.crossBorder?.tasks || []).forEach(task => {
                const isPaid = v.payments?.some(p => p.relatedTaskId === task.id);
                if (task.fee > 0 && !isPaid && (!data.some(d => d.vehicleId === v.id))) {
                    data.push({
                        vehicleId: v.id,
                        date: v.stockOutDate || v.stockInDate || 'Unknown',
                        title: `${v.year} ${v.make} ${v.model} (中港業務)`,
                        regMark: v.regMark,
                        amount: task.fee,
                        status: 'Service'
                    });
                }
            });
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
            const totalRevenue = v.price + cbFees;
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
    
    // Identify pending CB tasks (not paid)
    const pendingCbTasks = (v.crossBorder?.tasks || []).filter(t => (t.fee || 0) !== 0 && !(v.payments || []).some(p => p.relatedTaskId === t.id));

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

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs text-gray-500">客戶姓名 (Customer Name)</label><input name="customerName" defaultValue={v.customerName} className="w-full border p-2 rounded"/></div>
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
                
                {/* 修正點：即使收合也要保留在 DOM 中，以防 saveVehicle 讀取失敗 */}
                <div 
                    className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-blue-50 p-4 rounded border border-blue-100 animate-fade-in"
                    style={{ display: isCbExpanded ? 'grid' : 'none' }}
                >
                    <div className="md:col-span-1"><label className="text-[10px] text-blue-800 font-bold">內地車牌 (Mainland Plate)</label><input name="cb_mainlandPlate" defaultValue={v.crossBorder?.mainlandPlate} placeholder="粵Z..." className="w-full border p-1 rounded text-sm"/></div>
                    <div className="md:col-span-1"><label className="text-[10px] text-blue-800 font-bold">指標號 (Quota No.)</label><input name="cb_quotaNumber" defaultValue={v.crossBorder?.quotaNumber} className="w-full border p-1 rounded text-sm"/></div>
                    <div className="md:col-span-1"><label className="text-[10px] text-blue-800 font-bold">保險代理 (Agent)</label><input name="cb_insuranceAgent" defaultValue={v.crossBorder?.insuranceAgent} className="w-full border p-1 rounded text-sm"/></div>
                    <div className="md:col-span-1"></div>

                    {/* 司機資訊 */}
                    <div className="md:col-span-1"><label className="text-[10px] text-blue-800 font-bold">主司機 (Main Driver)</label><input name="cb_driver1" defaultValue={v.crossBorder?.driver1} className="w-full border p-1 rounded text-sm"/></div>
                    <div className="md:col-span-1"><label className="text-[10px] text-blue-800 font-bold">副司機 1 (Driver 2)</label><input name="cb_driver2" defaultValue={v.crossBorder?.driver2} className="w-full border p-1 rounded text-sm"/></div>
                    <div className="md:col-span-1"><label className="text-[10px] text-blue-800 font-bold">副司機 2 (Driver 3)</label><input name="cb_driver3" defaultValue={v.crossBorder?.driver3} className="w-full border p-1 rounded text-sm"/></div>
                    
                    {/* 口岸選擇 (多選) */}
                    <div className="md:col-span-4 border-t border-blue-200 mt-2 pt-2">
                        <label className="text-[10px] text-blue-800 font-bold block mb-1">通行口岸 (Ports - Select multiple)</label>
                        <div className="flex flex-wrap gap-3">
                            {[...AVAILABLE_PORTS, ...PORTS_MO_GD].map(port => (
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
                    <button type="button" onClick={() => setActiveTab('create_doc')} className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded text-xs hover:bg-blue-50 flex items-center"><FileText size={12} className="mr-1"/> 開立單據 (新)</button>
                </div>

                <table className="w-full text-sm bg-white border mb-4">
                  <thead><tr className="bg-blue-100 text-left"><th className="p-2">日期</th><th className="p-2">類型</th><th className="p-2">方式</th><th className="p-2">金額</th><th className="p-2">備注</th><th className="p-2">操作</th></tr></thead>
                  <tbody>
                    {/* 已收款項 */}
                    {(v.payments || []).map(pay => (
                      <tr key={pay.id} className="border-t">
                        <td className="p-2">{pay.date}</td><td className="p-2">{pay.type}</td><td className="p-2">{pay.method}</td><td className="p-2 font-mono font-bold">{formatCurrency(pay.amount)}</td><td className="p-2 text-gray-500 text-xs">{pay.note}</td>
                        <td className="p-2 flex gap-2">
                             <button type="button" onClick={() => openPrintPreview('receipt', v as Vehicle, [pay])} className="text-blue-500 hover:text-blue-700 flex items-center text-xs"><Printer size={12} className="mr-1"/> 收據</button>
                             {/* 若是中港相關付款，禁止在此刪除 */}
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
                   <div className="col-span-1"><button type="button" onClick={(e) => {e.preventDefault(); const amount = Number(newPayment.amount.replace(/,/g, '')); if(amount !== 0) { addPayment(v.id!, { id: Date.now().toString(), ...newPayment, amount } as Payment); setNewPayment({...newPayment, amount: '', note: ''}); }}} className="w-full bg-blue-600 text-white p-1 rounded text-xs h-[26px]">新增收款</button></div>
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
                  <div className="col-span-1"><button type="button" onClick={(e) => {e.preventDefault(); const amt=Number(newExpense.amount.replace(/,/g,'')); if(amt!==0){addExpense(v.id!, {id:Date.now().toString(), ...newExpense, amount:amt} as any); setNewExpense({...newExpense, amount:''});}}} className="w-full bg-slate-600 text-white p-1 rounded text-xs h-[26px]">新增</button></div>
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
// ... rest of the code is implicitly included by the user's overwrite request ...
