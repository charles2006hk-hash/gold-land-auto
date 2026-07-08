// src/components/CompanyFinanceLedger.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    DollarSign, CalendarDays, Plus, CheckCircle2, AlertTriangle, 
    Download, Copy, Trash2, Loader2, ShieldAlert, Building2, 
    TrendingUp, ArrowUpRight, ArrowDownRight, FileSpreadsheet, RefreshCw,
    ArrowDownToLine, ArrowUpFromLine, CreditCard, Banknote, Landmark, Edit, Lock
} from 'lucide-react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';

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

const formatInputAmount = (val: string) => {
    let cleanVal = val.replace(/[^0-9.]/g, ''); 
    const parts = cleanVal.split('.');
    if (parts.length > 2) cleanVal = parts[0] + '.' + parts.slice(1).join(''); 
    if (parts.length > 1 && parts[1].length > 2) cleanVal = parts[0] + '.' + parts[1].substring(0, 2); 
    
    const p = cleanVal.split('.');
    const integerPart = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return p.length > 1 ? `${integerPart}.${p[1]}` : integerPart;
};

const formatDisplayAmount = (num: number) => {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function CompanyFinanceLedger({ db, appId, staffId, currentUser, settings }: any) {
    const isManager = staffId === 'BOSS' || currentUser?.modules?.includes('all') || currentUser?.role === 'admin';

    const [ledgerItems, setLedgerItems] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]); 
    const [loading, setLoading] = useState(true);
    
    // ★ 升級 1：讀取與寫入 Local Storage，實現日期區間「鎖定」
    const [startDate, setStartDate] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('gla_finance_start') || getFirstDay();
        return getFirstDay();
    });
    const [endDate, setEndDate] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('gla_finance_end') || getLastDay();
        return getLastDay();
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('gla_finance_start', startDate);
            localStorage.setItem('gla_finance_end', endDate);
        }
    }, [startDate, endDate]);
    
    const ledgerCategories = settings?.ledgerCategories || DEFAULT_LEDGER_CATEGORIES;

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
        chequeNo: '',
        recurring: 'none' // ★ 升級 2：週期設定 (none, monthly, quarterly, yearly)
    };
    const [newExpense, setNewExpense] = useState(initialFormState);

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

    useEffect(() => {
        if (!db || !appId || !isManager) return;
        const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'company_expenses'), orderBy('dueDate', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
            setLedgerItems(list);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db, appId, isManager]);

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
        return ledgerItems.filter(item => item.dueDate >= startDate && item.dueDate <= endDate);
    }, [ledgerItems, startDate, endDate]);

    const unpaidItems = useMemo(() => {
        return ledgerItems.filter(item => item.status === 'Unpaid' && item.flow === 'OUT').sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [ledgerItems]);

    const summary = useMemo(() => {
        let totalOutPaid = 0, totalInPaid = 0, totalUnpaidOut = 0;
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
        return { totalOutPaid, totalInPaid, unpaidOut: totalUnpaidOut, carProfit: totalCarProfit, netProfit: totalCarProfit + totalInPaid - totalOutPaid };
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

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExpense.title || !newExpense.amount) return alert('請填寫帳目名稱與金額！');
        if (newExpense.paymentMethod === 'Cheque' && !newExpense.chequeNo.trim()) return alert('請輸入支票號碼！');
        
        setIsSubmitting(true);
        try {
            const id = editingExpenseId || Date.now().toString();
            const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'company_expenses', id);
            
            const finalPaymentDate = newExpense.status === 'Paid' 
                ? (newExpense.paymentDate || new Date().toISOString().split('T')[0]) 
                : '';

            await setDoc(docRef, {
                ...newExpense,
                amount: Number(newExpense.amount.replace(/,/g, '')),
                paymentDate: finalPaymentDate,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser?.email || staffId,
                ...(!editingExpenseId && { createdAt: new Date().toISOString() })
            }, { merge: true });

            // ★ 升級 2：如果在新增時直接標記為 Paid 且設定了週期，自動產生下一期
            if (!editingExpenseId && newExpense.status === 'Paid' && newExpense.recurring && newExpense.recurring !== 'none') {
                await generateNextRecurringItem(newExpense);
            }

            setNewExpense({ ...initialFormState, category: newExpense.category, flow: newExpense.flow });
            setEditingExpenseId(null);
            alert(`✅ 帳目已成功${editingExpenseId ? '修改' : '登錄'}！`);
        } catch (err) { alert('記帳失敗: ' + err); }
        setIsSubmitting(false);
    };

    // ★ 自動生成下一期循環帳目的核心函數
    const generateNextRecurringItem = async (itemData: any) => {
        const oldDate = new Date(itemData.dueDate);
        if (itemData.recurring === 'monthly') oldDate.setMonth(oldDate.getMonth() + 1);
        if (itemData.recurring === 'quarterly') oldDate.setMonth(oldDate.getMonth() + 3);
        if (itemData.recurring === 'yearly') oldDate.setFullYear(oldDate.getFullYear() + 1);
        
        const nextDueDate = oldDate.toISOString().split('T')[0];
        const newId = Date.now().toString() + Math.random().toString().slice(2, 6);
        const newDocRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'company_expenses', newId);
        
        await setDoc(newDocRef, {
            ...itemData,
            amount: Number(itemData.amount.toString().replace(/,/g, '')),
            dueDate: nextDueDate,
            status: 'Unpaid',
            paymentDate: '',
            chequeNo: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        showGlobalToast(`系統已為您自動產生下一期帳單：${nextDueDate}`, 'success');
    };
    
    // 全域 Toast 支援
    const showGlobalToast = (text: string, type: 'success' | 'error' = 'success') => {
        if (typeof window !== 'undefined' && (window as any).alert) {
            (window as any).alert(text);
        }
    };

    const handleToggleStatus = async (item: any) => {
        try {
            const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'company_expenses', item.id);
            const nextStatus = item.status === 'Paid' ? 'Unpaid' : 'Paid';
            await setDoc(docRef, {
                status: nextStatus,
                paymentDate: nextStatus === 'Paid' ? new Date().toISOString().split('T')[0] : ''
            }, { merge: true });

            // ★ 升級 2：如果標記為結清，且設定了週期，自動產生下一期
            if (nextStatus === 'Paid' && item.recurring && item.recurring !== 'none') {
                await generateNextRecurringItem(item);
            }
        } catch (err) { alert('更新狀態失敗: ' + err); }
    };

    const handleEditItem = (item: any) => {
        setEditingExpenseId(item.id);
        setNewExpense({
            category: item.category || '公司租金',
            flow: item.flow || 'OUT',
            type: item.type || 'Fixed',
            title: item.title || '',
            amount: formatInputAmount(String(item.amount || '')),
            dueDate: item.dueDate || new Date().toISOString().split('T')[0],
            status: item.status || 'Unpaid',
            paymentDate: item.paymentDate || '',
            paymentMethod: item.paymentMethod || 'Transfer',
            chequeNo: item.chequeNo || '',
            recurring: item.recurring || 'none'
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm('確定要永久刪除此筆日常帳目紀錄嗎？')) return;
        try { await deleteDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'company_expenses', id)); } 
        catch (err) { alert('刪除失敗: ' + err); }
    };

    const handleExportCSV = () => {
        let csvContent = "\uFEFF"; 
        csvContent += "到期日,週期,帳目方向,費用科目,項目名稱,交易金額(HKD),交易狀態,實際收款/付款日,金流方式,支票號碼,最後經手人\n";

        filteredItems.forEach(item => {
            const flowStr = item.flow === 'IN' ? '收入(IN)' : '支出(OUT)';
            const recurringMap: any = { 'none': '單次', 'monthly': '每月', 'quarterly': '每季', 'yearly': '每年' };
            const recurringStr = recurringMap[item.recurring] || '單次';
            const statusStr = item.status === 'Paid' ? '已結清' : '🔴待處理';
            const methodMap: any = { 'Cash': '現金', 'Transfer': '轉帳', 'Cheque': '支票' };
            const methodStr = methodMap[item.paymentMethod] || item.paymentMethod;
            
            csvContent += `${item.dueDate},${recurringStr},${flowStr},${item.category},"${item.title.replace(/"/g, '""')}",${item.amount},${statusStr},${item.paymentDate || '-'},${methodStr},${item.chequeNo || '-'},${item.updatedBy || '-'}\n`;
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

    // ★ 升級 1：快捷日期區間設定
    const setQuickDate = (type: string) => {
        const d = new Date();
        if (type === 'thisMonth') {
            setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
            setEndDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]);
        } else if (type === 'lastMonth') {
            setStartDate(new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0]);
            setEndDate(new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0]);
        } else if (type === 'thisYear') {
            setStartDate(new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0]);
            setEndDate(new Date(d.getFullYear(), 11, 31).toISOString().split('T')[0]);
        }
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

            {/* 2. 中間主要區塊：記帳與清單 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* 左側：記帳表單 */}
                <div className={`bg-white rounded-xl border ${editingExpenseId ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'} shadow-sm p-4 space-y-4 transition-all`}>
                    <h3 className="font-black text-slate-800 text-sm border-b pb-2 flex items-center gap-2">
                        {editingExpenseId ? <><Edit size={18} className="text-amber-600"/> 編輯日常帳目</> : <><Plus size={18} className="text-blue-600"/> 日常帳目登錄</>}
                    </h3>
                    
                    <datalist id="expense-titles">
                        {uniqueTitles.map((t, idx) => <option key={idx} value={t} />)}
                    </datalist>

                    <form onSubmit={handleAddExpense} className="space-y-4">
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button type="button" onClick={() => setNewExpense({...newExpense, flow: 'OUT'})} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${newExpense.flow === 'OUT' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500'}`}><ArrowUpFromLine size={14}/> 支出 (OUT)</button>
                            <button type="button" onClick={() => setNewExpense({...newExpense, flow: 'IN'})} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${newExpense.flow === 'IN' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500'}`}><ArrowDownToLine size={14}/> 存入 (IN)</button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">科目分類</label>
                                <select value={newExpense.category} onChange={e => handleCategoryChange(e.target.value)} className="w-full text-xs p-2.5 border rounded-lg bg-slate-50 font-bold text-slate-700 outline-none">
                                    {ledgerCategories.map((cat:any) => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                                </select>
                            </div>
                            <div>
                                {/* ★ 升級 2：週期提醒設定 */}
                                <label className="block text-xs font-bold text-slate-500 mb-1">週期設定 (自動下一期)</label>
                                <select value={newExpense.recurring} onChange={e => setNewExpense({...newExpense, recurring: e.target.value})} className="w-full text-xs p-2.5 border rounded-lg bg-slate-50 font-bold text-blue-700 outline-none">
                                    <option value="none">單次 (不重複)</option>
                                    <option value="monthly">每月重複</option>
                                    <option value="quarterly">每季重複</option>
                                    <option value="yearly">每年重複</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">金流方式</label>
                                <select value={newExpense.paymentMethod} onChange={e => setNewExpense({...newExpense, paymentMethod: e.target.value})} className="w-full text-xs p-2.5 border rounded-lg bg-slate-50 font-bold text-slate-700 outline-none">
                                    <option value="Transfer">🏦 銀行轉帳</option>
                                    <option value="Cheque">🧾 支票</option>
                                    <option value="Cash">💵 現金</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">入帳狀態</label>
                                <select value={newExpense.status} onChange={e => setNewExpense({...newExpense, status: e.target.value})} className={`w-full text-xs p-2.5 border rounded-lg font-bold outline-none ${newExpense.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-red-700 border-red-200'}`}>
                                    <option value="Unpaid">🔴 待處理 / 未找數</option>
                                    <option value="Paid">🟢 已結清 / 已收付</option>
                                </select>
                            </div>
                        </div>

                        {newExpense.paymentMethod === 'Cheque' && (
                            <div className="animate-fade-in">
                                <label className="block text-xs font-bold text-purple-600 mb-1">🧾 支票號碼 (必填)</label>
                                <input type="text" placeholder="輸入支票號碼..." value={newExpense.chequeNo} onChange={e => setNewExpense({...newExpense, chequeNo: e.target.value})} className="w-full p-2.5 border border-purple-200 rounded-lg text-xs font-bold outline-none focus:border-purple-500 bg-purple-50"/>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">項目名稱/備註</label>
                            <input type="text" list="expense-titles" placeholder="例如：7月份地舖租金..." value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} className="w-full p-2.5 border rounded-lg text-xs font-bold outline-none focus:border-blue-500 bg-slate-50 focus:bg-white" autoComplete="off"/>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">到期日</label>
                                <input type="date" value={newExpense.dueDate} onChange={e => setNewExpense({...newExpense, dueDate: e.target.value})} className="w-full p-2.5 border rounded-lg text-xs font-mono bg-slate-50 outline-none"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">金額 (HKD)</label>
                                <input type="text" placeholder="$ 0.00" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: formatInputAmount(e.target.value)})} className="w-full p-2.5 border rounded-lg text-sm font-black font-mono bg-slate-50 text-right text-blue-700 outline-none focus:border-blue-500"/>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-2">
                            <button type="submit" disabled={isSubmitting} className={`flex-1 ${editingExpenseId ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'} font-bold py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-1.5 shadow-md`}>
                                {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : editingExpenseId ? <CheckCircle2 size={16}/> : <Plus size={16}/>} 
                                {editingExpenseId ? '儲存修改' : '立即登錄帳目'}
                            </button>
                            {editingExpenseId && (
                                <button type="button" onClick={() => { setEditingExpenseId(null); setNewExpense(initialFormState); }} className="px-4 py-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 font-bold text-sm transition-colors shadow-sm">取消</button>
                            )}
                        </div>
                    </form>
                </div>

                {/* 右側：會計總帳主清單 */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:col-span-2 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 border-b pb-3 flex-none">
                        
                        {/* ★ 升級 1：快捷鎖定日期區間 UI */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 relative">
                                <Lock size={14} className="absolute -top-2 -right-2 text-yellow-500 bg-white rounded-full" />
                                <CalendarDays size={16} className="text-slate-400 ml-1" />
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-1 border rounded text-xs font-mono font-bold text-slate-700 outline-none bg-white cursor-pointer"/>
                                <span className="text-slate-400 font-bold text-xs">至</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-1 border rounded text-xs font-mono font-bold text-slate-700 outline-none bg-white cursor-pointer"/>
                            </div>
                            <div className="hidden lg:flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                                <button onClick={() => setQuickDate('thisMonth')} className="text-[10px] px-2 py-1 rounded bg-white shadow-sm font-bold text-slate-700">本月</button>
                                <button onClick={() => setQuickDate('lastMonth')} className="text-[10px] px-2 py-1 rounded hover:bg-white hover:shadow-sm font-bold text-slate-500 transition-all">上月</button>
                                <button onClick={() => setQuickDate('thisYear')} className="text-[10px] px-2 py-1 rounded hover:bg-white hover:shadow-sm font-bold text-slate-500 transition-all">本年</button>
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            <button type="button" onClick={handleExportCSV} className="flex-1 md:flex-none text-[11px] bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold px-4 py-2 md:py-1.5 rounded-lg shadow-sm flex items-center justify-center gap-1 transition-colors">
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
                                        <td className="p-3 font-mono tracking-tight">
                                            {item.dueDate}
                                            {item.recurring !== 'none' && <div className="text-[8px] bg-blue-100 text-blue-700 mt-1 rounded text-center font-bold px-1 py-0.5">🔄 週期提醒</div>}
                                        </td>
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
