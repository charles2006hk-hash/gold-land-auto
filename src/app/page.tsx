'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Car, FileText, LayoutDashboard, Plus, Printer, Trash2, DollarSign, 
  Menu, X, Building2, Database, Loader2, DownloadCloud, AlertTriangle, 
  Users, LogOut, UserCircle, ArrowRight, Settings, Save, Wrench, 
  Calendar, CheckCircle, XCircle, Filter, ChevronDown, ChevronUp, Edit,
  ArrowUpDown, Briefcase, BarChart3, FileBarChart, ExternalLink,
  StickyNote, CreditCard, Armchair, Fuel, Zap, Search, ChevronLeft, ChevronRight, Layout,
  Receipt, FileCheck
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
  logo_url: "/GL_APPLOGO.png" // 更新 Logo 路徑
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
  type: 'Deposit' | 'Part Payment' | 'Balance' | 'Full Payment';
  amount: number;
  method: 'Cash' | 'Cheque' | 'Transfer';
  note?: string; 
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

  createdAt?: any;
  updatedAt?: any;
};

type SystemSettings = {
  makes: string[];
  models: Record<string, string[]>; 
  expenseTypes: string[];
  expenseCompanies: string[]; 
  colors: string[];
};

type Customer = {
  name: string;
  phone: string;
  hkid: string;
  address: string;
};

type DocType = 'sales_contract' | 'purchase_contract' | 'invoice' | 'receipt';

// 更新預設設定，加入汽缸容量範例
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
  expenseTypes: ['車輛維修', '噴油', '執車(Detailing)', '政府牌費', '驗車費', '保險', '拖車費', '佣金', '其他'],
  expenseCompanies: ['金田維修部', 'ABC車房', '政府牌照局', '友邦保險', '自家'], 
  colors: ['白 (White)', '黑 (Black)', '銀 (Silver)', '灰 (Grey)', '藍 (Blue)', '紅 (Red)', '金 (Gold)', '綠 (Green)']
};

const formatCurrency = (amount: number) => new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD' }).format(amount);
const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });

