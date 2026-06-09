import React, { useState, useEffect } from 'react'; // ★ 補上 useEffect
import { createPortal } from 'react-dom'; // ★ 新增這行傳送門魔法
import { Bell, CheckCircle, X, FileText, Globe, Printer } from 'lucide-react';
import { Vehicle, SystemSettings } from '@/types';

interface SmartNotificationCenterProps {
    inventory: Vehicle[];
    settings: SystemSettings;
    triggerSmartPrint: (htmlContent: string, title: string) => void;
    // ★ 新增：接收當前登入者資訊，用於權限隔離
    currentUser: { email: string, modules: string[] } | null; 
}

const SmartNotificationCenter = ({ inventory, settings, triggerSmartPrint, currentUser }: SmartNotificationCenterProps) => {
    const [isOpen, setIsOpen] = useState(false);
    // ★ 新增這兩行：確保系統渲染完畢才開啟傳送門，防止 Next.js 報錯
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    
    // --- 1. 全域掃描邏輯 (升級版：加入資料權限隔離) ---
    const useScanReminders = () => {
        const today = new Date();
        const alerts: { id: string, vid: string, regMark: string, type: 'General' | 'CrossBorder', item: string, date: string, days: number }[] = [];
        const daysThreshold = settings.reminders?.daysBefore || 30;

        // ★ 判斷是否為最高權限管理者 (BOSS 或擁有 all 模組)
        const isAdmin = currentUser?.email?.toUpperCase() === 'BOSS' || currentUser?.modules?.includes('all');

        // ★ 核心過濾：管理員看全部，一般業務只看自己負責的車
        const visibleInventory = isAdmin 
            ? inventory 
            : inventory.filter(car => 
                (car as any).createdBy === currentUser?.email || // ★ 加上 (car as any)
                (car as any).assignedTo === currentUser?.email ||
                (car as any).sales === currentUser?.email
              );

        // ★ 改為掃描過濾後的 visibleInventory，而不是全公司資料庫
        visibleInventory.forEach(car => {
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

            // B. 中港證件
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
        // ★ 呼叫從 Props 傳進來的主程序列印函數
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

            {/* 2. Detail Modal (透過 Portal 傳送到最頂層，突破毛玻璃限制) */}
            {isOpen && mounted && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsOpen(false)}>
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
                </div>,
                document.body  // ★ 傳送門目標：直接送到整個網頁的最高層級
            )}
        </>
    );
};

export default SmartNotificationCenter;
