// src/components/SmartNotificationCenter.tsx
import React, { useState, useEffect, useMemo } from 'react'; 
import { createPortal } from 'react-dom'; 
import { Bell, CheckCircle, X, FileText, Globe, Printer, Sparkles, Search, Database, AlertTriangle, CalendarDays, Clock } from 'lucide-react';
import { Vehicle, SystemSettings, DatabaseEntry } from '@/types';

interface SmartNotificationCenterProps {
    inventory: Vehicle[];
    settings: SystemSettings;
    triggerSmartPrint: (htmlContent: string, title: string) => void;
    currentUser: { email: string, modules: string[] } | null; 
    databaseReminders?: { expired: any[], soon: any[] }; 
    dbEntries?: DatabaseEntry[];
    setActiveTab?: (tab: any) => void;
    setEditingVehicle?: (v: any) => void;
    setEditingEntry?: (e: any) => void;
    setIsDbEditing?: (edit: boolean) => void;
    setActiveCbVehicleId?: (id: string | null) => void;
}

// ==================================================================
// ★ 系統智能助理彈窗 (重構：解決 UI 圓角溢出，並加入智能分類)
// ==================================================================
const SystemGreetingPopup = ({ 
    onClose, 
    allAlerts 
}: { 
    onClose: () => void, 
    allAlerts: any[] 
}) => {
    
    // 智能分類運算
    const categorizedTasks = useMemo(() => {
        return {
            expired: allAlerts.filter(a => a.days < 0).sort((a, b) => a.days - b.days), // 已過期 (越負越前面)
            today: allAlerts.filter(a => a.days === 0),                                 // 今天到期
            urgent: allAlerts.filter(a => a.days > 0 && a.days <= 7),                   // 未來 7 天內
            total: allAlerts.length
        };
    }, [allAlerts]);

    const { expired, today, urgent, total } = categorizedTasks;

    return (
        <div className="absolute top-full right-0 mt-3 w-80 md:w-96 animate-in fade-in slide-in-from-top-4 duration-500 origin-top-right z-50">
            {/* 對話氣泡的小尖角 */}
            <div className="absolute -top-1.5 right-4 w-4 h-4 bg-white border-t border-l border-blue-200 transform rotate-45 z-10 rounded-tl-sm"></div>
            
            {/* 核心修復：加入 overflow-hidden 確保內部漸層條完美貼合圓角 */}
            <div className="relative z-20 bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)]">
                
                {/* 完美貼合的頂部漸層邊條 */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 z-10"></div>
                
                {/* 關閉按鈕 */}
                <button 
                    onClick={onClose} 
                    className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-20"
                >
                    <X size={16} />
                </button>

                <div className="p-5 pt-6">
                    {/* 標題區 */}
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="text-blue-500 animate-pulse" size={18} />
                        <h3 className="font-bold text-slate-800 text-sm">系統智能助理</h3>
                    </div>
                    
                    <p className="text-slate-600 text-sm mb-4 font-medium">
                        您好！目前系統有 <span className="font-black text-red-600 text-lg mx-1">{total}</span> 件待辦事項。
                    </p>

                    {/* 任務清單區 (最大高度限制 + 自定義滾動條) */}
                    <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
                        
                        {/* 1. 今日待辦 (最優先執行) */}
                        {today.length > 0 && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                                <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs mb-2">
                                    <CalendarDays size={14} /> 今日待辦 ({today.length})
                                </div>
                                <ul className="space-y-1.5">
                                    {today.slice(0, 3).map((task, i) => (
                                        <li key={i} className="text-xs text-slate-700 leading-tight">
                                            • <span className="font-bold font-mono text-slate-900 bg-white px-1 border border-slate-200 rounded shadow-sm">{task.regMark || task.plate || task.id}</span> 的 {task.item}
                                        </li>
                                    ))}
                                    {today.length > 3 && <li className="text-[10px] text-blue-500 font-bold text-right mt-1">...等 {today.length} 項</li>}
                                </ul>
                            </div>
                        )}

                        {/* 2. 已過期 (最緊急) */}
                        {expired.length > 0 && (
                            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                                <div className="flex items-center gap-1.5 text-red-600 font-bold text-xs mb-2">
                                    <AlertTriangle size={14} /> 已過期 / 極緊急 ({expired.length})
                                </div>
                                <ul className="space-y-1.5">
                                    {expired.slice(0, 3).map((task, i) => (
                                        <li key={i} className="text-xs text-slate-700 leading-tight">
                                            • <span className="font-bold font-mono text-slate-900 bg-white px-1 border border-slate-200 rounded shadow-sm">{task.regMark || task.plate || task.id}</span> 的 {task.item} 
                                            <span className="text-red-600 font-bold ml-1">(超時 {Math.abs(task.days)} 天)</span>
                                        </li>
                                    ))}
                                    {expired.length > 3 && <li className="text-[10px] text-red-400 font-bold text-right mt-1">...等 {expired.length} 項</li>}
                                </ul>
                            </div>
                        )}

                        {/* 3. 未來 7 天內 (即將到期) */}
                        {(urgent.length > 0 && today.length === 0 && expired.length === 0) && (
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                                <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs mb-2">
                                    <Clock size={14} /> 近期提醒 ({urgent.length})
                                </div>
                                <ul className="space-y-1.5">
                                    {urgent.slice(0, 3).map((task, i) => (
                                        <li key={i} className="text-xs text-slate-700 leading-tight">
                                            • <span className="font-bold font-mono text-slate-900 bg-white px-1 border border-slate-200 rounded shadow-sm">{task.regMark || task.plate || task.id}</span> 的 {task.item} 
                                            <span className="text-amber-600 font-bold ml-1">(剩 {task.days} 天)</span>
                                        </li>
                                    ))}
                                    {urgent.length > 3 && <li className="text-[10px] text-amber-500 font-bold text-right mt-1">...等 {urgent.length} 項</li>}
                                </ul>
                            </div>
                        )}
                        
                        {total === 0 && (
                            <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                🎉 太棒了！目前沒有任何待辦事項。
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==================================================================
// 主元件
// ==================================================================
const SmartNotificationCenter = ({ 
    inventory, settings, triggerSmartPrint, currentUser, databaseReminders,
    dbEntries, setActiveTab, setEditingVehicle, setEditingEntry, setIsDbEditing, setActiveCbVehicleId
}: SmartNotificationCenterProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showAIBubble, setShowAIBubble] = useState(false); 
    const [searchTerm, setSearchTerm] = useState(''); 

    useEffect(() => setMounted(true), []);
    
    // --- 1. 車輛庫存全域掃描邏輯 ---
    const useScanReminders = () => {
        const today = new Date();
        const vehicleAlerts: { id: string, vid: string, regMark: string, type: 'General' | 'CrossBorder', item: string, date: string, days: number, source: string, raw: any }[] = [];
        const daysThreshold = settings.reminders?.daysBefore || 30;

        const isAdmin = currentUser?.email?.toUpperCase() === 'BOSS' || currentUser?.modules?.includes('all');

        const visibleInventory = isAdmin 
            ? inventory 
            : inventory.filter(car => 
                (car as any).createdBy === currentUser?.email || 
                (car as any).assignedTo === currentUser?.email ||
                (car as any).sales === currentUser?.email ||
                car.managedBy === currentUser?.email
              );

        visibleInventory.forEach(car => {
            const genDocs = [
                { key: 'licenseExpiry', reminderKey: 'licenseReminderEnabled', label: '車輛牌費 (License)' }, 
                { key: 'insuranceExpiry', reminderKey: 'insuranceReminderEnabled', label: '車輛保險 (Insurance)' }
            ];
            genDocs.forEach(d => {
                const dateVal = (car as any)[d.key];
                const isRemind = (car as any)[d.reminderKey] !== false;
                
                if (dateVal && isRemind) {
                    const diff = Math.ceil((new Date(dateVal).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    if (diff <= daysThreshold) {
                        vehicleAlerts.push({ id: `${car.id}-${d.key}`, vid: car.id!, regMark: car.regMark || '未出牌', type: 'General', item: d.label, date: dateVal, days: diff, source: 'vehicle', raw: car });
                    }
                }
            });

            const cb = car.crossBorder;
            if (cb && (cb.isEnabled || cb.mainlandPlate || cb.quotaNumber)) {
                const cbDocs = { 
                    dateHkInsurance: '香港保險', dateReservedPlate: '留牌紙', dateBr: '商業登記(BR)', 
                    dateLicenseFee: '香港牌費', dateMainlandJqx: '內地交強險', dateMainlandSyx: '內地商業險', 
                    dateClosedRoad: '禁區紙', dateApproval: '批文卡', dateMainlandLicense: '內地行駛證', dateHkInspection: '香港驗車(中港)'
                };
                Object.entries(cbDocs).forEach(([key, label]) => {
                    const dateVal = (cb as any)?.[key];
                    const reminderKey = key.replace('date', 'cb_remind_'); 
                    const isRemind = (cb as any)?.[reminderKey] !== false;

                    if (dateVal && isRemind) {
                        const diff = Math.ceil((new Date(dateVal).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        if (diff <= daysThreshold) {
                            vehicleAlerts.push({ id: `${car.id}-${key}`, vid: car.id!, regMark: car.regMark || '未出牌', type: 'CrossBorder', item: label, date: dateVal, days: diff, source: 'vehicle', raw: car });
                        }
                    }
                });
            }
        });
        
        return vehicleAlerts; 
    };

    // ★ 2. 資料庫提醒格式化邏輯 (智能解析名稱與車牌)
    const formatDbAlert = (i: any) => {
        const raw = dbEntries?.find(e => e.id === i.vid) || {} as any;
        const plate = raw.plateNoHK || raw.plateNoCN || '';
        const name = raw.name || raw.hkCompany || raw.mainlandCompany || '未命名紀錄';
        
        const docType = i.item && i.item.includes('-') ? i.item.split('-').pop().trim() : (raw.docType || raw.category || '文件');
        
        const regMark = plate ? plate : name;
        const itemDesc = plate ? `${name} - ${docType}` : docType;

        return { 
            id: i.id, 
            vid: i.vid, 
            regMark, 
            type: 'General' as 'General', 
            item: itemDesc, 
            date: i.date, 
            days: i.days, 
            source: 'database', 
            raw 
        };
    };

    // ★ 3. 將車輛提醒與資料庫提醒合併並排序
    const alerts = [
        ...useScanReminders(),
        ...(databaseReminders?.expired || []).map(formatDbAlert),
        ...(databaseReminders?.soon || []).map(formatDbAlert)
    ].sort((a, b) => a.days - b.days); 

    const expiredCount = alerts.filter(a => a.days < 0).length;
    const warningCount = alerts.length - expiredCount;

    // ★ 4. 根據搜尋框過濾
    const filteredAlerts = alerts.filter(item => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (item.regMark || '').toLowerCase().includes(searchLower) || 
               (item.item || '').toLowerCase().includes(searchLower);
    });

    // --- AI 氣泡彈窗定時器 ---
    useEffect(() => {
        if (alerts.length > 0) {
            const showTimer = setTimeout(() => setShowAIBubble(true), 1500);
            const hideTimer = setTimeout(() => setShowAIBubble(false), 11500);
            return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
        }
    }, [alerts.length]);

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
                            <th style="border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left; background-color: #f8f9fa; font-weight: bold; color: #555; width: 25%;">車牌/名稱 (Ref)</th>
                            <th style="border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left; background-color: #f8f9fa; font-weight: bold; color: #555; width: 25%;">到期項目 (Item)</th>
                            <th style="border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left; background-color: #f8f9fa; font-weight: bold; color: #555; width: 20%;">到期日 (Date)</th>
                            <th style="border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: right; background-color: #f8f9fa; font-weight: bold; color: #555; width: 15%;">狀態 (Status)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${alerts.map(it => `
                            <tr>
                                <td style="border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left;">
                                    <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; ${it.type === 'General' ? 'background: #e0f2fe; color: #0369a1;' : 'background: #f3e8ff; color: #7e22ce;'}">${it.source === 'database' ? '資料庫' : (it.type === 'General' ? '車輛車務' : '中港業務')}</span>
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
            </div>
        `;
        triggerSmartPrint(htmlContent, 'Alert_Report');
    };

    return (
        <div className="relative inline-block z-50">
            {/* 1. Header Button (鈴鐺) */}
            <button 
                onClick={() => setIsOpen(true)} 
                className="relative p-2 rounded-full hover:bg-slate-100 transition-colors group bg-white border border-slate-200 shadow-sm"
                title="到期事項提醒中心"
            >
                <Bell size={20} className={`transition-colors ${alerts.length > 0 ? 'text-slate-600' : 'text-slate-400'}`} />
                {alerts.length > 0 && (
                    <span className={`absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white border-2 border-white shadow-sm ${expiredCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}>
                        {alerts.length > 9 ? '9+' : alerts.length}
                    </span>
                )}
            </button>

            {/* 2. 重構後的 AI 智能對話氣泡 (包含分類提醒) */}
            {showAIBubble && alerts.length > 0 && (
                <SystemGreetingPopup 
                    onClose={() => setShowAIBubble(false)} 
                    allAlerts={alerts} 
                />
            )}

            {/* 3. Detail Modal (透過 Portal 傳送到最頂層) */}
            {isOpen && mounted && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsOpen(false)}>
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        
                        {/* ★ 包含搜尋框的頭部 */}
                        <div className="p-5 border-b border-slate-100 flex flex-col gap-3 bg-slate-50">
                            <div className="flex justify-between items-start">
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
                            
                            {/* ★ 小鈴鐺專用搜尋框 */}
                            <div className="relative mt-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="🔍 搜尋車牌、對象、項目關鍵字..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all bg-white shadow-sm"
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14}/></button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 bg-slate-100/50">
                            {alerts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                                    <CheckCircle size={48} className="mb-4 text-green-500/50"/>
                                    <p>目前沒有任何急需處理的項目</p>
                                </div>
                            ) : filteredAlerts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                                    <Search size={36} className="mb-4 text-slate-300"/>
                                    <p>找不到符合的提醒事項</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredAlerts.map((item, idx) => (
                                        <div 
                                            key={`${item.id}-${idx}`} 
                                            /* ★ 加入跳轉邏輯：依照資料來源路由至不同的分頁 */
                                            onClick={() => {
                                                if (item.source === 'database' && setActiveTab && setEditingEntry && setIsDbEditing) {
                                                    const rawEntry = dbEntries?.find(e => e.id === item.vid);
                                                    if (rawEntry) {
                                                        setActiveTab('database');
                                                        setEditingEntry(rawEntry);
                                                        setIsDbEditing(true);
                                                        setIsOpen(false);
                                                    }
                                                } else if (item.source === 'vehicle' && setActiveTab && setEditingVehicle) {
                                                    if (item.type === 'CrossBorder' && setActiveCbVehicleId) {
                                                        setActiveTab('cross_border');
                                                        setActiveCbVehicleId(item.vid);
                                                    } else {
                                                        setActiveTab('inventory');
                                                        setEditingVehicle(item.raw);
                                                    }
                                                    setIsOpen(false);
                                                }
                                            }}
                                            className={`p-3 rounded-xl border flex justify-between items-center bg-white shadow-sm transition-all hover:scale-[1.01] hover:bg-slate-50 cursor-pointer ${item.days < 0 ? 'border-red-100 border-l-4 border-l-red-500' : 'border-amber-100 border-l-4 border-l-amber-500'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${item.source === 'database' ? 'bg-indigo-50 text-indigo-600' : (item.type === 'General' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600')}`}>
                                                    {item.source === 'database' ? <Database size={18}/> : (item.type === 'General' ? <FileText size={18}/> : <Globe size={18}/>)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-slate-800 font-mono">{item.regMark}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">{item.source === 'database' ? '資料庫' : (item.type === 'General' ? '車務/文件' : '中港')}</span>
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

                        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                            <button onClick={() => setIsOpen(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">關閉</button>
                            {alerts.length > 0 && (
                                <button onClick={handlePrint} className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 shadow-lg shadow-slate-200 flex items-center transition-all active:scale-95">
                                    <Printer size={16} className="mr-2"/> 列印報表 (Print Report)
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SmartNotificationCenter;