const formatNumberInput = (value: string) => {
  const cleanVal = value.replace(/[^0-9.]/g, '');
  if (!cleanVal) return '';
  const parts = cleanVal.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
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
          {/* Logo 顯示 */}
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'create_doc' | 'settings' | 'inventory_add' | 'reports'>('dashboard');
  
  // Data States
  const [inventory, setInventory] = useState<Vehicle[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  
  // UI States
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null); 
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Doc Preview State
  const [previewDoc, setPreviewDoc] = useState<{ type: DocType, vehicle: Vehicle, payment?: Payment } | null>(null);

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
    // 設定 PWA/App Icon 及瀏覽器 Meta
    const setAppIcon = () => {
        const iconPath = COMPANY_INFO.logo_url;
        const appName = "金田汽車DMS系統";
        
        // 1. 強制移除現有的 icon 以確保覆蓋
        const existingIcons = document.querySelectorAll("link[rel*='icon']");
        existingIcons.forEach(el => el.remove());

        // 2. Helper to set link tags
        const setLink = (rel: string, href: string) => {
            let link = document.createElement('link');
            link.rel = rel;
            link.href = href;
            document.getElementsByTagName('head')[0].appendChild(link);
        };

        // 3. Helper to set meta tags
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

        // Browser & PWA Basic Settings
        document.title = appName;
        setLink('icon', iconPath);
        setLink('shortcut icon', iconPath);
        setLink('apple-touch-icon', iconPath); 

        // PWA / Mobile Web App Meta Tags
        setMeta('apple-mobile-web-app-title', appName); 
        setMeta('application-name', appName); 
        setMeta('apple-mobile-web-app-capable', 'yes');
        setMeta('mobile-web-app-capable', 'yes');

        // Open Graph / Social Sharing
        setMeta('og:title', appName, true);
        setMeta('og:site_name', appName, true);
        setMeta('og:image', iconPath, true);
    };
    setAppIcon();

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
            expenseCompanies: loadedSettings.expenseCompanies || DEFAULT_SETTINGS.expenseCompanies
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
      updatedAt: serverTimestamp()
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
      setActiveTab('inventory');
    } catch (e) { alert('儲存失敗'); console.error(e); }
  };

  const deleteVehicle = async (id: string) => {
    if (!db || !staffId) return;
    if (confirm('確定刪除？資料將無法復原。')) {
      const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
      await deleteDoc(doc(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'inventory', id));
    }
  };

  // --- Sub-Item Management ---
  const updateSubItem = async (vehicleId: string, field: 'expenses'|'payments', newItems: any[]) => {
    if (!db || !staffId) return;
    const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
    const v = inventory.find(v => v.id === vehicleId);
    if (!v) return;

    await updateDoc(doc(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'inventory', vehicleId), {
      [field]: newItems
    });
    if (editingVehicle && editingVehicle.id === vehicleId) {
        setEditingVehicle({ ...editingVehicle, [field]: newItems });
    }
  };

  const addExpense = (vehicleId: string, expense: Expense) => {
    const v = inventory.find(v => v.id === vehicleId);
    if (!v) return;
    updateSubItem(vehicleId, 'expenses', [...(v.expenses || []), expense]);
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
      if (car.status === 'In Stock') totalStockValue += car.price;
      car.expenses?.forEach(exp => {
        if (exp.status === 'Unpaid') totalPayable += exp.amount;
      });
      if (car.status === 'Sold') {
        const received = car.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
        const balance = (car.price || 0) - received;
        totalReceivable += balance > 0 ? balance : 0;
        totalSoldThisMonth += car.price;
      }
    });

    return { totalStockValue, totalReceivable, totalPayable, totalSoldThisMonth };
  };
  const stats = dashboardStats();

  // --- Print Handling ---
  const openPrintPreview = (type: DocType, vehicle: Vehicle, payment?: Payment) => {
    setPreviewDoc({ type, vehicle, payment });
    setIsPreviewMode(true);
  };

  // --- Report Logic ---
  const generateReportData = () => {
    let data: any[] = [];
    
    if (reportType === 'receivable') {
        data = inventory.filter(v => {
            const received = v.payments?.reduce((s, p) => s + p.amount, 0) || 0;
            const balance = (v.price || 0) - received;
            return v.status === 'Sold' && 
                   (!reportStartDate || (v.stockOutDate || '') >= reportStartDate) &&
                   (!reportEndDate || (v.stockOutDate || '') <= reportEndDate) &&
                   balance > 0; // 只顯示還有餘額的
        }).map(v => ({
            vehicleId: v.id,
            date: v.stockOutDate || 'Unknown',
            title: `${v.year} ${v.make} ${v.model}`,
            regMark: v.regMark,
            amount: (v.price || 0) - (v.payments?.reduce((s, p) => s + p.amount, 0) || 0), // 顯示剩餘金額
            status: 'Sold'
        }));
    } else if (reportType === 'payable') {
        inventory.forEach(v => {
            v.expenses?.forEach(exp => {
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
            const totalCost = (v.costPrice || 0) + (v.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0);
            const profit = v.price - totalCost;
            return {
                vehicleId: v.id,
                date: v.stockOutDate,
                title: `${v.year} ${v.make} ${v.model}`,
                regMark: v.regMark,
                amount: v.price, 
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
    
    const [priceStr, setPriceStr] = useState(formatNumberInput(String(v.price || '')));
    const [costStr, setCostStr] = useState(formatNumberInput(String(v.costPrice || '')));
    const [mileageStr, setMileageStr] = useState(formatNumberInput(String(v.mileage || '')));
    const [priceA1Str, setPriceA1Str] = useState(formatNumberInput(String(v.priceA1 || '')));
    const [priceTaxStr, setPriceTaxStr] = useState(formatNumberInput(String(v.priceTax || '')));
    const [fuelType, setFuelType] = useState<'Petrol'|'Diesel'|'Electric'>(v.fuelType || 'Petrol');
    const [engineSizeStr, setEngineSizeStr] = useState(formatNumberInput(String(v.engineSize || '')));
    const [autoLicenseFee, setAutoLicenseFee] = useState(v.licenseFee || 0);

    const totalReceived = v.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const balance = (v.price || 0) - totalReceived; 

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
            <button onClick={() => {setEditingVehicle(null); setActiveTab('inventory');}}><X /></button>
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
            
            <div className="md:col-span-3 border-t my-2 pt-2"><h3 className="font-bold text-gray-500 mb-2">車輛資料</h3></div>
            <div><label className="block text-xs font-bold text-gray-500">收購類型</label><select name="purchaseType" defaultValue={v.purchaseType || 'Used'} className="w-full border p-2 rounded bg-gray-50"><option value="Used">二手收購 (Used)</option><option value="New">訂購新車 (New)</option><option value="Consignment">寄賣 (Consignment)</option></select></div>
            <div><label className="block text-xs font-bold text-gray-500">車牌 (Reg. Mark)</label><input name="regMark" defaultValue={v.regMark} placeholder="未出牌可留空" className="w-full border p-2 rounded"/></div>
            <div><label className="block text-xs font-bold text-gray-500">牌費到期日</label><input name="licenseExpiry" type="date" defaultValue={v.licenseExpiry} className="w-full border p-2 rounded"/></div>
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

            {/* 交易管理 */}
            {editingVehicle && (
              <div className="md:col-span-3 mt-6 bg-blue-50 p-4 rounded border border-blue-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold flex items-center text-blue-900"><DollarSign size={16} className="mr-2"/> 銷售與收款記錄 (Payments)</h3>
                    <div className="text-right text-sm">
                        <span className="mr-4 text-gray-600">總價: <strong>{formatCurrency(v.price || 0)}</strong></span>
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
                    {v.payments?.map(pay => (
                      <tr key={pay.id} className="border-t">
                        <td className="p-2">{pay.date}</td><td className="p-2">{pay.type}</td><td className="p-2">{pay.method}</td><td className="p-2 font-mono font-bold">{formatCurrency(pay.amount)}</td><td className="p-2 text-gray-500 text-xs">{pay.note}</td>
                        <td className="p-2 flex gap-2"><button type="button" onClick={() => openPrintPreview('receipt', v as Vehicle, pay)} className="text-blue-500 hover:text-blue-700 flex items-center text-xs"><Printer size={12} className="mr-1"/> 收據</button><button type="button" onClick={() => deletePayment(v.id!, pay.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></td>
                      </tr>
                    ))}
                    {(!v.payments || v.payments.length === 0) && <tr><td colSpan={6} className="p-4 text-center text-gray-400">暫無收款記錄</td></tr>}
                  </tbody>
                </table>

                <div className="grid grid-cols-6 gap-2 items-end bg-blue-100 p-2 rounded">
                   <div className="col-span-1"><label className="text-[10px]">日期</label><input type="date" value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} className="w-full border p-1 rounded text-xs"/></div>
                   <div className="col-span-1"><label className="text-[10px]">類型</label><select value={newPayment.type} onChange={e => setNewPayment({...newPayment, type: e.target.value as any})} className="w-full border p-1 rounded text-xs"><option>Deposit</option><option>Part Payment</option><option>Balance</option><option>Full Payment</option></select></div>
                   <div className="col-span-1"><label className="text-[10px]">方式</label><select value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value as any})} className="w-full border p-1 rounded text-xs"><option>Cash</option><option>Cheque</option><option>Transfer</option></select></div>
                   <div className="col-span-1"><label className="text-[10px]">金額</label><input type="text" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: formatNumberInput(e.target.value)})} className="w-full border p-1 rounded text-xs" placeholder="0"/></div>
                   <div className="col-span-1"><label className="text-[10px]">備注</label><input type="text" value={newPayment.note} onChange={e => setNewPayment({...newPayment, note: e.target.value})} className="w-full border p-1 rounded text-xs" placeholder="支票號/備注"/></div>
                   <div className="col-span-1"><button type="button" onClick={(e) => {e.preventDefault(); const amount = Number(newPayment.amount.replace(/,/g, '')); if(amount > 0) { addPayment(v.id!, { id: Date.now().toString(), ...newPayment, amount } as Payment); setNewPayment({...newPayment, amount: '', note: ''}); }}} className="w-full bg-blue-600 text-white p-1 rounded text-xs hover:bg-blue-700 h-[26px]">新增收款</button></div>
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
                    {v.expenses?.map(exp => (
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
              <button type="button" onClick={() => {setEditingVehicle(null); setActiveTab('inventory');}} className="px-6 py-2 border rounded hover:bg-gray-50">取消</button>
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

  // 3. Settings Manager
  const SettingsManager = () => {
    const [activeMake, setActiveMake] = useState<string>(settings.makes[0] || '');

    return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-6 flex items-center"><Settings className="mr-2"/> 系統參數設置 (System Settings)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-50 p-4 rounded border">
            <h3 className="font-bold mb-3 text-sm uppercase text-gray-600">車輛廠牌 (Level 1)</h3>
            <div className="flex gap-2 mb-3"><input id="new-makes" placeholder="新增廠牌..." className="flex-1 border p-2 rounded text-sm"/><button onClick={() => {const input = document.getElementById("new-makes") as HTMLInputElement; if(input.value) { updateSettings('makes', input.value, 'add'); input.value=''; }}} className="bg-slate-800 text-white px-3 rounded hover:bg-slate-700"><Plus size={16}/></button></div>
            <ul className="space-y-1 max-h-40 overflow-y-auto mb-4">{settings.makes.map(make => (<li key={make} onClick={() => setActiveMake(make)} className={`flex justify-between items-center p-2 rounded border text-sm cursor-pointer ${activeMake===make ? 'bg-yellow-100 border-yellow-300 ring-1 ring-yellow-300' : 'bg-white hover:bg-gray-100'}`}><span>{make}</span><button onClick={(e) => { e.stopPropagation(); updateSettings('makes', make, 'remove'); }} className="text-red-400 hover:text-red-600"><X size={14}/></button></li>))}</ul>
        </div>
        <div className="bg-gray-50 p-4 rounded border">
            <h3 className="font-bold mb-3 text-sm uppercase text-gray-600">型號列表 (Level 2: {activeMake})</h3>
            {!activeMake ? <p className="text-gray-400 text-xs">請先選擇左側廠牌</p> : (<><div className="flex gap-2 mb-3"><input id="new-models" placeholder={`新增 ${activeMake} 型號 (e.g. 2.5)...`} className="flex-1 border p-2 rounded text-sm"/><button onClick={() => {const input = document.getElementById("new-models") as HTMLInputElement; if(input.value) { updateSettings('models', input.value, 'add', activeMake); input.value=''; }}} className="bg-slate-800 text-white px-3 rounded hover:bg-slate-700"><Plus size={16}/></button></div><ul className="space-y-1 max-h-40 overflow-y-auto">{(settings.models[activeMake] || []).map(model => (<li key={model} className="flex justify-between items-center bg-white p-2 rounded border text-sm"><span>{model}</span><button onClick={() => updateSettings('models', model, 'remove', activeMake)} className="text-red-400 hover:text-red-600"><X size={14}/></button></li>))}</ul></>)}
        </div>
        <div className="bg-gray-50 p-4 rounded border md:col-span-2">
            <h3 className="font-bold mb-3 text-sm uppercase text-gray-600">其他設定</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[{ key: 'expenseTypes', title: '費用類別', placeholder: 'e.g. 驗車費' }, { key: 'expenseCompanies', title: '費用負責公司', placeholder: 'e.g. ABC車房' }, { key: 'colors', title: '顏色列表', placeholder: 'e.g. 香檳金' }].map(section => (
                    <div key={section.key}><h4 className="text-xs font-bold mb-2">{section.title}</h4><div className="flex gap-2 mb-2"><input id={`new-${section.key}`} placeholder={section.placeholder} className="flex-1 border p-1 rounded text-xs"/><button onClick={() => {const input = document.getElementById(`new-${section.key}`) as HTMLInputElement; if(input.value) { updateSettings(section.key as keyof SystemSettings, input.value, 'add'); input.value=''; }}} className="bg-slate-600 text-white px-2 rounded hover:bg-slate-500"><Plus size={14}/></button></div><ul className="space-y-1 max-h-40 overflow-y-auto">{((settings[section.key as keyof SystemSettings] || []) as string[]).map(item => (<li key={item} className="flex justify-between items-center bg-white p-1 rounded border text-xs"><span>{item}</span><button onClick={() => updateSettings(section.key as keyof SystemSettings, item, 'remove')} className="text-red-400 hover:text-red-600"><X size={12}/></button></li>))}</ul></div>
                ))}
            </div>
        </div>
      </div>
    </div>
    );
  };

  const CompanyStamp = () => (<div className="w-[22mm] h-[22mm] rounded-full flex flex-col items-center justify-center transform -rotate-12 opacity-90 pointer-events-none select-none mix-blend-multiply" style={{ color: '#2b3d90', border: '2px solid #2b3d90', boxShadow: 'inset 0 0 0 1px rgba(43, 61, 144, 0.2), 0 0 2px rgba(43, 61, 144, 0.4)', backgroundColor: 'rgba(43, 61, 144, 0.02)', mixBlendMode: 'multiply' }}><div className="w-[90%] h-[90%] rounded-full flex flex-col items-center justify-center p-[1px]" style={{ border: '1px solid #2b3d90' }}><div className="absolute w-full h-full"><svg viewBox="0 0 100 100" className="w-full h-full absolute top-0 left-0"><defs><path id="textCircle" d="M 12, 50 A 38, 38 0 1, 1 88, 50" /></defs><text fontSize="11" fontWeight="bold" fill="#2b3d90" letterSpacing="1"><textPath href="#textCircle" startOffset="50%" textAnchor="middle">GOLD LAND AUTO</textPath></text></svg></div><div className="flex flex-col items-center justify-center mt-2 z-10"><span className="text-[6px] font-bold leading-none tracking-widest" style={{ textShadow: '0 0 0.5px #2b3d90' }}>金田</span><span className="text-[6px] font-bold leading-none tracking-widest mt-[1px]" style={{ textShadow: '0 0 0.5px #2b3d90' }}>汽車</span></div><div className="absolute bottom-1 text-[8px] font-bold text-[#2b3d90]">*</div></div></div>);
  const SignedStamp = () => (<div className="relative w-[50mm] h-[30mm] flex items-center justify-center"><svg viewBox="0 0 200 100" className="absolute top-0 left-0 w-full h-full pointer-events-none z-0" style={{ overflow: 'visible' }}><defs><filter id="ink-spread"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" /></filter></defs><path d="M20,60 C40,40 60,80 90,50 C110,30 130,70 160,40 C170,30 180,60 190,50" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" style={{ filter: 'url(#ink-spread)', opacity: 0.85 }} /><path d="M30,70 C60,60 120,60 180,55" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" style={{ filter: 'url(#ink-spread)', opacity: 0.9 }} /><path d="M50,40 Q40,80 60,70 T80,60" fill="none" stroke="black" strokeWidth="2.5" style={{ filter: 'url(#ink-spread)', opacity: 0.8 }} /></svg><div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2 w-[22mm] h-[22mm] flex items-center justify-center z-10 pointer-events-none select-none"><CompanyStamp /></div></div>);
  
  // ★★★ UPDATED DOCUMENT TEMPLATE TO FIX WHITE SCREEN ★★★
  const DocumentTemplate = () => {
    // 優先使用 previewDoc，否則使用 selectedVehicle
    const activeVehicle = previewDoc?.vehicle || selectedVehicle;
    const activeType = previewDoc?.type || docType;
    const activePayment = previewDoc?.payment;

    // 如果完全沒有車輛資料，則無法渲染
    if (!activeVehicle) return null; 

    // Handle missing ID safely for new vehicles to prevent crashes
    const safeVehicleId = activeVehicle.id || 'DRAFT';
    const displayId = safeVehicleId.length > 6 ? safeVehicleId.slice(0, 6) : safeVehicleId;

    // 從車輛資料獲取客戶資料 (如果有的話)，否則使用 legacy customer state
    const curCustomer = {
        name: activeVehicle.customerName || customer.name || '',
        phone: activeVehicle.customerPhone || customer.phone || '',
        hkid: activeVehicle.customerID || customer.hkid || '',
        address: activeVehicle.customerAddress || customer.address || ''
    };

    const today = formatDate(new Date()); 
    // 計算付款總額
    const totalPaid = activeVehicle.payments?.reduce((sum, p) => sum + p.amount, 0) || deposit || 0;
    const balance = (activeVehicle.price || 0) - totalPaid;

    const Header = ({ titleEn, titleCh }: { titleEn: string, titleCh: string }) => (
        <div className="mb-8">
            <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-2">
                <div className="w-24 h-24 flex-shrink-0 mr-4 flex items-center justify-center border border-gray-200 bg-white rounded-lg overflow-hidden relative">
                    {/* 文件 Logo */}
                    <img src={COMPANY_INFO.logo_url} alt="Logo" className="w-full h-full object-contain p-1" onError={(e) => { e.currentTarget.style.display='none'; }}/>
                    <div className="absolute inset-0 flex items-center justify-center -z-10 text-gray-200"><Building2 size={32} /></div>
                </div>
                <div className="flex-1 text-right">
                    <h1 className="text-3xl font-bold tracking-wide text-black">{COMPANY_INFO.name_en}</h1>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{COMPANY_INFO.name_ch}</h2>
                    <div className="text-xs text-gray-600 space-y-1">
                        <p>{COMPANY_INFO.address_en}</p>
                        <p>{COMPANY_INFO.address_ch}</p>
                        <p className="font-bold">Tel: {COMPANY_INFO.phone}</p>
                    </div>
                </div>
            </div>
            <div className="text-center mt-6">
                <h2 className="text-xl font-bold uppercase underline decoration-2 underline-offset-4">{titleEn}</h2>
                <h3 className="text-lg font-bold mt-1">{titleCh}</h3>
            </div>
        </div>
    ); 

    const VehicleTable = () => (
        <table className="w-full border-collapse border border-black mb-6 text-sm">
            <tbody>
                <tr>
                    <td className="border border-black p-2 bg-gray-100 font-bold w-1/4">車牌號碼 (Reg. Mark)</td>
                    <td className="border border-black p-2 w-1/4 font-mono font-bold text-lg">{activeVehicle.regMark}</td>
                    <td className="border border-black p-2 bg-gray-100 font-bold w-1/4">製造年份 (Year)</td>
                    <td className="border border-black p-2 w-1/4">{activeVehicle.year}</td>
                </tr>
                <tr>
                    <td className="border border-black p-2 bg-gray-100 font-bold">廠名 (Make)</td>
                    <td className="border border-black p-2">{activeVehicle.make}</td>
                    <td className="border border-black p-2 bg-gray-100 font-bold">型號 (Model)</td>
                    <td className="border border-black p-2">{activeVehicle.model}</td>
                </tr>
                <tr>
                    <td className="border border-black p-2 bg-gray-100 font-bold">顏色 (Color)</td>
                    <td className="border border-black p-2">{activeVehicle.colorExt} / {activeVehicle.colorInt}</td>
                    <td className="border border-black p-2 bg-gray-100 font-bold">收購類別</td>
                    <td className="border border-black p-2">{activeVehicle.purchaseType === 'New' ? '新車' : (activeVehicle.purchaseType === 'Consignment' ? '寄賣' : '二手')}</td>
                </tr>
                <tr>
                    <td className="border border-black p-2 bg-gray-100 font-bold">底盤號碼 (Chassis)</td>
                    <td className="border border-black p-2 font-mono" colSpan={3}>{activeVehicle.chassisNo}</td>
                </tr>
                <tr>
                    <td className="border border-black p-2 bg-gray-100 font-bold">引擎號碼 (Engine)</td>
                    <td className="border border-black p-2 font-mono" colSpan={3}>{activeVehicle.engineNo}</td>
                </tr>
            </tbody>
        </table>
    );

    if (activeType === 'sales_contract') return (
        <div className="max-w-[210mm] mx-auto bg-white p-10 min-h-[297mm] text-black relative">
            <Header titleEn="Sales & Purchase Agreement" titleCh="汽車買賣合約" />
            <div className="flex justify-between mb-4 text-sm border-b pb-2">
                <span>合約編號: <span className="font-mono font-bold">SLA-{today.replace(/\//g,'')}-{displayId}</span></span>
                <span>日期: {today}</span>
            </div>
            <div className="mb-6">
                <h3 className="font-bold border-b-2 border-gray-800 mb-2 bg-gray-100 p-1">甲、買方資料</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-gray-500 text-xs">姓名</p><p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{curCustomer.name}</p></div>
                    <div><p className="text-gray-500 text-xs">電話</p><p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{curCustomer.phone}</p></div>
                    <div><p className="text-gray-500 text-xs">身份證</p><p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{curCustomer.hkid}</p></div>
                    <div className="col-span-2"><p className="text-gray-500 text-xs">地址</p><p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{curCustomer.address}</p></div>
                </div>
            </div>
            <div className="mb-6">
                <h3 className="font-bold border-b-2 border-gray-800 mb-2 bg-gray-100 p-1">乙、車輛資料</h3>
                <VehicleTable />
            </div>
            <div className="mb-6">
                <h3 className="font-bold border-b-2 border-gray-800 mb-2 bg-gray-100 p-1">丙、交易款項</h3>
                <div className="text-sm space-y-3 px-2">
                    <div className="flex justify-between items-end border-b border-dotted border-gray-400 pb-1"><span>成交價:</span><span className="font-bold text-lg">{formatCurrency(activeVehicle.price || 0)}</span></div>
                    <div className="flex justify-between items-end border-b border-dotted border-gray-400 pb-1"><span>已付訂金/款項:</span><span className="text-lg">{formatCurrency(totalPaid)}</span></div>
                    <div className="flex justify-between items-end border-b-2 border-black pb-1 mt-2"><span className="font-bold">尚餘尾數:</span><span className="font-bold text-xl">{formatCurrency(balance)}</span></div>
                </div>
            </div>
            <div className="mb-8 text-[11px] text-justify leading-relaxed text-gray-700">
                <h3 className="font-bold mb-1 text-sm text-black">條款及細則:</h3>
                <ol className="list-decimal pl-4 space-y-1">
                    <li>買方已親自驗收上述車輛，同意以「現狀」成交。</li>
                    <li>如買方悔約，賣方有權沒收所有訂金。</li>
                    <li>賣方保證上述車輛並無涉及任何未清之財務按揭。</li>
                </ol>
            </div>
            <div className="grid grid-cols-2 gap-16 mt-12">
                <div className="relative">
                    <div className="border-t border-black pt-2 text-center">
                        <p className="font-bold">賣方簽署及公司蓋印</p>
                        <p className="text-xs text-gray-500">Authorized Signature & Chop</p>
                        <p className="text-xs font-bold mt-1">For and on behalf of<br/>{COMPANY_INFO.name_en}</p>
                    </div>
                    <div className="mb-2 absolute -top-8 left-1/2 transform -translate-x-1/2"><SignedStamp /></div>
                </div>
                <div>
                    <div className="border-t border-black pt-2 text-center">
                        <p className="font-bold">買方簽署</p>
                        <p className="text-xs text-gray-500">Purchaser Signature</p>
                    </div>
                </div>
            </div>
        </div>
    );

    // Default template (Invoice / Receipt)
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
                            {activePayment ? `-${activePayment.id.slice(-4)}` : ''}
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs">Date</p>
                        <p className="font-bold">{today}</p>
                    </div>
                </div>
            </div>
            
            <VehicleTable />

            <div className="mt-8 border-t-2 border-black pt-4">
               {activePayment ? (
                   <>
                    <div className="flex justify-between items-center mb-2"><span>Payment Type:</span><span className="font-mono">{activePayment.type} ({activePayment.method})</span></div>
                    <div className="flex justify-between items-center mb-2"><span>Note:</span><span className="font-mono">{activePayment.note || '-'}</span></div>
                    <div className="flex justify-between items-center text-xl font-bold mt-4 border-t pt-2"><span>Amount Received:</span><span>{formatCurrency(activePayment.amount)}</span></div>
                   </>
               ) : (
                   <div className="flex justify-between items-center text-xl font-bold"><span>Total:</span><span>{formatCurrency(activeVehicle.price || 0)}</span></div>
               )}
            </div>

            <div className="mt-20 relative">
                <div className="border-t border-black pt-4 w-1/2 text-center">
                    <p>Authorized Signature</p>
                </div>
                <div className="absolute -top-8 left-10"><SignedStamp /></div>
            </div>
        </div>
    );
  };

  const Sidebar = () => (
    <>
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-40 bg-slate-900 text-white transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:h-screen flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-64'} print:hidden`}>
        <div className="p-6 border-b border-slate-700 flex items-center gap-3 overflow-hidden">
            {/* 側邊欄 Logo */}
            <div className="w-10 h-10 bg-white rounded-full flex-shrink-0 flex items-center justify-center p-0.5">
                 <img src={COMPANY_INFO.logo_url} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
                 <h1 className="text-lg font-bold text-yellow-500 tracking-tight leading-tight">金田汽車<br/>DMS系統</h1>
            </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white ml-auto"><X size={24} /></button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={`flex items-center w-full p-3 rounded transition ${activeTab === 'dashboard' ? 'bg-yellow-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}><LayoutDashboard size={20} className="mr-3" /> 業務儀表板</button>
          <button onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }} className={`flex items-center w-full p-3 rounded transition ${activeTab === 'inventory' ? 'bg-yellow-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}><Car size={20} className="mr-3" /> 車輛管理</button>
          <button onClick={() => { setActiveTab('create_doc'); setIsMobileMenuOpen(false); }} className={`flex items-center w-full p-3 rounded transition ${activeTab === 'create_doc' ? 'bg-yellow-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}><FileText size={20} className="mr-3" /> 開單系統</button>
          <button onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }} className={`flex items-center w-full p-3 rounded transition ${activeTab === 'reports' ? 'bg-yellow-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}><FileBarChart size={20} className="mr-3" /> 統計報表</button>
          <button onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} className={`flex items-center w-full p-3 rounded transition ${activeTab === 'settings' ? 'bg-yellow-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}><Settings size={20} className="mr-3" /> 系統設置</button>
        </nav>
        <div className="p-4 text-xs text-slate-500 text-center border-t border-slate-800 flex flex-col items-center"><div className="mt-3 flex items-center justify-center space-x-2 bg-slate-800 p-2 rounded w-full"><UserCircle size={14} className="text-yellow-500"/><span className="font-bold text-white truncate max-w-[80px]">{staffId}</span></div><button onClick={() => {if(confirm("確定登出？")) setStaffId(null);}} className="mt-2 text-[10px] flex items-center text-red-400 hover:text-red-300 transition"><LogOut size={10} className="mr-1" /> Logout</button></div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 font-sans">
      <Sidebar />
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

          {/* Dashboard Tab - 固定頂部，列表滾動 */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col h-full overflow-hidden space-y-4 animate-fade-in">
              <h2 className="text-2xl font-bold text-slate-800 flex-none">業務儀表板</h2>
              
              {/* Stats Cards - 固定高度 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-none">
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500"><p className="text-xs text-gray-500 uppercase">庫存總值</p><p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalStockValue)}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500"><p className="text-xs text-gray-500 uppercase">未付費用</p><p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalPayable)}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500"><p className="text-xs text-gray-500 uppercase">應收尾數</p><p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalReceivable)}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500"><p className="text-xs text-gray-500 uppercase">本月銷售額</p><p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalSoldThisMonth)}</p></div>
              </div>

              {/* Table Container - 剩餘空間滾動 */}
              <div className="bg-white rounded-lg shadow-sm p-4 flex-1 flex flex-col overflow-hidden min-h-0">
                <h3 className="font-bold mb-4 flex-none">最新車輛動態</h3>
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap relative">
                    <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                        <tr className="border-b">
                            <th className="p-3 cursor-pointer hover:bg-gray-200 transition select-none" onClick={() => handleSort('stockInDate')}>
                                <div className="flex items-center">入庫日 <ArrowUpDown size={14} className="ml-1 text-gray-400"/></div>
                            </th>
                            <th className="p-3 cursor-pointer hover:bg-gray-200 transition select-none" onClick={() => handleSort('status')}>
                                <div className="flex items-center">狀態 <ArrowUpDown size={14} className="ml-1 text-gray-400"/></div>
                            </th>
                            <th className="p-3">車牌</th>
                            <th className="p-3">車型</th>
                            <th className="p-3">售價</th>
                            <th className="p-3">牌費到期</th>
                            <th className="p-3 text-right">費用狀況</th>
                        </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const allVehicles = getSortedInventory();
                        const unfinished: Vehicle[] = [];
                        const finished: Vehicle[] = [];

                        allVehicles.forEach(car => {
                            const received = car.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
                            const balance = (car.price || 0) - received;
                            const hasUnpaidExpenses = car.expenses?.some(e => e.status === 'Unpaid');
                            
                            // 定義「已完成」：已售出 且 餘額<=0 且 無未付費用
                            // 剩下的（在庫、未付清、有未付費用）都算未完成
                            const isFinished = car.status === 'Sold' && balance <= 0 && !hasUnpaidExpenses;

                            if (isFinished) finished.push(car);
                            else unfinished.push(car);
                        });

                        // 未完成顯示前10條，已完成接在後面
                        const displayList = [...unfinished.slice(0, 10), ...finished];

                        return displayList.map(car => {
                            const unpaidExps = car.expenses?.filter(e => e.status === 'Unpaid').length || 0;
                            return (
                              <tr key={car.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 text-gray-500 text-xs">{car.stockInDate || 'N/A'}</td>
                                <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${car.status === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{car.status}</span></td>
                                <td className="p-3 font-medium">{car.regMark}</td>
                                <td className="p-3">
                                    {car.year} {car.make} {car.model}
                                    {car.engineSize ? <span className="text-xs text-gray-500 ml-1">({car.engineSize} {car.fuelType === 'Electric' ? 'KW' : 'cc'})</span> : ''}
                                </td>
                                <td className="p-3 font-bold text-yellow-600">{formatCurrency(car.price)}</td>
                                <td className="p-3 text-gray-500 text-xs">{car.licenseExpiry || '-'}</td>
                                <td className="p-3 text-right">{unpaidExps > 0 ? <span className="text-red-500 text-xs font-bold">{unpaidExps} 筆未付</span> : <span className="text-green-500 text-xs"><CheckCircle size={14} className="inline"/></span>}</td>
                              </tr>
                            );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
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

              {/* Grid Container -捲動區域 */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-20">
                    {getSortedInventory().map((car) => { const received = car.payments?.reduce((acc, p) => acc + p.amount, 0) || 0; const balance = (car.price || 0) - received; return (<div key={car.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:border-yellow-400 transition group relative"><div className="flex justify-between items-start"><div className="flex-1"><div className="flex items-center gap-2 mb-1"><span className="font-bold text-base text-slate-800">{car.regMark || '未出牌'}</span><span className={`text-[10px] px-1.5 py-0.5 rounded border ${car.status==='In Stock'?'bg-green-50 text-green-700':(car.status==='Sold'?'bg-gray-100 text-gray-600':'bg-yellow-50 text-yellow-700')}`}>{car.status}</span></div><p className="text-sm font-medium text-gray-700">{car.year} {car.make} {car.model}</p>{(car.status === 'Sold' || car.status === 'Reserved') && (<div className="mt-2 text-xs bg-slate-50 p-1 rounded inline-block border border-slate-100"><span className="text-green-600 mr-2">已收: {formatCurrency(received)}</span><span className={`font-bold ${balance > 0 ? 'text-red-500' : 'text-gray-400'}`}>餘: {formatCurrency(balance)}</span></div>)}</div><div className="text-right flex flex-col items-end"><span className="text-lg font-bold text-yellow-600">{formatCurrency(car.price)}</span><div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setEditingVehicle(car)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" title="編輯/交易"><Edit size={14}/></button><button onClick={() => deleteVehicle(car.id)} className="p-1.5 bg-red-50 hover:bg-red-100 rounded text-red-500" title="刪除"><Trash2 size={14}/></button></div></div></div></div>)})}
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && <div className="flex-1 overflow-y-auto"><SettingsManager /></div>}

          {/* Create Doc Tab */}
          {activeTab === 'create_doc' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in flex-1 overflow-y-auto"><h2 className="text-xl font-bold text-slate-800 mb-4">開立合約 / 文件</h2>{!selectedVehicle ? (<div className="text-center p-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50"><p className="text-gray-500 mb-4">請先從「車輛管理」頁面選擇一輛車來開單。</p><button onClick={() => setActiveTab('inventory')} className="px-6 py-2 bg-slate-800 text-white rounded hover:bg-slate-700">前往選擇車輛</button></div>) : (/* Legacy Create Doc UI - kept for compatibility but main flow is in Edit Modal */ <div>Please use Inventory Edit to create docs.</div>)}</div>
          )}
        </div>
      </main>
    </div>
  );
}
