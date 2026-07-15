'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, limit, getDocs, where } from 'firebase/firestore';
import { Play, Square, Download, Edit, CarFront, Clock, CheckCircle, Trash2, Calendar, X } from 'lucide-react';

type TradePlateLog = {
    id: string;
    status: 'in_use' | 'returned';
    startTime: any;
    endTime: any;
    vehicle: string;
    remark: string;
    user: string;
};

export default function TradePlateWidget({ db, appId, staffId }: { db: any, appId: string, staffId: string }) {
    const [logs, setLogs] = useState<TradePlateLog[]>([]);
    const [activeLog, setActiveLog] = useState<TradePlateLog | null>(null);
    const [editingLog, setEditingLog] = useState<TradePlateLog | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // ★ 日期區間選擇狀態 (預設本月 1 號到今日)
    const [exportStart, setExportStart] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [exportEnd, setExportEnd] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

    // 1. 監聽 T牌 紀錄 (供畫面顯示，限制 50 筆避免過載)
    useEffect(() => {
        if (!db || !appId) return;
        const q = query(
            collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 't_plate_logs'), 
            orderBy('startTime', 'desc'),
            limit(50)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logData: TradePlateLog[] = [];
            let currentActive = null;
            snapshot.forEach((doc) => {
                const data = { id: doc.id, ...doc.data() } as TradePlateLog;
                logData.push(data);
                if (data.status === 'in_use') currentActive = data;
            });
            setLogs(logData);
            setActiveLog(currentActive);
        });
        return () => unsubscribe();
    }, [db, appId]);

    // 2. 極速打卡：借出 T牌
    const handleCheckout = async () => {
        if (activeLog) return alert("⚠️ 試車牌目前正在使用中！");
        try {
            await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 't_plate_logs'), {
                status: 'in_use',
                startTime: serverTimestamp(),
                endTime: null,
                vehicle: '',
                remark: '',
                user: staffId || 'Unknown'
            });
        } catch (e) {
            console.error(e);
            alert("打卡失敗，請檢查網路連線！");
        }
    };

    // 3. 一鍵歸還
    const handleReturn = async () => {
        if (!activeLog) return;
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 't_plate_logs', activeLog.id), {
                status: 'returned',
                endTime: serverTimestamp()
            });
            setEditingLog({ ...activeLog, status: 'returned', endTime: new Date() });
        } catch (e) {
            alert("歸還失敗！");
        }
    };

    // 4. 儲存編輯/補填的資料
    const saveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLog) return;
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 't_plate_logs', editingLog.id), {
                vehicle: editingLog.vehicle || '',
                remark: editingLog.remark || '',
            });
            setEditingLog(null);
        } catch (e) {
            alert("資料儲存失敗！");
        }
    };

    // 5. 刪除紀錄
    const handleDelete = async (id: string) => {
        if (!confirm("確定要刪除這筆試車牌紀錄嗎？\n(注意：刪除後無法復原！)")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 't_plate_logs', id));
        } catch (e) {
            alert("刪除失敗！");
        }
    };

    // 6. 依據選擇的日期區間，精準抓取並匯出 CSV
    const handleExportCSV = async () => {
        if (!exportStart || !exportEnd) return alert("請先選擇完整的日期區間！");
        setIsExporting(true);

        const startD = new Date(exportStart);
        startD.setHours(0, 0, 0, 0);
        const endD = new Date(exportEnd);
        endD.setHours(23, 59, 59, 999);

        try {
            // 直接向 Firebase 請求該時間段的所有資料 (不受 50 筆限制)
            const q = query(
                collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 't_plate_logs'),
                where('startTime', '>=', startD),
                where('startTime', '<=', endD),
                orderBy('startTime', 'desc')
            );
            const snapshot = await getDocs(q);
            const exportData: TradePlateLog[] = [];
            snapshot.forEach(doc => exportData.push({ id: doc.id, ...doc.data() } as TradePlateLog));

            if (exportData.length === 0) {
                setIsExporting(false);
                return alert(`📅 ${exportStart} 至 ${exportEnd} 期間沒有任何打卡紀錄！`);
            }

            let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
            csvContent += "狀態,借出時間,歸還時間,使用者,車輛/車牌,用途備註\n";

            exportData.forEach(log => {
                const start = log.startTime?.toDate ? log.startTime.toDate().toLocaleString('zh-HK') : '';
                const end = log.endTime?.toDate ? log.endTime.toDate().toLocaleString('zh-HK') : '';
                // 清理換行符號以確保 CSV 格式不被破壞
                const safeVehicle = (log.vehicle || '').replace(/"/g, '""').replace(/\n/g, ' ');
                const safeRemark = (log.remark || '').replace(/"/g, '""').replace(/\n/g, ' ');

                const row = `${log.status === 'in_use' ? '使用中' : '已歸還'},"${start}","${end}","${log.user}","${safeVehicle}","${safeRemark}"`;
                csvContent += row + "\n";
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `試車牌紀錄_${exportStart}_至_${exportEnd}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (e) {
            console.error(e);
            alert("匯出失敗，請檢查資料庫權限或網路狀態！");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        // ★ 加上 relative 與 overflow-hidden，確保編輯表單不會凸出去走位
        <div className="bg-white p-4 md:p-6 flex flex-col md:flex-row gap-5 flex-none relative overflow-hidden h-full min-h-[400px]">
            
            {/* 左側：極速打卡區 */}
            <div className="flex-shrink-0 w-full md:w-1/3 flex flex-col justify-center items-center p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                <div className="flex flex-col items-center justify-center mb-6">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2 shadow-inner">
                        <CarFront size={28} />
                    </div>
                    <h3 className="font-black text-slate-800 text-lg tracking-wide">T牌 極速打卡</h3>
                </div>
                
                {activeLog ? (
                    <div className="w-full text-center animate-fade-in">
                        <div className="text-red-600 font-bold text-sm mb-3 animate-pulse flex items-center justify-center gap-1.5 bg-red-50 py-1.5 rounded-lg border border-red-100">
                            <Clock size={16} /> 使用中 ({activeLog.user})
                        </div>
                        <button onClick={handleReturn} className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-3.5 rounded-xl shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2">
                            <Square size={18} fill="currentColor" />
                            歸還 T牌
                        </button>
                    </div>
                ) : (
                    <div className="w-full text-center animate-fade-in">
                        <div className="text-emerald-600 font-bold text-sm mb-3 flex items-center justify-center gap-1.5 bg-emerald-50 py-1.5 rounded-lg border border-emerald-100">
                            <CheckCircle size={16} /> 在店內 (閒置)
                        </div>
                        <button onClick={handleCheckout} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3.5 rounded-xl shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2">
                            <Play size={18} fill="currentColor" />
                            立即借出
                        </button>
                    </div>
                )}
            </div>

            {/* 右側：近期紀錄與日期篩選匯出 */}
            <div className="flex-1 flex flex-col min-w-0">
                
                {/* 頂部：標題與匯出工具列 */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-3 gap-2 border-b border-slate-100 pb-3">
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                        <Calendar size={16} className="text-slate-400"/>
                        最近使用紀錄
                    </span>
                    
                    {/* 日期區間鎖定輸出器 */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                        <input 
                            type="date" 
                            value={exportStart} 
                            onChange={e => setExportStart(e.target.value)}
                            className="text-xs p-1.5 rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-blue-500 text-slate-600 font-mono"
                        />
                        <span className="text-xs text-slate-400 font-bold px-1">至</span>
                        <input 
                            type="date" 
                            value={exportEnd} 
                            onChange={e => setExportEnd(e.target.value)}
                            className="text-xs p-1.5 rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-blue-500 text-slate-600 font-mono"
                        />
                        <button onClick={handleExportCSV} disabled={isExporting} className="text-xs flex items-center gap-1 text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors font-bold shadow-sm disabled:opacity-50 ml-1">
                            {isExporting ? <Clock size={14} className="animate-spin"/> : <Download size={14} />} 
                            {isExporting ? '處理中' : '匯出報表'}
                        </button>
                    </div>
                </div>
                
                {/* 紀錄清單 */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-2.5 scrollbar-thin">
                    {logs.map(log => (
                        <div key={log.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-sm group hover:border-blue-200 transition-colors">
                            <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className={`px-2 py-0.5 rounded-[5px] font-bold text-[10px] ${log.status === 'in_use' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {log.status === 'in_use' ? '使用中' : '已還'}
                                    </span>
                                    <span className="font-bold text-slate-700 truncate text-sm">{log.user}</span>
                                    <span className="text-slate-400 font-mono text-xs ml-auto">
                                        {log.startTime?.toDate ? log.startTime.toDate().toLocaleTimeString('zh-HK', {hour:'2-digit', minute:'2-digit'}) : ''}
                                    </span>
                                </div>
                                <div className="text-slate-500 truncate text-xs flex items-center gap-1">
                                    {log.vehicle ? <span>🚘 {log.vehicle}</span> : <span className="text-red-400 font-bold">⚠️ 尚未填寫測試車輛</span>} 
                                    {log.remark && <span className="text-slate-300 mx-1">|</span>}
                                    {log.remark && <span>📝 {log.remark}</span>}
                                </div>
                            </div>
                            
                            {/* 修改與刪除按鈕 */}
                            <div className="flex gap-1 ml-3 flex-shrink-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditingLog(log)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="編輯修改">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => handleDelete(log.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="刪除紀錄">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && <div className="text-center text-slate-400 text-sm py-8">暫無任何打卡紀錄</div>}
                </div>
            </div>

            {/* ★★★ 修復走位：編輯/補填資料的內嵌式覆蓋層 (Absolute Overlay) ★★★ */}
            {/* 它會完美貼合在 Widget 內部，不會受到外部系統大 Modal 的裁切影響 */}
            {editingLog && (
                <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-[0_10px_40px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden transform transition-transform scale-100">
                        <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2"><Edit size={16}/> 編輯 T牌 使用資訊</h3>
                            <button onClick={() => setEditingLog(null)} className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                                <X size={18}/>
                            </button>
                        </div>
                        <form onSubmit={saveEdit} className="p-5 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">測試車輛 (車型 / 底盤號 / 車牌)</label>
                                <input 
                                    type="text" required
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-slate-50 focus:bg-white transition-colors"
                                    value={editingLog.vehicle || ''}
                                    onChange={e => setEditingLog({...editingLog, vehicle: e.target.value})}
                                    placeholder="例如：Toyota Alphard VE-1234"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">用途說明 / 備註</label>
                                <input 
                                    type="text" required
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-slate-50 focus:bg-white transition-colors"
                                    value={editingLog.remark || ''}
                                    onChange={e => setEditingLog({...editingLog, remark: e.target.value})}
                                    placeholder="例如：客人試車 / 去驗車中心"
                                />
                            </div>
                            <div className="pt-3 flex gap-3">
                                <button type="button" onClick={() => setEditingLog(null)} className="flex-1 p-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
                                    取消
                                </button>
                                <button type="submit" className="flex-1 p-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md active:scale-95 transition-all">
                                    儲存修改
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
