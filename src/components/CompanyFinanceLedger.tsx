// src/components/CompanyFinanceLedger.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    DollarSign, CalendarDays, Plus, CheckCircle2, AlertTriangle, 
    Download, Copy, Trash2, Loader2, ShieldAlert, Building2, 
    TrendingUp, ArrowUpRight, ArrowDownRight, FileSpreadsheet, RefreshCw,
    ArrowDownToLine, ArrowUpFromLine, CreditCard, Banknote, Landmark, Edit
} from 'lucide-react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';

// 預設日常收支科目
const DEFAULT_LEDGER_CATEGORIES = [
    { name: '公司租金', defaultFlow: 'OUT', defaultAmount: '' },
    { name: '水電網絡', defaultFlow: 'OUT', defaultAmount: '' },
    { name: '員工薪資/佣金', defaultFlow: 'OUT', defaultAmount: '' },
    { name: '交際應酬/茶水', defaultFlow: 'OUT', defaultAmount: '' },
    { name: '市場廣告/行銷', defaultFlow: 'OUT', defaultAmount: '' },
    { name: '文具雜項/軟體訂閱', defaultFlow: 'OUT', defaultAmount: '' },
    { name: '政府資助/補貼', defaultFlow: 'IN', defaultAmount: '' },
    { name: '其他收入', defaultFlow: 'IN', defaultAmount: '' },
    { name: '其他雜支', defaultFlow: 'OUT', defaultAmount: '' }
];

const getFirstDay = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};
const getLastDay = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
};

// ★ 輔助函數：格式化金額（支援千分位與最多2位小數）
const formatInputAmount = (val: string) => {
    let cleanVal = val.replace(/[^0-9.]/g, ''); // 只允許數字與小數點
    const parts = cleanVal.split('.');
    if (parts.length > 2) cleanVal = parts[0] + '.' + parts.slice(1).join(''); // 防呆：防止多個小數點
    if (parts.length > 1 && parts[1].length > 2) cleanVal = parts[0] + '.' + parts[1].substring(0, 2); // 限制兩位小數
    
    const p = cleanVal.split('.');
    const integerPart = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return p.length > 1 ? `${integerPart}.${p[1]}` : integerPart;
};

