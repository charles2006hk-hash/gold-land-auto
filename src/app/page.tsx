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
  Check, AlertCircle, Link, Share2, Key, Sun, Crop, Move, MousePointer2, Palette,
  CreditCard as PaymentIcon, MapPin, Info, RefreshCw, Globe, Upload, Image as ImageIcon, File, ArrowLeft, // Added Upload, Image as ImageIcon, File
  Minimize2, Maximize2, Eye, Star, Clipboard, Copy, GitMerge, Play, Camera, History, BellRing, MessageCircle, Send, ListTodo, Ship, FileSignature
} from 'lucide-react';

// --- 匯入抽離的型別與常數 ---
import {
    DatabaseEntry, MediaLibraryItem, Expense, Payment, CrossBorderTask,
    DocCustodyLog, CrossBorderData, Vehicle, SystemSettings, Customer,
    DocType, DatabaseAttachment
} from '@/types';

import {
    COMPANY_INFO, DEFAULT_SETTINGS, WORKFLOW_TEMPLATES,
    PORTS_HK_GD, PORTS_MO_GD, ALL_CB_PORTS, AVAILABLE_PORTS,
    DB_CATEGORIES, DOCUMENT_FIELD_SCHEMA
} from '@/config/constants';

// --- 輔助工具函數 ---
const formatCurrency = (amount: number) => new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', maximumFractionDigits: 0 }).format(amount || 0);
const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });

import { compressImage } from '@/utils/imageHelpers';
import ImportOrderManager from '@/components/ImportOrderManager';
import DocumentTemplate from '@/components/DocumentTemplate';
import CreateDocModule from '@/components/CreateDocModule';
import CompanyFinanceLedger from '@/components/CompanyFinanceLedger';
import VehicleFormModal from '@/components/VehicleFormModal';
import SettingsManager from '@/components/SettingsManager';
import FinanceModule from '@/components/FinanceModule';
import TeamHubDrawer from '@/components/TeamHubDrawer';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import MarketIntelligence from '@/components/MarketIntelligence';
import MediaLibraryModule from '@/components/MediaLibraryModule';
import DatabaseModule from '@/components/DatabaseModule';
import CrossBorderView from '@/components/CrossBorderView';
import BusinessProcessModule from '@/components/BusinessProcessModule';
import SmartNewsTicker from '@/components/SmartNewsTicker';
import InfoWidget from '@/components/InfoWidget';
import SmartNotificationCenter from '@/components/SmartNotificationCenter';
import TradePlateWidget from '@/components/TradePlateWidget'; // 請確認路徑是否正確
import DashboardModule from '@/components/DashboardModule';

// --- Firebase Imports ---
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, 
  initializeAuth, browserLocalPersistence, inMemoryPersistence, Auth,
  signInWithEmailAndPassword, createUserWithEmailAndPassword 
} from "firebase/auth";
import type { User } from "firebase/auth";
import { 
  getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, // ★ 新增：本地快取模組
  collection, addDoc, deleteDoc, doc, onSnapshot, query, 
  orderBy, serverTimestamp, writeBatch, Firestore, updateDoc, getDoc, setDoc,
  getDocs, where, limit,
} from "firebase/firestore";
import { 
  getStorage, deleteObject, 
  ref, 
  uploadString, 
  uploadBytes,      // 新增：處理 Blob/File 上傳
  getDownloadURL    // 新增：獲取下載連結
} from "firebase/storage";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// ------------------------------------------------------------------
// ★★★ 終極防死鎖魔法：全域攔截系統 alert 轉為 HTML Toast ★★★
// ------------------------------------------------------------------
if (typeof window !== 'undefined') {
    window.alert = function(message) {
        // 移除畫面上舊的提示，避免重疊
        const existing = document.getElementById('global-custom-toast');
        if (existing && existing.parentNode) {
            existing.parentNode.removeChild(existing);
        }
        
        const toast = document.createElement('div');
        toast.id = 'global-custom-toast';
        const isError = String(message).includes('失敗') || String(message).includes('錯誤') || String(message).includes('Error');
        
        toast.className = `fixed top-10 left-1/2 transform -translate-x-1/2 z-[999999] px-6 py-3 rounded-full shadow-2xl text-sm font-bold flex items-center text-white transition-all duration-300 opacity-0 translate-y-[-20px] ${isError ? 'bg-red-600' : 'bg-emerald-600'}`;
        toast.innerText = message;
        
        document.body.appendChild(toast);
        
        // 觸發滑入動畫
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translate(-50%, 0)';
        }, 10);
        
        // 3秒後滑出並銷毀
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, -20px)';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    };
}

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
    
    // ★★★ 效能大升級：啟用 Firestore 本地永久快取 + 強制關閉 QUIC 解決斷線 ★★★
    try {
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
            experimentalForceLongPolling: true // ★ 打上疫苗：強制使用最穩定的 HTTP 長連線
        });
    } catch (e) {
        // 如果瀏覽器唔支援快取 (例如無痕模式)，就降級用普通版，但也必須強制長連線
        db = initializeFirestore(app, {
            experimentalForceLongPolling: true // ★ 打上疫苗：強制使用最穩定的 HTTP 長連線
        });
    }
    
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

