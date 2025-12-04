'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Car, 
  FileText, 
  LayoutDashboard, 
  Plus, 
  Printer, 
  Trash2,
  DollarSign,
  Menu, 
  X, 
  Building2,
  Database,
  Loader2,
  DownloadCloud,
  AlertTriangle,
  Users,
  Settings,
  Save,
  LogOut,
  UserCircle,
  ArrowRight
} from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signInWithCustomToken,
  User,
  initializeAuth,
  browserLocalPersistence,
  inMemoryPersistence,
  Auth
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  Firestore
} from "firebase/firestore";

// ------------------------------------------------------------------
// ★★★ 預設設定 ★★★
// ------------------------------------------------------------------
const YOUR_FIREBASE_CONFIG = {
  apiKey: "請填入您的值",
  authDomain: "請填入您的值",
  projectId: "請填入您的值",
  storageBucket: "請填入您的值",
  messagingSenderId: "請填入您的值",
  appId: "請填入您的值"
};

// --- Global Firebase Instances ---
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// --- Helper: Get Config ---
const getEffectiveConfig = () => {
  if (YOUR_FIREBASE_CONFIG.apiKey !== "請填入您的值" && YOUR_FIREBASE_CONFIG.apiKey !== "") {
    return YOUR_FIREBASE_CONFIG;
  }
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_FIREBASE_CONFIG) {
    try { return JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG); } catch (e) {}
  }
  if (typeof window !== 'undefined' && (window as any).__firebase_config) {
    try { return JSON.parse((window as any).__firebase_config); } catch (e) {}
  }
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('dms_firebase_config');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
  }
  return null;
};

// --- Initialize Firebase ---
const initFirebaseSystem = () => {
  const config = getEffectiveConfig();
  if (!config) return false;

  try {
    app = getApps().length > 0 ? getApp() : initializeApp(config);
    
    // Auth Initialization with Fallback
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
const appId = (typeof window !== 'undefined' && (window as any).__app_id) || 'gold-land-auto';

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
type Vehicle = {
  id: string;
  regMark: string;
  make: string;
  model: string;
  year: string;
  chassisNo: string;
  engineNo: string;
  price: number;
  status: 'In Stock' | 'Sold' | 'Reserved';
  createdAt?: any;
};

type Customer = {
  name: string;
  phone: string;
  hkid: string;
  address: string;
};

type DocType = 'sales_contract' | 'purchase_contract' | 'invoice' | 'receipt';

const MOCK_INVENTORY = [
  { regMark: 'KG8888', make: 'Toyota', model: 'Alphard 3.5', year: '2019', chassisNo: 'AGH30-1234567', engineNo: '2GR-987654', price: 388000, status: 'In Stock' },
  { regMark: 'AB1234', make: 'Mercedes-Benz', model: 'E200 AMG', year: '2018', chassisNo: 'W213-5556666', engineNo: 'M274-111222', price: 238000, status: 'In Stock' },
  { regMark: 'XY999', make: 'Tesla', model: 'Model 3 LR', year: '2021', chassisNo: '5YJ3-8888888', engineNo: '3D1-000000', price: 198000, status: 'Sold' },
];

const formatCurrency = (amount: number) => new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD' }).format(amount);
const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });

