// src/components/SettingsManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
    LayoutDashboard, BellRing, Car, DollarSign, Globe, Users, Database, 
    Bell, FileText, DownloadCloud, Plus, ChevronUp, ChevronDown, Trash2, 
    ShieldCheck, Info, X, Palette, Armchair, Wrench, Receipt, BarChart3, 
    Upload, Key, CheckCircle, AlertTriangle, Search, ArrowLeft
} from 'lucide-react';
import { doc, setDoc, collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, writeBatch } from 'firebase/firestore';
import { ref, uploadString } from 'firebase/storage';

import { SystemSettings, Vehicle } from '@/types';

const SettingsManager = ({ 
    settings, updateSettings, setSettings, systemUsers, updateSystemUsers, db, storage, staffId, appId, inventory, addSystemLog 
}: any) => {
    
    // ★★★ 1. 選單定義 ★★★
    const systemMainModules = [
        { key: 'dashboard', label: '業務儀表板' },
        { key: 'inventory', label: '車輛管理' },
        { key: 'create_doc', label: '開單系統' },
        { key: 'reports', label: '財務總覽' },
        { key: 'cross_border', label: '中港業務' },
        { key: 'business', label: '業務辦理流程' }, 
        { key: 'database', label: '資料庫中心' },
        { key: 'media_center', label: '智能圖庫' },
        { key: 'settings', label: '系統設置' }
    ];

    const settingsInternalMenu = [
        { key: 'general', label: '一般設定', icon: <LayoutDashboard size={16}/> },
        { key: 'notifications', label: '推送通知', icon: <BellRing size={16}/> },
        { key: 'vehicle_setup', label: '車輛參數', icon: <Car size={16}/> },    
        { key: 'expenses_setup', label: '財務參數', icon: <DollarSign size={16}/> }, 
        { key: 'crossborder_setup', label: '中港參數', icon: <Globe size={16}/> }, 
        { key: 'users', label: '用戶與權限', icon: <Users size={16}/> },
        { key: 'database_config', label: '資料庫分類', icon: <Database size={16}/> },
        { key: 'reminders', label: '系統提醒', icon: <Bell size={16}/> },
        { key: 'logs', label: '系統日誌', icon: <FileText size={16}/> },
        { key: 'backup', label: '備份', icon: <DownloadCloud size={16}/> }
    ];

    const permissionGroups = [
        { key: 'dashboard', label: '儀表板 (Dashboard)' },
        { key: 'inventory', label: '車輛/庫存/圖庫 (Inventory)' },
        { key: 'import_orders', label: '海外訂車 (Import)' },
        { key: 'business', label: '中港/流程業務 (Business)' },
        { key: 'reports', label: '財務報表 (Reports)' },
        { key: 'database', label: '資料庫/客戶 (Database)' },
        { key: 'settings', label: '系統設置 (Admin)' }
    ];

    // =========================================================
    // ★★★ 核心修復區：所有 useState 必須放在最外層，絕對不能放在條件式內 ★★★
    // =========================================================
    const [showMobileMenu, setShowMobileMenu] = useState(true); 
    const [activeTab, setActiveTab] = useState('general');
    
    // --- 一般設定狀態 ---
    const [newColor, setNewColor] = useState('');
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
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

    // --- ★ 車輛三級聯動 (Make -> Model -> Code) 專屬狀態 (全數移至安全區) ★ ---
    const [activeSetupMake, setActiveSetupMake] = useState<string>('');
    const [activeSetupModel, setActiveSetupModel] = useState<string>('');
    const [newSetupMake, setNewSetupMake] = useState('');
    const [newSetupModel, setNewSetupModel] = useState('');
    const [newSetupCode, setNewSetupCode] = useState('');
    // =========================================================

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
        if (!appId || !db || !staffId) {
            alert("系統尚未初始化，無法儲存 Token");
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);

            if (permission === 'granted') {
                const { getMessaging, getToken } = await import("firebase/messaging");
                const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
                
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                const messaging = getMessaging();
                
                const token = await getToken(messaging, { 
                    vapidKey: settings.pushConfig?.vapidKey || 'BIpAVoyM6C6CodEmmKnsykyuQkX0g0VBBXDUWikIRhKtnCVUVCuO86EqlEgf5zuxz8nGA3DCdbEr1yKynCXFJKA',
                    serviceWorkerRegistration: registration
                });

                if (token) {
                    const tokenRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_tokens', staffId);
                    await setDoc(tokenRef, {
                        token: token,
                        user: staffId,
                        updatedAt: serverTimestamp(),
                        device: navigator.userAgent 
                    }, { merge: true });

                    alert(`✅ 裝置配對成功！\n您的設備現在已連結至帳號：${staffId}\n當有新車或售出時，此裝置將會收到推送通知。`);
                } else {
                    alert("無法獲取 Token，請檢查 VAPID Key 設定");
                }
            } else {
                alert("您已拒絕通知權限。如需開啟，請到瀏覽器設定中解鎖。");
            }
        } catch (err) {
            console.error("Token Error:", err);
            alert(`發生錯誤，請確保您使用的是 HTTPS 連線。\n錯誤詳情: ${err}`);
        }
    };

    // --- 萬能字典操作函數 ---
    const addItem = (key: keyof SystemSettings, val: string) => { 
        if(val) updateSettings(key, [...(settings[key] as any[] || []), val]); 
    };
    const removeItem = (key: keyof SystemSettings, idx: number) => { 
        const arr = [...(settings[key] as any[] || [])]; 
        arr.splice(idx, 1); 
        updateSettings(key, arr); 
    };
    const moveListItem = (key: keyof SystemSettings, index: number, direction: 'up' | 'down') => {
        const currentList = Array.isArray(settings[key]) ? [...(settings[key] as any[])] : [];
        if (direction === 'up' && index > 0) {
            [currentList[index - 1], currentList[index]] = [currentList[index], currentList[index - 1]];
            updateSettings(key, currentList);
        } else if (direction === 'down' && index < currentList.length - 1) {
            [currentList[index + 1], currentList[index]] = [currentList[index], currentList[index + 1]];
            updateSettings(key, currentList);
        }
    };
    const editListItem = (key: keyof SystemSettings, index: number, newValue: string) => {
        if (!newValue.trim()) return;
        const currentList = Array.isArray(settings[key]) ? [...(settings[key] as any[])] : [];
        currentList[index] = newValue;
        updateSettings(key, currentList);
    };

    // --- ★ 車輛三級聯動操作函數 (Make -> Model -> Code) ★ ---
    const handleEditMake = (idx: number, oldMake: string, newMake: string) => {
        if (!newMake.trim() || oldMake === newMake) return;
        const newMakes = [...(settings.makes || [])];
        newMakes[idx] = newMake;
        
        const newModels = { ...(settings.models || {}) };
        if (newModels[oldMake]) {
            newModels[newMake] = newModels[oldMake];
            delete newModels[oldMake];
        }
        
        updateSettings('makes', newMakes);
        updateSettings('models', newModels);
        if (activeSetupMake === oldMake) setActiveSetupMake(newMake);
    };

    const handleDeleteMake = (idx: number, makeName: string) => {
        if (!confirm(`確定刪除品牌 ${makeName} 及其所有型號與代號？`)) return;
        const newMakes = [...(settings.makes || [])];
        newMakes.splice(idx, 1);
        
        const newModels = { ...(settings.models || {}) };
        const modelsToDelete = newModels[makeName] || [];
        delete newModels[makeName];

        const newCodes = { ...(settings.codes || {}) };
        modelsToDelete.forEach((m: string) => delete newCodes[m]);
        
        updateSettings('makes', newMakes);
        updateSettings('models', newModels);
        updateSettings('codes', newCodes);
        if (activeSetupMake === makeName) { setActiveSetupMake(''); setActiveSetupModel(''); }
    };

    const handleMoveMake = (idx: number, dir: 'up'|'down') => {
        const list = [...(settings.makes || [])];
        if (dir === 'up' && idx > 0) [list[idx-1], list[idx]] = [list[idx], list[idx-1]];
        else if (dir === 'down' && idx < list.length - 1) [list[idx+1], list[idx]] = [list[idx], list[idx+1]];
        updateSettings('makes', list);
    };

    const handleEditModel = (make: string, idx: number, oldModel: string, newModel: string) => {
        if (!newModel.trim() || oldModel === newModel) return;
        const newMList = [...(settings.models[make] || [])];
        newMList[idx] = newModel;
        
        const newCodes = { ...(settings.codes || {}) };
        if (newCodes[oldModel]) {
            newCodes[newModel] = newCodes[oldModel];
            delete newCodes[oldModel];
        }

        updateSettings('models', { ...settings.models, [make]: newMList });
        updateSettings('codes', newCodes);
        if (activeSetupModel === oldModel) setActiveSetupModel(newModel);
    };

    const handleDeleteModel = (make: string, idx: number, modelName: string) => {
        if (!confirm(`確定刪除型號 ${modelName} 及其所有代號？`)) return;
        const newMList = [...(settings.models[make] || [])];
        newMList.splice(idx, 1);
        
        const newCodes = { ...(settings.codes || {}) };
        delete newCodes[modelName];

        updateSettings('models', { ...settings.models, [make]: newMList });
        updateSettings('codes', newCodes);
        if (activeSetupModel === modelName) setActiveSetupModel('');
    };

    const handleMoveModel = (make: string, idx: number, dir: 'up'|'down') => {
        const list = [...(settings.models[make] || [])];
        if (dir === 'up' && idx > 0) [list[idx-1], list[idx]] = [list[idx], list[idx-1]];
        else if (dir === 'down' && idx < list.length - 1) [list[idx+1], list[idx]] = [list[idx], list[idx+1]];
        updateSettings('models', { ...settings.models, [make]: list });
    };

    const handleEditCode = (model: string, idx: number, newCode: string) => {
        if (!newCode.trim()) return;
        const newCList = [...((settings.codes || {})[model] || [])];
        newCList[idx] = newCode;
        updateSettings('codes', { ...settings.codes, [model]: newCList });
    };

    const handleDeleteCode = (model: string, idx: number) => {
        const newCList = [...((settings.codes || {})[model] || [])];
        newCList.splice(idx, 1);
        updateSettings('codes', { ...settings.codes, [model]: newCList });
    };

    const handleMoveCode = (model: string, idx: number, dir: 'up'|'down') => {
        const list = [...((settings.codes || {})[model] || [])];
        if (dir === 'up' && idx > 0) [list[idx-1], list[idx]] = [list[idx], list[idx-1]];
        else if (dir === 'down' && idx < list.length - 1) [list[idx+1], list[idx]] = [list[idx], list[idx+1]];
        updateSettings('codes', { ...settings.codes, [model]: list });
    };

    // --- 其他操作函數 ---
    const handleExpenseTypeChange = (idx: number, field: string, val: any) => {
        const newTypes = [...(settings.expenseTypes || [])];
        newTypes[idx] = { ...newTypes[idx] as any, [field]: val };
        updateSettings('expenseTypes', newTypes);
    };

    const handleCbItemChange = (idx: number, field: string, val: any) => {
        const newItems = [...(settings.cbItems || [])];
        newItems[idx] = { ...newItems[idx] as any, [field]: val };
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
            const { query, collection, orderBy, limit, onSnapshot } = require("firebase/firestore");
            const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_logs'), orderBy('timestamp', 'desc'), limit(50)); 
            const unsub = onSnapshot(q, (snap: any) => {
                const list: any[] = [];
                snap.forEach((d: any) => list.push({ id: d.id, ...d.data() }));
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
            setBackupConfig(newConfig as any);
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
                    Object.keys(d.settings).forEach(k=>updateSettings(k as keyof SystemSettings, d.settings[k])); 
                    alert('設定已從檔案還原'); 
                } 
            }catch{alert('檔案格式錯誤');}
        }; 
        r.readAsText(f); 
    };

    const moveDocType = (cat: string, idx: number, direction: 'up' | 'down') => {
        const currentList = [...(settings.dbDocTypes[cat] || [])];
        if (direction === 'up' && idx > 0) {
            [currentList[idx - 1], currentList[idx]] = [currentList[idx], currentList[idx - 1]];
        } else if (direction === 'down' && idx < currentList.length - 1) {
            [currentList[idx + 1], currentList[idx]] = [currentList[idx], currentList[idx + 1]];
        }
        updateSettings('dbDocTypes', { ...settings.dbDocTypes, [cat]: currentList });
    };

    const handleRescueImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !db || !appId) return;
        
        if(!confirm("⚠️ 智能復原啟動：\n\n系統將會透過「車牌 (Reg Mark)」比對，將上傳的資料合併到車庫中。\n\n💡 規則：【系統資料優先】。如果系統裡原本就有某個日期的資料，將會保留系統的；只有系統裡是「空白」的欄位，才會把上傳的資料補進去。\n\n確定執行？")) {
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (!data.inventory || !Array.isArray(data.inventory)) {
                    alert('檔案格式不正確，找不到庫存備份資料');
                    return;
                }

                let restoreCount = 0;
                const batch = writeBatch(db); 

                for (const currentCar of inventory) {
                    if (!currentCar.regMark) continue;

                    const currentPlate = currentCar.regMark.replace(/\s+/g, '').toUpperCase();
                    const backupCar = data.inventory.find((v: any) => 
                        v.regMark && v.regMark.replace(/\s+/g, '').toUpperCase() === currentPlate
                    );
                    
                    if (backupCar && backupCar.crossBorder) {
                        const currentCb = currentCar.crossBorder || { isEnabled: false };
                        const importCb = backupCar.crossBorder;
                        
                        let isUpdated = false;
                        const mergedCb: any = { ...currentCb };

                        const keysToCheck = [
                            'mainlandPlate', 'hkCompany', 'mainlandCompany', 
                            'driver1', 'driver2', 'driver3', 'insuranceAgent', 'quotaNumber',
                            'dateHkInsurance', 'dateReservedPlate', 'dateBr', 'dateLicenseFee',
                            'dateMainlandJqx', 'dateMainlandSyx', 'dateClosedRoad', 'dateApproval',
                            'dateMainlandLicense', 'dateHkInspection'
                        ];

                        keysToCheck.forEach(key => {
                            if (!mergedCb[key] && importCb[key]) {
                                mergedCb[key] = importCb[key];
                                isUpdated = true;
                            }
                        });

                        if ((!mergedCb.ports || mergedCb.ports.length === 0) && importCb.ports && importCb.ports.length > 0) {
                            mergedCb.ports = importCb.ports;
                            isUpdated = true;
                        }

                        if (isUpdated) {
                            mergedCb.isEnabled = true;
                            const carRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory', currentCar.id);
                            batch.update(carRef, {
                                crossBorder: mergedCb,
                                updatedAt: serverTimestamp() 
                            });
                            restoreCount++;
                        }
                    }
                }

                if (restoreCount > 0) {
                    await batch.commit();
                    alert(`✅ 智能合併成功！\n系統已成功比對並補齊了 ${restoreCount} 台車輛的缺失資料！\n(原有的資料已安全保留)`);
                } else {
                    alert('分析完畢：沒有發現需要補齊的缺失資料。');
                }

            } catch (err) {
                console.error(err);
                alert('處理備份檔案時發生錯誤，請檢查檔案格式。');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // --- Render ---
    return (
        <div className="flex h-full gap-6">
        {/* 左側選單：手機上根據 showMobileMenu 顯示/隱藏 */}
        <div className={`w-full md:w-48 flex-none bg-slate-50 border-r border-slate-200 p-4 space-y-2 h-full ${showMobileMenu ? 'block' : 'hidden md:block'}`}>
            <h3 className="font-bold text-slate-400 text-xs uppercase mb-4 px-2">Config Menu</h3>
            {settingsInternalMenu.map(tab => (
                <button key={tab.key} onClick={() => { 
                    setActiveTab(tab.key); 
                    setShowMobileMenu(false);
                }} className={`w-full flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.key ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                    {tab.icon} {tab.label}
                </button>
            ))}
        </div>

        {/* 右側內容：手機上根據 showMobileMenu 顯示/隱藏 */}
        <div className={`flex-1 overflow-y-auto pr-4 pb-20 ${!showMobileMenu ? 'block' : 'hidden md:block'}`}>

            {/* 手機版標題列 + 返回按鈕 */}
            <div className="flex items-center gap-2 mb-6 pt-2 md:pt-0">
                <button onClick={() => setShowMobileMenu(true)} className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full">
                    <ArrowLeft size={20}/>
                </button>
                <h2 className="text-xl font-bold text-slate-800 capitalize">{activeTab.replace('_', ' ')} Settings</h2>
            </div>

                {/* 1. 一般設定 */}
                {activeTab === 'general' && (
                    <div className="space-y-6">
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

                {/* 推送通知設定 */}
                {activeTab === 'notifications' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center"><BellRing size={20} className="mr-2 text-blue-600"/> 推送通知設定 (Push Notifications)</h3>
                            
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
                                {permissionStatus !== 'granted' ? (
                                        <button onClick={requestNotificationPermission} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm">
                                            請求權限
                                        </button>
                                    ) : (
                                        <button onClick={requestNotificationPermission} className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm flex items-center">
                                            <Key size={14} className="mr-1"/> 重新請求
                                        </button>
                                    )}
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-sm font-bold text-slate-700">啟用系統推送 (Master Switch)</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={settings.pushConfig?.isEnabled || false} onChange={(e) => updateSettings('pushConfig', { ...settings.pushConfig, isEnabled: e.target.checked } as any)} />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                        <input type="checkbox" checked={settings.pushConfig?.events?.newCar || false} onChange={(e) => updateSettings('pushConfig', { ...settings.pushConfig, events: { ...settings.pushConfig?.events, newCar: e.target.checked } } as any)} className="mr-3 rounded accent-blue-600" />
                                        <span className="text-xs font-bold text-slate-600">新車入庫通知</span>
                                    </label>
                                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                        <input type="checkbox" checked={settings.pushConfig?.events?.sold || false} onChange={(e) => updateSettings('pushConfig', { ...settings.pushConfig, events: { ...settings.pushConfig?.events, sold: e.target.checked } } as any)} className="mr-3 rounded accent-blue-600" />
                                        <span className="text-xs font-bold text-slate-600">車輛售出通知</span>
                                    </label>
                                </div>
                            </div>
                        </div>

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

                {/* 2. 車輛資料 / 全域數據字典 (三級聯動修復版) */}
                {activeTab === 'vehicle_setup' && (
                    <div className="space-y-6 animate-fade-in pb-10">
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-2">
                            <h3 className="font-bold text-blue-800 flex items-center mb-1"><Database size={18} className="mr-2"/> 車輛三級聯動與數據字典</h3>
                            <p className="text-xs text-blue-600">在此統一管理全系統各處的基礎下拉選項。車輛採用「品牌 ➔ 型號 ➔ 海關代號」三層聯動架構。</p>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[450px]">
                            
                            {/* 1. 品牌欄 */}
                            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 flex flex-col">
                                <div className="p-3 border-b border-slate-200 bg-slate-100 font-bold text-slate-700"><span className="flex items-center"><Car size={16} className="mr-2 text-blue-500"/> 1. 品牌 (Makes)</span></div>
                                <div className="p-2 border-b border-slate-200 bg-white flex gap-1">
                                    <input value={newSetupMake} onChange={e => setNewSetupMake(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newSetupMake) { updateSettings('makes', [...(settings.makes || []), newSetupMake] as any); setNewSetupMake(''); } }} className="border rounded px-2 py-1 text-xs flex-1 outline-none focus:border-blue-400" placeholder="新增品牌..."/>
                                    <button onClick={() => { if (newSetupMake) { updateSettings('makes', [...(settings.makes || []), newSetupMake] as any); setNewSetupMake(''); } }} className="bg-slate-800 text-white px-2 rounded text-xs font-bold"><Plus size={14}/></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {(settings.makes || []).map((m: string, i: number) => (
                                        <div key={m} onClick={() => { setActiveSetupMake(m); setActiveSetupModel(''); }} className={`group flex justify-between items-center p-1.5 rounded border transition-colors cursor-pointer ${activeSetupMake === m ? 'bg-blue-50 border-blue-400 shadow-sm' : 'bg-white border-transparent hover:border-slate-300'}`}>
                                            <div className="flex items-center flex-1 mr-1">
                                                <input type="text" defaultValue={m} onBlur={e => handleEditMake(i, m, e.target.value)} onClick={e => e.stopPropagation()} className="bg-transparent border-b border-transparent focus:border-blue-300 outline-none w-full font-bold text-slate-700 text-xs py-0.5" />
                                            </div>
                                            <div className="flex items-center gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => handleMoveMake(i, 'up')} disabled={i === 0} className="p-1 hover:text-blue-600 disabled:opacity-30"><ChevronUp size={12}/></button>
                                                <button onClick={() => handleMoveMake(i, 'down')} disabled={i === settings.makes.length - 1} className="p-1 hover:text-blue-600 disabled:opacity-30"><ChevronDown size={12}/></button>
                                                <button onClick={() => handleDeleteMake(i, m)} className="p-1 hover:text-red-500"><Trash2 size={12}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 2. 型號欄 */}
                            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-200 bg-white flex flex-col">
                                <div className="p-3 border-b border-slate-200 bg-slate-50 font-bold text-slate-700"><span className="flex items-center"><CheckCircle size={16} className="mr-2 text-indigo-500"/> 2. 型號 (Models)</span></div>
                                {activeSetupMake ? (
                                    <>
                                        <div className="p-2 border-b border-slate-200 bg-indigo-50/30 flex gap-1">
                                            <input value={newSetupModel} onChange={e => setNewSetupModel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newSetupModel) { updateSettings('models', { ...settings.models, [activeSetupMake]: [...(settings.models[activeSetupMake] || []), newSetupModel] } as any); setNewSetupModel(''); } }} className="border border-indigo-200 rounded px-2 py-1 text-xs flex-1 outline-none focus:border-indigo-400" placeholder={`為 ${activeSetupMake} 新增...`}/>
                                            <button onClick={() => { if (newSetupModel) { updateSettings('models', { ...settings.models, [activeSetupMake]: [...(settings.models[activeSetupMake] || []), newSetupModel] } as any); setNewSetupModel(''); } }} className="bg-indigo-600 text-white px-2 rounded text-xs font-bold"><Plus size={14}/></button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                            {(settings.models[activeSetupMake] || []).map((model: string, i: number) => (
                                                <div key={model} onClick={() => setActiveSetupModel(model)} className={`group flex justify-between items-center p-1.5 rounded border transition-colors cursor-pointer ${activeSetupModel === model ? 'bg-indigo-50 border-indigo-400 shadow-sm' : 'bg-white border-slate-100 hover:border-indigo-200'}`}>
                                                    <div className="flex items-center flex-1 mr-1">
                                                        <input type="text" defaultValue={model} onBlur={e => handleEditModel(activeSetupMake, i, model, e.target.value)} onClick={e => e.stopPropagation()} className="bg-transparent border-b border-transparent focus:border-indigo-300 outline-none w-full font-bold text-slate-700 text-xs py-0.5" />
                                                    </div>
                                                    <div className="flex items-center gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                        <button onClick={() => handleMoveModel(activeSetupMake, i, 'up')} disabled={i === 0} className="p-1 hover:text-indigo-600 disabled:opacity-30"><ChevronUp size={12}/></button>
                                                        <button onClick={() => handleMoveModel(activeSetupMake, i, 'down')} disabled={i === settings.models[activeSetupMake].length - 1} className="p-1 hover:text-indigo-600 disabled:opacity-30"><ChevronDown size={12}/></button>
                                                        <button onClick={() => handleDeleteModel(activeSetupMake, i, model)} className="p-1 hover:text-red-500"><Trash2 size={12}/></button>
                                                    </div>
                                                </div>
                                            ))}
                                            {(settings.models[activeSetupMake] || []).length === 0 && <div className="text-[10px] text-slate-400 text-center py-10">尚無型號</div>}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-6 text-center"><Car size={24} className="mb-2 opacity-30"/><p className="text-[10px]">請先選擇品牌</p></div>
                                )}
                            </div>

                            {/* 3. 海關代號欄 */}
                            <div className="w-full md:w-1/3 bg-slate-50 flex flex-col">
                                <div className="p-3 border-b border-slate-200 bg-slate-100 font-bold text-slate-700"><span className="flex items-center"><FileText size={16} className="mr-2 text-emerald-600"/> 3. 海關代號 (Codes)</span></div>
                                {activeSetupModel ? (
                                    <>
                                        <div className="p-2 border-b border-slate-200 bg-emerald-50/30 flex gap-1">
                                            <input value={newSetupCode} onChange={e => setNewSetupCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newSetupCode) { updateSettings('codes', { ...settings.codes, [activeSetupModel]: [...((settings.codes || {})[activeSetupModel] || []), newSetupCode] } as any); setNewSetupCode(''); } }} className="border border-emerald-200 rounded px-2 py-1 text-xs flex-1 outline-none focus:border-emerald-400 uppercase font-mono" placeholder={`為 ${activeSetupModel} 新增代號...`}/>
                                            <button onClick={() => { if (newSetupCode) { updateSettings('codes', { ...settings.codes, [activeSetupModel]: [...((settings.codes || {})[activeSetupModel] || []), newSetupCode] } as any); setNewSetupCode(''); } }} className="bg-emerald-600 text-white px-2 rounded text-xs font-bold"><Plus size={14}/></button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                            {((settings.codes || {})[activeSetupModel] || []).map((code: string, i: number) => (
                                                <div key={code} className="group flex justify-between items-center p-1.5 bg-white rounded border border-slate-100 hover:border-emerald-200 transition-colors">
                                                    <div className="flex items-center flex-1 mr-1">
                                                        <input type="text" defaultValue={code} onBlur={e => handleEditCode(activeSetupModel, i, e.target.value)} className="bg-transparent border-b border-transparent focus:border-emerald-300 outline-none w-full font-bold font-mono text-emerald-700 text-xs py-0.5 uppercase" />
                                                    </div>
                                                    <div className="flex items-center gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleMoveCode(activeSetupModel, i, 'up')} disabled={i === 0} className="p-1 hover:text-emerald-600 disabled:opacity-30"><ChevronUp size={12}/></button>
                                                        <button onClick={() => handleMoveCode(activeSetupModel, i, 'down')} disabled={i === ((settings.codes || {})[activeSetupModel] || []).length - 1} className="p-1 hover:text-emerald-600 disabled:opacity-30"><ChevronDown size={12}/></button>
                                                        <button onClick={() => handleDeleteCode(activeSetupModel, i)} className="p-1 hover:text-red-500"><Trash2 size={12}/></button>
                                                    </div>
                                                </div>
                                            ))}
                                            {((settings.codes || {})[activeSetupModel] || []).length === 0 && <div className="text-[10px] text-slate-400 text-center py-10">尚無海關代號</div>}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-6 text-center"><Car size={24} className="mb-2 opacity-30"/><p className="text-[10px]">請先選擇型號</p></div>
                                )}
                            </div>
                        </div>

                        {/* 摺疊式萬能列表渲染引擎 */}
                        {[
                            { title: '外觀顏色 (Exterior Colors)', key: 'colors', icon: <Palette size={16}/>, placeholder: '例如: 白 (White)' },
                            { title: '內飾顏色 (Interior Colors)', key: 'interiorColors', icon: <Armchair size={16}/>, placeholder: '例如: 黑 (Black)' },
                            { title: '保養條款庫 (Warranty Terms)', key: 'warrantyTypes', icon: <ShieldCheck size={16}/>, placeholder: '例如: 5年/10萬公里' },
                            { title: '收款公司/車房名單 (Vendors)', key: 'expenseCompanies', icon: <Wrench size={16}/>, placeholder: '例如: 新港龍汽車' },
                            { title: '中港牌相關機構 (Institutions)', key: 'cbInstitutions', icon: <Building2 size={16}/>, placeholder: '例如: 中檢公司' },
                            { title: '收款方式/類別 (Payment Types)', key: 'paymentTypes', icon: <DollarSign size={16}/>, placeholder: '例如: 訂金 (Deposit)' }
                        ].map((dict) => {
                            const list = Array.isArray(settings[dict.key as keyof SystemSettings]) ? (settings[dict.key as keyof SystemSettings] as string[]) : [];
                            return (
                                <details key={dict.key} className="group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <summary className="p-4 font-bold text-slate-700 cursor-pointer list-none flex items-center justify-between outline-none hover:bg-slate-50 transition-colors">
                                        <span className="flex items-center gap-2">{dict.icon} {dict.title}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-400 font-normal bg-slate-100 px-2 py-0.5 rounded-full">{list.length} 項</span>
                                            <ChevronDown size={18} className="transition-transform group-open:rotate-180 text-slate-400"/>
                                        </div>
                                    </summary>
                                    <div className="p-4 pt-0">
                                        <div className="flex gap-2 mb-4 pt-4 border-t border-slate-100">
                                            <input id={`newInput_${dict.key}`} className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none flex-1 max-w-md focus:border-blue-400 focus:ring-1 ring-blue-400" placeholder={`輸入新選項 (${dict.placeholder})`} onKeyDown={(e) => { if (e.key === 'Enter') { const val = (e.target as HTMLInputElement).value; if (val) { addItem(dict.key as any, val); (e.target as HTMLInputElement).value = ''; } } }} />
                                            <button onClick={() => { const val = (document.getElementById(`newInput_${dict.key}`) as HTMLInputElement).value; if (val) { addItem(dict.key as any, val); (document.getElementById(`newInput_${dict.key}`) as HTMLInputElement).value = ''; } }} className="bg-slate-800 text-white px-4 rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors flex items-center"><Plus size={16} className="mr-1"/> 新增</button>
                                        </div>
                                        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                                            {list.map((item: any, i: number) => {
                                                const displayValue = typeof item === 'string' ? item : (item.name || JSON.stringify(item));
                                                return (
                                                    <div key={i} className="group/item bg-slate-50 hover:bg-blue-50 p-2 rounded-lg text-sm flex items-center justify-between border border-slate-200 w-full transition-colors">
                                                        <div className="flex-1 flex items-center mr-4">
                                                            <span className="text-slate-400 font-mono w-6 text-xs">{i+1}.</span>
                                                            <input type="text" defaultValue={displayValue} onBlur={(e) => editListItem(dict.key as any, i, e.target.value)} className="bg-transparent border-b border-transparent focus:border-blue-300 outline-none w-full font-bold text-slate-700 px-1 py-0.5" />
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-50 group-hover/item:opacity-100 transition-opacity">
                                                            <button onClick={() => moveListItem(dict.key as any, i, 'up')} disabled={i === 0} className="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-30 rounded hover:bg-slate-200"><ChevronUp size={16}/></button>
                                                            <button onClick={() => moveListItem(dict.key as any, i, 'down')} disabled={i === list.length - 1} className="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-30 rounded hover:bg-slate-200"><ChevronDown size={16}/></button>
                                                            <div className="w-px h-4 bg-slate-300 mx-1"></div>
                                                            <button onClick={() => removeItem(dict.key as any, i)} className="p-1.5 text-red-400 hover:text-white hover:bg-red-500 rounded transition-colors"><Trash2 size={16}/></button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {list.length === 0 && <div className="text-sm text-slate-400 p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">此列表目前沒有任何選項。</div>}
                                        </div>
                                    </div>
                                </details>
                            );
                        })}
                    </div>
                )}

                {/* 3. 財務與費用 (完整功能) */}
                {activeTab === 'expenses_setup' && (
                    <div className="space-y-8 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div>
                            <h3 className="font-bold text-lg mb-3 pb-2 border-b">財務費用預設值 (Financial Defaults)</h3>
                            <table className="w-full text-sm">
                                <thead><tr className="text-left bg-gray-50"><th className="p-2">項目名稱</th><th className="p-2">預設金額 ($)</th><th className="p-2">預設公司</th><th className="p-2">操作</th></tr></thead>
                                <tbody>
                                    {(settings.expenseTypes || []).map((type: any, idx: number) => (
                                        <tr key={idx} className="border-b hover:bg-slate-50">
                                            <td className="p-2"><input type="text" value={type.name || type} onChange={e => handleExpenseTypeChange(idx, 'name', e.target.value)} className="border rounded p-1 w-full bg-transparent"/></td>
                                            <td className="p-2"><input type="number" value={type.defaultAmount || 0} onChange={e => handleExpenseTypeChange(idx, 'defaultAmount', Number(e.target.value))} className="border rounded p-1 w-24"/></td>
                                            <td className="p-2">
                                                <select value={type.defaultCompany || ''} onChange={e => handleExpenseTypeChange(idx, 'defaultCompany', e.target.value)} className="border rounded p-1 w-full bg-transparent">
                                                    <option value="">-- 選擇 --</option>
                                                    {settings.expenseCompanies?.map((c: string) => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-2"><button onClick={() => removeItem('expenseTypes', idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button onClick={() => updateSettings('expenseTypes', [...(settings.expenseTypes||[]), { name: '新費用', defaultAmount: 0, defaultCompany: '', defaultDays: '0' }] as any)} className="mt-2 text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200 flex items-center w-fit"><Plus size={12} className="mr-1"/> 新增費用類型</button>
                        </div>
                    </div>
                )}

                {/* 4. 中港業務 (完整功能) */}
                {activeTab === 'crossborder_setup' && (
                    <div className="space-y-8 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div>
                            <h3 className="font-bold text-lg mb-3 pb-2 border-b">中港代辦項目預設值 (CB Defaults)</h3>
                            <table className="w-full text-sm">
                                <thead><tr className="text-left bg-gray-50"><th className="p-2">項目名稱</th><th className="p-2">預設收費 ($)</th><th className="p-2">預設天數</th><th className="p-2">預設機構</th><th className="p-2">操作</th></tr></thead>
                                <tbody>
                                    {(settings.cbItems || []).map((item: any, idx: number) => (
                                        <tr key={idx} className="border-b hover:bg-slate-50">
                                            <td className="p-2"><input type="text" value={item.name || item} onChange={e => handleCbItemChange(idx, 'name', e.target.value)} className="border rounded p-1 w-full bg-transparent"/></td>
                                            <td className="p-2"><input type="number" value={item.defaultFee || 0} onChange={e => handleCbItemChange(idx, 'defaultFee', Number(e.target.value))} className="border rounded p-1 w-24"/></td>
                                            <td className="p-2"><input type="number" value={item.defaultDays || '7'} onChange={e => handleCbItemChange(idx, 'defaultDays', e.target.value)} className="border rounded p-1 w-16"/></td>
                                            <td className="p-2">
                                                <select value={item.defaultInst || ''} onChange={e => handleCbItemChange(idx, 'defaultInst', e.target.value)} className="border rounded p-1 w-full bg-transparent">
                                                    <option value="">-- 選擇 --</option>
                                                    {settings.cbInstitutions?.map((inst: string) => <option key={inst} value={inst}>{inst}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-2"><button onClick={() => removeItem('cbItems', idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button onClick={() => updateSettings('cbItems', [...(settings.cbItems||[]), { name: '新服務', defaultFee: 0, defaultDays: '7', defaultInst: '' }] as any)} className="mt-2 text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200 flex items-center w-fit"><Plus size={12} className="mr-1"/> 新增服務項目</button>
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
                                                    {systemMainModules.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                                                </select>
                                            </div>
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
                                        <div className="flex gap-2">
                                            <button onClick={() => {
                                                const newPwd = prompt(`【BOSS 特權】\n請為 ${user.email} 設定新密碼：\n(留空則預設重置為 123456)`, "123456");
                                                if (newPwd !== null) {
                                                    const finalPwd = newPwd.trim() || "123456";
                                                    handleUserPermissionChange(user.email, 'password', finalPwd);
                                                    alert(`✅ 已強制重置 ${user.email} 的密碼為: ${finalPwd}\n請通知該員工使用新密碼登入。`);
                                                }
                                            }} className="text-amber-600 hover:text-amber-700 text-xs px-3 py-1.5 border border-amber-200 rounded bg-amber-50 font-bold shadow-sm active:scale-95 transition-transform">重置密碼</button>
                                            
                                            <button onClick={() => handleRemoveUser(user.email)} className="text-red-500 hover:text-red-700 text-xs px-3 py-1.5 border border-red-200 rounded bg-red-50 font-bold shadow-sm active:scale-95 transition-transform">移除</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {permissionGroups.map(mod => {
                                            const hasAccess = (user.modules || []).includes('all') || (user.modules || []).includes(mod.key);
                                            const isBoss = user.email === 'BOSS';
                                            return (
                                                <label key={mod.key} className={`flex items-center text-xs p-2 rounded border ${hasAccess ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-500 cursor-pointer hover:bg-slate-100'}`}>
                                                    <input type="checkbox" checked={hasAccess} disabled={isBoss} onChange={(e) => {
                                                            let newMods = user.modules || [];
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
                                updateSettings('dbDocTypes', { ...settings.dbDocTypes, [selectedDbCat]: [...current, newDocType] } as any);
                                setNewDocType('');
                            }} className="bg-slate-800 text-white px-4 py-2 rounded text-sm">新增</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(settings.dbDocTypes?.[selectedDbCat] || []).map((type:string, idx:number) => (
                                <span key={idx} className="bg-slate-100 px-3 py-1.5 rounded-full text-sm flex items-center gap-2 border">{type} <X size={14} className="cursor-pointer hover:text-red-500" onClick={() => {
                                    const current = settings.dbDocTypes[selectedDbCat] || [];
                                    const newList = current.filter((_:any, i:number) => i !== idx);
                                    updateSettings('dbDocTypes', { ...settings.dbDocTypes, [selectedDbCat]: newList } as any);
                                }}/></span>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'reminders' && ( <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><h3 className="font-bold text-slate-700 mb-4">系統提醒</h3><div className="bg-amber-50 p-4 rounded-lg mb-4"><label className="flex items-center"><input type="checkbox" checked={settings.reminders?.isEnabled} onChange={e=>updateSettings('reminders', {...settings.reminders, isEnabled: e.target.checked} as any)} className="mr-2"/> 開啟提醒功能</label></div></div> )}

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
                                    setBackupConfig(newConf as any); updateSettings('backup', newConf as any);
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
                            <p className="text-xs text-red-700/80 mb-4">從舊版的 JSON 備份檔中，無損提取並合併「中港車管家」的資料到現有車輛。</p>
                            <label className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 cursor-pointer shadow-sm inline-flex items-center">
                                <Upload size={16} className="mr-2"/> 上傳 JSON 備份檔合併修復
                                <input type="file" accept=".json" className="hidden" onChange={handleRescueImport} />
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsManager;