// ★★★ 修改：全域日期狀態組件 (綠=正常, 紅=過期, 黃=30天內) ★★★
const DateStatusBadge = ({ date, label }: { date?: string, label: string }) => {
    if (!date) return <div className="text-gray-300 text-xs text-center">-</div>;
    
    // 計算天數差異
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(date);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let colorClass = "text-green-700 bg-green-100 border-green-200"; // 預設綠色 (正常)
    let statusText = "有效";

    if (diffDays < 0) {
        colorClass = "text-red-700 bg-red-100 border-red-200 font-bold"; // 過期 (紅色)
        statusText = `過期 ${Math.abs(diffDays)}天`;
    } else if (diffDays <= 30) {
        colorClass = "text-amber-700 bg-amber-100 border-amber-200 font-bold"; // 30天內 (黃色)
        statusText = `剩 ${diffDays}天`;
    }

    return (
        <div className={`border rounded px-2 py-1 text-[10px] inline-flex flex-col items-center justify-center min-w-[80px] text-center leading-tight ${colorClass}`} title={`${label}: ${date}`}>
            <div className="font-bold mb-0.5 scale-95 opacity-80">{label}</div>
            <div className="font-mono font-bold text-sm">{date}</div>
            <div className="scale-90 opacity-90">{statusText}</div>
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

    const inputId = userId.trim();
    // ★ 魔術轉換：自動為沒有 @ 的帳號加上內部網域，滿足 Google 格式要求
    const authEmail = inputId.includes('@') ? inputId : `${inputId}@gla.local`;

    // 1. 超級管理員後門
    if (inputId.toUpperCase() === 'BOSS' && password === '8888') {
        const adminUser = { email: 'BOSS', role: 'admin', modules: ['all'], dataAccess: 'all', defaultTab: 'dashboard' };
        handleSuccess(adminUser);
        setIsLoading(false);
        return;
    }

    try {
        if (!auth) throw new Error("系統連線尚未準備好");

        let userCredential;
        try {
            // 2. 嘗試用正規 Firebase 方式登入
            userCredential = await signInWithEmailAndPassword(auth, authEmail, password);
        } catch (loginErr: any) {
            
            // ★ 3. 核心修復：如果帳號不存在 (代表是剛在後台新增的員工)
            if (loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/invalid-credential' || loginErr.code === 'auth/invalid-email') {
                
                // 啟動訪客通行證 (匿名登入) 去資料庫查名單
                await signInAnonymously(auth);
                const db = getFirestore();
                const docSnap = await getDoc(doc(db, 'artifacts', 'gold-land-auto', 'staff', 'CHARLES_data', 'system', 'users'));
                
                if (docSnap.exists()) {
                    const usersList = docSnap.data().list || [];
                    const dbUserConfig = usersList.find((u:any) => u.email.toLowerCase() === inputId.toLowerCase());
                    
                    // 如果名單裡有這個人，且密碼符合 BOSS 設定的初始密碼
                    if (dbUserConfig && dbUserConfig.password === password) {
                        // 系統自動幫他在 Google Auth 註冊實體帳號
                        userCredential = await createUserWithEmailAndPassword(auth, authEmail, password);
                        console.log("新用戶/舊用戶 同步至 Auth 成功！");
                    } else {
                        throw new Error("密碼錯誤或未經授權");
                    }
                } else {
                    throw new Error("無法讀取權限名單");
                }
            } else {
                throw loginErr; // 其他未知的登入錯誤
            }
        }

        // 4. 登入/註冊成功後，去資料庫拿他最新的權限
        let finalUser = { email: inputId, modules: [], dataAccess: 'all', defaultTab: 'dashboard' };
        try {
            const db = getFirestore();
            const docSnap = await getDoc(doc(db, 'artifacts', 'gold-land-auto', 'staff', 'CHARLES_data', 'system', 'users'));
            if (docSnap.exists()) {
                const usersList = docSnap.data().list || [];
                const dbUserConfig = usersList.find((u:any) => u.email.toLowerCase() === inputId.toLowerCase());
                if (dbUserConfig) {
                    finalUser = {
                        ...finalUser,
                        modules: dbUserConfig.modules || [],
                        dataAccess: dbUserConfig.dataAccess || 'all',
                        defaultTab: dbUserConfig.defaultTab || 'dashboard'
                    };
                }
            }
        } catch (dbErr) {
            console.warn("讀取權限失敗", dbErr);
        }

        handleSuccess(finalUser);

    } catch (err: any) {
        console.error(err);
        setError('帳號或密碼錯誤 (Invalid Credentials)');
    } finally {
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* ★★★ 新增：動態宇宙光暈背景 (無限呼吸移動) ★★★ */}
      <div className="absolute inset-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
          {/* 左上角深空藍色流動 */}
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600 rounded-full blur-[120px] animate-[pulse_8s_ease-in-out_infinite]"></div>
          {/* 右下角金色光芒流動 */}
          <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-yellow-500 rounded-full blur-[150px] animate-[pulse_10s_ease-in-out_infinite_alternate] mix-blend-screen"></div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-white/10 relative z-10">
        
        <div className="text-center mb-8">
          {/* ★★★ 巔峰奢華版 Logo：零實體邊框 + 玻璃反光懸浮 + 金色流光 ★★★ */}
          <div className="relative w-32 h-32 mx-auto mb-5 group">
              {/* 底層：極度柔和的金色呼吸光暈 */}
              <div className="absolute inset-0 bg-yellow-500 rounded-full blur-[25px] opacity-20 animate-pulse transition-opacity duration-1000 group-hover:opacity-40"></div>
              
              {/* 核心：徹底移除實體邊框，只保留若隱若現的玻璃高光 (Highlight) */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-white/5 via-transparent to-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center justify-center p-1 backdrop-blur-[2px] z-10">
                  {/* Logo 本體：賦予極強的金屬質感與微弱的陰影浮凸感 */}
                  <img 
                      src={COMPANY_INFO.logo_url} 
                      className="w-[85%] h-[85%] object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] group-hover:drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] transition-all duration-500" 
                      onError={(e) => { e.currentTarget.style.display='none'; }} 
                  />
              </div>
          </div>
          
          <h1 className="text-2xl font-black text-white tracking-widest drop-shadow-md">GOLD LAND AUTO</h1>
          <p className="text-yellow-500/80 text-[10px] mt-1.5 font-bold tracking-[0.3em] uppercase drop-shadow">Secure DMS Access</p>
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





// --- 2. Sidebar (外部組件 - 🍏 終極升級：True Gemini Style 側欄圖標條) ---
type SidebarProps = {
    activeTab: string;
    setActiveTab: (tab: any) => void;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (open: boolean) => void;
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
    staffId: string | null;
    setStaffId: (id: string | null) => void;
    currentUser: { email: string, modules: string[] } | null;
    onOpenChangePwd: () => void;
};

const Sidebar = ({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen, isSidebarCollapsed, setIsSidebarCollapsed, staffId, setStaffId, currentUser, onOpenChangePwd }: SidebarProps) => {
    
    const handleLogout = () => {
        if (confirm("確定登出系統？(Confirm Logout?)")) {
            localStorage.removeItem('gla_saved_user');
            setStaffId(null);
        }
    };

    const allMenuItems = [
        { id: 'dashboard', label: '業務儀表板', icon: LayoutDashboard, permission: 'dashboard' },
        { id: 'inventory', label: '車輛管理', icon: Car, permission: 'inventory' },
        { id: 'import_orders', label: '海外訂車管家', icon: Ship, permission: 'import_orders' },
        { id: 'create_doc', label: '開單系統', icon: FileText, permission: 'inventory' }, 
        { id: 'reports', label: '財務總覽', icon: Briefcase, permission: 'reports' },
        { id: 'company_ledger', label: '公司營運總帳', icon: Receipt, permission: 'company_ledger' },
        { id: 'cross_border', label: '中港業務', icon: Globe, permission: 'business' }, 
        { id: 'business', label: '業務辦理流程', icon: Briefcase, permission: 'business' },
        { id: 'database', label: '資料庫中心', icon: Database, permission: 'database' },
        { id: 'media_center', label: '智能圖庫', icon: ImageIcon, permission: 'inventory' },
        { id: 'settings', label: '系統設置', icon: Settings, permission: 'settings' }
    ];

    const visibleMenuItems = allMenuItems.filter(item => {
        if (!currentUser) return false;
        if (currentUser.modules?.includes('all') || currentUser.email.toUpperCase() === 'BOSS') return true;
        if (item.id === 'dashboard') return true;
        return currentUser.modules?.includes(item.permission);
    });

    return (
        <>
          {isMobileMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
      
          {/* 🍏 True Gemini Style：完美修正行動端定位，移除非法 relative，改用 md:relative 順應桌面排版 */}
           <div className={`fixed inset-y-0 left-0 z-40 bg-[#090E17]/95 backdrop-blur-3xl text-white transition-all duration-300 ease-in-out flex flex-col print:hidden shadow-[4px_0_24px_rgba(0,0,0,0.15)] border-r border-white/5 overflow-hidden flex-none md:h-full md:relative 
                ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'} 
                ${isSidebarCollapsed ? 'md:w-16' : 'md:w-64'}`}
            >
            {/* 內建隱形氛圍宇宙光暈 */}
            <div className="absolute inset-0 w-full h-full overflow-hidden opacity-25 pointer-events-none z-0">
                <div className="absolute top-[-5%] left-[-20%] w-[80%] h-[30%] bg-blue-600 rounded-full blur-[80px]"></div>
                <div className="absolute bottom-[10%] right-[-20%] w-[80%] h-[40%] bg-yellow-500 rounded-full blur-[100px] opacity-40"></div>
            </div>

            {/* 🍏 Gemini Style 頂部：收起時 Logo 精準置中，點擊 Logo 即可逆向展開側欄 */}
            <div className={`relative z-10 pt-[max(1rem,env(safe-area-inset-top))] pb-3 min-h-[4rem] border-b border-white/5 flex items-center transition-all duration-300 flex-none ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
                {isSidebarCollapsed ? (
                    <button 
                        onClick={() => setIsSidebarCollapsed(false)} 
                        className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all duration-300 transform active:scale-95 group shadow-md"
                        title="展開導航選單"
                    >
                        <img src={COMPANY_INFO.logo_url} alt="Logo" className="w-7 h-7 object-contain p-0.5 group-hover:rotate-12 transition-transform duration-300" />
                    </button>
                ) : (
                    <>
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-white/5 rounded-lg border border-slate-600">
                                <img src={COMPANY_INFO.logo_url} alt="Logo" className="w-full h-full object-contain p-0.5" />
                            </div>
                            <div className="animate-fade-in">
                                <h1 className="text-base font-bold text-yellow-500 tracking-tight leading-none">金田汽車</h1>
                                <span className="text-[10px] text-slate-400 font-medium">DMS 智能管理系統</span>
                            </div>
                        </div>
                        <button onClick={() => setIsSidebarCollapsed(true)} className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition-colors" title="收起選單">
                            <ChevronLeft size={16} />
                        </button>
                    </>
                )}
            </div>

            {/* 導航列表與工具區合體 */}
            <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
                <style>{`
                    .sidebar-no-scroll::-webkit-scrollbar { display: none; }
                    .sidebar-no-scroll { -ms-overflow-style: none; scrollbar-width: none; }
                `}</style>
                
                {/* 🍏 Apple 級修復：將導航與 InfoWidget 一同包進滾動區 */}
                <div className="sidebar-no-scroll relative z-10 flex-1 p-2 overflow-y-auto overflow-x-hidden pb-4 flex flex-col">
                    <nav className="space-y-1 flex-none">
                      {visibleMenuItems.map(item => {
                         const IconComponent = item.icon;
                         return (
                            <button 
                                key={item.id} 
                                onClick={() => { setActiveTab(item.id as any); setIsMobileMenuOpen(false); }} 
                                className={`flex items-center w-full p-2.5 rounded-xl transition-all duration-300 group relative ${activeTab === item.id ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-[0_4px_15px_rgba(234,179,8,0.25)] font-black' : 'hover:bg-white/5 text-slate-400 hover:text-white'} ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start px-3'}`} 
                                title={isSidebarCollapsed ? item.label : ''}
                            >
                                <IconComponent size={18} className={`flex-shrink-0 ${isSidebarCollapsed ? 'mx-auto' : 'mr-3'} ${activeTab === item.id ? 'text-black' : 'text-slate-400 group-hover:text-white'}`} />
                                {!isSidebarCollapsed && <span className="whitespace-nowrap text-sm font-medium tracking-wide animate-fade-in">{item.label}</span>}
                                
                                {isSidebarCollapsed && <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-2xl border border-white/10 transition-opacity font-bold">{item.label}</div>}
                            </button>
                         );
                      })}
                    </nav>

                    {/* 🍏 智能判斷：把 InfoWidget 移入滾動區，徹底解決橫屏 (Landscape) 高度擠壓問題 */}
                    {!isSidebarCollapsed && (
                        <div className="mt-4 flex-none">
                            <InfoWidget />
                        </div>
                    )}
                </div>
                <div className="absolute bottom-0 left-0 w-full h-10 bg-gradient-to-t from-[#090E17] to-transparent pointer-events-none z-10"></div>
            </div>
            
            {/* 🍏 底部登出資訊區：收起時全自動收縮為置中大底膠囊 */}
            <div className="relative z-10 p-3 bg-transparent border-t border-white/5 flex-none pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col items-center justify-center">
                 {isSidebarCollapsed ? (
                     <button onClick={handleLogout} className="p-2.5 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl border border-white/5 transition-all active:scale-95 shadow-sm" title="登出系統">
                         <LogOut size={16} />
                     </button>
                 ) : (
                     <div className="flex items-center justify-between w-full px-1 animate-fade-in">
                        <div className="flex items-center space-x-2 overflow-hidden">
                            <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center text-yellow-500 border border-slate-700"><UserCircle size={16} /></div>
                            <div className="flex-1 min-w-0"><p className="text-xs font-bold text-white truncate">{staffId}</p><p className="text-[9px] text-slate-500">在線</p></div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={onOpenChangePwd} className="text-slate-400 hover:text-yellow-400 transition p-1.5 hover:bg-slate-800 rounded" title="修改密碼"><Key size={14} /></button>
                            <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition p-1.5 hover:bg-slate-800 rounded" title="登出"><LogOut size={14} /></button>
                        </div>
                    </div>
                 )}
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden absolute top-[max(1rem,env(safe-area-inset-top))] right-4 text-slate-400 hover:text-white z-50"><X size={24} /></button>
          </div>
        </>
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
// ★★★ 新增：系統啟動與資料同步 Loading 畫面 ★★★
// ------------------------------------------------------------------
const GlobalDataLoadingScreen = () => {
    const [loadingText, setLoadingText] = useState('建立安全連線中...');
    
    useEffect(() => {
        const texts = ['正在同步雲端資料庫...', '載入車輛庫存清單...', '更新最新報表數據...', '驗證使用者權限...', '即將完成...'];
        let i = 0;
        const timer = setInterval(() => {
            i = (i + 1) % texts.length;
            setLoadingText(texts[i]);
        }, 800); // 每 0.8 秒換一句話，讓畫面感覺很忙碌在做事
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
            {/* 科技感背景光暈裝飾 */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-yellow-500 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>
            
           <div className="relative z-10 flex flex-col items-center">
                {/* ★ 升級版 Loading Logo：無底色透視 + 純金屬光暈彈跳 */}
                <div className="relative w-28 h-28 mb-8 animate-bounce" style={{ animationDuration: '2s' }}>
                    <div className="absolute inset-0 bg-yellow-400 rounded-full blur-[30px] opacity-20"></div>
                    <img src={COMPANY_INFO.logo_url} alt="Logo" className="relative z-10 w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" onError={(e) => { e.currentTarget.style.display='none'; }}/>
                </div>
                
                <h1 className="text-3xl font-black text-white tracking-widest mb-2 drop-shadow-lg">GOLD LAND AUTO</h1>
                <p className="text-yellow-500 font-bold text-sm tracking-[0.3em] mb-12 uppercase drop-shadow-md">DMS System</p>
                
                {/* 現代化漸層進度條 (無限流動效果) */}
                <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4 shadow-inner relative">
                    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-transparent via-blue-500 to-yellow-400 w-1/2 animate-[marquee-inline_1.5s_ease-in-out_infinite]"></div>
                </div>
                
                {/* 動態狀態文字 */}
                <div className="text-slate-400 text-xs font-mono flex items-center h-4">
                    <Loader2 size={12} className="animate-spin mr-2 text-blue-400"/> {loadingText}
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
// ★★★ 終極完美版跨平台卡片列印引擎 (100%流體適應，防白屏裁切) ★★★
// ------------------------------------------------------------------
const triggerCardPrint = (htmlContent: string, title: string = 'Document') => {
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(el => el.outerHTML).join('\n');
    const baseTag = `<base href="${window.location.origin}/">`;

    const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            ${baseTag}
            ${styles}
            <style>
                /* ★ 設定 5mm 安全邊距 */
                @page { margin: 5mm; size: auto; }
                html, body { 
                    margin: 0 !important; padding: 0 !important; 
                    background: white !important; 
                    height: auto !important; 
                    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; 
                }
                /* ★ 核心修復：拔除危險的 zoom，改用 100% 寬度讓瀏覽器自動適應紙張大小 */
                .print-wrapper { 
                    width: 100% !important; 
                    max-width: 100% !important; 
                    margin: 0 !important; padding: 0 !important; 
                    background: white !important; 
                    height: auto !important; 
                    overflow: visible !important;
                    transform: none !important;
                    box-shadow: none !important;
                }
                body * { visibility: visible !important; }
                script { display: none !important; }
                .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
            </style>
        </head>
        <body onload="setTimeout(() => window.print(), 800)" onafterprint="window.close()">
            <div class="print-wrapper">
                ${htmlContent}
            </div>
        </body>
        </html>
    `;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
};

// --- 新增：車輛推介單預覽組件 (iPhone 專用 / 支援純淨版雙軌模式) ---
const VehicleShareModal = ({ vehicle, db, staffId, appId, onClose, cleanMode = false }: any) => {
    const [photos, setPhotos] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [customRemark, setCustomRemark] = useState(vehicle.salesRemarks || '');

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
            
            // ★ 核心防線 1：雙重過濾！只要 mediaType 是文件，或者標籤(tags)包含文件，一律剔除
            const vehiclePhotos = list.filter(item => {
                const isDocType = item.mediaType === 'document';
                const hasDocTag = Array.isArray(item.tags) && item.tags.includes('文件');
                return !isDocType && !hasDocTag;
            });

            // ★ 核心防線 2：依照智能圖庫拖曳後的時間戳 (createdAt) 進行排序
            vehiclePhotos.sort((a, b) => {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA; // 越新的排越前面 (對應拖曳排序邏輯)
            });

            // ★ 核心防線 3：確保有星星標記 (isPrimary) 的封面圖絕對置頂
            vehiclePhotos.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
            
            setPhotos(vehiclePhotos.map(i => i.url).slice(0, 6)); 
            setLoading(false);
        });
        return () => unsub();
    }, [vehicle.id]);

    // ★ 呼叫獨立 Blob 列印引擎，允許無限跨頁
    const handlePrint = () => {
        const content = document.getElementById('share-content');
        if (content) {
            triggerCardPrint(content.outerHTML, `Vehicle_${vehicle.regMark || 'Details'}`);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm md:max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-3 bg-slate-900 text-white flex justify-between items-center print:hidden flex-none">
                    <span className="text-xs font-bold">{cleanMode ? '✨ 預覽車輛規格 (純淨無公司版)' : '💰 預覽對客推介單 (完整版)'}</span>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full"><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-white" id="share-content">
                    {!cleanMode ? (
                        <div className="flex items-center gap-4 border-b-2 border-yellow-500 pb-4 mb-4">
                            <img src={COMPANY_INFO.logo_url} className="w-16 h-16 object-contain" onError={(e) => e.currentTarget.style.display='none'}/>
                            <div>
                                <h1 className="text-xl font-black text-slate-900 leading-none tracking-wide">{COMPANY_INFO.name_en}</h1>
                                <h2 className="text-sm font-bold text-slate-600 mt-1 tracking-widest">{COMPANY_INFO.name_ch}</h2>
                            </div>
                        </div>
                    ) : (<div className="pt-2"></div>)}

                    <div className="mb-4 flex justify-between items-end">
                        <div className={cleanMode ? "w-full text-center border-b border-slate-100 pb-3" : ""}>
                            <h3 className="text-2xl font-black text-slate-800 leading-tight">{vehicle.make} {vehicle.model}</h3>
                            <p className="text-sm text-slate-500 font-mono mt-1">製造年份: {vehicle.year}</p>
                        </div>
                        {!cleanMode && (
                            <div className="text-right pb-1">
                                <span className="text-lg font-black text-yellow-600">{new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', maximumFractionDigits: 0 }).format(vehicle.price)}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 flex flex-col justify-center"><span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">外觀/內飾</span><span className="font-bold text-slate-800 text-[10px] truncate">{vehicle.colorExt || '-'} / {vehicle.colorInt || (vehicle as any).colorInterior || '-'}</span></div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 flex flex-col justify-center"><span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">手數</span><span className="font-bold text-slate-800 text-xs">{vehicle.previousOwners || '0'} 手</span></div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 flex flex-col justify-center"><span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">容積</span><span className="font-bold text-slate-800 text-xs">{vehicle.engineSize ? `${vehicle.engineSize}${vehicle.fuelType === 'Electric' ? 'Kw' : 'cc'}` : '-'}</span></div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 flex flex-col justify-center"><span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">里數</span><span className="font-bold text-slate-800 text-xs">{vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} km` : '-'}</span></div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 col-span-2 flex flex-col justify-center"><span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">牌費到期日</span><span className="font-bold text-slate-800 text-xs font-mono">{vehicle.licenseExpiry || '未出牌 / 已過期'}</span></div>
                    </div>

                    {/* ★ 核心修改 1：銷售備註選擇性列印 */}
                    {!cleanMode && (
                        <div className={`mb-6 relative group ${!customRemark.trim() ? 'print:hidden' : ''}`}>
                            <span className="block text-[9px] text-slate-400 font-bold uppercase mb-1 print:hidden">銷售備註</span>
                            
                            {/* 網頁編輯用 (列印時隱藏) */}
                            <textarea 
                                value={customRemark} 
                                onChange={(e) => setCustomRemark(e.target.value)} 
                                placeholder="在這裡輸入車輛亮點或給客戶的話..." 
                                className="w-full text-sm text-slate-700 bg-blue-50/50 border border-dashed border-blue-300 rounded-lg p-3 outline-none resize-none focus:bg-blue-50 focus:border-blue-500 transition-colors print:hidden min-h-[60px] leading-relaxed"
                            />
                            
                            {/* 列印專用純文字 (網頁上隱藏，列印時才顯示) */}
                            {customRemark.trim() && (
                                <div className="hidden print:block text-sm text-slate-800 bg-blue-50/30 p-3 rounded-lg border border-blue-100 whitespace-pre-wrap leading-relaxed">
                                    {customRemark}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ★ 核心修改 2：排版優化，改為「上 1 大圖 + 下排最多 5 小圖」，絕對保證 1 頁印完 */}
                    <div className="mb-4">
                        {loading ? <div className="text-center text-xs py-10">載入圖片中...</div> : 
                        photos.length > 0 ? (
                            <div className="flex flex-col gap-2 break-inside-avoid">
                                {/* 第一張大圖 (高度稍微壓縮，完美對齊 A4 比例) */}
                                <div className="rounded-lg overflow-hidden border border-slate-100 bg-slate-50 aspect-[16/7] md:aspect-[21/9]">
                                    <img src={photos[0]} className="w-full h-full object-cover"/>
                                </div>
                                {/* 後續小圖並排 (最多 5 張，自動均分寬度縮小) */}
                                {photos.length > 1 && (
                                    <div className="flex gap-2">
                                        {photos.slice(1, 6).map((url, i) => (
                                            <div key={i} className="flex-1 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 aspect-[4/3]">
                                                <img src={url} className="w-full h-full object-cover"/>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (<div className="text-center py-8 bg-gray-50 text-gray-400 text-xs rounded border border-dashed border-gray-200">暫無圖片</div>)}
                    </div>

                    {!cleanMode && (
                        <div className="text-center border-t border-slate-100 pt-4 mt-4 break-inside-avoid">
                            <p className="text-xs font-bold text-slate-800 tracking-wide">{COMPANY_INFO.name_en} - {COMPANY_INFO.name_ch}</p>
                            <p className="text-[10px] text-slate-500 mt-1 font-mono">Tel: {COMPANY_INFO.phone}</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-100 border-t print:hidden flex-none">
                    <button onClick={handlePrint} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform flex items-center justify-center">
                        📸 {cleanMode ? '列印純淨規格' : '列印完整推介單'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ------------------------------------------------------------------
// ★★★ 終極完美版列印引擎 (5mm 邊距 + 97% 縮放防切頁) ★★★
// ------------------------------------------------------------------
const triggerSmartPrint = (htmlContent: string, title: string = 'Document') => {
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(el => el.outerHTML).join('\n');
    const baseTag = `<base href="${window.location.origin}/">`;

    const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            ${baseTag}
            ${styles}
            <style>
                /* ★ 1. 設定小邊距 (5mm)，爭取更多垂直空間給印章 */
                @page { size: A4 portrait; margin: 5mm !important; }
                
                @media print {
                    /* ★ 2. 解除高度鎖定，讓內容自然延展不被硬性剪裁 */
                    html, body { 
                        width: 100% !important;
                        height: auto !important; 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        background: white !important; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                    
                    /* ★ 3. 核心魔法：左右給 5mm 空間，並將整體等比例微縮小 3% (zoom: 0.97)，保證印章完美塞進第一頁 */
                    .print-container { 
                        width: 100% !important; 
                        margin: 0 auto !important; 
                        padding: 0 5mm !important; 
                        box-sizing: border-box !important; 
                        zoom: 0.97 !important; /* 👈 縮小 3%，無痛解決印章溢出到第二頁的問題 */
                    }

                    #print-root {
                        box-shadow: none !important; 
                        border: none !important; 
                        border-radius: 0 !important;
                    }

                    /* ★ 4. 防止 Tailwind 寬高把畫面撐破 */
                    .w-screen, .w-\\[100vw\\] { width: 100% !important; max-width: 100% !important; }
                    .min-h-screen, .h-screen, .h-\\[100dvh\\] { min-height: 0 !important; height: auto !important; }
                    
                    body * { visibility: visible !important; }
                    script { display: none !important; }
                }
            </style>
        </head>
        <body onload="setTimeout(() => window.print(), 800)" onafterprint="window.close()">
            <div class="print-container">
                ${htmlContent}
            </div>
        </body>
        </html>
    `;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
};

// ==================================================================
// ★★★ 新增：28car 大數據實時比對標籤組件 ★★★
// ==================================================================
const MarketPriceChecker = ({ make, model, year, myPrice, isEnabled }: { make: string, model: string, year: string|number, myPrice: number, isEnabled: boolean }) => {
    const [marketData, setMarketData] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        // ★ 如果設定關閉，或者缺乏廠牌型號，就直接罷工不抓資料！
        if (!isEnabled || !make || !model) return;
        
        setLoading(true);
        // 去敲我們剛剛建立好的 NAS 橋樑 API
        fetch(`/api/market-data?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${year}`)
            .then(res => res.json())
            .then(data => { if (data.success) setMarketData(data); })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [make, model, year, isEnabled]);

    // ★ 如果開關關閉，直接回傳 null (什麼都不渲染，完全隱藏)
    if (!isEnabled) return null;

    if (loading) return <div className="text-[9px] text-slate-400 font-mono animate-pulse mt-1 mb-1">🔍 正在對比 28car...</div>;
    if (!marketData || marketData.count === 0) return <div className="text-[9px] text-slate-400 mt-1 mb-1">28car 暫無同款</div>;

    // 計算利潤與市場競爭力
    const diff = myPrice - marketData.avgPrice;
    const isHigherThanMarket = diff > 0;

    return (
        <div className="mt-1.5 mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-[2px] rounded-[3px] shadow-sm">
                28car 盤源: {marketData.count}台
            </span>
            <span className="text-[9px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-[2px] rounded-[3px] shadow-sm" title={`最低: $${marketData.minPrice.toLocaleString()} | 最高: $${marketData.maxPrice.toLocaleString()}`}>
                均價: ${(marketData.avgPrice / 1000).toFixed(0)}k
            </span>
            {isHigherThanMarket ? (
                <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-[2px] rounded-[3px] shadow-sm animate-pulse" title={`比市場均價貴 $${Math.abs(diff).toLocaleString()}`}>
                    📈 偏貴 ${(Math.abs(diff) / 1000).toFixed(1)}k
                </span>
            ) : (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-[2px] rounded-[3px] shadow-sm" title={`比市場均價便宜 $${Math.abs(diff).toLocaleString()}`}>
                    📉 具競爭力 ${(Math.abs(diff) / 1000).toFixed(1)}k
                </span>
            )}
        </div>
    );
};

// --- 主應用程式 ---
export default function GoldLandAutoDMS() {
  const [user, setUser] = useState<User | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ email: string, modules: string[], dataAccess?: string } | null>(null);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'create_doc' | 'settings' | 'inventory_add' | 'reports' | 'cross_border' | 'business' | 'database' | 'media_center' | 'import_orders' | 'company_ledger'>('dashboard');
  const [allSalesDocs, setAllSalesDocs] = useState<any[]>([]); // 儲存所有單據供車輛詳情查詢
  const [externalDocRequest, setExternalDocRequest] = useState<any | null>(null); // 跨頁面編輯請求
  const [isDataSyncing, setIsDataSyncing] = useState(true);
  const [isTeamHubOpen, setIsTeamHubOpen] = useState(false);
  // ★★★ 新增：控制右下角選單與 T牌彈窗的狀態 ★★★
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isTPlateModalOpen, setIsTPlateModalOpen] = useState(false);
  const [isChangePwdOpen, setIsChangePwdOpen] = useState(false); // ★ 新增這行
  const [dashMobileTab, setDashMobileTab] = useState<'instock' | 'action'>('instock'); // ★ 新增：手機版儀表板分頁狀態
  const [dashSearchInStock, setDashSearchInStock] = useState('');
  const [dashSearchAction, setDashSearchAction] = useState('');
  // ★★★ 新增：全域現代化自動消失提示 (Toast) 控制器 ★★★
  const [globalToast, setGlobalToast] = useState<{text: string, type: 'success'|'error'} | null>(null);

  const showGlobalToast = (text: string, type: 'success' | 'error' = 'success') => {
      setGlobalToast({text, type});
      setTimeout(() => setGlobalToast(null), 3000); // 3秒後自動消失
  };
  
  // ★★★ 終極魔法：全域攔截所有原生的 alert ★★★
  useEffect(() => {
      // 只要代碼裡呼叫了 alert('xxx')，全部都會被導向我們安全又漂亮的 Toast！
      window.alert = (message: string) => {
          // 如果訊息包含"失敗"或"錯誤"，就顯示紅色，否則顯示綠色
          const isError = message.includes('失敗') || message.includes('錯誤') || message.includes('Error');
          showGlobalToast(message, isError ? 'error' : 'success');
      };
  }, []);

  // ★★★ 終極喚醒主畫面機制 (解決重新整理後空白問題) ★★★
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
      // 只有在使用者剛驗證完身份，且還沒執行過喚醒動作時才執行
      if (currentUser && !hasInitialized) {
          // 故意先切換到別的空標籤 (打破 React 的偷懶機制)
          setActiveTab('settings'); 
          
          // 10 毫秒後，光速切回業務儀表板，保證 100% 觸發完整畫面重繪
          setTimeout(() => {
              setActiveTab('dashboard');
              setHasInitialized(true); // 標記為已喚醒，避免重複執行
          }, 10);
      }
  }, [currentUser, hasInitialized]);

  // ★★★ 新增：監聽前景 (Foreground) 推送通知 ★★★
  useEffect(() => {
      if (typeof window !== 'undefined' && 'Notification' in window && app) {
          try {
              const messaging = getMessaging(app);
              const unsub = onMessage(messaging, (payload) => {
                  console.log("【前景收到通知】", payload);
                  // 當使用者開住系統時，用我哋嘅全域 Toast 彈出通知
                  const title = payload.notification?.title || '新通知';
                  const body = payload.notification?.body || '';
                  showGlobalToast(`🔔 ${title} : ${body}`, 'success');
              });
              return () => unsub();
          } catch (e) {
              console.log("前景通知監聽失敗:", e);
          }
      }
  }, []);

 // ★★★ 企業級防呆機制：鎖住瀏覽器上一頁與防誤關閉 ★★★
    useEffect(() => {
        // 只有在「已登入 (有 staffId)」的狀態下才啟動鎖定
        if (!staffId) return;

        // 【防護一】阻擋瀏覽器上一頁 (Swipe Back / Back Button)
        // 先塞入一個歷史紀錄當作「緩衝墊」
        window.history.pushState(null, '', window.location.href);
        const handlePopState = () => {
            // 當使用者觸發上一頁時，立刻再把緩衝墊塞回去，抵銷退出的動作
            window.history.pushState(null, '', window.location.href);
            // (未來如果您有做 Toast 提示組件，也可以在這裡跳出："請使用左下角登出按鈕來離開系統")
        };
        window.addEventListener('popstate', handlePopState);

        // 【防護二】阻擋意外刷新或關閉分頁 (F5 / Cmd+R / 點擊關閉標籤)
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            // Chrome 等現代瀏覽器需要設定 returnValue 才會跳出原生的防呆警告框
            e.returnValue = ''; 
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        // 組件卸載或登出時，解除防護鎖
        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [staffId]);
 
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

  // ★ 新增：首頁實時監聽「公司營運總帳」未付項目，為了在卡片上顯示提醒
  const [unpaidCompanyExpenses, setUnpaidCompanyExpenses] = useState<any[]>([]);
  useEffect(() => {
      if (!db || !appId) return;
      const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'company_expenses'), where('status', '==', 'Unpaid'));
      const unsub = onSnapshot(q, (snapshot) => {
          const list: any[] = [];
          snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
          setUnpaidCompanyExpenses(list);
      });
      return () => unsub();
  }, [db, appId]);
  
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

  // =========================================================
  // ★★★ 智慧中港車「兜圈」死線自動追蹤器 (只針對粵港車 + 有事才顯現) ★★★
  // =========================================================
  const loopReminders = useMemo(() => {
      return visibleInventory.filter((v: any) => {
          // ★ 核心修復：只針對「粵港車」(檢查口岸是否有香港關口，或者車牌是否包含'港')
          const isYueGang = (v.crossBorder?.ports || []).some((p:string) => ['皇崗', '深圳灣', '蓮塘', '沙頭角', '文錦渡', '港珠澳大橋(港)'].includes(p)) || (v.crossBorder?.mainlandPlate || '').includes('港');
          if (!isYueGang) return false; // 不是粵港車，直接放行，不追蹤！

          // 支援讀取根目錄或 crossBorder 裡的最後出境日期
          const dateStr = v.lastOutboundDate || v.crossBorder?.lastOutboundDate;
          if (!dateStr) return false;
          
          const lastOut = new Date(dateStr);
          if (isNaN(lastOut.getTime())) return false;
          
          // 計算 90 天強制回港死線
          const deadline = new Date(lastOut.getTime() + 90 * 24 * 60 * 60 * 1000);
          const diffTime = deadline.getTime() - new Date().getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // 只抓取距離死線剩餘 30 天以內的車輛
          return diffDays <= 30;
      }).map((v: any) => {
          const dateStr = v.lastOutboundDate || v.crossBorder?.lastOutboundDate;
          const lastOut = new Date(dateStr);
          const deadline = new Date(lastOut.getTime() + 90 * 24 * 60 * 60 * 1000);
          const diffTime = deadline.getTime() - new Date().getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          return {
              ...v,
              diffDays,
              deadlineStr: deadline.toISOString().split('T')[0]
          };
      }).sort((a, b) => a.diffDays - b.diffDays); // 最緊急的排在最前面
  }, [visibleInventory]);

  const [primaryImages, setPrimaryImages] = useState<Record<string, string>>({});

    // 2. 初始化 State (使用上面的 defaultSettings 作為初始值)
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [dbEntries, setDbEntries] = useState<DatabaseEntry[]>([]);
  // UI States
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null); 
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null); 
  const [shareVehicle, setShareVehicle] = useState<Vehicle | null>(null); // ★ 新增：控制分享彈窗
  const [shareCleanMode, setShareCleanMode] = useState(false); // ★ 新增：控制彈窗是否為純淨版 (隱藏價格)

  // ★★★ 新增：將資料庫編輯狀態提升到這裡，讓 Dashboard 也能控制 ★★★
  const [editingEntry, setEditingEntry] = useState<DatabaseEntry | null>(null);
  const [isDbEditing, setIsDbEditing] = useState(false);

// ★★★ 新增：現代化自動消失提示 (Toast) 狀態 ★★★
    const [toastMsg, setToastMsg] = useState<{text: string, type: 'success'|'error'} | null>(null);

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMsg({text, type});
        setTimeout(() => setToastMsg(null), 3000); // 3秒後自動消失
    };

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
  const [filterSource, setFilterSource] = useState<'All' | 'own' | 'partner'>('All'); // ★ 新增：自家/行家過濾狀態
  const [sortConfig, setSortConfig] = useState<{ key: keyof Vehicle; direction: 'asc' | 'desc' } | null>(null);

  // Report States
  const [reportType, setReportType] = useState<'receivable' | 'payable' | 'paid_expenses' | 'sales'>('receivable');
  const [reportStartDate, setReportStartDate] = useState(new Date().getFullYear() + '-01-01');
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportCompany, setReportCompany] = useState('');

  // Legacy Forms
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '', hkid: '', address: '' });
  const [deposit, setDeposit] = useState<number>(0);
  const [docType, setDocType] = useState<DocType>('sales_contract');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);
  
  // ★ 套用智能列印引擎並加上自動檔名
  const handlePrint = () => {
      const printRoot = document.getElementById('print-root');
      if (printRoot) {
          let fileName = 'Vehicle_Document';
          if (previewDoc && previewDoc.vehicle) {
              const v = previewDoc.vehicle;
              const reg = v.regMark && v.regMark !== 'TBC' ? v.regMark : '未出牌';
              const yr = v.year || '';
              const mk = v.make || '';
              const md = v.model || '';
              // 組合檔名：車牌_年份_廠牌_型號 (空格會自動替換為底線)
              fileName = `${reg}_${yr}_${mk}_${md}`.replace(/\s+/g, '_');
          }
          triggerSmartPrint(printRoot.outerHTML, fileName);
      }
  };

  const clients = useMemo(() => dbEntries.filter(e => e.category === 'Person'), [dbEntries]);

  // ★★★ 效能優化：延遲監聽所有銷售單據 (只在需要時下載) ★★★
  useEffect(() => {
      if (!db || !appId) return;
      
      // ★ 只有當「打開車輛詳情 (需要睇關聯單據)」或「進入開單系統」時，才向數據庫請求資料
      if (!editingVehicle && activeTab !== 'create_doc') return;

      const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'sales_documents'), orderBy('updatedAt', 'desc'));
      const unsub = onSnapshot(q, (snapshot) => {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAllSalesDocs(list);
      });
      return () => unsub();
  }, [db, appId, activeTab, editingVehicle !== null]);

  // ★★★ 新增：處理從車輛詳情跳轉到開單系統 ★★★
  const handleJumpToDoc = (docData: any) => {
      setExternalDocRequest(docData); // 設定目標單據
      setActiveTab('create_doc');     // 切換到開單分頁
      setEditingVehicle(null);        // 關閉車輛詳情彈窗
  };

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
                      
                      // 1. 陣列保護 (★ 加咗 warrantyTypes 喺度)
                      warrantyTypes: dbData.warrantyTypes?.length ? dbData.warrantyTypes : defaultSettings.warrantyTypes,
                      expenseTypes: dbData.expenseTypes?.length ? dbData.expenseTypes : defaultSettings.expenseTypes,
                      expenseCompanies: dbData.expenseCompanies?.length ? dbData.expenseCompanies : defaultSettings.expenseCompanies,
                      cbItems: dbData.cbItems?.length ? dbData.cbItems : defaultSettings.cbItems,
                      cbInstitutions: dbData.cbInstitutions?.length ? dbData.cbInstitutions : defaultSettings.cbInstitutions,
                      
                      // 2. 物件保護 (加入強力陣列轉換，防止 Firebase 舊資料格式錯誤導致 .map 當機)
                      models: (() => {
                          const merged: Record<string, string[]> = { ...defaultSettings.models };
                          if (dbData.models) {
                              Object.keys(dbData.models).forEach(k => {
                                  merged[k] = Array.isArray((dbData.models as any)[k]) ? (dbData.models as any)[k] : [];
                              });
                          }
                          return merged;
                      })(),
                      
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

  // ★★★ 終極智能背景自動備份 (Lazy Cron) ★★★
  // 邏輯：每次開機/重整頁面，延遲 15 秒後偷偷檢查，如果到期就自動在背景備份！
  useEffect(() => {
      // 如果未開自動雲端備份，或者資料庫未準備好，就中止
      if (!db || !storage || !appId || !settings.backup?.autoCloud || inventory.length === 0) return;

      const checkAndRunBackup = async () => {
          const freq = settings.backup?.frequency || 'manual';
          if (freq === 'manual') return;

          const lastBackup = settings.backup?.lastBackupDate;
          const now = new Date();
          let shouldBackup = false;

          // 判斷是否到期需要備份
          if (!lastBackup) {
              shouldBackup = true;
          } else {
              const lastD = new Date(lastBackup);
              const diffTime = Math.abs(now.getTime() - lastD.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (freq === 'daily' && diffDays >= 1) shouldBackup = true;
              if (freq === 'weekly' && diffDays >= 7) shouldBackup = true;
              if (freq === 'monthly' && diffDays >= 30) shouldBackup = true;
          }

          if (shouldBackup) {
              try {
                  console.log("🔄 系統檢測到備份週期已到，正在背景執行自動備份...");
                  const dataStr = JSON.stringify({ version: "2.0", type: "auto", timestamp: now.toISOString(), settings, inventory });
                  const fileName = `backups/auto_${freq}_${now.toISOString().slice(0,10)}_${Date.now()}.json`;
                  
                  // ★ storage 加 !
                  const storageRef = ref(storage!, fileName); 
                  await uploadString(storageRef, dataStr);

                  // ★ db 加 !
                  const docRef = doc(db!, 'artifacts', appId!, 'staff', 'CHARLES_data', 'system', 'settings'); 
                  await setDoc(docRef, { backup: { ...settings.backup, lastBackupDate: now.toISOString() } }, { merge: true });
                  
                  // 更新前端畫面狀態 (不打擾用戶，只顯示個小 Toast)
                  setSettings(prev => ({ ...prev, backup: { ...prev.backup!, lastBackupDate: now.toISOString() } }));
                  showGlobalToast(`✅ 系統已自動完成 ${freq === 'daily' ? '每日' : (freq === 'weekly' ? '每週' : '每月')} 雲端備份！`, 'success');
              } catch (e) {
                  console.error("❌ 背景自動備份失敗", e);
              }
          }
      };

      // 延遲 15 秒執行，確保不影響用戶剛登入時的系統流暢度
      const timer = setTimeout(() => {
          checkAndRunBackup();
      }, 15000);

      return () => clearTimeout(timer);
  }, [db, storage, appId, settings.backup?.frequency, settings.backup?.autoCloud, inventory.length]);
  
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
        setLink('manifest', '/manifest.json'); // ★ 新增這行，連結 PWA 描述檔

        // Web App Meta
        // ★ 核心修復：全面屏 viewport 設定已經交由 layout.tsx 負責，這裡必須刪除，否則會發生「雙重 meta 衝突」導致 iPhone 邊界失效！
        setMeta('theme-color', '#f1f5f9'); 
        setMeta('apple-mobile-web-app-status-bar-style', 'black-translucent'); // ★ 必須是 black-translucent 才能讓網頁完美透底
        
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
    
    // ★ 為了避免網路極快時畫面閃爍，強制 Loading 畫面最少顯示 1.5 秒
    const minLoadingTime = new Promise(resolve => setTimeout(resolve, 1500));
    
    const unsubInv = onSnapshot(q, async (snapshot) => {
      const list: Vehicle[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Vehicle));
      setInventory(list);
      
      // 等待最少 1.5 秒，且確保資料已經塞入 state 後，才關閉 Loading 畫面
      await minLoadingTime;
      setIsDataSyncing(false);
      
    }, (err) => {
        console.error("Inv sync error", err);
        setIsDataSyncing(false); // 如果發生斷線錯誤，也要解除 Loading，免得畫面卡死
    });

    return () => { unsubInv(); };
  }, [staffId, db, appId]);

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
                    roles: data.roles || [],
                    
                    // ★ 讀取負責人欄位 (過濾關鍵)
                    managedBy: data.managedBy || ''
                } as DatabaseEntry);
            });

            // ★★★ 核心新增：全域資料快取過濾 ★★★
            const filteredDbList = list.filter(entry => {
                // 1. 管理員 (BOSS / all 權限 / 資料視角=all) -> 看全部
                if (staffId === 'BOSS' || currentUser?.modules?.includes('all') || currentUser?.dataAccess === 'all') {
                    return true;
                }

                // ★ 放行「市場大數據」，確保所有員工的雷達圖都有數據
                if (entry.docType === '市場大數據') {
                    return true;
                }

                // 2. 普通員工 -> ★ 嚴格模式：只看負責人是自己的資料 ★
                return entry.managedBy === staffId;
            });

            // ★★★ 核心新增：使用 updatedAt (最後更新時間) 降序排序 (最新修改的排最上面) ★★★
            filteredDbList.sort((a, b) => {
                const timeA = a.updatedAt?.seconds || 0;
                const timeB = b.updatedAt?.seconds || 0;
                return timeB - timeA;
            });
         
            setDbEntries(filteredDbList); // ★ 改存過濾後的清單
        }, (err) => console.error("Db sync error", err));

        return () => unsubDb();
    }, [staffId, db, appId, currentUser]); // ★ 必須加入 currentUser 依賴

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

// ★★★ 防死鎖版的同步函數 ★★★
    // ★★★ 靜默智能覆蓋引擎 (Smart Upsert) ★★★
    const syncToDatabase = async (data: any, category: string) => {
        if (!db || !appId || !staffId) return;

        try {
            // 自動將 '客戶'、'司機' 映射為標準 'Person' 分類，並打上標籤
            let stdCategory = category;
            let roleTag = '';
            if (category === '客戶') { stdCategory = 'Person'; roleTag = '客戶'; }
            if (category === '司機') { stdCategory = 'Person'; roleTag = '司機'; }
            
            const dbRef = collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'database');
            
            // 1. 決定智能比對條件 (優先電話 -> 再來身份證 -> 最後姓名)
            let q;
            if (data.phone) {
                q = query(dbRef, where('phone', '==', data.phone), where('category', '==', stdCategory));
            } else if (data.idNumber) {
                q = query(dbRef, where('idNumber', '==', data.idNumber), where('category', '==', stdCategory));
            } else if (data.chassisNo) {
                q = query(dbRef, where('chassisNo', '==', data.chassisNo), where('category', '==', stdCategory));
            } else {
                if (!data.name) return; // 完全沒名字就不存
                q = query(dbRef, where('name', '==', data.name), where('category', '==', stdCategory));
            }

            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                // 不存在 -> 直接新增 (靜默，完全不彈窗打擾業務)
                await addDoc(dbRef, {
                    ...data,
                    category: stdCategory,
                    tags: roleTag ? [roleTag] : [],
                    managedBy: staffId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            } else {
                // 已存在 -> 智能覆蓋 (只更新有填寫的值，不洗掉原本的舊資料)
                const docId = snapshot.docs[0].id;
                const existingData = snapshot.docs[0].data();
                
                const mergedData: any = {};
                Object.keys(data).forEach(key => {
                    // 如果新資料有填，且不為空字串，就覆寫更新
                    if (data[key] !== undefined && data[key] !== '') {
                        mergedData[key] = data[key];
                    }
                });

                // 智能合併標籤 (如果原本是客，現在變司機，就兩個 Tag 都保留)
                let newTags = existingData.tags || [];
                if (roleTag && !newTags.includes(roleTag)) {
                    newTags = [...newTags, roleTag];
                    mergedData.tags = newTags;
                }

                await updateDoc(doc(dbRef, docId), {
                    ...mergedData,
                    updatedAt: serverTimestamp()
                });
            }
        } catch (e) {
            console.error("Smart Sync error", e);
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

// ★★★ 升級版：自動發送推送通知輔助函數 (修復重複發送與冷啟動崩潰) ★★★
    // targetUsers: 如果留空，就發送俾所有人；如果傳入 ['sales01', 'admin']，就只發俾呢兩個人。
    const sendPushNotification = async (title: string, body: string, targetUsers?: string[]) => {
        if (!db || !appId || !settings.pushConfig?.isEnabled) return;
        try {
            const tokenRef = collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_tokens');
            const tokenSnap = await getDocs(tokenRef);
            const rawTokens: string[] = [];
            
            tokenSnap.forEach(doc => {
                const data = doc.data();
                if (data.token) {
                    // 如果有指定員工名單，就檢查呢個 token 屬唔屬於嗰個員工
                    if (targetUsers && targetUsers.length > 0) {
                        if (targetUsers.includes(data.user)) {
                            rawTokens.push(data.token);
                        }
                    } else {
                        // 如果無指定，就全部人都加落去 (廣播模式)
                        rawTokens.push(data.token);
                    }
                }
            });

            // ★ 核心修復 1：過濾重複的 Token！ (利用 Set 自動消除陣列中重複的值)
            const uniqueTokens = Array.from(new Set(rawTokens));

            if (uniqueTokens.length === 0) return;

            const res = await fetch('/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokens: uniqueTokens, title, body })
            });

            // ★ 核心修復 2：攔截 Vercel 冷啟動 HTML 錯誤，防止畫面閃退報錯
            if (!res.ok) {
                const contentType = res.headers.get("content-type");
                // 如果回傳的不是 JSON (通常是 504 Timeout 的 HTML)
                if (contentType && !contentType.includes("application/json")) {
                    console.warn("API 喚醒超時 (Cold Start)，但不影響資料儲存。");
                    return; // 靜默退出，不打擾使用者
                }
            }
        } catch (e) {
            // 只在背景 Console 印出警告，絕對不要 throw Error 讓畫面崩潰
            console.warn("發送系統通知失敗 (可忽略):", e);
        }
    };

// ==================================================================
  // ★★★ 終極中心化財務引擎：自動同步【維修+銷售+中港】至全域總帳 (v30.0) ★★★
  // ==================================================================
  const syncVehicleFinanceToLedger = async (v: any) => {
      if (!db || !v.id || !appId) return;
      try {
          const batch = writeBatch(db);
          const ledgerRefBase = collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'financial_ledger');
          
          // --------------------------------------------------------------
          // 【模組一：維修保養 (Maintenance)】
          // --------------------------------------------------------------
          if (v.maintenanceRecords && Array.isArray(v.maintenanceRecords)) {
              v.maintenanceRecords.forEach((m: any) => {
                  // 成本 (支出 OUT)
                  const costLedgerRef = doc(ledgerRefBase, `maint_cost_${v.id}_${m.id}`);
                  if (m.costStatus === 'Paid' && Number(m.cost) > 0) {
                      batch.set(costLedgerRef, {
                          refVehicleId: v.id, refRegMark: v.regMark || '未出牌', sourceModule: 'maintenance', type: 'OUT',
                          category: '營運開支 (Expenses)', desc: `[維修成本] ${m.item} - ${m.vendor || '自理'}`, amount: Number(m.cost),
                          date: m.costDate || new Date().toISOString().split('T')[0], method: m.costMethod || 'Transfer', remark: m.costRemark || '', updatedAt: serverTimestamp()
                      }, { merge: true });
                  } else { batch.delete(costLedgerRef); }

                  // 收費 (收入 IN)
                  const chargeLedgerRef = doc(ledgerRefBase, `maint_charge_${v.id}_${m.id}`);
                  if (m.chargeStatus === 'Paid' && Number(m.charge) > 0) {
                      batch.set(chargeLedgerRef, {
                          refVehicleId: v.id, refRegMark: v.regMark || '未出牌', sourceModule: 'maintenance', type: 'IN',
                          category: '售後服務 (Service)', desc: `[維修收費] ${m.item}`, amount: Number(m.charge),
                          date: m.chargeDate || new Date().toISOString().split('T')[0], method: m.chargeMethod || 'Transfer', remark: m.chargeRemark || '', updatedAt: serverTimestamp()
                      }, { merge: true });
                  } else { batch.delete(chargeLedgerRef); }
              });
          }

          // --------------------------------------------------------------
          // ✨【新接入模組二：車輛銷售收款 (Sales Payments)】
          // --------------------------------------------------------------
          if (v.payments && Array.isArray(v.payments)) {
              v.payments.forEach((p: any) => {
                  const salesLedgerRef = doc(ledgerRefBase, `sales_in_${v.id}_${p.id}`);
                  // 只要收款紀錄存在且有金額，即視為已入帳收入
                  if (p.amount && Number(p.amount) > 0) {
                      batch.set(salesLedgerRef, {
                          refVehicleId: v.id,
                          refRegMark: v.regMark || '未出牌',
                          sourceModule: 'sales',
                          type: 'IN', // ★ 營業收入
                          category: '營業收入 (Sales)',
                          desc: `[車輛銷售收款] ${p.type || '定金/尾數'} - ${v.make || ''} ${v.model || ''}`,
                          amount: Number(p.amount),
                          date: p.date || new Date().toISOString().split('T')[0],
                          method: p.method || 'Transfer', // 銀行轉帳 / 現金 等
                          remark: p.note || '', // 帶入銷售收款備註
                          updatedAt: serverTimestamp()
                      }, { merge: true });
                  } else {
                      batch.delete(salesLedgerRef);
                  }
              });
          }

          // --------------------------------------------------------------
          // ✨【新接入模組三：中港業務代辦費 (Cross Border Crossings/Tasks)】
          // --------------------------------------------------------------
          // 檢查中港業務的主結構是否存在
          if (v.crossBorder && v.crossBorder.crossings && Array.isArray(v.crossBorder.crossings)) {
              v.crossBorder.crossings.forEach((c: any) => {
                  // --- 處理中港代辦成本 (給內地代理/政府的支出 OUT) ---
                  const cbCostLedgerRef = doc(ledgerRefBase, `cb_cost_${v.id}_${c.id}`);
                  if (c.costStatus === 'Paid' && Number(c.cost) > 0) {
                      batch.set(cbCostLedgerRef, {
                          refVehicleId: v.id,
                          refRegMark: v.regMark || '未出牌',
                          sourceModule: 'crossBorder',
                          type: 'OUT',
                          category: '營運開支 (Expenses)',
                          desc: `[中港成本] ${c.serviceItem || '代辦手續'} - ${c.agency || '代理'} (內地車牌: ${v.crossBorder.mainlandPlate || '未綁'})`,
                          amount: Number(c.cost),
                          date: c.costDate || new Date().toISOString().split('T')[0],
                          method: c.costMethod || 'Transfer',
                          remark: c.costRemark || '',
                          updatedAt: serverTimestamp()
                      }, { merge: true });
                  } else {
                      batch.delete(cbCostLedgerRef);
                  }

                  // --- 處理中港對客收費 (對客戶收取的收入 IN) ---
                  const cbChargeLedgerRef = doc(ledgerRefBase, `cb_charge_${v.id}_${c.id}`);
                  if (c.chargeStatus === 'Paid' && Number(c.charge) > 0) {
                      batch.set(cbChargeLedgerRef, {
                          refVehicleId: v.id,
                          refRegMark: v.regMark || '未出牌',
                          sourceModule: 'crossBorder',
                          type: 'IN',
                          category: '售後服務 (Service)',
                          desc: `[中港收費] ${c.serviceItem || '代辦手續'} (指標號: ${v.crossBorder.quotaNumber || '無'})`,
                          amount: Number(c.charge),
                          date: c.chargeDate || new Date().toISOString().split('T')[0],
                          method: c.chargeMethod || 'Transfer',
                          remark: c.chargeRemark || '',
                          updatedAt: serverTimestamp()
                      }, { merge: true });
                  } else {
                      batch.delete(cbChargeLedgerRef);
                  }
              });
          }

          // --------------------------------------------------------------
          // ✨【新接入模組四：車輛墊資/貸款利息 (Floor Plan Interest)】
          // --------------------------------------------------------------
          if (v.financingRecords && Array.isArray(v.financingRecords)) {
              v.financingRecords.forEach((f: any) => {
                  const finLedgerRef = doc(ledgerRefBase, `fin_interest_${v.id}_${f.id}`);
                  // ★ 只有當狀態為「已結算」且產生了實際利息時，才列入正式開支
                  if (f.status === 'Settled' && Number(f.actualInterest) > 0) {
                      batch.set(finLedgerRef, {
                          refVehicleId: v.id,
                          refRegMark: v.regMark || '未出牌',
                          sourceModule: 'financing',
                          type: 'OUT', // ★ 利息屬於支出，會扣減車輛淨利
                          category: '營運開支 (Expenses)',
                          desc: `[墊資利息結算] ${f.lenderName} (${f.actualDays}天)`,
                          amount: Number(f.actualInterest),
                          date: f.endDate || new Date().toISOString().split('T')[0],
                          method: 'Transfer', 
                          remark: `本金: ${formatCurrency(f.principal)} | 年息: ${f.annualRate}%`,
                          updatedAt: serverTimestamp()
                      }, { merge: true });
                  } else {
                      batch.delete(finLedgerRef);
                  }
              });
          }
        
          // 一次性全自動原子提交，確保三個模組的帳目絕對不會同步失敗！
          await batch.commit();
          console.log(`🚀 [終極財務引擎] 車輛 ${v.regMark} 的【維修+銷售+中港】流水已完美同步至總帳本！`);
      } catch (error) {
          console.error("❌ 終極同步財務流水失敗:", error);
      }
  };

 
const saveVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!db || !staffId) return;
        const formData = new FormData(e.currentTarget);
        
        // ★★★ 終極防呆：智能讀取函數 ★★★
        const getStr = (key: string, isMounted: boolean, oldVal?: string) => {
            return isMounted ? (formData.get(key) as string || '') : (oldVal || '');
        };
        const getNum = (key: string, isMounted: boolean, oldVal?: number) => {
            if (!isMounted) return oldVal || 0;
            const val = formData.get(key);
            return val ? Number(String(val).replace(/,/g, '')) : 0;
        };

        const status = formData.get('status') as any;
        const fuelType = formData.get('fuelType') as 'Petrol' | 'Diesel' | 'Electric';
        const transmission = formData.get('transmission') as 'Automatic' | 'Manual';
        
        const valA1 = getNum('priceA1', true);
        const valTax = getNum('priceTax', true);
        const valRegistered = valA1 + valTax;
        const engineSize = getNum('engineSize', true);
        const licenseFee = calculateLicenseFee(fuelType, engineSize);

        const currentAcqType = (formData.get('acq_type') as string) || (editingVehicle as any)?.acquisition?.type || 'Local';
        const isImport = currentAcqType === 'Import';
        const isLocal = currentAcqType === 'Local';

        const acquisitionData = {
            type: currentAcqType,
            vendor: formData.get('acq_vendor') as string || '',
         // ★ 新增：儲存前車主/行家的 ID、電話與地址
            vendorID: formData.get('acq_vendorID') as string || '',
            vendorPhone: formData.get('acq_vendorPhone') as string || '',
            vendorAddress: formData.get('acq_vendorAddress') as string || '',
            currency: getStr('acq_currency', isImport, (editingVehicle as any)?.acquisition?.currency) || 'HKD',
            exchangeRate: getNum('acq_exchangeRate', isImport, (editingVehicle as any)?.acquisition?.exchangeRate) || 1,
            foreignPrice: getNum('acq_foreignPrice', isImport, (editingVehicle as any)?.acquisition?.foreignPrice),
            localChargesForeign: getNum('acq_localChargesForeign', isImport, (editingVehicle as any)?.acquisition?.localChargesForeign),
            portFee: getNum('acq_portFee', isImport, (editingVehicle as any)?.acquisition?.portFee),
            a1Price: getNum('acq_a1Price', isImport, (editingVehicle as any)?.acquisition?.a1Price),
            frtTax: getNum('acq_frtTax', isImport, (editingVehicle as any)?.acquisition?.frtTax),
            eta: getStr('acq_eta', isImport, (editingVehicle as any)?.acquisition?.eta),
            paymentStatus: formData.get('acq_paymentStatus') as string || 'Unpaid',
            // ★ 新增儲存對數和代支關聯的單據 ID
            offsetAmount: getNum('acq_offsetAmount', isLocal, (editingVehicle as any)?.acquisition?.offsetAmount),
            offsetDocId: getStr('acq_offsetDocId', isLocal, (editingVehicle as any)?.acquisition?.offsetDocId),
            advanceFee: getNum('acq_advanceFee', isLocal, (editingVehicle as any)?.acquisition?.advanceFee),
            advanceDocId: getStr('acq_advanceDocId', isLocal, (editingVehicle as any)?.acquisition?.advanceDocId),
            payments: (editingVehicle as any)?.acqPayments || (editingVehicle as any)?.acquisition?.payments || []
        };

        // ★★★ 修正點：從隱藏欄位安全讀取真實的中港開關狀態 ★★★
        const isCbActive = formData.get('cb_isEnabled_hidden') === 'true'; 

        const selectedPorts: string[] = [];
        if (isCbActive) {
            ALL_CB_PORTS.forEach(port => {
                if (formData.get(`cb_port_${port}`) === 'on') selectedPorts.push(port);
            });
        }

        const crossBorderData: CrossBorderData = {
            isEnabled: isCbActive,
            mainlandPlate: getStr('cb_mainlandPlate', isCbActive, editingVehicle?.crossBorder?.mainlandPlate),
            hkCompany: getStr('cb_hkCompany', isCbActive, editingVehicle?.crossBorder?.hkCompany),
            mainlandCompany: getStr('cb_mainlandCompany', isCbActive, editingVehicle?.crossBorder?.mainlandCompany),
            driver1: getStr('cb_driver1', isCbActive, editingVehicle?.crossBorder?.driver1),
            driver2: getStr('cb_driver2', isCbActive, editingVehicle?.crossBorder?.driver2),
            driver3: getStr('cb_driver3', isCbActive, editingVehicle?.crossBorder?.driver3),
            insuranceAgent: getStr('cb_insuranceAgent', isCbActive, editingVehicle?.crossBorder?.insuranceAgent),
            quotaNumber: getStr('cb_quotaNumber', isCbActive, editingVehicle?.crossBorder?.quotaNumber),
            ports: isCbActive ? selectedPorts : (editingVehicle?.crossBorder?.ports || []),
            
            dateHkInsurance: getStr('cb_dateHkInsurance', isCbActive, editingVehicle?.crossBorder?.dateHkInsurance),
            dateReservedPlate: getStr('cb_dateReservedPlate', isCbActive, editingVehicle?.crossBorder?.dateReservedPlate),
            dateBr: getStr('cb_dateBr', isCbActive, editingVehicle?.crossBorder?.dateBr),
            dateLicenseFee: getStr('cb_dateLicenseFee', isCbActive, editingVehicle?.crossBorder?.dateLicenseFee),
            dateMainlandJqx: getStr('cb_dateMainlandJqx', isCbActive, editingVehicle?.crossBorder?.dateMainlandJqx),
            dateMainlandSyx: getStr('cb_dateMainlandSyx', isCbActive, editingVehicle?.crossBorder?.dateMainlandSyx),
            dateClosedRoad: getStr('cb_dateClosedRoad', isCbActive, editingVehicle?.crossBorder?.dateClosedRoad),
            dateApproval: getStr('cb_dateApproval', isCbActive, editingVehicle?.crossBorder?.dateApproval),
            dateMainlandLicense: getStr('cb_dateMainlandLicense', isCbActive, editingVehicle?.crossBorder?.dateMainlandLicense),
            dateHkInspection: getStr('cb_dateHkInspection', isCbActive, editingVehicle?.crossBorder?.dateHkInspection),
            
            // ★★★ 新增：儲存各個日期的提醒開關狀態 ★★★
            cb_remind_HkInsurance: formData.get('cb_remind_HkInsurance') !== 'false',
            cb_remind_ReservedPlate: formData.get('cb_remind_ReservedPlate') !== 'false',
            cb_remind_Br: formData.get('cb_remind_Br') !== 'false',
            cb_remind_LicenseFee: formData.get('cb_remind_LicenseFee') !== 'false',
            cb_remind_MainlandJqx: formData.get('cb_remind_MainlandJqx') !== 'false',
            cb_remind_MainlandSyx: formData.get('cb_remind_MainlandSyx') !== 'false',
            cb_remind_ClosedRoad: formData.get('cb_remind_ClosedRoad') !== 'false',
            cb_remind_Approval: formData.get('cb_remind_Approval') !== 'false',
            cb_remind_MainlandLicense: formData.get('cb_remind_MainlandLicense') !== 'false',
            cb_remind_HkInspection: formData.get('cb_remind_HkInspection') !== 'false',

            tasks: editingVehicle?.crossBorder?.tasks || [],
            documentLogs: editingVehicle?.crossBorder?.documentLogs || []
        };

        const isPublicFormValue = formData.get('isPublic_hidden') === 'true';
        
        // ★★★ 新增：從隱藏欄位解析出剛剛打包的進度追蹤資料 ★★★
        const logisticsStr = formData.get('logistics_hidden') as string;
        const logisticsData = logisticsStr ? JSON.parse(logisticsStr) : null;

        const vData = {
            isPublic: isPublicFormValue,
            logistics: logisticsData, // ★★★ 正確儲存進度資料 ★★★
            // ★★★ 修正 2：確保正確存入行家歸屬與名稱 ★★★
            sourceType: (formData.get('sourceType') as string) || 'own',
            partnerName: (formData.get('sourceType') === 'partner') ? (formData.get('acq_vendor') as string || '') : '',

            licenseReminderEnabled: formData.get('licenseReminderEnabled') === 'true',
            purchaseType: formData.get('purchaseType'),
            acquisition: acquisitionData,
            regMark: (formData.get('regMark') as string)?.toUpperCase() || '',
            make: formData.get('make'),
            model: formData.get('model'),
            year: formData.get('year'),
            colorExt: formData.get('colorExt'),
            colorInt: formData.get('colorInt'),
            chassisNo: (formData.get('chassisNo') as string)?.toUpperCase() || '',
            engineNo: (formData.get('engineNo') as string)?.toUpperCase() || '',
            licenseExpiry: formData.get('licenseExpiry') || '',
            registeredOwnerDate: formData.get('registeredOwnerDate') as string || '', // ★ 新增儲存：登記為車主日期
            
            price: getNum('price', true),
            costPrice: getNum('costPrice', true),
            mileage: getNum('mileage', true),
            
            previousOwners: formData.get('previousOwners') || '', 
            remarks: formData.get('remarks') || '', 
            salesRemarks: formData.get('salesRemarks') as string || '', // 👈 新增這行：抓取賣點資料存入資料庫
            seating: Number(formData.get('seating') || 5), 
            priceA1: valA1, 
            priceTax: valTax,
            priceRegistered: valRegistered,
            fuelType: fuelType,
            managedBy: (formData.get('managedBy') as string) || editingVehicle?.managedBy || staffId,
            transmission: transmission,
            engineSize: engineSize,
            licenseFee: licenseFee,
            customerName: formData.get('customerName') as string,
            customerPhone: formData.get('customerPhone') as string,
            customerID: formData.get('customerID') as string,
            customerAddress: formData.get('customerAddress') as string,
            status: status,
            // ★★★ 終極升級版：智能儲存 4 個狀態專屬日期 (完美兼容舊數據) ★★★
            // 1. 入庫：確保永遠有一個入庫日期
            stockInDate: formData.get('stockInDate') || editingVehicle?.stockInDate || new Date().toISOString().split('T')[0],
            
            // 2. 已訂：讀取隱藏欄位，無就保留舊紀錄
            reservedDate: formData.get('reservedDate') || (editingVehicle as any)?.reservedDate || null,
            
            // 3. 已售：保留您原本的防呆！如果是已售，優先用輸入框的日期，無就用舊紀錄，再無就用今日。
            stockOutDate: status === 'Sold' 
                ? (formData.get('stockOutDate') || editingVehicle?.stockOutDate || new Date().toISOString().split('T')[0]) 
                : (formData.get('stockOutDate') || editingVehicle?.stockOutDate || null), 
                
            // 4. 撤回：讀取隱藏欄位
            withdrawnDate: formData.get('withdrawnDate') || (editingVehicle as any)?.withdrawnDate || null,
            expenses: editingVehicle?.expenses || [], 
            payments: editingVehicle?.payments || [], 
            salesAddons: (editingVehicle as any)?.salesAddons || [], 
            warrantyType: formData.get('warrantyType') as string || '',
            insuranceExpiry: formData.get('insuranceExpiry') as string || '',
            insuranceReminderEnabled: formData.get('insuranceReminderEnabled') !== 'false',
            maintenanceRecords: editingVehicle?.maintenanceRecords || [],
            updatedAt: serverTimestamp(),
            crossBorder: crossBorderData
        };

        // ★ 智能記憶：如果手動輸入了新的保養條款，自動存入資料庫
        const inputWarranty = formData.get('warrantyType') as string;
        if (inputWarranty && !(settings.warrantyTypes || []).includes(inputWarranty)) {
            updateSettings('warrantyTypes', [...(settings.warrantyTypes || []), inputWarranty]);
        }
  
        try {
            let targetVehicleId = editingVehicle?.id; // ★ 記下車輛 ID 給財務引擎使用

            if (editingVehicle && editingVehicle.id) {
                await updateDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory', editingVehicle.id), vData);
                addSystemLog('Update Vehicle', `Updated RegMark: ${vData.regMark}`);
                
                if (settings.pushConfig?.events?.sold && status === 'Sold' && editingVehicle.status !== 'Sold') {
                    sendPushNotification('🎉 車輛已售出！', `車牌 ${vData.regMark || '未出牌'} (${vData.make} ${vData.model}) 剛剛已成功售出！`);
                }
                alert('✅ 車輛資料已成功更新！');
            } else {
                const newDocRef = await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory'), {
                    ...vData,
                    createdAt: serverTimestamp(),
                    expenses: [],
                    payments: [],
                    salesAddons: []
                });
                targetVehicleId = newDocRef.id; // ★ 取得全新入庫車輛的 ID
                
                addSystemLog('Create Vehicle', `Created RegMark: ${vData.regMark}`);
                if (settings.pushConfig?.events?.newCar) {
                    sendPushNotification('🚗 新車入庫通知', `車牌 ${vData.regMark || '未出牌'} (${vData.make} ${vData.model}) 已成功加入庫存！`);
                }
                alert('✅ 新車輛已成功入庫！');
            }

            // ★★★ 核心觸發：儲存成功後，無縫將資料同步至全域財務總帳 (Ledger) ★★★
              if (targetVehicleId) {
                  await syncVehicleFinanceToLedger({ id: targetVehicleId, ...vData });
              }

            // ★★★ 防呆修復：幫所有資料加上 || ''，防止 undefined 炸毀資料庫 ★★★
            if (vData.customerName) {
                await syncToDatabase({ 
                    name: vData.customerName || '', 
                    phone: vData.customerPhone || '',
                    idNumber: vData.customerID || '',
                    address: vData.customerAddress || ''
                }, '客戶');
            }
            if (crossBorderData.isEnabled) {
                if (crossBorderData.driver1) await syncToDatabase({ name: crossBorderData.driver1 || '', relatedPlateNo: crossBorderData.mainlandPlate || '', quotaNo: crossBorderData.quotaNumber || '' }, '司機');
                if (crossBorderData.driver2) await syncToDatabase({ name: crossBorderData.driver2 || '', relatedPlateNo: crossBorderData.mainlandPlate || '' }, '司機');
                if (crossBorderData.driver3) await syncToDatabase({ name: crossBorderData.driver3 || '', relatedPlateNo: crossBorderData.mainlandPlate || '' }, '司機');
            }

            setEditingVehicle(null);
            if (activeTab === 'inventory_add') {
                setActiveTab('inventory');
            }
        } catch (e) { 
            console.error(e); 
            alert('❌ 儲存失敗，請檢查網路連線'); 
        }
        
       
    };
  
const deleteVehicle = async (id: string) => {
    if (!db || !staffId) return;
    if (confirm('確定刪除？資料將無法復原。')) {
      const safeStaffId = staffId.replace(/[^a-zA-Z0-9]/g, '_');
      await deleteDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory', id));
      addSystemLog('Delete Vehicle', `Deleted Vehicle ID: ${id}`);
    }
  };

  // --- Sub-Item Management (完美防清洗版：只更新陣列，絕對保留其他未 Save 的輸入資料) ---
  const updateSubItem = async (vehicleId: string, field: 'expenses'|'payments'|'crossBorder'|'salesAddons', newItems: any) => {
    if (!db || !staffId) return;
    const currentDb = db;
    
    // 1. 立即安全地更新畫面 (只更新對應的陣列，絕對保留其他未 Save 的輸入資料)
    if (editingVehicle && editingVehicle.id === vehicleId) {
        setEditingVehicle(prev => {
             if (!prev) return null;
             if (field === 'crossBorder') {
                 return { ...prev, crossBorder: { ...(prev.crossBorder || {} as any), tasks: newItems } };
             } else {
                 return { ...prev, [field]: newItems };
             }
        });
    }

    // 2. 背景寫入 Firebase (只更新指定的陣列欄位，不影響整台車的其他數據)
    const v = inventory.find(v => v.id === vehicleId);
    if (!v) return;

    let updateData: any = {}; 
    if (field === 'crossBorder') {
        updateData = { crossBorder: { ...v.crossBorder, tasks: newItems } };
    } else {
        updateData = { [field]: newItems };
    }

    await updateDoc(doc(currentDb, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory', vehicleId), updateData);
  };

  const addPayment = async (vehicleId: string, payment: Payment) => {
    if (!db || !appId) return; 
    const v = inventory.find(v => v.id === vehicleId);
    if (!v) return;
    
    // 1. 更新車輛本身的收款紀錄 (包含原本已收 + 本次新增)
    const newPaymentsList = [...(v.payments || []), payment];
    updateSubItem(vehicleId, 'payments', newPaymentsList);

    // ★ 2. 抓取車輛的「額外收費項目」(中港、附加費、未付維修等) 確保開單系統的總價計算精準
    const extraItems: any[] = [];
    if (v.crossBorder?.tasks) {
        v.crossBorder.tasks.forEach((t: any, i: number) => { 
            if (t.fee > 0) extraItems.push({ id: `cb_${i}`, desc: `[中港] ${t.item}`, amount: t.fee, isSelected: true }); 
        });
    }
    if ((v as any).salesAddons) {
        (v as any).salesAddons.forEach((addon: any, i: number) => { 
            if (addon.amount > 0) extraItems.push({ id: `addon_${i}`, desc: addon.name, amount: addon.amount, isSelected: true, isFree: addon.isFree || false }); 
        });
    }
    if (v.maintenanceRecords) {
        const unpaidMaint = v.maintenanceRecords.filter((m:any) => m.charge > 0 && m.chargeStatus !== 'Paid');
        unpaidMaint.forEach((m:any, i:number) => {
            extraItems.push({ id: `maint_${i}`, desc: `[維修] ${m.item}`, amount: m.charge, isSelected: true });
        });
    }

    // ★ 3. 整理所有收款紀錄為「收據明細」(歷史收款 + 本次收款)
    const depositItemsList = newPaymentsList.map((p: any, idx: number) => ({
        id: p.id || `pay_${idx}`,
        // 判斷：如果是本次這筆，標示「本次收款」，如果是歷史紀錄，標示「前期已付」
        label: p.id === payment.id ? `本次收款 (${p.type})` : `前期已付 (${p.type} @ ${p.date})`,
        amount: Number(p.amount) || 0
    }));

    // ★★★ 4. 自動於「開單系統」生成完美對應的收據 (Receipt) ★★★
    try {
        const receiptData = {
            type: 'receipt', // 指定為收據
            formData: {
                companyNameEn: "GOLD LAND AUTO", companyNameCh: "金田汽車",
                companyAddress: COMPANY_INFO.address_ch, 
                companyPhone: COMPANY_INFO.phone, 
                companyEmail: COMPANY_INFO.email,
                customerName: v.customerName || '未填寫客戶', 
                customerId: v.customerID || '', 
                customerAddress: v.customerAddress || '', 
                customerPhone: v.customerPhone || '',
                regMark: v.regMark || '', 
                make: v.make || '', 
                model: v.model || '', 
                chassisNo: v.chassisNo || '', 
                engineNo: v.engineNo || '', 
                year: v.year || '',
                price: v.price ? v.price.toString() : '0', 
                docDate: payment.date,      // ★ 核心修復：強制讓收據頂部的單據日期同步為「收款日」
                deliveryDate: payment.date, // 使用收款日期
                paymentMethod: payment.method || 'Cash',
                remarks: payment.note || '',
                // 加入海外訂單支援
                orderType: v.acquisition?.type === 'Import' ? 'Overseas' : 'None',
                overseasCountry: 'Japan',
                overseasTotalFee: v.acquisition?.localChargesForeign || 0,
                localTotalFee: v.acquisition?.portFee || 0,
            },
            checklist: { vrd: false, keys: false, tools: false, manual: false, other: '' },
            docItems: extraItems,           // 帶入額外費用 (對齊車價)
            depositItems: depositItemsList, // 帶入所有歷史+本次收款 (讓尾數正確遞減)
            showTerms: false, 
            summary: `${v.customerName || '未填寫客戶'} - ${v.regMark || '無車牌'} - 自動生成收據 (${payment.type})`,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            createdBy: staffId
        };
        
        // 寫入開單系統的資料庫
        await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'sales_documents'), receiptData);
        
        // 彈出成功提示
        alert(`✅ 收款已記錄！\n系統已自動於開單模塊生成一張餘額精準的「正式收據」。`);
    } catch (e) {
        console.error("自動生成收據失敗:", e);
    }
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

  // ★★★ 新增：對客附加收費管理 ★★★
  const addSalesAddon = (vehicleId: string, addon: {id: string, name: string, amount: number}) => {
    const v = inventory.find(v => v.id === vehicleId);
    if (!v) return;
    updateSubItem(vehicleId, 'salesAddons', [...((v as any).salesAddons || []), addon]);
  };
  const deleteSalesAddon = (vehicleId: string, addonId: string) => {
    const v = inventory.find(v => v.id === vehicleId);
    if (!v) return;
    updateSubItem(vehicleId, 'salesAddons', ((v as any).salesAddons || []).filter((a:any) => a.id !== addonId));
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
    
    // ★ 新增：過濾自家或行家盤
    if (filterSource === 'own') sorted = sorted.filter(v => !v.sourceType || v.sourceType === 'own' || v.sourceType === 'consignment');
    if (filterSource === 'partner') sorted = sorted.filter(v => v.sourceType === 'partner');

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
  // ★★★ 升級 Dashboard 統計邏輯：加入「進貨車價」的未付尾數 ★★★
  const dashboardStats = () => {
    let totalStockValue = 0;
    let totalReceivable = 0; 
    let totalPayable = 0; 
    let totalSoldThisMonth = 0;

    visibleInventory.forEach(car => {
      // 1. 庫存總值
      if (car.status === 'In Stock') totalStockValue += car.price || 0;
      
      // 2. 應付未付 A：一般維修與雜費
          (car.expenses || []).forEach((exp: any) => {
            if (exp.status === 'Unpaid' && !exp.isIncludedInPrice && exp.paymentMethod !== 'Included') totalPayable += exp.amount || 0;
          });

      // 3. 應付未付 B：【新增】進貨與收車的「未付尾數」
                  // ★ 核心修復：從總成本中扣除雜費，得出真實的買車本金
                  const totalExpenses = (car.expenses || []).reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
                  const baseAcqCost = (car.costPrice || 0) - totalExpenses;
                  
                  const acqPaid = (car.acquisition?.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
                  const acqOffset = Number(car.acquisition?.offsetAmount || 0);
                  
                  // 買車本金的真實欠款
                  const acqBalance = baseAcqCost - acqPaid - acqOffset;
                  if (acqBalance > 0) {
                      totalPayable += acqBalance; // 將進貨欠款加入首頁的紅色「未付費用」總額
                  }

      // 4. 應收尾數邏輯 (已售 OR 已訂)
      if (car.status === 'Sold' || car.status === 'Reserved') {
        const received = (car.payments || []).reduce((acc: any, p: any) => acc + (Number(p.amount) || 0), 0);
        
        // --- 修正開始：只計算「對客」的收費項目 ---
        
        // A. 對客附加費 (排除贈送項目)
        const salesAddonsTotal = ((car as any).salesAddons || []).reduce((sum: number, addon: any) => sum + (addon.isFree ? 0 : (Number(addon.amount) || 0)), 0);
        
        // C. 售後維修/服務對客收費 (只計算未找數的 Charge)
        const maintCharge = (car.maintenanceRecords || []).reduce((sum: number, m: any) => sum + (m.chargeStatus !== 'Paid' ? (Number(m.charge) || 0) : 0), 0);
        
        // --- 修正結束：總應收 = 車價 + 附加費 + 維修費 (剔除中港費，獨立計算) ---
        const totalDue = (Number(car.price) || 0) + salesAddonsTotal + maintCharge;
        const balance = totalDue - received;
        
        if (balance > 0) totalReceivable += balance;

        // 本月銷售額
        if (car.status === 'Sold') totalSoldThisMonth += (Number(car.price) || 0);
      }
    });

    return { totalStockValue, totalReceivable, totalPayable, totalSoldThisMonth };
  };
  const stats = dashboardStats();

  const getInventoryAging = (car: any) => {
      if (!car.stockInDate) return null; // 沒有入庫日則無法計算
      
      const start = new Date(car.stockInDate).getTime();
      let end = new Date().getTime();
      let prefix = car.status === 'Sold' ? '售出耗時' : '在庫';
      
      // 如果已售出，計算入庫到出庫的天數
      if (car.status === 'Sold') {
          if (!car.stockOutDate) return null;
          end = new Date(car.stockOutDate).getTime();
      }
      
      const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
      
      if (days < 30) return null; // 30天內不顯示警告
      
      if (days >= 365) return { label: `${prefix} 1年+ (${days}天)`, style: 'bg-black text-red-500 border border-red-500 animate-pulse' };
      if (days >= 270) return { label: `${prefix} 9個月+ (${days}天)`, style: 'bg-red-900 text-white shadow-md' };
      if (days >= 180) return { label: `${prefix} 6個月+ (${days}天)`, style: 'bg-red-600 text-white shadow-md' };
      if (days >= 90) return { label: `${prefix} 3個月+ (${days}天)`, style: 'bg-orange-500 text-white shadow-md' };
      if (days >= 30) return { label: `${prefix} 1個月+ (${days}天)`, style: 'bg-yellow-400 text-yellow-900 shadow-sm' };
      
      return null;
  };

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
// ★★★ 1. Vehicle Form Modal (v21.4: 智能雙軌收支 + Trade-in 對數 + Kw 單位) ★★★
// ------------------------------------------------------------------


  




  return (
      // ★ 加入 print:h-auto 與 print:overflow-visible，讓列印時解除高度鎖定
      <div className="flex w-screen h-[100dvh] print:h-auto print:w-auto print:block text-slate-900 font-sans overflow-hidden print:overflow-visible print:bg-white bg-slate-50 relative z-0">
          
          {/* 🍏 Apple Style: 強化版底層環境氛圍光 (去除 multiply，加強亮度) */}
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-400/40 rounded-full blur-[140px] pointer-events-none -z-10"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-400/30 rounded-full blur-[120px] pointer-events-none -z-10"></div>
          <div className="absolute top-[20%] right-[20%] w-[40%] h-[40%] bg-emerald-300/30 rounded-full blur-[120px] pointer-events-none -z-10"></div>
       
        <style>{`
            /* ★ 徹底接管系統底色與高度，逼迫純白色消失 */
            html, body { 
                margin: 0 !important; 
                padding: 0 !important;
                width: 100vw !important; 
                height: 100dvh !important; 
                overflow: hidden !important; 
                background-color: #f1f5f9 !important; 
                overscroll-behavior-y: none;
                -webkit-overflow-scrolling: touch;
            }
            /* ★ 解放列印引擎：在列印時強行解除所有高度與隱藏限制，讓紙張可以無限往下長 */
            @media print {
                html, body {
                    position: static !important;
                    width: auto !important;
                    height: auto !important;
                    overflow: visible !important;
                    background-color: #ffffff !important;
                    display: block !important;
                }
            }
        `}</style>

      {/* 全域資料載入畫面 */}
      {staffId && isDataSyncing && <GlobalDataLoadingScreen />}

      {/* ★★★ 全域 Toast 提示框 UI ★★★ */}
      {globalToast && (
          <div className={`fixed top-10 left-1/2 transform -translate-x-1/2 z-[99999] px-6 py-3 rounded-full shadow-2xl text-sm font-bold flex items-center transition-all animate-fade-in ${globalToast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
              {globalToast.text}
          </div>
      )}

      {staffId && isDataSyncing && <GlobalDataLoadingScreen />}
      <Sidebar 
      activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          staffId={staffId}
          setStaffId={setStaffId}
          currentUser={currentUser}
          onOpenChangePwd={() => setIsChangePwdOpen(true)} />
           

      {/* 🍏 Gemini Style: 側邊欄縮放時，主畫面會極其自然地隨之橫向平滑拉伸，保持全螢幕完美行高 */}
      <main className="flex-1 w-full min-w-0 pt-0 px-2 pb-0 md:p-8 print:m-0 print:p-0 transition-all duration-300 flex flex-col overflow-hidden print:overflow-visible print:block relative">

        {/* ★★★ 全域掛載修復：確保任何 Tab 點擊分享都能立刻正常彈出，並支援純淨版切換 ★★★ */}
        {shareVehicle && (
            <VehicleShareModal 
                vehicle={shareVehicle} 
                db={db} 
                staffId={staffId} 
                appId={appId} 
                cleanMode={shareCleanMode} 
                onClose={() => setShareVehicle(null)} 
            />
        )}
        
        {/* ★ 手機版頂部 Header (完美適配動態島，擴大左右屏佔比) */}
          <div className="md:hidden flex items-center justify-between bg-white/60 backdrop-blur-xl border-b border-white/50 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] shadow-[0_4px_20px_rgba(0,0,0,0.03)] print:hidden flex-none -mx-2 mb-3 z-20">
              <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"><Menu size={28} /></button>
              <span className="font-bold text-lg text-slate-800 tracking-tight">Gold Land Auto</span>
              <div className="flex-shrink-0 scale-110 mr-1"> {/* 讓鈴鐺按鈕在手機上稍微放大更易點擊 */}
                  <SmartNotificationCenter inventory={inventory} settings={settings} triggerSmartPrint={triggerSmartPrint} currentUser={currentUser} />
              </div>
          </div>

        {isPreviewMode && (
          <div className="fixed top-0 left-0 right-0 bg-slate-800 text-white p-3 md:p-4 flex flex-col md:flex-row justify-between items-center z-50 shadow-xl print:hidden gap-3">
            <div className="font-bold flex items-center text-sm md:text-base"><FileText className="mr-2" /> 預覽文件</div>
            <div className="flex space-x-3 w-full md:w-auto"><button onClick={() => setIsPreviewMode(false)} className="flex-1 md:flex-none px-4 py-2 bg-gray-600 rounded hover:bg-gray-500 text-sm">返回</button><button onClick={handlePrint} className="flex-1 md:flex-none px-4 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400 flex items-center justify-center text-sm shadow-md"><Printer size={18} className="mr-2" /> 列印 / PDF</button></div>
          </div>
        )}

        <div className={`${isPreviewMode ? 'block mt-24 md:mt-16' : 'hidden'} ${isPreviewMode ? 'print:block' : 'print:hidden'} print:mt-0 flex-1 overflow-y-auto`}>
            <div ref={printAreaRef} className="print:w-full">
                <DocumentTemplate 
                    previewDoc={previewDoc} 
                    selectedVehicle={selectedVehicle} 
                    docType={docType} 
                    COMPANY_INFO={COMPANY_INFO} 
                />
            </div>
        </div>

        {/* 修正：如果是報表模式 (reports)，則在打印時允許顯示主要內容區 */}
        <div className={`${isPreviewMode ? 'hidden' : 'block'} ${activeTab === 'reports' ? 'print:block' : 'print:hidden'} flex flex-col h-full overflow-hidden`}>
          
          {/* Modal for Add/Edit Vehicle (完整參數版) */}
          {(activeTab === 'inventory_add' || editingVehicle) && (
              <VehicleFormModal 
                  db={db}
                  staffId={staffId}
                  appId={appId}
                  clients={clients}              
                  settings={settings}
                  editingVehicle={editingVehicle} 
                  setEditingVehicle={setEditingVehicle}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  saveVehicle={saveVehicle}
                  addPayment={addPayment}
                  deletePayment={deletePayment}
                  addExpense={addExpense}
                  deleteExpense={deleteExpense}
                  updateExpenseStatus={updateExpenseStatus}
                  addSystemLog={addSystemLog}
                  allSalesDocs={allSalesDocs} 
                  onJumpToDoc={handleJumpToDoc}
                  addSalesAddon={addSalesAddon}
                  deleteSalesAddon={deleteSalesAddon}
                  updateSettings={updateSettings}
                  systemUsers={systemUsers}
                  currentUser={currentUser}
                  updateSubItem={updateSubItem}
              />
          )}
          
          {/* Report Tab - 讓它內部也可以滾動 */}
                {activeTab === 'reports' && (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <FinanceModule 
                            inventory={visibleInventory} 
                            settings={settings}
                            setEditingVehicle={setEditingVehicle}
                            setActiveTab={setActiveTab}
                            db={db}
                            staffId={staffId}
                            appId={appId}
                            currentUser={currentUser}
                        />
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
                    primaryImages={primaryImages}
                    onJumpToDoc={handleJumpToDoc} // ★★★ 跨頁開單能力
                    
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

          
          {/* Dashboard Tab (v16.3: 修復橫屏滾動穿透與卡片擠壓問題) */}
          {/* Dashboard Tab (以獨立解耦模組運行，版面高度與警報已重構優化) */}
            {activeTab === 'dashboard' && (
            <DashboardModule
                inventory={visibleInventory}
                dbEntries={dbEntries}
                settings={settings}
                staffId={staffId!}
                currentUser={currentUser}
                stats={stats}
                primaryImages={primaryImages}
                unpaidCompanyExpenses={unpaidCompanyExpenses}
                loopReminders={loopReminders}
                setActiveTab={setActiveTab}
                setEditingVehicle={setEditingVehicle}
                setActiveCbVehicleId={setActiveCbVehicleId}
                setEditingEntry={setEditingEntry}
                setIsDbEditing={setIsDbEditing}
                setShareVehicle={setShareVehicle}
                setShareCleanMode={setShareCleanMode}
                deleteVehicle={deleteVehicle}
                db={db}
                appId={appId}
                triggerSmartPrint={triggerSmartPrint}
            />
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
              <div className="flex flex-col sm:flex-row gap-3 overflow-x-auto pb-3 flex-none scrollbar-hide items-start sm:items-center">
                  {/* 🍏 Apple Style 自家 / 行家 快速切換器 */}
                  <div className="flex bg-white/50 backdrop-blur-md p-1 rounded-xl border border-white/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] shrink-0">
                      <button onClick={() => setFilterSource('All')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filterSource === 'All' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>全部</button>
                      <button onClick={() => setFilterSource('own')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filterSource === 'own' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>🟢 自家/寄賣</button>
                      <button onClick={() => setFilterSource('partner')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filterSource === 'partner' ? 'bg-white shadow-sm text-orange-700' : 'text-slate-500 hover:text-slate-700'}`}>🟠 行家盤</button>
                  </div>
                  
                  {/* 原有的狀態過濾器 */}
                  <div className="flex gap-2 shrink-0">
                      {['All', 'In Stock', 'Sold', 'Reserved', 'Withdrawn'].map(s => (
                          <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filterStatus === s ? 'bg-yellow-500 text-white shadow-sm' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}>
                              {s === 'All' ? '全部狀態' : (s === 'Withdrawn' ? '撤回' : s)}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Grid Container (v18.0: 現代化 4:3 滿版垂直卡片 + 原有邏輯保留) */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-[calc(2rem+env(safe-area-inset-bottom))] scrollbar-thin">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {getSortedInventory()
                        .sort((a, b) => {
                            if (sortConfig) return 0;
                            return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
                        })
                        .map((car) => { 
                        
                        // ★ 保留原來的計算邏輯
                        const received = (car.payments || []).reduce((acc, p) => acc + p.amount, 0) || 0; 
                        const balance = (car.price || 0) - received; 

                        // ★ 新增：完美融合「船運倒數」與「行政進度」的智能標籤
                    const getLogisticsBadge = (vehicleData: any) => {
                        const log = vehicleData.logistics || {};
                        if (log.registeredDate) return null; // 已出牌隱藏
                        
                        if (log.inspectionPassedDate) {
                            const passed = new Date(log.inspectionPassedDate);
                            const expiry = new Date(passed.setMonth(passed.getMonth() + 4));
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            expiry.setHours(0,0,0,0);
                            const diffTime = expiry.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            const expiryStr = expiry.toISOString().split('T')[0];
                            
                            if (diffDays < 0) return { text: `驗車已過期`, color: 'bg-red-50 text-red-600 border-red-300 animate-pulse' };
                            if (diffDays <= 30) return { text: `出牌期限: ${expiryStr}`, color: 'bg-orange-50 text-orange-600 border-orange-300' };
                            return { text: `可於 ${expiryStr} 前出牌`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                        }
                        
                        if (log.emissionsClearDate) return { text: '待驗車', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
                        
                        // ★ 完美融合舊版船運 ETA
                        const arrivalStr = log.arrivalDate || vehicleData.acquisition?.eta || vehicleData.eta;
                        if (arrivalStr) {
                            const arr = new Date(arrivalStr);
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            arr.setHours(0,0,0,0);
                            const diffDays = Math.ceil((arr.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            
                            if (diffDays > 0) return { text: `🚢 剩 ${diffDays} 天到港`, color: 'bg-blue-50 text-blue-600 border-blue-200' };
                            return { text: '🚢 已到港 (待驗環保)', color: 'bg-blue-100 text-blue-700 border-blue-300' };
                        }
                        
                        return null;
                    };
                    const logisticsBadge = getLogisticsBadge(car);
                        
                        // ★ 保留原來的標籤邏輯
                        const getRefinedTags = () => {
                            const tags = [];
                            const ports = car.crossBorder?.ports || [];
                            const isCbActive = car.crossBorder?.isEnabled || car.crossBorder?.mainlandPlate || car.crossBorder?.quotaNumber;
                            
                            if (isCbActive) {
                                const isHk = ports.some(p => PORTS_HK_GD.includes(p));
                                const isMo = ports.some(p => PORTS_MO_GD.includes(p));
                                if (isHk) tags.push({ label: '粵港', color: 'bg-indigo-600 border-indigo-800 text-white' });
                                if (isMo) tags.push({ label: '粵澳', color: 'bg-emerald-600 border-emerald-800 text-white' });
                                if (!isHk && !isMo) tags.push({ label: '中港', color: 'bg-slate-600 border-slate-800 text-white' });
                            }
                            return tags;
                        };
                        const cbTags = getRefinedTags();
                        
                        // ★ 保留原來的縮圖與一換一邏輯
                        const baseThumbUrl = primaryImages[car.id] || (car.photos && car.photos.length > 0 ? car.photos[0] : null);
                        const isOneForOne = (car as any).acquisition?.vendor?.includes('一換一');
                        const oneForOnePlaceholder = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%231e3a8a'/%3E%3Ctext x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' font-weight='bold' fill='%23ffffff'%3E一換一 QUOTA%3C/text%3E%3Ctext x='50%25' y='60%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%2393c5fd'%3EEV Replacement Scheme%3C/text%3E%3C/svg%3E";
                        const thumbUrl = baseThumbUrl || (isOneForOne ? oneForOnePlaceholder : null);

                        let statusText = '在庫';
                        let statusClass = "bg-green-500 text-white";
                        if (car.status === 'Reserved') { statusText = '已訂'; statusClass = "bg-yellow-500 text-white"; }
                        else if (car.status === 'Sold') { statusText = '已售'; statusClass = "bg-blue-600 text-white"; }
                        else if (car.status === 'Withdrawn') { statusText = '撤回'; statusClass = "bg-gray-500 text-white"; }

                        // ★ 新增：判斷是否為行家盤
                        const isPartner = car.sourceType === 'partner';

                        return (
                        // 🍏 Apple Style 大卡片：3XL 超大圓角 + 精密高光邊框 + 彌散陰影
                        <div key={car.id} className={`bg-white/60 backdrop-blur-xl rounded-3xl border transition-all duration-300 group flex flex-col overflow-hidden cursor-pointer relative active:scale-[0.99] ${isPartner ? 'border-orange-200/80 hover:border-orange-300 shadow-[0_4px_20px_rgba(249,115,22,0.03)] hover:shadow-[0_12px_30px_rgba(249,115,22,0.1)]' : 'border-white/80 hover:border-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)]'}`} onClick={() => setEditingVehicle(car)}>
                         
                            {/* 上半部：4:3 滿版圖片 */}
                            <div className="w-full aspect-[4/3] bg-slate-900 relative overflow-hidden flex-none flex items-center justify-center">
                                {thumbUrl ? (
                                    <>
                                        <img src={thumbUrl} className="absolute inset-0 w-full h-full object-cover blur-md opacity-40 scale-110 transition-transform duration-700 group-hover:scale-125" alt="bg" loading="lazy" />
                                        <img src={thumbUrl} className="relative z-10 w-full h-full object-contain p-0.5 drop-shadow-xl transition-transform duration-700 group-hover:scale-105" alt="Car" loading="lazy" />
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100"><Car size={40} className="mb-2 opacity-50"/><span className="text-xs font-bold uppercase tracking-widest">No Image</span></div>
                                )}
                                
                                {/* ★ 狀態與行家標籤 (左上) ★ */}
                                <div className="absolute top-2 left-2 z-20 flex flex-col gap-1.5">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold shadow-md w-fit ${statusClass}`}>{statusText}</span>
                                    {isPartner && (
                                        <span className="px-2 py-1 rounded-md text-[10px] font-bold shadow-md bg-orange-500 text-white flex items-center w-fit">
                                            <Building2 size={10} className="mr-1"/> 行家: {car.partnerName || '未命名'}
                                        </span>
                                    )}
                                </div>

                                {/* 右下角：價格懸浮 */}
                                <div className="absolute bottom-2 right-2 z-20">
                                    <span className="bg-white/95 backdrop-blur text-slate-900 font-black px-2 py-1 rounded-lg shadow-lg text-sm border border-slate-200/50">
                                        {formatCurrency(car.price)}
                                    </span>
                                </div>
                            </div>

                           {/* 🍏 下半部：改為 bg-transparent 讓背景毛玻璃質感透視過來 */}
                            <div className="p-4 flex-1 flex flex-col bg-transparent">
                                <div className="flex justify-between items-start mb-1 gap-2">
                                    <div className="font-bold text-sm text-slate-800 leading-snug line-clamp-1">
                                        {car.year} {car.make} {car.model}
                                    </div>
                                    <div className="bg-[#FFD600] text-black border-2 border-black font-black font-mono text-xs px-1.5 py-0.5 rounded-[3px] shadow-sm whitespace-nowrap flex-none">
                                        {car.regMark || '未出牌'}
                                    </div>
                                </div>

                                {/* 中港車牌與標籤 */}
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {car.crossBorder?.mainlandPlate && (
                                        <span className={`${car.crossBorder.mainlandPlate.startsWith('粵Z') ? 'bg-black text-white border-white' : 'bg-[#003399] text-white border-white'} border font-bold font-mono text-[9px] px-1.5 py-0.5 rounded shadow-sm leading-tight`}>
                                            {car.crossBorder.mainlandPlate}
                                        </span>
                                    )}
                                    {cbTags.map((t,i) => <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded shadow-sm font-bold ${t.color}`}>{t.label}</span>)}
                                </div>

                                {/* 規格微標籤 (升級：加入座位與排檔) */}
                                <div className="flex flex-wrap gap-1.5 mt-auto mb-4">
                                    {car.colorExt && <span className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 flex items-center"><div className="w-2 h-2 rounded-full border border-gray-300 mr-1.5 shadow-inner" style={{backgroundColor: getColorHex(car.colorExt)}}></div>{car.colorExt}</span>}
                                    <span className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">{car.previousOwners || 0}手</span>
                                    {/* ★ 新增：座位數 */}
                                    {car.seating && <span className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">{car.seating}座</span>}
                                    {/* ★ 新增：排檔 */}
                                    {car.transmission && <span className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">{car.transmission === 'Manual' ? '手波' : '自動波'}</span>}
                                    {car.engineSize && <span className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">{car.engineSize}{car.fuelType === 'Electric' ? 'Kw' : 'cc'}</span>}
                                    {car.mileage ? <span className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">{Number(car.mileage).toLocaleString()}km</span> : null}
                                </div>

                                {/* 底部操作區 */}
                                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                    <div className="flex flex-col gap-1 items-start text-[10px]">
                                        {car.licenseExpiry && (() => {
                                            const isExp = new Date(car.licenseExpiry) < new Date();
                                            return <span className={`px-2 py-1 rounded-md font-bold border shadow-sm ${isExp?'bg-red-50 text-red-600 border-red-200':'bg-slate-50 text-slate-500 border-slate-200'}`}>牌費: {car.licenseExpiry} {isExp&&'!'}</span>;
                                        })()}
                                        
                                        {/* ★ 進度徽章移到這裡，與牌費上下排列 */}
                                        {logisticsBadge && (
                                            <span className={`px-2 py-1 rounded-md font-bold border shadow-sm ${logisticsBadge.color}`}>
                                                {logisticsBadge.text}
                                            </span>
                                        )}

                                        {(!car.licenseExpiry && !logisticsBadge) && <span className="text-gray-300">-</span>}
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <button onClick={(e) => { e.stopPropagation(); setShareCleanMode(true); setShareVehicle(car); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Share2 size={16}/></button>
                                        <button onClick={(e) => { e.stopPropagation(); deleteVehicle(car.id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={16}/></button>
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
                staffId={staffId!} 
                appId={appId} 
                inventory={visibleInventory} 
                updateVehicle={updateVehicle} // ★ 關鍵：必須傳入此函數以更新流程狀態
                triggerSmartPrint={triggerSmartPrint} // ★ 新增：傳入列印引擎，讓運輸署打包單可以印出 PDF
            />
        )}

        {/* Create Doc Tab - 已分離至獨立元件 */}
        {activeTab === 'create_doc' && (
              <CreateDocModule 
                  inventory={visibleInventory} 
                  openPrintPreview={openPrintPreview} 
                  db={db}
                  staffId={staffId!}
                  appId={appId}
                  externalRequest={externalDocRequest}
                  setExternalRequest={setExternalDocRequest}
                  COMPANY_INFO={COMPANY_INFO}
                  currentUser={currentUser} 
                  allSalesDocs={allSalesDocs} // ★★★ 新增：傳入所有歷史單據，供智能防重複查驗使用
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
                  settings={settings}
                  inventory={visibleInventory} 
              />
          )}

          {/* ★★★ 新增：掛載獨立的海外訂車管家模塊 ★★★ */}
        {activeTab === 'import_orders' && (
            <div className="h-full animate-fade-in">
                <ImportOrderManager 
                    db={db}
                    staffId={staffId}
                    appId={appId}
                    inventory={visibleInventory}
                    settings={settings}
                    systemUsers={systemUsers}
                />
            </div>
        )}

       
        {activeTab === 'company_ledger' && (
            <div className="h-full animate-fade-in flex-1 overflow-y-auto">
                <CompanyFinanceLedger 
                    db={db}
                    appId={appId}
                    staffId={staffId}
                    currentUser={currentUser}
                    settings={settings}
                />
            </div>
        )}

         </div>       
      </main>

     {/* ========================================================= */}
      {/* ★★★ 升級版：右下角全域懸浮菜單 (Speed Dial) ★★★ */}
      {/* ========================================================= */}
      {staffId && !editingVehicle && activeTab !== 'inventory_add' && !isPreviewMode && activeTab !== 'cross_border' && (
          <div className="fixed bottom-6 right-4 md:right-6 z-[45] flex flex-col items-end gap-3 print:hidden pointer-events-none">
              
              <div className={`flex flex-col gap-3 items-end transition-all duration-300 origin-bottom ${isFabMenuOpen ? 'scale-y-100 opacity-100 mb-2 pointer-events-auto' : 'scale-y-0 opacity-0 pointer-events-none'}`}>
                  
                  {/* 選項 2: T牌打卡 */}
                  <div className="flex items-center gap-3 group">
                      <span className="bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity font-bold">試車牌 (T牌) 打卡</span>
                      <button 
                          onClick={() => { setIsTPlateModalOpen(true); setIsFabMenuOpen(false); }}
                          className="pointer-events-auto w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                      >
                          <Car size="{20}"/>
                      </button>
                  </div>

                  {/* 選項 1: 團隊協作中心 */}
                  <div className="flex items-center gap-3 group">
                      <span className="bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity font-bold">團隊協作 / 對話</span>
                      <button 
                          onClick={() => { setIsTeamHubOpen(true); setIsFabMenuOpen(false); }}
                          className="pointer-events-auto w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                      >
                          <MessageCircle size="{20}"/>
                      </button>
                  </div>
              </div>

              {/* 主按鈕 */}
              <button 
                  onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
                  className={`pointer-events-auto relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-95 ${isFabMenuOpen ? 'bg-slate-800 rotate-45' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-110'}`}
                  title="系統功能表"
              >
                  {isFabMenuOpen ? <Plus className="text-white" size="{28}"/> : (
                      <>
                          <Menu className="text-white" size="{24}"/>
                          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
                      </>
                  )}
              </button>
          </div>
      )}

      {/* ========================================================= */}
      {/* ★★★ 掛載 T牌打卡專屬彈窗 Modal ★★★ */}
      {/* ========================================================= */}
      {isTPlateModalOpen && (
          <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 md:p-6 animate-fade-in">
              <div className="bg-slate-50 w-full max-w-4xl max-h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                  <div className="p-4 md:px-6 md:py-4 bg-white border-b border-slate-100 flex justify-between items-center z-10 flex-none">
                      <h2 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2">
                          <Car className="text-emerald-600"/> 試車牌 (T牌) 智能管理
                      </h2>
                      <button onClick={() => setIsTPlateModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                          <X size={20}/>
                      </button>
                  </div>
                  <div className="p-2 md:p-4 overflow-y-auto flex-1 scrollbar-thin">
                      {/* 直接把組件包在這裡面 */}
                      <TradePlateWidget db={db} appId={appId} staffId={staffId!} />
                  </div>
              </div>
          </div>
      )}

      {/* 以下接續您原本的 ChangePasswordModal 與 TeamHubDrawer */}

      {/* ★★★ 新增：掛載修改密碼彈窗 ★★★ */}
      <ChangePasswordModal 
          isOpen={isChangePwdOpen}
          onClose={() => setIsChangePwdOpen(false)}
          staffId={staffId}
          systemUsers={systemUsers}
          updateSystemUsers={updateSystemUsers}
      />

      {/* ★★★ 新增：掛載團隊協作抽屜 ★★★ */}
      <TeamHubDrawer 
          isOpen={isTeamHubOpen}
          onClose={() => setIsTeamHubOpen(false)}
          db={db}
          staffId={staffId}
          appId={appId}
          systemUsers={systemUsers}
          inventory={visibleInventory}
          setEditingVehicle={setEditingVehicle}
          currentUser={currentUser}
          sendPushNotification={sendPushNotification}
      />

    </div>
  );
}
