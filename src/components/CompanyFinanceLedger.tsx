// src/components/CompanyFinanceLedger.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    DollarSign, CalendarDays, Plus, CheckCircle2, AlertTriangle, 
    Download, Copy, Trash2, Loader2, ShieldAlert, Building2, 
    TrendingUp, ArrowUpRight, ArrowDownRight, FileSpreadsheet, RefreshCw
} from 'lucide-react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, getDocs, orderBy, limit } from 'firebase/firestore';

// 標準會計日常開支科目
const LEDGER_CATEGORIES = [
    { name: '公司租金', icon: Building2 },
    { name: '水電網絡', icon: RefreshCw },
    { name: '員工薪資/佣金', icon: DollarSign },
    { name: '交際應酬/茶水', icon: DollarSign },
    { name: '市場廣告/行銷', icon: DollarSign },
    { name: '文具雜項/軟體訂閱', icon: DollarSign },
    { name: '車輛代辦規費', icon: DollarSign },
    { name: '其他雜支', icon: DollarSign }
];

export default function CompanyFinanceLedger({ db, appId, staffId, currentUser }: any) {
    // 🔒 核心權限防護鎖：只允許 BOSS 或具備 all 權限的管理者進入
    const isManager = staffId === 'BOSS' || currentUser?.modules?.includes('all') || currentUser?.role === 'admin';

    const [ledgerItems, setLedgerItems] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]); // 用於計算賣車總利潤
    const [loading, setLoading] = useState(true);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
    const [filterMonth, setFilterMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
    
    // 表單狀態
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newExpense, setNewExpense] = useState({
        category: '公司租金',
        type: 'Fixed', // Fixed = 固定費用, Variable = 浮動費用
        title: '',
        amount: '',
        dueDate: new Date().toISOString().split('T')[0],
        status: 'Unpaid', // Unpaid = 待繳, Paid = 已繳
        paymentDate: ''
    });

    // 1. 實時監聽公司日常費用總帳
    useEffect(() => {
        if (!db || !appId || !isManager) return;

        const q = query(
            collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'company_expenses'),
            orderBy('dueDate', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(doc => {
                list.push({ id: doc.id, ...doc.data() });
            });
            setLedgerItems(list);
            setLoading(false);
        }, (err) => {
            console.error("監聽日常總帳失敗:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, appId, isManager]);

    // 2. 實時監聽車輛庫存 (用來拉取賣車利潤做數對帳)
    useEffect(() => {
        if (!db || !appId || !isManager) return;

        const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(doc => {
                list.push(doc.data());
            });
            setVehicles(list);
        });
        return () => unsubscribe();
    }, [db, appId, isManager]);

    // 3. 篩選與會計做數統計
    const currentMonthItems = useMemo(() => {
        const prefix = `${filterYear}-${filterMonth}`;
        return ledgerItems.filter(item => (item.dueDate || '').startsWith(prefix));
    }, [ledgerItems, filterYear, filterMonth]);

    // 計算本月待繳費紅綠燈指標
    const unpaidItems = useMemo(() => {
        return ledgerItems.filter(item => item.status === 'Unpaid').sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [ledgerItems]);

    // 財務做數摘要計算面板
    const summary = useMemo(() => {
        let totalFixedPaid = 0;
        let totalVariablePaid = 0;
        let totalUnpaid = 0;

        currentMonthItems.forEach(item => {
            const amt = Number(item.amount) || 0;
            if (item.status === 'Unpaid') {
                totalUnpaid += amt;
            } else {
                if (item.type === 'Fixed') totalFixedPaid += amt;
                else totalVariablePaid += amt;
            }
        });

        // 💰 計算車輛銷售帶來的總毛利 (已售車輛: 售價 + 附加費 - 進貨成本 - 翻新支出)
        let totalCarProfit = 0;
        const targetMonthPrefix = `${filterYear}-${filterMonth}`;
        
        vehicles.forEach(v => {
            // 比對車輛售出月份 (stockOutDate 或成交付款日期)
            const outDate = v.stockOutDate || '';
            if (outDate.startsWith(targetMonthPrefix) && v.status === 'Sold') {
                const sellPrice = Number(v.price) || 0;
                const costPrice = Number(v.costPrice) || 0;
                const addonsTotal = (v.salesAddons || []).reduce((sum: number, a: any) => sum + (a.isFree ? 0 : (a.amount || 0)), 0);
                const expensesTotal = (v.expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
                
                const singleCarProfit = (sellPrice + addonsTotal) - (costPrice + expensesTotal);
                totalCarProfit += singleCarProfit;
            }
        });

        const totalOpex = totalFixedPaid + totalVariablePaid;
        const netProfit = totalCarProfit - totalOpex;

        return {
            fixedPaid: totalFixedPaid,
            variablePaid: totalVariablePaid,
            unpaid: totalUnpaid,
            totalOpex: totalOpex,
            carProfit: totalCarProfit,
            netProfit: netProfit
        };
    }, [currentMonthItems, vehicles, filterYear, filterMonth]);

    // 4. 新增日常開支項目
    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExpense.title || !newExpense.amount) return alert('請填寫費用名稱與金額！');
        
        setIsSubmitting(true);
        try {
            const id = Date.now().toString();
            const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'company_expenses', id);
            await setDoc(docRef, {
                ...newExpense,
                amount: Number(newExpense.amount.replace(/,/g, '')),
                createdAt: new Date().toISOString(),
                updatedBy: currentUser?.email || staffId
            });

            setNewExpense(prev => ({ ...prev, title: '', amount: '' }));
        } catch (err) {
            alert('記帳失敗: ' + err);
        }
        setIsSubmitting(false);
    };

    // 5. 切換繳費狀態 (🔴 待繳 <-> 🟢 已繳)
    const handleToggleStatus = async (item: any) => {
        try {
            const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'company_expenses', item.id);
            const nextStatus = item.status === 'Paid' ? 'Unpaid' : 'Paid';
            await setDoc(docRef, {
                ...item,
                status: nextStatus,
                paymentDate: nextStatus === 'Paid' ? new Date().toISOString().split('T')[0] : ''
            }, { merge: true });
        } catch (err) {
            alert('更新狀態失敗: ' + err);
        }
    };

    // 6. 刪除記帳紀錄
    const handleDeleteItem = async (id: string) => {
        if (!confirm('確定要永久刪除此筆日常開支紀錄嗎？')) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'company_expenses', id));
        } catch (err) {
            alert('刪除失敗: ' + err);
        }
    };

    // 7. 神器：一鍵複製上個月的固定開支 (Fixed OPEX)
    const handleCopyLastMonthFixed = async () => {
        if (!confirm('系統將自動搜尋上個月設定為「固定費用」的項目（如租金、水電、網絡訂閱），並一鍵複製為本月的「待繳費」清單，是否執行？')) return;
        
        setLoading(true);
        try {
            // 計算上個月的年月份
            let lastM = Number(filterMonth) - 1;
            let lastY = Number(filterYear);
            if (lastM === 0) { lastM = 12; lastY -= 1; }
            const lastMonthPrefix = `${lastY}-${lastM.toString().padStart(2, '0')}`;

            const lastMonthFixedItems = ledgerItems.filter(item => item.type === 'Fixed' && (item.dueDate || '').startsWith(lastMonthPrefix));

            if (lastMonthFixedItems.length === 0) {
                alert(`上個月 (${lastMonthPrefix}) 沒有設定任何「固定費用」紀錄可供複製。`);
                setLoading(false);
                return;
            }

            // 批量複製到本月
            for (const item of lastMonthFixedItems) {
                const id = (Date.now() + Math.random()).toString();
                const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'company_expenses', id);
                
                // 將到期日自動順延一個月
                const newDueDate = `${filterYear}-${filterMonth}-${item.dueDate?.split('-')[2] || '01'}`;

                await setDoc(docRef, {
                    category: item.category,
                    type: 'Fixed',
                    title: `${item.title} (續期)`,
                    amount: item.amount,
                    dueDate: newDueDate,
                    status: 'Unpaid',
                    paymentDate: '',
                    createdAt: new Date().toISOString(),
                    updatedBy: staffId
                });
            }

            alert(`✅ 成功複製 ${lastMonthFixedItems.length} 筆固定日常開支至本月！`);
        } catch (err) {
            alert('複製失敗: ' + err);
        }
        setLoading(false);
    };

    // 8. 會計做數神器：一鍵匯出會計審計 Excel 格式 (CSV)
    const handleExportCSV = () => {
        let csvContent = "\uFEFF"; // 解決 Excel 開啟亂碼問題 (BOM)
        csvContent += "會計年度,會計月份,費用科目,開支屬性,項目名稱,開支金額(HKD),到期日,繳費狀態,實際付款日,最後經手人\n";

        currentMonthItems.forEach(item => {
            csvContent += `${filterYear},${filterMonth},${item.category},${item.type === 'Fixed'?'固定開支':'浮動開支'},"${item.title.replace(/"/g, '""')}",${item.amount},${item.dueDate},${item.status === 'Paid'?'已結清':'🔴待繳費'},${item.paymentDate || '-'},${item.updatedBy || '-'}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `金田汽車_營運總帳_${filterYear}年${filterMonth}月.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 🔒 權限攔截 UI
    if (!isManager) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-2xl border border-dashed border-red-200 p-6 shadow-sm">
                <div className="p-4 bg-red-50 text-red-600 rounded-full mb-4 shadow-sm animate-bounce">
                    <ShieldAlert size={40} />
                </div>
                <h3 className="text-lg font-black text-slate-800">安全權限攔截</h3>
                <p className="text-xs text-slate-500 font-bold mt-1 max-w-sm text-center">
                    「公司日常營運財務總帳」目前暫時僅對公司最高管理者（BOSS）或高階會計權限人員開放。如需調閱，請聯絡管理員開通。
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-60">
                <Loader2 size={36} className="animate-spin text-blue-600 mb-2" />
                <p className="text-sm text-slate-500 font-bold">正在調閱大內總帳庫存...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 bg-slate-50 p-1 md:p-2 rounded-2xl">
            
            {/* 1. 頂部大戰情室數據庫看板 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 車輛售出總毛利 */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">本月車輛售出利潤</span>
                        <span className="text-xl font-black font-mono text-emerald-600 mt-1 block">${summary.carProfit.toLocaleString()}</span>
                    </div>
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={20}/></div>
                </div>

                {/* 公司營運總開支 */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-red-500"></div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">本月營運已付費用 (OPEX)</span>
                        <span className="text-xl font-black font-mono text-red-600 mt-1 block">${summary.totalOpex.toLocaleString()}</span>
                    </div>
                    <div className="p-2.5 bg-red-50 text-red-600 rounded-lg"><ArrowUpRight size={20}/></div>
                </div>

                {/* 🔴 本月未繳費提醒燈 */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-amber-500"></div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">本月待繳開支紅燈</span>
                        <span className="text-xl font-black font-mono text-amber-600 mt-1 block">${summary.unpaid.toLocaleString()}</span>
                    </div>
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg animate-pulse"><AlertTriangle size={20}/></div>
                </div>

                {/* 👑 公司年度真實淨利潤 */}
                <div className={`p-4 rounded-xl border shadow-sm flex items-center justify-between relative overflow-hidden ${summary.netProfit >= 0 ? 'bg-blue-900 border-blue-950 text-white' : 'bg-rose-950 border-red-950 text-white'}`}>
                    <div>
                        <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block">公司本月真實淨利 (Net)</span>
                        <span className="text-2xl font-black font-mono mt-1 block tracking-tight">${summary.netProfit.toLocaleString()}</span>
                    </div>
                    <div className={`p-2.5 rounded-lg ${summary.netProfit >= 0 ? 'bg-blue-800 text-blue-200' : 'bg-rose-800 text-rose-200'}`}>
                        {summary.netProfit >= 0 ? <ArrowDownRight size={22} className="rotate-180 text-emerald-400"/> : <ArrowDownRight size={22} className="text-rose-400"/>}
                    </div>
                </div>
            </div>

            {/* 2. 紅綠燈日常繳費催繳預警區 */}
            {unpaidItems.length > 0 && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 shadow-sm animate-in fade-in">
                    <div className="flex items-center gap-2 text-xs font-black text-amber-800 uppercase tracking-wider mb-3">
                        <AlertTriangle size={16} className="text-amber-600 animate-bounce" /> 
                        🚨 管理員催繳預警看板：有 {unpaidItems.length} 筆跨期日常費用尚未結清！
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {unpaidItems.slice(0,6).map(item => (
                            <div key={item.id} className="bg-white p-3 rounded-lg border border-amber-200 shadow-sm flex justify-between items-center group hover:border-amber-400 transition-all">
                                <div className="min-w-0 pr-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">{item.category}</span>
                                        <span className="text-[9px] text-slate-400 font-mono font-bold">{item.dueDate}</span>
                                    </div>
                                    <h4 className="font-bold text-xs text-slate-700 mt-1 truncate">{item.title}</h4>
                                </div>
                                <div className="flex items-center gap-2 flex-none">
                                    <span className="font-mono font-black text-sm text-red-600">${Number(item.amount).toLocaleString()}</span>
                                    <button type="button" onClick={() => handleToggleStatus(item)} className="p-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded-md transition-colors" title="標記為已繳費"><CheckCircle2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. 中間主要區塊：隨手記帳與做數清單 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* 左側：隨手日常記帳表單 */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
                    <h3 className="font-black text-slate-800 text-sm border-b pb-2 flex items-center gap-2"><Plus size={18} className="text-blue-600"/> 隨手日常記帳門戶</h3>
                    <form onSubmit={handleAddExpense} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">選擇開支科目</label>
                            <select 
                                value={newExpense.category} 
                                onChange={e => handleExpenseTypeChange(e.target.value)}
                                className="w-full text-xs p-2.5 border rounded-lg bg-slate-50 font-bold text-slate-700"
                            >
                                {LEDGER_CATEGORIES.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">費用屬性</label>
                            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
                                <button type="button" onClick={() => setNewExpense({...newExpense, type: 'Fixed'})} className={`py-1.5 text-xs font-bold rounded-md transition-all ${newExpense.type === 'Fixed' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>🏢 固定開支 (按月)</button>
                                <button type="button" onClick={() => setNewExpense({...newExpense, type: 'Variable'})} className={`py-1.5 text-xs font-bold rounded-md transition-all ${newExpense.type === 'Variable' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>🎈 浮動/臨時開支</button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">項目/單據名稱</label>
                            <input type="text" placeholder="例如：7月份灣仔地舖租金、買咖啡豆..." value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} className="w-full p-2.5 border rounded-lg text-xs font-bold outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"/>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">應繳到期日 (Due)</label>
                                <input type="date" value={newExpense.dueDate} onChange={e => setNewExpense({...newExpense, dueDate: e.target.value})} className="w-full p-2 border rounded-lg text-xs font-mono bg-slate-50"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">應繳金額 (HKD)</label>
                                <input type="text" placeholder="$ 0" value={newExpense.amount} onChange={e => {
                                    let cleanVal = e.target.value.replace(/[^0-9]/g, '');
                                    setNewExpense({...newExpense, amount: cleanVal.replace(/\B(?=(\d{3})+(?!\d))/g, ',')});
                                }} className="w-full p-2 border rounded-lg text-sm font-black font-mono bg-slate-50 text-right text-blue-700 outline-none focus:border-blue-500"/>
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 shadow-md">
                            {isSubmitting ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>} 立即記入流水帳
                        </button>
                    </form>
                </div>

                {/* 右側：會計總帳主清單 */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:col-span-2 space-y-4">
                    
                    {/* 會計年度月份切換排版區 */}
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-b pb-3 flex-none">
                        <div className="flex items-center gap-2">
                            <CalendarDays size={18} className="text-slate-400" />
                            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="p-1.5 border rounded-md text-xs font-bold text-slate-700 outline-none bg-slate-50 cursor-pointer">
                                {['2026', '2027', '2025'].map(y => <option key={y} value={y}>{y} 年</option>)}
                            </select>
                            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="p-1.5 border rounded-md text-xs font-bold text-slate-700 outline-none bg-slate-50 cursor-pointer">
                                {Array.from({length: 12}, (_, i) => (i+1).toString().padStart(2, '0')).map(m => <option key={m} value={m}>{m} 月</option>)}
                            </select>
                        </div>
                        
                        <div className="flex gap-2">
                            {/* 複製上月神器 */}
                            <button type="button" onClick={handleCopyLastMonthFixed} className="flex-1 sm:flex-none text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-lg shadow-sm flex items-center justify-center gap-1 transition-colors">
                                <Copy size={12}/> 一鍵套用上月固定開支
                            </button>
                            {/* 會計匯出 */}
                            <button type="button" onClick={handleExportCSV} className="flex-1 sm:flex-none text-[11px] bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold px-3 py-1.5 rounded-lg shadow-sm flex items-center justify-center gap-1 transition-colors">
                                <FileSpreadsheet size={12}/> 匯出會計 Excel
                            </button>
                        </div>
                    </div>

                    {/* 日常流水帳名細表格 */}
                    <div className="overflow-x-auto min-h-[300px]">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200">
                                    <th className="p-3">應繳日期</th>
                                    <th className="p-3">費用科目</th>
                                    <th className="p-3">日常項目明細名稱</th>
                                    <th className="p-3 text-right">開支金額</th>
                                    <th className="p-3 text-center">狀態</th>
                                    <th className="p-3 text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentMonthItems.map(item => (
                                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors font-medium text-slate-700">
                                        <td className="p-3 font-mono tracking-tight">{item.dueDate}</td>
                                        <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.type==='Fixed' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-600'}`}>{item.category}</span></td>
                                        <td className="p-3">
                                            <div className="font-bold text-slate-800">{item.title}</div>
                                            {item.status === 'Paid' && <div className="text-[9px] text-emerald-500 font-mono mt-0.5">付款日: {item.paymentDate}</div>}
                                        </td>
                                        <td className="p-3 text-right font-mono font-black text-base md:text-sm text-slate-800">${Number(item.amount).toLocaleString()}</td>
                                        <td className="p-3 text-center">
                                            <button 
                                                type="button" 
                                                onClick={() => handleToggleStatus(item)}
                                                className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider transition-all border active:scale-95 ${item.status === 'Paid' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 border-red-200 text-red-600 hover:bg-rose-100 animate-pulse'}`}
                                            >
                                                {item.status === 'Paid' ? '已結清 🟢' : '🔴 待繳費'}
                                            </button>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button type="button" onClick={() => handleDeleteItem(item.id)} className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {currentMonthItems.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center text-slate-400 py-16 font-bold border-2 border-dashed rounded-xl bg-slate-50/50">
                                            📬 本月無日常營運開支紀錄。點擊右上方「一鍵套用」可快速從上月複製！
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>

        </div>
    );
}