// ★ 輔助函數：顯示為帶2位小數的貨幣格式
const formatDisplayAmount = (num: number) => {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function CompanyFinanceLedger({ db, appId, staffId, currentUser, settings }: any) {
    // 🔒 核心權限防護鎖
    const isManager = staffId === 'BOSS' || currentUser?.modules?.includes('all') || currentUser?.role === 'admin';

    const [ledgerItems, setLedgerItems] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]); 
    const [loading, setLoading] = useState(true);
    
    // 日期區間鎖定狀態
    const [startDate, setStartDate] = useState(getFirstDay());
    const [endDate, setEndDate] = useState(getLastDay());
    
    const ledgerCategories = settings?.ledgerCategories || DEFAULT_LEDGER_CATEGORIES;

    // ★ 升級：編輯模式狀態
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const initialFormState = {
        category: ledgerCategories[0]?.name || '公司租金',
        flow: ledgerCategories[0]?.defaultFlow || 'OUT', 
        type: 'Fixed', 
        title: '',
        amount: ledgerCategories[0]?.defaultAmount ? formatInputAmount(String(ledgerCategories[0].defaultAmount)) : '',
        dueDate: new Date().toISOString().split('T')[0],
        status: 'Unpaid', 
        paymentDate: '',
        paymentMethod: 'Transfer', 
        chequeNo: '' 
    };
    const [newExpense, setNewExpense] = useState(initialFormState);

    // ★ 升級：萃取歷史項目名稱，提供自動建議填充 (Autocomplete)
    const uniqueTitles = useMemo(() => {
        const titles = ledgerItems.map(item => item.title).filter(Boolean);
        return Array.from(new Set(titles));
    }, [ledgerItems]);

    useEffect(() => {
        if (!editingExpenseId && ledgerCategories && ledgerCategories.length > 0) {
            const currentCatExists = ledgerCategories.some((c: any) => c.name === newExpense.category);
            if (!currentCatExists) {
                setNewExpense(prev => ({
                    ...prev,
                    category: ledgerCategories[0].name,
                    flow: ledgerCategories[0].defaultFlow || 'OUT',
                    amount: ledgerCategories[0].defaultAmount ? formatInputAmount(String(ledgerCategories[0].defaultAmount)) : '',
                    chequeNo: ''
                }));
            }
        }
    }, [settings?.ledgerCategories, editingExpenseId]);

    // 1. 實時監聽公司日常費用總帳
    useEffect(() => {
        if (!db || !appId || !isManager) return;
        const q = query(
            collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'company_expenses'),
            orderBy('dueDate', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
            setLedgerItems(list);
            setLoading(false);
        }, (err) => {
            console.error("監聽日常總帳失敗:", err);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db, appId, isManager]);

    // 2. 實時監聽車輛庫存
    useEffect(() => {
        if (!db || !appId || !isManager) return;
        const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(doc => list.push(doc.data()));
            setVehicles(list);
        });
        return () => unsubscribe();
    }, [db, appId, isManager]);

    const filteredItems = useMemo(() => {
        if (!startDate || !endDate) return ledgerItems;
        return ledgerItems.filter(item => {
            const date = item.dueDate || '';
            return date >= startDate && date <= endDate;
        });
    }, [ledgerItems, startDate, endDate]);

    const unpaidItems = useMemo(() => {
        return ledgerItems.filter(item => item.status === 'Unpaid' && item.flow === 'OUT').sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [ledgerItems]);

    // 財務做數摘要計算面板 (加入浮點數保護)
    const summary = useMemo(() => {
        let totalOutPaid = 0;
        let totalInPaid = 0;
        let totalUnpaidOut = 0;

        filteredItems.forEach(item => {
            const amt = Number(item.amount) || 0;
            if (item.status === 'Unpaid') {
                if (item.flow === 'OUT') totalUnpaidOut += amt;
            } else {
                if (item.flow === 'IN') totalInPaid += amt;
                else totalOutPaid += amt;
            }
        });

        let totalCarProfit = 0;
        
        vehicles.forEach(v => {
            const outDate = v.stockOutDate || '';
            if (outDate >= startDate && outDate <= endDate && v.status === 'Sold') {
                const sellPrice = Number(v.price) || 0;
                const costPrice = Number(v.costPrice) || 0;
                const addonsTotal = (v.salesAddons || []).reduce((sum: number, a: any) => sum + (a.isFree ? 0 : (a.amount || 0)), 0);
                const expensesTotal = (v.expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
                
                totalCarProfit += (sellPrice + addonsTotal) - (costPrice + expensesTotal);
            }
        });

        const netProfit = totalCarProfit + totalInPaid - totalOutPaid;

        return { totalOutPaid, totalInPaid, unpaidOut: totalUnpaidOut, carProfit: totalCarProfit, netProfit };
    }, [filteredItems, vehicles, startDate, endDate]);

    const handleCategoryChange = (catName: string) => {
        const setting = ledgerCategories.find((c: any) => c.name === catName);
        setNewExpense({
            ...newExpense,
            category: catName,
            flow: setting?.defaultFlow || 'OUT',
            amount: setting?.defaultAmount ? formatInputAmount(String(setting.defaultAmount)) : '',
            chequeNo: ''
        });
    };

    // ★ 升級：提交表單 (支援新增與編輯)
    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExpense.title || !newExpense.amount) return alert('請填寫帳目名稱與金額！');
        if (newExpense.paymentMethod === 'Cheque' && !newExpense.chequeNo.trim()) return alert('請輸入支票號碼！');
        
        setIsSubmitting(true);
        try {
            const id = editingExpenseId || Date.now().toString();
            const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'company_expenses', id);
            
            // 如果原本是未繳，修改時切換成已繳，自動押上當日日期
            const finalPaymentDate = newExpense.status === 'Paid' 
                ? (newExpense.paymentDate || new Date().toISOString().split('T')[0]) 
                : '';

            await setDoc(docRef, {
                ...newExpense,
                amount: Number(newExpense.amount.replace(/,/g, '')), // 存入純數字
                paymentDate: finalPaymentDate,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser?.email || staffId,
                ...(!editingExpenseId && { createdAt: new Date().toISOString() }) // 只有新增時才寫入 createdAt
            }, { merge: true });

            setNewExpense({ ...initialFormState, category: newExpense.category, flow: newExpense.flow });
            setEditingExpenseId(null);
            alert(`✅ 帳目已成功${editingExpenseId ? '修改' : '登錄'}！`);
        } catch (err) { alert('記帳失敗: ' + err); }
        setIsSubmitting(false);
    };

    // ★ 升級：啟動編輯模式
    const handleEditItem = (item: any) => {
        setEditingExpenseId(item.id);
        setNewExpense({
            category: item.category || '公司租金',
            flow: item.flow || 'OUT',
            type: item.type || 'Fixed',
            title: item.title || '',
            amount: formatInputAmount(String(item.amount || '')), // 轉換回帶千分位的字串
            dueDate: item.dueDate || new Date().toISOString().split('T')[0],
            status: item.status || 'Unpaid',
            paymentDate: item.paymentDate || '',
            paymentMethod: item.paymentMethod || 'Transfer',
            chequeNo: item.chequeNo || ''
        });
        // 畫面滾動到頂部表單
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleToggleStatus = async (item: any) => {
        try {
            const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'company_expenses', item.id);
            const nextStatus = item.status === 'Paid' ? 'Unpaid' : 'Paid';
            await setDoc(docRef, {
                status: nextStatus,
                paymentDate: nextStatus === 'Paid' ? new Date().toISOString().split('T')[0] : ''
            }, { merge: true });
        } catch (err) { alert('更新狀態失敗: ' + err); }
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm('確定要永久刪除此筆日常帳目紀錄嗎？')) return;
        try { await deleteDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'company_expenses', id)); } 
        catch (err) { alert('刪除失敗: ' + err); }
    };

    const handleCopyLastMonthFixed = async () => {
        if (!confirm('系統將自動搜尋「起點日期」上個月的固定項目，並複製到「起點日期」所在的月份。是否執行？')) return;
        
        setLoading(true);
        try {
            const startD = new Date(startDate);
            const currentYear = startD.getFullYear();
            const currentMonth = (startD.getMonth() + 1).toString().padStart(2, '0');

            startD.setMonth(startD.getMonth() - 1);
            const lastMonthPrefix = startD.toISOString().slice(0, 7);

            const lastMonthFixedItems = ledgerItems.filter(item => item.type === 'Fixed' && (item.dueDate || '').startsWith(lastMonthPrefix));

            if (lastMonthFixedItems.length === 0) {
                alert(`上個月 (${lastMonthPrefix}) 沒有設定任何「固定(按月)」紀錄可供複製。`);
                setLoading(false); return;
            }

            for (const item of lastMonthFixedItems) {
                const id = (Date.now() + Math.random()).toString();
                const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'company_expenses', id);
                const day = item.dueDate?.split('-')[2] || '01';
                const newDueDate = `${currentYear}-${currentMonth}-${day}`;

                await setDoc(docRef, {
                    category: item.category, type: 'Fixed', flow: item.flow || 'OUT',
                    title: `${item.title.replace(' (續期)', '')} (續期)`, amount: item.amount, dueDate: newDueDate,
                    status: 'Unpaid', paymentDate: '', paymentMethod: item.paymentMethod || 'Transfer', chequeNo: '',
                    createdAt: new Date().toISOString(), updatedBy: staffId
                });
            }
            alert(`✅ 成功複製 ${lastMonthFixedItems.length} 筆固定帳目至 ${currentYear}-${currentMonth}！`);
        } catch (err) { alert('複製失敗: ' + err); }
        setLoading(false);
    };

    const handleExportCSV = () => {
        let csvContent = "\uFEFF"; 
        csvContent += "到期日,帳目方向,費用科目,帳目屬性,項目名稱,交易金額(HKD),交易狀態,實際收款/付款日,金流方式,支票號碼,最後經手人\n";

        filteredItems.forEach(item => {
            const flowStr = item.flow === 'IN' ? '收入(IN)' : '支出(OUT)';
            const typeStr = item.type === 'Fixed' ? '固定' : '浮動';
            const statusStr = item.status === 'Paid' ? '已結清' : '🔴待處理';
            const methodMap: any = { 'Cash': '現金', 'Transfer': '轉帳', 'Cheque': '支票' };
            const methodStr = methodMap[item.paymentMethod] || item.paymentMethod;
            
            csvContent += `${item.dueDate},${flowStr},${item.category},${typeStr},"${item.title.replace(/"/g, '""')}",${item.amount},${statusStr},${item.paymentDate || '-'},${methodStr},${item.chequeNo || '-'},${item.updatedBy || '-'}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `金田汽車_營運總帳_${startDate}_至_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isManager) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-2xl border border-dashed border-red-200 p-6 shadow-sm">
                <div className="p-4 bg-red-50 text-red-600 rounded-full mb-4 shadow-sm animate-bounce"><ShieldAlert size={40} /></div>
                <h3 className="text-lg font-black text-slate-800">安全權限攔截</h3>
                <p className="text-xs text-slate-500 font-bold mt-1 max-w-sm text-center">「公司日常營運財務總帳」目前暫時僅對公司最高管理者（BOSS）或高階會計權限人員開放。</p>
            </div>
        );
    }

    if (loading) return <div className="flex flex-col items-center justify-center h-60"><Loader2 size={36} className="animate-spin text-blue-600 mb-2" /><p className="text-sm text-slate-500 font-bold">正在調閱大內總帳庫存...</p></div>;

    return (
        <div className="space-y-6 bg-slate-50 p-1 md:p-2 rounded-2xl">
            
            {/* 1. 頂部大戰情室數據庫看板 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">區間車輛售出毛利</span>
                        <span className="text-xl font-black font-mono text-emerald-600 mt-1 block">${formatDisplayAmount(summary.carProfit)}</span>
                    </div>
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={20}/></div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-red-500"></div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">區間已付支出 (OUT)</span>
                        <span className="text-xl font-black font-mono text-red-600 mt-1 block">${formatDisplayAmount(summary.totalOutPaid)}</span>
                    </div>
                    <div className="p-2.5 bg-red-50 text-red-600 rounded-lg"><ArrowUpRight size={20}/></div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">區間其他存入 (IN)</span>
                        <span className="text-xl font-black font-mono text-blue-600 mt-1 block">${formatDisplayAmount(summary.totalInPaid)}</span>
                    </div>
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><ArrowDownToLine size={20}/></div>
                </div>

                <div className={`p-4 rounded-xl border shadow-sm flex items-center justify-between relative overflow-hidden ${summary.netProfit >= 0 ? 'bg-blue-900 border-blue-950 text-white' : 'bg-rose-950 border-red-950 text-white'}`}>
                    <div>
                        <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block">區間公司真實淨利 (Net)</span>
                        <span className="text-2xl font-black font-mono mt-1 block tracking-tight">${formatDisplayAmount(summary.netProfit)}</span>
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
                        🚨 待繳費看板：有 {unpaidItems.length} 筆跨期支出尚未結清！
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
                                    <span className="font-mono font-black text-sm text-red-600">${formatDisplayAmount(Number(item.amount))}</span>
                                    <button type="button" onClick={() => handleToggleStatus(item)} className="p-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded-md transition-colors" title="標記為已結清"><CheckCircle2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. 中間主要區塊：記帳與清單 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* 左側：記帳表單 */}
                <div className={`bg-white rounded-xl border ${editingExpenseId ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'} shadow-sm p-4 space-y-4 transition-all`}>
                    <h3 className="font-black text-slate-800 text-sm border-b pb-2 flex items-center gap-2">
                        {editingExpenseId ? <><Edit size={18} className="text-amber-600"/> 編輯日常帳目</> : <><Plus size={18} className="text-blue-600"/> 日常帳目登錄</>}
                    </h3>
                    
                    {/* ★ 隱藏的 datalist，供 Autocomplete 使用 */}
                    <datalist id="expense-titles">
                        {uniqueTitles.map((t, idx) => <option key={idx} value={t} />)}
                    </datalist>

                    <form onSubmit={handleAddExpense} className="space-y-4">
                        
                        {/* 帳目方向 (IN / OUT) */}
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button type="button" onClick={() => setNewExpense({...newExpense, flow: 'OUT'})} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${newExpense.flow === 'OUT' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500'}`}><ArrowUpFromLine size={14}/> 支出 (OUT)</button>
                            <button type="button" onClick={() => setNewExpense({...newExpense, flow: 'IN'})} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${newExpense.flow === 'IN' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500'}`}><ArrowDownToLine size={14}/> 存入 (IN)</button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">科目分類</label>
                            <select 
                                value={newExpense.category} 
                                onChange={e => handleCategoryChange(e.target.value)}
                                className="w-full text-xs p-2.5 border rounded-lg bg-slate-50 font-bold text-slate-700 outline-none"
                            >
                                {ledgerCategories.map((cat:any) => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">金流方式</label>
                                <select 
                                    value={newExpense.paymentMethod} 
                                    onChange={e => setNewExpense({...newExpense, paymentMethod: e.target.value})}
                                    className="w-full text-xs p-2.5 border rounded-lg bg-slate-50 font-bold text-slate-700 outline-none"
                                >
                                    <option value="Transfer">🏦 銀行轉帳</option>
                                    <option value="Cheque">🧾 支票</option>
                                    <option value="Cash">💵 現金</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">入帳狀態</label>
                                <select 
                                    value={newExpense.status} 
                                    onChange={e => setNewExpense({...newExpense, status: e.target.value})}
                                    className={`w-full text-xs p-2.5 border rounded-lg font-bold outline-none ${newExpense.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-red-700 border-red-200'}`}
                                >
                                    <option value="Unpaid">🔴 待處理 / 未找數</option>
                                    <option value="Paid">🟢 已結清 / 已收付</option>
                                </select>
                            </div>
                        </div>

                        {/* 如果選支票，強制顯示支票號碼 */}
                        {newExpense.paymentMethod === 'Cheque' && (
                            <div className="animate-fade-in">
                                <label className="block text-xs font-bold text-purple-600 mb-1">🧾 支票號碼 (必填)</label>
                                <input type="text" placeholder="輸入支票號碼..." value={newExpense.chequeNo} onChange={e => setNewExpense({...newExpense, chequeNo: e.target.value})} className="w-full p-2.5 border border-purple-200 rounded-lg text-xs font-bold outline-none focus:border-purple-500 bg-purple-50"/>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">項目名稱/備註</label>
                            {/* ★ 升級：綁定 datalist 實現自動填充建議 */}
                            <input 
                                type="text" 
                                list="expense-titles" 
                                placeholder="例如：7月份地舖租金..." 
                                value={newExpense.title} 
                                onChange={e => setNewExpense({...newExpense, title: e.target.value})} 
                                className="w-full p-2.5 border rounded-lg text-xs font-bold outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                                autoComplete="off"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">到期日</label>
                                <input type="date" value={newExpense.dueDate} onChange={e => setNewExpense({...newExpense, dueDate: e.target.value})} className="w-full p-2.5 border rounded-lg text-xs font-mono bg-slate-50 outline-none"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">金額 (HKD)</label>
                                <input type="text" placeholder="$ 0.00" value={newExpense.amount} onChange={e => {
                                    setNewExpense({...newExpense, amount: formatInputAmount(e.target.value)});
                                }} className="w-full p-2.5 border rounded-lg text-sm font-black font-mono bg-slate-50 text-right text-blue-700 outline-none focus:border-blue-500"/>
                            </div>
                        </div>

                        {/* 固定/浮動 屬性 */}
                        <div className="flex items-center gap-3 pt-2">
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                                <input type="radio" name="expenseType" checked={newExpense.type === 'Fixed'} onChange={() => setNewExpense({...newExpense, type: 'Fixed'})} className="accent-blue-600 w-4 h-4"/> 🏢 固定(按月)
                            </label>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                                <input type="radio" name="expenseType" checked={newExpense.type === 'Variable'} onChange={() => setNewExpense({...newExpense, type: 'Variable'})} className="accent-blue-600 w-4 h-4"/> 🎈 浮動/臨時
                            </label>
                        </div>

                        <div className="flex gap-2 mt-2">
                            <button type="submit" disabled={isSubmitting} className={`flex-1 ${editingExpenseId ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'} font-bold py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-1.5 shadow-md`}>
                                {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : editingExpenseId ? <CheckCircle2 size={16}/> : <Plus size={16}/>} 
                                {editingExpenseId ? '儲存修改' : '立即登錄帳目'}
                            </button>
                            {editingExpenseId && (
                                <button type="button" onClick={() => { setEditingExpenseId(null); setNewExpense(initialFormState); }} className="px-4 py-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 font-bold text-sm transition-colors shadow-sm">
                                    取消
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* 右側：會計總帳主清單 */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:col-span-2 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 border-b pb-3 flex-none">
                        
                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                            <CalendarDays size={16} className="text-slate-400 ml-1" />
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)} 
                                className="p-1 border rounded text-xs font-mono font-bold text-slate-700 outline-none bg-white cursor-pointer"
                            />
                            <span className="text-slate-400 font-bold text-xs">至</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)} 
                                className="p-1 border rounded text-xs font-mono font-bold text-slate-700 outline-none bg-white cursor-pointer"
                            />
                        </div>
                        
                        <div className="flex gap-2">
                            <button type="button" onClick={handleCopyLastMonthFixed} className="flex-1 md:flex-none text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold px-3 py-2 md:py-1.5 rounded-lg shadow-sm flex items-center justify-center gap-1 transition-colors">
                                <Copy size={12}/> 一鍵複製前期固定帳目
                            </button>
                            <button type="button" onClick={handleExportCSV} className="flex-1 md:flex-none text-[11px] bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold px-3 py-2 md:py-1.5 rounded-lg shadow-sm flex items-center justify-center gap-1 transition-colors">
                                <FileSpreadsheet size={12}/> 匯出區間 Excel
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto min-h-[300px]">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200">
                                    <th className="p-3">應繳日</th>
                                    <th className="p-3">科目/方式</th>
                                    <th className="p-3">項目明細</th>
                                    <th className="p-3 text-right">交易金額</th>
                                    <th className="p-3 text-center">狀態</th>
                                    <th className="p-3 text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map(item => (
                                    <tr key={item.id} className={`border-b hover:bg-slate-50/80 transition-colors font-medium text-slate-700 ${editingExpenseId === item.id ? 'bg-amber-50/50 border-amber-200' : 'border-slate-100'}`}>
                                        <td className="p-3 font-mono tracking-tight">{item.dueDate}</td>
                                        <td className="p-3">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600">{item.category}</span>
                                                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                                                    {item.paymentMethod === 'Cheque' ? <Banknote size={10}/> : item.paymentMethod === 'Cash' ? <Banknote size={10}/> : <Landmark size={10}/>}
                                                    {item.paymentMethod === 'Cheque' ? `支票: ${item.chequeNo}` : item.paymentMethod === 'Cash' ? '現金' : '轉帳'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                                {item.flow === 'IN' ? <ArrowDownToLine size={12} className="text-emerald-500"/> : <ArrowUpFromLine size={12} className="text-red-500"/>}
                                                {item.title}
                                            </div>
                                            {item.status === 'Paid' && <div className="text-[9px] text-emerald-500 font-mono mt-0.5">結清日: {item.paymentDate}</div>}
                                        </td>
                                        <td className={`p-3 text-right font-mono font-black text-base md:text-sm ${item.flow === 'IN' ? 'text-emerald-600' : 'text-slate-800'}`}>
                                            {item.flow === 'IN' ? '+' : '-'}${formatDisplayAmount(Number(item.amount))}
                                        </td>
                                        <td className="p-3 text-center">
                                            <button 
                                                type="button" 
                                                onClick={() => handleToggleStatus(item)}
                                                className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider transition-all border active:scale-95 ${item.status === 'Paid' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 border-red-200 text-red-600 hover:bg-rose-100 animate-pulse'}`}
                                            >
                                                {item.status === 'Paid' ? '已結清 🟢' : '🔴 待處理'}
                                            </button>
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {/* ★ 升級：編輯按鈕 */}
                                                <button type="button" onClick={() => handleEditItem(item)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"><Edit size={14}/></button>
                                                <button type="button" onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredItems.length === 0 && (
                                    <tr><td colSpan={6} className="text-center text-slate-400 py-16 font-bold border-2 border-dashed rounded-xl bg-slate-50/50">📬 該日期區間無帳目紀錄。</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
