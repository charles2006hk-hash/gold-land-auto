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
  getDocs, where, limit 
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

    // ★★★ 修改：升級版農曆轉換邏輯 (支援生肖與全中文日期) ★★★
    const getLunarDate = () => {
        try {
            const formatter = new Intl.DateTimeFormat('zh-HK', { calendar: 'chinese', dateStyle: 'full' });
            const parts = formatter.formatToParts(currentTime);
            
            let year = '', month = '', day = '';
            parts.forEach(p => {
                if (p.type === 'year') year = p.value;
                if (p.type === 'month') month = p.value;
                if (p.type === 'day') day = p.value;
            });

            // 提取干支 (過濾掉可能的西元年數字與年這字)
            const ganzhi = year.replace(/[0-9]/g, '').replace('年', '');
            
            // 生肖對照表
            const zodiacMap: Record<string, string> = {
                '子':'鼠', '丑':'牛', '寅':'虎', '卯':'兔', '辰':'龍', '巳':'蛇',
                '午':'馬', '未':'羊', '申':'猴', '酉':'雞', '戌':'狗', '亥':'豬'
            };
            
            let zodiac = '';
            if (ganzhi.length >= 2) {
                zodiac = zodiacMap[ganzhi.charAt(1)] || '';
            }

            // 如果日期回傳的是阿拉伯數字 (例如 14)，轉為農曆中文習慣 (十四)
            if (/^\d+$/.test(day)) {
                const num = parseInt(day, 10);
                const chars = ['十', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
                if (num <= 10) day = '初' + (num === 10 ? '十' : chars[num]);
                else if (num < 20) day = '十' + (num === 10 ? '' : chars[num % 10]);
                else if (num === 20) day = '二十';
                else if (num < 30) day = '廿' + chars[num % 10];
                else if (num === 30) day = '三十';
            }

            // 確保尾部有「日」字 (例如: 正月十四日)
            if (!day.includes('日')) day += '日';

            if (ganzhi && zodiac) {
                return `${ganzhi}年(${zodiac}年) ${month}${day}`;
            }
            return `${month}${day}`;
        } catch (e) {
            return '';
        }
    };

    return (
        <div className="mx-3 mb-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700 text-xs backdrop-blur-sm transition-all hover:bg-slate-800/80">
            <div className="mb-3 border-b border-slate-700 pb-2">
                <div className="text-xl font-mono font-bold text-white tracking-widest text-center">{currentTime.toLocaleTimeString('en-GB', { hour12: false })}</div>
                {/* ★★★ 修改：將星期改為全稱「星期一」 ★★★ */}
                <div className="flex justify-between mt-1 text-slate-400">
                    <span>{currentTime.toLocaleDateString('zh-HK')}</span>
                    <span>{['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][currentTime.getDay()]}</span>
                </div>
                {/* ★★★ 修改：直接呼叫 getLunarDate() 渲染 ★★★ */}
                <div className="text-center mt-1 text-yellow-500 font-medium">
                    {getLunarDate()}
                </div>
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
    onOpenChangePwd: () => void; // ★ 新增這行
};

const Sidebar = ({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen, isSidebarCollapsed, setIsSidebarCollapsed, staffId, setStaffId, currentUser, onOpenChangePwd }: SidebarProps) => {
    
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
        { id: 'import_orders', label: '海外訂車管家', icon: Ship, permission: 'import_orders' },
        { id: 'create_doc', label: '開單系統', icon: FileText, permission: 'inventory' }, // 開單通常跟隨車庫
        { id: 'reports', label: '財務總覽', icon: Briefcase, permission: 'reports' },
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
      
          {/* ★ 側邊欄外層：改用 inset-y-0 完美貼合上下邊緣，棄用會算錯高度的 100dvh */}
          <div className={`fixed inset-y-0 left-0 z-40 bg-slate-900 text-white transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:h-full flex flex-col ${isSidebarCollapsed ? 'w-16' : 'w-64'} print:hidden shadow-xl border-r border-slate-800`}> 
           
           {/* Header 區域 - ★ 改用 min-h 並加入 pt 避開瀏海/動態島 */}
            <div className={`pt-[max(1rem,env(safe-area-inset-top))] pb-3 min-h-[4rem] border-b border-slate-700 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between px-4'} transition-all flex-none`}>
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

            {/* 導航列表 (使用 visibleMenuItems 渲染) - 加入終極無痕隱形捲軸與底部漸層 */}
            <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
                {/* ★ 終極魔法：直接注入原生 CSS 強制殺掉捲軸 */}
                <style>{`
                    .sidebar-no-scroll::-webkit-scrollbar { display: none; }
                    .sidebar-no-scroll { -ms-overflow-style: none; scrollbar-width: none; }
                `}</style>
                
                <nav className="sidebar-no-scroll flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden pb-10">
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
                {/* 底部優雅的漸層遮罩 (暗示可以往下滑，pointer-events-none 確保不阻擋點擊) */}
                <div className="absolute bottom-0 left-0 w-full h-10 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none z-10"></div>
            </div>
            
            {!isSidebarCollapsed && <InfoWidget />}
            
            {/* 底部登入資訊：★ 在這裡加入安全內距，讓按鈕避開 Home 橫條，而背景依舊填滿 */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex-none pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                 {isSidebarCollapsed ? (
                     <button onClick={handleLogout} className="w-full flex justify-center text-slate-500 hover:text-red-400 transition" title="登出"><LogOut size={18} /></button>
                 ) : (
                     <div className="flex items-center justify-between px-1">
                        <div className="flex items-center space-x-2 overflow-hidden">
                            <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center text-yellow-500 border border-slate-700"><UserCircle size={16} /></div>
                            <div className="flex-1 min-w-0"><p className="text-xs font-bold text-white truncate">{staffId}</p><p className="text-[9px] text-slate-500">在線</p></div>
                        </div>
                        {/* ★ 新增了修改密碼(Key)按鈕 */}
                        <div className="flex items-center gap-1">
                            <button onClick={onOpenChangePwd} className="text-slate-400 hover:text-yellow-400 transition p-1.5 hover:bg-slate-800 rounded" title="修改密碼"><Key size={14} /></button>
                            <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition p-1.5 hover:bg-slate-800 rounded" title="登出"><LogOut size={14} /></button>
                        </div>
                    </div>
                 )}
                 {isSidebarCollapsed && <button onClick={() => setIsSidebarCollapsed(false)} className="w-full mt-3 flex justify-center text-slate-600 hover:text-white py-1 md:flex hidden"><ChevronRight size={16} /></button>}
            </div>
            {/* ★ 讓 X 按鈕也避開瀏海安全區域 */}
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
                {/* Logo 彈跳與發光效果 */}
                <div className="w-24 h-24 bg-white rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.15)] p-3 mb-8 animate-bounce" style={{ animationDuration: '2s' }}>
                    <img src={COMPANY_INFO.logo_url} alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display='none'; }}/>
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
// ★★★ 新增：AI 智能新聞快訊 (實時股票指數 + 匯率翻頁版 + 本月車市銷量 + 大數據整合) ★★★
// ------------------------------------------------------------------
const SmartNewsTicker = ({ dbEntries, inventory, staffId, currentUser }: { dbEntries: any[], inventory: any[], staffId: string, currentUser: any }) => {
    const [aiNewsFeed, setAiNewsFeed] = useState([
        { tag: '⏳ 系統提示', text: '正在載入 AI 即時整理的車市與財經快訊...', time: '--:--' }
    ]);

    const [finIndex, setFinIndex] = useState(0);
    const [financialStats, setFinancialStats] = useState([
        { label: '實時金融', value: '載入中...', color: 'text-slate-400' }
    ]);

    const [carSalesStats, setCarSalesStats] = useState({
        month: new Date().getMonth() + 1, 
        evCount: '...',
        petrolCount: '...',
        total: '...'
    });

    // ★ 匯率計算機專用狀態
    const [isConverterOpen, setIsConverterOpen] = useState(false);
    const [allRates, setAllRates] = useState<Record<string, number> | null>(null);
    const [currA, setCurrA] = useState('CNY');
    const [currB, setCurrB] = useState('HKD');
    const [valA, setValA] = useState('100');
    const [valB, setValB] = useState('');

    // ★ 核心修復：大數據圖表專用的彈窗狀態！
    const [isMarketIntelOpen, setIsMarketIntelOpen] = useState(false);

    useEffect(() => {
        if (isConverterOpen && allRates && allRates[currA] && allRates[currB]) {
            const rate = allRates[currB] / allRates[currA];
            setValB((Number(valA) * rate).toFixed(2));
        }
    }, [isConverterOpen, allRates]); 

    const handleAChange = (e: any, cA = currA, cB = currB) => {
        const v = e.target.value;
        setValA(v);
        if (v === '') {
            setValB('');
        } else if (allRates && allRates[cA] && allRates[cB]) {
            setValB((Number(v) * (allRates[cB] / allRates[cA])).toFixed(2));
        }
    };

    const handleBChange = (e: any, cA = currA, cB = currB) => {
        const v = e.target.value;
        setValB(v);
        if (v === '') {
            setValA('');
        } else if (allRates && allRates[cA] && allRates[cB]) {
            setValA((Number(v) * (allRates[cA] / allRates[cB])).toFixed(2));
        }
    };

    const swapCurrencies = () => {
        const tempC = currA; setCurrA(currB); setCurrB(tempC);
        const tempV = valA; setValA(valB); setValB(tempV);
    };

    useEffect(() => {
        const checkAndFetchNews = async () => {
            const now = new Date();
            const currentHour = now.getHours();
            const lastFetchStr = localStorage.getItem('goldland_news_last_fetch');
            const cachedNewsStr = localStorage.getItem('goldland_news_cache');
            
            let shouldFetch = false;
            if (!lastFetchStr || !cachedNewsStr) {
                shouldFetch = true;
            } else {
                const lastFetchDate = new Date(parseInt(lastFetchStr));
                const isNewDay = lastFetchDate.getDate() !== now.getDate() || lastFetchDate.getMonth() !== now.getMonth() || lastFetchDate.getFullYear() !== now.getFullYear();

                if (isNewDay) {
                    shouldFetch = true;
                } else {
                    if (currentHour >= 10 && currentHour < 22) {
                        const hoursSinceLastFetch = (now.getTime() - lastFetchDate.getTime()) / (1000 * 60 * 60);
                        if (hoursSinceLastFetch >= 3) shouldFetch = true;
                    }
                }
            }

            if (shouldFetch) {
                try {
                    const res = await fetch('/api/news');
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.length > 0) {
                            setAiNewsFeed(data);
                            localStorage.setItem('goldland_news_last_fetch', now.getTime().toString());
                            localStorage.setItem('goldland_news_cache', JSON.stringify(data));
                        }
                    }
                } catch (e) {
                    if (cachedNewsStr) setAiNewsFeed(JSON.parse(cachedNewsStr));
                }
            } else if (cachedNewsStr) {
                setAiNewsFeed(JSON.parse(cachedNewsStr));
            }
        };

        const fetchRealTimeData = async () => {
            try {
                let newStats: any[] = [];
                const indicesRes = await fetch('/api/finance');
                if (indicesRes.ok) {
                    const indicesData = await indicesRes.json();
                    if (Array.isArray(indicesData)) newStats = [...newStats, ...indicesData];
                }

                const forexRes = await fetch('https://open.er-api.com/v6/latest/HKD');
                if (forexRes.ok) {
                    const forexData = await forexRes.json();
                    if (forexData && forexData.rates) {
                        setAllRates(forexData.rates);
                        newStats.push(
                            { label: '人民幣/港元', value: (1 / forexData.rates.CNY).toFixed(3), color: 'text-red-400' },
                            { label: '百日圓/港元', value: (100 / forexData.rates.JPY).toFixed(2), color: 'text-yellow-400' },
                            { label: '澳元/港元', value: (1 / forexData.rates.AUD).toFixed(2), color: 'text-blue-300' },
                            { label: '歐元/港元', value: (1 / forexData.rates.EUR).toFixed(2), color: 'text-blue-300' },
                            { label: '英鎊/港元', value: (1 / forexData.rates.GBP).toFixed(2), color: 'text-blue-300' }
                        );
                    }
                }

                if (newStats.length > 0) setFinancialStats(newStats);
            } catch (error) {
                console.error("Financial data fetch error", error);
            }
        };

        const fetchVehicleStats = async () => {
            try {
                const res = await fetch('/api/td-stats');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.month) {
                        setCarSalesStats({
                            month: data.month, evCount: data.evCount, petrolCount: data.petrolCount, total: data.total
                        });
                    }
                }
            } catch (error) {}
        };

        checkAndFetchNews(); fetchRealTimeData(); fetchVehicleStats();
        
        const newsInterval = setInterval(checkAndFetchNews, 10 * 60 * 1000);
        const forexInterval = setInterval(fetchRealTimeData, 5 * 60 * 1000); 
        
        return () => { clearInterval(newsInterval); clearInterval(forexInterval); };
    }, []);

    useEffect(() => {
        const flipInterval = setInterval(() => {
            setFinIndex((prev) => (prev + 1) % financialStats.length);
        }, 3500);
        return () => clearInterval(flipInterval);
    }, [financialStats.length]);

    return (
        <>
            <div className="flex items-center bg-slate-100 text-slate-700 rounded-full shadow-inner overflow-hidden w-full border border-slate-200 h-8 relative max-w-5xl mx-auto">
                <style>{`
                    @keyframes marquee-inline { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                    .animate-marquee-inline { display: inline-flex; white-space: nowrap; animation: marquee-inline 150s linear infinite; }
                    .animate-marquee-inline:hover { animation-play-state: paused; }
                    .mask-edges-inline { -webkit-mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent); mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent); }
                `}</style>

                {/* 左側標籤 */}
                <div className="flex-none bg-blue-600 text-white text-[10px] font-bold px-2 md:px-3 h-full flex items-center z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                    <Zap size={12} className="mr-1 text-yellow-400 fill-yellow-400 animate-pulse"/> 
                    <span className="hidden md:inline">AI 快訊</span>
                    <span className="md:hidden">AI</span>
                </div>

                {/* ★ 金融實時翻頁區 (點擊打開匯率計算機) */}
                <div 
                    onClick={() => setIsConverterOpen(true)}
                    className="flex-none bg-slate-800 text-white h-full relative overflow-hidden flex items-center justify-center min-w-[130px] md:min-w-[160px] border-r border-slate-700 z-10 shadow-inner cursor-pointer hover:bg-slate-700 transition-colors group"
                    title="點擊開啟實時匯率換算"
                >
                    {financialStats.map((stat, idx) => {
                        let finalColor = stat.color;
                        const valStr = String(stat.value);
                        if (valStr.includes('+') || valStr.includes('▲')) finalColor = 'text-green-400';
                        else if (valStr.includes('-') || valStr.includes('▼')) finalColor = 'text-red-400';

                        return (
                            <div 
                                key={idx} 
                                className={`absolute inset-0 flex items-center justify-center px-1.5 md:px-2 transition-all duration-500 ease-in-out ${
                                    finIndex === idx ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                                }`}
                            >
                                <span className="text-[9px] md:text-[10px] text-slate-300 mr-1.5 whitespace-nowrap">{stat.label}</span>
                                <span className={`text-[10px] md:text-[11px] font-bold font-mono tracking-tight whitespace-nowrap ${finalColor}`}>{stat.value}</span>
                            </div>
                        );
                    })}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-yellow-400 transition-opacity z-20">
                        <ArrowUpDown size={12} />
                    </div>
                </div>

                {/* 中央：新聞滾動文字 */}
                <div className="flex-1 overflow-hidden relative mask-edges-inline flex items-center h-full">
                    <div className="animate-marquee-inline cursor-default h-full flex items-center">
                        {[...aiNewsFeed, ...aiNewsFeed].map((item, idx) => (
                            <div key={idx} className="flex items-center px-4 shrink-0 hover:bg-black/5 transition-colors h-full">
                                <span className="text-[9px] text-slate-400 font-mono mr-1.5">[{item.time}]</span>
                                <span className="text-[10px] font-bold text-blue-600 mr-1.5">{item.tag}</span>
                                <span className="text-[11px] text-slate-600 tracking-wide">{item.text}</span>
                                <span className="mx-4 text-slate-300">|</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ★ 右側：運輸署私家車銷售情報區 (純淨正統 React 點擊事件，直接改變 State！) */}
                <div 
                    onClick={() => setIsMarketIntelOpen(true)}
                    className="hidden md:flex flex-none bg-slate-800 text-white h-full px-3 items-center border-l border-slate-700 z-20 shadow-inner cursor-pointer hover:bg-slate-700 transition-colors group"
                    title="點擊展開市場大數據與採購推算"
                >
                    <div className="flex items-center gap-3">
                        <div className="text-[9px] text-slate-400 leading-tight border-r border-slate-600 pr-2 group-hover:text-slate-300 transition-colors">
                            {carSalesStats.month}月全港登記<br/><span className="text-slate-200 font-bold tracking-widest">{carSalesStats.total}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px]">
                            <div className="flex items-center" title="電動車登記數 (Electric)">
                                <span className="text-green-400 font-bold mr-1.5">EV⚡</span>
                                <span className="font-mono text-white font-bold">{carSalesStats.evCount}</span>
                            </div>
                            <div className="flex items-center" title="燃油車登記數 (Petrol/Diesel)">
                                <span className="text-orange-400 font-bold mr-1.5">燃油⛽</span>
                                <span className="font-mono text-white font-bold">{carSalesStats.petrolCount}</span>
                            </div>
                            <BarChart3 size={14} className="ml-1 text-slate-400 group-hover:text-yellow-400 transition-colors" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ★★★ 雙向實時匯率計算機 (Modal) ★★★ */}
            {isConverterOpen && (
                <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsConverterOpen(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-900 p-5 text-white flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[50px] opacity-20 -mr-10 -mt-10 pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-500 rounded-full blur-[50px] opacity-20 -ml-10 -mb-10 pointer-events-none"></div>
                            <h3 className="font-bold flex items-center gap-2 text-lg relative z-10">
                                <RefreshCw size={18} className="text-yellow-400"/> 實時雙向匯率換算
                            </h3>
                            <button onClick={() => setIsConverterOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors relative z-10"><X size={20}/></button>
                        </div>
                        
                        <div className="p-6 space-y-4 bg-slate-50">
                            {/* 常用匯率快捷鍵 */}
                            <div className="flex gap-2 mb-2">
                                <button onClick={() => { setCurrA('CNY'); setCurrB('HKD'); handleAChange({target:{value: valA}}, 'CNY', 'HKD'); }} className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${currA==='CNY'&&currB==='HKD' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>🇨🇳 CNY ⇌ 🇭🇰 HKD</button>
                                <button onClick={() => { setCurrA('JPY'); setCurrB('HKD'); handleAChange({target:{value: valA}}, 'JPY', 'HKD'); }} className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${currA==='JPY'&&currB==='HKD' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>🇯🇵 JPY ⇌ 🇭🇰 HKD</button>
                            </div>

                            {/* Input A */}
                            <div className="relative bg-white rounded-2xl p-2 shadow-sm border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                                <div className="flex items-center">
                                    <select value={currA} onChange={e => { setCurrA(e.target.value); handleAChange({target:{value:valA}}, e.target.value, currB); }} className="bg-transparent px-2 py-2 outline-none font-bold text-slate-700 w-[100px] cursor-pointer border-r border-slate-100">
                                        <option value="CNY">🇨🇳 人民幣</option><option value="HKD">🇭🇰 港幣</option><option value="JPY">🇯🇵 日圓</option><option value="USD">🇺🇸 美元</option><option value="EUR">🇪🇺 歐元</option>
                                    </select>
                                    <input type="number" step="any" value={valA} onChange={e => handleAChange(e, currA, currB)} className="flex-1 px-3 py-2 outline-none font-mono text-2xl font-black text-right text-slate-800 bg-transparent w-full" placeholder="0.00" />
                                </div>
                            </div>

                            <div className="flex justify-center -my-5 relative z-10">
                                <button onClick={swapCurrencies} className="bg-slate-900 p-2 rounded-full shadow-md text-yellow-400 hover:scale-110 active:scale-95 transition-all border-4 border-slate-50"><ArrowUpDown size={14} /></button>
                            </div>

                            {/* Input B */}
                            <div className="relative bg-white rounded-2xl p-2 shadow-sm border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                                <div className="flex items-center">
                                    <select value={currB} onChange={e => { setCurrB(e.target.value); handleBChange({target:{value:valB}}, currA, e.target.value); }} className="bg-transparent px-2 py-2 outline-none font-bold text-slate-700 w-[100px] cursor-pointer border-r border-slate-100">
                                        <option value="HKD">🇭🇰 港幣</option><option value="CNY">🇨🇳 人民幣</option><option value="JPY">🇯🇵 日圓</option><option value="USD">🇺🇸 美元</option><option value="EUR">🇪🇺 歐元</option>
                                    </select>
                                    <input type="number" step="any" value={valB} onChange={e => handleBChange(e, currA, currB)} className="flex-1 px-3 py-2 outline-none font-mono text-2xl font-black text-right text-blue-600 bg-transparent w-full" placeholder="0.00" />
                                </div>
                            </div>

                            <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100/50 mt-2">
                                <div className="text-xs text-center text-slate-600 font-mono font-bold tracking-wide">
                                    {allRates && allRates[currA] && allRates[currB] ? `1 ${currA} = ${(allRates[currB] / allRates[currA]).toFixed(4)} ${currB}` : '正在同步實時匯率...'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ★★★ 核心修復：市場大數據專屬全螢幕彈窗 (Modal) ★★★ */}
            {isMarketIntelOpen && (
                <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-fade-in" onClick={() => setIsMarketIntelOpen(false)}>
                    <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        
                        {/* 彈窗標題列 */}
                        <div className="bg-slate-900 p-5 text-white flex justify-between items-center flex-none">
                            <h3 className="font-bold flex items-center gap-2 text-lg">
                                <BarChart3 size={20} className="text-yellow-400"/> 
                                市場大數據與採購推算
                            </h3>
                            <button onClick={() => setIsMarketIntelOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                                <X size={24}/>
                            </button>
                        </div>
                        
                        {/* 數據內容區：完美包裹整塊組件 */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100">
                            <MarketIntelligence 
                                dbEntries={dbEntries} 
                                inventory={inventory} 
                                staffId={staffId} 
                                currentUser={currentUser} 
                            />
                        </div>

                    </div>
                </div>
            )}
        </>
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
                { key: 'licenseExpiry', reminderKey: 'licenseReminderEnabled', label: '車輛牌費 (License)' }, 
                { key: 'insuranceExpiry', reminderKey: 'insuranceReminderEnabled', label: '車輛保險 (Insurance)' }
            ];
            genDocs.forEach(d => {
                const dateVal = (car as any)[d.key];
                // ★ 智能判斷：根據不同的項目，檢查對應的開關屬性
                const isRemind = (car as any)[d.reminderKey] !== false;
                
                if (dateVal && isRemind) {
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
                    const reminderKey = key.replace('date', 'cb_remind_'); 
                    const isRemind = (cb as any)?.[reminderKey] !== false;

                    if (dateVal && isRemind) {
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

   const handlePrint = () => {
        const htmlContent = `
            <div style="padding: 40px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333;">
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
                    <h1 style="margin: 0 0 5px 0; font-size: 24px;">Gold Land Auto Limited</h1>
                    <p style="margin: 0; color: #666; font-size: 12px;">EXPIRY REMINDER REPORT (到期事項監控報表)</p>
                    <p style="margin: 0; color: #666; font-size: 12px;">Generated: ${new Date().toLocaleString()}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
                    <thead>
                        <tr>
                            <th style="border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left; background-color: #f8f9fa; font-weight: bold; color: #555; width: 15%;">類別 (Type)</th>
                            <th style="border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left; background-color: #f8f9fa; font-weight: bold; color: #555; width: 20%;">車牌 (Plate)</th>
                            <th style="border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left; background-color: #f8f9fa; font-weight: bold; color: #555; width: 30%;">到期項目 (Item)</th>
                            <th style="border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left; background-color: #f8f9fa; font-weight: bold; color: #555; width: 20%;">到期日 (Date)</th>
                            <th style="border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: right; background-color: #f8f9fa; font-weight: bold; color: #555; width: 15%;">狀態 (Status)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${alerts.map(it => `
                            <tr>
                                <td style="border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left;">
                                    <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; ${it.type === 'General' ? 'background: #e0f2fe; color: #0369a1;' : 'background: #f3e8ff; color: #7e22ce;'}">${it.type === 'General' ? '車輛文件' : '中港業務'}</span>
                                </td>
                                <td style="border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left; font-family:monospace; font-weight:bold;">${it.regMark}</td>
                                <td style="border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left;">${it.item}</td>
                                <td style="border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left; font-family:monospace;">${it.date}</td>
                                <td style="border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: right; font-weight: bold; color: ${it.days < 0 ? '#dc2626' : '#d97706'};">
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
                <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #999;">Confidential System Report</div>
            </div>
        `;
        triggerSmartPrint(htmlContent, 'Alert_Report');
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
    const [customRemark, setCustomRemark] = useState('');

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
            list.sort((a,b) => (b.isPrimary?1:0) - (a.isPrimary?1:0));
            setPhotos(list.map(i => i.url).slice(0, 6)); 
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
// --- 主應用程式 ---
export default function GoldLandAutoDMS() {
  const [user, setUser] = useState<User | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ email: string, modules: string[], dataAccess?: string } | null>(null);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'create_doc' | 'settings' | 'inventory_add' | 'reports' | 'cross_border' | 'business' | 'database' | 'media_center' | 'import_orders'>('dashboard');
  const [allSalesDocs, setAllSalesDocs] = useState<any[]>([]); // 儲存所有單據供車輛詳情查詢
  const [externalDocRequest, setExternalDocRequest] = useState<any | null>(null); // 跨頁面編輯請求
  const [isDataSyncing, setIsDataSyncing] = useState(true);
  const [isTeamHubOpen, setIsTeamHubOpen] = useState(false);
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

// ★★★ 升級版：自動發送推送通知輔助函數 (支援廣播 及 指定員工) ★★★
    // targetUsers: 如果留空，就發送俾所有人；如果傳入 ['sales01', 'admin']，就只發俾呢兩個人。
    const sendPushNotification = async (title: string, body: string, targetUsers?: string[]) => {
        if (!db || !appId || !settings.pushConfig?.isEnabled) return;
        try {
            const tokenRef = collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_tokens');
            const tokenSnap = await getDocs(tokenRef);
            const tokens: string[] = [];
            
            tokenSnap.forEach(doc => {
                const data = doc.data();
                if (data.token) {
                    // 如果有指定員工名單，就檢查呢個 token 屬唔屬於嗰個員工
                    if (targetUsers && targetUsers.length > 0) {
                        if (targetUsers.includes(data.user)) {
                            tokens.push(data.token);
                        }
                    } else {
                        // 如果無指定，就全部人都加落去 (廣播模式)
                        tokens.push(data.token);
                    }
                }
            });

            if (tokens.length === 0) return;

            await fetch('/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokens, title, body })
            });
        } catch (e) {
            console.error("發送系統通知失敗", e);
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

        const vData = {
            isPublic: isPublicFormValue,
            // ★★★ 修正 2：確保正確存入行家歸屬與名稱 ★★★
            sourceType: (formData.get('sourceType') as string) || 'own',
            partnerName: (formData.get('sourceType') === 'partner') ? (formData.get('acq_vendor') as string || '') : '',
            // ★★★ 結束 ★★★

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
            if (editingVehicle && editingVehicle.id) {
                await updateDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory', editingVehicle.id), vData);
                addSystemLog('Update Vehicle', `Updated RegMark: ${vData.regMark}`);
                
                // ★ 判斷是否剛剛售出，若是則觸發通知
                if (settings.pushConfig?.events?.sold && status === 'Sold' && editingVehicle.status !== 'Sold') {
                    sendPushNotification('🎉 車輛已售出！', `車牌 ${vData.regMark || '未出牌'} (${vData.make} ${vData.model}) 剛剛已成功售出！`);
                }
                
                alert('✅ 車輛資料已成功更新！');
            } else {
                await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory'), {
                    ...vData,
                    createdAt: serverTimestamp(),
                    expenses: [],
                    payments: [],
                    salesAddons: []
                });
                addSystemLog('Create Vehicle', `Created RegMark: ${vData.regMark}`);
                
                // ★ 新車入庫，觸發通知
                if (settings.pushConfig?.events?.newCar) {
                    sendPushNotification('🚗 新車入庫通知', `車牌 ${vData.regMark || '未出牌'} (${vData.make} ${vData.model}) 已成功加入庫存！`);
                }
                
                alert('✅ 新車輛已成功入庫！');
            }

            // 餵給智能引擎最完整的資料
            if (vData.customerName) {
                await syncToDatabase({ 
                    name: vData.customerName, 
                    phone: vData.customerPhone,
                    idNumber: vData.customerID,
                    address: vData.customerAddress
                }, '客戶');
            }
            if (crossBorderData.isEnabled) {
                if (crossBorderData.driver1) await syncToDatabase({ name: crossBorderData.driver1, relatedPlateNo: crossBorderData.mainlandPlate, quotaNo: crossBorderData.quotaNumber }, '司機');
                if (crossBorderData.driver2) await syncToDatabase({ name: crossBorderData.driver2, relatedPlateNo: crossBorderData.mainlandPlate }, '司機');
                if (crossBorderData.driver3) await syncToDatabase({ name: crossBorderData.driver3, relatedPlateNo: crossBorderData.mainlandPlate }, '司機');
            }

            setEditingVehicle(null);
            if (activeTab === 'inventory_add') {
                setActiveTab('inventory');
            }
        } catch (e) { 
            console.error(e); 
            // ★ 已經全域攔截，直接呼叫 alert 就會彈出漂亮的 Toast！
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
      (car.expenses || []).forEach(exp => {
        if (exp.status === 'Unpaid') totalPayable += exp.amount || 0;
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
      <div className="flex w-screen h-[100dvh] print:h-auto print:w-auto print:block bg-slate-100 text-slate-900 font-sans overflow-hidden print:overflow-visible print:bg-white">
      
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
           

      {/* ★ 加入 print:overflow-visible print:block，防止列印時內容被截斷 */}
      <main className="flex-1 w-full min-w-0 md:ml-0 pt-0 px-4 pb-0 md:p-8 print:m-0 print:p-0 transition-all duration-300 flex flex-col overflow-hidden print:overflow-visible print:block relative">
        
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
        
        {/* ★ 手機版頂部 Header (透過 CSS env() 延伸至 Dynamic Island 安全區域) */}
        <div className="md:hidden flex items-center justify-between bg-white px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] rounded-b-2xl shadow-sm print:hidden flex-none -mx-4 mb-4 z-20">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"><Menu size={28} /></button>
            <span className="font-bold text-lg text-slate-800 tracking-tight">Gold Land Auto</span>
            <div className="w-9"></div> {/* 不可見的佔位符，讓標題完美居中 */}
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

          
          {/* Dashboard Tab (v16.2: 修復滾動穿透與表格列高問題) */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col h-full overflow-hidden space-y-4 animate-fade-in relative">

                {/* 儀表板頂部：標題、快訊、鈴鐺 */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 flex-none">
                    <h2 className="text-2xl font-bold text-slate-800 whitespace-nowrap">業務儀表板</h2>
                    <div className="flex-1 w-full min-w-0 px-0 md:px-4">
                        <SmartNewsTicker 
                            dbEntries={dbEntries} 
                            inventory={visibleInventory} 
                            staffId={staffId!} 
                            currentUser={currentUser} 
                        />
                    </div>
                    <div className="absolute right-0 top-0 md:static">
                        <SmartNotificationCenter inventory={visibleInventory} settings={settings} />
                    </div>
                </div>
              
              {/* 卡片統計 */}
              <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-4 flex-none">
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500"><p className="text-xs text-gray-500 uppercase">庫存總值</p><p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalStockValue)}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500"><p className="text-xs text-gray-500 uppercase">未付費用</p><p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalPayable)}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500"><p className="text-xs text-gray-500 uppercase">應收尾數</p><p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalReceivable)}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500"><p className="text-xs text-gray-500 uppercase">本月銷售額</p><p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalSoldThisMonth)}</p></div>
              </div>

              
              
              {/* 提醒中心 */}
              {(() => {
                  const docAlerts: any[] = [];
                  // 1. 處理資料庫文件提醒 (升級：支援多重提醒掃描)
                  dbEntries.forEach(d => { 
                      // A. 主要提醒
                      if (d.reminderEnabled && d.expiryDate) { 
                          const days = getDaysRemaining(d.expiryDate); 
                          if (days !== null && days <= 30) { 
                              docAlerts.push({ id: d.id, title: d.name, desc: d.docType || '文件', date: d.expiryDate, days, status: days < 0 ? 'expired' : 'soon', raw: d, source: 'database' }); 
                          } 
                      } 
                      // B. 掃描自訂提醒模塊
                      if (d.customReminders && d.customReminders.length > 0) {
                          d.customReminders.forEach((rem: any) => {
                              if (rem.expiryDate) {
                                  const days = getDaysRemaining(rem.expiryDate);
                                  if (days !== null && days <= 30) {
                                      docAlerts.push({ 
                                          id: `${d.id}_${rem.id}`, 
                                          title: d.name, 
                                          desc: rem.title || '附加文件', 
                                          date: rem.expiryDate, 
                                          days, 
                                          status: days < 0 ? 'expired' : 'soon', 
                                          raw: d, 
                                          source: 'database' 
                                      });
                                  }
                              }
                          });
                      }
                  });

                  visibleInventory.forEach(v => {
                      // ★ 核心修復：宣告一個純 any 變數，徹底封印 TypeScript 對這台車的所有屬性審查
                      const anyV = v as any;

                      // 1. 牌費到期檢查
                      if (anyV.licenseExpiry && anyV.licenseReminderEnabled !== false) {
                          const days = getDaysRemaining(anyV.licenseExpiry);
                          if (days !== null && days <= 30) {
                              docAlerts.push({ 
                                  id: anyV.id + '_lic', title: anyV.regMark || '未出牌', desc: '牌費到期', 
                                  date: anyV.licenseExpiry, days, status: days < 0 ? 'expired' : 'soon', raw: anyV, source: 'vehicle' 
                              });
                          }
                      }

                      // 2. 保險到期檢查
                      if (anyV.insuranceExpiry && anyV.insuranceReminderEnabled !== false) {
                          const days = getDaysRemaining(anyV.insuranceExpiry);
                          if (days !== null && days <= 30) {
                              docAlerts.push({ 
                                  id: anyV.id + '_ins', title: anyV.regMark || '未出牌', desc: '保險到期', 
                                  date: anyV.insuranceExpiry, days, status: days < 0 ? 'expired' : 'soon', raw: anyV, source: 'vehicle' 
                              });
                          }
                      }
                  });
                  docAlerts.sort((a, b) => a.days - b.days);

                  const cbAlerts: any[] = [];
                  const cbDateFields = { dateHkInsurance: '香港保險', dateReservedPlate: '留牌紙', dateBr: '商業登記 (BR)', dateLicenseFee: '香港牌費', dateMainlandJqx: '內地交強險', dateMainlandSyx: '內地商業險', dateClosedRoad: '禁區紙', dateApproval: '批文卡', dateMainlandLicense: '內地行駛證', dateHkInspection: '香港驗車' };
                  
                  visibleInventory.forEach(v => { 
                      const cb = v.crossBorder; 
                      if (!cb) return; 
                      Object.entries(cbDateFields).forEach(([field, label]) => { 
                          const dateStr = (cb as any)?.[field]; 
                          // ★ 讀取該項目的開關狀態
                          const reminderKey = field.replace('date', 'cb_remind_');
                          const isRemind = (cb as any)?.[reminderKey] !== false;

                          if (dateStr && isRemind) { 
                              const days = getDaysRemaining(dateStr); 
                              if (days !== null && days <= 30) { 
                                  cbAlerts.push({ id: v.id, title: v.regMark || '未出牌', desc: label, date: dateStr, days, status: days < 0 ? 'expired' : 'soon', raw: v }); 
                              } 
                          } 
                      }); 
                      
                     
                  });
                  cbAlerts.sort((a, b) => a.days - b.days);
                  
                  const cbExpiredCount = cbAlerts.filter(a => a.status === 'expired').length;
                  const cbSoonCount = cbAlerts.filter(a => a.status === 'soon').length;
                  const docExpiredCount = docAlerts.filter(a => a.status === 'expired').length;
                  const docSoonCount = docAlerts.filter(a => a.status === 'soon').length;

                  const AlertList = ({ items, onItemClick }: any) => (
                      // ★ 加上 min-w-0 防止被過長內容撐破
                      <div className="flex-1 bg-black/20 rounded-lg overflow-hidden flex flex-col h-24 md:h-32 min-w-0">
                          <div className="overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/20">
                              {items.map((item:any, idx:number) => (
                                  <div key={idx} onClick={() => onItemClick(item)} className={`flex justify-between items-center p-2 rounded text-xs cursor-pointer hover:bg-white/10 border-l-2 ${item.status === 'expired' ? 'border-red-500 bg-red-900/10' : 'border-amber-400 bg-amber-900/10'}`}>
                                      <div className="flex-1 min-w-0 mr-2">
                                          <div className="font-bold truncate text-white">{item.title}</div>
                                          <div className="text-white/60 truncate">{item.desc}</div>
                                      </div>
                                      <div className="text-right whitespace-nowrap flex-shrink-0">
                                          <div className={`font-bold ${item.status === 'expired' ? 'text-red-400' : 'text-amber-400'}`}>{item.status === 'expired' ? `已過期 ${Math.abs(item.days)} 天` : `還有 ${item.days} 天`}</div>
                                          <div className="text-white/40 scale-90 origin-right">{item.date}</div>
                                      </div>
                                  </div>
                              ))}
                              {items.length === 0 && <div className="text-white/30 text-xs text-center mt-4">無提醒事項</div>}
                          </div>
                      </div>
                  );

                  return (
                      // ★ 恢復 grid-cols-2：確保 iPhone 永遠左右並排
                      <div className="grid grid-cols-2 gap-2 md:gap-3 flex-none">
                          
                          {/* 1. 中港提醒卡片 */}
                          <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg p-2 md:p-3 text-white shadow-sm flex flex-col md:flex-row gap-2 md:gap-3 relative overflow-hidden">
                              {/* ★ 左側：桌面版固定闊度防壓縮 (flex-shrink-0) */}
                              <div className="w-full md:w-32 flex-shrink-0 md:border-r border-white/10 pr-0 md:pr-3 flex flex-col justify-center">
                                  <div className="font-bold mb-1 md:mb-3 flex items-center text-[10px] md:text-sm text-slate-300 whitespace-nowrap">
                                      <Globe size={12} className="mr-1 md:mr-1.5"/> 中港
                                  </div>
                                  <div className="flex justify-between md:block">
                                      <div><div className="text-lg md:text-2xl font-bold text-red-400 leading-none">{cbExpiredCount}</div><div className="text-[9px] md:text-[10px] text-red-200/70 mt-0.5 md:mt-0">過期</div></div>
                                      <div><div className="text-lg md:text-2xl font-bold text-amber-400 leading-none text-right md:text-left">{cbSoonCount}</div><div className="text-[9px] md:text-[10px] text-amber-200/70 mt-0.5 md:mt-0 text-right md:text-left">提醒</div></div>
                                  </div>
                              </div>
                              
                              {/* ★ 右側清單：加入 min-w-0 防止被內部文字撐破 */}
                              <div className="hidden md:block flex-1 min-w-0">
                                  <AlertList items={cbAlerts} onItemClick={(item:any) => { setActiveTab('cross_border'); setActiveCbVehicleId(item.id); }} />
                              </div>
                              <button className="md:hidden absolute inset-0 z-10" onClick={() => setActiveTab('cross_border')}></button>
                          </div>

                          {/* 2. 文件/牌費提醒卡片 */}
                          <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-2 md:p-3 text-white shadow-sm flex flex-col md:flex-row gap-2 md:gap-3 relative overflow-hidden">
                              {/* ★ 左側：桌面版固定闊度防壓縮 (flex-shrink-0) */}
                              <div className="w-full md:w-32 flex-shrink-0 md:border-r border-white/10 pr-0 md:pr-3 flex flex-col justify-center">
                                  <div className="font-bold mb-1 md:mb-3 flex items-center text-[10px] md:text-sm text-blue-200 whitespace-nowrap">
                                      <Database size={12} className="mr-1 md:mr-1.5"/> 文件/牌費
                                  </div>
                                  <div className="flex justify-between md:block">
                                      <div><div className="text-lg md:text-2xl font-bold text-red-400 leading-none">{docExpiredCount}</div><div className="text-[9px] md:text-[10px] text-red-200/70 mt-0.5 md:mt-0">過期</div></div>
                                      <div><div className="text-lg md:text-2xl font-bold text-amber-400 leading-none text-right md:text-left">{docSoonCount}</div><div className="text-[9px] md:text-[10px] text-amber-200/70 mt-0.5 md:mt-0 text-right md:text-left">提醒</div></div>
                                  </div>
                              </div>
                              
                              {/* ★ 右側清單：加入 min-w-0 防止被內部文字撐破 */}
                              <div className="hidden md:block flex-1 min-w-0">
                                  <AlertList items={docAlerts} onItemClick={(item:any) => { 
                                      if (item.source === 'vehicle') { setActiveTab('inventory'); setEditingVehicle(item.raw); } 
                                      else { setActiveTab('database'); setEditingEntry(item.raw); setIsDbEditing(true); }
                                  }} />
                              </div>
                              <button className="md:hidden absolute inset-0 z-10" onClick={() => setActiveTab('database')}></button>
                          </div>

                      </div>
                  );
              })()}
              
              {/* 3. 業務儀表板：左右雙軌戰情室 (Sales Focus vs Ops Focus) */}
              {(() => {
                  const sortedList = [...visibleInventory].sort((a,b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));

                  // ★ 分流 1：在庫可售車輛 (焦點：銷售推廣)
                  const inStockCars = sortedList.filter(c => c.status === 'In Stock');

                  // ★ 分流 2：已訂 / 待結清 / 待代辦車輛 (焦點：跟進與收款)
                  const actionCars = sortedList.filter(c => {
                      if (c.status === 'Reserved') return true;
                      if (c.status === 'Sold') {
                          // ★ 核心修復：全面對齊最新的收支計算邏輯
                          const received = (c.payments || []).reduce((acc:any, p:any) => acc + (Number(p.amount) || 0), 0);
                          
                          const cbFees = (c.crossBorder?.tasks || []).reduce((sum:any, t:any) => sum + (Number(t.fee) || 0), 0);
                          // 修正 1：正確扣除「贈送」的對客附加費
                          const salesAddonsTotal = ((c as any).salesAddons || []).reduce((sum: number, a: any) => sum + (a.isFree ? 0 : (Number(a.amount) || 0)), 0);
                          // 修正 2：加入未找數的維修對客收費
                          const maintCharge = (c.maintenanceRecords || []).reduce((sum: number, m: any) => sum + (m.chargeStatus !== 'Paid' ? (Number(m.charge) || 0) : 0), 0);
                          
                          const totalReceivable = (Number(c.price) || 0) + salesAddonsTotal + maintCharge;
                          const balance = totalReceivable - received;
                          
                          const unpaidExps = (c.expenses || []).filter((e:any) => e.status === 'Unpaid').length;
                          const unpaidMaint = (c.maintenanceRecords || []).filter((m:any) => m.costStatus === 'Unpaid' && Number(m.cost) > 0).length;
                          
                          // 修正 3：精準判斷中港代辦是否已付 (改用關聯付款 ID 檢查)
                          const pendingCb = (c.crossBorder?.tasks || []).filter((t:any) => (Number(t.fee) > 0) && !(c.payments || []).some((p:any) => p.relatedTaskId === t.id)).length;
                          
                          const totalExpenses = (c.expenses || []).reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
                          const baseAcqCost = (Number(c.costPrice) || 0) - totalExpenses;
                          const acqPaid = (c.acquisition?.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
                          const acqOffset = Number(c.acquisition?.offsetAmount || 0);
                          const acqBalance = baseAcqCost - acqPaid - acqOffset;

                          // 只要還有欠款、未付成本雜費、未完成的中港任務，就留在待處理區 (> 1 避免浮點數誤差)
                          return balance > 1 || unpaidExps > 0 || unpaidMaint > 0 || pendingCb > 0 || acqBalance > 1;
                      }
                      return false;
                  });

                  // ★★★ 新增：為儀表板兩個區塊加上即時搜尋過濾器 ★★★
                  const filteredInStockCars = inStockCars.filter(car => 
                      !dashSearchInStock || 
                      (car.regMark || '').toLowerCase().includes(dashSearchInStock.toLowerCase()) ||
                      (car.make || '').toLowerCase().includes(dashSearchInStock.toLowerCase()) ||
                      (car.model || '').toLowerCase().includes(dashSearchInStock.toLowerCase())
                  );

                  const filteredActionCars = actionCars.filter(car => 
                      !dashSearchAction || 
                      (car.regMark || '').toLowerCase().includes(dashSearchAction.toLowerCase()) ||
                      (car.make || '').toLowerCase().includes(dashSearchAction.toLowerCase()) ||
                      (car.model || '').toLowerCase().includes(dashSearchAction.toLowerCase())
                  );
             
                  // 計算庫存天數
                  const getInventoryAging = (car: any) => {
                      if (!car.stockInDate) return null;
                      const start = new Date(car.stockInDate).getTime();
                      let end = new Date().getTime();
                      let prefix = car.status === 'Sold' ? '售出耗時' : '在庫';
                      if (car.status === 'Sold') {
                          if (!car.stockOutDate) return null;
                          end = new Date(car.stockOutDate).getTime();
                      }
                      const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
                      if (days < 30) return null;
                      
                      if (days >= 365) return { label: `${prefix} 1年+`, style: 'bg-black text-red-500 animate-pulse' };
                      if (days >= 270) return { label: `${prefix} 9個月+`, style: 'bg-red-800 text-white' };
                      if (days >= 180) return { label: `${prefix} 6個月+`, style: 'bg-red-600 text-white' };
                      if (days >= 90) return { label: `${prefix} 3個月+`, style: 'bg-orange-500 text-white' };
                      if (days >= 30) return { label: `${prefix} 1個月+`, style: 'bg-yellow-500 text-white' };
                      return null;
                  };

                  // 提取共用的精緻卡片渲染邏輯
                  const renderDashboardCard = (car: any) => {
                    // ★ 核心修復：讓卡片上的標籤也完美對齊最新邏輯
                    const received = (car.payments || []).reduce((acc:any, p:any) => acc + (Number(p.amount) || 0), 0);
                    const salesAddonsTotal = ((car as any).salesAddons || []).reduce((sum: number, a: any) => sum + (a.isFree ? 0 : (Number(a.amount) || 0)), 0);
                    const maintCharge = (car.maintenanceRecords || []).reduce((sum: number, m: any) => sum + (m.chargeStatus !== 'Paid' ? (Number(m.charge) || 0) : 0), 0);
                    
                    const totalReceivable = (Number(car.price) || 0) + salesAddonsTotal + maintCharge;
                    
                    // ★ 新增：計算獨立的「中港未繳費」總額，準備顯示在卡片右下角標籤
                    const pendingCbTasks = (car.crossBorder?.tasks || []).filter((t:any) => (Number(t.fee) > 0) && !(car.payments || []).some((p:any) => p.relatedTaskId === t.id));
                    const pendingCbTotal = pendingCbTasks.reduce((sum: number, t: any) => sum + Number(t.fee), 0);
                    const balance = totalReceivable - received;
                    
                    // ★ 升級：精準計算所有「未找數」的維修與雜費成本總金額
                    const unpaidExpsAmt = (car.expenses || []).reduce((sum: number, e: any) => sum + (e.status === 'Unpaid' ? (Number(e.amount) || 0) : 0), 0);
                    const unpaidMaintAmt = (car.maintenanceRecords || []).reduce((sum: number, m: any) => sum + (m.costStatus === 'Unpaid' ? (Number(m.cost) || 0) : 0), 0);
                    const totalUnpaidAmount = unpaidExpsAmt + unpaidMaintAmt;

                    // ★★★ 計算海外訂車的到港天數 ★★★
                    let daysToArrive: number | null = null;
                    let isArrived = false;
                    let hasValidEta = false;
                    
                    const etaDate = car.eta || car.arrivalDate || car.acquisition?.eta || car.acquisition?.arrivalDate || (car as any).logistics?.eta; 

                    if (etaDate) {
                        const arr = new Date(etaDate);
                        if (!isNaN(arr.getTime())) { 
                            hasValidEta = true;
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            arr.setHours(0, 0, 0, 0); 
                            
                            const diff = arr.getTime() - today.getTime();
                            daysToArrive = Math.ceil(diff / (1000 * 60 * 60 * 24));
                            
                            if (daysToArrive <= 0) {
                                isArrived = true; 
                            }
                        }
                    }

                    const baseThumbUrl = primaryImages[car.id] || (car.photos && car.photos.length > 0 ? car.photos[0] : null);
                    const isOneForOne = (car as any).acquisition?.vendor?.includes('一換一');
                    const oneForOnePlaceholder = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%231e3a8a'/%3E%3Ctext x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' font-weight='bold' fill='%23ffffff'%3E一換一 QUOTA%3C/text%3E%3Ctext x='50%25' y='60%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%2393c5fd'%3EEV Replacement Scheme%3C/text%3E%3C/svg%3E";
                    const thumbUrl = baseThumbUrl || (isOneForOne ? oneForOnePlaceholder : null);
                    const aging = getInventoryAging(car);

                    let statusText = '在庫';
                    let dotColor = "bg-green-500";
                    if (car.status === 'Reserved') { statusText = '已訂'; dotColor = "bg-yellow-500"; }
                    else if (car.status === 'Sold') { statusText = '已售'; dotColor = "bg-blue-600"; }

                    let isLicenseExpired = false;
                    if (car.licenseExpiry) {
                        const expiry = new Date(car.licenseExpiry);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0); 
                        if (expiry < today) {
                            isLicenseExpired = true;
                        }
                    }

                    const cbTags = [];
                    const ports = car.crossBorder?.ports || [];
                    if (car.crossBorder?.isEnabled || car.crossBorder?.mainlandPlate) {
                        if (ports.some((p:string) => ['皇崗', '深圳灣', '蓮塘', '沙頭角', '文錦渡', '港珠澳大橋(港)'].includes(p))) cbTags.push({ label: '粵港', color: 'bg-indigo-600' });
                        if (ports.some((p:string) => ['港珠澳大橋(澳)', '關閘(拱北)', '橫琴', '青茂'].includes(p))) cbTags.push({ label: '粵澳', color: 'bg-emerald-600' });
                        if (cbTags.length === 0) cbTags.push({ label: '中港', color: 'bg-slate-700' });
                    }

                    // ★ 升級：加入座位數、中文排檔
                    const specs = [];
                    if (car.previousOwners !== undefined && car.previousOwners !== '') specs.push(`${car.previousOwners}手`);
                    if (car.seating) specs.push(`${car.seating}座`); 
                    if (car.transmission) specs.push(car.transmission === 'Manual' ? '手波' : '自動波'); 
                    if (car.engineSize) specs.push(`${car.engineSize}${car.fuelType === 'Electric' ? 'Kw' : 'cc'}`);
                    if (car.colorExt) specs.push(car.colorExt.split(' ')[0].replace(/[()]/g, '')); 
                    if (car.mileage) specs.push(`${Number(car.mileage).toLocaleString()}km`);

                    return (
                        <div key={car.id} onClick={() => setEditingVehicle(car)} className="flex w-full box-border overflow-hidden bg-white p-2.5 md:p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group relative">
                            
                            {/* 左側：改用 object-cover 自動適應放大，完美去邊框 */}
                            <div className="w-28 md:w-32 aspect-[4/3] rounded-lg overflow-hidden relative flex-shrink-0 bg-slate-100 border border-slate-200/50 shadow-inner">
                                {thumbUrl ? (
                                    <img src={thumbUrl} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Car" loading="lazy" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50"><Car size={20}/><span className="text-[8px] mt-1">No Img</span></div>
                                )}
                                
                                {/* ★ 潮流升級：玻璃透視 + 圓點呼吸燈狀態標籤 */}
                                <div className="absolute top-1.5 left-1.5 z-20 flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded-md shadow-sm border border-white/50 w-fit">
                                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shadow-[0_0_4px_currentColor]`}></span>
                                        <span className="text-[9px] font-black text-slate-800 leading-none pt-px">{statusText}</span>
                                    </div>
                                    {aging && <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold shadow-sm ${aging.style}`}>{aging.label}</span>}
                                </div>
                            </div>

                            {/* 右側：高密度資訊區 */}
                            <div className="ml-2.5 flex-1 min-w-0 flex flex-col justify-between py-0.5 relative">
                                
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setShareCleanMode(false); setShareVehicle(car); }} 
                                    className="absolute -top-1 -right-1 p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all z-10"
                                    title="產生對客推介單"
                                >
                                    <Share2 size={14}/>
                                </button>

                                <div className="w-full pr-6">
                                    {/* 標題單行截斷 */}
                                    <div className="font-bold text-[13px] md:text-sm text-slate-800 leading-tight truncate w-full mb-1">
                                        {car.year} {car.make} {car.model}
                                    </div>
                                    
                                    {/* 車牌與中港標籤同行 (高密度) */}
                                    <div className="flex flex-wrap items-center gap-1.5 w-full mb-1.5">
                                        <span className="bg-[#FFD600] text-black border border-black font-black font-mono text-[9px] px-1.5 py-0.5 rounded-[2px] shadow-sm leading-none flex-shrink-0">
                                            {car.regMark || '未出牌'}
                                        </span>
                                        {car.crossBorder?.mainlandPlate && (
                                            <span className={`${car.crossBorder.mainlandPlate.startsWith('粵Z') ? 'bg-black text-white border-white' : 'bg-[#003399] text-white border-white'} border font-bold font-mono text-[8px] px-1.5 py-0.5 rounded-[2px] shadow-sm leading-none flex-shrink-0`}>
                                                {car.crossBorder.mainlandPlate}
                                            </span>
                                        )}
                                        {cbTags.map((t:any,i:number) => <span key={i} className={`text-[8px] text-white px-1 py-[1px] rounded-[2px] shadow-sm font-bold leading-none flex-shrink-0 ${t.color}`}>{t.label}</span>)}
                                    </div>

                                    {/* 規格字串 */}
                                    {specs.length > 0 && (
                                        <div className="text-[9px] text-slate-500 font-medium leading-none truncate w-full mb-1.5">
                                            {specs.join(' • ')}
                                        </div>
                                    )}

                                    {/* 牌費標籤 */}
                                    {car.licenseExpiry && (
                                        <div className="flex w-full">
                                            <span className={`text-[8px] px-1.5 py-[2px] rounded-[3px] shadow-sm font-mono flex items-center border leading-none ${
                                                isLicenseExpired 
                                                ? 'text-red-600 bg-red-50 border-red-200' 
                                                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                            }`}>
                                                <Calendar size={8} className="mr-0.5 opacity-70"/>牌費: {car.licenseExpiry}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* 底部財務與物流區 */}
                                <div className="flex flex-wrap justify-between items-end mt-1.5 pt-1.5 border-t border-slate-50 w-full gap-x-1 gap-y-1.5">
                                    <div className="font-black text-[15px] md:text-base text-slate-800 tracking-tight whitespace-nowrap leading-none mb-0.5">
                                        {formatCurrency(car.price)}
                                    </div>
                                    
                                    <div className="flex flex-col gap-1 items-end min-w-0 ml-auto">
                                        
                                        {/* 第一排：物流 與 已收狀態 */}
                                        {(hasValidEta || received > 0) && (
                                            <div className="flex flex-wrap justify-end items-center gap-1">
                                                {received > 0 && balance > 0 && (
                                                    <span className="text-[8px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-[2px] rounded-[3px] leading-none font-bold whitespace-nowrap">
                                                        有訂 / 部份已付
                                                    </span>
                                                )}
                                                {hasValidEta && (
                                                    <span className={`text-[8px] px-1.5 py-[2px] rounded-[3px] leading-none flex items-center shadow-sm border whitespace-nowrap font-bold ${
                                                        isArrived 
                                                        ? 'text-green-600 bg-green-50 border-green-200' 
                                                        : 'text-indigo-600 bg-indigo-50 border-indigo-200'
                                                    }`}>
                                                        <Ship size={8} className="mr-0.5 opacity-80"/>{isArrived ? '已到港' : `剩${daysToArrive}天`}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* 第二排：所有未清尾數統整 (絕對不會重複) */}
                                        <div className="flex flex-wrap justify-end items-center gap-1">
                                            
                                            {/* 1. 欠行家/供應商車價 (紅色) */}
                                            {(() => {
                                                const totalExpenses = (car.expenses || []).reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
                                                const baseAcqCost = (car.costPrice || 0) - totalExpenses;
                                                
                                                const acqPaid = (car.acquisition?.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
                                                const acqOffset = Number(car.acquisition?.offsetAmount || 0);
                                                
                                                const acqBalance = baseAcqCost - acqPaid - acqOffset;
                                                if (acqBalance > 1) {
                                                    return (
                                                        <span className="text-[9px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-[2px] rounded-[3px] leading-none flex items-center shadow-sm whitespace-nowrap font-bold">
                                                            欠車價 <span className="font-mono ml-1">{formatCurrency(acqBalance)}</span>
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {/* 2. 欠車房雜費與成本 (橘色) */}
                                            {totalUnpaidAmount > 0 && (
                                                <span className="text-[10px] text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-[2px] rounded-[3px] leading-none flex items-center shadow-sm whitespace-nowrap font-bold">
                                                    <span className="mr-1 opacity-80 text-[8px] font-sans">未付成本</span>
                                                    <span className="font-mono">{formatCurrency(totalUnpaidAmount)}</span>
                                                </span>
                                            )}
                                            
                                            {/* ★ 新增：中港待收獨立標籤 (紫色) */}
                                            {pendingCbTotal > 0 && (
                                                <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-[2px] rounded-[3px] leading-none flex items-center shadow-sm whitespace-nowrap font-bold">
                                                    <span className="mr-1 opacity-80 text-[8px] font-sans">中港待收</span>
                                                    <span className="font-mono">{formatCurrency(pendingCbTotal)}</span>
                                                </span>
                                            )}
                                            {/* 3. 客戶欠款待收 (藍色) */}
                                            {balance > 0 && (
                                                <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-[2px] rounded-[3px] leading-none flex items-center shadow-sm whitespace-nowrap font-bold">
                                                    <span className="mr-1 opacity-80 text-[8px] font-sans">車款待收</span>
                                                    <span className="font-mono">{formatCurrency(balance)}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                };

                  return (
                      <div className="flex flex-col flex-1 min-h-0 overflow-hidden mt-0 md:mt-2 -mx-4 md:mx-0 bg-slate-100 md:bg-transparent">
                          
                          {/* ★ 創新方式：手機版專屬「浮動分頁按鈕」，釋放 100% 垂直空間！ */}
                          <div className="md:hidden flex p-1.5 bg-slate-200/60 rounded-xl mx-4 mt-2 mb-2">
                              <button 
                                  onClick={() => setDashMobileTab('instock')}
                                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex justify-center items-center gap-1.5 ${dashMobileTab === 'instock' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500'}`}
                              >
                                  在庫待售
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${dashMobileTab === 'instock' ? 'bg-green-100 text-green-700' : 'bg-slate-300 text-slate-500'}`}>{inStockCars.length}</span>
                              </button>
                              <button 
                                  onClick={() => setDashMobileTab('action')}
                                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex justify-center items-center gap-1.5 ${dashMobileTab === 'action' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}
                              >
                                  已訂/待結清
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${dashMobileTab === 'action' ? 'bg-amber-100 text-amber-700' : 'bg-slate-300 text-slate-500'}`}>{actionCars.length}</span>
                              </button>
                          </div>

                         {/* ========================================================= */}
                          {/* ★★★ 桌面版專屬：完美融合的全局懸浮搜尋列 ★★★ */}
                          {/* ========================================================= */}
                          <div className="hidden md:flex w-full mb-3 px-1 z-10 flex-none animate-fade-in">
                              <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-slate-200/80 p-1.5 flex items-center transition-all focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 focus-within:shadow-md hover:bg-white w-full group">
                                  <div className="pl-4 pr-3 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                      <Search size={18} />
                                  </div>
                                  <input 
                                      type="text"
                                      placeholder="全域搜尋：請輸入廠牌、型號、車牌或關鍵字..."
                                      value={dashSearchInStock} 
                                      onChange={(e) => {
                                          setDashSearchInStock(e.target.value);
                                          setDashSearchAction(e.target.value); // ★ 雙邊同步篩選
                                      }}
                                      className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder-slate-400 font-bold px-2 py-2 text-sm w-full"
                                  />
                                  {dashSearchInStock && (
                                      <button onClick={() => { setDashSearchInStock(''); setDashSearchAction(''); }} className="pr-4 text-slate-400 hover:text-slate-600 transition-colors">
                                          <X size={16} />
                                      </button>
                                  )}
                                  <div className="hidden md:flex pr-1.5 gap-2 border-l border-slate-200 pl-3">
                                      <button onClick={() => setActiveTab('inventory')} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all border border-slate-200 shadow-sm active:scale-95 flex items-center gap-1.5">
                                          <Car size={14} className="text-slate-500" />
                                          完整庫存
                                      </button>
                                      <button onClick={() => {setEditingVehicle({} as any); setActiveTab('inventory_add');}} className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all border border-blue-200 shadow-sm active:scale-95 flex items-center gap-1.5">
                                          <Plus size={14} />
                                          新增入庫
                                      </button>
                                  </div>
                              </div>
                          </div>

                          {/* ========================================================= */}
                          {/* ★★★ 智慧控管：有兜圈警報時才橫空出世的看板 (無事隱形) ★★★ */}
                          {/* ========================================================= */}
                          {loopReminders.length > 0 && (
                              <div className="w-full mb-4 px-4 md:px-1 animate-fade-in z-10 flex-none">
                                  <div className="bg-gradient-to-r from-amber-50 to-red-50 border-2 border-amber-200/70 rounded-2xl shadow-sm p-4">
                                      <div className="flex items-center gap-2 mb-3">
                                          <div className="bg-amber-500 text-white p-1.5 rounded-lg shadow-sm">
                                              <RefreshCw size={16} className="animate-spin-slow" />
                                          </div>
                                          <h4 className="text-sm font-black text-slate-800 tracking-wide">
                                              🚨 中港車強制「兜圈」逾期預警中心 
                                              <span className="ml-2 text-xs text-amber-700 font-bold bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                                                  共有 {loopReminders.length} 台車即將到期
                                              </span>
                                          </h4>
                                      </div>
                                      
                                      {/* 警報車輛網格列表 */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                          {loopReminders.map((car: any) => {
                                              const isUrgent = car.diffDays <= 14; // 14天內列為紅色緊急
                                              return (
                                                  <div 
                                                      key={car.id} 
                                                      className={`p-3 rounded-xl border bg-white flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group
                                                          ${isUrgent ? 'border-red-300 ring-1 ring-red-100' : 'border-amber-200'}`}
                                                  >
                                                      {/* 背景緊急微色塊 */}
                                                      {isUrgent && <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-bl-full pointer-events-none"></div>}
                                                      
                                                      <div>
                                                          <div className="flex justify-between items-start">
                                                              <span className="font-black text-slate-800 text-sm">{car.regMark || '未出牌'}</span>
                                                              <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full font-mono border
                                                                  ${isUrgent ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-amber-50 text-amber-600 border-amber-200'}`}
                                                              >
                                                                  {car.diffDays < 0 ? `已逾期 ${Math.abs(car.diffDays)} 天` : car.diffDays === 0 ? '今日到期！' : `剩 ${car.diffDays} 天`}
                                                                </span>
                                                          </div>
                                                          <div className="text-xs font-bold text-slate-600 mt-1">
                                                              {car.year} {car.make} {car.model}
                                                          </div>
                                                          <div className="text-[11px] text-slate-500 mt-2 flex flex-col gap-0.5 font-mono">
                                                              <div>最後出境：{car.lastOutboundDate || car.crossBorder?.lastOutboundDate}</div>
                                                              <div className={isUrgent ? 'text-red-500 font-bold' : ''}>強制死線：{car.deadlineStr}</div>
                                                          </div>
                                                      </div>
                                                      
                                                      {/* 快速打卡重置按鈕 */}
                                                      <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                                                          <button 
                                                              onClick={async () => {
                                                                  if (!confirm(`確定這台車 [${car.regMark || '未出牌'}] 已成功回港打卡（重置兜圈時間）嗎？`)) return;
                                                                  try {
                                                                      // ★ 核心邏輯修正：司機回港，直接清空出境日期，徹底停止倒數計時！
                                                                      await updateDoc(doc(db!, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory', car.id), {
                                                                          lastOutboundDate: ''
                                                                      });
                                                                      alert('✅ 司機已回港！警報已解除，並停止兜圈計時。');
                                                                  } catch (err) {
                                                                      alert('更新失敗，請稍後再試');
                                                                  }
                                                              }}
                                                              className={`w-full py-1.5 text-xs font-black rounded-lg border transition-all flex items-center justify-center gap-1.5
                                                                  ${isUrgent ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                                          >
                                                              <Check size={14} /> 已回港 (解除警報)
                                                          </button>
                                                      </div>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              </div>
                          )}

                          <div className="flex flex-col lg:flex-row gap-0 lg:gap-5 flex-1 min-h-0 overflow-hidden">
                              
                              {/* 左側看板：在庫優先 */}
                              <div className={`flex-1 flex-col bg-transparent md:bg-white md:rounded-2xl border-0 md:border border-slate-200/60 md:shadow-sm overflow-hidden min-h-0 relative ${dashMobileTab === 'instock' ? 'flex' : 'hidden md:flex'}`}>
                                  {/* 標題與懸浮搜尋列 (手機點擊覆蓋 / 桌面 Hover 顯示) */}
                                  <div className="flex p-3 border-b border-slate-100 bg-white justify-between items-center flex-none z-10 md:group cursor-pointer hover:bg-slate-50 transition-colors relative">
                                      <h3 className="font-bold text-slate-700 flex items-center text-sm tracking-wide flex-none">
                                          <Layout size={16} className="mr-1.5 text-green-500" /> 在庫待售
                                      </h3>
                                      
                                      {/* ★ 手機專用：隱藏在右側的魔法搜尋框 (桌面版已改用上方全局搜尋) */}
                                      <div className="absolute right-16 left-2 md:hidden flex justify-end z-20">
                                          <div className={`relative flex items-center justify-end transition-all duration-300 ${dashSearchInStock ? 'w-full' : 'w-8'} focus-within:w-full`}>
                                              <Search size={14} className={`absolute left-2.5 text-slate-500 pointer-events-none transition-opacity z-10 ${dashSearchInStock ? 'opacity-0' : 'opacity-100'}`} />
                                              <input 
                                                  type="text" 
                                                  value={dashSearchInStock}
                                                  onChange={(e) => {
                                                      setDashSearchInStock(e.target.value);
                                                      setDashSearchAction(e.target.value); // 手機版也同步
                                                  }}
                                                  placeholder="搜尋車牌、廠型..." 
                                                  className={`w-full h-8 pl-8 pr-6 rounded-full text-xs outline-none focus:ring-1 focus:ring-green-100 transition-all cursor-pointer focus:cursor-text relative z-0 border ${dashSearchInStock ? 'opacity-100 bg-white border-green-400 text-slate-700 placeholder-slate-400 shadow-sm' : 'opacity-0 bg-transparent border-transparent text-transparent placeholder-transparent focus:bg-white focus:border-green-400 focus:text-slate-700 focus:placeholder-slate-400 focus:shadow-sm'}`}
                                              />
                                              {dashSearchInStock && <button onClick={(e) => { e.preventDefault(); setDashSearchInStock(''); setDashSearchAction(''); }} className="absolute right-2.5 text-slate-400 hover:text-slate-600 z-10"><X size={12} /></button>}
                                          </div>
                                      </div>

                                      <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-0.5 rounded-full shadow-sm text-xs font-black font-mono tracking-wider flex-none relative z-10">
                                          {filteredInStockCars.length} 台
                                      </div>
                                  </div>
                                  
                                  {/* ★ 移除死板的 pb-20，改用 env() 讓內容穿透到螢幕最底，並保護最後一張卡片不被 Home 橫條蓋住 */}
                                  <div className="flex-1 overflow-y-auto px-4 md:px-3 pb-[calc(2rem+env(safe-area-inset-bottom))] md:pb-3 space-y-2.5 bg-transparent md:bg-slate-50/30 scrollbar-thin relative z-0">
                                      {filteredInStockCars.map(car => renderDashboardCard(car))}
                                      {filteredInStockCars.length === 0 && (
                                          <div className="text-center py-10 text-slate-400 text-xs">
                                              {dashSearchInStock ? '找不到符合的車輛' : '目前無在庫車輛'}
                                          </div>
                                      )}
                                  </div>
                              </div>

                              {/* 右側看板：已訂 / 待跟進 */}
                              <div className={`flex-1 flex-col bg-transparent md:bg-white md:rounded-2xl border-0 md:border border-slate-200/60 md:shadow-sm overflow-hidden min-h-0 relative ${dashMobileTab === 'action' ? 'flex' : 'hidden md:flex'}`}>
                                  {/* 標題與懸浮搜尋列 (手機點擊覆蓋 / 桌面 Hover 顯示) */}
                                  <div className="flex p-3 border-b border-slate-100 bg-white justify-between items-center flex-none z-10 md:group cursor-pointer hover:bg-slate-50 transition-colors relative">
                                      <h3 className="font-bold text-slate-700 flex items-center text-sm tracking-wide flex-none">
                                          <FileCheck size={16} className="mr-1.5 text-amber-500" /> 已訂與待結清
                                      </h3>
                                      
                                      {/* ★ 手機專用：隱藏在右側的魔法搜尋框 (桌面版已改用上方全局搜尋) */}
                                      <div className="absolute right-16 left-2 md:hidden flex justify-end z-20">
                                          <div className={`relative flex items-center justify-end transition-all duration-300 ${dashSearchAction ? 'w-full' : 'w-8'} focus-within:w-full`}>
                                              <Search size={14} className={`absolute left-2.5 text-slate-500 pointer-events-none transition-opacity z-10 ${dashSearchAction ? 'opacity-0' : 'opacity-100'}`} />
                                              <input 
                                                  type="text" 
                                                  value={dashSearchAction}
                                                  onChange={(e) => {
                                                      setDashSearchAction(e.target.value);
                                                      setDashSearchInStock(e.target.value); // 手機版也同步
                                                  }}
                                                  placeholder="搜尋車牌、廠型..." 
                                                  className={`w-full h-8 pl-8 pr-6 rounded-full text-xs outline-none focus:ring-1 focus:ring-amber-100 transition-all cursor-pointer focus:cursor-text relative z-0 border ${dashSearchAction ? 'opacity-100 bg-white border-amber-400 text-slate-700 placeholder-slate-400 shadow-sm' : 'opacity-0 bg-transparent border-transparent text-transparent placeholder-transparent focus:bg-white focus:border-amber-400 focus:text-slate-700 focus:placeholder-slate-400 focus:shadow-sm'}`}
                                              />
                                              {dashSearchAction && <button onClick={(e) => { e.preventDefault(); setDashSearchAction(''); setDashSearchInStock(''); }} className="absolute right-2.5 text-slate-400 hover:text-slate-600 z-10"><X size={12} /></button>}
                                          </div>
                                      </div>

                                      <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-0.5 rounded-full shadow-sm text-xs font-black font-mono tracking-wider flex-none relative z-10">
                                          {filteredActionCars.length} 台
                                      </div>
                                  </div>
                                  
                                  {/* ★ 移除死板的 pb-20，改用 env() 讓內容穿透到螢幕最底 */}
                                  <div className="flex-1 overflow-y-auto px-4 md:px-3 pb-[calc(2rem+env(safe-area-inset-bottom))] md:pb-3 space-y-2.5 bg-transparent md:bg-slate-50/30 scrollbar-thin relative z-0">
                                      {filteredActionCars.map(car => renderDashboardCard(car))}
                                      {filteredActionCars.length === 0 && (
                                          <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center">
                                              {dashSearchAction ? (
                                                  <span className="mt-2">找不到符合的車輛</span>
                                              ) : (
                                                  <>
                                                      <CheckCircle size={32} className="mb-2 text-green-400 opacity-50" />
                                                      <span className="mt-2">所有交易皆已完美結清</span>
                                                  </>
                                              )}
                                          </div>
                                      )}
                                  </div>
                              </div>

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
              <div className="flex flex-col sm:flex-row gap-3 overflow-x-auto pb-3 flex-none scrollbar-hide items-start sm:items-center">
                  {/* ★ 新增：自家 / 行家 快速切換器 */}
                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
                      <button onClick={() => setFilterSource('All')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filterSource === 'All' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>全部</button>
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
                        <div key={car.id} className={`bg-white rounded-2xl shadow-sm border-2 transition-all duration-300 group flex flex-col overflow-hidden cursor-pointer relative ${isPartner ? 'border-orange-200 hover:border-orange-400 hover:shadow-orange-100' : 'border-slate-200 hover:border-yellow-400 hover:shadow-xl'}`} onClick={() => setEditingVehicle(car)}>
                            
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

                            {/* 下半部：車輛資訊 (垂直排版) */}
                            <div className="p-4 flex-1 flex flex-col bg-white">
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
                                    <div className="text-[10px]">
                                        {car.licenseExpiry ? (() => {
                                            const isExp = new Date(car.licenseExpiry) < new Date();
                                            return <span className={`px-2 py-1 rounded-md font-bold ${isExp?'bg-red-50 text-red-600':'bg-slate-50 text-slate-500 border border-slate-100'}`}>牌費: {car.licenseExpiry} {isExp&&'!'}</span>;
                                        })() : <span className="text-gray-300">-</span>}
                                    </div>
                                    <div className="flex gap-2">
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

         </div>       
      </main>

      {/* ★★★ 新增：右下角全域懸浮按鈕 (FAB) ★★★ */}
      {staffId && (
          <button 
              onClick={() => setIsTeamHubOpen(true)}
              className="fixed bottom-6 right-6 z-[9000] w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95 group"
              title="打開團隊協作中心"
          >
              <MessageCircle size={24} className="group-hover:animate-pulse"/>
              {/* 這裡可以做一個小紅點提示，目前先放靜態裝飾 */}
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
          </button>
      )}

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