// --- Components: Config Wizard ---
const ConfigWizard = () => {
  const [configInput, setConfigInput] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    try {
      const parsed = JSON.parse(configInput);
      if (!parsed.apiKey || !parsed.authDomain) throw new Error("設定缺少 apiKey 或 authDomain");
      localStorage.setItem('dms_firebase_config', JSON.stringify(parsed));
      window.location.reload();
    } catch (e) {
      const jsonMatch = configInput.match(/{[\s\S]*}/);
      if (jsonMatch) {
        try {
          const validJson = jsonMatch[0].replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ').replace(/'/g, '"');
          const parsed = JSON.parse(validJson);
          localStorage.setItem('dms_firebase_config', JSON.stringify(parsed));
          window.location.reload();
          return;
        } catch(err) { setError("無法解析設定格式，請確保是標準 JSON。"); }
      } else {
        setError("格式錯誤：請貼上包含 { apiKey: ... } 的設定。");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-8 max-w-lg w-full shadow-2xl">
        <div className="flex items-center mb-6 text-slate-800"><Settings className="w-8 h-8 mr-3 text-yellow-500" /><h1 className="text-2xl font-bold">系統初始化</h1></div>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6"><p className="text-sm text-yellow-700">請貼上 Firebase Config 以連接資料庫。</p></div>
        <div className="space-y-4">
          <textarea rows={10} className="w-full p-3 border rounded text-xs bg-gray-50 font-mono" placeholder={'const firebaseConfig = {\n  apiKey: "..."\n};'} value={configInput} onChange={(e) => setConfigInput(e.target.value)} />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button onClick={handleSave} className="w-full bg-slate-900 text-white py-3 rounded font-bold hover:bg-slate-800 flex items-center justify-center"><Save size={18} className="mr-2" /> 儲存並啟動</button>
        </div>
      </div>
    </div>
  );
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
          <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <UserCircle size={48} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">歡迎使用金田汽車系統</h1>
          <p className="text-slate-500 text-sm mt-2">Welcome to Gold Land Auto DMS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">請輸入您的 員工編號 / 登入名稱</label>
            <input 
              type="text" 
              className="w-full p-4 border border-slate-300 rounded-xl text-lg focus:ring-2 focus:ring-yellow-500 outline-none transition"
              placeholder="e.g. BOSS, SALES01, ADMIN"
              value={input}
              onChange={e => setInput(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-slate-400 mt-2">※ 此 ID 將用於識別及儲存您的資料 (Case Sensitive)</p>
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-xl font-bold text-lg flex items-center justify-center transition transform active:scale-95 shadow-lg"
          >
            登入系統 <ArrowRight className="ml-2" />
          </button>
        </form>
      </div>
    </div>
  );
};

// --- 主應用程式 ---
export default function GoldLandAutoDMS() {
  const [user, setUser] = useState<User | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null); // 新增：員工 ID
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'create_doc'>('dashboard');
  const [inventory, setInventory] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '', hkid: '', address: '' });
  const [deposit, setDeposit] = useState<number>(0);
  const [docType, setDocType] = useState<DocType>('sales_contract');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => { window.print(); };

  // 1. Config Check
  if (!isFirebaseReady) return <ConfigWizard />;

  // 2. Login Handling
  const handleStaffLogin = (id: string) => {
    setStaffId(id);
    // 可選：儲存到 localStorage 以便下次自動登入
    // localStorage.setItem('dms_staff_id', id); 
  };

  const handleLogout = () => {
    if(confirm("確定要登出並切換使用者？")) {
      setStaffId(null);
      setInventory([]);
    }
  };

  // 3. Auth Effect
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
        console.error("Login failed:", error);
        if (!error.message?.includes('storage')) setAuthError(error.message);
        setLoading(false);
      }
    };
    
    const unsubscribe = onAuthStateChanged(currentAuth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) setAuthError(null);
      setLoading(false);
    });

    initAuth();
    return () => unsubscribe();
  }, []);

  // 4. Firestore Listener (Depend on Staff ID)
  useEffect(() => {
    if (!db || !staffId) return; // 只有在有 staffId 時才連線

    // ★★★ 關鍵：使用 Staff ID 作為資料夾名稱 ★★★
    // 路徑: artifacts/{appId}/public/data/{staffId}/inventory
    // 這樣即使 Firebase UID 變了，只要 Staff ID 一樣，資料就找得回來
    const inventoryRef = collection(db, 'artifacts', appId, 'public', 'data', staffId, 'inventory');
    const q = query(inventoryRef, orderBy('createdAt', 'desc'));

    setLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vehicles: Vehicle[] = [];
      snapshot.forEach((doc) => {
        vehicles.push({ id: doc.id, ...doc.data() } as Vehicle);
      });
      setInventory(vehicles);
      setLoading(false);
    }, (error) => {
      console.error("Firestore sync error:", error);
      setAuthError("Permission Denied: 請檢查 Firebase Rules"); 
      setLoading(false);
    });

    return () => unsubscribe();
  }, [staffId]); // 當 staffId 改變時重新連線

  // 如果還沒輸入員工編號，顯示登入畫面
  if (!staffId) {
    return <StaffLoginScreen onLogin={handleStaffLogin} />;
  }

  // --- Actions ---

  const handleAddVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !staffId) return;

    const formData = new FormData(e.currentTarget);
    const newVehicle = {
      regMark: (formData.get('regMark') as string).toUpperCase(),
      make: formData.get('make') as string,
      model: formData.get('model') as string,
      year: formData.get('year') as string,
      chassisNo: (formData.get('chassisNo') as string).toUpperCase(),
      engineNo: (formData.get('engineNo') as string).toUpperCase(),
      price: Number(formData.get('price')),
      status: 'In Stock',
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', staffId, 'inventory'), newVehicle);
      (e.target as HTMLFormElement).reset();
      alert('車輛已成功儲存！');
    } catch (error) {
      console.error("Error adding document: ", error);
      alert('儲存失敗，請檢查權限。');
    }
  };

  const deleteVehicle = async (id: string) => {
    if (!db || !staffId) return;
    if (confirm('確定要從雲端刪除此車輛資料？')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', staffId, 'inventory', id));
      } catch (error) {
        console.error("Error deleting:", error);
        alert('刪除失敗');
      }
    }
  };

  const loadDemoData = async () => {
    if (!db || !staffId) return;
    if (!confirm('這將會寫入範例資料到您的帳戶，確定嗎？')) return;

    const batch = writeBatch(db);
    const inventoryRef = collection(db, 'artifacts', appId, 'public', 'data', staffId, 'inventory');

    MOCK_INVENTORY.forEach(car => {
      const docRef = doc(inventoryRef);
      batch.set(docRef, { ...car, createdAt: serverTimestamp() });
    });

    try {
      await batch.commit();
      alert('範例資料已載入！');
    } catch (err) {
      console.error(err);
      alert('載入失敗');
    }
  };

  const resetConfig = () => {
    if(confirm('確定要清除設定並重置？')) {
      localStorage.removeItem('dms_firebase_config');
      window.location.reload();
    }
  };

  // --- Components ---
  const CompanyStamp = () => (
    <div className="absolute -top-10 left-4 w-36 h-36 border-4 border-red-600 rounded-full flex flex-col items-center justify-center transform -rotate-12 opacity-80 pointer-events-none select-none mix-blend-multiply z-10" style={{boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.3)'}}>
      <div className="w-[90%] h-[90%] border border-red-600 rounded-full flex flex-col items-center justify-center p-1">
        <div className="text-red-600 font-bold text-center leading-tight">
          <div className="text-[10px] scale-90 tracking-widest">GOLD LAND AUTO</div>
          <div className="text-[14px] my-1">金田汽車</div>
          <div className="text-[8px] mt-1 border-t border-red-600 pt-1 px-2">{formatDate(new Date())}</div>
        </div>
      </div>
    </div>
  );

  const DocumentTemplate = () => {
    if (!selectedVehicle) return null;
    const today = formatDate(new Date());
    const balance = selectedVehicle.price - deposit;

    const Header = ({ titleEn, titleCh }: { titleEn: string, titleCh: string }) => (
      <div className="mb-8">
        <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-2">
          <div className="w-24 h-24 flex-shrink-0 mr-4 flex items-center justify-center border border-gray-200 bg-gray-50 rounded-lg overflow-hidden">
             <div className="flex flex-col items-center justify-center text-gray-400 w-full h-full">
                <div className="flex flex-col items-center"><Building2 size={32} /><span className="text-[10px] mt-1">Logo</span></div>
             </div>
          </div>
          <div className="flex-1 text-right">
            <h1 className="text-3xl font-bold tracking-wide text-black">{COMPANY_INFO.name_en}</h1>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{COMPANY_INFO.name_ch}</h2>
            <div className="text-xs text-gray-600 space-y-1"><p>{COMPANY_INFO.address_en}</p><p>{COMPANY_INFO.address_ch}</p><p className="font-bold">Tel: {COMPANY_INFO.phone}</p></div>
          </div>
        </div>
        <div className="text-center mt-6"><h2 className="text-xl font-bold uppercase underline decoration-2 underline-offset-4">{titleEn}</h2><h3 className="text-lg font-bold mt-1">{titleCh}</h3></div>
      </div>
    );

    const VehicleTable = () => (
      <table className="w-full border-collapse border border-black mb-6 text-sm">
        <tbody>
          <tr><td className="border border-black p-2 bg-gray-100 font-bold w-1/4">車牌號碼<br/><span className="text-xs font-normal">Reg. Mark</span></td><td className="border border-black p-2 w-1/4 font-mono font-bold text-lg">{selectedVehicle.regMark}</td><td className="border border-black p-2 bg-gray-100 font-bold w-1/4">製造年份<br/><span className="text-xs font-normal">Year</span></td><td className="border border-black p-2 w-1/4">{selectedVehicle.year}</td></tr>
          <tr><td className="border border-black p-2 bg-gray-100 font-bold">廠名<br/><span className="text-xs font-normal">Make</span></td><td className="border border-black p-2">{selectedVehicle.make}</td><td className="border border-black p-2 bg-gray-100 font-bold">型號<br/><span className="text-xs font-normal">Model</span></td><td className="border border-black p-2">{selectedVehicle.model}</td></tr>
          <tr><td className="border border-black p-2 bg-gray-100 font-bold">底盤號碼<br/><span className="text-xs font-normal">Chassis No.</span></td><td className="border border-black p-2 font-mono" colSpan={3}>{selectedVehicle.chassisNo}</td></tr>
          <tr><td className="border border-black p-2 bg-gray-100 font-bold">引擎號碼<br/><span className="text-xs font-normal">Engine No.</span></td><td className="border border-black p-2 font-mono" colSpan={3}>{selectedVehicle.engineNo}</td></tr>
        </tbody>
      </table>
    );

    if (docType === 'sales_contract') {
      return (
        <div className="max-w-[210mm] mx-auto bg-white p-10 min-h-[297mm] text-black relative">
          <Header titleEn="Sales & Purchase Agreement" titleCh="汽車買賣合約" />
          <div className="flex justify-between mb-4 text-sm border-b pb-2"><span>合約編號: <span className="font-mono font-bold">SLA-{today.replace(/\//g,'')}-{selectedVehicle.id.slice(0,6)}</span></span><span>日期: {today}</span></div>
          <div className="mb-6">
            <h3 className="font-bold border-b-2 border-gray-800 mb-2 bg-gray-100 p-1">甲、買方資料 / Purchaser Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-gray-500 text-xs">姓名 / Name</p><p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{customer.name}</p></div><div><p className="text-gray-500 text-xs">電話 / Phone</p><p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{customer.phone}</p></div><div><p className="text-gray-500 text-xs">身份證號碼 / HKID</p><p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{customer.hkid}</p></div><div className="col-span-2"><p className="text-gray-500 text-xs">地址 / Address</p><p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{customer.address}</p></div></div>
          </div>
          <div className="mb-6"><h3 className="font-bold border-b-2 border-gray-800 mb-2 bg-gray-100 p-1">乙、車輛資料 / Vehicle Details</h3><VehicleTable /></div>
          <div className="mb-6"><h3 className="font-bold border-b-2 border-gray-800 mb-2 bg-gray-100 p-1">丙、交易款項 / Payment Details</h3><div className="text-sm space-y-3 px-2"><div className="flex justify-between items-end border-b border-dotted border-gray-400 pb-1"><span>成交價 (Vehicle Price):</span><span className="font-bold text-lg">{formatCurrency(selectedVehicle.price)}</span></div><div className="flex justify-between items-end border-b border-dotted border-gray-400 pb-1"><span>已付訂金 (Deposit Paid):</span><span className="text-lg">{formatCurrency(deposit)}</span></div><div className="flex justify-between items-end border-b-2 border-black pb-1 mt-2"><span className="font-bold">尚餘尾數 (Balance Due):</span><span className="font-bold text-xl">{formatCurrency(balance)}</span></div></div></div>
          <div className="mb-8 text-[11px] text-justify leading-relaxed text-gray-700"><h3 className="font-bold mb-1 text-sm text-black">條款及細則 / Terms & Conditions:</h3><ol className="list-decimal pl-4 space-y-1"><li>買方已親自驗收上述車輛，並確認車輛之機件性能及外觀狀況良好，同意以「現狀」成交。<br/><span className="italic text-gray-500">The Purchaser has inspected the vehicle and accepted its condition on an "as-is" basis.</span></li><li>如買方悔約，賣方有權沒收所有訂金。<br/><span className="italic text-gray-500">Deposit will be forfeited if the Purchaser fails to complete the payment.</span></li><li>賣方保證上述車輛並無涉及任何未清之財務按揭、罰款或法律訴訟。<br/><span className="italic text-gray-500">The Vendor guarantees the vehicle is free from any outstanding finance, fines, or legal encumbrances.</span></li></ol></div>
          <div className="grid grid-cols-2 gap-16 mt-12"><div className="relative"><div className="border-t border-black pt-2 text-center"><p className="font-bold">賣方簽署及公司蓋印</p><p className="text-xs text-gray-500">Authorized Signature & Chop</p><p className="text-xs font-bold mt-1">For and on behalf of<br/>{COMPANY_INFO.name_en}</p></div><CompanyStamp /></div><div><div className="border-t border-black pt-2 text-center"><p className="font-bold">買方簽署</p><p className="text-xs text-gray-500">Purchaser Signature</p></div></div></div>
        </div>
      );
    }
    
    return (
        <div className="max-w-[210mm] mx-auto bg-white p-10 min-h-[297mm] text-black">
            <Header titleEn={docType === 'invoice' ? "INVOICE" : (docType === 'purchase_contract' ? "PURCHASE AGREEMENT" : "OFFICIAL RECEIPT")} titleCh={docType === 'invoice' ? "發票" : (docType === 'purchase_contract' ? "買入車輛合約" : "正式收據")} />
            <div className="flex justify-between mb-8 border p-4 rounded-lg bg-gray-50">
                <div className="flex-1"><p className="text-gray-500 text-xs">Customer / 客戶:</p><p className="font-bold text-lg mt-1">{customer.name}</p><p className="text-sm">{customer.address}</p></div>
                <div className="text-right border-l pl-8 ml-8"><div><p className="text-gray-500 text-xs">No.</p><p className="font-bold">{docType === 'invoice' ? 'INV' : 'DOC'}-{today.replace(/\//g,'')}-{selectedVehicle.id.slice(0,6)}</p></div><div><p className="text-gray-500 text-xs">Date</p><p className="font-bold">{today}</p></div></div>
            </div>
            <VehicleTable />
            {docType === 'invoice' && <div className="mt-8 border-t-2 border-black pt-4 flex justify-between items-center text-xl font-bold"><span>Total / 總數:</span><span>{formatCurrency(selectedVehicle.price)}</span></div>}
            {docType !== 'invoice' && <div className="text-center p-10 text-gray-500 italic">{docType === 'receipt' ? `Received HKD ${formatCurrency(deposit)} from ${customer.name}` : `Gold Land Auto agrees to purchase the vehicle for ${formatCurrency(selectedVehicle.price)}`}</div>}
            <div className="mt-20 relative"><div className="border-t border-black pt-4 w-1/2 text-center"><p>Authorized Signature</p></div><CompanyStamp /></div>
        </div>
    );
  };

  const Sidebar = () => (
    <>
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:h-screen flex flex-col print:hidden`}>
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div><h1 className="text-xl font-bold text-yellow-500 tracking-tighter">GOLD LAND</h1><p className="text-xs text-slate-400 mt-1">Enterprise System</p></div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white"><X size={24} /></button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={`flex items-center w-full p-3 rounded transition ${activeTab === 'dashboard' ? 'bg-yellow-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}><LayoutDashboard size={20} className="mr-3" /> 儀表板</button>
          <button onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }} className={`flex items-center w-full p-3 rounded transition ${activeTab === 'inventory' ? 'bg-yellow-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}><Car size={20} className="mr-3" /> 車輛庫存</button>
          <button onClick={() => { setActiveTab('create_doc'); setIsMobileMenuOpen(false); }} className={`flex items-center w-full p-3 rounded transition ${activeTab === 'create_doc' ? 'bg-yellow-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}><FileText size={20} className="mr-3" /> 開單系統</button>
        </nav>
        <div className="p-4 text-xs text-slate-500 text-center border-t border-slate-800 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${db ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{db ? 'System Online' : 'Offline'}</span>
            </div>
            
            <div className="mt-3 flex items-center justify-center space-x-2 bg-slate-800 p-2 rounded w-full">
               <UserCircle size={14} className="text-yellow-500"/>
               <span className="font-bold text-white truncate max-w-[80px]">{staffId}</span>
            </div>

            <button onClick={handleLogout} className="mt-2 text-[10px] flex items-center text-red-400 hover:text-red-300 transition">
              <LogOut size={10} className="mr-1" /> 切換帳戶 (Logout)
            </button>

            {!isFirebaseReady && <div className="mt-2 text-[10px] text-yellow-500 border border-yellow-700 rounded p-1 flex items-center bg-slate-800 animate-pulse"><AlertTriangle size={12} className="mr-1" /> Config Missing</div>}
            
            <button onClick={resetConfig} className="mt-4 flex items-center text-gray-500 hover:text-white transition text-[10px]">
              <Settings size={10} className="mr-1" /> Reset Config
            </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 font-sans">
      <Sidebar />
      <main className="flex-1 w-full min-w-0 md:ml-0 p-4 md:p-8 print:m-0 print:p-0 transition-all duration-300">
        <div className="md:hidden flex items-center justify-between mb-6 bg-white p-4 rounded-lg shadow-sm print:hidden">
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-700"><Menu size={28} /></button>
          <span className="font-bold text-lg text-slate-800">Gold Land Auto</span>
          <div className="w-7"></div>
        </div>

        {isPreviewMode && (
          <div className="fixed top-0 left-0 right-0 bg-slate-800 text-white p-3 md:p-4 flex flex-col md:flex-row justify-between items-center z-50 shadow-xl print:hidden gap-3">
            <div className="font-bold flex items-center text-sm md:text-base"><FileText className="mr-2" /> 預覽文件</div>
            <div className="flex space-x-3 w-full md:w-auto">
              <button onClick={() => setIsPreviewMode(false)} className="flex-1 md:flex-none px-4 py-2 bg-gray-600 rounded hover:bg-gray-500 text-sm">返回</button>
              <button onClick={handlePrint} className="flex-1 md:flex-none px-4 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400 flex items-center justify-center text-sm shadow-md"><Printer size={18} className="mr-2" /> 列印 / PDF</button>
            </div>
          </div>
        )}

        <div className={`${isPreviewMode ? 'block mt-24 md:mt-16' : 'hidden'} print:block print:mt-0`}>
          <div ref={printAreaRef} className="print:w-full"><DocumentTemplate /></div>
        </div>

        <div className={`${isPreviewMode ? 'hidden' : 'block'} print:hidden space-y-6`}>
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                  業務概況 ({staffId})
                  {loading && <Loader2 className="ml-3 animate-spin text-yellow-500" />}
              </h2>
              {!loading && inventory.length === 0 && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center justify-between">
                      <div className="flex items-center text-blue-800"><Database className="mr-3" /><div><p className="font-bold">目前無資料 (ID: {staffId})</p><p className="text-sm">是否載入範例資料？</p></div></div>
                      <button onClick={loadDemoData} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center text-sm"><DownloadCloud size={16} className="mr-2"/> 載入範例</button>
                  </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500 flex justify-between items-center"><div><p className="text-sm text-gray-500">在庫車輛</p><p className="text-3xl font-bold">{inventory.filter(v => v.status === 'In Stock').length}</p></div><Car className="text-yellow-500 opacity-20" size={40} /></div>
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500 flex justify-between items-center"><div><p className="text-sm text-gray-500">本月銷售額</p><p className="text-2xl font-bold text-green-700">HK$ {formatCurrency(inventory.filter(v => v.status === 'Sold').length * 28000).replace('HK$', '')}</p></div><DollarSign className="text-green-500 opacity-20" size={40} /></div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 overflow-hidden">
                <h3 className="font-bold mb-4">最新庫存狀態</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead><tr className="border-b bg-gray-50"><th className="p-3">狀態</th><th className="p-3">車牌</th><th className="p-3">車型</th><th className="p-3">售價</th></tr></thead>
                    <tbody>
                      {inventory.slice(0,5).map(car => (
                        <tr key={car.id} className="border-b last:border-0 hover:bg-gray-50"><td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${car.status === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{car.status === 'In Stock' ? '在庫' : '已售'}</span></td><td className="p-3 font-medium">{car.regMark}</td><td className="p-3">{car.make} {car.model}</td><td className="p-3">{formatCurrency(car.price)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-slate-800">車輛庫存 ({staffId})</h2>
              <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm">
                <h3 className="font-bold mb-4 flex items-center text-slate-700"><Plus size={18} className="mr-2"/> 快速入庫</h3>
                <form onSubmit={handleAddVehicle} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <input name="regMark" placeholder="車牌" required className="border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none" />
                  <input name="make" placeholder="廠名" required className="border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none" />
                  <input name="model" placeholder="型號" required className="border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none" />
                  <input name="year" placeholder="年份" required className="border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none" />
                  <input name="chassisNo" placeholder="底盤號 (VIN)" required className="border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none" />
                  <input name="engineNo" placeholder="引擎號" required className="border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none" />
                  <input name="price" type="number" placeholder="定價" required className="border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none" />
                  <button type="submit" className="bg-slate-900 text-white p-2 rounded hover:bg-slate-800 transition md:col-span-1 lg:col-span-1 flex items-center justify-center">{loading ? <Loader2 className="animate-spin"/> : '儲存'}</button>
                </form>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {loading ? <div className="text-center p-8 text-gray-500">載入中...</div> : inventory.map((car) => (
                  <div key={car.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 hover:shadow-md transition">
                     <div className="flex items-start space-x-4"><div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0"><Car size={24} className="text-slate-500"/></div><div><p className="font-bold text-lg text-slate-800">{car.regMark} <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full ml-2">{car.year}</span></p><p className="text-gray-600 font-medium">{car.make} {car.model}</p><p className="text-xs text-gray-400 font-mono mt-1">VIN: {car.chassisNo}</p></div></div>
                     <div className="flex w-full md:w-auto justify-between md:justify-end items-center space-x-0 md:space-x-6"><div className="text-left md:text-right"><p className="font-bold text-xl text-yellow-600">{formatCurrency(car.price)}</p><span className={`text-[10px] px-2 py-1 rounded uppercase tracking-wider font-bold ${car.status === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{car.status}</span></div><div className="flex space-x-2"><button onClick={() => { setSelectedVehicle(car); setActiveTab('create_doc'); }} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition" title="開單"><FileText size={20} /></button><button onClick={() => deleteVehicle(car.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition" title="刪除"><Trash2 size={20} /></button></div></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'create_doc' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">開立合約 / 文件</h2>
              <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border-l-4 border-yellow-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Car size={100} /></div>
                <h3 className="font-bold text-lg mb-4 flex items-center relative z-10"><span className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm font-bold shadow-sm">1</span> 選擇交易車輛</h3>
                {selectedVehicle ? (
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
                    <div className="mb-2 md:mb-0"><p className="font-bold text-lg text-slate-800">{selectedVehicle.regMark}</p><p className="text-slate-600">{selectedVehicle.make} {selectedVehicle.model}</p></div>
                    <div className="text-right w-full md:w-auto flex flex-row md:flex-col justify-between items-center"><p className="text-yellow-600 font-bold text-xl mr-4 md:mr-0">{formatCurrency(selectedVehicle.price)}</p><button onClick={() => setSelectedVehicle(null)} className="text-red-500 text-sm hover:text-red-700 underline">重選</button></div>
                  </div>
                ) : (
                  <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 relative z-10"><p className="text-gray-500 mb-4">請先從庫存列表中選擇一輛車</p><button onClick={() => setActiveTab('inventory')} className="px-6 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition shadow">前往選擇車輛</button></div>
                )}
              </div>

              {selectedVehicle && (
                <>
                  <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
                    <h3 className="font-bold text-lg mb-4 flex items-center"><span className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm font-bold shadow-sm">2</span> 客戶 / 買方資料</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">客戶姓名 / Name</label><input value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none transition" placeholder="陳大文 / Chan Tai Man"/></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">電話 / Phone</label><input value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none transition" placeholder="9123 4567"/></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">身份證 / HKID</label><input value={customer.hkid} onChange={e => setCustomer({...customer, hkid: e.target.value})} className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none transition" placeholder="A123456(7)"/></div>
                      <div className="space-y-1 md:col-span-2"><label className="text-xs font-bold text-gray-500 uppercase">地址 / Address</label><input value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none transition" placeholder="詳細地址"/></div>
                    </div>
                  </div>
                  <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
                    <h3 className="font-bold text-lg mb-4 flex items-center"><span className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm font-bold shadow-sm">3</span> 文件設定</h3>
                    <div className="mb-6">
                      <label className="block text-sm font-bold text-gray-700 mb-3">選擇要生成的文件：</label>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <button onClick={() => setDocType('sales_contract')} className={`p-3 text-sm rounded-lg border-2 transition-all font-medium ${docType === 'sales_contract' ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-slate-300'}`}>買賣合約</button>
                        <button onClick={() => setDocType('purchase_contract')} className={`p-3 text-sm rounded-lg border-2 transition-all font-medium ${docType === 'purchase_contract' ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-slate-300'}`}>收車合約</button>
                        <button onClick={() => setDocType('invoice')} className={`p-3 text-sm rounded-lg border-2 transition-all font-medium ${docType === 'invoice' ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-slate-300'}`}>發票 (Invoice)</button>
                        <button onClick={() => setDocType('receipt')} className={`p-3 text-sm rounded-lg border-2 transition-all font-medium ${docType === 'receipt' ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-slate-300'}`}>收據 (Receipt)</button>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-bold text-gray-700 mb-2">{docType === 'receipt' ? '是次收款金額' : '已付訂金 (Deposit)'}</label>
                      <div className="relative rounded-md shadow-sm max-w-xs"><div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500 font-bold">$</span></div><input type="number" value={deposit} onChange={e => setDeposit(Number(e.target.value))} className="block w-full rounded-md border-gray-300 pl-8 p-3 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-yellow-400 outline-none" placeholder="0"/></div>
                      <p className="text-xs text-gray-500 mt-2 flex items-center">系統將自動計算尾數： <span className="font-bold ml-1 text-slate-700">{formatCurrency(selectedVehicle.price - deposit)}</span></p>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4 sticky bottom-4 z-20">
                    <button onClick={() => setIsPreviewMode(true)} className="w-full md:w-auto bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white text-lg px-8 py-4 rounded-xl shadow-lg flex items-center justify-center font-bold transition transform active:scale-95"><FileText className="mr-2" /> 預覽文件並列印</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
