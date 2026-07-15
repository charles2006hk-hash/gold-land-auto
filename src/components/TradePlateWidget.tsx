'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import { Play, Square, Download, Edit, CarFront, Clock, CheckCircle } from 'lucide-react';

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

    // 1. 監聽 T牌 紀錄 (只抓最近 50 筆供畫面顯示)
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
            alert("打卡失敗，請檢查網路！");
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
            // 歸還後自動打開視窗讓員工補填資料
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

    // 5. 匯出 CSV 報表 (完美支援中文)
    const exportCSV = () => {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
        csvContent += "狀態,借出時間,歸還時間,使用者,車輛/車牌,用途備註\n";

        logs.forEach(log => {
            const start = log.startTime?.toDate ? log.startTime.toDate().toLocaleString('zh-HK') : '';
            const end = log.endTime?.toDate ? log.endTime.toDate().toLocaleString('zh-HK') : '';
            const row = `${log.status === 'in_use' ? '使用中' : '已歸還'},"${start}","${end}","${log.user}","${log.vehicle || ''}","${log.remark || ''}"`;
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `試車牌紀錄表_${new Date().toLocaleDateString('zh-HK')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-white/60 backdrop-blur-xl p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex flex-col md:flex-row gap-4 mb-4 flex-none group hover:bg-white/80 transition-all">
            
            {/* 左側：極速打卡區 */}
            <div className="flex-shrink-0 w-full md:w-1/3 flex flex-col justify-center items-center p-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-3">
                    <CarFront className="text-slate-700" size={20} />
                    <h3 className="font-bold text-slate-800 tracking-wide">T牌 極速打卡</h3>
                </div>
                
                {activeLog ? (
                    <div className="w-full text-center animate-fade-in">
                        <div className="text-red-600 font-bold text-sm mb-2 animate-pulse flex items-center justify-center gap-1">
                            <Clock size={14} /> 使用中 ({activeLog.user})
                        </div>
                        <button onClick={handleReturn} className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-3 rounded-xl shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2">
                            <Square size={16} fill="currentColor" />
                            歸還 T牌
                        </button>
                    </div>
                ) : (
                    <div className="w-full text-center animate-fade-in">
                        <div className="text-emerald-600 font-bold text-sm mb-2 flex items-center justify-center gap-1">
                            <CheckCircle size={14} /> 在店內 (閒置)
                        </div>
                        <button onClick={handleCheckout} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2">
                            <Play size={16} fill="currentColor" />
                            立即借出
                        </button>
                    </div>
                )}
            </div>

            {/* 右側：近期紀錄與匯出 */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">最近使用紀錄 (需補齊資訊)</span>
                    <button onClick={exportCSV} className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-md transition-colors font-bold">
                        <Download size={12} /> 匯出 CSV 報表
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto max-h-32 pr-2 space-y-2 scrollbar-thin">
                    {logs.slice(0, 5).map(log => (
                        <div key={log.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm text-xs group/item hover:border-blue-200">
                            <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className={`px-1.5 py-0.5 rounded-[4px] font-bold text-[9px] ${log.status === 'in_use' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {log.status === 'in_use' ? '使用中' : '已還'}
                                    </span>
                                    <span className="font-bold text-slate-700 truncate">{log.user}</span>
                                    <span className="text-slate-400 font-mono text-[10px]">
                                        {log.startTime?.toDate ? log.startTime.toDate().toLocaleTimeString('zh-HK', {hour:'2-digit', minute:'2-digit'}) : ''}
                                    </span>
                                </div>
                                <div className="text-slate-500 truncate text-[10px]">
                                    {log.vehicle ? `🚘 ${log.vehicle}` : <span className="text-red-400 font-bold">⚠️ 尚未填寫車輛</span>} 
                                    {log.remark ? ` | 📝 ${log.remark}` : ''}
                                </div>
                            </div>
                            <button onClick={() => setEditingLog(log)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors ml-2 flex-shrink-0">
                                <Edit size={14} />
                            </button>
                        </div>
                    ))}
                    {logs.length === 0 && <div className="text-center text-slate-400 text-xs py-4">暫無使用紀錄</div>}
                </div>
            </div>

            {/* 編輯/補填資料的 Modal */}
            {editingLog && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                            <h3 className="font-bold">📝 補填 T牌 使用資訊</h3>
                        </div>
                        <form onSubmit={saveEdit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">測試車輛 (車型 / 底盤號 / 車牌)</label>
                                <input 
                                    type="text" required
                                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    value={editingLog.vehicle || ''}
                                    onChange={e => setEditingLog({...editingLog, vehicle: e.target.value})}
                                    placeholder="例如：Toyota Alphard VE-1234"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">用途說明 / 備註</label>
                                <input 
                                    type="text" required
                                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    value={editingLog.remark || ''}
                                    onChange={e => setEditingLog({...editingLog, remark: e.target.value})}
                                    placeholder="例如：客人試車 / 去驗車中心"
                                />
                            </div>
                            <div className="pt-2 flex gap-2">
                                <button type="button" onClick={() => setEditingLog(null)} className="flex-1 p-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">取消</button>
                                <button type="submit" className="flex-1 p-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md active:scale-95 transition-all">儲存紀錄</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
