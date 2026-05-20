// src/components/CrossBorderModule.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Globe, FileText, Plus, Edit, Trash2, ChevronUp, ChevronDown, 
  X, Check, DollarSign, AlertTriangle, Clock, Car, ChevronRight,
  Image as ImageIcon, ArrowRight, DownloadCloud, Upload, Loader2, XCircle
} from 'lucide-react';
import { CrossBorderTask, Vehicle } from '@/types';
import { COMPANY_INFO } from '@/config/constants';
import { compressImage } from '@/utils/imageHelpers';

// --- 輔助工具函數 ---
const formatCurrency = (amount: number) => new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', maximumFractionDigits: 0 }).format(amount || 0);

const getDaysRemaining = (targetDate?: string) => {
    if (!targetDate) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ------------------------------------------------------------------
// ★★★ Document Custody Modal (文件交收視窗) ★★★
// ------------------------------------------------------------------
const DocumentCustodyModal = ({ vehicle, onClose, onSaveLog, staffId }: any) => {
    const [action, setAction] = useState<'CheckIn' | 'CheckOut'>('CheckIn');
    const [docName, setDocName] = useState('牌簿 (VRD)');
    const [target, setTarget] = useState(action === 'CheckIn' ? (vehicle.customerName || '客戶') : '客戶');
    const [photo, setPhoto] = useState<string | null>(null);
    const [note, setNote] = useState('');
    
    const [isCompressing, setIsCompressing] = useState(false);
    const [previewZoom, setPreviewZoom] = useState<string | null>(null);

    const commonDocs = ['牌簿 (VRD)', '行車證', '香港身份證', '回鄉證', '公司註冊證 (CI)', '商業登記 (BR)', '批文卡', '禁區紙', '驗車紙'];

    const getCurrentStatus = () => {
        const statusMap: Record<string, string> = {};
        (vehicle.crossBorder?.documentLogs || []).forEach((log: any) => {
            statusMap[log.docName] = log.action === 'CheckIn' ? '🏢 在公司' : `📤 在 ${log.direction}`;
        });
        return statusMap;
    };
    const currentStatus = getCurrentStatus();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsCompressing(true);
            try {
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

                    {/* 歷史紀錄顯示區 */}
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
// ★★★ Cross Border Module 主元件 ★★★
// ------------------------------------------------------------------
export default function CrossBorderModule({ 
    inventory, settings, dbEntries, activeCbVehicleId, setActiveCbVehicleId, setEditingVehicle, addCbTask, updateCbTask, deleteCbTask, addPayment, deletePayment,
    updateVehicle, primaryImages, onJumpToDoc
}: any) {
    const [searchTerm, setSearchTerm] = useState('');
    const [showExpired, setShowExpired] = useState(true);
    const [showSoon, setShowSoon] = useState(true);
    const [isMobileDetail, setIsMobileDetail] = useState(false);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [showDocModal, setShowDocModal] = useState(false); 
    
    const [newTaskDate, setNewTaskDate] = useState('');
    const [pendingTasks, setPendingTasks] = useState<{item: string, fee: number, note: string, days: string}[]>([]);

    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<CrossBorderTask>>({});
    
    const [expandedPaymentTaskId, setExpandedPaymentTaskId] = useState<string | null>(null);
    const [newPayAmount, setNewPayAmount] = useState('');
    const [newPayMethod, setNewPayMethod] = useState('Cash');
    const [reportModalData, setReportModalData] = useState<{ title: string, type: 'expired' | 'soon', items: any[] } | null>(null);

    useEffect(() => { if (activeCbVehicleId && window.innerWidth < 768) setIsMobileDetail(true); }, [activeCbVehicleId]);
    const handleBackToList = () => { setIsMobileDetail(false); setActiveCbVehicleId(null); };

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

    const expiredItems: any[] = []; const soonItems: any[] = [];
    cbVehicles.forEach((v:any) => { 
        Object.entries(dateFields).forEach(([fieldKey, label]) => { 
            const dateStr = (v.crossBorder as any)?.[fieldKey]; 
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
        
        // ★★★ 智能合併：將所有勾選的項目名稱用 ' + ' 串起，金額自動加總，只在畫面上產出一行項目！
        const combinedItemName = pendingTasks.map(t => t.item).join(' + ');
        const totalFee = pendingTasks.reduce((sum, t) => sum + t.fee, 0);
        const combinedNote = pendingTasks.map(t => t.note).filter(Boolean).join('; ');
        const maxDays = String(Math.max(...pendingTasks.map(t => Number(t.days) || 0)));
        
        const newTask: CrossBorderTask = { 
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5), 
            date: newTaskDate, 
            item: combinedItemName, 
            fee: totalFee,          
            days: maxDays || '7', 
            institution: '公司', 
            handler: '', 
            currency: 'HKD', 
            note: combinedNote, 
            isPaid: false 
        }; 
        
        addCbTask(activeCar.id!, newTask); 
        setPendingTasks([]);
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

            {showDocModal && activeCar && <DocumentCustodyModal vehicle={activeCar} staffId={"Staff"} onClose={() => setShowDocModal(false)} onSaveLog={handleSaveDocLog} />}

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
                
                <div className={`w-full md:w-1/4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden ${isMobileDetail ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-3 border-b bg-slate-50"><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜尋車牌..." className="w-full px-2 py-1.5 text-xs border rounded"/></div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {filteredVehicles.map((car:any) => {
                            let expiredCount = 0;
                            Object.keys(dateFields).forEach(k => { 
                                const d = (car.crossBorder as any)?.[k]; 
                                const reminderKey = k.replace('date', 'cb_remind_');
                                const isRemind = (car.crossBorder as any)?.[reminderKey] !== false;
                                if(d && isRemind && getDaysRemaining(d)! < 0) expiredCount++; 
                            });
                            
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
                                    onDoubleClick={() => setEditingVehicle(car)} 
                                    className={`p-2.5 rounded-lg cursor-pointer border transition-all flex gap-3 items-center ${activeCbVehicleId === car.id ? 'bg-purple-50 border-purple-300 shadow-md ring-1 ring-purple-100' : 'bg-white hover:border-purple-100'}`}
                                    title="單擊切換右側中港資訊，雙擊開啟車輛詳細資料"
                                >
                                    
                                    <div className="w-16 h-12 rounded overflow-visible relative flex-shrink-0 bg-slate-100 border border-slate-200 shadow-inner flex items-center justify-center">
                                        {(() => {
                                            const thumbUrl = primaryImages[car.id] || (car.photos && car.photos.length > 0 ? (typeof car.photos[0] === 'string' ? car.photos[0] : car.photos[0].url) : null);
                                            
                                            if (thumbUrl) {
                                                return <img src={thumbUrl} className="w-full h-full object-cover rounded-[3px]" alt="thumbnail" />;
                                            } else {
                                                return <Car size={18} className="text-slate-300"/>;
                                            }
                                        })()}

                                        {expiredCount > 0 ? (
                                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 border border-white rounded-full flex items-center justify-center animate-pulse shadow-sm z-10">
                                                <span className="text-[9px] text-white font-bold leading-none">{expiredCount}</span>
                                            </div>
                                        ) : (
                                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 border border-white rounded-full shadow-sm z-10"></div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                                        <div className="flex justify-between items-start mb-1.5">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className="bg-[#FFD600] text-black border border-black font-black font-mono text-xs px-1.5 rounded-[2px] leading-tight shadow-sm">
                                                    {car.regMark || '未出牌'}
                                                </span>
                                                {car.crossBorder?.mainlandPlate && (
                                                    <span className={`${
                                                        car.crossBorder.mainlandPlate.startsWith('粵Z') ? 'bg-black text-white border-white' : 'bg-[#003399] text-white border-white'
                                                    } border font-bold font-mono text-[10px] px-1.5 rounded-[2px] leading-tight shadow-sm`}>
                                                        {car.crossBorder.mainlandPlate}
                                                    </span>
                                                )}
                                            </div>
                                            <ChevronRight size={16} className={`ml-auto mt-0.5 ${activeCbVehicleId === car.id ? 'text-purple-500' : 'text-gray-300'}`}/>
                                        </div>
                                        
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

                            {(activeCar.crossBorder?.documentLogs?.length || 0) > 0 && (
                                <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100 flex items-center gap-3 overflow-x-auto whitespace-nowrap scrollbar-hide">
                                    <span className="text-[10px] font-bold text-yellow-800 uppercase">文件狀態:</span>
                                    {(() => { const logs = activeCar.crossBorder.documentLogs; const lastLog = logs[logs.length-1]; return (<span className="text-xs text-slate-600 flex items-center"><span className={`w-2 h-2 rounded-full mr-1 ${lastLog.action==='CheckIn'?'bg-green-500':'bg-red-500'}`}></span>{lastLog.docName} {lastLog.action==='CheckIn'?'已收':'已交'} ({lastLog.handler} @ {lastLog.timestamp.split(' ')[0]})</span>); })()}
                                    <button onClick={() => setShowDocModal(true)} className="text-[10px] text-blue-600 underline ml-auto">查看詳情</button>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto p-4 bg-white">
                                <div className="flex justify-between items-end mb-2"><h4 className="font-bold text-slate-700 text-sm">收費項目 ({activeCar.crossBorder?.tasks?.length || 0})</h4><button onClick={openAddModal} className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700 flex items-center font-bold shadow-sm transition-transform active:scale-95"><Plus size={14} className="mr-1"/> 新增項目</button></div>
                                <table className="w-full text-sm border-collapse">
                                    <thead className="bg-slate-50 font-bold text-xs sticky top-0"><tr><th className="p-2 text-left">日期</th><th className="p-2 text-left">項目</th><th className="p-2 text-right">費用</th><th className="p-2 text-center">收款狀態</th><th className="p-2 text-center">操作/跨模組開單</th></tr></thead>
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
                                                        <td className="p-2 text-xs font-mono text-gray-500">{task.date}</td>
                                                        <td className="p-2 font-medium">
                                                            <div className="text-slate-800 font-bold">{task.item}</div>
                                                            {task.note && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{task.note}</div>}
                                                        </td>
                                                        <td className="p-2 text-right font-mono font-bold text-slate-800">{formatCurrency(task.fee)}</td>
                                                        <td className="p-2 text-center cursor-pointer" onClick={() => setExpandedPaymentTaskId(isExpanded ? null : task.id)}>
                                                            <div className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all ${isPaid ? 'bg-green-100 text-green-700 border-green-200' : (paid > 0 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-50 text-red-600 border-red-100')}`}>
                                                                {isPaid ? '已結清' : (paid > 0 ? `欠 ${remaining}` : '未付款')} {isExpanded ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
                                                            </div>
                                                        </td>
                                                        <td className="p-2 text-center flex justify-center gap-1.5 items-center">
                                                            {/* ★★★ 智能自動開單系統：點擊即帶著客戶、兩地車牌及項目金額，跳轉生成發票 ★★★ */}
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (!onJumpToDoc) { alert("開單系統連動未就緒"); return; }
                                                                    
                                                                    const hkPlate = activeCar.regMark || '';
                                                                    const mainlandPlate = activeCar.crossBorder?.mainlandPlate || '';
                                                                    const combinedPlates = mainlandPlate ? `${hkPlate} / ${mainlandPlate}` : hkPlate;
                                                                    const taskNote = task.note || '';
                                                                    const combinedRemarks = mainlandPlate ? `【中港車牌：${mainlandPlate}】\n${taskNote}` : taskNote;
                                                                    
                                                                    const invoiceData = {
                                                                        id: null,
                                                                        type: 'invoice',
                                                                        vehicleId: activeCar.id,
                                                                        formData: {
                                                                            companyNameEn: COMPANY_INFO.name_en, companyNameCh: COMPANY_INFO.name_ch,
                                                                            companyAddress: COMPANY_INFO.address_ch, companyPhone: COMPANY_INFO.phone, companyEmail: COMPANY_INFO.email,
                                                                            customerName: activeCar.customerName || '', customerPhone: activeCar.customerPhone || '',
                                                                            customerId: activeCar.customerID || '', customerAddress: activeCar.customerAddress || '',
                                                                            regMark: combinedPlates, make: activeCar.make || '', model: activeCar.model || '',
                                                                            chassisNo: activeCar.chassisNo || '', engineNo: activeCar.engineNo || '', year: activeCar.year || '',
                                                                            price: '0', docDate: new Date().toISOString().split('T')[0], deliveryDate: new Date().toISOString().split('T')[0],
                                                                            remarks: combinedRemarks 
                                                                        },
                                                                        checklist: { vrd: false, keys: false, tools: false, manual: false, other: '' },
                                                                        docItems: [{
                                                                            id: task.id,
                                                                            desc: mainlandPlate ? `[中港業務代辦] ${task.item} (${mainlandPlate})` : `[中港業務代辦] ${task.item}`,
                                                                            amount: task.fee, isSelected: true
                                                                        }],
                                                                        depositItems: [{ id: 'dep_1', label: 'Deposit (訂金)', amount: 0 }],
                                                                        showTerms: false
                                                                    };
                                                                    
                                                                    onJumpToDoc(invoiceData);
                                                                }}
                                                                className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-100 font-bold tracking-tight flex items-center shadow-sm"
                                                                title="連動開單系統生成發票"
                                                            >
                                                                🧾 發票
                                                            </button>
                                                            <button type="button" onClick={() => startEditing(task)} className="text-blue-400 hover:text-blue-600 p-1 hover:bg-blue-50 rounded"><Edit size={14}/></button>
                                                            <button type="button" onClick={() => deleteCbTask(activeCar.id!, task.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr className="bg-slate-50/80 border-b-2 border-slate-100 shadow-inner">
                                                            <td colSpan={5} className="p-3 pl-8">
                                                                <div className="flex gap-6 items-start">
                                                                    <div className="w-1/3 min-w-[200px] bg-white p-3 rounded border shadow-sm">
                                                                        <h5 className="text-xs font-bold text-gray-500 mb-2">新增收款</h5>
                                                                        <div className="flex flex-col gap-2">
                                                                            <input type="number" value={newPayAmount} onChange={e => setNewPayAmount(e.target.value)} placeholder={`輸入金額 (餘額: ${remaining})`} className="border p-1.5 text-xs rounded w-full"/>
                                                                            {/* ★★★ 局部收款增加對數選項 ★★★ */}
                                                                            <select value={newPayMethod} onChange={e => setNewPayMethod(e.target.value)} className="border p-1.5 text-xs rounded w-full">
                                                                                <option value="Cash">現金 (Cash)</option>
                                                                                <option value="Bank Transfer">銀行轉帳</option>
                                                                                <option value="Cheque">支票</option>
                                                                                <option value="WeChat/Alipay">微信/支付寶</option>
                                                                                <option value="Trade-in">對數 (Trade-in)</option>
                                                                            </select>
                                                                            <button onClick={() => handleAddPartPayment(task)} className="bg-blue-600 text-white py-1.5 rounded text-xs font-bold hover:bg-blue-700 mt-1">確認收款</button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <h5 className="text-xs font-bold text-gray-500 mb-2">收款紀錄 ({taskPayments.length})</h5>
                                                                        {taskPayments.length === 0 ? (<p className="text-xs text-gray-400 italic">尚無收款紀錄</p>) : (
                                                                            <table className="w-full text-xs text-left border-collapse">
                                                                                <thead><tr className="border-b text-gray-400"><th>日期</th><th>金額</th><th>方式</th><th>操作</th></tr></thead>
                                                                                <tbody>
                                                                                    {taskPayments.map((p: any) => (
                                                                                        <tr key={p.id} className="border-b last:border-0 h-8">
                                                                                            <td className="font-mono text-gray-600">{p.date}</td>
                                                                                            <td className="font-bold text-green-600">{formatCurrency(p.amount)}</td>
                                                                                            <td>{p.method}</td>
                                                                                            <td><button onClick={() => deletePayment(activeCar.id!, p.id)} className="text-red-400 hover:text-red-600"><X size={12}/></button></td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
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
}
