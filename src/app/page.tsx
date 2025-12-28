'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Car, FileText, LayoutDashboard, Plus, Printer, Trash2, DollarSign, 
  Menu, X, Building2, Database, Loader2, DownloadCloud, AlertTriangle, 
  Users, LogOut, UserCircle, ArrowRight, Settings, Save, Wrench, 
  Calendar, CheckCircle, XCircle, Filter, ChevronDown, ChevronUp, Edit,
  ArrowUpDown, Briefcase, BarChart3, FileBarChart, ExternalLink,
  StickyNote, CreditCard, Armchair, Fuel, Zap, Search, ChevronLeft, ChevronRight, Layout
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
  logo_url: "/logo.png"
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

const DEFAULT_SETTINGS: SystemSettings = {
  makes: ['Toyota', 'Honda', 'Mercedes-Benz', 'BMW', 'Tesla', 'Porsche', 'Audi'],
  models: {
    'Toyota': ['Alphard', 'Vellfire', 'Noah', 'Sienta', 'Hiace', 'Camry'],
    'Honda': ['Stepwgn', 'Freed', 'Jazz', 'Odyssey', 'Civic'],
    'Mercedes-Benz': ['A200', 'C200', 'E200', 'E300', 'S500', 'G63', 'GLC'],
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
  const [input, setInput] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(input.trim()) onLogin(input.trim().toUpperCase());
  };
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"><UserCircle size={48} className="text-white" /></div>
          <h1 className="text-2xl font-bold text-slate-800">Gold Land Auto v3.0</h1>
          <p className="text-slate-500 text-sm mt-2">Vehicle Sales & Management System</p>
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // 新增：側邊欄收折
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState(''); // 新增：搜尋關鍵字
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Vehicle; direction: 'asc' | 'desc' } | null>(null);

  // Report States
  const [reportType, setReportType] = useState<'receivable' | 'payable' | 'sales'>('receivable');
  const [reportStartDate, setReportStartDate] = useState(new Date().getFullYear() + '-01-01');
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportCompany, setReportCompany] = useState('');

  // Forms
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '', hkid: '', address: '' });
  const [deposit, setDeposit] = useState<number>(0);
  const [docType, setDocType] = useState<DocType>('sales_contract');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => { window.print(); };

  // --- Auth & Data Loading ---
  useEffect(() => {
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
    
    // 1. Inventory Listener
    const invRef = collection(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'inventory');
    const q = query(invRef, orderBy('createdAt', 'desc')); 
    const unsubInv = onSnapshot(q, (snapshot) => {
      const list: Vehicle[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Vehicle));
      setInventory(list);
    }, (err) => console.error("Inv sync error", err));

    // 2. Settings Fetch
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

      status: status,
      stockInDate: formData.get('stockInDate'),
      stockOutDate: status === 'Sold' ? formData.get('stockOutDate') : null, 
      expenses: editingVehicle ? editingVehicle.expenses : [], 
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
          expenses: []
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

  // --- Expense Management ---
  const addExpense = async (vehicleId: string, expense: Expense) => {
    if (!db || !staffId) return;
    const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
    const v = inventory.find(v => v.id === vehicleId);
    if (!v) return;

    const newExpenses = [...(v.expenses || []), expense];
    await updateDoc(doc(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'inventory', vehicleId), {
      expenses: newExpenses
    });
    // 保留視窗狀態，不關閉，不重置
    if (editingVehicle && editingVehicle.id === vehicleId) {
        setEditingVehicle({ ...editingVehicle, expenses: newExpenses });
    }
  };

  const deleteExpense = async (vehicleId: string, expenseId: string) => {
    if (!db || !staffId) return;
    const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
    const v = inventory.find(v => v.id === vehicleId);
    if (!v) return;

    const newExpenses = v.expenses.filter(e => e.id !== expenseId);
    await updateDoc(doc(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'inventory', vehicleId), {
      expenses: newExpenses
    });
    if (editingVehicle && editingVehicle.id === vehicleId) {
        setEditingVehicle({ ...editingVehicle, expenses: newExpenses });
    }
  };

  const updateExpenseStatus = async (vehicleId: string, expenseId: string, newStatus: 'Paid'|'Unpaid') => {
    if (!db || !staffId) return;
    const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
    const v = inventory.find(v => v.id === vehicleId);
    if (!v) return;

    const newExpenses = v.expenses.map(e => e.id === expenseId ? { ...e, status: newStatus } : e);
    await updateDoc(doc(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'inventory', vehicleId), {
      expenses: newExpenses
    });
    if (editingVehicle && editingVehicle.id === vehicleId) {
        setEditingVehicle({ ...editingVehicle, expenses: newExpenses });
    }
  };

  const updateSettings = async (key: keyof SystemSettings, newItem: string, action: 'add' | 'remove', parentKey?: string) => {
    if (!db || !staffId) return;
    const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
    let newSettings = { ...settings };

    if (key === 'models' && parentKey) {
        const currentModels = newSettings.models[parentKey] || [];
        let newModelsList = [...currentModels];
        if (action === 'add' && newItem && !newModelsList.includes(newItem)) {
            newModelsList.push(newItem);
        } else if (action === 'remove') {
            newModelsList = newModelsList.filter(item => item !== newItem);
        }
        newSettings.models = { ...newSettings.models, [parentKey]: newModelsList };
    } else {
        const list = settings[key] as string[];
        let newList = [...list];
        if (action === 'add' && newItem && !newList.includes(newItem)) {
            newList.push(newItem);
            if (key === 'makes' && !newSettings.models[newItem]) {
                newSettings.models = { ...newSettings.models, [newItem]: [] };
            }
        } else if (action === 'remove') {
            newList = newList.filter(item => item !== newItem);
        }
        (newSettings[key] as string[]) = newList;
    }
    setSettings(newSettings);
    await setDoc(doc(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'system_config', 'general_settings'), newSettings);
  };

  const handleSort = (key: keyof Vehicle) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // ★★★ 更新搜尋邏輯 ★★★
  const getSortedInventory = () => {
    let sorted = [...inventory];
    
    // Status Filter
    if (filterStatus !== 'All') {
        sorted = sorted.filter(v => v.status === filterStatus);
    }
    
    // Search Filter
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
        const soldPrice = car.price; 
        const deposit = 0; 
        totalReceivable += soldPrice; 
        totalSoldThisMonth += soldPrice;
      }
    });

    return { totalStockValue, totalReceivable, totalPayable, totalSoldThisMonth };
  };
  const stats = dashboardStats();

  const generateReportData = () => {
    let data: any[] = [];
    
    if (reportType === 'receivable') {
        data = inventory.filter(v => 
            v.status === 'Sold' && 
            (!reportStartDate || (v.stockOutDate || '') >= reportStartDate) &&
            (!reportEndDate || (v.stockOutDate || '') <= reportEndDate)
        ).map(v => ({
            vehicleId: v.id, // Used for linking
            date: v.stockOutDate || 'Unknown',
            title: `${v.year} ${v.make} ${v.model}`,
            regMark: v.regMark,
            amount: v.price,
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
    
    // 價格輸入 state
    const [priceStr, setPriceStr] = useState(formatNumberInput(String(v.price || '')));
    const [costStr, setCostStr] = useState(formatNumberInput(String(v.costPrice || '')));
    const [mileageStr, setMileageStr] = useState(formatNumberInput(String(v.mileage || '')));
    const [priceA1Str, setPriceA1Str] = useState(formatNumberInput(String(v.priceA1 || '')));
    const [priceTaxStr, setPriceTaxStr] = useState(formatNumberInput(String(v.priceTax || '')));
    const [fuelType, setFuelType] = useState<'Petrol'|'Diesel'|'Electric'>(v.fuelType || 'Petrol');
    const [engineSizeStr, setEngineSizeStr] = useState(formatNumberInput(String(v.engineSize || '')));
    const [autoLicenseFee, setAutoLicenseFee] = useState(v.licenseFee || 0);

    // Effect to update license fee
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

    const [newExpense, setNewExpense] = useState({
        date: new Date().toISOString().split('T')[0],
        type: '', company: '', amount: '', status: 'Unpaid', paymentMethod: 'Cash',
        invoiceNo: '' 
    });

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b flex justify-between items-center bg-slate-900 text-white rounded-t-lg sticky top-0 z-10">
            <h2 className="text-xl font-bold flex items-center"><Car className="mr-2"/> {isNew ? '車輛入庫 (Stock In)' : '編輯車輛資料 (Edit Vehicle)'}</h2>
            <button onClick={() => {setEditingVehicle(null); setActiveTab('inventory');}}><X /></button>
          </div>
          <form onSubmit={saveVehicle} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Status & Dates */}
            <div className="md:col-span-3 pb-2 border-b flex justify-between items-end">
                <h3 className="font-bold text-gray-500">車輛狀態與日期</h3>
                <div className="flex items-center gap-4 text-sm">
                     <label className="flex items-center"><input type="radio" name="status" value="In Stock" defaultChecked={v.status !== 'Sold' && v.status !== 'Reserved'} className="mr-1"/> 在庫</label>
                     <label className="flex items-center"><input type="radio" name="status" value="Reserved" defaultChecked={v.status === 'Reserved'} className="mr-1"/> 已訂</label>
                     <label className="flex items-center"><input type="radio" name="status" value="Sold" defaultChecked={v.status === 'Sold'} className="mr-1"/> 已售</label>
                </div>
            </div>

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500">入庫日期 (Stock In)</label>
                    <input name="stockInDate" type="date" defaultValue={v.stockInDate || new Date().toISOString().split('T')[0]} className="w-full border p-2 rounded bg-gray-50"/>
                </div>
                <div>
                    <label className="block text-xs font-bold text-green-700">出庫/成交日期 (Stock Out)</label>
                    <input name="stockOutDate" type="date" defaultValue={v.stockOutDate} className="w-full border p-2 rounded border-green-200 bg-green-50"/>
                </div>
            </div>
            
            <div className="md:col-span-3 border-t my-2"></div>

            {/* Basic Info */}
            <div>
              <label className="block text-xs font-bold text-gray-500">收購類型</label>
              <select name="purchaseType" defaultValue={v.purchaseType || 'Used'} className="w-full border p-2 rounded bg-gray-50">
                <option value="Used">二手收購 (Used)</option>
                <option value="New">訂購新車 (New)</option>
                <option value="Consignment">寄賣 (Consignment)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500">車牌 (Reg. Mark)</label>
              <input name="regMark" defaultValue={v.regMark} placeholder="未出牌可留空" className="w-full border p-2 rounded"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500">牌費到期日</label>
              <input name="licenseExpiry" type="date" defaultValue={v.licenseExpiry} className="w-full border p-2 rounded"/>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500">廠牌 (Make)</label>
              <select name="make" value={selectedMake} onChange={(e) => setSelectedMake(e.target.value)} required className="w-full border p-2 rounded">
                <option value="">請選擇...</option>
                {settings.makes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500">型號 (Model)</label>
              <input list="model_list" name="model" defaultValue={v.model} required className="w-full border p-2 rounded" placeholder={selectedMake ? `選擇 ${selectedMake} 型號...` : '請先選擇廠牌'}/>
              <datalist id="model_list">{(settings.models[selectedMake] || []).map(m => <option key={m} value={m} />)}</datalist>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500">年份 (Year)</label>
              <input name="year" type="number" defaultValue={v.year} required className="w-full border p-2 rounded"/>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500">外觀顏色</label>
              <input list="colors" name="colorExt" defaultValue={v.colorExt} className="w-full border p-2 rounded"/>
              <datalist id="colors">{settings.colors.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500">內飾顏色</label>
              <input list="colors" name="colorInt" defaultValue={v.colorInt} className="w-full border p-2 rounded"/>
            </div>
            
            {/* Power & Tax */}
            <div className="md:col-span-3 bg-slate-50 p-2 rounded border mt-2">
                <div className="flex items-center mb-2"><Fuel size={14} className="mr-2 text-slate-600"/><h4 className="font-bold text-xs text-slate-600">動力與牌費 (Power & License Fee)</h4></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500">燃料 (Fuel Type)</label>
                        <select name="fuelType" value={fuelType} onChange={(e) => setFuelType(e.target.value as any)} className="w-full border p-2 rounded">
                            <option value="Petrol">汽油 (Petrol)</option>
                            <option value="Diesel">柴油 (Diesel)</option>
                            <option value="Electric">電動 (Electric)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 flex items-center">
                           {fuelType === 'Electric' ? <Zap size={12} className="mr-1 text-yellow-500"/> : null} 
                           {fuelType === 'Electric' ? '額定功率 (KW)' : '汽缸容量 (c.c.)'}
                        </label>
                        <input 
                            name="engineSize" 
                            type="text" 
                            value={engineSizeStr} 
                            onChange={(e) => setEngineSizeStr(formatNumberInput(e.target.value))} 
                            className="w-full border p-2 rounded font-mono"
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">預計每年牌費</label>
                        <div className="w-full border p-2 rounded bg-gray-100 font-bold text-blue-700">
                           {formatCurrency(autoLicenseFee)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Status */}
            <div className="md:col-span-3 pb-2 border-b mt-4 flex items-center">
                <StickyNote size={16} className="mr-2 text-yellow-600"/> 
                <h3 className="font-bold text-gray-500">詳細狀況 & 備註</h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500">首數 (Previous Owners)</label>
              <input name="previousOwners" defaultValue={v.previousOwners} placeholder="e.g. 0 (1任車主) / 未出牌" className="w-full border p-2 rounded"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500">行駛里程 (Mileage km)</label>
              <div className="relative">
                <input 
                  name="mileage" 
                  type="text" 
                  value={mileageStr} 
                  onChange={(e) => setMileageStr(formatNumberInput(e.target.value))} 
                  className="w-full border p-2 rounded pr-8" 
                  placeholder="0"
                />
                <span className="absolute right-3 top-2 text-gray-400 text-xs">km</span>
              </div>
            </div>
            <div>
               <label className="block text-xs font-bold text-gray-500 flex items-center"><Armchair size={12} className="mr-1"/> 座位數 (Seating)</label>
               <input name="seating" type="number" defaultValue={v.seating || 5} className="w-full border p-2 rounded" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-gray-500">備註 (Remarks)</label>
              <textarea name="remarks" defaultValue={v.remarks} className="w-full border p-2 rounded h-20 text-sm" placeholder="輸入車輛狀況備註..."/>
            </div>
            
            {/* Tech Specs */}
            <div className="md:col-span-3 pb-2 border-b mt-4"><h3 className="font-bold text-gray-500">機件資料</h3></div>
            <div>
              <label className="block text-xs font-bold text-gray-500">底盤號 (Chassis No.)</label>
              <input name="chassisNo" defaultValue={v.chassisNo} className="w-full border p-2 rounded font-mono" placeholder="非必填"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500">引擎號 (Engine No.)</label>
              <input name="engineNo" defaultValue={v.engineNo} className="w-full border p-2 rounded font-mono" placeholder="非必填"/>
            </div>

            {/* Pricing */}
            <div className="md:col-span-3 pb-2 border-b mt-4"><h3 className="font-bold text-gray-500">價格與稅務設定</h3></div>
            <div>
              <label className="block text-xs font-bold text-gray-500">入貨成本 (Cost)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400">$</span>
                <input name="costPrice" type="text" value={costStr} onChange={(e) => setCostStr(formatNumberInput(e.target.value))} className="w-full border p-2 pl-6 rounded font-mono" placeholder="0"/>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500">預計售價 (Price)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400">$</span>
                <input name="price" type="text" value={priceStr} onChange={(e) => setPriceStr(formatNumberInput(e.target.value))} required className="w-full border p-2 pl-6 rounded font-bold text-lg font-mono" placeholder="0"/>
              </div>
            </div>
            <div className="flex flex-col gap-2 p-2 bg-blue-50 rounded border border-blue-100">
               <label className="block text-xs font-bold text-blue-800">A1 價 / 零售價 (Published Price)</label>
               <input 
                  name="priceA1" 
                  type="text" 
                  value={priceA1Str} 
                  onChange={(e) => setPriceA1Str(formatNumberInput(e.target.value))} 
                  className="w-full border p-1 rounded text-sm text-right"
                  placeholder="0"
               />
            </div>
            <div className="flex flex-col gap-2 p-2 bg-blue-50 rounded border border-blue-100">
               <label className="block text-xs font-bold text-blue-800">入口稅 (Tax)</label>
               <input 
                  name="priceTax" 
                  type="text" 
                  value={priceTaxStr} 
                  onChange={(e) => setPriceTaxStr(formatNumberInput(e.target.value))} 
                  className="w-full border p-1 rounded text-sm text-right"
                  placeholder="0"
               />
            </div>
            <div className="flex flex-col gap-2 p-2 bg-blue-100 rounded border border-blue-200">
               <label className="block text-xs font-bold text-blue-900 flex items-center"><CreditCard size={12} className="mr-1"/> 牌簿價 (Registered Value)</label>
               <div className="w-full p-1 text-right font-bold text-lg text-blue-900">
                   {calcRegisteredPrice()}
               </div>
            </div>

            {/* Expenses */}
            {isNew ? (
                <div className="md:col-span-3 mt-6 bg-yellow-50 p-4 rounded border border-yellow-200 text-center">
                    <p className="text-yellow-700 font-bold"><AlertTriangle className="inline mr-2"/> 請先儲存車輛基本資料，即可新增處理費用。</p>
                </div>
            ) : (
              <div className="md:col-span-3 mt-6 bg-gray-50 p-4 rounded border">
                <h3 className="font-bold flex items-center mb-4"><Wrench size={16} className="mr-2"/> 處理費用記錄</h3>
                <table className="w-full text-sm bg-white border mb-4">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="p-2">日期</th><th className="p-2">項目</th><th className="p-2">單號</th><th className="p-2">負責公司</th><th className="p-2">金額</th><th className="p-2">狀態</th><th className="p-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.expenses?.map(exp => (
                      <tr key={exp.id} className="border-t">
                        <td className="p-2">{exp.date}</td>
                        <td className="p-2">{exp.type}</td>
                        <td className="p-2 text-gray-500">{exp.invoiceNo}</td>
                        <td className="p-2 text-gray-500">{exp.company}</td>
                        <td className="p-2">{formatCurrency(exp.amount)}</td>
                        <td className="p-2">
                           <select 
                             value={exp.status} 
                             onChange={(e) => updateExpenseStatus(v.id!, exp.id, e.target.value as 'Paid'|'Unpaid')}
                             className={`px-1 py-0.5 rounded text-xs border cursor-pointer ${exp.status==='Paid'?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}
                           >
                             <option value="Unpaid">未付</option>
                             <option value="Paid">已付</option>
                           </select>
                        </td>
                        <td className="p-2"><button type="button" onClick={() => deleteExpense(v.id!, exp.id)} className="text-red-500"><X size={14}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                     <tr className="bg-gray-50 font-bold border-t">
                        <td colSpan={4} className="p-2 text-right">總成本 (車價+費用):</td>
                        <td colSpan={3} className="p-2 text-blue-600">
                           {formatCurrency((v.costPrice || 0) + (v.expenses || []).reduce((acc, cur) => acc + cur.amount, 0))}
                        </td>
                     </tr>
                  </tfoot>
                </table>

                {/* ★★★ 修正點：避免跳回頁頂，確保按鈕 type="button" 且事件處理完善 ★★★ */}
                <div className="grid grid-cols-7 gap-2 items-end bg-gray-100 p-2 rounded">
                  <div className="col-span-1">
                      <label className="text-[10px] text-gray-500">日期</label>
                      <input type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full border p-1 rounded text-xs" />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] text-gray-500">項目</label>
                    <select value={newExpense.type} onChange={e => setNewExpense({...newExpense, type: e.target.value})} className="w-full border p-1 rounded text-xs">
                      <option value="">選擇...</option>
                      {settings.expenseTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] text-gray-500">單號/備注</label>
                    <input type="text" placeholder="No.123" value={newExpense.invoiceNo} onChange={e => setNewExpense({...newExpense, invoiceNo: e.target.value})} className="w-full border p-1 rounded text-xs" />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] text-gray-500">負責公司</label>
                    <select value={newExpense.company} onChange={e => setNewExpense({...newExpense, company: e.target.value})} className="w-full border p-1 rounded text-xs">
                      <option value="">選擇...</option>
                      {(settings.expenseCompanies || []).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] text-gray-500">金額</label>
                    <input 
                       type="text" 
                       value={newExpense.amount}
                       onChange={e => setNewExpense({...newExpense, amount: formatNumberInput(e.target.value)})}
                       placeholder="0" 
                       className="w-full border p-1 rounded text-xs" 
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] text-gray-500">狀態</label>
                    <select value={newExpense.status} onChange={e => setNewExpense({...newExpense, status: e.target.value as any})} className="w-full border p-1 rounded text-xs">
                      <option value="Unpaid">未付</option>
                      <option value="Paid">已付</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <button type="button" 
                      onClick={(e) => {
                        e.preventDefault(); // 確保不觸發 form submit
                        const amount = Number(newExpense.amount.replace(/,/g, ''));
                        if(amount > 0 && newExpense.type) {
                            addExpense(v.id!, { 
                                id: Date.now().toString(), 
                                date: newExpense.date, 
                                type: newExpense.type, 
                                company: newExpense.company,
                                invoiceNo: newExpense.invoiceNo, 
                                amount: amount, 
                                status: newExpense.status as any, 
                                paymentMethod: newExpense.paymentMethod as any, 
                                description: '' 
                            });
                            // Reset partial fields
                            setNewExpense(prev => ({...prev, amount: '', invoiceNo: ''}));
                        } else {
                            alert("請填寫費用項目及金額");
                        }
                      }}
                      className="w-full bg-green-600 text-white p-1 rounded text-xs hover:bg-green-700 h-[26px]"
                    >新增</button>
                  </div>
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

  // 2. Settings Manager
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
            {!activeMake ? <p className="text-gray-400 text-xs">請先選擇左側廠牌</p> : (<><div className="flex gap-2 mb-3"><input id="new-models" placeholder={`新增 ${activeMake} 型號...`} className="flex-1 border p-2 rounded text-sm"/><button onClick={() => {const input = document.getElementById("new-models") as HTMLInputElement; if(input.value) { updateSettings('models', input.value, 'add', activeMake); input.value=''; }}} className="bg-slate-800 text-white px-3 rounded hover:bg-slate-700"><Plus size={16}/></button></div><ul className="space-y-1 max-h-40 overflow-y-auto">{(settings.models[activeMake] || []).map(model => (<li key={model} className="flex justify-between items-center bg-white p-2 rounded border text-sm"><span>{model}</span><button onClick={() => updateSettings('models', model, 'remove', activeMake)} className="text-red-400 hover:text-red-600"><X size={14}/></button></li>))}</ul></>)}
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
  const DocumentTemplate = () => {if (!selectedVehicle) return null; const today = formatDate(new Date()); const balance = selectedVehicle.price - deposit; const Header = ({ titleEn, titleCh }: { titleEn: string, titleCh: string }) => (<div className="mb-8"><div className="flex items-start justify-between border-b-2 border-black pb-4 mb-2"><div className="w-24 h-24 flex-shrink-0 mr-4 flex items-center justify-center border border-gray-200 bg-gray-50 rounded-lg overflow-hidden"><div className="flex flex-col items-center justify-center text-gray-400 w-full h-full"><div className="flex flex-col items-center"><Building2 size={32} /><span className="text-[10px] mt-1">Logo</span></div></div></div><div className="flex-1 text-right"><h1 className="text-3xl font-bold tracking-wide text-black">{COMPANY_INFO.name_en}</h1><h2 className="text-2xl font-bold text-gray-800 mb-2">{COMPANY_INFO.name_ch}</h2><div className="text-xs text-gray-600 space-y-1"><p>{COMPANY_INFO.address_en}</p><p>{COMPANY_INFO.address_ch}</p><p className="font-bold">Tel: {COMPANY_INFO.phone}</p></div></div></div><div className="text-center mt-6"><h2 className="text-xl font-bold uppercase underline decoration-2 underline-offset-4">{titleEn}</h2><h3 className="text-lg font-bold mt-1">{titleCh}</h3></div></div>); const VehicleTable = () => (<table className="w-full border-collapse border border-black mb-6 text-sm"><tbody><tr><td className="border border-black p-2 bg-gray-100 font-bold w-1/4">車牌號碼 (Reg. Mark)</td><td className="border border-black p-2 w-1/4 font-mono font-bold text-lg">{selectedVehicle.regMark}</td><td className="border border-black p-2 bg-gray-100 font-bold w-1/4">製造年份 (Year)</td><td className="border border-black p-2 w-1/4">{selectedVehicle.year}</td></tr><tr><td className="border border-black p-2 bg-gray-100 font-bold">廠名 (Make)</td><td className="border border-black p-2">{selectedVehicle.make}</td><td className="border border-black p-2 bg-gray-100 font-bold">型號 (Model)</td><td className="border border-black p-2">{selectedVehicle.model}</td></tr><tr><td className="border border-black p-2 bg-gray-100 font-bold">顏色 (Color)</td><td className="border border-black p-2">{selectedVehicle.colorExt} / {selectedVehicle.colorInt}</td><td className="border border-black p-2 bg-gray-100 font-bold">收購類別</td><td className="border border-black p-2">{selectedVehicle.purchaseType === 'New' ? '新車' : (selectedVehicle.purchaseType === 'Consignment' ? '寄賣' : '二手')}</td></tr><tr><td className="border border-black p-2 bg-gray-100 font-bold">底盤號碼 (Chassis)</td><td className="border border-black p-2 font-mono" colSpan={3}>{selectedVehicle.chassisNo}</td></tr><tr><td className="border border-black p-2 bg-gray-100 font-bold">引擎號碼 (Engine)</td><td className="border border-black p-2 font-mono" colSpan={3}>{selectedVehicle.engineNo}</td></tr></tbody></table>);
    if (docType === 'sales_contract') return (<div className="max-w-[210mm] mx-auto bg-white p-10 min-h-[297mm] text-black relative"><Header titleEn="Sales & Purchase Agreement" titleCh="汽車買賣合約" /><div className="flex justify-between mb-4 text-sm border-b pb-2"><span>合約編號: <span className="font-mono font-bold">SLA-{today.replace(/\//g,'')}-{selectedVehicle.id.slice(0,6)}</span></span><span>日期: {today}</span></div><div className="mb-6"><h3 className="font-bold border-b-2 border-gray-800 mb-2 bg-gray-100 p-1">甲、買方資料</h3><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-gray-500 text-xs">姓名</p><p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{customer.name}</p></div><div><p className="text-gray-500 text-xs">電話</p><p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{customer.phone}</p></div><div><p className="text-gray-500 text-xs">身份證</p><p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{customer.hkid}</p></div><div className="col-span-2"><p className="text-gray-500 text-xs">地址</p><p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{customer.address}</p></div></div></div><div className="mb-6"><h3 className="font-bold border-b-2 border-gray-800 mb-2 bg-gray-100 p-1">乙、車輛資料</h3><VehicleTable /></div><div className="mb-6"><h3 className="font-bold border-b-2 border-gray-800 mb-2 bg-gray-100 p-1">丙、交易款項</h3><div className="text-sm space-y-3 px-2"><div className="flex justify-between items-end border-b border-dotted border-gray-400 pb-1"><span>成交價:</span><span className="font-bold text-lg">{formatCurrency(selectedVehicle.price)}</span></div><div className="flex justify-between items-end border-b border-dotted border-gray-400 pb-1"><span>已付訂金:</span><span className="text-lg">{formatCurrency(deposit)}</span></div><div className="flex justify-between items-end border-b-2 border-black pb-1 mt-2"><span className="font-bold">尚餘尾數:</span><span className="font-bold text-xl">{formatCurrency(balance)}</span></div></div></div><div className="mb-8 text-[11px] text-justify leading-relaxed text-gray-700"><h3 className="font-bold mb-1 text-sm text-black">條款及細則:</h3><ol className="list-decimal pl-4 space-y-1"><li>買方已親自驗收上述車輛，同意以「現狀」成交。</li><li>如買方悔約，賣方有權沒收所有訂金。</li><li>賣方保證上述車輛並無涉及任何未清之財務按揭。</li></ol></div><div className="grid grid-cols-2 gap-16 mt-12"><div className="relative"><div className="border-t border-black pt-2 text-center"><p className="font-bold">賣方簽署及公司蓋印</p><p className="text-xs text-gray-500">Authorized Signature & Chop</p><p className="text-xs font-bold mt-1">For and on behalf of<br/>{COMPANY_INFO.name_en}</p></div><div className="mb-2 absolute -top-8 left-1/2 transform -translate-x-1/2"><SignedStamp /></div></div><div><div className="border-t border-black pt-2 text-center"><p className="font-bold">買方簽署</p><p className="text-xs text-gray-500">Purchaser Signature</p></div></div></div></div>);
    return (<div className="max-w-[210mm] mx-auto bg-white p-10 min-h-[297mm] text-black"><Header titleEn={docType === 'invoice' ? "INVOICE" : "DOCUMENT"} titleCh={docType === 'invoice' ? "發票" : "文件"} /><div className="flex justify-between mb-8 border p-4 rounded-lg bg-gray-50"><div className="flex-1"><p className="text-gray-500 text-xs">Customer:</p><p className="font-bold text-lg mt-1">{customer.name}</p></div><div className="text-right border-l pl-8 ml-8"><div><p className="text-gray-500 text-xs">No.</p><p className="font-bold">{docType.toUpperCase().slice(0,3)}-{today.replace(/\//g,'')}-{selectedVehicle.id.slice(0,6)}</p></div><div><p className="text-gray-500 text-xs">Date</p><p className="font-bold">{today}</p></div></div></div><VehicleTable /><div className="mt-8 border-t-2 border-black pt-4 flex justify-between items-center text-xl font-bold"><span>Total:</span><span>{formatCurrency(selectedVehicle.price)}</span></div><div className="mt-20 relative"><div className="border-t border-black pt-4 w-1/2 text-center"><p>Authorized Signature</p></div><div className="absolute -top-8 left-10"><SignedStamp /></div></div></div>);
  };

  const Sidebar = () => (
    <>
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-40 bg-slate-900 text-white transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:h-screen flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-64'} print:hidden`}>
        
        {/* Header - Toggle Button */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          {!isSidebarCollapsed && (
             <div><h1 className="text-xl font-bold text-yellow-500 tracking-tighter">GOLD LAND</h1><p className="text-xs text-slate-400 mt-1">Enterprise</p></div>
          )}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800">
             {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-2 overflow-y-auto">
          {[
             { id: 'dashboard', icon: LayoutDashboard, label: '業務儀表板' },
             { id: 'inventory', icon: Car, label: '車輛管理' },
             { id: 'create_doc', icon: FileText, label: '開單系統' },
             { id: 'reports', icon: FileBarChart, label: '統計報表' },
             { id: 'settings', icon: Settings, label: '系統設置' }
          ].map((item) => (
             <button 
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); setIsMobileMenuOpen(false); }} 
                className={`flex items-center w-full p-3 rounded transition group ${activeTab === item.id ? 'bg-yellow-600 text-white' : 'hover:bg-slate-800 text-slate-300'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={isSidebarCollapsed ? item.label : ''}
             >
                <item.icon size={22} className={isSidebarCollapsed ? '' : 'mr-3'} /> 
                {!isSidebarCollapsed && <span className="font-medium">{item.label}</span>}
             </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 text-xs text-slate-500 text-center border-t border-slate-800 flex flex-col items-center">
            <div className={`mt-2 flex items-center justify-center bg-slate-800 p-2 rounded w-full ${isSidebarCollapsed ? 'px-0' : ''}`}>
               <UserCircle size={16} className="text-yellow-500"/>
               {!isSidebarCollapsed && <span className="font-bold text-white truncate max-w-[80px] ml-2">{staffId}</span>}
            </div>
            <button onClick={() => {if(confirm("確定登出？")) setStaffId(null);}} className="mt-3 text-[10px] flex items-center text-red-400 hover:text-red-300 transition">
                <LogOut size={14} className={isSidebarCollapsed ? '' : 'mr-1'} /> 
                {!isSidebarCollapsed && 'Logout'}
            </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 font-sans overflow-hidden">
      <Sidebar />
      
      {/* Main Content Area - Scrollable */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header - Sticky */}
        <header className="bg-white shadow-sm h-16 flex-shrink-0 flex items-center px-4 justify-between print:hidden">
            <div className="flex items-center">
               <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-700 mr-4"><Menu size={24} /></button>
               <span className="font-bold text-lg text-slate-800">Gold Land Auto System</span>
            </div>
            
            {/* Global Search Box (Only on Inventory Tab) */}
            {activeTab === 'inventory' && (
                <div className="relative w-64 md:w-96">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                       type="text" 
                       placeholder="搜尋車牌、型號、底盤號..." 
                       className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-yellow-400 outline-none transition"
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            )}
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 print:m-0 print:p-0 print:overflow-visible">

            {isPreviewMode && (
              <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white p-3 rounded-lg shadow-xl z-50 flex items-center gap-4 print:hidden">
                <div className="font-bold flex items-center text-sm"><FileText size={16} className="mr-2" /> 預覽模式</div>
                <button onClick={() => setIsPreviewMode(false)} className="px-3 py-1 bg-gray-600 rounded text-xs hover:bg-gray-500">關閉</button>
                <button onClick={handlePrint} className="px-3 py-1 bg-yellow-500 text-black font-bold rounded text-xs hover:bg-yellow-400 flex items-center"><Printer size={14} className="mr-1"/> 列印</button>
              </div>
            )}

            <div className={`${isPreviewMode ? 'block mt-8' : 'hidden'} print:block print:mt-0`}><div ref={printAreaRef} className="print:w-full"><DocumentTemplate /></div></div>

            <div className={`${isPreviewMode ? 'hidden' : 'block'} print:hidden space-y-6 pb-20`}>
              
              {/* Modal for Add/Edit Vehicle */}
              {(activeTab === 'inventory_add' || editingVehicle) && <VehicleFormModal />}
              
              {/* Report Tab */}
              {activeTab === 'reports' && <ReportView />}

              {/* Dashboard Tab */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                  {/* ... (Existing Dashboard Cards code) ... */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
                      <p className="text-xs text-gray-500 uppercase">庫存總值 (Cost)</p>
                      <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalStockValue)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500">
                      <p className="text-xs text-gray-500 uppercase">未付費用 (Payable)</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalPayable)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
                      <p className="text-xs text-gray-500 uppercase">應收尾數 (Receivable)</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalReceivable)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
                      <p className="text-xs text-gray-500 uppercase">本月銷售額</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalSoldThisMonth)}</p>
                    </div>
                  </div>
                  {/* Recent List */}
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <h3 className="font-bold mb-4">最新車輛動態</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead><tr className="border-b bg-gray-50"><th className="p-3">入庫日</th><th className="p-3">狀態</th><th className="p-3">車牌</th><th className="p-3">車型</th><th className="p-3">售價</th><th className="p-3 text-right">費用狀況</th></tr></thead>
                        <tbody>
                          {getSortedInventory().slice(0, 10).map(car => {
                            const unpaidExps = car.expenses?.filter(e => e.status === 'Unpaid').length || 0;
                            return (
                              <tr key={car.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 text-gray-500 text-xs">{car.createdAt?.toDate ? formatDate(car.createdAt.toDate()) : 'N/A'}</td>
                                <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${car.status === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{car.status}</span></td>
                                <td className="p-3 font-medium">{car.regMark}</td>
                                <td className="p-3">{car.year} {car.make} {car.model}</td>
                                <td className="p-3 font-bold text-yellow-600">{formatCurrency(car.price)}</td>
                                <td className="p-3 text-right">{unpaidExps > 0 ? <span className="text-red-500 text-xs font-bold">{unpaidExps} 筆未付</span> : <span className="text-green-500 text-xs"><CheckCircle size={14} className="inline"/></span>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Inventory Tab (Updated with Compact View) */}
              {activeTab === 'inventory' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-slate-800">車輛庫存 ({getSortedInventory().length})</h2>
                    <button onClick={() => {setEditingVehicle({} as Vehicle); setActiveTab('inventory_add');}} className="bg-slate-900 text-white px-3 py-1.5 rounded text-sm flex items-center hover:bg-slate-700 shadow-sm"><Plus size={16} className="mr-1"/> 入庫</button>
                  </div>
                  
                  {/* Filter Pills */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {['All', 'In Stock', 'Sold', 'Reserved'].map(s => (
                      <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${filterStatus === s ? 'bg-yellow-500 text-white shadow-sm' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}>{s === 'All' ? '全部' : s}</button>
                    ))}
                  </div>

                  {/* Compact Card Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {getSortedInventory().map((car) => (
                      <div key={car.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:border-yellow-400 transition group relative">
                         <div className="flex justify-between items-start">
                           {/* Left Info */}
                           <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-base text-slate-800">{car.regMark || '未出牌'}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${car.status==='In Stock'?'bg-green-50 text-green-700 border-green-200':(car.status==='Sold'?'bg-gray-100 text-gray-600 border-gray-300':'bg-yellow-50 text-yellow-700 border-yellow-200')}`}>{car.status}</span>
                                {car.purchaseType === 'New' && <span className="text-[10px] text-blue-600 border border-blue-200 px-1 rounded">新車</span>}
                              </div>
                              <p className="text-sm font-medium text-gray-700">{car.year} {car.make} {car.model}</p>
                              <div className="text-[11px] text-gray-400 mt-1 flex flex-wrap gap-2 font-mono">
                                 <span>{car.chassisNo?.slice(-6) || '---'}</span>
                                 <span className="border-l pl-2">{car.colorExt}/{car.colorInt}</span>
                                 {car.stockOutDate && <span className="border-l pl-2 text-green-600">Sold: {car.stockOutDate}</span>}
                              </div>
                           </div>
                           
                           {/* Right Price & Actions */}
                           <div className="text-right flex flex-col items-end">
                              <span className="text-lg font-bold text-yellow-600">{formatCurrency(car.price)}</span>
                              <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditingVehicle(car)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" title="編輯"><Edit size={14}/></button>
                                <button onClick={() => {setSelectedVehicle(car); setActiveTab('create_doc');}} className="p-1.5 bg-blue-50 hover:bg-blue-100 rounded text-blue-600" title="開單"><FileText size={14}/></button>
                                <button onClick={() => deleteVehicle(car.id)} className="p-1.5 bg-red-50 hover:bg-red-100 rounded text-red-500" title="刪除"><Trash2 size={14}/></button>
                              </div>
                           </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && <SettingsManager />}

              {/* Create Doc Tab */}
              {activeTab === 'create_doc' && (
                <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                  <h2 className="text-xl font-bold text-slate-800 mb-4">開立合約 / 文件</h2>
                  {!selectedVehicle ? (
                    <div className="text-center p-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <p className="text-gray-500 mb-4">請先從「車輛管理」頁面選擇一輛車來開單。</p>
                      <button onClick={() => setActiveTab('inventory')} className="px-6 py-2 bg-slate-800 text-white rounded hover:bg-slate-700">前往選擇車輛</button>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500 relative flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-sm text-gray-500">已選車輛</h3>
                          <p className="font-bold text-lg">{selectedVehicle.regMark} - {selectedVehicle.make} {selectedVehicle.model}</p>
                        </div>
                        <button onClick={() => setSelectedVehicle(null)} className="text-sm text-red-500 hover:underline">重新選擇</button>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Customer Form */}
                            <div>
                                <h3 className="font-bold mb-4 border-b pb-2">客戶資料</h3>
                                <div className="space-y-3">
                                  <input value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="客戶姓名" />
                                  <input value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="電話" />
                                  <input value={customer.hkid} onChange={e => setCustomer({...customer, hkid: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="身份證號碼" />
                                  <input value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="地址" />
                                </div>
                            </div>
                            {/* Doc Config */}
                            <div>
                                <h3 className="font-bold mb-4 border-b pb-2">文件設定</h3>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                  {['sales_contract', 'purchase_contract', 'invoice', 'receipt'].map(t => (
                                    <button key={t} onClick={() => setDocType(t as DocType)} className={`p-2 text-xs rounded border ${docType === t ? 'bg-slate-800 text-white' : 'hover:bg-gray-50'}`}>{t.replace('_', ' ').toUpperCase()}</button>
                                  ))}
                                </div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">已付訂金/收款金額</label>
                                <input type="text" value={formatNumberInput(String(deposit))} onChange={e => {const val = e.target.value.replace(/,/g, ''); setDeposit(val ? Number(val) : 0);}} className="w-full border p-2 rounded" placeholder="0" />
                            </div>
                        </div>
                      </div>
                      <div className="flex justify-end pt-4">
                        <button onClick={() => setIsPreviewMode(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded font-bold shadow-lg flex items-center"><FileText className="mr-2"/> 預覽並列印</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
        </main>
      </div>
    </div>
  );
}
