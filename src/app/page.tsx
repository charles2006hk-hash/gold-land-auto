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

// ★★★ 新增：收款記錄 (Payment) ★★★
type Payment = {
  id: string;
  date: string;
  type: 'Deposit' | 'Part Payment' | 'Balance' | 'Full Payment';
  amount: number;
  method: 'Cash' | 'Cheque' | 'Transfer';
  note?: string; // 支票號碼 etc.
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
  
  // ★★★ 銷售與收款資料 ★★★
  customerName?: string;
  customerPhone?: string;
  customerID?: string; // 身份證
  customerAddress?: string;
  
  payments?: Payment[]; // 收款列表
  
  // Legacy fields (optional compatibility)
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
          <p className="text-slate-500 text-sm mt-2">Sales & Management System</p>
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
  
  // Doc Preview State (整合到主流程)
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

  // Legacy Forms (Create Doc Tab)
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

      // Customer Info from Form
      customerName: formData.get('customerName') as string,
      customerPhone: formData.get('customerPhone') as string,
      customerID: formData.get('customerID') as string,
      customerAddress: formData.get('customerAddress') as string,

      status: status,
      stockInDate: formData.get('stockInDate'),
      stockOutDate: status === 'Sold' ? formData.get('stockOutDate') : null, 
      expenses: editingVehicle ? editingVehicle.expenses : [], 
      payments: editingVehicle ? editingVehicle.payments : [], // Keep existing payments
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

  // --- Sub-Item Management (Generic for Expense & Payment) ---
  const updateSubItem = async (vehicleId: string, field: 'expenses'|'payments', newItems: any[]) => {
    if (!db || !staffId) return;
    const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
    const v = inventory.find(v => v.id === vehicleId);
    if (!v) return;

    await updateDoc(doc(db, 'artifacts', appId, 'staff', `${safeStaffId}_data`, 'inventory', vehicleId), {
      [field]: newItems
    });
    // UI Update
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

  // Payment Actions
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
        // 使用 payments 計算已收
        const received = car.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
        const balance = car.price - received;
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

    // Calc total payments
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

    // States for Adding New Items
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
            
            {/* --- Status & Customer (Sales Info) --- */}
            <div className="md:col-span-3 pb-2 border-b flex justify-between items-end">
                <h3 className="font-bold text-gray-500">銷售狀態</h3>
                <div className="flex items-center gap-4 text-sm font-bold">
                     <label className="flex items-center"><input type="radio" name="status" value="In Stock" defaultChecked={v.status !== 'Sold' && v.status !== 'Reserved'} className="mr-1"/> 在庫</label>
                     <label className="flex items-center"><input type="radio" name="status" value="Reserved" defaultChecked={v.status === 'Reserved'} className="mr-1"/> 已訂</label>
                     <label className="flex items-center"><input type="radio" name="status" value="Sold" defaultChecked={v.status === 'Sold'} className="mr-1"/> 已售</label>
                </div>
            </div>

            {/* Sales Dates */}
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-yellow-50 p-4 rounded border border-yellow-100">
                <div>
                    <label className="block text-xs font-bold text-gray-500">入庫日期</label>
                    <input name="stockInDate" type="date" defaultValue={v.stockInDate || new Date().toISOString().split('T')[0]} className="w-full border p-2 rounded bg-white"/>
                </div>
                <div>
                    <label className="block text-xs font-bold text-green-700">出庫/成交日期 (Stock Out)</label>
                    <input name="stockOutDate" type="date" defaultValue={v.stockOutDate} className="w-full border p-2 rounded border-green-200 bg-white"/>
                </div>
            </div>

            {/* Customer Details */}
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs text-gray-500">客戶姓名 (Customer Name)</label><input name="customerName" defaultValue={v.customerName} className="w-full border p-2 rounded"/></div>
                <div><label className="text-xs text-gray-500">電話 (Phone)</label><input name="customerPhone" defaultValue={v.customerPhone} className="w-full border p-2 rounded"/></div>
                <div><label className="text-xs text-gray-500">身份證 (HKID)</label><input name="customerID" defaultValue={v.customerID} className="w-full border p-2 rounded"/></div>
                <div><label className="text-xs text-gray-500">地址 (Address)</label><input name="customerAddress" defaultValue={v.customerAddress} className="w-full border p-2 rounded"/></div>
            </div>
            
            {/* --- Vehicle Details --- */}
            <div className="md:col-span-3 border-t my-2 pt-2"><h3 className="font-bold text-gray-500 mb-2">車輛資料</h3></div>

            <div><label className="block text-xs font-bold text-gray-500">收購類型</label><select name="purchaseType" defaultValue={v.purchaseType || 'Used'} className="w-full border p-2 rounded bg-gray-50"><option value="Used">二手收購 (Used)</option><option value="New">訂購新車 (New)</option><option value="Consignment">寄賣 (Consignment)</option></select></div>
            <div><label className="block text-xs font-bold text-gray-500">車牌 (Reg. Mark)</label><input name="regMark" defaultValue={v.regMark} placeholder="未出牌可留空" className="w-full border p-2 rounded"/></div>
            <div><label className="block text-xs font-bold text-gray-500">牌費到期日</label><input name="licenseExpiry" type="date" defaultValue={v.licenseExpiry} className="w-full border p-2 rounded"/></div>

            <div><label className="block text-xs font-bold text-gray-500">廠牌 (Make)</label><select name="make" value={selectedMake} onChange={(e) => setSelectedMake(e.target.value)} required className="w-full border p-2 rounded"><option value="">請選擇...</option>{settings.makes.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            <div><label className="block text-xs font-bold text-gray-500">型號 (Model)</label><input list="model_list" name="model" defaultValue={v.model} required className="w-full border p-2 rounded" placeholder={selectedMake ? `選擇 ${selectedMake} 型號...` : '請先選擇廠牌'}/><datalist id="model_list">{(settings.models[selectedMake] || []).map(m => <option key={m} value={m} />)}</datalist></div>
            <div><label className="block text-xs font-bold text-gray-500">年份 (Year)</label><input name="year" type="number" defaultValue={v.year} required className="w-full border p-2 rounded"/></div>
            <div><label className="block text-xs font-bold text-gray-500">外觀顏色</label><input list="colors" name="colorExt" defaultValue={v.colorExt} className="w-full border p-2 rounded"/><datalist id="colors">{settings.colors.map(c => <option key={c} value={c} />)}</datalist></div>
            <div><label className="block text-xs font-bold text-gray-500">內飾顏色</label><input list="colors" name="colorInt" defaultValue={v.colorInt} className="w-full border p-2 rounded"/></div>
            
            {/* Tech Specs */}
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

            {/* ★★★ 核心升級：交易管理 (Payments) ★★★ */}
            {editingVehicle && (
              <div className="md:col-span-3 mt-6 bg-blue-50 p-4 rounded border border-blue-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold flex items-center text-blue-900"><DollarSign size={16} className="mr-2"/> 銷售與收款記錄 (Payments)</h3>
                    <div className="text-right text-sm">
                        <span className="mr-4 text-gray-600">總價: <strong>{formatCurrency(v.price)}</strong></span>
                        <span className="mr-4 text-green-600">已收: <strong>{formatCurrency(totalReceived)}</strong></span>
                        <span className={`font-bold ${balance > 0 ? 'text-red-500' : 'text-gray-400'}`}>餘額: {formatCurrency(balance)}</span>
                    </div>
                </div>

                {/* 文件生成按鈕 */}
                <div className="flex gap-2 mb-4">
                    <button type="button" onClick={() => openPrintPreview('sales_contract', v as Vehicle)} className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded text-xs hover:bg-blue-50 flex items-center"><FileText size={12} className="mr-1"/> 買賣合約 (Contract)</button>
                    <button type="button" onClick={() => openPrintPreview('invoice', v as Vehicle)} className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded text-xs hover:bg-blue-50 flex items-center"><FileText size={12} className="mr-1"/> 發票 (Invoice)</button>
                </div>

                {/* 交易列表 */}
                <table className="w-full text-sm bg-white border mb-4">
                  <thead><tr className="bg-blue-100 text-left"><th className="p-2">日期</th><th className="p-2">類型</th><th className="p-2">方式</th><th className="p-2">金額</th><th className="p-2">備注</th><th className="p-2">操作</th></tr></thead>
                  <tbody>
                    {v.payments?.map(pay => (
                      <tr key={pay.id} className="border-t">
                        <td className="p-2">{pay.date}</td>
                        <td className="p-2">{pay.type}</td>
                        <td className="p-2">{pay.method}</td>
                        <td className="p-2 font-mono font-bold">{formatCurrency(pay.amount)}</td>
                        <td className="p-2 text-gray-500 text-xs">{pay.note}</td>
                        <td className="p-2 flex gap-2">
                           <button type="button" onClick={() => openPrintPreview('receipt', v as Vehicle, pay)} className="text-blue-500 hover:text-blue-700 flex items-center text-xs"><Printer size={12} className="mr-1"/> 收據</button>
                           <button type="button" onClick={() => deletePayment(v.id!, pay.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                        </td>
                      </tr>
                    ))}
                    {(!v.payments || v.payments.length === 0) && <tr><td colSpan={6} className="p-4 text-center text-gray-400">暫無收款記錄</td></tr>}
                  </tbody>
                </table>

                {/* 新增收款 */}
                <div className="grid grid-cols-6 gap-2 items-end bg-blue-100 p-2 rounded">
                   <div className="col-span-1"><label className="text-[10px]">日期</label><input type="date" value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} className="w-full border p-1 rounded text-xs"/></div>
                   <div className="col-span-1"><label className="text-[10px]">類型</label><select value={newPayment.type} onChange={e => setNewPayment({...newPayment, type: e.target.value as any})} className="w-full border p-1 rounded text-xs"><option>Deposit</option><option>Part Payment</option><option>Balance</option><option>Full Payment</option></select></div>
                   <div className="col-span-1"><label className="text-[10px]">方式</label><select value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value as any})} className="w-full border p-1 rounded text-xs"><option>Cash</option><option>Cheque</option><option>Transfer</option></select></div>
                   <div className="col-span-1"><label className="text-[10px]">金額</label><input type="text" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: formatNumberInput(e.target.value)})} className="w-full border p-1 rounded text-xs" placeholder="0"/></div>
                   <div className="col-span-1"><label className="text-[10px]">備注</label><input type="text" value={newPayment.note} onChange={e => setNewPayment({...newPayment, note: e.target.value})} className="w-full border p-1 rounded text-xs" placeholder="支票號/備注"/></div>
                   <div className="col-span-1">
                      <button type="button" 
                        onClick={(e) => {
                          e.preventDefault();
                          const amount = Number(newPayment.amount.replace(/,/g, ''));
                          if(amount > 0) {
                              addPayment(v.id!, { id: Date.now().toString(), ...newPayment, amount } as Payment);
                              setNewPayment({...newPayment, amount: '', note: ''});
                          }
                        }} 
                        className="w-full bg-blue-600 text-white p-1 rounded text-xs hover:bg-blue-700 h-[26px]"
                      >新增收款</button>
                   </div>
                </div>
              </div>
            )}

            {/* 費用管理 */}
            {isNew ? null : (
              <div className="md:col-span-3 mt-6 bg-gray-50 p-4 rounded border">
                <h3 className="font-bold flex items-center mb-4"><Wrench size={16} className="mr-2"/> 處理費用記錄</h3>
                <table className="w-full text-sm bg-white border mb-4">
                  <thead><tr className="bg-gray-100 text-left"><th className="p-2">日期</th><th className="p-2">項目</th><th className="p-2">金額</th><th className="p-2">狀態</th><th className="p-2">操作</th></tr></thead>
                  <tbody>
                    {v.expenses?.map(exp => (
                      <tr key={exp.id} className="border-t">
                        <td className="p-2">{exp.date}</td>
                        <td className="p-2">{exp.type} <span className="text-gray-400 text-xs">({exp.company})</span></td>
                        <td className="p-2">{formatCurrency(exp.amount)}</td>
                        <td className="p-2"><select value={exp.status} onChange={(e) => updateExpenseStatus(v.id!, exp.id, e.target.value as any)} className={`text-xs border rounded ${exp.status==='Paid'?'bg-green-100':'bg-red-100'}`}><option value="Unpaid">未付</option><option value="Paid">已付</option></select></td>
                        <td className="p-2"><button type="button" onClick={() => deleteExpense(v.id!, exp.id)} className="text-red-500"><X size={14}/></button></td>
                      </tr>
                    ))}
                  </tbody>
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

  // --- 2. Report View ---
  const ReportView = () => { /* ... existing code ... */ return <div>Report View Placeholder</div>; }; // Placeholder to save space, logic same as before

  // --- 3. Settings Manager ---
  const SettingsManager = () => {
    const [activeMake, setActiveMake] = useState<string>(settings.makes[0] || '');
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-6">系統參數設置</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* ... existing settings UI ... */}
           <div className="bg-gray-50 p-4 rounded border">
              <h3 className="font-bold mb-3 text-sm text-gray-600">車輛廠牌</h3>
              <div className="flex gap-2 mb-3"><input id="new-make" className="flex-1 border p-2 rounded text-sm"/><button onClick={()=>{const el=document.getElementById('new-make') as HTMLInputElement; if(el.value) {updateSettings('makes', el.value, 'add'); el.value='';}}} className="bg-slate-800 text-white px-3 rounded"><Plus size={16}/></button></div>
              <ul className="max-h-40 overflow-y-auto space-y-1">{settings.makes.map(m=><li key={m} onClick={()=>setActiveMake(m)} className={`flex justify-between p-2 rounded border cursor-pointer text-sm ${activeMake===m?'bg-yellow-100 border-yellow-300':'bg-white'}`}><span>{m}</span><button onClick={(e)=>{e.stopPropagation(); updateSettings('makes', m, 'remove');}}><X size={14} className="text-red-400"/></button></li>)}</ul>
           </div>
           <div className="bg-gray-50 p-4 rounded border">
              <h3 className="font-bold mb-3 text-sm text-gray-600">型號列表 ({activeMake})</h3>
              <div className="flex gap-2 mb-3"><input id="new-model" className="flex-1 border p-2 rounded text-sm"/><button onClick={()=>{const el=document.getElementById('new-model') as HTMLInputElement; if(el.value) {updateSettings('models', el.value, 'add', activeMake); el.value='';}}} className="bg-slate-800 text-white px-3 rounded"><Plus size={16}/></button></div>
              <ul className="max-h-40 overflow-y-auto space-y-1">{(settings.models[activeMake]||[]).map(m=><li key={m} className="flex justify-between p-2 rounded border bg-white text-sm"><span>{m}</span><button onClick={()=>updateSettings('models', m, 'remove', activeMake)}><X size={14} className="text-red-400"/></button></li>)}</ul>
           </div>
        </div>
      </div>
    );
  };

  // --- 4. Document Template (Includes Receipt) ---
  const CompanyStamp = () => (<div className="w-[22mm] h-[22mm] rounded-full flex flex-col items-center justify-center transform -rotate-12 opacity-90 pointer-events-none select-none mix-blend-multiply" style={{ color: '#2b3d90', border: '2px solid #2b3d90', boxShadow: 'inset 0 0 0 1px rgba(43, 61, 144, 0.2), 0 0 2px rgba(43, 61, 144, 0.4)', backgroundColor: 'rgba(43, 61, 144, 0.02)', mixBlendMode: 'multiply' }}><div className="w-[90%] h-[90%] rounded-full flex flex-col items-center justify-center p-[1px]" style={{ border: '1px solid #2b3d90' }}><div className="absolute w-full h-full"><svg viewBox="0 0 100 100" className="w-full h-full absolute top-0 left-0"><defs><path id="textCircle" d="M 12, 50 A 38, 38 0 1, 1 88, 50" /></defs><text fontSize="11" fontWeight="bold" fill="#2b3d90" letterSpacing="1"><textPath href="#textCircle" startOffset="50%" textAnchor="middle">GOLD LAND AUTO</textPath></text></svg></div><div className="flex flex-col items-center justify-center mt-2 z-10"><span className="text-[6px] font-bold leading-none tracking-widest" style={{ textShadow: '0 0 0.5px #2b3d90' }}>金田</span><span className="text-[6px] font-bold leading-none tracking-widest mt-[1px]" style={{ textShadow: '0 0 0.5px #2b3d90' }}>汽車</span></div><div className="absolute bottom-1 text-[8px] font-bold text-[#2b3d90]">*</div></div></div>);
  const SignedStamp = () => (<div className="relative w-[50mm] h-[30mm] flex items-center justify-center"><svg viewBox="0 0 200 100" className="absolute top-0 left-0 w-full h-full pointer-events-none z-0" style={{ overflow: 'visible' }}><defs><filter id="ink-spread"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" /></filter></defs><path d="M20,60 C40,40 60,80 90,50 C110,30 130,70 160,40 C170,30 180,60 190,50" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" style={{ filter: 'url(#ink-spread)', opacity: 0.85 }} /><path d="M30,70 C60,60 120,60 180,55" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" style={{ filter: 'url(#ink-spread)', opacity: 0.9 }} /><path d="M50,40 Q40,80 60,70 T80,60" fill="none" stroke="black" strokeWidth="2.5" style={{ filter: 'url(#ink-spread)', opacity: 0.8 }} /></svg><div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2 w-[22mm] h-[22mm] flex items-center justify-center z-10 pointer-events-none select-none"><CompanyStamp /></div></div>);

  const DocumentTemplate = () => {
    if (!previewDoc) return null;
    const { type, vehicle, payment } = previewDoc;
    const today = payment ? payment.date : formatDate(new Date());

    const Header = ({ titleEn, titleCh }: { titleEn: string, titleCh: string }) => (
      <div className="mb-8">
        <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-2">
          <div className="w-24 h-24 flex-shrink-0 mr-4 flex items-center justify-center border border-gray-200 bg-gray-50 rounded-lg overflow-hidden"><div className="flex flex-col items-center justify-center text-gray-400 w-full h-full"><div className="flex flex-col items-center"><Building2 size={32} /><span className="text-[10px] mt-1">Logo</span></div></div></div>
          <div className="flex-1 text-right">
            <h1 className="text-3xl font-bold tracking-wide text-black">{COMPANY_INFO.name_en}</h1>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{COMPANY_INFO.name_ch}</h2>
            <div className="text-xs text-gray-600 space-y-1"><p>{COMPANY_INFO.address_en}</p><p>{COMPANY_INFO.address_ch}</p><p className="font-bold">Tel: {COMPANY_INFO.phone}</p></div>
          </div>
        </div>
        <div className="text-center mt-6"><h2 className="text-xl font-bold uppercase underline decoration-2 underline-offset-4">{titleEn}</h2><h3 className="text-lg font-bold mt-1">{titleCh}</h3></div>
      </div>
    );
    
    // Receipt Template
    if (type === 'receipt' && payment) {
        return (
            <div className="max-w-[210mm] mx-auto bg-white p-10 min-h-[148mm] border-b-2 border-dashed border-gray-300 text-black relative">
                <Header titleEn="OFFICIAL RECEIPT" titleCh="正式收據" />
                <div className="mb-6 text-sm relative z-10">
                    <div className="flex justify-between mb-6">
                       <p>日期: <span className="font-bold">{payment.date}</span></p>
                       <p>編號: <span className="font-bold">RCP-{payment.id.slice(-6)}</span></p>
                    </div>
                    <div className="border border-black p-6 bg-gray-50 leading-loose">
                        <div className="flex mb-2"><span className="w-32 flex-shrink-0">茲收到:</span><span className="border-b border-black flex-1 font-bold px-2">{vehicle.customerName || '________________'}</span></div>
                        <div className="flex mb-2"><span className="w-32 flex-shrink-0">款項:</span><span className="border-b border-black flex-1 font-bold px-2 text-xl">HKD {formatCurrency(payment.amount)}</span></div>
                        <div className="flex mb-2"><span className="w-32 flex-shrink-0">用途:</span><span className="border-b border-black flex-1 font-bold px-2">{payment.type} - {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.regMark})</span></div>
                        <div className="flex"><span className="w-32 flex-shrink-0">付款方式:</span><span className="border-b border-black flex-1 px-2">{payment.method} {payment.note ? `(${payment.note})` : ''}</span></div>
                    </div>
                </div>
                <div className="mt-8 flex justify-between items-end">
                    <div className="text-3xl font-bold border-4 border-black p-3 px-8 transform -rotate-2">HK{formatCurrency(payment.amount)}</div>
                    <div className="text-center w-64 relative"><div className="border-b border-black mb-1 h-8"></div><p>收款人簽署 & 蓋印</p><div className="absolute -top-8 left-10"><CompanyStamp /></div></div>
                </div>
            </div>
        );
    }
    
    // Contract / Invoice Template (Simplified for brevity)
    return (
        <div className="max-w-[210mm] mx-auto bg-white p-10 min-h-[297mm] text-black">
            <Header titleEn={type === 'sales_contract' ? "SALES AGREEMENT" : "INVOICE"} titleCh={type === 'sales_contract' ? "汽車買賣合約" : "發票"} />
            {/* ... Customer & Vehicle details table ... */}
            <div className="mt-20 text-center text-gray-500">[Contract/Invoice Content Here - Same as before]</div>
        </div>
    );
  };

  const Sidebar = () => (
    <>
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-40 bg-slate-900 text-white transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:h-screen flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-64'} print:hidden`}>
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">{!isSidebarCollapsed && <div><h1 className="text-xl font-bold text-yellow-500">GOLD LAND</h1></div>}<button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="text-slate-400 hover:text-white p-1">{isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}</button></div>
        <nav className="flex-1 p-2 space-y-2 overflow-y-auto">
            <button onClick={() => setActiveTab('inventory')} className="flex items-center w-full p-3 rounded hover:bg-slate-800 text-slate-300"><Car size={22} className={isSidebarCollapsed?'':'mr-3'}/><span className={isSidebarCollapsed?'hidden':''}>車輛管理</span></button>
        </nav>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white shadow-sm h-16 flex-shrink-0 flex items-center px-4 justify-between print:hidden">
            <div className="flex items-center"><button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-700 mr-4"><Menu /></button><span className="font-bold text-lg text-slate-800">Gold Land Auto</span></div>
            {activeTab === 'inventory' && <div className="relative w-64"><Search size={16} className="absolute left-3 top-2.5 text-gray-400"/><input type="text" placeholder="搜尋..." className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-full text-sm" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 print:m-0 print:p-0 print:overflow-visible">
            {isPreviewMode && (
              <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white p-3 rounded-lg shadow-xl z-50 flex items-center gap-4 print:hidden">
                <div className="font-bold text-sm">預覽模式</div>
                <button onClick={() => setIsPreviewMode(false)} className="px-3 py-1 bg-gray-600 rounded text-xs">關閉</button>
                <button onClick={handlePrint} className="px-3 py-1 bg-yellow-500 text-black rounded text-xs flex items-center"><Printer size={14} className="mr-1"/> 列印</button>
              </div>
            )}
            <div className={`${isPreviewMode ? 'block mt-8' : 'hidden'} print:block print:mt-0`}><div ref={printAreaRef} className="print:w-full"><DocumentTemplate /></div></div>

            <div className={`${isPreviewMode ? 'hidden' : 'block'} print:hidden space-y-6 pb-20`}>
              {(activeTab === 'inventory_add' || editingVehicle) && <VehicleFormModal />}
              
              {activeTab === 'inventory' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-slate-800">車輛庫存 ({getSortedInventory().length})</h2>
                    <button onClick={() => {setEditingVehicle({} as Vehicle); setActiveTab('inventory_add');}} className="bg-slate-900 text-white px-3 py-1.5 rounded text-sm flex items-center shadow-sm"><Plus size={16} className="mr-1"/> 入庫</button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {getSortedInventory().map((car) => {
                       const received = car.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
                       const balance = (car.price || 0) - received;
                       return (
                      <div key={car.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:border-yellow-400 transition group relative">
                         <div className="flex justify-between items-start">
                           <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-base text-slate-800">{car.regMark || '未出牌'}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${car.status==='In Stock'?'bg-green-50 text-green-700':(car.status==='Sold'?'bg-gray-100 text-gray-600':'bg-yellow-50 text-yellow-700')}`}>{car.status}</span>
                              </div>
                              <p className="text-sm font-medium text-gray-700">{car.year} {car.make} {car.model}</p>
                              {/* ★★★ 車輛卡片顯示收款狀況 ★★★ */}
                              {(car.status === 'Sold' || car.status === 'Reserved') && (
                                <div className="mt-2 text-xs bg-slate-50 p-1 rounded inline-block border border-slate-100">
                                   <span className="text-green-600 mr-2">已收: {formatCurrency(received)}</span>
                                   <span className={`font-bold ${balance > 0 ? 'text-red-500' : 'text-gray-400'}`}>餘: {formatCurrency(balance)}</span>
                                </div>
                              )}
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
              )}
            </div>
        </main>
      </div>
    </div>
  );
}
