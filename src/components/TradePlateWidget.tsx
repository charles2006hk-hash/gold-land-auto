'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, limit, getDocs, where } from 'firebase/firestore';
import { Play, Square, Download, Edit, CarFront, Clock, CheckCircle, Trash2, Calendar, X, MapPin } from 'lucide-react';

type TradePlateLog = {
    id: string;
    status: 'in_use' | 'returned';
    startTime: any;
    endTime: any;
    vehicle: string;
    remark: string;
    user: string;
    startLocation?: string; 
    endLocation?: string;
};

// ★ 預設的授權使用人
const DEFAULT_AUTHORIZED_USER = "YU FAT KEUNG Z603876(0)";

export default function TradePlateWidget({ db, appId, staffId }: { db: any, appId: string, staffId: string }) {
    const [logs, setLogs] = useState<TradePlateLog[]>([]);
    const [activeLog, setActiveLog] = useState<TradePlateLog | null>(null);
    const [editingLog, setEditingLog] = useState<TradePlateLog | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // 日期區間選擇狀態
    const [exportStart, setExportStart] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [exportEnd, setExportEnd] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

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

    const handleCheckout = async () => {
        if (activeLog) return alert("⚠️ 試車牌目前正在使用中！");
        try {
            await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 't_plate_logs'), {
                status: 'in_use',
                startTime: serverTimestamp(),
                endTime: null,
                vehicle: '',
                remark: '',
                startLocation: '新界沙田翠湖花園停車場', // 預設起點
                endLocation: '',
                user: DEFAULT_AUTHORIZED_USER
            });
        } catch (e) {
            console.error(e);
            alert("打卡失敗，請檢查網路連線！");
        }
    };

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

    const saveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLog) return;
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 't_plate_logs', editingLog.id), {
                vehicle: editingLog.vehicle || '',
                remark: editingLog.remark || '',
                startLocation: editingLog.startLocation || '',
                endLocation: editingLog.endLocation || '',
                user: editingLog.user || DEFAULT_AUTHORIZED_USER
            });
            setEditingLog(null);
        } catch (e) {
            alert("資料儲存失敗！");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("確定要刪除這筆試車牌紀錄嗎？\n(注意：刪除後無法復原！)")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 't_plate_logs', id));
        } catch (e) {
            alert("刪除失敗！");
        }
    };

    // ★ 智能 CSV 匯出引擎 (完美對齊運輸署 10 欄位格式)
    const handleExportCSV = async () => {
        if (!exportStart || !exportEnd) return alert("請先選擇完整的日期區間！");
        setIsExporting(true);

        const startD = new Date(exportStart);
        startD.setHours(0, 0, 0, 0);
        const endD = new Date(exportEnd);
        endD.setHours(23, 59, 59, 999);

        try {
            const q = query(
                collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 't_plate_logs'),
                where('startTime', '>=', startD),
                where('startTime', '<=', endD),
                orderBy('startTime', 'asc') // 順向排序
            );
            const snapshot = await getDocs(q);
            const exportData: TradePlateLog[] = [];
            snapshot.forEach(doc => exportData.push({ id: doc.id, ...doc.data() } as TradePlateLog));

            if (exportData.length === 0) {
                setIsExporting(false);
                return alert(`📅 ${exportStart} 至 ${exportEnd} 期間沒有任何打卡紀錄！`);
            }

            // ★ 第一行表頭 (利用留空營造出跨欄視覺)
            let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
            csvContent += "日期,時間,,地點,,使用目的,車輛詳情,,使用人,\n";

            exportData.forEach(log => {
                // 1. 日期與時間處理
                let dateStr = "";
                let startTimeStr = "";
                let endTimeStr = "";
                
                if (log.startTime && log.startTime.toDate) {
                    const sd = log.startTime.toDate();
                    dateStr = `${sd.getFullYear()}/${sd.getMonth() + 1}/${sd.getDate()}`;
                    startTimeStr = sd.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit'}).replace(':', '');
                }
                if (log.endTime && log.endTime.toDate) {
                    const ed = log.endTime.toDate();
                    endTimeStr = ed.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit'}).replace(':', '');
                }

                // 2. 地點與目的
                const startLoc = `"${(log.startLocation || '').replace(/"/g, '""')}"`;
                const endLoc = `"${(log.endLocation || '').replace(/"/g, '""')}"`;
                const remark = `"${(log.remark || '').replace(/"/g, '""')}"`;

                // 3. 智能拆解車輛 (例: "TOYOTA BK1335" -> 廠牌 "TOYOTA", 詳情 "PRIVATE CAR BK1335")
                let vehMake = '';
                let vehDetails = '';
                const vehParts = (log.vehicle || '').split(' ');
                if (vehParts.length > 1) {
                    vehMake = vehParts[0].toUpperCase();
                    vehDetails = vehParts.slice(1).join(' ').toUpperCase();
                    if (!vehDetails.includes("PRIVATE CAR") && !vehDetails.includes("GOODS VEHICLE")) {
                        vehDetails = `PRIVATE CAR ${vehDetails}`;
                    }
                } else {
                    vehMake = (log.vehicle || '').toUpperCase();
                }
                vehMake = `"${vehMake.replace(/"/g, '""')}"`;
                vehDetails = `"${vehDetails.replace(/"/g, '""')}"`;

                // 4. 智能拆解使用人 (例: "YU FAT KEUNG Z603876(0)" -> 姓名 "YU FAT KEUNG", 證件 "Z603876(0)")
                let rawUser = log.user || DEFAULT_AUTHORIZED_USER;
                let userName = rawUser;
                let userId = '';
                const userParts = rawUser.split(' ');
                if (userParts.length > 1) {
                    const lastPart = userParts[userParts.length - 1];
                    // 若最後一個字串包含數字，判定為證件號碼
                    if (/\d/.test(lastPart)) { 
                        userId = lastPart;
                        userName = userParts.slice(0, -1).join(' ');
                    }
                }
                userName = `"${userName.replace(/"/g, '""')}"`;
                userId = `"${userId.replace(/"/g, '""')}"`;

                // ★ 組合單行 10 欄數據
                csvContent += `${dateStr},${startTimeStr},${endTimeStr},${startLoc},${endLoc},${remark},${vehMake},${vehDetails},${userName},${userId}\n`;
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `T牌運輸署登記冊_${exportStart}_至_${exportEnd}.csv`);
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
                        <div className="text-red-600 font-bold text-[10px] md:text-sm mb-3 animate-pulse flex items-center justify-center gap-1.5 bg-red-50 py-1.5 rounded-lg border border-red-100 overflow-hidden px-1">
                            <Clock size={16} className="flex-shrink-0"/> <span className="truncate">使用中 ({activeLog.user.split(' ')[0]})</span>
                        </div>
                        <button onClick={handleReturn} className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-3.5 rounded-xl shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2">
                            <Square size={18} fill="currentColor" />
                            歸還 T牌
                        </button>
                    </div>
                ) : (
                    <div className="w-full text-center animate-fade-in">
                        <div className="text-emerald-600 font-bold text-sm mb-3 flex items-center justify-center gap-1.5 bg-emerald-50 py-1.5 rounded-lg border border-emerald-100">
                            <CheckCircle size={16} /> 在店內 (可借用)
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
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-3 gap-2 border-b border-slate-100 pb-3">
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                        <Calendar size={16} className="text-slate-400"/>
                        最近使用紀錄
                    </span>
                    
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
                            {isExporting ? '處理中' : '匯出 Excel'}
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-2.5 scrollbar-thin">
                    {logs.map(log => (
                        <div key={log.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-sm group hover:border-blue-200 transition-colors">
                            <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-[5px] font-bold text-[10px] ${log.status === 'in_use' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {log.status === 'in_use' ? '使用中' : '已還'}
                                    </span>
                                    <span className="font-bold text-slate-700 truncate text-sm">{log.user.split(' ')[0]}</span>
                                    <span className="text-slate-400 font-mono text-[10px] md:text-xs ml-auto whitespace-nowrap">
                                        {log.startTime?.toDate ? log.startTime.toDate().toLocaleTimeString('zh-HK', {hour:'2-digit', minute:'2-digit'}) : ''}
                                    </span>
                                </div>
                                <div className="text-slate-500 truncate text-xs flex items-center gap-1">
                                    {log.vehicle ? <span>🚘 {log.vehicle}</span> : <span className="text-red-400 font-bold">⚠️ 尚未填寫車輛</span>} 
                                    {log.remark && <span className="text-slate-300 mx-1">|</span>}
                                    {log.remark && <span>📝 {log.remark}</span>}
                                </div>
                            </div>
                            
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

            {/* 編輯/補填資料 Overlay */}
            {editingLog && (
                <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-[0_10px_40px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden transform transition-transform scale-100">
                        <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2"><Edit size={16}/> 運輸署 T牌 紀錄補齊</h3>
                            <button onClick={() => setEditingLog(null)} className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                                <X size={18}/>
                            </button>
                        </div>
                        <form onSubmit={saveEdit} className="p-4 md:p-5 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">廠牌與車牌 (空格隔開)</label>
                                    <div className="relative">
                                        <CarFront size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text" required
                                            className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50 focus:bg-white"
                                            value={editingLog.vehicle || ''}
                                            onChange={e => setEditingLog({...editingLog, vehicle: e.target.value})}
                                            placeholder="例：TOYOTA BK1335"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">使用目的</label>
                                    <input 
                                        type="text" required
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50 focus:bg-white"
                                        value={editingLog.remark || ''}
                                        onChange={e => setEditingLog({...editingLog, remark: e.target.value})}
                                        placeholder="例：維修保養 / 交接車輛"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">駛出地點 (起點)</label>
                                    <div className="relative">
                                        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text" required
                                            className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50 focus:bg-white"
                                            value={editingLog.startLocation || ''}
                                            onChange={e => setEditingLog({...editingLog, startLocation: e.target.value})}
                                            placeholder="例：沙田翠湖花園"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">目的地 (終點)</label>
                                    <div className="relative">
                                        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text"
                                            className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50 focus:bg-white"
                                            value={editingLog.endLocation || ''}
                                            onChange={e => setEditingLog({...editingLog, endLocation: e.target.value})}
                                            placeholder="例：大昌行集團大廈"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">授權使用人 (姓名 + 證件號碼)</label>
                                <input 
                                    type="text" required
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-blue-50 text-blue-900 font-mono font-bold"
                                    value={editingLog.user || DEFAULT_AUTHORIZED_USER}
                                    onChange={e => setEditingLog({...editingLog, user: e.target.value})}
                                />
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex gap-3">
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
