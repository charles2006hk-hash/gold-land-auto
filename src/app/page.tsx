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
    
    // ★★★ 效能大升級：啟用 Firestore 本地永久快取 ★★★
    try {
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        });
    } catch (e) {
        // 如果瀏覽器唔支援快取 (例如無痕模式)，就降級用普通版
        db = getFirestore(app);
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
                        {/* ★ 新增了修改密碼(Key)按鈕 */}
                        <div className="flex items-center gap-1">
                            <button onClick={onOpenChangePwd} className="text-slate-400 hover:text-yellow-400 transition p-1.5 hover:bg-slate-800 rounded" title="修改密碼"><Key size={14} /></button>
                            <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition p-1.5 hover:bg-slate-800 rounded" title="登出"><LogOut size={14} /></button>
                        </div>
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

// ------------------------------------------------------------------
// ★★★ 新增：A4 智能證件排版與列印 (終極修復：獨立視窗列印法) ★★★
// ------------------------------------------------------------------
const A4DocumentPrinter = ({ selectedItems, onClose }: any) => {
    const [images, setImages] = useState(
        selectedItems.map((item: any, index: number) => ({
            id: item.id,
            url: item.url,
            x: 60,
            y: 40 + (index * 80),
            width: 85.6,
            height: 54
        }))
    );

    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    const handlePointerDown = (e: any, id: string) => {
        setDraggingId(id);
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        setStartPos({ x: clientX, y: clientY });
    };

    const handlePointerMove = (e: any) => {
        if (!draggingId) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const dx = (clientX - startPos.x) * 0.28; 
        const dy = (clientY - startPos.y) * 0.28;
        setImages(images.map((img: any) => img.id === draggingId ? { ...img, x: img.x + dx, y: img.y + dy } : img));
        setStartPos({ x: clientX, y: clientY });
    };

    const handlePointerUp = () => setDraggingId(null);

    useEffect(() => {
        if (draggingId) {
            window.addEventListener('mousemove', handlePointerMove);
            window.addEventListener('mouseup', handlePointerUp);
            window.addEventListener('touchmove', handlePointerMove, { passive: false });
            window.addEventListener('touchend', handlePointerUp);
        }
        return () => {
            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('mouseup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
        };
    }, [draggingId, startPos]);

    const applyTemplate = (type: 'id_card' | 'a4_full') => {
        setImages(images.map((img: any, index: number) => {
            if (type === 'id_card') return { ...img, width: 85.6, height: 54, x: 62, y: 40 + (index * 70) };
            if (type === 'a4_full') return { ...img, width: 190, height: 270, x: 10, y: 10 };
            return img;
        }));
    };

    // ★★★ 終極解決方案：打開乾淨的獨立視窗來列印 (移除 script 標籤，解決編譯報錯) ★★★
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('請允許瀏覽器彈出視窗以進行列印');
            return;
        }

        const imagesHtml = images.map((img: any) => `
            <img src="${img.url}" style="position: absolute; left: ${img.x}mm; top: ${img.y}mm; width: ${img.width}mm; height: ${img.height}mm; object-fit: cover; border-radius: 2px; box-shadow: 0 0 2px rgba(0,0,0,0.2);" />
        `).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>A4 文件列印</title>
                <style>
                    @page { size: A4; margin: 0; }
                    body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .a4-page { position: relative; width: 210mm; height: 297mm; background: white; overflow: hidden; margin: 0; }
                </style>
            </head>
            <body>
                <div class="a4-page">
                    ${imagesHtml}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();

        // 使用 React 端的 setTimeout 觸發列印，徹底避開字串內寫 script 的問題
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            setTimeout(() => { printWindow.close(); }, 500);
        }, 500);
    };

    return (
        <div className="fixed inset-0 z-[250] bg-slate-900/95 flex flex-col md:flex-row overflow-hidden backdrop-blur-sm">
            <div className="w-full md:w-72 bg-slate-800 text-white p-5 flex flex-col gap-4 border-r border-slate-700 flex-none">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold flex items-center"><Printer size={18} className="mr-2 text-yellow-400"/> 智能排版輸出</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full"><X size={20}/></button>
                </div>

                <div className="bg-slate-900/50 p-3 rounded-lg text-xs text-slate-300 leading-relaxed mb-2">
                    💡 已選取 {images.length} 張圖片。<br/>
                    您可以直接在右側 A4 紙上「拖曳」圖片調整位置。
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-400 mb-2 block">快速套用尺寸模板</label>
                    <div className="flex flex-col gap-2">
                        <button onClick={() => applyTemplate('id_card')} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-sm text-left flex justify-between items-center transition shadow-sm">
                            <span>💳 標準證件 (1:1 大小)</span> <span className="text-[10px] text-slate-400">86x54mm</span>
                        </button>
                        <button onClick={() => applyTemplate('a4_full')} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-sm text-left flex justify-between items-center transition shadow-sm">
                            <span>📄 A4 滿版文件</span> <span className="text-[10px] text-slate-400">適應A4</span>
                        </button>
                    </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-700">
                    <button onClick={handlePrint} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center transition active:scale-95">
                        <Printer size={18} className="mr-2"/> 正式列印
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-gray-300 flex justify-center items-start pt-10 pb-20 relative select-none touch-none">
                <div id="a4-print-area" className="bg-white shadow-2xl relative overflow-hidden" style={{ width: '210mm', height: '297mm', transform: 'scale(0.85)', transformOrigin: 'top center' }}>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:10mm_10mm] pointer-events-none"></div>
                    {images.map((img: any) => (
                        <div key={img.id} style={{ position: 'absolute', left: `${img.x}mm`, top: `${img.y}mm`, width: `${img.width}mm`, height: `${img.height}mm`, zIndex: draggingId === img.id ? 10 : 1 }} className={`cursor-move transition-shadow ${draggingId === img.id ? 'ring-4 ring-blue-500 shadow-2xl' : 'shadow-md border border-gray-200 hover:ring-2 hover:ring-blue-300'}`} onMouseDown={(e) => handlePointerDown(e, img.id)} onTouchStart={(e) => { e.preventDefault(); handlePointerDown(e, img.id); }}>
                            <img src={img.url} className="w-full h-full object-cover pointer-events-none" draggable={false} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


const DatabaseModule = ({ db, staffId, appId, settings, editingEntry, setEditingEntry, isDbEditing, setIsDbEditing, inventory, currentUser, systemUsers }: DatabaseModuleProps) => {
    const [entries, setEntries] = useState<DatabaseEntry[]>([]);
    const [selectedCatFilter, setSelectedCatFilter] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [availableDocs, setAvailableDocs] = useState<any[]>([]);
    
    // 重複資料處理狀態
    const [dupeGroups, setDupeGroups] = useState<DatabaseEntry[][]>([]);
    const [showDupeModal, setShowDupeModal] = useState(false);

    // AI 識別狀態
    const [isScanning, setIsScanning] = useState(false);

    // ★★★ 新增：控制 A4 智能排版與圖片選取狀態 ★★★
    const [selectedForPrint, setSelectedForPrint] = useState<number[]>([]);
    const [showA4Printer, setShowA4Printer] = useState(false);
    // ★ 記錄每個車輛群組目前正在預覽的是哪一張小圖
    const [activeGroupImages, setActiveGroupImages] = useState<Record<string, string>>({});

    // 當切換不同客戶資料時，自動清空選取狀態
    useEffect(() => {
        setSelectedForPrint([]);
    }, [editingEntry?.id]);

    // ★★★ AI 識別函數 (升級版：支援直接讀取 URL) ★★★
    const analyzeImageWithAI = async (imageDataOrUrl: string, docType: string) => {
        setIsScanning(true);
        try {
            let base64ToSend = imageDataOrUrl;

            // ★ 如果傳入的是網址 (Firebase Storage URL)，我們先在前端把它下載並轉成 Base64 再傳給 AI
            if (imageDataOrUrl.startsWith('http')) {
                const res = await fetch(imageDataOrUrl);
                const blob = await res.blob();
                base64ToSend = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                }) as string;
            }

            const response = await fetch('/api/ocr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64ToSend, docType: docType })
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
                setEditingEntry((prev: any) => {
                    if (!prev) return null;

                    // ★ 數字清洗工具 (專門去除字串中的逗號)
                    const parseNum = (val: any) => {
                        if (val === undefined || val === null || val === '') return undefined;
                        if (typeof val === 'number') return val;
                        const clean = String(val).replace(/[^0-9.]/g, '');
                        return clean ? Number(clean) : undefined;
                    };

                    // ★★★ 終極防呆：從 AI 備註中強行搶救漏抓的資料 ★★★
                    let finalA1 = data.priceA1;
                    let finalTax = data.priceTax;
                    let finalColor = data.vehicleColor || data.color;

                    // 如果 AI 把資料塞進了備註 (description)，我們用 Regex 強行挖出來
                    if (data.description) {
                        if (!finalA1) {
                            const matchA1 = data.description.match(/(應課稅值|登記稅值|A1)[^\d]*([0-9,]+(\.\d+)?)/);
                            if (matchA1) finalA1 = matchA1[2];
                        }
                        if (!finalTax) {
                            const matchTax = data.description.match(/(已繳付|已繳稅)[^\d]*([0-9,]+(\.\d+)?)/);
                            if (matchTax) finalTax = matchTax[2];
                        }
                        if (!finalColor) {
                            const matchColor = data.description.match(/顏色[:：]?\s*([A-Za-z\u4e00-\u9fa5]+)/i);
                            if (matchColor) finalColor = matchColor[1];
                        }
                    }

                    // 1. 智能匹配文件類型
                    let matchedDocType = prev.docType;
                    const aiDocStr = (data.documentType || '').toLowerCase();
                    if (!matchedDocType || matchedDocType === '其他') {
                        if (aiDocStr.includes('保險') || aiDocStr.includes('insurance') || aiDocStr.includes('cover')) matchedDocType = '香港保險';
                        else if (aiDocStr.includes('br') || aiDocStr.includes('商業登記')) matchedDocType = '商業登記(BR)';
                        else matchedDocType = data.documentType;
                    }

                    const currentTags = Array.isArray(prev.tags) ? prev.tags : [];
                    const aiTags = Array.isArray(data.tags) ? data.tags : [];
                    const mergedTags = Array.from(new Set([...currentTags, ...aiTags, matchedDocType])).filter(Boolean);

                    // 處理動態 JSON 欄位 (給保險、BR等使用)
                    const newExtractedData = { ...(prev.extractedData || {}) };
                    if (data.insuranceCompany) newExtractedData.insuranceCompany = data.insuranceCompany;
                    if (data.policyNumber) newExtractedData.policyNumber = data.policyNumber;
                    if (data.insuranceType) newExtractedData.insuranceType = data.insuranceType;
                    if (data.insuredPerson) newExtractedData.insuredPerson = data.insuredPerson;
                    if (data.brNumber) newExtractedData.brNumber = data.brNumber;
                    if (data.brExpiryDate) newExtractedData.brExpiryDate = data.brExpiryDate;
                    if (data.natureOfBusiness) newExtractedData.natureOfBusiness = data.natureOfBusiness;

                    const finalName = data.name || data.registeredOwnerName || data.insuredPerson || prev.name;
                    const finalOwnerId = data.registeredOwnerId || data.idNumber || prev.registeredOwnerId;

                    // ★★★ 新增：計算座位數 (AI提取的乘客數 + 1 司機) ★★★
                    let finalSeating = prev.seating;
                    const aiSeatingRaw = data.seating ?? data.seatingCapacity;
                    if (aiSeatingRaw !== undefined) {
                        const parsedSeat = parseNum(aiSeatingRaw);
                        if (parsedSeat !== undefined) finalSeating = parsedSeat + 1;
                    }

                    return {
                        ...prev,
                        name: finalName, 
                        docType: matchedDocType, 
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
                        
                        // ★★★ 使用搶救回來的資料，並經過數字清洗 ★★★
                        vehicleColor: finalColor || prev.vehicleColor,
                        engineSize: parseNum(data.engineSize) ?? prev.engineSize,
                        priceA1: parseNum(finalA1) ?? prev.priceA1,
                        priceTax: parseNum(finalTax) ?? prev.priceTax,
                        prevOwners: parseNum(data.prevOwners) ?? prev.prevOwners,

                        registeredOwnerName: data.registeredOwnerName || prev.registeredOwnerName,
                        registeredOwnerId: finalOwnerId,
                        registeredOwnerDate: data.registeredOwnerDate || data.ownerRegDate || data.dateOfRegAsOwner || prev.registeredOwnerDate,

                        seating: finalSeating,
                        
                        // --- 四證八面保持不變 ---
                        hkid_name: data.hkid_name || prev.hkid_name,
                        hkid_code: data.hkid_code || prev.hkid_code,
                        hkid_dob: data.hkid_dob || prev.hkid_dob,
                        hkid_issueDate: data.hkid_issueDate || prev.hkid_issueDate,
                        hrp_nameCN: data.hrp_nameCN || prev.hrp_nameCN,
                        hrp_expiry: data.hrp_expiry || prev.hrp_expiry,
                        hrp_num: data.hrp_num || prev.hrp_num,
                        hkdl_num: data.hkdl_num || prev.hkdl_num,
                        hkdl_validTo: data.hkdl_validTo || prev.hkdl_validTo,
                        hkdl_ref: data.hkdl_ref || prev.hkdl_ref,
                        cndl_num: data.cndl_num || prev.cndl_num,
                        cndl_address: data.cndl_address || prev.cndl_address,
                        cndl_firstIssue: data.cndl_firstIssue || prev.cndl_firstIssue,
                        cndl_validPeriod: data.cndl_validPeriod || prev.cndl_validPeriod,
                        cndl_issueLoc: data.cndl_issueLoc || prev.cndl_issueLoc,
                        cndl_fileNum: data.cndl_fileNum || prev.cndl_fileNum,
                        
                        extractedData: newExtractedData,
                        tags: mergedTags,
                        description: prev.description + (data.description ? `\n[AI 識別摘要]: ${data.description}` : '')
                    };
                });
                
                showToast('✨ AI 識別成功！已按文件標準自動填入。');
            }
        } catch (error: any) {
            console.error("AI Scan Error:", error);
            showToast(`識別失敗: ${error.message}`, 'error');
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
                    ...data,
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
                    seating: data.seating !== undefined ? Number(data.seating) : 0, // ★ 讀取座位數
                    registeredOwnerName: data.registeredOwnerName || '',
                    registeredOwnerId: data.registeredOwnerId || '',
                    registeredOwnerDate: data.registeredOwnerDate || '',
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
                // 2. 普通員工 -> ★ 嚴格模式：只看明確指派給自己的資料
                return entry.managedBy === staffId;
            });

            setEntries(filteredList); 
        });
        return () => unsub();
    }, [staffId, db, appId, currentUser]); // 加入 currentUser 依賴

    // ★★★ 修改：支援 15MB 上傳 + 智能壓縮至 200KB ★★★
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const files = e.target.files;
          if (!files || files.length === 0) return;
          const file = files[0];

          // 1. PDF 處理邏輯 (保持不變)
          if (file.type === 'application/pdf') {
              if (file.size > 15 * 1024 * 1024) { alert("PDF 檔案過大 (限制 15MB)"); return; } // 也順便放寬 PDF 限制
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
                          // PDF 轉圖片維持較高清晰度 (0.8)
                          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                          newAttachments.push({ name: `${file.name}_P${i}.jpg`, data: dataUrl });
                      }
                  }
                  setEditingEntry(prev => prev ? { ...prev, attachments: [...prev.attachments, ...newAttachments] } : null);
                  alert(`成功匯入 PDF 前 ${numPages} 頁！`);
              } catch (err: any) { console.error("PDF 解析錯誤:", err); alert(`PDF 解析失敗: ${err.message}`); }
              e.target.value = ''; 
              return;
          }

          // 2. 圖片處理邏輯 (修改重點)
          // 限制放寬到 15MB
          if (file.size > 15 * 1024 * 1024) { alert(`檔案過大 (限制 15MB)`); return; }
          
          try {
              // ★ 使用 compressImage 工具，目標設定為 200KB (此數值可微調) ★
              // 這會自動調整解析度與品質，直到檔案大小接近 200KB，比原本的固定尺寸更清晰
              const compressedBase64 = await compressImage(file, 200);
              
              setEditingEntry(prev => prev ? { 
                  ...prev, 
                  attachments: [...prev.attachments, { name: file.name, data: compressedBase64 }] 
              } : null);

          } catch (error) {
              console.error("Compression error:", error);
              alert("圖片處理失敗，請重試");
          }
          
          e.target.value = '';
    };

    // ★ 下載功能加固 (支援 URL 與 Base64 雙軌並行)
    const downloadImage = async (dataUrl: string, filename: string) => {
        if (dataUrl.startsWith('http')) {
            // 如果係 URL 網址：先 Fetch 轉成 Blob，強制觸發下載
            try {
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                const localUrl = URL.createObjectURL(blob);
                const link = document.createElement('a'); 
                link.href = localUrl; 
                link.download = filename || 'download.jpg';
                document.body.appendChild(link); 
                link.click(); 
                document.body.removeChild(link);
                URL.revokeObjectURL(localUrl); // 下載完釋放記憶體
            } catch(e) { 
                // 備用方案：如果遇到嚴格跨網域限制 fetch 唔到，就直接彈出新分頁
                window.open(dataUrl, '_blank'); 
            } 
        } else {
            // 如果係舊版 Base64：用返您原本最穩陣嘅方法
            const link = document.createElement('a'); 
            link.href = dataUrl; 
            link.download = filename || 'download.png';
            document.body.appendChild(link); 
            link.click(); 
            document.body.removeChild(link);
        }
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

    
    // ★★★ 請把這段 Toast 控制器貼在這裡！ ★★★
    // ==========================================
    const [toastMsg, setToastMsg] = useState<{text: string, type: 'success'|'error'} | null>(null);

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMsg({text, type});
        setTimeout(() => setToastMsg(null), 3000); // 3秒後自動消失
    };
    // ==========================================

    // ★★★ 儲存邏輯 (含自動指派負責人) ★★★
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); 
        
        // ★★★ 防死鎖：強制收起手機虛擬鍵盤，避免瀏覽器卡死 ★★★
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        if (!db || !staffId || !editingEntry) return;
        const autoTags = new Set(editingEntry.tags || []);
        if(editingEntry.name) autoTags.add(editingEntry.name);
        
        // 100% 保留您所有的欄位資料，並加入動態擴充欄位支援！
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
            registeredOwnerDate: editingEntry.registeredOwnerDate || '',
            engineSize: Number(editingEntry.engineSize) || 0,
            priceA1: Number(editingEntry.priceA1) || 0,
            priceTax: Number(editingEntry.priceTax) || 0,
            prevOwners: editingEntry.prevOwners !== undefined ? Number(editingEntry.prevOwners) : 0,
            seating: Number(editingEntry.seating) || 0, // ★ 儲存座位數
            tags: Array.from(autoTags), 
            roles: editingEntry.roles || [], 
            attachments: editingEntry.attachments || [],
            reminderEnabled: editingEntry.reminderEnabled || false,
            expiryDate: editingEntry.expiryDate || '',
            renewalCount: editingEntry.renewalCount || 0,
            renewalDuration: editingEntry.renewalDuration || 1,
            renewalUnit: editingEntry.renewalUnit || 'year',
            customReminders: editingEntry.customReminders || [],

            // ★★★ 核心新增：確保動態欄位百寶袋被儲存 ★★★
            extractedData: editingEntry.extractedData || {},

            // ★ 新增/編輯時，確保負責人欄位正確
            managedBy: editingEntry.managedBy || staffId, 

            // ==========================================
            // ★★★ 四證八面固定欄位映射 ★★★
            // ==========================================
            hkid_name: editingEntry.hkid_name || '',
            hkid_code: editingEntry.hkid_code || '',
            hkid_dob: editingEntry.hkid_dob || '',
            hkid_issueDate: editingEntry.hkid_issueDate || '',
            
            hrp_nameCN: editingEntry.hrp_nameCN || '',
            hrp_expiry: editingEntry.hrp_expiry || '',
            hrp_num: editingEntry.hrp_num || '',
            
            hkdl_num: editingEntry.hkdl_num || '',
            hkdl_validTo: editingEntry.hkdl_validTo || '',
            hkdl_ref: editingEntry.hkdl_ref || '',
            
            cndl_num: editingEntry.cndl_num || '',
            cndl_address: editingEntry.cndl_address || '',
            cndl_firstIssue: editingEntry.cndl_firstIssue || '',
            cndl_validPeriod: editingEntry.cndl_validPeriod || '',
            cndl_issueLoc: editingEntry.cndl_issueLoc || '',
            cndl_fileNum: editingEntry.cndl_fileNum || ''
        };

        try {
            if (editingEntry.id) {
                const docRef = doc(db!, 'artifacts', appId, 'staff', 'CHARLES_data', 'database', editingEntry.id);
                const cleanData = JSON.parse(JSON.stringify(finalEntry));
                await updateDoc(docRef, { ...cleanData, updatedAt: serverTimestamp() });
                setIsDbEditing(false); 
                // ★ 改用 Toast，徹底消滅原生的 alert 死鎖
                showToast('✅ 資料已成功更新！'); 
            } else {
                const { id, ...dataToSave } = finalEntry;
                const colRef = collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'database');
                const cleanData = JSON.parse(JSON.stringify(dataToSave));
                const newRef = await addDoc(colRef, { ...cleanData, createdAt: serverTimestamp() });
                setEditingEntry({ ...finalEntry, id: newRef.id }); 
                setIsDbEditing(false);
                // ★ 改用 Toast，徹底消滅原生的 alert 死鎖
                showToast('✅ 新資料已建立！'); 
            }
        } catch (err) { 
            console.error("Save Error:", err); 
            // ★ 改用 Toast 報錯
            showToast('❌ 儲存失敗，請檢查網路連線', 'error'); 
        }
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

    // ★★★ 資料庫中心：全方位智能搜尋邏輯 ★★★
    const filteredEntries = entries.filter(entry => {
        const matchCat = selectedCatFilter === 'All' || entry.category === selectedCatFilter;
        
        // ★ 將車型、廠牌、車主登記日期、底盤號、引擎號，全部塞入搜尋大雜燴入面！
        const searchContent = `${entry.name} ${entry.phone} ${entry.idNumber} ${entry.plateNoHK} ${entry.plateNoCN} ${entry.quotaNo} ${entry.tags?.join(' ')} ${entry.make || ''} ${entry.model || ''} ${entry.registeredOwnerDate || ''} ${entry.chassisNo || ''} ${entry.engineNo || ''}`;
        
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
            
            {/* --- 左側：列表區塊 --- */}
            {/* 手機邏輯：如果有正在編輯的項目 (editingEntry 為真)，則隱藏列表，專心顯示右側詳情 */}
            <div className={`w-full md:w-1/3 border-r border-slate-100 flex-col bg-slate-50 ${editingEntry ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center text-slate-700"><Database className="mr-2" size={20}/> 資料庫</h2>
                        <div className="flex gap-2">
                            <button onClick={scanForDuplicates} className="bg-amber-100 text-amber-700 p-2 rounded-full hover:bg-amber-200" title="檢查重複"><RefreshCw size={18}/></button>
                            <button onClick={(e) => { 
                                e.preventDefault(); 
                                // ★ 自動抓取 Person 類別的第一個文件類型作為預設值
                                const defaultDoc = settings.dbDocTypes?.['Person']?.[0] || '';
                                setEditingEntry({ id: '', category: 'Person', docType: defaultDoc, name: '', description: '', attachments: [], tags: [], roles: [], createdAt: null }); 
                                setIsDbEditing(true); 
                            }} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 shadow-sm transition-transform active:scale-95"><Plus size={20}/></button>
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
                        const isAssignedToOther = entry.managedBy && entry.managedBy !== staffId;

                        return (
                        <div key={entry.id} onClick={() => { setEditingEntry(entry); setIsDbEditing(false); }} className={`p-3 rounded-lg border cursor-pointer transition-all ${editingEntry?.id === entry.id ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                      <div className="font-bold text-slate-800 truncate">{entry.name || '(未命名)'}</div>
                                      {entry.reminderEnabled && (<Bell size={12} className={isExpired ? "text-red-500 fill-red-500" : (isSoon ? "text-amber-500 fill-amber-500" : "text-green-500")} />)}
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

            {/* --- 右側：編輯/詳情區塊 --- */}
            {/* 手機邏輯：如果沒有正在編輯的項目 (!editingEntry)，則隱藏右側，顯示列表 */}
            <div className={`flex-1 flex-col h-full overflow-hidden bg-white ${!editingEntry ? 'hidden md:flex' : 'flex'}`}>
                {editingEntry ? (
                    <form onSubmit={handleSave} className="flex flex-col h-full">
                        <div className="flex-none p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-2">
                                {/* ★★★ 新增：手機版返回列表按鈕 ★★★ */}
                                <button type="button" onClick={() => setEditingEntry(null)} className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 active:bg-slate-200 rounded-full transition-colors">
                                    <ArrowLeft size={20}/>
                                </button>

                                <div className="font-bold text-slate-700 text-lg flex items-center">
                                    {isDbEditing || !editingEntry.id ? (editingEntry.id ? '編輯資料' : '新增資料') : editingEntry.name}
                                    {!isDbEditing && <span className="ml-2 text-xs font-normal text-gray-500 px-2 py-1 bg-white rounded border">{DB_CATEGORIES.find(c => c.id === editingEntry.category)?.label}</span>}
                                </div>
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
                                        <div className="flex gap-2">
                                            {DB_CATEGORIES.map(cat => (
                                                <button 
                                                    key={cat.id} 
                                                    type="button" 
                                                    onClick={() => {
                                                        // ★ 自動抓取切換後該類別的第一個文件類型作為預設值
                                                        const newDefaultDoc = settings.dbDocTypes?.[cat.id]?.[0] || '';
                                                        setEditingEntry({...editingEntry, category: cat.id as any, docType: newDefaultDoc});
                                                    }} 
                                                    className={`px-3 py-1.5 text-sm rounded-md border transition-all ${editingEntry.category === cat.id ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 hover:bg-blue-100'}`}
                                                >
                                                    {cat.label}
                                                </button>
                                            ))}
                                        </div>
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
                                                <div className="grid grid-cols-4 gap-2">
                                                    <div><label className="text-[10px] text-gray-500">A1 稅值</label><input type="number" disabled={!isDbEditing} value={editingEntry.priceA1 || ''} onChange={e => setEditingEntry({...editingEntry, priceA1: Number(e.target.value)})} className="w-full p-1.5 border rounded text-xs font-bold text-blue-600"/></div>
                                                    <div><label className="text-[10px] text-gray-500">已繳稅款</label><input type="number" disabled={!isDbEditing} value={editingEntry.priceTax || ''} onChange={e => setEditingEntry({...editingEntry, priceTax: Number(e.target.value)})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    <div><label className="text-[10px] text-gray-500">手數</label><input type="number" disabled={!isDbEditing} value={editingEntry.prevOwners || ''} onChange={e => setEditingEntry({...editingEntry, prevOwners: Number(e.target.value)})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    {/* ★ 新增：座位數 */}
                                                    <div><label className="text-[10px] text-gray-500">座位數</label><input type="number" disabled={!isDbEditing} value={editingEntry.seating || ''} onChange={e => setEditingEntry({...editingEntry, seating: Number(e.target.value)})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                </div>
                                                <div className="bg-white p-2 rounded border border-slate-100">
                                                    <label className="text-[10px] font-bold text-slate-400 mb-1 block">VRD 登記車主</label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        <div className="col-span-2"><input disabled={!isDbEditing} value={editingEntry.registeredOwnerName || ''} onChange={e => setEditingEntry({...editingEntry, registeredOwnerName: e.target.value})} className="w-full p-1.5 border rounded text-xs" placeholder="車主全名"/></div>
                                                        <div className="col-span-1"><input disabled={!isDbEditing} value={editingEntry.registeredOwnerId || ''} onChange={e => setEditingEntry({...editingEntry, registeredOwnerId: e.target.value})} className="w-full p-1.5 border rounded text-xs" placeholder="身份證號碼"/></div>
                                                        {/* ★ 新增：登記為車主日期輸入框 */}
                                                        <div className="col-span-1"><input type="date" disabled={!isDbEditing} value={editingEntry.registeredOwnerDate || ''} onChange={e => setEditingEntry({...editingEntry, registeredOwnerDate: e.target.value})} className="w-full p-1.5 border rounded text-xs text-slate-500" title="登記為車主日期"/></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    
                                    {/* --- 中港指標專屬區塊 (修正版) --- */}
                                    {editingEntry.category === 'CrossBorder' && (
                                        <div className="space-y-4 mb-4">
                                            {/* 1. 原有的通用欄位 (指標號/關聯車牌) */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">指標號 (Quota No)</label>
                                                    <input disabled={!isDbEditing} value={editingEntry.quotaNo || ''} onChange={e => setEditingEntry({...editingEntry, quotaNo: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">關聯香港車牌</label>
                                                    {isDbEditing ? (
                                                        <select value={editingEntry.relatedPlateNo || ''} onChange={e => setEditingEntry({...editingEntry, relatedPlateNo: e.target.value})} className="w-full p-2 border rounded text-sm bg-blue-50 text-blue-800 font-bold">
                                                            <option value="">-- 無關聯 --</option>
                                                            {inventory.map(v => (<option key={v.id} value={v.regMark}>{v.regMark} {v.make} {v.model}</option>))}
                                                        </select>
                                                    ) : (
                                                        <div className="w-full p-2 border rounded text-sm bg-gray-50">{editingEntry.relatedPlateNo || '-'}</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 2. 四證八面專屬輸入區 (只有選中該類型時顯示) */}
                                            {editingEntry.docType === '四證八面' && (
                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-4 animate-fade-in mt-2">
                                                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                                                        <span className="text-xs font-black text-slate-700 bg-yellow-200 px-2 rounded">1. 香港身份證</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                        <div><label className="text-[10px] text-gray-500">姓名 (Name)</label><input disabled={!isDbEditing} value={editingEntry.hkid_name || ''} onChange={e => setEditingEntry({...editingEntry, hkid_name: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                        <div><label className="text-[10px] text-gray-500">身份證號碼</label><input disabled={!isDbEditing} value={editingEntry.idNumber || ''} onChange={e => setEditingEntry({...editingEntry, idNumber: e.target.value})} className="w-full p-1.5 border rounded text-xs font-bold"/></div>
                                                        <div><label className="text-[10px] text-gray-500">電碼 (Code)</label><input disabled={!isDbEditing} value={editingEntry.hkid_code || ''} onChange={e => setEditingEntry({...editingEntry, hkid_code: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                        <div><label className="text-[10px] text-gray-500">出生日期</label><input type="date" disabled={!isDbEditing} value={editingEntry.hkid_dob || ''} onChange={e => setEditingEntry({...editingEntry, hkid_dob: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                        <div><label className="text-[10px] text-gray-500">簽發日期</label><input type="date" disabled={!isDbEditing} value={editingEntry.hkid_issueDate || ''} onChange={e => setEditingEntry({...editingEntry, hkid_issueDate: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    </div>

                                                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1 pt-2">
                                                        <span className="text-xs font-black text-slate-700 bg-blue-200 px-2 rounded">2. 回鄉證 (港澳居民通行證)</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                        <div><label className="text-[10px] text-gray-500">姓名 (簡體)</label><input disabled={!isDbEditing} value={editingEntry.hrp_nameCN || ''} onChange={e => setEditingEntry({...editingEntry, hrp_nameCN: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                        <div><label className="text-[10px] text-gray-500">證件號碼</label><input disabled={!isDbEditing} value={editingEntry.hrp_num || ''} onChange={e => setEditingEntry({...editingEntry, hrp_num: e.target.value})} className="w-full p-1.5 border rounded text-xs font-mono"/></div>
                                                        <div><label className="text-[10px] text-gray-500">有效期至</label><input type="date" disabled={!isDbEditing} value={editingEntry.hrp_expiry || ''} onChange={e => setEditingEntry({...editingEntry, hrp_expiry: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    </div>

                                                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1 pt-2">
                                                        <span className="text-xs font-black text-slate-700 bg-green-200 px-2 rounded">3. 香港駕駛執照</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                        <div><label className="text-[10px] text-gray-500">執照號碼</label><input disabled={!isDbEditing} value={editingEntry.hkdl_num || ''} onChange={e => setEditingEntry({...editingEntry, hkdl_num: e.target.value})} className="w-full p-1.5 border rounded text-xs font-mono"/></div>
                                                        <div><label className="text-[10px] text-gray-500">有效期至</label><input type="date" disabled={!isDbEditing} value={editingEntry.hkdl_validTo || ''} onChange={e => setEditingEntry({...editingEntry, hkdl_validTo: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                        <div><label className="text-[10px] text-gray-500">檔號 (Ref No)</label><input disabled={!isDbEditing} value={editingEntry.hkdl_ref || ''} onChange={e => setEditingEntry({...editingEntry, hkdl_ref: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    </div>

                                                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1 pt-2">
                                                        <span className="text-xs font-black text-slate-700 bg-red-200 px-2 rounded">4. 中國機動車駕駛證</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div><label className="text-[10px] text-gray-500">證號</label><input disabled={!isDbEditing} value={editingEntry.cndl_num || ''} onChange={e => setEditingEntry({...editingEntry, cndl_num: e.target.value})} className="w-full p-1.5 border rounded text-xs font-mono"/></div>
                                                        <div><label className="text-[10px] text-gray-500">檔案編號 (副頁)</label><input disabled={!isDbEditing} value={editingEntry.cndl_fileNum || ''} onChange={e => setEditingEntry({...editingEntry, cndl_fileNum: e.target.value})} className="w-full p-1.5 border rounded text-xs font-mono"/></div>
                                                        <div className="col-span-2"><label className="text-[10px] text-gray-500">住址</label><input disabled={!isDbEditing} value={editingEntry.cndl_address || ''} onChange={e => setEditingEntry({...editingEntry, cndl_address: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                        <div><label className="text-[10px] text-gray-500">初次領證日期</label><input type="date" disabled={!isDbEditing} value={editingEntry.cndl_firstIssue || ''} onChange={e => setEditingEntry({...editingEntry, cndl_firstIssue: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                        <div><label className="text-[10px] text-gray-500">簽發地 (印章)</label><input disabled={!isDbEditing} value={editingEntry.cndl_issueLoc || ''} onChange={e => setEditingEntry({...editingEntry, cndl_issueLoc: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                        <div className="col-span-2"><label className="text-[10px] text-gray-500">有效期限 (起止)</label><input disabled={!isDbEditing} value={editingEntry.cndl_validPeriod || ''} onChange={e => setEditingEntry({...editingEntry, cndl_validPeriod: e.target.value})} className="w-full p-1.5 border rounded text-xs" placeholder="例如: 2023-01-01 至 2029-01-01"/></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">文件類型</label><input list="doctype_list" disabled={!isDbEditing} value={editingEntry.docType || ''} onChange={e => setEditingEntry({...editingEntry, docType: e.target.value})} className="w-full p-2 border rounded text-sm bg-gray-50" placeholder="選擇或輸入新類型..."/><datalist id="doctype_list">{(settings.dbDocTypes[editingEntry.category] || []).map(t => <option key={t} value={t}/>)}</datalist></div>
                                    
                                    {/* ★★★ 新增：動態專屬欄位顯示區 (僅限定義過的文件) ★★★ */}
                                    {editingEntry.docType && DOCUMENT_FIELD_SCHEMA[editingEntry.docType] && (
                                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 mt-2 animate-fade-in space-y-3">
                                            <div className="text-[10px] font-bold text-blue-600 flex items-center mb-1">
                                                <ShieldCheck size={14} className="mr-1"/> {editingEntry.docType} 專屬數據欄位
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {DOCUMENT_FIELD_SCHEMA[editingEntry.docType].map((field) => (
                                                    <div key={field.key} className={field.type === 'date' ? 'col-span-1' : 'col-span-2 md:col-span-1'}>
                                                        <label className="block text-[10px] text-slate-400 font-bold mb-1">{field.label}</label>
                                                        <input 
                                                            type={field.type} 
                                                            disabled={!isDbEditing} 
                                                            value={editingEntry.extractedData?.[field.key] || ''} 
                                                            onChange={e => {
                                                                const newExtData = { ...(editingEntry.extractedData || {}), [field.key]: e.target.value };
                                                                setEditingEntry({ ...editingEntry, extractedData: newExtData });
                                                            }} 
                                                            className="w-full p-2 border border-slate-200 rounded text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none font-medium" 
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* ★★★ 全域現代化提示 (Toast) ★★★ */}
                                    {toastMsg && (
                                        <div className={`fixed top-10 left-1/2 transform -translate-x-1/2 z-[99999] px-6 py-3 rounded-full shadow-2xl text-sm font-bold flex items-center transition-all animate-fade-in ${toastMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                                            {toastMsg.text}
                                        </div>
                                    )}

                                    {/* 1. 主要提醒模塊 */}
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
                                    
                                    {/* 2. ★★★ 附加多重提醒模塊 (最多5個，加上主模塊共6個) ★★★ */}
                                    {(editingEntry.customReminders || []).map((rem: any, idx: number) => (
                                        <div key={rem.id} className="p-4 rounded-lg border bg-blue-50/50 border-blue-200 mt-3 animate-fade-in relative shadow-sm">
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex-1 mr-4">
                                                    <input 
                                                        type="text"
                                                        disabled={!isDbEditing} 
                                                        value={rem.title} 
                                                        onChange={e => {
                                                            // ★ 安全的資料更新方式，避免畫面卡死
                                                            const newR = editingEntry.customReminders!.map((r:any, i:number) => 
                                                                i === idx ? { ...r, title: e.target.value } : r
                                                            );
                                                            setEditingEntry({...editingEntry, customReminders: newR});
                                                        }} 
                                                        placeholder="輸入文件名稱 (例如：體檢報告、保險)..." 
                                                        className="w-full bg-transparent border-b border-blue-300 font-bold text-blue-800 outline-none focus:border-blue-600 pb-1 text-sm" 
                                                    />
                                                </div>
                                                {isDbEditing && (
                                                    <button type="button" onClick={() => {
                                                        const newR = editingEntry.customReminders!.filter((r:any) => r.id !== rem.id);
                                                        setEditingEntry({...editingEntry, customReminders: newR});
                                                    }} className="text-red-400 hover:text-red-600 p-1 bg-white rounded-full shadow-sm border border-red-100"><X size={14}/></button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2 md:col-span-1">
                                                    <label className="block text-xs font-bold text-blue-800 mb-1">到期日</label>
                                                    <input type="date" disabled={!isDbEditing} value={rem.expiryDate || ''} onChange={e => {
                                                        const newR = editingEntry.customReminders!.map((r:any, i:number) => 
                                                            i === idx ? { ...r, expiryDate: e.target.value } : r
                                                        );
                                                        setEditingEntry({...editingEntry, customReminders: newR});
                                                    }} className="w-full p-2 border border-blue-300 rounded text-sm bg-white font-bold focus:ring-2 focus:ring-blue-400 outline-none" />
                                                    <div className="mt-1"><DateStatusBadge date={rem.expiryDate} label="狀態" /></div>
                                                </div>
                                                <div className="col-span-2 md:col-span-1 bg-white p-2 rounded border border-blue-100">
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">獨立續期規則</label>
                                                    <div className="flex gap-2 mb-2">
                                                        <input type="number" disabled={!isDbEditing} value={rem.renewalDuration} onChange={e => {
                                                            const newR = editingEntry.customReminders!.map((r:any, i:number) => 
                                                                i === idx ? { ...r, renewalDuration: Number(e.target.value) } : r
                                                            );
                                                            setEditingEntry({...editingEntry, customReminders: newR});
                                                        }} className="w-16 p-1 border rounded text-center text-sm" min="1" />
                                                        <select disabled={!isDbEditing} value={rem.renewalUnit} onChange={e => {
                                                            const newR = editingEntry.customReminders!.map((r:any, i:number) => 
                                                                i === idx ? { ...r, renewalUnit: e.target.value } : r
                                                            );
                                                            setEditingEntry({...editingEntry, customReminders: newR});
                                                        }} className="flex-1 p-1 border rounded text-sm"><option value="year">年</option><option value="month">月</option></select>
                                                    </div>
                                                    {isDbEditing && (
                                                        <button type="button" onClick={() => {
                                                            if (!rem.expiryDate) { showToast("請先設定到期日", "error"); return; }
                                                            const currentDate = new Date(rem.expiryDate);
                                                            if (rem.renewalUnit === 'year') currentDate.setFullYear(currentDate.getFullYear() + rem.renewalDuration);
                                                            else currentDate.setMonth(currentDate.getMonth() + rem.renewalDuration);
                                                            
                                                            const newR = editingEntry.customReminders!.map((r:any, i:number) => 
                                                                i === idx ? { ...r, expiryDate: currentDate.toISOString().split('T')[0], renewalCount: (r.renewalCount || 0) + 1 } : r
                                                            );
                                                            setEditingEntry({...editingEntry, customReminders: newR});
                                                        }} className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1.5 rounded flex items-center justify-center shadow-sm"><RefreshCw size={12} className="mr-1"/> 立即續期 ({rem.renewalCount || 0})</button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* 3. 新增按鈕 (滿 5 個就自動隱藏) */}
                                    {isDbEditing && (editingEntry.customReminders?.length || 0) < 5 && (
                                        <button type="button" onClick={() => {
                                            const newRem = { id: Date.now().toString(), title: '', expiryDate: '', renewalCount: 0, renewalDuration: 1, renewalUnit: 'year' };
                                            setEditingEntry({...editingEntry, customReminders: [...(editingEntry.customReminders || []), newRem]});
                                        }} className="w-full mt-3 py-2.5 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors flex justify-center items-center">
                                            <Plus size={16} className="mr-1"/> 增加其他文件提醒 (已用 {(editingEntry.customReminders?.length || 0) + 1} / 6)
                                        </button>
                                    )}
                                    
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">備註</label><textarea disabled={!isDbEditing} value={editingEntry.description || ''} onChange={e => setEditingEntry({...editingEntry, description: e.target.value})} className="w-full p-2 border rounded text-sm h-24" placeholder="輸入詳細說明..."/></div>
                                    <div><label className="block text-xs font-bold text-slate-500">標籤</label><div className="flex gap-2 mb-2 flex-wrap">{editingEntry.tags?.map(tag => <span key={tag} className="bg-slate-200 px-2 py-1 rounded text-xs flex items-center">{tag} {isDbEditing && <button type="button" onClick={() => setEditingEntry({...editingEntry, tags: editingEntry.tags.filter(t => t !== tag)})} className="ml-1 text-slate-500 hover:text-red-500"><X size={10}/></button>}</span>)}</div>{isDbEditing && <div className="flex gap-1"><input value={tagInput} onChange={e => setTagInput(e.target.value)} className="flex-1 p-1.5 border rounded text-xs" placeholder="新增..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} /><button type="button" onClick={addTag} className="bg-slate-200 px-3 py-1 rounded text-xs"><Plus size={12}/></button></div>}</div>
                                </div>

                                {/* 第二欄：圖片列表與上傳區 */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-xs font-bold text-slate-500">文件圖片 ({editingEntry.attachments?.length || 0})</label>
                                        <div className="flex gap-2">
                                            {/* ★★★ 新增：從智能圖庫導入按鈕 (防當機升級版) ★★★ */}
                                            {isDbEditing && (
                                                <button 
                                                    type="button" 
                                                    onClick={async () => {
                                                        try {
                                                            // ★ 核心修復：只使用單一條件查詢，避開 Firebase 的複合索引限制
                                                            const q = query(
                                                                collection(db!, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library'), 
                                                                where('status', '==', 'unassigned')
                                                            );
                                                            const snap = await getDocs(q);
                                                            
                                                            // ★ 在拿到資料後，使用 JavaScript 進行第二層過濾 (只要 document)
                                                            const docs = snap.docs
                                                                .map(d => ({id: d.id, ...d.data()}))
                                                                .filter((d: any) => d.mediaType === 'document');
                                                            
                                                            setAvailableDocs(docs);
                                                            setShowMediaPicker(true);
                                                        } catch (error: any) {
                                                            console.error("載入 Inbox 失敗:", error);
                                                            alert(`無法讀取 Inbox，請檢查網路。\n錯誤訊息: ${error.message}`);
                                                        }
                                                    }} 
                                                    className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full hover:bg-indigo-100 flex items-center border border-indigo-200 shadow-sm transition-colors font-bold active:scale-95"
                                                >
                                                    <DownloadCloud size={14} className="mr-1"/> 從 Inbox 導入
                                                </button>
                                            )}
                                            {/* ★★★ A4 排版按鈕 (當有選取圖片時才會顯示) ★★★ */}
                                            {selectedForPrint.length > 0 && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setShowA4Printer(true)} 
                                                    className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full hover:bg-purple-700 flex items-center shadow-sm transition-colors"
                                                >
                                                    <Printer size={14} className="mr-1"/> A4排版 ({selectedForPrint.length})
                                                </button>
                                            )}
                                            
                                            {isDbEditing && (
                                                <label className="cursor-pointer text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 flex items-center border border-blue-200 shadow-sm transition-colors">
                                                    <Upload size={14} className="mr-1"/> 上傳圖片
                                                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-6 max-h-[800px] overflow-y-auto pr-2">
                                        {editingEntry.attachments?.map((file, idx) => (
                                            <div key={idx} className={`relative group border rounded-xl overflow-hidden bg-white shadow-md flex flex-col transition-all ${selectedForPrint.includes(idx) ? 'ring-2 ring-purple-500' : ''}`}>
                                                
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

                                                    {/* ★ 選取核取方塊 (Checkbox) */}
                                                    <div className="absolute top-2 left-2 z-20 bg-white/80 p-1 rounded-md backdrop-blur-sm shadow-sm">
                                                        <input 
                                                            type="checkbox" 
                                                            className="w-4 h-4 accent-purple-600 cursor-pointer block"
                                                            checked={selectedForPrint.includes(idx)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedForPrint([...selectedForPrint, idx]);
                                                                else setSelectedForPrint(selectedForPrint.filter(i => i !== idx));
                                                            }}
                                                        />
                                                    </div>

                                                    {/* ★ 下載按鈕 (left-10) */}
                                                    <button type="button" onClick={(e) => { e.preventDefault(); downloadImage(file.data, file.name); }} className="absolute top-2 left-10 bg-blue-600 text-white p-2 rounded-full opacity-80 hover:opacity-100 transition-opacity shadow-lg" title="下載圖片"><DownloadCloud size={18}/></button>
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
            {/* ★★★ A4 排版列印彈窗 (資料庫版) ★★★ */}
            {showA4Printer && (
                <A4DocumentPrinter 
                    selectedItems={selectedForPrint.map(idx => ({
                        id: idx.toString(),
                        // 取出對應索引的 Base64 圖片數據
                        url: editingEntry?.attachments[idx].data 
                    }))}
                    onClose={() => setShowA4Printer(false)} 
                />
            )}

            {/* 👇👇👇 第四步的 Modal 請貼在這裡 👇👇👇 */}
            {/* ★★★ 智能圖庫文件選取器 (Modal) ★★★ */}
            {showMediaPicker && (
                <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
                        <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center"><FileText className="mr-2"/> 選擇 Inbox 中的文件</h3>
                            <button onClick={() => setShowMediaPicker(false)} className="hover:bg-white/20 p-1 rounded-full"><X/></button>
                        </div>
                        <div className="p-4 grid grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto bg-slate-50 flex-1">
                            {/* ★ 把 doc 改成 mediaItem，避免跟 Firebase 函數撞名 ★ */}
                            {availableDocs.map(mediaItem => (
                                <div key={mediaItem.id} className="relative aspect-auto bg-white p-1 rounded-lg border-2 border-slate-200 shadow-sm hover:border-indigo-400 group cursor-pointer"
                                    onClick={async () => {
                                        try {
                                            // ★ 終極修復：直接儲存 URL 連結，唔好再下載轉做 Base64！
                                            // 咁樣每張圖只會佔資料庫幾十 bytes，永遠唔會爆 1MB！
                                            setEditingEntry(prev => prev ? { 
                                                ...prev, 
                                                attachments: [...prev.attachments, { 
                                                    name: mediaItem.fileName || 'Inbox文件', 
                                                    data: mediaItem.url 
                                                }] 
                                            } : null);
                                            
                                            const { updateDoc, serverTimestamp, doc } = await import('firebase/firestore');
                                            
                                            await updateDoc(doc(db!, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', mediaItem.id), {
                                                // ★ 關鍵修改：改成 database_linked，這樣圖庫就不會把它抓走了！
                                                status: 'database_linked', 
                                                updatedAt: serverTimestamp()
                                            });

                                            setAvailableDocs(prev => prev.filter(d => d.id !== mediaItem.id)); 
                                            showToast('✅ 成功導入文件！');
                                            
                                        } catch (e) { 
                                            console.error("更新 Firebase 狀態失敗:", e);
                                            alert("導入失敗，請檢查網絡權限。"); 
                                        }
                                    }}
                                >
                                    <img src={mediaItem.url} className="w-full h-32 object-contain" />
                                    <div className="absolute inset-0 bg-indigo-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-bold text-sm transition-opacity rounded-lg">
                                        點擊導入
                                    </div>
                                </div>
                            ))}
                            {availableDocs.length === 0 && <div className="col-span-full py-10 text-center text-slate-400">智能圖庫的 Inbox 中目前沒有文件。</div>}
                        </div>
                    </div>
                </div>
            )}
            {/* 👆👆👆 貼在這裡 👆👆👆 */}
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
// ★★★ 升級版：智慧圖片編輯器 (支援自由拖曳、縮放、車牌遮罩) ★★★
// ------------------------------------------------------------------
const ImageEditorModal = ({ mediaItem, onClose, onSave }: any) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
    const [brightness, setBrightness] = useState(100);
    
    // ★ 新增：控制畫布內的圖片縮放與位移
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    
    // ★ 新增：操作模式切換 (移動圖片 vs 畫遮罩)
    const [editorMode, setEditorMode] = useState<'pan' | 'mask'>('pan');
    
    const [masks, setMasks] = useState<{x:number, y:number, w:number, h:number}[]>([]);
    const [isDrawingMask, setIsDrawingMask] = useState(false);
    const [isDraggingImage, setIsDraggingImage] = useState(false);
    
    const [startPos, setStartPos] = useState({x:0, y:0});
    const [currentPos, setCurrentPos] = useState({x:0, y:0});
    const [isProcessing, setIsProcessing] = useState(false);

    // 固定輸出畫質：1200x900 (標準 4:3 黃金比例)
    const CANVAS_W = 1200;
    const CANVAS_H = 900;

    // 1. 載入圖片並自動置中填滿
    useEffect(() => {
        const loadImg = async () => {
            try {
                const res = await fetch(mediaItem.url);
                const blob = await res.blob();
                const localUrl = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                    setImgObj(img);
                    // 自動計算：讓圖片預設填滿 4:3 畫布
                    const defaultScale = Math.max(CANVAS_W / img.width, CANVAS_H / img.height);
                    setZoom(defaultScale);
                    setPan({
                        x: (CANVAS_W - img.width * defaultScale) / 2,
                        y: (CANVAS_H - img.height * defaultScale) / 2
                    });
                };
                img.src = localUrl;
            } catch(e) { 
                alert("圖片加載失敗"); onClose(); 
            }
        };
        loadImg();
    }, [mediaItem]);

    // 2. 繪製 Canvas
    useEffect(() => {
        if (!imgObj || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;

        // 清空畫布
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // A. 繪製圖片 (包含位移、縮放、亮度)
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);
        ctx.filter = `brightness(${brightness}%)`;
        ctx.drawImage(imgObj, 0, 0);
        ctx.restore();

        // B. 繪製已保存的遮罩 (相對畫布坐標)
        ctx.fillStyle = '#1e293b'; 
        masks.forEach(m => { ctx.fillRect(m.x, m.y, m.w, m.h); });

        // C. 繪製拖曳中的預覽框 (僅在畫遮罩模式)
        if (editorMode === 'mask' && isDrawingMask) {
            ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
            const w = currentPos.x - startPos.x;
            const h = currentPos.y - startPos.y;
            ctx.fillRect(startPos.x, startPos.y, w, h);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 4;
            ctx.strokeRect(startPos.x, startPos.y, w, h);
        }
    }, [imgObj, brightness, zoom, pan, masks, isDrawingMask, currentPos, editorMode]);

    // 3. 滑鼠與觸控事件 (支援移動圖片或畫遮罩)
    const getCanvasPos = (clientX: number, clientY: number) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const handlePointerDown = (e: any) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        if (editorMode === 'mask') {
            setIsDrawingMask(true);
            const pos = getCanvasPos(clientX, clientY);
            setStartPos(pos); setCurrentPos(pos);
        } else if (editorMode === 'pan') {
            setIsDraggingImage(true);
            // 記錄原始螢幕座標，用於計算位移差
            setStartPos({ x: clientX, y: clientY }); 
        }
    };

    const handlePointerMove = (e: any) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        if (editorMode === 'mask' && isDrawingMask) {
            setCurrentPos(getCanvasPos(clientX, clientY));
        } else if (editorMode === 'pan' && isDraggingImage) {
            // 計算真實像素移動距離，並放大以適應畫布比例
            const rect = canvasRef.current!.getBoundingClientRect();
            const ratio = CANVAS_W / rect.width;
            const dx = (clientX - startPos.x) * ratio;
            const dy = (clientY - startPos.y) * ratio;
            
            setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setStartPos({ x: clientX, y: clientY }); // 更新起點
        }
    };

    const handlePointerUp = () => {
        if (editorMode === 'mask' && isDrawingMask) {
            setIsDrawingMask(false);
            const w = currentPos.x - startPos.x;
            const h = currentPos.y - startPos.y;
            if (Math.abs(w) > 20 && Math.abs(h) > 20) {
                const finalX = w > 0 ? startPos.x : currentPos.x;
                const finalY = h > 0 ? startPos.y : currentPos.y;
                setMasks([...masks, { x: finalX, y: finalY, w: Math.abs(w), h: Math.abs(h) }]);
            }
        } else if (editorMode === 'pan') {
            setIsDraggingImage(false);
        }
    };

    // 儲存圖片
    const handleSaveClick = async () => {
        if (!canvasRef.current) return;
        setIsProcessing(true);
        try {
            const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85); 
            await onSave(mediaItem, dataUrl);
        } catch(e) { alert('儲存失敗'); } 
        finally { setIsProcessing(false); }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center md:p-4">
            <div className="w-full md:max-w-6xl bg-slate-900 text-white md:rounded-2xl flex flex-col h-full md:h-[90vh] overflow-hidden shadow-2xl">
                <div className="p-4 flex justify-between items-center border-b border-slate-700 bg-slate-800 flex-none">
                    <h3 className="font-bold flex items-center"><Edit size={18} className="mr-2 text-blue-400"/> 圖片排版與美化 (輸出比例 4:3)</h3>
                    <button onClick={onClose} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
                </div>
                
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* 左側：畫布 */}
                    <div className="flex-1 p-2 md:p-6 flex items-center justify-center bg-black/80 overflow-hidden relative touch-none">
                        {!imgObj && <div className="text-white flex items-center"><Loader2 className="animate-spin mr-2"/> 載入中...</div>}
                        <canvas 
                            ref={canvasRef}
                            onMouseDown={handlePointerDown} onMouseMove={handlePointerMove}
                            onMouseUp={handlePointerUp} onMouseLeave={handlePointerUp}
                            onTouchStart={(e) => { e.preventDefault(); handlePointerDown(e); }}
                            onTouchMove={(e) => { e.preventDefault(); handlePointerMove(e); }}
                            onTouchEnd={handlePointerUp}
                            className={`max-w-full max-h-full object-contain shadow-[0_0_50px_rgba(0,0,0,0.5)] border-2 border-slate-700 ${editorMode === 'pan' ? (isDraggingImage ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair'}`}
                        />
                    </div>

                    {/* 右側：控制面板 */}
                    <div className="w-full md:w-80 bg-slate-800 p-5 flex flex-col gap-6 overflow-y-auto flex-none border-t md:border-t-0 md:border-l border-slate-700">
                        
                        {/* 模式切換 */}
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-2 block">1. 選擇操作模式</label>
                            <div className="flex bg-slate-900 rounded-lg p-1">
                                <button onClick={() => setEditorMode('pan')} className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center transition ${editorMode === 'pan' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                                    <Move size={16} className="mr-2"/> 移動排版
                                </button>
                                <button onClick={() => setEditorMode('mask')} className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center transition ${editorMode === 'mask' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                                    <MousePointer2 size={16} className="mr-2"/> 畫遮罩
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                                {editorMode === 'pan' ? '💡 目前模式：在左側圖片上滑動即可移動車輛位置。' : '💡 目前模式：在左側圖片上滑動畫出黑色方塊遮擋車牌。'}
                            </p>
                        </div>

                        {/* 縮放與亮度 */}
                        {editorMode === 'pan' && (
                            <div className="space-y-4 animate-in fade-in">
                                <div>
                                    <label className="text-xs text-slate-400 font-bold mb-2 flex justify-between">
                                        <span>🔍 圖片縮放 (Zoom)</span>
                                        <span className="text-blue-400">{Math.round(zoom * 100)}%</span>
                                    </label>
                                    <input type="range" min="0.2" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-blue-500"/>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 font-bold mb-2 flex justify-between">
                                        <span>☀️ 亮度調整 (Brightness)</span>
                                        <span className="text-yellow-400">{brightness}%</span>
                                    </label>
                                    <input type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full accent-yellow-500"/>
                                </div>
                            </div>
                        )}

                        {/* 遮罩控制 */}
                        {editorMode === 'mask' && masks.length > 0 && (
                            <div className="animate-in fade-in">
                                <button onClick={() => setMasks([])} className="w-full bg-slate-700 hover:bg-slate-600 text-red-300 text-sm font-bold py-2.5 rounded-lg transition border border-slate-600">
                                    復原 (清除所有遮罩)
                                </button>
                            </div>
                        )}

                        <div className="mt-auto pt-4 border-t border-slate-700">
                            <button onClick={handleSaveClick} disabled={isProcessing || !imgObj} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center transition disabled:opacity-50 active:scale-95">
                                {isProcessing ? <><Loader2 className="animate-spin mr-2" size={18}/> 處理中...</> : <><Save size={18} className="mr-2"/> 覆蓋並儲存</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
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

    const [mobileTab, setMobileTab] = useState<'inbox' | 'classify' | 'gallery'>('inbox');

    const [classifySearch, setClassifySearch] = useState('');

    // ★★★ 新增：控制圖片編輯器的狀態 ★★★
    const [editingMedia, setEditingMedia] = useState<MediaLibraryItem | null>(null);

    const [activeGroupImages, setActiveGroupImages] = useState<Record<string, string>>({});

    // ★★★ 新增：處理編輯後儲存的邏輯 ★★★
    const handleSaveEditedImage = async (oldItem: MediaLibraryItem, newBase64: string) => {
        if (!storage || !db) return;
        try {
            // 1. 上傳新圖片到 Storage
            const newFilePath = `media/${appId}/edited_${Date.now()}.jpg`;
            const storageRef = ref(storage, newFilePath);
            await uploadString(storageRef, newBase64, 'data_url');
            const newUrl = await getDownloadURL(storageRef);

            // 2. 更新資料庫中的 URL 與路徑
            const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', oldItem.id);
            await updateDoc(docRef, {
                url: newUrl,
                path: newFilePath,
                updatedAt: serverTimestamp()
            });

            // 3. 刪除舊圖片 (節省空間)
            if (oldItem.path) {
                const oldRef = ref(storage, oldItem.path);
                await deleteObject(oldRef).catch(e => console.warn("舊圖刪除失敗(可忽略)", e));
            }

            setEditingMedia(null); // 關閉編輯器
        } catch (err) {
            console.error(err);
            alert('儲存失敗，請檢查網路連線。');
        }
    };

   // ★★★ 智能圖庫資料讀取 (正式索引版：效能優化 + 權限解鎖) ★★★
    useEffect(() => {
        if (!db || !staffId) return;

        // 因為您已經建立了索引，我們這裡可以使用 orderBy 讓 Firebase 伺服器做排序，效能最高
        const q = query(
            collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library'), 
            orderBy('createdAt', 'desc')
        );
        
        return onSnapshot(q, (snap) => {
            const list: MediaLibraryItem[] = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() } as MediaLibraryItem));
            
            // 這裡進行過濾，確保 BOSS 能看到所有 Inbox，且不分大小寫
            const myImages = list.filter(img => {
                const currentStaff = String(staffId).toUpperCase();
                const uploader = String(img.uploadedBy || '').toUpperCase();

                // 1. 如果是 BOSS，無條件顯示所有 Inbox 圖片
                if (currentStaff === 'BOSS') {
                    return true;
                }
                
                // 2. 如果是普通員工
                // A. 已歸檔的圖片：顯示與現有庫存匹配的
                if (img.status === 'linked' && img.relatedVehicleId) {
                    return inventory.some((v: Vehicle) => v.id === img.relatedVehicleId);
                }
                
                // B. 待處理 (Inbox) 的圖片：只顯示自己傳的 (忽略大小寫)
                if (img.status === 'unassigned' || !img.status) {
                    return uploader === currentStaff;
                }
                
                return false; 
            });

            setMediaItems(myImages);
        });
    }, [db, staffId, appId, inventory]);

    const libraryGroups = useMemo(() => {
        const groups: Record<string, { key: string, title: string, items: MediaLibraryItem[], status: string, timestamp: number }> = {};
        
        const filteredItems = mediaItems.filter(i => {
            if (i.status !== 'linked') return false;
            if (!searchQuery) return true;
            
            // 搜尋字串
            const query = searchQuery.toLowerCase();
            const aiText = `${i.aiData?.year} ${i.aiData?.make} ${i.aiData?.model} ${i.aiData?.color}`.toLowerCase();
            
            // ★★★ Feature 5: 增加車牌搜尋 ★★★
            const car = inventory.find((v:any) => v.id === i.relatedVehicleId);
            const regMark = car ? (car.regMark || '').toLowerCase() : '';
            
            // 只要 AI 資訊 或 車牌 符合搜尋字串就顯示
            return aiText.includes(query) || regMark.includes(query);
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

    // ★★★ 超級上傳引擎：支援 HEIC, PDF 拆解, 與智能分類 ★★★
    const handleSmartUpload = async (e: any, forcedType?: 'vehicle' | 'document') => {
        // 同時支援點擊上傳 (target.files) 與拖曳上傳 (dataTransfer.files)
        const files = e.target?.files || e.dataTransfer?.files;
        if (!files || !storage || files.length === 0) return;
        setUploading(true);

        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            const lowerName = file.name.toLowerCase();

            // --- 智能分類邏輯 ---
            // 如果有強制指定 (例如拖曳到特定區域)，就用指定的；否則由 AI 檔名判斷
            let autoType: 'vehicle' | 'document' = forcedType || 'vehicle';
            if (!forcedType) {
                if (file.type === 'application/pdf' || lowerName.includes('id') || lowerName.includes('br') || lowerName.includes('scan') || lowerName.includes('doc')) {
                    autoType = 'document';
                }
            }

            try {
                // --- 1. 處理 PDF (自動拆解成多張 JPG) ---
                if (file.type === 'application/pdf') {
                    const pdfjsLib = await import('pdfjs-dist');
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    
                    const MAX_PAGES = Math.min(pdf.numPages, 10); // 最多拆 10 頁保護機制
                    for (let p = 1; p <= MAX_PAGES; p++) {
                        const page = await pdf.getPage(p);
                        const viewport = page.getViewport({ scale: 2.0 });
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = viewport.width; 
                        canvas.height = viewport.height;
                        if (ctx) {
                            await page.render({ canvasContext: ctx, viewport } as any).promise;
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                            // PDF 拆出來的圖片，強制歸類為 document
                            await uploadToStorage(dataUrl, `${file.name}_P${p}.jpg`, 'document');
                        }
                    }
                    continue; // 處理完 PDF 直接換下一個檔案
                }

                // --- 2. 處理 HEIC/HEIF (iPhone 專有格式轉換) ---
                if (lowerName.endsWith('.heic') || lowerName.endsWith('.heif')) {
                    // @ts-ignore
                    const heic2any = (await import('heic2any')).default;
                    const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 }) as Blob;
                    
                    // ★ 加上 window.File，完美避開與 lucide-react 圖示撞名的問題！
                    file = new window.File([convertedBlob], file.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' });
                }

                // --- 3. 一般圖片壓縮與上傳 ---
                // 文件保留較高畫質 (250KB)，車輛照片維持 (130KB)
                const compressedBase64 = await compressImage(file, autoType === 'document' ? 250 : 130); 
                await uploadToStorage(compressedBase64, file.name, autoType);

            } catch (err) { 
                console.error(`處理 ${file.name} 失敗:`, err); 
            }
        }
        setUploading(false);
    };

    // ★★★ 輔助函數：核心上傳寫入資料庫 ★★★
    const uploadToStorage = async (base64Data: string, fileName: string, type: 'vehicle' | 'document') => {
        const filePath = `media/${appId}/${Date.now()}_${fileName}`;
        const storageRef = ref(storage, filePath);
        await uploadString(storageRef, base64Data, 'data_url');
        const downloadURL = await getDownloadURL(storageRef);
        
        await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library'), { 
            url: downloadURL, 
            path: filePath, 
            fileName: fileName, 
            tags: ["Inbox"], 
            status: 'unassigned', 
            mediaType: type, // ★ 寫入新的分類標籤
            aiData: {}, 
            createdAt: serverTimestamp(), 
            uploadedBy: staffId 
        });
    };

    // ★★★ Feature 3: 剪貼簿貼上上傳 (iPhone 友善) ★★★
    const handlePasteUpload = async () => {
        try {
            // 需要瀏覽器權限 (通常要在 HTTPS 下運作)
            const clipboardItems = await navigator.clipboard.read();
            setUploading(true);
            let hasImage = false;

            for (const item of clipboardItems) {
                const imageType = item.types.find(t => t.startsWith('image/'));
                if (imageType) {
                    hasImage = true;
                    const blob = await item.getType(imageType);
                    const file = new window.File([blob], `pasted_${Date.now()}.png`, { type: imageType });
                    
                    // 復用壓縮邏輯
                    const compressedBase64 = await compressImage(file, 130);
                    const filePath = `media/${appId}/${Date.now()}_${file.name}`;
                    const storageRef = ref(storage, filePath);
                    await uploadString(storageRef, compressedBase64, 'data_url');
                    const downloadURL = await getDownloadURL(storageRef);
                    
                    await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library'), { 
                        url: downloadURL, path: filePath, fileName: file.name, tags: ["Inbox", "Pasted"], 
                        status: 'unassigned', aiData: {}, createdAt: serverTimestamp(), uploadedBy: staffId 
                    });
                }
            }
            if (!hasImage) alert("剪貼簿中沒有圖片 / No Image found");
        } catch (err) {
            console.error(err);
            alert("無法讀取剪貼簿 (需使用 HTTPS 或在 Safari 手動允許)");
        } finally {
            setUploading(false);
        }
    };

    const handleSetPrimary = async (targetId: string, groupItems: MediaLibraryItem[]) => {
        if (!db) return;
        const batch = writeBatch(db);
        groupItems.forEach(item => { if (item.isPrimary) batch.update(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', item.id), { isPrimary: false }); });
        batch.update(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', targetId), { isPrimary: true });
        await batch.commit();
    };

    // ★★★ 修正版：使用正確的屬性名稱 item.path ★★★
    const handleDeleteImage = async (item: MediaLibraryItem) => {
        // 1. 跳出確認對話框
        const confirmDelete = window.confirm("確定要永久刪除這張圖片嗎？\n此操作無法復原。");
        if (!confirmDelete) return;

        try {
            // 2. 先刪除 Firebase Storage 中的實體檔案
            // 修正：這裡要用 item.path，因為您的類型定義是 path
            if (item.path) {
                const storageRef = ref(storage, item.path);
                await deleteObject(storageRef);
            }

            // 3. 再刪除 Firestore 中的資料庫文檔
            await deleteDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', item.id));
            
            // 簡單提示
            // alert("刪除成功"); // 可選，如果不想要彈窗干擾可拿掉

        } catch (error) {
            console.error("Error deleting image:", error);
            alert("刪除失敗，可能是權限不足或檔案不存在。");
        }
    };

    // ★★★ 新增：將圖片退回「待處理區 (Inbox)」 ★★★
    const handleReturnToInbox = async (item: MediaLibraryItem) => {
        if (!confirm("確定要將此圖片退回「待處理區」並解除車輛綁定嗎？")) return;
        if (!db) return;
        try {
            const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', item.id);
            await updateDoc(docRef, {
                status: 'unassigned',
                relatedVehicleId: null, // 解除綁定
                updatedAt: serverTimestamp()
            });
            // 如果退回的是當前選中的大圖，清空預覽狀態
            setActiveGroupImages(prev => {
                const newState = { ...prev };
                delete newState[item.relatedVehicleId || ''];
                return newState;
            });
        } catch (err) {
            console.error(err);
            alert("退回失敗");
        }
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

    const inboxItems = mediaItems.filter(i => i.status === 'unassigned' || !i.status);

    return (
        <div className="flex flex-col h-full bg-slate-100 p-2 overflow-hidden relative">
            
            {/* ★★★ 新增：手機版頂部 Tab 切換 (僅手機顯示 md:hidden) ★★★ */}
            <div className="flex md:hidden bg-white rounded-lg p-1 mb-2 shadow-sm shrink-0 gap-1">
                <button 
                    onClick={() => setMobileTab('inbox')} 
                    className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center transition-colors ${mobileTab==='inbox' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Upload size={14} className="mr-1.5"/> 1. 來源
                    {inboxItems.length > 0 && <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center">{inboxItems.length}</span>}
                </button>
                <button 
                    onClick={() => setMobileTab('classify')} 
                    className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center transition-colors ${mobileTab==='classify' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Settings size={14} className="mr-1.5"/> 2. 歸類
                    {selectedInboxIds.length > 0 && <span className="ml-1 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center">{selectedInboxIds.length}</span>}
                </button>
                <button 
                    onClick={() => setMobileTab('gallery')} 
                    className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center transition-colors ${mobileTab==='gallery' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <ImageIcon size={14} className="mr-1.5"/> 3. 圖庫
                </button>
            </div>

            <div className="flex flex-1 md:flex-row h-full gap-4 overflow-hidden">
                
                {/* --- 左欄：來源 (Inbox) 智能上下分層版 --- */}
                <div className={`w-full md:w-[28%] bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[500px] transition-all duration-300 ${mobileTab === 'inbox' ? 'flex' : 'hidden md:flex'}`}>
                    
                    {/* 頂部工具列 (保留了貼上功能) */}
                    <div className="p-3 border-b bg-slate-50 flex justify-between items-center flex-none">
                        <h3 className="font-bold text-slate-800 flex items-center"><Upload size={16} className="mr-2 text-blue-600"/> 待處理區 ({inboxItems.length})</h3>
                        <div className="flex gap-2">
                            <button onClick={handlePasteUpload} disabled={uploading} className="bg-white border border-slate-300 text-slate-600 px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-100 flex items-center shadow-sm disabled:opacity-50">
                                <Clipboard size={14} className="mr-1"/> 貼上
                            </button>
                            <label className={`bg-blue-600 text-white px-2 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-700 flex items-center shadow-sm ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                {uploading ? <Loader2 className="animate-spin mr-1" size={12}/> : <Plus size={12} className="mr-1"/>} 匯入
                                {/* ★ 支援選擇 PDF 與 HEIC 檔案 */}
                                <input type="file" multiple accept="image/*,application/pdf,.heic,.heif" className="hidden" onChange={(e) => handleSmartUpload(e)} disabled={uploading}/>
                            </label>
                        </div>
                    </div>

                    {/* 下方雙層區域 (車輛相片區 & 文件資料區) */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {['vehicle', 'document'].map((zoneType) => {
                            // 過濾屬於該區的圖片 (預設沒有標籤的也算在 vehicle 區)
                            const zoneItems = inboxItems.filter(i => (zoneType === 'vehicle' ? i.mediaType !== 'document' : i.mediaType === 'document'));
                            
                            return (
                                <div 
                                    key={zoneType}
                                    className={`h-1/2 flex flex-col border-b-4 border-slate-300 relative transition-all duration-200`}
                                    // ★★★ 拖曳感應特效 ★★★
                                    onDragOver={(e) => { 
                                        e.preventDefault(); 
                                        e.currentTarget.classList.add(zoneType === 'vehicle' ? 'bg-slate-200' : 'bg-indigo-100', 'ring-4', zoneType === 'vehicle' ? 'ring-slate-400' : 'ring-indigo-400', 'ring-inset'); 
                                    }}
                                    onDragLeave={(e) => { 
                                        e.preventDefault(); 
                                        e.currentTarget.classList.remove('bg-slate-200', 'bg-indigo-100', 'ring-4', 'ring-slate-400', 'ring-indigo-400', 'ring-inset'); 
                                    }}
                                    onDrop={async (e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.remove('bg-slate-200', 'bg-indigo-100', 'ring-4', 'ring-slate-400', 'ring-indigo-400', 'ring-inset');
                                        
                                        // 1. 處理「內部圖片上下拖曳」 (改變分類)
                                        const dragId = e.dataTransfer.getData('text/plain');
                                        if (dragId) {
                                            const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', dragId);
                                            await updateDoc(docRef, { mediaType: zoneType, updatedAt: serverTimestamp() });
                                            return;
                                        }
                                        
                                        // 2. 處理「從電腦外部拖檔案進來」 (指定分類上傳)
                                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                            const mockEvent = { target: { files: e.dataTransfer.files } };
                                            handleSmartUpload(mockEvent, zoneType as any); // 強制分類
                                        }
                                    }}
                                >
                                    {/* 區域標題條 */}
                                    <div className={`p-1.5 text-[10px] font-bold text-center text-white shadow-md flex items-center justify-center gap-2 ${zoneType === 'vehicle' ? 'bg-slate-800' : 'bg-indigo-600'}`}>
                                        {zoneType === 'vehicle' ? <><Car size={14}/> 🚗 車輛相片區 (Vehicle)</> : <><FileText size={14}/> 📄 文件資料區 (Document)</>}
                                    </div>
                                    
                                   {/* 圖片網格 (完美防重疊瀑布流版) */}
                                    <div className={`flex-1 overflow-y-auto p-2 columns-2 md:columns-3 gap-2 space-y-2 ${zoneType === 'vehicle' ? 'bg-slate-100' : 'bg-indigo-50/50'}`}>
                                        {zoneItems.map(item => (
                                            <div 
                                                key={item.id} 
                                                draggable // ★ 允許拖曳
                                                onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)} // 記錄被拖曳的 ID
                                                onClick={() => setSelectedInboxIds(p => p.includes(item.id) ? p.filter(i=>i!==item.id) : [...p, item.id])} 
                                                // ★ 核心修復：加入 break-inside-avoid, inline-block, w-full，並移除強制正方形的 aspect-square
                                                className={`relative rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all group shadow-sm break-inside-avoid inline-block w-full ${selectedInboxIds.includes(item.id) ? 'ring-4 ring-blue-500 opacity-100 scale-95' : 'opacity-90 hover:opacity-100 hover:shadow-md'}`}
                                            >
                                                {/* 圖片預覽 (改為自然高度 h-auto，不再強制裁切) */}
                                                <img src={item.url} className="w-full h-auto block bg-black/5"/>
                                                
                                                {/* 選取打勾 */}
                                                {selectedInboxIds.includes(item.id) && <div className="absolute top-0 right-0 bg-blue-600 text-white p-0.5 z-10 rounded-bl-md"><Check size={12}/></div>}
                                                
                                                {/* 懸浮操作按鈕 */}
                                                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                    <button onClick={(e) => { e.stopPropagation(); setPreviewImage(item.url); }} className="p-1 rounded-full bg-black/60 hover:bg-blue-500 text-white backdrop-blur-sm" title="預覽"><Maximize2 size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingMedia(item); }} className="p-1 rounded-full bg-black/60 hover:bg-amber-500 text-white backdrop-blur-sm" title="編輯圖片"><Edit size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteImage(item); }} className="p-1 rounded-full bg-black/60 hover:bg-red-500 text-white backdrop-blur-sm" title="刪除"><Trash2 size={12} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    
                                        {/* 空狀態提示 */}
                                        {zoneItems.length === 0 && (
                                            <div className={`col-span-3 py-8 text-center text-xs font-bold border-2 border-dashed rounded-xl m-1 ${zoneType === 'vehicle' ? 'text-slate-400 border-slate-300' : 'text-indigo-300 border-indigo-200'}`}>
                                                拖曳 {zoneType === 'vehicle' ? '相片' : '文件或 PDF'} 至此
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* --- 中欄：歸類工作台 --- */}
                {/* 邏輯：手機上只在 mobileTab === 'classify' 時顯示 */}
                <div className={`w-full md:w-1/4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[250px] ${mobileTab === 'classify' ? 'flex' : 'hidden md:flex'}`}>
                    <div className="p-3 border-b bg-slate-50 flex items-center"><h3 className="font-bold text-slate-700 flex items-center"><Settings size={16} className="mr-2"/> 歸類</h3><span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">已選: {selectedInboxIds.length}</span></div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                            <label className="text-[10px] font-bold text-blue-800 mb-1 block">配對庫存</label>
                            
                            {/* ★★★ 4.2 增加搜尋框 ★★★ */}
                            <input 
                                type="text" 
                                placeholder="輸入車牌或型號篩選..." 
                                value={classifySearch}
                                onChange={e => setClassifySearch(e.target.value)}
                                className="w-full p-1.5 text-xs border rounded mb-2 outline-none focus:border-blue-400"
                            />

                            <select value={targetVehicleId} onChange={(e) => { 
                                const vId = e.target.value; 
                                setTargetVehicleId(vId); 
                                const v = inventory.find((i:any) => i.id === vId); 
                                if (v) setClassifyForm(prev => ({ ...prev, make: v.make || '', model: v.model || '', year: v.year || '', color: v.colorExt || '' })); 
                            }} className="w-full p-1 text-xs border rounded">
                                <option value="">-- 手動 / 不關聯 --</option>
                                
                                {/* ★★★ 4.1 排序並篩選 ★★★ */}
                                {inventory
                                    .filter((v: Vehicle) => {
                                        const search = classifySearch.toUpperCase();
                                        return !search || (v.regMark || '').includes(search) || (v.model || '').toUpperCase().includes(search);
                                    })
                                    .sort((a: Vehicle, b: Vehicle) => (a.regMark || '').localeCompare(b.regMark || '')) // 字母排序
                                    .map((v: Vehicle) => (
                                        <option key={v.id} value={v.id}>
                                            {v.regMark || '(未出牌)'} - {v.make} {v.model}
                                        </option>
                                    ))
                                }
                            </select>
                        </div>
                        <div className="space-y-2">
                            <div><label className="text-[10px] font-bold text-slate-500">Year</label><input value={classifyForm.year} onChange={e => setClassifyForm({...classifyForm, year: e.target.value})} className="w-full p-1 border rounded text-xs"/></div>
                            <div><label className="text-[10px] font-bold text-slate-500">Make</label><input list="makeList" value={classifyForm.make} onChange={e => setClassifyForm({...classifyForm, make: e.target.value})} className="w-full p-1 border rounded text-xs"/><datalist id="makeList">{settings?.makes?.map((m:string) => <option key={m} value={m}/>)}</datalist></div>
                            <div><label className="text-[10px] font-bold text-slate-500">Model</label><input list="modelList" value={classifyForm.model} onChange={e => setClassifyForm({...classifyForm, model: e.target.value})} className="w-full p-1 border rounded text-xs"/><datalist id="modelList">{(settings?.models?.[classifyForm.make] || []).map((m:string) => <option key={m} value={m}/>)}</datalist></div>
                            <div><label className="text-[10px] font-bold text-slate-500">Color</label><input list="colorList" value={classifyForm.color} onChange={e => setClassifyForm({...classifyForm, color: e.target.value})} className="w-full p-1 border rounded text-xs"/><datalist id="colorList">{settings?.colors?.map((c:string) => <option key={c} value={c}/>)}</datalist></div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 mb-1 block">Type</label>
                                <div className="flex gap-1">
                                    {['外觀', '內飾', '文件'].map(t => (
                                        <button key={t} onClick={() => setClassifyForm({...classifyForm, type: t as any})} className={`text-[10px] py-1 px-2 rounded border ${classifyForm.type.includes(t) ? 'bg-blue-600 text-white' : 'bg-white'}`}>{t}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* 點擊歸檔後，自動跳轉到圖庫 Tab */}
                    <div className="p-3 border-t bg-slate-50"><button onClick={() => { handleClassify(); setMobileTab('gallery'); }} disabled={selectedInboxIds.length === 0} className="w-full bg-slate-800 text-white py-2 rounded-lg text-xs font-bold disabled:opacity-50">歸檔</button></div>
                </div>

                {/* --- 右欄：車輛圖庫 --- */}
                {/* 邏輯：手機上只在 mobileTab === 'gallery' 時顯示 */}
                <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden ${mobileTab === 'gallery' ? 'flex' : 'hidden md:flex'}`}>
                    <div className="p-3 border-b bg-slate-50 flex justify-between items-center gap-2">
                        <h3 className="font-bold text-slate-700 flex items-center"><ImageIcon size={18} className="mr-2"/> 圖庫</h3>
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜尋..." className="w-32 md:w-48 px-2 py-1 text-xs border rounded-full"/>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 space-y-4">
                        {/* 操作小說明 */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 text-xs text-amber-800">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0 mt-0.5"/>
                            <div>
                                <p className="font-bold">圖庫管理說明：</p>
                                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-amber-700">
                                    <li>點擊圖片左上角的 <span className="font-bold text-yellow-600">星星</span> 可設為該車輛的首圖 (封面)。</li>
                                    <li>點擊右上角的 <span className="font-bold text-red-600">垃圾桶</span> 可永久刪除圖片。</li>
                                    <li>點擊圖片本身可放大預覽。</li>
                                </ul>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {libraryGroups.map(group => {
                                const isExpanded = expandedGroupKey === group.key;
                                
                                // ★ 取得目前這組正在查看的「當前圖片 (Active Item)」
                                const currentActiveImgUrl = activeGroupImages[group.key] || group.items[0]?.url;
                                const activeItem = group.items.find(img => img.url === currentActiveImgUrl) || group.items[0];

                                return (
                                    <div key={group.key} className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ${isExpanded ? 'col-span-full ring-2 ring-blue-500/50 shadow-lg' : 'hover:border-blue-300'}`}>
                                        
                                        {/* ===================================== */}
                                        {/* 1. 頂部標題與現代化工具列 */}
                                        {/* ===================================== */}
                                        <div className="p-3 flex justify-between items-center bg-white border-b border-slate-100 transition-colors cursor-pointer hover:bg-slate-50" onClick={() => setExpandedGroupKey(isExpanded ? null : group.key)}>
                                            
                                            {/* 左側：車輛資訊 (修復排版：只顯示車牌、數量、狀態) */}
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                
                                                {/* 縮圖優化：改為 4:3 比例，更適合車輛照片 */}
                                                <div className="w-16 h-12 rounded-md bg-slate-900 flex-shrink-0 overflow-hidden relative shadow-inner">
                                                    {group.items[0] ? (
                                                         <img src={group.items[0].url} className="w-full h-full object-cover opacity-90"/>
                                                    ) : (
                                                         <div className="flex items-center justify-center h-full text-slate-400"><ImageIcon size={20}/></div>
                                                    )}
                                                </div>
                                                
                                                {/* 資訊區 (鎖死防走位) */}
                                                <div className="flex flex-col justify-center min-w-0 gap-1.5">
                                                    {(() => {
                                                        // 從庫存中找對應的車輛來抓取車牌
                                                        const linkedCar = inventory.find((v:any) => v.id === group.key);
                                                        const displayPlate = linkedCar?.regMark || '';
                                                        
                                                        return displayPlate ? (
                                                            // 顯示搶眼的黃底黑字車牌
                                                            <span className="bg-[#FFD600] text-black border border-black font-black font-mono text-[11px] px-1.5 py-0.5 rounded-[3px] shadow-sm w-max truncate leading-none">
                                                                {displayPlate}
                                                            </span>
                                                        ) : (
                                                            // 如果是未關聯的車輛，顯示原本的 AI 識別短標題
                                                            <span className="font-bold text-sm text-slate-800 truncate w-full">
                                                                {group.title.split(' (')[0]}
                                                            </span>
                                                        );
                                                    })()}
                                                    
                                                    {/* 數量與狀態 (加上 whitespace-nowrap 強制同行顯示，絕對不換行) */}
                                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                        <span className="text-[10px] text-slate-600 font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-[4px] flex items-center leading-none">
                                                            <ImageIcon size={10} className="mr-1"/> {group.items.length}
                                                        </span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-[4px] font-bold shadow-sm leading-none ${
                                                            group.status === 'In Stock' ? 'bg-green-500 text-white' : 
                                                            group.status === 'Reserved' ? 'bg-yellow-500 text-white' :
                                                            group.status === 'Sold' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                            {group.status === 'In Stock' ? '在庫' : group.status === 'Reserved' ? '已訂' : group.status === 'Sold' ? '已售' : group.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 右側：工具列 + 展開按鈕 */}
                                            <div className="flex items-center gap-4 pr-1">
                                                {/* ★ 只有在展開且有選中圖片時，才顯示工具列 */}
                                                {isExpanded && activeItem && (
                                                    <div className="flex items-center bg-slate-100 p-1 rounded-lg shadow-inner" onClick={e => e.stopPropagation()}>
                                                        
                                                        <button onClick={() => handleReturnToInbox(activeItem)} className="p-1.5 rounded-md hover:bg-white text-slate-500 hover:text-blue-600 transition-colors tooltip-trigger" title="退回待處理區">
                                                            <Upload size={16} className="transform rotate-180"/>
                                                        </button>
                                                        
                                                        <div className="w-px h-4 bg-slate-300 mx-1"></div>
                                                        
                                                        <button onClick={() => handleSetPrimary(activeItem.id, group.items)} className={`p-1.5 rounded-md transition-colors ${activeItem.isPrimary ? 'bg-yellow-500 text-white shadow-sm' : 'hover:bg-white text-slate-500 hover:text-yellow-600'}`} title="設為車輛封面">
                                                            <Star size={16} className={activeItem.isPrimary ? 'fill-white' : ''}/>
                                                        </button>
                                                        
                                                        <div className="w-px h-4 bg-slate-300 mx-1"></div>

                                                        <button onClick={() => setEditingMedia(activeItem)} className="p-1.5 rounded-md hover:bg-white text-slate-500 hover:text-indigo-600 transition-colors" title="編輯圖片 (排版/遮車牌)">
                                                            <Edit size={16}/>
                                                        </button>
                                                        
                                                        <button onClick={() => handleDeleteImage(activeItem)} className="p-1.5 rounded-md hover:bg-white text-slate-500 hover:text-red-500 transition-colors" title="永久刪除">
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {/* 展開/收合圖示 */}
                                                <div className="text-slate-400 bg-slate-50 p-2 rounded-full hover:bg-slate-200 transition-colors">
                                                    {isExpanded ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* ===================================== */}
                                        {/* 2. 展開後的內容區：大圖預覽 + 乾淨縮圖列 */}
                                        {/* ===================================== */}
                                        {isExpanded && activeItem && (
                                            <div className="p-4 bg-slate-50/50 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">

                                                {/* ★★★ 新增：展開時顯示完整的「年份 + 廠牌 + 型號」 ★★★ */}
                                                <div className="w-full max-w-4xl mb-3 flex justify-between items-center px-1">
                                                    <span className="text-sm font-bold text-slate-700 bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-200 flex items-center">
                                                        <Car size={14} className="mr-2 text-blue-500"/>
                                                        {/* 利用 split(' (')[0] 自動去掉括號內的車牌，只顯示乾淨的車型資訊 */}
                                                        {group.title.split(' (')[0] || '未分類車輛'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 hidden md:block">點擊圖片可全螢幕預覽</span>
                                                </div>
                                                
                                                {/* 上方：嚴格 4:3 的完美大圖預覽 */}
                                                <div className="w-full max-w-4xl aspect-[4/3] bg-slate-900 rounded-xl relative overflow-hidden shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] cursor-zoom-in group mb-4" onClick={() => setPreviewImage(activeItem.url)}>
                                                    <img src={activeItem.url} className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-125 transition-transform duration-700" />
                                                    <img src={activeItem.url} className="relative z-10 w-full h-full object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-105" />
                                                    <div className="absolute bottom-3 right-3 z-20 bg-black/60 text-white text-[10px] px-3 py-1.5 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                                                        點擊全螢幕放大
                                                    </div>
                                                </div>
                                                
                                                {/* 下方：乾淨的縮圖導航列 */}
                                                <div className="w-full max-w-4xl bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                                    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-300">
                                                        {group.items.map(img => (
                                                            <div 
                                                                key={img.id} 
                                                                onClick={() => setActiveGroupImages(prev => ({...prev, [group.key]: img.url}))}
                                                                className={`relative w-24 aspect-[4/3] flex-shrink-0 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${activeItem.id === img.id ? 'ring-4 ring-blue-500 ring-offset-1 border-transparent scale-95' : 'border-2 border-transparent hover:border-slate-300 opacity-70 hover:opacity-100'}`}
                                                            >
                                                                <img src={img.url} className="w-full h-full object-cover" />
                                                                
                                                                {/* 僅用微小的角標提示是否為封面 */}
                                                                {img.isPrimary && (
                                                                    <div className="absolute top-1 left-1 bg-yellow-500/90 rounded-full p-1 backdrop-blur-sm shadow-sm">
                                                                        <Star size={10} className="text-white fill-white"/>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {previewImage && (<div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}><img src={previewImage} className="max-w-full max-h-[90vh] object-contain"/><button className="absolute top-4 right-4 text-white"><X size={32}/></button></div>)}
            {/* 圖片編輯器彈窗 */}
            {editingMedia && (
                <ImageEditorModal 
                    mediaItem={editingMedia} 
                    onClose={() => setEditingMedia(null)} 
                    onSave={handleSaveEditedImage} 
                />
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
// ★★★ 新增：運輸署業務打包系統 (TD Task Pack Generator) ★★★
// ------------------------------------------------------------------
const TDTaskPackModal = ({ vehicle, onClose }: any) => {
    const [taskType, setTaskType] = useState('TD22');
    
    const taskConfigs: Record<string, any> = {
        'TD22': {
            name: '車輛過戶 (TD22)',
            title: '運輸署 - 車輛過戶代辦清單',
            docs: ['買賣雙方已簽署的 TD22 表格正本', '買賣雙方身份證副本 (或公司 BR 副本)', '車輛登記文件 (牌簿 VRD) 正本', '新車主名下的有效汽車保險 (Cover Note)', '最近三個月內的地址證明'],
            fee: '$1,000 (過戶費)'
        },
        'TD558': {
            name: '續領牌費 (TD558)',
            title: '運輸署 - 續領車輛牌照代辦清單',
            docs: ['已簽署的 TD558 表格正本', '登記車主身份證副本', '車輛登記文件 (牌簿 VRD) 正本', '有效汽車保險 (涵蓋新牌照期)', '最近三個月內的地址證明', '驗車合格證明書 (如車齡超過6年)'],
            fee: '視乎引擎容積 (預設 $5,074 或以上)'
        },
        'TD148': {
            name: '留用/套用車牌 (TD148)',
            title: '運輸署 - 留用/套用車牌代辦清單',
            docs: ['已簽署的 TD148 表格正本', '登記車主身份證副本', '車輛登記文件 (牌簿 VRD) 正本', '地址證明'],
            fee: '$560 (留牌費)'
        }
    };

    const handlePrintPack = () => {
        const config = taskConfigs[taskType];
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('請允許瀏覽器彈出視窗以進行列印');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>運輸署辦理打包單 - ${vehicle.regMark}</title>
                <style>
                    @page { size: A4; margin: 20mm; }
                    body { font-family: "Helvetica Neue", "Microsoft JhengHei", sans-serif; color: #333; line-height: 1.6; }
                    .header { border-bottom: 3px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
                    .header h1 { margin: 0; color: #1e3a8a; font-size: 24px; }
                    .header .meta { text-align: right; font-size: 12px; color: #666; }
                    .section { margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
                    .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #1e40af; border-left: 4px solid #3b82f6; padding-left: 10px; margin-top: 0; }
                    table { border-collapse: collapse; width: 100%; font-size: 14px; }
                    th, td { padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: left; }
                    th { width: 30%; color: #64748b; font-weight: normal; }
                    td { font-weight: bold; color: #0f172a; }
                    .checklist { list-style: none; padding: 0; margin: 0; font-size: 14px; }
                    .checklist li { margin-bottom: 12px; display: flex; align-items: flex-start; }
                    .checkbox { width: 16px; height: 16px; border: 2px solid #94a3b8; border-radius: 4px; margin-right: 12px; margin-top: 2px; flex-shrink: 0; }
                    .footer { margin-top: 40px; font-size: 12px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
                    .sign-box { margin-top: 30px; display: flex; justify-content: space-between; }
                    .sign-line { border-bottom: 1px solid #333; width: 200px; margin-top: 40px; text-align: center; padding-bottom: 5px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>${config.title}</h1>
                        <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 18px;">車牌號碼: ${vehicle.regMark || '未出牌'}</p>
                    </div>
                    <div class="meta">
                        列印日期: ${new Date().toLocaleDateString('zh-HK')}<br/>
                        系統編號: ${vehicle.id ? vehicle.id.substring(0, 8).toUpperCase() : 'N/A'}
                    </div>
                </div>

                <div class="section">
                    <h3 class="section-title">車輛與車主預填資料 (Vehicle & Owner Info)</h3>
                    <table>
                        <tr><th>廠牌及型號 (Make & Model)</th><td>${vehicle.make || '-'} ${vehicle.model || '-'}</td></tr>
                        <tr><th>製造年份 (Year of Mfg)</th><td>${vehicle.year || '-'}</td></tr>
                        <tr><th>底盤號碼 (Chassis No.)</th><td style="font-family: monospace;">${vehicle.chassisNo || '-'}</td></tr>
                        <tr><th>引擎號碼 (Engine No.)</th><td style="font-family: monospace;">${vehicle.engineNo || '-'}</td></tr>
                        <tr><th>登記車主 (Registered Owner)</th><td>${vehicle.registeredOwnerName || vehicle.customerName || '-'}</td></tr>
                        <tr><th>身份證/公司編號 (ID/CI No.)</th><td>${vehicle.registeredOwnerId || vehicle.customerID || '-'}</td></tr>
                        <tr><th>車主地址 (Address)</th><td>${vehicle.customerAddress || '-'}</td></tr>
                    </table>
                </div>

                <div class="section">
                    <h3 class="section-title">必須攜帶文件清單 (Required Documents Checklist)</h3>
                    <ul class="checklist">
                        ${config.docs.map((doc: string) => `<li><div class="checkbox"></div><span>${doc}</span></li>`).join('')}
                    </ul>
                    <div style="margin-top: 15px; padding: 10px; background-color: #f8fafc; border-radius: 4px; font-size: 12px; border-left: 3px solid #f59e0b;">
                        <strong>政府規費預算:</strong> ${config.fee} (請備妥足夠現金或支票)
                    </div>
                </div>

                <div class="sign-box">
                    <div>
                        <div class="sign-line"></div>
                        <div>負責同事簽收 (Handled By)</div>
                    </div>
                    <div>
                        <div class="sign-line"></div>
                        <div>日期 (Date)</div>
                    </div>
                </div>

                <div class="footer">
                    Gold Land Auto DMS - 自動生成之辦理清單 (內部文件)
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center">🖨️ 生成運輸署業務打包單</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full"><X size={20}/></button>
                </div>
                
                <div className="p-5 bg-slate-50 border-b border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 mb-2">1. 選擇辦理業務類型</label>
                    <select 
                        value={taskType} 
                        onChange={(e) => setTaskType(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 font-bold text-slate-800 outline-none focus:ring-2 ring-blue-500 cursor-pointer"
                    >
                        {Object.keys(taskConfigs).map(key => (
                            <option key={key} value={key}>{taskConfigs[key].name}</option>
                        ))}
                    </select>
                </div>

                <div className="p-5 flex-1">
                    <h4 className="text-xs font-bold text-slate-500 mb-3">文件查核預覽 (Checklist)</h4>
                    <div className="space-y-2">
                        {taskConfigs[taskType].docs.map((doc: string, idx: number) => (
                            <div key={idx} className="flex items-start text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                                <div className="w-4 h-4 border-2 border-slate-400 rounded mr-3 mt-0.5 shrink-0 bg-white"></div>
                                <span>{doc}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-white border-t border-slate-200">
                    <button 
                        onClick={handlePrintPack}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center"
                    >
                        生成並列印打包單 (PDF)
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-3">
                        提示：系統會自動將 {vehicle.regMark} 的車身及車主資料填入清單中，方便同事核對。
                    </p>
                </div>
            </div>
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

    const [showTdPackModal, setShowTdPackModal] = useState(false);
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
                                                
                                                {/* ★★★ 這裡掛載剛剛寫好的 Modal ★★★ */}
                                                {showTdPackModal && (
                                                    <TDTaskPackModal 
                                                        vehicle={editingVehicle} 
                                                        onClose={() => setShowTdPackModal(false)} 
                                                    />
                                                )}

                                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <h4 className="font-bold text-slate-700 flex items-center">
                                                            <Clipboard size={18} className="mr-2 text-blue-500"/> 資料準備
                                                        </h4>
                                                        {/* ★★★ 這裡加入觸發按鈕 ★★★ */}
                                                        <button 
                                                            onClick={() => setShowTdPackModal(true)}
                                                            className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-100 font-bold shadow-sm transition-transform active:scale-95"
                                                        >
                                                            🖨️ 生成 TD 打包單
                                                        </button>
                                                    </div>
                                                    
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
    updateVehicle, primaryImages // 必須傳入此函數以支援文件交收
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

    // 提醒邏輯 (已升級支援開關)
    const expiredItems: any[] = []; const soonItems: any[] = [];
    cbVehicles.forEach((v:any) => { 
        Object.entries(dateFields).forEach(([fieldKey, label]) => { 
            const dateStr = (v.crossBorder as any)?.[fieldKey]; 
            // ★ 判斷開關
            const reminderKey = fieldKey.replace('date', 'cb_remind_');
            const isRemind = (v.crossBorder as any)?.[reminderKey] !== false;
            
            if (dateStr && isRemind) { 
                const days = getDaysRemaining(dateStr); 
                if (days !== null) { 
                    const itemData = { vid: v.id!, plate: v.regMark || '未出牌', item: label, date: dateStr, days: days }; 
                    if (days < 0) expiredItems.push(itemData); 
                    else if (days <= 30) soonItems.push(itemData); 
                } 
            } 
        }); 
    });
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
                            Object.keys(dateFields).forEach(k => { 
                                const d = (car.crossBorder as any)?.[k]; 
                                // ★ 判斷開關
                                const reminderKey = k.replace('date', 'cb_remind_');
                                const isRemind = (car.crossBorder as any)?.[reminderKey] !== false;
                                
                                if(d && isRemind && getDaysRemaining(d)! < 0) expiredCount++; 
                            });
                            
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
                                <div 
                                    key={car.id} 
                                    onClick={() => setActiveCbVehicleId(car.id)} 
                                    onDoubleClick={() => setEditingVehicle(car)} // ★ 新增：雙擊直接開啟車輛詳情大視窗
                                    className={`p-2.5 rounded-lg cursor-pointer border transition-all flex gap-3 items-center ${activeCbVehicleId === car.id ? 'bg-blue-50 border-blue-300 shadow-md ring-1 ring-blue-100' : 'bg-white hover:border-blue-100'}`}
                                    title="單擊切換右側中港資訊，雙擊開啟車輛詳細資料"
                                >
                                    
                                    {/* ★★★ 修復：左側縮圖 (使用 primaryImages) ★★★ */}
                                    <div className="w-16 h-12 rounded overflow-visible relative flex-shrink-0 bg-slate-100 border border-slate-200 shadow-inner flex items-center justify-center">
                                        {(() => {
                                            // 完美讀取主儀表板已經解析好的星星首圖
                                            const thumbUrl = primaryImages[car.id] || (car.photos && car.photos.length > 0 ? (typeof car.photos[0] === 'string' ? car.photos[0] : car.photos[0].url) : null);
                                            
                                            if (thumbUrl) {
                                                return <img src={thumbUrl} className="w-full h-full object-cover rounded-[3px]" alt="thumbnail" />;
                                            } else {
                                                return <Car size={18} className="text-slate-300"/>;
                                            }
                                        })()}

                                        {/* 狀態燈號：過期數字紅點 或 正常綠點 */}
                                        {expiredCount > 0 ? (
                                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 border border-white rounded-full flex items-center justify-center animate-pulse shadow-sm z-10">
                                                <span className="text-[9px] text-white font-bold leading-none">{expiredCount}</span>
                                            </div>
                                        ) : (
                                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 border border-white rounded-full shadow-sm z-10"></div>
                                        )}
                                    </div>

                                    {/* 右側：車牌與標籤資訊 */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                                        <div className="flex justify-between items-start mb-1.5">
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
                                            {/* 選擇狀態箭頭 */}
                                            <ChevronRight size={16} className={`ml-auto mt-0.5 ${activeCbVehicleId === car.id ? 'text-blue-500' : 'text-gray-300'}`}/>
                                        </div>
                                        
                                        {/* 標籤區 */}
                                        <div className="flex flex-wrap gap-1 items-center justify-between mt-1">
                                            <div className="flex gap-1">
                                                {cbTags.map((tag: any, i: number) => (
                                                    <span key={i} className={`text-[9px] px-1 py-0.5 rounded font-bold ${tag.color}`}>{tag.label}</span>
                                                ))}
                                            </div>
                                            {car.crossBorder?.quotaNumber && (
                                                <span className="text-[9px] font-mono text-gray-400 truncate max-w-[60px]">#{car.crossBorder.quotaNumber}</span>
                                            )}
                                        </div>
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
// ★★★ 新增：員工專用修改密碼彈窗 (Change Password Modal) ★★★
// ------------------------------------------------------------------
const ChangePasswordModal = ({ isOpen, onClose, staffId, systemUsers, updateSystemUsers }: any) => {
    const [oldPwd, setOldPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        const user = systemUsers.find((u:any) => u.email === staffId);
        
        // 1. 驗證邏輯
        if (!user && staffId !== 'BOSS') { setError('找不到使用者資料'); setIsLoading(false); return; }
        if (staffId !== 'BOSS' && user.password !== oldPwd) { setError('❌ 舊密碼輸入錯誤'); setIsLoading(false); return; }
        if (newPwd !== confirmPwd) { setError('❌ 兩次輸入的新密碼不一致'); setIsLoading(false); return; }
        if (newPwd.length < 6) { setError('❌ 新密碼長度至少需要 6 個字元'); setIsLoading(false); return; }

        try {
            // 2. 更新資料庫中的密碼
            if (staffId !== 'BOSS') {
                const newUsers = systemUsers.map((u:any) => u.email === staffId ? { ...u, password: newPwd } : u);
                await updateSystemUsers(newUsers);
            }
            
            // 3. 同步更新 Firebase Auth (如果適用)
            const { getAuth, updatePassword } = await import('firebase/auth');
            const auth = getAuth();
            if (auth.currentUser && staffId !== 'BOSS') {
                await updatePassword(auth.currentUser, newPwd).catch(err => console.warn('Firebase Auth 更新略過:', err));
            }

            alert('✅ 密碼修改成功！下次登入請使用新密碼。');
            setOldPwd(''); setNewPwd(''); setConfirmPwd('');
            onClose();
        } catch (err) {
            setError('密碼修改失敗，請稍後再試或聯絡管理員');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center"><Key size={18} className="mr-2 text-yellow-400"/> 修改登入密碼</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-slate-50">
                    {staffId === 'BOSS' ? (
                        <div className="text-sm text-red-500 font-bold mb-4 bg-red-50 p-3 rounded-lg border border-red-200">
                            BOSS 帳號為系統預設超級管理員，密碼固定為 8888，如需更改請從源碼調整。
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">目前密碼 (Old Password)</label>
                                <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-blue-600 mb-1">新密碼 (New Password)</label>
                                <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="w-full border border-blue-300 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500" required minLength={6} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-blue-600 mb-1">確認新密碼 (Confirm Password)</label>
                                <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="w-full border border-blue-300 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500" required minLength={6} />
                            </div>
                            {error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 font-bold">{error}</div>}
                            <button type="submit" disabled={isLoading} className="w-full mt-4 bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-blue-700 transition-colors flex justify-center items-center">
                                {isLoading ? <Loader2 size={18} className="animate-spin"/> : '確認修改'}
                            </button>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
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
// ★★★ 新增：AI 智能新聞快訊 (實時股票指數 + 匯率翻頁版 + 本月車市銷量) ★★★
// ------------------------------------------------------------------
const SmartNewsTicker = () => {
    const [aiNewsFeed, setAiNewsFeed] = useState([
        { tag: '⏳ 系統提示', text: '正在載入 AI 即時整理的車市與財經快訊...', time: '--:--' }
    ]);

    const [finIndex, setFinIndex] = useState(0);
    const [financialStats, setFinancialStats] = useState([
        { label: '實時金融', value: '載入中...', color: 'text-slate-400' }
    ]);

    // ★ 新增：車輛銷售統計狀態 (預設載入中)
    const [carSalesStats, setCarSalesStats] = useState({
        month: new Date().getMonth() + 1, // 預設顯示當前月份
        evCount: '...',
        petrolCount: '...',
        total: '...'
    });

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
                        newStats.push(
                            { label: '百日圓/港', value: (100 / forexData.rates.JPY).toFixed(2), color: 'text-yellow-400' },
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

        // ★ 呼叫我們自己的 Next.js 後端 API 去獲取香港運輸署數據
        const fetchVehicleStats = async () => {
            try {
                const res = await fetch('/api/td-stats');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.month) {
                        setCarSalesStats({
                            month: data.month,
                            evCount: data.evCount,
                            petrolCount: data.petrolCount,
                            total: data.total
                        });
                    }
                }
            } catch (error) {
                console.error("Vehicle stats fetch error", error);
            }
        };

        checkAndFetchNews();
        fetchRealTimeData(); 
        fetchVehicleStats();
        
        const newsInterval = setInterval(checkAndFetchNews, 10 * 60 * 1000);
        const forexInterval = setInterval(fetchRealTimeData, 5 * 60 * 1000); 
        
        return () => {
            clearInterval(newsInterval);
            clearInterval(forexInterval);
        };
    }, []);

    useEffect(() => {
        const flipInterval = setInterval(() => {
            setFinIndex((prev) => (prev + 1) % financialStats.length);
        }, 3500);
        return () => clearInterval(flipInterval);
    }, [financialStats.length]);

    return (
        <div className="flex items-center bg-slate-100 text-slate-700 rounded-full shadow-inner overflow-hidden w-full border border-slate-200 h-8 relative max-w-5xl mx-auto">
            <style>{`
                @keyframes marquee-inline {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); } 
                }
                .animate-marquee-inline {
                    display: inline-flex;
                    white-space: nowrap;
                    animation: marquee-inline 150s linear infinite;
                }
                .animate-marquee-inline:hover {
                    animation-play-state: paused;
                }
                .mask-edges-inline {
                    -webkit-mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent);
                    mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent);
                }
            `}</style>

            {/* 左側標籤 */}
            <div className="flex-none bg-blue-600 text-white text-[10px] font-bold px-2 md:px-3 h-full flex items-center z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                <Zap size={12} className="mr-1 text-yellow-400 fill-yellow-400 animate-pulse"/> 
                <span className="hidden md:inline">AI 快訊</span>
                <span className="md:hidden">AI</span>
            </div>

            {/* 金融實時翻頁區 (升綠跌紅) */}
            <div className="flex-none bg-slate-800 text-white h-full relative overflow-hidden flex items-center justify-center min-w-[130px] md:min-w-[160px] border-r border-slate-700 z-10 shadow-inner">
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

            {/* ★★★ 右側新增：運輸署私家車銷售情報區 ★★★ */}
            <div className="hidden md:flex flex-none bg-slate-800 text-white h-full px-3 items-center border-l border-slate-700 z-20 shadow-inner">
                <div className="flex items-center gap-3">
                    <div className="text-[9px] text-slate-400 leading-tight border-r border-slate-600 pr-2">
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
                    </div>
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
                    // ★ 讀取該項目的開關狀態
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
// ★★★ 9. Team Hub Drawer (團隊協作中心 - 防走位、摺疊與搜尋版) ★★★
// ------------------------------------------------------------------
const TeamHubDrawer = ({ isOpen, onClose, db, staffId, appId, systemUsers, inventory, setEditingVehicle, currentUser, sendPushNotification }: any) => {
    const [activeTab, setActiveTab] = useState<'notes' | 'chat' | 'tasks'>('notes');
    
    // --- 隨手記 (Notes) 狀態 ---
    const [notes, setNotes] = useState<any[]>([]);
    const [newNote, setNewNote] = useState('');
    const [noteLinkedCar, setNoteLinkedCar] = useState('');
    const [noteSearchQuery, setNoteSearchQuery] = useState(''); // ★ 新增：搜尋關鍵字
    const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({}); // ★ 新增：記錄邊篇筆記被展開

    // --- 對話與任務狀態 ---
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [chatLinkedCar, setChatLinkedCar] = useState(''); 
    
    const [tasks, setTasks] = useState<any[]>([]);
    const [newTask, setNewTask] = useState('');
    const [assignee, setAssignee] = useState('');
    const [taskLinkedCar, setTaskLinkedCar] = useState(''); 

    const [isAiThinking, setIsAiThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ★ 自動插入時間戳魔法
    useEffect(() => {
        if (isOpen && activeTab === 'notes' && newNote === '') {
            const now = new Date();
            const timeStr = `${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            setNewNote(`[${timeStr}] `);
        }
    }, [isOpen, activeTab]);

    // 1. 監聽隨手記 (Notes)
    useEffect(() => {
        if (!db || !isOpen) return;
        const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_notes'), orderBy('timestamp', 'desc'));
        const unsub = onSnapshot(q, (snap: any) => {
            setNotes(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [db, appId, isOpen]);

    // 2. 監聽對話庫 (Chat)
    useEffect(() => {
        if (!db || !isOpen) return;
        const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_messages'), orderBy('timestamp', 'asc'), limit(100));
        const unsub = onSnapshot(q, (snap: any) => {
            setMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });
        return () => unsub();
    }, [db, appId, isOpen]);

    // 3. 監聽任務庫 (Tasks)
    useEffect(() => {
        if (!db || !isOpen) return;
        const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_tasks'), orderBy('timestamp', 'desc'));
        const unsub = onSnapshot(q, (snap: any) => {
            setTasks(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [db, appId, isOpen]);

    // ★★★ 核心升級：動態資料過濾邏輯 (權限隔離 + 搜尋) ★★★
    const isAdmin = staffId === 'BOSS' || currentUser?.modules?.includes('all') || currentUser?.dataAccess === 'all';

    const filteredNotes = notes.filter(note => {
        // 1. 權限檢查
        let hasAccess = false;
        if (isAdmin) hasAccess = true; 
        else if (note.author === staffId) hasAccess = true; 
        else if (note.linkedRegMark && inventory.some((v:any) => v.regMark === note.linkedRegMark)) hasAccess = true;
        
        if (!hasAccess) return false;

        // 2. 搜尋字眼過濾
        if (noteSearchQuery) {
            const query = noteSearchQuery.toLowerCase();
            return (note.content || '').toLowerCase().includes(query) || 
                   (note.linkedRegMark || '').toLowerCase().includes(query) ||
                   (note.author || '').toLowerCase().includes(query);
        }
        return true;
    });

    const filteredMessages = messages.filter(msg => {
        if (isAdmin) return true; 
        if (msg.sender === staffId) return true; 
        if (msg.text?.includes(`@${staffId}`)) return true; 
        if (msg.linkedRegMark) return inventory.some((v:any) => v.regMark === msg.linkedRegMark);
        return true; 
    });

    const filteredTasks = tasks.filter(task => {
        if (isAdmin) return true; 
        return task.assigner === staffId || task.assignee === staffId || task.assignee === 'ALL';
    });

    // --- 處理儲存隨手記 ---
    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = newNote.trim();
        if (!text || !db) return;

        let finalLinkedCar = noteLinkedCar;
        if (!finalLinkedCar) {
            const match = text.match(/@([a-zA-Z0-9]+)/);
            if (match) {
                const plate = match[1].toUpperCase();
                if (inventory.some((v:any) => v.regMark === plate)) finalLinkedCar = plate;
            }
        }

        await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_notes'), {
            author: staffId,
            content: text,
            linkedRegMark: finalLinkedCar || null,
            timestamp: serverTimestamp()
        });
        
        const now = new Date();
        const timeStr = `${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        setNewNote(`[${timeStr}] `);
        setNoteLinkedCar('');
    };

    const deleteNote = async (noteId: string) => {
        if (!db || !confirm("確定刪除此筆記？")) return;
        await deleteDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_notes', noteId));
    };

    const toggleNoteExpand = (noteId: string) => {
        setExpandedNotes(prev => ({ ...prev, [noteId]: !prev[noteId] }));
    };

    // --- 處理發送對話與 AI 處理邏輯 ---
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const msgText = newMessage.trim();
        if (!msgText || !db) return;

        let finalLinkedCar = chatLinkedCar;
        if (!finalLinkedCar) {
            const match = msgText.match(/@([a-zA-Z0-9]+)/);
            if (match) {
                const plate = match[1].toUpperCase();
                if (inventory.some((v:any) => v.regMark === plate)) finalLinkedCar = plate;
            }
        }

        await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_messages'), {
            sender: staffId,
            text: msgText,
            linkedRegMark: finalLinkedCar || null, 
            timestamp: serverTimestamp()
        });

        // ★★★ 新增：發送 @提及 推送通知 ★★★
        if (sendPushNotification) {
            // 搵出所有 @字眼
            const mentions = msgText.match(/@([a-zA-Z0-9_\-\.]+)/g);
            if (mentions) {
                // 過濾出真正嘅「員工 ID」，排除車牌 (例如 @VELLFIRE)
                const mentionedUsers = mentions
                    .map(m => m.substring(1)) // 移除 @
                    .filter(username => systemUsers.some((u:any) => u.email === username && username !== staffId)); // 確保係員工，且唔係自己@自己

                if (mentionedUsers.length > 0) {
                    sendPushNotification(
                        `💬 ${staffId} 在對話中提及了您`, 
                        msgText, 
                        mentionedUsers
                    );
                }
            }
        }
        
        setNewMessage('');
        setChatLinkedCar('');
        
        // ... 下面保留原本的 @AI 處理邏輯 ...
        if (msgText.includes('@AI') || msgText.includes('@ai')) {
            setIsAiThinking(true);
            try {
                const miniInventory = inventory.map((v:any) => {
                    const received = (v.payments || []).reduce((acc:number, p:any) => acc + (Number(p.amount) || 0), 0);
                    const cbFees = (v.crossBorder?.tasks || []).reduce((sum:number, t:any) => sum + (Number(t.fee) || 0), 0);
                    const salesAddonsTotal = (v.salesAddons || []).reduce((sum: number, addon: any) => sum + (Number(addon.amount) || 0), 0);
                    const totalReceivable = (Number(v.price) || 0) + cbFees + salesAddonsTotal;
                    const balance = totalReceivable - received;

                    return {
                        plate: v.regMark || '未出牌', 
                        make: v.make, model: v.model, year: v.year || '未填寫', status: v.status, 
                        daysInStock: v.stockInDate ? Math.floor((new Date().getTime() - new Date(v.stockInDate).getTime()) / (1000 * 60 * 60 * 24)) : 0,
                        targetPrice: v.price || 0, totalReceived: received, outstandingBalance: balance > 0 ? balance : 0,
                        managedBy: v.managedBy || '未指派',
                        licenseExpiry: v.licenseExpiry || '未填寫', previousOwners: v.previousOwners || '未填寫', ownerName: v.registeredOwnerName || '未填寫' 
                    };
                });

                const response = await fetch('/api/assistant', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: msgText, inventory: miniInventory })
                });
                const data = await response.json();
                
                await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_messages'), {
                    sender: '🤖 金田 (AI助理)', text: data.reply || "Sorry呀，我個腦突然 hang 咗機，請稍後再試下啦。",
                    linkedRegMark: finalLinkedCar || null, timestamp: serverTimestamp()
                });
            } catch (err) { console.error("AI Error:", err); } finally { setIsAiThinking(false); }
        }
    };

    // --- 處理新增任務 ---
    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        const taskText = newTask.trim();
        if (!taskText || !assignee || !db) return;

        let finalLinkedCar = taskLinkedCar;
        if (!finalLinkedCar) {
            const match = taskText.match(/@([a-zA-Z0-9]+)/);
            if (match) {
                const plate = match[1].toUpperCase();
                if (inventory.some((v:any) => v.regMark === plate)) finalLinkedCar = plate;
            }
        }

        await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_tasks'), {
            assigner: staffId, assignee: assignee, content: taskText, linkedRegMark: finalLinkedCar || null, 
            status: 'pending', timestamp: serverTimestamp()
        });

        // ★★★ 新增：發送任務指派 推送通知 ★★★
        if (sendPushNotification) {
            if (assignee === 'ALL') {
                // 廣播給所有人
                sendPushNotification(
                    `📋 新任務發佈`, 
                    `${staffId} 發佈了一項全體任務：${taskText}`
                ); 
            } else if (assignee !== staffId) { 
                // 指派給特定員工 (排除自己指派俾自己)
                sendPushNotification(
                    `📋 新任務指派`, 
                    `${staffId} 指派了一項新任務給您：${taskText}`, 
                    [assignee]
                );
            }
        }

        setNewTask(''); setTaskLinkedCar('');
    };

    const toggleTask = async (task: any) => {
        if (!db) return;
        const newStatus = task.status === 'pending' ? 'completed' : 'pending';
        await updateDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_tasks', task.id), {
            status: newStatus, completedAt: newStatus === 'completed' ? serverTimestamp() : null
        });
    };

    const deleteTask = async (taskId: string) => {
        if (!db || !confirm("確定刪除此任務？")) return;
        await deleteDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_tasks', taskId));
    };

    const openCarDetails = (regMark: string) => {
        const car = inventory.find((v:any) => v.regMark === regMark);
        if (car && setEditingVehicle) setEditingVehicle(car);
        else alert(`找不到車牌 ${regMark} 的詳細資料`);
    };

    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/20 z-[9998] md:bg-transparent md:pointer-events-none" onClick={onClose}></div>}
            
            <div className={`fixed top-0 right-0 h-full w-full md:w-[420px] bg-slate-50 shadow-2xl z-[9999] transform transition-transform duration-300 flex flex-col border-l border-slate-200 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                
                {/* 頂部 Header */}
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md flex-none safe-area-top">
                    <div className="flex items-center gap-2">
                        <div className="bg-yellow-500 text-black p-1.5 rounded-lg"><Check size={20}/></div>
                        <h3 className="font-bold text-lg tracking-wide">團隊協作中心</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
                </div>

                {/* ★ 3個分頁按鈕 */}
                <div className="flex border-b border-slate-200 bg-white flex-none">
                    <button onClick={() => setActiveTab('notes')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center transition-colors ${activeTab === 'notes' ? 'border-b-2 border-yellow-500 text-yellow-700 bg-yellow-50/50' : 'text-slate-500 hover:bg-slate-50'}`}><FileText size={16} className="mr-1.5"/> 隨手記</button>
                    <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center transition-colors ${activeTab === 'chat' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}><MessageCircle size={16} className="mr-1.5"/> 內部對話</button>
                    <button onClick={() => setActiveTab('tasks')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center transition-colors ${activeTab === 'tasks' ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50/50' : 'text-slate-500 hover:bg-slate-50'}`}><ListTodo size={16} className="mr-1.5"/> 任務指派</button>
                </div>

                {/* ===== Tab 1: 隨手記 (Quick Notes) ===== */}
                {activeTab === 'notes' && (
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
                        {/* 輸入區 (黃色便條紙風格) */}
                        <div className="p-3 bg-yellow-50/80 border-b border-yellow-200 shadow-sm flex-none z-10">
                            <form onSubmit={handleAddNote} className="flex flex-col gap-2">
                                <select value={noteLinkedCar} onChange={e => setNoteLinkedCar(e.target.value)} className="w-full bg-white border border-yellow-200 text-xs p-2 rounded-lg outline-none text-slate-600 shadow-sm">
                                    <option value="">🔗 關聯車輛 (選填，或輸入 @車牌)</option>
                                    {(inventory || []).filter((v:any)=>v.status!=='Withdrawn').map((v:any) => <option key={v.id} value={v.regMark}>{v.regMark} ({v.make})</option>)}
                                </select>
                                <textarea 
                                    value={newNote} 
                                    onChange={e => setNewNote(e.target.value)} 
                                    placeholder="快速記錄車輛狀況、洗車費用、過戶備註..." 
                                    className="w-full h-20 bg-white border border-yellow-300 rounded-lg p-3 text-sm outline-none focus:ring-2 ring-yellow-200 resize-none shadow-inner" 
                                />
                                <div className="flex justify-end">
                                    <button type="submit" disabled={!newNote.trim()} className="bg-yellow-500 text-yellow-950 px-6 py-2 rounded-lg text-sm font-black disabled:opacity-50 hover:bg-yellow-400 transition-colors shadow-sm active:scale-95"><Save size={16} className="inline mr-1"/> 儲存筆記</button>
                                </div>
                            </form>
                            
                            {/* ★ 搜尋列 */}
                            <div className="mt-3 relative">
                                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                <input 
                                    type="text" 
                                    value={noteSearchQuery} 
                                    onChange={e => setNoteSearchQuery(e.target.value)} 
                                    placeholder="搜尋內容、車牌或作者..." 
                                    className="w-full bg-white border border-yellow-200 rounded-full py-2 pl-9 pr-4 text-xs outline-none focus:ring-1 ring-yellow-400 shadow-sm"
                                />
                            </div>
                        </div>
                        
                        {/* 筆記列表 */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                            {filteredNotes.map(note => {
                                const timeStr = note.timestamp?.toDate ? note.timestamp.toDate().toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                                const isExpanded = !!expandedNotes[note.id];
                                // 判斷內容是否過長 (字數 > 150 或 行數 > 4)
                                const isLong = (note.content || '').length > 150 || (note.content || '').split('\n').length > 4;

                                return (
                                    <div key={note.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm relative group hover:border-yellow-300 transition-colors overflow-hidden">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-slate-800 text-sm">{note.author}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">{timeStr}</span>
                                                {note.linkedRegMark && (
                                                    <div onClick={() => openCarDetails(note.linkedRegMark)} className="inline-flex items-center text-[10px] bg-yellow-100 text-yellow-800 border border-yellow-300 px-1.5 py-0.5 rounded cursor-pointer hover:bg-yellow-200 font-mono font-bold transition-colors">
                                                        <Car size={10} className="mr-1"/> {note.linkedRegMark}
                                                    </div>
                                                )}
                                            </div>
                                            {(note.author === staffId || isAdmin) && (
                                                <button onClick={() => deleteNote(note.id)} className="text-slate-300 hover:text-red-500 p-1 flex-none ml-2"><Trash2 size={14}/></button>
                                            )}
                                        </div>
                                        
                                        {/* ★ 修復排版撐破：加入 break-words, break-all */}
                                        <p className={`text-sm text-slate-700 whitespace-pre-wrap break-words ${(!isExpanded && isLong) ? 'line-clamp-4' : ''}`} style={{ wordBreak: 'break-word' }}>
                                            {note.content}
                                        </p>
                                        
                                        {/* ★ 顯示更多按鈕 */}
                                        {isLong && (
                                            <button 
                                                onClick={() => toggleNoteExpand(note.id)} 
                                                className="text-blue-500 hover:text-blue-700 text-xs font-bold mt-2 flex items-center"
                                            >
                                                {isExpanded ? '收起內容' : '顯示更多...'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                            {filteredNotes.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">目前沒有隨手記紀錄</div>}
                        </div>
                    </div>
                )}

                {/* ===== Tab 2: 內部對話 (Chat) ===== */}
                {activeTab === 'chat' && (
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-100/50">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                            {filteredMessages.map((msg, idx) => {
                                const isMe = msg.sender === staffId;
                                const isAI = msg.sender.includes('AI') || msg.sender.includes('金田');
                                const timeStr = msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}) : '';
                                return (
                                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <span className="text-[10px] text-slate-400 mb-1 px-1">{isMe ? '您' : msg.sender} • {timeStr}</span>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : (isAI ? 'bg-gradient-to-r from-indigo-100 to-blue-50 border border-indigo-200 text-indigo-900 rounded-tl-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none')}`}>
                                            {msg.linkedRegMark && (
                                                <div onClick={() => openCarDetails(msg.linkedRegMark)} className="mb-2 inline-flex items-center text-[10px] bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded cursor-pointer hover:bg-yellow-300 font-mono font-bold shadow-sm active:scale-95 transition-transform">
                                                    <Car size={10} className="mr-1"/> {msg.linkedRegMark}
                                                </div>
                                            )}
                                            {/* ★ 順便幫聊天訊息也加上防撐破 */}
                                            <div className="whitespace-pre-wrap leading-relaxed break-words" style={{ wordBreak: 'break-word' }}>{msg.text}</div>
                                        </div>
                                    </div>
                                );
                            })}
                            {isAiThinking && (
                                <div className="flex items-start">
                                    <div className="bg-indigo-50 border border-indigo-100 text-indigo-500 p-3 rounded-2xl rounded-tl-none text-xs flex items-center shadow-sm"><Loader2 size={14} className="animate-spin mr-2"/> 金田 AI 正在思考中...</div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        
                        <div className="bg-white border-t border-slate-200 flex-none shadow-[0_-5px_15px_rgba(0,0,0,0.03)] p-3">
                            <div className="flex gap-2 mb-2">
                                <select value={chatLinkedCar} onChange={e => setChatLinkedCar(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 text-xs p-1.5 rounded outline-none text-slate-600">
                                    <option value="">🔗 不關聯車輛 (可輸入 @車牌)</option>
                                    {(inventory || []).filter((v:any)=>v.status!=='Withdrawn').map((v:any) => <option key={v.id} value={v.regMark}>{v.regMark} ({v.make})</option>)}
                                </select>
                                <button onClick={() => setNewMessage(prev => prev + '@AI ')} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-[10px] font-bold hover:bg-indigo-200 transition-colors">呼叫 @AI</button>
                            </div>
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="輸入訊息... (如: @AI @VELLFIRE 收咗幾多錢？)" className="flex-1 bg-slate-100 border border-transparent focus:border-blue-300 focus:bg-white rounded-lg px-3 py-2 text-sm outline-none transition-colors" />
                                <button type="submit" disabled={!newMessage.trim() || isAiThinking} className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"><Send size={16}/></button>
                            </form>
                        </div>
                    </div>
                )}

                {/* ===== Tab 3: 任務指派 (Tasks) ===== */}
                {activeTab === 'tasks' && (
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                        <form onSubmit={handleAddTask} className="p-3 bg-white border-b border-slate-200 flex flex-col gap-2 flex-none shadow-sm z-10">
                            <select value={taskLinkedCar} onChange={e => setTaskLinkedCar(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs p-1.5 rounded outline-none text-slate-600 mb-1">
                                <option value="">🔗 選擇關聯車輛 (選填，或輸入 @車牌)</option>
                                {(inventory || []).filter((v:any)=>v.status!=='Withdrawn').map((v:any) => <option key={v.id} value={v.regMark}>{v.regMark} ({v.make} {v.model})</option>)}
                            </select>
                            
                            <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="任務內容 (例如: @VELLFIRE 聯絡車主收尾數)" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-blue-100" />
                            <div className="flex gap-2">
                                <select value={assignee} onChange={e => setAssignee(e.target.value)} className="flex-1 border border-slate-200 rounded-lg p-2 text-sm outline-none bg-slate-50">
                                    <option value="">-- 指派給 --</option>
                                    {(systemUsers || []).map((u:any) => <option key={u.email} value={u.email}>{u.email}</option>)}
                                    <option value="ALL">所有人 (All)</option>
                                </select>
                                <button type="submit" disabled={!newTask.trim() || !assignee} className="bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-purple-800 transition-colors shadow-sm"><Plus size={16} className="inline mr-1"/> 發佈</button>
                            </div>
                        </form>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                            {filteredTasks.map(task => {
                                const isCompleted = task.status === 'completed';
                                return (
                                    <div key={task.id} className={`p-3 rounded-xl border flex gap-3 shadow-sm transition-all ${isCompleted ? 'bg-slate-100 border-slate-200 opacity-60' : 'bg-white border-blue-200 hover:shadow-md'}`}>
                                        <button onClick={() => toggleTask(task)} className={`mt-0.5 flex-none rounded-full w-5 h-5 flex items-center justify-center border transition-colors ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-blue-500 text-transparent hover:text-blue-200'}`}>
                                            <Check size={12}/>
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            {task.linkedRegMark && (
                                                <div onClick={() => openCarDetails(task.linkedRegMark)} className={`mb-1 inline-flex items-center text-[9px] px-1.5 py-0.5 rounded cursor-pointer font-mono font-bold border transition-colors ${isCompleted ? 'bg-gray-200 text-gray-500 border-gray-300' : 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200'}`}>
                                                    <Car size={10} className="mr-1"/> {task.linkedRegMark}
                                                </div>
                                            )}
                                            {/* ★ 順便幫任務內容加上防撐破 */}
                                            <p className={`text-sm font-bold break-words ${isCompleted ? 'line-through text-slate-500' : 'text-slate-800'}`} style={{ wordBreak: 'break-word' }}>{task.content}</p>
                                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                                                <div className="text-[10px] text-slate-400 font-medium">
                                                    <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded mr-1">@{task.assignee}</span>
                                                    由 {task.assigner} 指派
                                                </div>
                                                {(task.assigner === staffId || isAdmin) && (
                                                    <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={12}/></button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredTasks.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">目前沒有與您相關的任務</div>}
                        </div>
                    </div>
                )}
            </div>
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
// ★★★ 10. Settings Manager (v18.0: 終極修復 Error 310 Hook 崩潰) ★★★
// ------------------------------------------------------------------

// --- 新增：車輛推介單預覽組件 (iPhone 專用 / 對客分享版) ---
const VehicleShareModal = ({ vehicle, db, staffId, appId, onClose }: any) => {
    const [photos, setPhotos] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    
    // ★ 需求 3: 加上可自訂編輯的備註
    const [customRemark, setCustomRemark] = useState('');

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
            setPhotos(list.map(i => i.url).slice(0, 6)); 
            setLoading(false);
        });
        return () => unsub();
    }, [vehicle.id]);

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm md:max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header Actions */}
                <div className="p-3 bg-slate-900 text-white flex justify-between items-center print:hidden flex-none">
                    <span className="text-xs font-bold">預覽模式 (可截圖或列印)</span>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full"><X size={20}/></button>
                </div>

                {/* Content Area (白色區域，適合截圖/列印) */}
                <div className="flex-1 overflow-y-auto p-6 bg-white" id="share-content">
                    {/* Logo & Header */}
                    <div className="flex items-center gap-4 border-b-2 border-yellow-500 pb-4 mb-4">
                        <img src={COMPANY_INFO.logo_url} className="w-16 h-16 object-contain" onError={(e) => e.currentTarget.style.display='none'}/>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 leading-none tracking-wide">{COMPANY_INFO.name_en}</h1>
                            <h2 className="text-sm font-bold text-slate-600 mt-1 tracking-widest">{COMPANY_INFO.name_ch}</h2>
                        </div>
                    </div>

                    {/* Car Title (★ 需求 4: 隱藏車牌文字，只顯示年份廠牌) */}
                    <div className="mb-4 flex justify-between items-end">
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 leading-tight">{vehicle.make} {vehicle.model}</h3>
                            <p className="text-sm text-slate-500 font-mono mt-1">製造年份: {vehicle.year}</p>
                        </div>
                        {/* 顯示價格 */}
                        <div className="text-right pb-1">
                            <span className="text-lg font-black text-yellow-600">{new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', maximumFractionDigits: 0 }).format(vehicle.price)}</span>
                        </div>
                    </div>

                    {/* Key Specs Grid (★ 需求 5: 加入牌費到期日) */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 flex flex-col justify-center">
                            <span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">外觀/內飾 (Color)</span>
                            <span className="font-bold text-slate-800 text-[10px] truncate" title={`${vehicle.colorExt || '-'} / ${vehicle.colorInt || vehicle.colorInterior || '-'}`}>
                                {vehicle.colorExt || '-'} / {vehicle.colorInt || (vehicle as any).colorInterior || '-'}
                            </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 flex flex-col justify-center">
                            <span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">手數 (Owners)</span>
                            <span className="font-bold text-slate-800 text-xs">{vehicle.previousOwners || '0'} 手</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 flex flex-col justify-center">
                            <span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">容積 (Engine)</span>
                            <span className="font-bold text-slate-800 text-xs">{vehicle.engineSize ? `${vehicle.engineSize}${vehicle.fuelType === 'Electric' ? 'Kw' : 'cc'}` : '-'}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 flex flex-col justify-center">
                            <span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">里數 (Mileage)</span>
                            <span className="font-bold text-slate-800 text-xs">{vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} km` : '-'}</span>
                        </div>
                        <div className="bg-yellow-50 p-2 rounded border border-yellow-200 col-span-2 flex flex-col justify-center">
                            <span className="block text-[9px] text-yellow-600 font-bold uppercase mb-0.5">牌費到期日 (License Expiry)</span>
                            <span className="font-bold text-yellow-900 text-xs font-mono">{vehicle.licenseExpiry || '未出牌 / 已過期'}</span>
                        </div>
                    </div>

                    {/* ★ 需求 3: 可自訂編輯的備註區 */}
                    <div className="mb-6 relative group">
                        <span className="block text-[9px] text-slate-400 font-bold uppercase mb-1 print:hidden">銷售備註 (點擊編輯，列印或截圖時自動隱藏外框)</span>
                        <textarea
                            value={customRemark}
                            onChange={(e) => setCustomRemark(e.target.value)}
                            placeholder="在這裡輸入車輛亮點、改裝項目或給客戶的話..."
                            className="w-full text-sm text-slate-700 bg-blue-50/50 border border-dashed border-blue-300 rounded-lg p-3 outline-none resize-none focus:bg-blue-50 focus:border-blue-500 transition-colors print:border-none print:bg-transparent print:p-0 min-h-[60px] leading-relaxed"
                        />
                    </div>

                    {/* Photos Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {loading ? <div className="col-span-2 text-center text-xs py-10">載入圖片中...</div> : 
                         photos.length > 0 ? photos.map((url, i) => (
                            <div key={i} className={`rounded-lg overflow-hidden border border-slate-100 bg-gray-100 aspect-video ${i===0 ? 'col-span-2' : ''}`}>
                                <img src={url} className="w-full h-full object-cover"/>
                            </div>
                        )) : (
                            <div className="col-span-2 text-center py-8 bg-gray-50 text-gray-400 text-xs rounded border border-dashed border-gray-200">暫無圖片</div>
                        )}
                    </div>

                    {/* Contact Footer (★ 需求 2: 移除了地址和指派人，變得極簡專業) */}
                    <div className="text-center border-t border-slate-100 pt-4 mt-4">
                        <p className="text-xs font-bold text-slate-800 tracking-wide">{COMPANY_INFO.name_en} - {COMPANY_INFO.name_ch}</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-mono">Tel: {COMPANY_INFO.phone}</p>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-slate-100 border-t print:hidden flex-none">
                    <button onClick={() => window.print()} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform flex items-center justify-center">
                        <Printer size={16} className="mr-2"/> 列印 / 輸出 PDF
                    </button>
                    <p className="text-[10px] text-center text-slate-500 mt-3 leading-tight">
                        💡 提示：iPhone 可直接截圖發送 WhatsApp。<br/>如需遮擋圖片中的車牌，請先在「智能圖庫」中使用遮罩工具。
                    </p>
                </div>
            </div>
        </div>
    );
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
  // ★★★ 新增：市場大數據分析模塊開關 ★★★
  const [showMarketIntelligence, setShowMarketIntelligence] = useState(false);
  const [marketStats, setMarketStats] = useState<any>(null);
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
  const handlePrint = () => { window.print(); };

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
                // 2. 普通員工 -> ★ 嚴格模式：只看負責人是自己的資料 ★
                return entry.managedBy === staffId;
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
    const syncToDatabase = async (data: any, category: string) => {
        if (!db || !appId || !staffId) return;
        
        // 1. 強制收起虛擬鍵盤，避免 iOS 鎖死
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        try {
            const dbRef = collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'database');
            // 檢查是否已存在
            const q = query(dbRef, where('name', '==', data.name), where('category', '==', category));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                // 不存在，新增資料
                await addDoc(dbRef, {
                    ...data,
                    category,
                    managedBy: staffId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                
                // ★ 關鍵修復：延遲 150 毫秒彈出，讓 UI 有時間冷卻
                setTimeout(() => alert(`✅ 已成功連動並新增至「${category}」資料庫！`), 150);
            } else {
                // 已存在，更新資料
                const docId = snapshot.docs[0].id;
                await updateDoc(doc(dbRef, docId), {
                    ...data,
                    updatedAt: serverTimestamp()
                });
                
                // ★ 關鍵修復：延遲 150 毫秒彈出
                setTimeout(() => alert(`✅ 已成功同步更新「${category}」資料庫的現有資料！`), 150);
            }
        } catch (e) {
            console.error("Sync error", e);
            // ★ 關鍵修復：延遲 150 毫秒彈出
            setTimeout(() => alert('❌ 同步至資料庫失敗，請檢查網路'), 150);
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
            currency: getStr('acq_currency', isImport, (editingVehicle as any)?.acquisition?.currency) || 'HKD',
            exchangeRate: getNum('acq_exchangeRate', isImport, (editingVehicle as any)?.acquisition?.exchangeRate) || 1,
            foreignPrice: getNum('acq_foreignPrice', isImport, (editingVehicle as any)?.acquisition?.foreignPrice),
            localChargesForeign: getNum('acq_localChargesForeign', isImport, (editingVehicle as any)?.acquisition?.localChargesForeign),
            portFee: getNum('acq_portFee', isImport, (editingVehicle as any)?.acquisition?.portFee),
            a1Price: getNum('acq_a1Price', isImport, (editingVehicle as any)?.acquisition?.a1Price),
            frtTax: getNum('acq_frtTax', isImport, (editingVehicle as any)?.acquisition?.frtTax),
            eta: getStr('acq_eta', isImport, (editingVehicle as any)?.acquisition?.eta),
            paymentStatus: formData.get('acq_paymentStatus') as string || 'Unpaid',
            offsetAmount: getNum('acq_offsetAmount', isLocal, (editingVehicle as any)?.acquisition?.offsetAmount),
            advanceFee: getNum('acq_advanceFee', isLocal, (editingVehicle as any)?.acquisition?.advanceFee),
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

            if (vData.customerName) {
                await syncToDatabase({ name: vData.customerName, phone: vData.customerPhone }, '客戶');
            }
            if (crossBorderData.isEnabled) {
                if (crossBorderData.driver1) await syncToDatabase({ name: crossBorderData.driver1, plate: crossBorderData.mainlandPlate, quota: crossBorderData.quotaNumber }, '司機');
                if (crossBorderData.driver2) await syncToDatabase({ name: crossBorderData.driver2 }, '司機');
                if (crossBorderData.driver3) await syncToDatabase({ name: crossBorderData.driver3 }, '司機');
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
            createdAt: serverTimestamp()
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
      const acqPaid = (car.acquisition?.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      const acqOffset = Number(car.acquisition?.offsetAmount || 0);
      const acqBalance = (car.costPrice || 0) - acqPaid - acqOffset;
      if (acqBalance > 0) {
          totalPayable += acqBalance; // 將進貨欠款加入首頁的紅色「未付費用」總額
      }

      // 4. 應收尾數邏輯 (已售 OR 已訂)
      if (car.status === 'Sold' || car.status === 'Reserved') {
        const received = (car.payments || []).reduce((acc: any, p: any) => acc + (Number(p.amount) || 0), 0);
        
        // --- 修正開始：只計算「對客」的收費項目 ---
        
        // A. 對客附加費 (排除贈送項目)
        const salesAddonsTotal = ((car as any).salesAddons || []).reduce((sum: number, addon: any) => sum + (addon.isFree ? 0 : (Number(addon.amount) || 0)), 0);
        
        // B. 中港代辦服務費
        const cbFees = (car.crossBorder?.tasks || []).reduce((sum: any, t: any) => sum + (Number(t.fee) || 0), 0);
        
        // C. 售後維修/服務對客收費 (只計算未找數的 Charge)
        const maintCharge = (car.maintenanceRecords || []).reduce((sum: number, m: any) => sum + (m.chargeStatus !== 'Paid' ? (Number(m.charge) || 0) : 0), 0);
        
        // --- 修正結束：總應收 = 車價 + 附加費 + 中港費 + 維修費 (完全剔除 expenses 內部開支) ---
        const totalDue = (Number(car.price) || 0) + salesAddonsTotal + cbFees + maintCharge;
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
    <div className="flex min-h-screen bg-slate-100 text-slate-900 font-sans">

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
           

      <main className="flex-1 w-full min-w-0 md:ml-0 p-4 md:p-8 print:m-0 print:p-0 transition-all duration-300 flex flex-col h-screen overflow-hidden">
        <div className="md:hidden flex items-center justify-between mb-6 bg-white p-4 rounded-lg shadow-sm print:hidden flex-none"><button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-700"><Menu size={28} /></button><span className="font-bold text-lg text-slate-800">Gold Land Auto</span><div className="w-7"></div></div>

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
                
                {shareVehicle && <VehicleShareModal vehicle={shareVehicle} db={db} staffId={staffId} appId={appId} onClose={()=>setShareVehicle(null)} />}

                {/* 儀表板頂部：標題、快訊、鈴鐺 */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 flex-none">
                    <h2 className="text-2xl font-bold text-slate-800 whitespace-nowrap">業務儀表板</h2>
                    <div className="flex-1 w-full min-w-0 px-0 md:px-4">
                        <SmartNewsTicker />
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

              {/* ========================================================= */}
              {/* ★★★ 市場大數據與資金轉流推算 (精緻摺疊版) ★★★ */}
              {/* ========================================================= */}
              <div className="flex flex-col items-end flex-none w-full mb-4">
                  <button 
                      onClick={() => {
                          setShowMarketIntelligence(!showMarketIntelligence);
                          // 打開時，自動尋找資料庫中最新的市場大數據
                          if (!showMarketIntelligence && !marketStats) {
                              import('firebase/firestore').then(({ collection, query, orderBy, limit, getDocs }) => {
                                  const q = query(
                                      collection(db!, 'artifacts', appId, 'staff', 'CHARLES_data', 'database'),
                                      orderBy('createdAt', 'desc'),
                                      limit(20)
                                  );
                                  getDocs(q).then(snap => {
                                      const statsDoc = snap.docs.find(d => d.data().docType === '市場大數據');
                                      if (statsDoc) setMarketStats(statsDoc.data());
                                  });
                              });
                          }
                      }}
                      className="group flex items-center gap-2 bg-slate-800 hover:bg-blue-600 text-blue-300 hover:text-white px-4 py-2 rounded-full shadow-md transition-all duration-300 ease-in-out border border-slate-700 mt-2"
                  >
                      <Zap size={16} className={`${showMarketIntelligence ? 'text-yellow-400' : 'text-blue-400'} group-hover:text-yellow-300`} />
                      <span className="text-sm font-medium">
                          {showMarketIntelligence ? '收起市場分析沙盤' : '📊 展開香港車市數據與採購推算'}
                      </span>
                  </button>

                  {/* 點擊後展開的分析面板 */}
                  {showMarketIntelligence && (
                      <div className="w-full mt-3 bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl shadow-2xl p-5 md:p-6 text-white border border-blue-800 animate-in slide-in-from-top-4 fade-in duration-300 max-h-[65vh] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-700">
                          
                          <div className="flex justify-between items-end mb-6 border-b border-blue-800/50 pb-4 flex-none">
                              <h2 className="text-xl font-bold text-blue-100 flex items-center gap-2">
                                  <span>📈</span> 採購雷達 (基於 {marketStats?.name ? marketStats.name.substring(0,8) : '政府最新'} 出牌數據)
                              </h2>
                              <button 
                                  onClick={() => window.open('/api/sync-market-data', '_blank')}
                                  className="text-xs bg-blue-600/50 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors border border-blue-500/50 flex items-center shadow"
                              >
                                  <RefreshCw size={12} className="mr-1.5"/> 同步最新明細
                              </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* 左側：市場熱門車型大數據榜 */}
                              <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700/50 shadow-inner flex flex-col max-h-[400px]">
                                  <h3 className="text-[13px] font-bold text-blue-300 mb-4 flex items-center tracking-wider uppercase flex-none">
                                      <Zap size={14} className="mr-1.5 text-yellow-400"/> 運輸署本月熱門車型榜 (新車 vs 二手水貨)
                                  </h3>
                                  
                                  {marketStats?.topModels ? (
                                      <div className="space-y-2 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600">
                                          {marketStats.topModels.map((car: any, idx: number) => (
                                              <div key={idx} className="flex justify-between items-center bg-slate-800/80 p-3 rounded-lg hover:bg-slate-700 transition-colors border-l-4 border-blue-500">
                                                  <div className="min-w-0 pr-2">
                                                      <span className="font-bold text-sm tracking-wide block text-slate-100 truncate">{car.make} {car.model}</span>
                                                      <div className="text-[10px] text-slate-400 font-mono mt-1 flex gap-2.5">
                                                          <span>全新: <span className="text-white">{car.new}</span></span>
                                                          <span title="曾於外地登記">二手水貨: <span className="text-yellow-400 font-bold">{car.used}</span></span>
                                                          {car.ev > 0 && <span className="text-green-400 bg-green-900/30 px-1 rounded">EV: {car.ev}</span>}
                                                      </div>
                                                  </div>
                                                  <div className="text-right flex-none">
                                                      <span className="text-blue-400 font-bold font-mono text-lg">{car.total}</span>
                                                      <span className="text-[10px] text-slate-500 ml-1">台</span>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  ) : (
                                      <div className="text-center py-10 text-slate-500 text-sm">
                                          尚未同步最新車型數據<br/>請點擊右上角按鈕同步
                                      </div>
                                  )}
                                  <p className="text-[10px] text-slate-500 mt-4 text-right flex-none">
                                      * 數據: DATA.GOV.HK (代碼A=全新, 其他=外地二手水貨)
                                  </p>
                              </div>

                              {/* 右側：公司轉流推算 */}
                              <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700/50 shadow-inner flex flex-col max-h-[400px]">
                                  <h3 className="text-[13px] font-bold text-yellow-400 mb-4 flex items-center tracking-wider uppercase flex-none">
                                      <DollarSign size={14} className="mr-1.5"/> 公司資金轉流推算 (Turnover Analysis)
                                  </h3>
                                  
                                  <div className="space-y-3 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600">
                                      {(() => {
                                          const soldCars = inventory.filter((v:any) => v.status === 'Sold' && v.stockInDate && v.stockOutDate);
                                          const modelStats: Record<string, { count: number, totalDays: number }> = {};
                                          
                                          soldCars.forEach((car:any) => {
                                              const key = `${car.make} ${car.model}`;
                                              const inDate = new Date(car.stockInDate).getTime();
                                              const outDate = new Date(car.stockOutDate).getTime();
                                              let days = Math.floor((outDate - inDate) / (1000 * 60 * 60 * 24));
                                              if (days < 0) days = 0; 
                                              
                                              if (!modelStats[key]) modelStats[key] = { count: 0, totalDays: 0 };
                                              modelStats[key].count++;
                                              modelStats[key].totalDays += days;
                                          });

                                          const turnoverList = Object.entries(modelStats)
                                              .filter(([,data]) => data.count >= 1) 
                                              .map(([key, data]) => ({
                                                  key,
                                                  avgDays: Math.round(data.totalDays / data.count),
                                                  count: data.count
                                              }))
                                              .sort((a,b) => a.avgDays - b.avgDays); 

                                          if (turnoverList.length === 0) {
                                              return <div className="text-center py-10 text-slate-500 text-sm">累積足夠的歷史銷售數據後<br/>系統將自動推算轉流極快的車型</div>;
                                          }

                                          return turnoverList.map(item => (
                                              <div key={item.key} className="bg-slate-800/80 p-3 rounded-lg border-l-4 border-yellow-500 hover:bg-slate-700 transition-colors flex justify-between items-center">
                                                  <div>
                                                      <div className="font-bold text-sm tracking-wide text-slate-100 mb-1">{item.key}</div>
                                                      <div className="text-[10px] text-slate-400">銷售樣本：<span className="text-white font-mono">{item.count}</span> 台</div>
                                                  </div>
                                                  <div className="text-right">
                                                      <div className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block mb-1 ${item.avgDays <= 15 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                          {item.avgDays <= 15 ? '極速變現' : '穩定周轉'}
                                                      </div>
                                                      <div className="text-xs text-slate-300">平均 <strong className="text-white font-mono text-lg">{item.avgDays}</strong> 天</div>
                                                  </div>
                                              </div>
                                          ));
                                      })()}
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
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
                      if (v.licenseExpiry) {
                          const days = getDaysRemaining(v.licenseExpiry);
                          if (days !== null && days <= 30) {
                              docAlerts.push({ 
                                  id: v.id, title: v.regMark || '未出牌', desc: '牌費到期', 
                                  date: v.licenseExpiry, days, status: days < 0 ? 'expired' : 'soon', raw: v, source: 'vehicle' 
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
                          const received = (c.payments || []).reduce((acc, p) => acc + (p.amount || 0), 0);
                          const cbFees = (c.crossBorder?.tasks || []).reduce((sum, t) => sum + (t.fee || 0), 0);
                          const salesAddonsTotal = ((c as any).salesAddons || []).reduce((sum: number, addon: any) => sum + (addon.amount || 0), 0);
                          const totalReceivable = (c.price || 0) + cbFees + salesAddonsTotal;
                          const balance = totalReceivable - received;
                          const unpaidExps = (c.expenses || []).filter(e => e.status === 'Unpaid').length;
                          const pendingCb = (c.crossBorder?.tasks || []).filter(t => !t.isPaid).length;
                          // 只要還有欠款、未付成本、未完成的中港任務，就留在待處理區
                          return balance > 0 || unpaidExps > 0 || pendingCb > 0;
                      }
                      return false;
                  });

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
                    const received = (car.payments || []).reduce((acc:any, p:any) => acc + (p.amount || 0), 0);
                    const cbFees = (car.crossBorder?.tasks || []).reduce((sum:any, t:any) => sum + (t.fee || 0), 0);
                    const salesAddonsTotal = ((car as any).salesAddons || []).reduce((sum: number, addon: any) => sum + (addon.amount || 0), 0);
                    const balance = ((car.price || 0) + cbFees + salesAddonsTotal) - received;
                    const unpaidExps = (car.expenses || []).filter((e:any) => e.status === 'Unpaid').length;

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
                                    onClick={(e) => { e.stopPropagation(); setShareVehicle(car); }} 
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
                                        {hasValidEta && (
                                            <div className="flex flex-wrap justify-end items-center gap-1">
                                                {received > 0 && (
                                                    <span className="text-[8px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-[2px] rounded-[3px] leading-none font-bold whitespace-nowrap">
                                                        已付
                                                    </span>
                                                )}
                                                <span className={`text-[8px] px-1.5 py-[2px] rounded-[3px] leading-none flex items-center shadow-sm border whitespace-nowrap font-bold ${
                                                    isArrived 
                                                    ? 'text-green-600 bg-green-50 border-green-200' 
                                                    : 'text-indigo-600 bg-indigo-50 border-indigo-200'
                                                }`}>
                                                    <Ship size={8} className="mr-0.5 opacity-80"/>{isArrived ? '已到港' : `剩${daysToArrive}天`}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap justify-end items-center gap-1">
                                            {unpaidExps > 0 && (
                                                <span className="text-[8px] text-red-500 bg-red-50 border border-red-100 px-1.5 py-[2px] rounded-[3px] leading-none font-bold whitespace-nowrap">
                                                    未付成本
                                                </span>
                                            )}
                                            {balance > 0 && (
                                                <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-[2px] rounded-[3px] leading-none flex items-center shadow-sm whitespace-nowrap font-mono font-bold">
                                                    <span className="mr-0.5 opacity-80 text-[8px]">待收</span>{formatCurrency(balance)}
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

                          <div className="flex flex-col lg:flex-row gap-0 lg:gap-5 flex-1 min-h-0 overflow-hidden">
                              
                              {/* 左側看板：在庫優先 */}
                              <div className={`flex-1 flex-col bg-transparent md:bg-white md:rounded-2xl border-0 md:border border-slate-200/60 md:shadow-sm overflow-hidden min-h-0 relative ${dashMobileTab === 'instock' ? 'flex' : 'hidden md:flex'}`}>
                                  {/* 桌面版：極幼細邊框 + 右上角醒目數量 */}
                                  <div className="hidden md:flex p-3 border-b border-slate-100 bg-white justify-between items-center flex-none z-10">
                                      <h3 className="font-bold text-slate-700 flex items-center text-sm tracking-wide">
                                          <Layout size={16} className="mr-1.5 text-green-500"/> 在庫待售
                                      </h3>
                                      <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-0.5 rounded-full shadow-sm text-xs font-black font-mono tracking-wider">
                                          {inStockCars.length} 台
                                      </div>
                                  </div>
                                  <div className="flex-1 overflow-y-auto px-4 md:px-3 pb-20 md:pb-3 space-y-2.5 bg-transparent md:bg-slate-50/30 scrollbar-thin relative z-0">
                                      {inStockCars.map(car => renderDashboardCard(car))}
                                      {inStockCars.length === 0 && <div className="text-center py-10 text-slate-400 text-xs">目前無在庫車輛</div>}
                                  </div>
                              </div>

                              {/* 右側看板：已訂 / 待跟進 */}
                              <div className={`flex-1 flex-col bg-transparent md:bg-white md:rounded-2xl border-0 md:border border-slate-200/60 md:shadow-sm overflow-hidden min-h-0 relative ${dashMobileTab === 'action' ? 'flex' : 'hidden md:flex'}`}>
                                  {/* 桌面版：極幼細邊框 + 右上角醒目數量 */}
                                  <div className="hidden md:flex p-3 border-b border-slate-100 bg-white justify-between items-center flex-none z-10">
                                      <h3 className="font-bold text-slate-700 flex items-center text-sm tracking-wide">
                                          <FileCheck size={16} className="mr-1.5 text-amber-500"/> 已訂與待結清
                                      </h3>
                                      <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-0.5 rounded-full shadow-sm text-xs font-black font-mono tracking-wider">
                                          {actionCars.length} 台
                                      </div>
                                  </div>
                                  <div className="flex-1 overflow-y-auto px-4 md:px-3 pb-20 md:pb-3 space-y-2.5 bg-transparent md:bg-slate-50/30 scrollbar-thin relative z-0">
                                      {actionCars.map(car => renderDashboardCard(car))}
                                      {actionCars.length === 0 && <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center"><CheckCircle size={32} className="mb-2 text-green-400 opacity-50"/>所有交易皆已完美結清</div>}
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
              <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-20 scrollbar-thin">
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
                                        <button onClick={(e) => { e.stopPropagation(); setShareVehicle(car); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Share2 size={16}/></button>
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
                staffId={staffId} 
                appId={appId} 
                inventory={visibleInventory} 
                updateVehicle={updateVehicle} // ★ 關鍵：必須傳入此函數以更新流程狀態
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
