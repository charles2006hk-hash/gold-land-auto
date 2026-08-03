import React, { useState, useEffect } from 'react'; 
import { createPortal } from 'react-dom'; 
import { Bell, CheckCircle, X, FileText, Globe, Printer, Sparkles, AlertTriangle, Clock } from 'lucide-react';
import { Vehicle, SystemSettings } from '@/types';

interface SmartNotificationCenterProps {
    inventory: Vehicle[];
    settings: SystemSettings;
    triggerSmartPrint: (htmlContent: string, title: string) => void;
    currentUser: { email: string, modules: string[] } | null; 
}

const SmartNotificationCenter = ({ inventory, settings, triggerSmartPrint, currentUser }: SmartNotificationCenterProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showAIBubble, setShowAIBubble] = useState(false); // ★ 新增 AI 氣泡狀態

    useEffect(() => setMounted(true), []);
    
    // --- 1. 全域掃描邏輯 (保留原有權限隔離與運算) ---[cite: 8]
    const useScanReminders = () => {
        const today = new Date();
        const alerts: { id: string, vid: string, regMark: string, type: 'General' | 'CrossBorder', item: string, date: string, days: number }[] = [];
        const daysThreshold = settings.reminders?.daysBefore || 30;

        const isAdmin = currentUser?.email?.toUpperCase() === 'BOSS' || currentUser?.modules?.includes('all');

        const visibleInventory = isAdmin 
            ? inventory 
            : inventory.filter(car => 
                (car as any).createdBy === currentUser?.email || 
                (car as any).assignedTo === currentUser?.email ||
                (car as any).sales === currentUser?.email
              );

        visibleInventory.forEach(car => {
            // A. 一般證件[cite: 8]
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
                        alerts.push({ id: `${car.id}-${d.key}`, vid: car.id!, regMark: car.regMark || 'No Plate', type: 'General', item: d.label, date: dateVal, days: diff });
                    }
                }
            });

            // B. 中港證件[cite: 8]
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

    // ★★★ 2. AI 氣泡彈窗定時器 ★★★
    useEffect(() => {
        if (alerts.length > 0) {
            // 載入後 1.5 秒彈出
            const showTimer = setTimeout(() => setShowAIBubble(true), 1500);
            // 10 秒後自動隱藏
            const hideTimer = setTimeout(() => setShowAIBubble(false), 11500);
            return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
        }
    }, [alerts.length]);

    const handlePrint = () => { /* 保留原本列印邏輯... */ };

    return (
        <div className="relative inline-block z-50">
            {/* 1. Header Button (鈴鐺) */}[cite: 8]
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

            {/* ★★★ 2. AI 智能對話氣泡 ★★★ */}
            {showAIBubble && alerts.length > 0 && (
                <div className="absolute top-full right-0 mt-3 w-64 md:w-72 animate-in fade-in slide-in-from-top-4 duration-500 origin-top-right z-50">
                    {/* 氣泡尾巴 (小三角形) */}
                    <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-t border-l border-blue-200 transform rotate-45 z-10"></div>
                    
                    {/* 氣泡主體 */}
                    <div className="relative z-20 bg-white rounded-2xl shadow-2xl border border-blue-100 p-4 overflow-hidden">
                        {/* 頂部裝飾光暈 */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                        
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-1.5 text-blue-600 font-black text-xs">
                                <Sparkles size={14} className="animate-pulse" />
                                系統智能助理
                            </div>
                            <button onClick={() => setShowAIBubble(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        </div>
                        
                        <div className="text-sm text-slate-700 font-medium leading-relaxed">
                            您好！目前系統有 <span className="text-red-600 font-black text-base mx-1">{alerts.length}</span> 件待辦事項。
                            <br/>
                            <span className="text-xs text-slate-500 mt-1 block bg-slate-50 p-2 rounded-lg border border-slate-100">
                                最緊急：車牌 <span className="font-mono font-bold text-slate-800 bg-white px-1 border border-slate-200 rounded shadow-sm">{alerts[0]?.regMark}</span> 的 {alerts[0]?.item} 
                                {alerts[0]?.days < 0 
                                    ? <span className="text-red-500 font-bold ml-1">(已過期 {Math.abs(alerts[0]?.days)} 天)</span> 
                                    : <span className="text-amber-500 font-bold ml-1">(剩 {alerts[0]?.days} 天)</span>
                                }。
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Detail Modal (透過 Portal 傳送到最頂層) */}[cite: 8]
            {isOpen && mounted && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsOpen(false)}>
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        
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

                        <div className="flex-1 overflow-y-auto p-2 bg-slate-100/50">
                            {alerts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                                    <CheckCircle size={48} className="mb-4 text-green-500/50"/>
                                    <p>目前沒有任何急需處理的項目</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {alerts.map((item, idx) => (
                                        <div key={`${item.id}-${idx}`} className={`p-3 rounded-xl border flex justify-between items-center bg-white shadow-sm transition-transform hover:scale-[1.01] ${item.days < 0 ? 'border-red-100 border-l-4 border-l-red-500' : 'border-amber-100 border-l-4 border-l-amber-500'}`}>
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

                        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                            <button onClick={() => setIsOpen(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">關閉</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SmartNotificationCenter;
