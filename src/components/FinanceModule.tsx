// src/components/FinanceModule.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
    LayoutDashboard, FileBarChart, Users, Receipt, BarChart3, 
    CalendarDays, DollarSign, Search, CheckSquare, Briefcase, 
    DownloadCloud, Trash2, X, Check
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

// --- 輔助工具函數 ---
const formatCurrency = (amount: number) => new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', maximumFractionDigits: 0 }).format(amount || 0);

const formatNumberInput = (value: string) => {
    let cleanVal = value.replace(/[^0-9.-]/g, '');
    const isNegative = cleanVal.startsWith('-');
    cleanVal = cleanVal.replace(/-/g, ''); 
    const parts = cleanVal.split('.');
    if (parts.length > 2) cleanVal = parts[0] + '.' + parts.slice(1).join('');
    if (!cleanVal) return isNegative ? '-' : '';
    const [integer, decimal] = cleanVal.split('.');
    const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return isNegative ? '-' + (decimal !== undefined ? formattedInteger + '.' + decimal : formattedInteger) : (decimal !== undefined ? formattedInteger + '.' + decimal : formattedInteger);
};

export default function FinanceModule({ inventory, settings, setEditingVehicle, setActiveTab, db, staffId, appId, currentUser }: any) {
    
    // --- 模塊狀態鎖定 ---
    const [financeTab, setFinanceTab] = useState<'dashboard' | 'reports' | 'partner' | 'accounting' | 'capital'>(() => (typeof window !== 'undefined' ? sessionStorage.getItem('gla_fin_tab') as any : null) || 'dashboard');
    
    // ★ 核心安全邏輯：判斷是否擁有「管理員級別」的資料視角
    const isFullAccess = staffId === 'BOSS' || 
                        currentUser?.modules?.includes('all') || 
                        currentUser?.dataAccess === 'all';

    // ★ 安全強制重導：如果普通員工誤入了管理員專屬 Tab，自動彈回首頁
    useEffect(() => {
        if (!isFullAccess && (financeTab === 'partner' || financeTab === 'accounting' || financeTab === 'capital')) {
            setFinanceTab('dashboard');
        }
    }, [financeTab, isFullAccess]);

    // --- ★★★ 資金預算沙盤狀態 (Capital Sandbox) ★★★ ---
    const [capPrincipal, setCapPrincipal] = useState<string>('10000000');
    const [capInterest, setCapInterest] = useState<number>(8);
    const [capFee, setCapFee] = useState<number>(6);
    const [capYears, setCapYears] = useState<number>(5);

    const [allocUsedCar, setAllocUsedCar] = useState<number>(60);
    const [allocLimited, setAllocLimited] = useState<number>(20);
    const [allocRental, setAllocRental] = useState<number>(20);
    
    const [yieldUsedCar, setYieldUsedCar] = useState<number>(15);
    const [yieldLimited, setYieldLimited] = useState<number>(25);
    const [yieldRental, setYieldRental] = useState<number>(10);

    // --- 統計報表狀態 ---
    const [reportType, setReportType] = useState<'receivable' | 'payable' | 'paid_expenses' | 'sales'>(() => (typeof window !== 'undefined' ? sessionStorage.getItem('gla_rep_type') as any : null) || 'receivable');
    const [reportCategory, setReportCategory] = useState<'All' | 'Vehicle' | 'Service'>(() => (typeof window !== 'undefined' ? sessionStorage.getItem('gla_rep_cat') as any : null) || 'All');
    const [reportSearchTerm, setReportSearchTerm] = useState(() => typeof window !== 'undefined' ? sessionStorage.getItem('gla_rep_search') || '' : '');
    const [reportCompany, setReportCompany] = useState(() => typeof window !== 'undefined' ? sessionStorage.getItem('gla_rep_comp') || '' : '');
    
    // --- 共用日期鎖定 ---
    const [isDateFilterEnabled, setIsDateFilterEnabled] = useState(() => typeof window !== 'undefined' ? sessionStorage.getItem('gla_rep_date_en') !== 'false' : true);
    const [reportStartDate, setReportStartDate] = useState(() => { 
        const saved = typeof window !== 'undefined' ? sessionStorage.getItem('gla_rep_start') : null; 
        if (saved) return saved; 
        const d = new Date(); 
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]; 
    });
    const [reportEndDate, setReportEndDate] = useState(() => { 
        const saved = typeof window !== 'undefined' ? sessionStorage.getItem('gla_rep_end') : null; 
        if (saved) return saved; 
        const d = new Date(); 
        return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]; 
    });

    // --- 會計帳目專屬狀態 ---
    const [accSearchTerm, setAccSearchTerm] = useState(() => typeof window !== 'undefined' ? sessionStorage.getItem('gla_acc_search') || '' : '');
    const [accFilterType, setAccFilterType] = useState<'All' | 'IN' | 'OUT'>(() => (typeof window !== 'undefined' ? sessionStorage.getItem('gla_acc_filter') as any : null) || 'All');

    // --- 行家來往狀態 ---
    const [ledgers, setLedgers] = useState<any[]>([]);
    const [selectedPartner, setSelectedPartner] = useState<string>('');
    const [partnerSearch, setPartnerSearch] = useState('');
    const [newLedger, setNewLedger] = useState({ date: new Date().toISOString().split('T')[0], type: 'receivable', amount: '', note: '' });

    // 自動儲存狀態
    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('gla_fin_tab', financeTab);
            sessionStorage.setItem('gla_rep_type', reportType);
            sessionStorage.setItem('gla_rep_cat', reportCategory);
            sessionStorage.setItem('gla_rep_search', reportSearchTerm);
            sessionStorage.setItem('gla_rep_comp', reportCompany);
            sessionStorage.setItem('gla_rep_date_en', isDateFilterEnabled.toString());
            sessionStorage.setItem('gla_rep_start', reportStartDate);
            sessionStorage.setItem('gla_rep_end', reportEndDate);
            sessionStorage.setItem('gla_acc_search', accSearchTerm);
            sessionStorage.setItem('gla_acc_filter', accFilterType);
        }
    }, [financeTab, reportType, reportCategory, reportSearchTerm, reportCompany, isDateFilterEnabled, reportStartDate, reportEndDate, accSearchTerm, accFilterType]);

    // 讀取行家來往資料庫
    useEffect(() => {
        if (!db || !appId) return;
        const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'partner_ledgers'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap: any) => { setLedgers(snap.docs.map((d:any) => ({ id: d.id, ...d.data() }))); });
        return () => unsub();
    }, [db, appId]);

    const handleReportItemClick = (vehicleId: string) => {
        const vehicle = inventory.find((v: any) => v.id === vehicleId);
        if (vehicle && setEditingVehicle) setEditingVehicle(vehicle);
    };

    const setThisMonth = () => {
        const date = new Date();
        setReportStartDate(new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]);
        setReportEndDate(new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0]);
        setIsDateFilterEnabled(true); 
    };

    const handlePrint = () => { window.print(); };

   // ============================================================================
    // ★ 核心引擎 1：統計報表生成 (Report Data)
    // ============================================================================
    const generateReportData = () => {
        let data: any[] = [];
        
        if (reportType === 'receivable') {
            const targetInventory = inventory.filter((v:any) => v.status === 'Sold' || v.status === 'Reserved');
            targetInventory.forEach((v:any) => {
                
                // ★ 修正 1：車價與附加費 (客戶應付) - 徹底排除內部 expenses
                const salesAddonsTotal = ((v as any).salesAddons || []).reduce((sum: number, a: any) => sum + (a.isFree ? 0 : (a.amount || 0)), 0);
                const totalCarReceivable = (v.price || 0) + salesAddonsTotal;
                
                // ★ 修正 2：一般車價收款 (排除中港代辦的獨立收款)
                const generalPayments = (v.payments || []).filter((p:any) => !p.relatedTaskId).reduce((s:any, p:any) => s + (p.amount || 0), 0);
                
                // ★ 修正 3：車價尾數 (純客戶應付 - 已付)
                const carBalance = totalCarReceivable - generalPayments;
                if (totalCarReceivable > 0 && carBalance > 0) {
                    const date = v.stockOutDate || (v as any).reservedDate || v.stockInDate || new Date().toISOString().split('T')[0];
                    data.push({ vehicleId: v.id, date: date, title: `${v.year} ${v.make} ${v.model}`, regMark: v.regMark, amount: carBalance, type: 'Vehicle', status: v.status, rawTitle: `${v.year} ${v.make} ${v.model} ${v.regMark} 車價` });
                }
                
                // 4. 售後維修收費 (對客收 charge)
                (v.maintenanceRecords || []).forEach((m: any) => {
                    if (m.charge > 0 && m.chargeStatus !== 'Paid') data.push({ vehicleId: v.id, date: m.date, title: `[售後收費] ${m.item}`, regMark: v.regMark, amount: m.charge, type: 'Service', status: 'Pending', rawTitle: `${v.year} ${v.make} ${v.model} ${v.regMark} ${m.item}` });
                });

                // 5. 中港代辦費
                (v.crossBorder?.tasks || []).forEach((task:any) => {
                    const fee = Number(task.fee) || 0; if (fee <= 0) return;
                    const taskPaid = (v.payments || []).filter((p:any) => p.relatedTaskId === task.id).reduce((s:any, p:any) => s + (p.amount || 0), 0);
                    const taskBalance = fee - taskPaid;
                    if (taskBalance > 0) {
                        let safeDate = task.date || v.stockOutDate || (v as any).reservedDate || v.stockInDate || new Date().toISOString().split('T')[0];
                        data.push({ vehicleId: v.id, date: safeDate, title: `[中港] ${task.item}`, regMark: v.regMark, amount: taskBalance, type: 'Service', status: 'Pending', rawTitle: `${v.year} ${v.make} ${v.model} ${v.regMark} ${task.item}` });
                    }
                });
            });
        } else if (reportType === 'payable' || reportType === 'paid_expenses') {
            const isTargetPaid = reportType === 'paid_expenses';
            const targetStatus = isTargetPaid ? 'Paid' : 'Unpaid';
            inventory.forEach((v:any) => {
                (v.expenses || []).forEach((exp:any) => {
                    if (exp.status === targetStatus) data.push({ vehicleId: v.id, id: exp.id, date: exp.date, title: `[維修/雜費] ${exp.type}`, company: exp.company, invoiceNo: exp.invoiceNo, amount: exp.amount, status: targetStatus, regMark: v.regMark, rawTitle: `${v.regMark} ${exp.type} ${exp.company} ${exp.invoiceNo}` });
                });
                (v.maintenanceRecords || []).forEach((m: any) => {
                    if (m.cost > 0 && m.costStatus === targetStatus) data.push({ vehicleId: v.id, id: m.id, date: m.date, title: `[售後成本] ${m.item}`, company: m.vendor || '未指定車房', invoiceNo: '-', amount: m.cost, status: targetStatus, regMark: v.regMark, rawTitle: `${v.regMark} ${m.item} ${m.vendor}` });
                });
                if (isTargetPaid) {
                    (v.acquisition?.payments || []).forEach((p: any) => {
                        const vendorName = v.acquisition?.vendor || '未填寫供應商';
                        data.push({ vehicleId: v.id, id: p.id, date: p.date, title: `[進貨付款] ${v.make} ${v.model}`, company: vendorName, invoiceNo: p.method, amount: p.amount, status: 'Paid', regMark: v.regMark, rawTitle: `${v.regMark} 進貨付款 ${vendorName} ${p.method}` });
                    });
                } else {
                    const acqPaid = (v.acquisition?.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
                    const acqOffset = Number(v.acquisition?.offsetAmount || 0);
                    const acqBalance = (v.costPrice || 0) - acqPaid - acqOffset;
                    if (acqBalance > 0) {
                        const vendorName = v.acquisition?.vendor || '未填寫供應商';
                        const acqTypeLabel = v.acquisition?.type === 'Import' ? '國外訂車' : '本地收車';
                        data.push({ vehicleId: v.id, id: `acq-${v.id}`, date: v.stockInDate || new Date().toISOString().split('T')[0], title: `[車輛進貨] ${v.make} ${v.model}`, company: vendorName, invoiceNo: acqTypeLabel, amount: acqBalance, status: 'Unpaid', regMark: v.regMark, rawTitle: `${v.regMark} 進貨尾數 ${vendorName} ${acqTypeLabel}` });
                    }
                }
            });
        } else if (reportType === 'sales') {
            data = inventory.filter((v:any) => v.status === 'Sold').map((v:any) => {
                const totalCost = (v.costPrice || 0) + (v.expenses || []).reduce((sum:number, e:any) => sum + (e.amount || 0), 0);
                const cbFees = (v.crossBorder?.tasks || []).reduce((sum:number, t:any) => sum + (t.fee || 0), 0);
                const totalRevenue = (v.price || 0) + cbFees;
                let safeSaleDate = v.stockOutDate || (v.updatedAt?.seconds ? new Date(v.updatedAt.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                return { vehicleId: v.id, date: safeSaleDate, title: `${v.year} ${v.make} ${v.model}`, regMark: v.regMark, amount: totalRevenue, cost: totalCost, profit: totalRevenue - totalCost, rawTitle: `${v.year} ${v.make} ${v.model} ${v.regMark}` };
            });
        }

        if (isDateFilterEnabled) {
            if (reportStartDate) data = data.filter(d => d.date >= reportStartDate);
            if (reportEndDate) data = data.filter(d => d.date <= reportEndDate);
        }
        
        if (reportSearchTerm) data = data.filter(d => (d.rawTitle || '').toLowerCase().includes(reportSearchTerm.toLowerCase()));
        if (reportType === 'receivable' && reportCategory !== 'All') data = data.filter(d => d.type === reportCategory);
        if ((reportType === 'payable' || reportType === 'paid_expenses') && reportCompany) data = data.filter(d => d.company === reportCompany);

        return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const reportData = generateReportData();
    const totalReportAmount = reportData.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalReportProfit = reportType === 'sales' ? reportData.reduce((sum, item) => sum + (item.profit || 0), 0) : 0;
  
    // ============================================================================
    // ★ 核心引擎 2：會計流水帳生成 (Unified Cash Ledger)
    // ============================================================================
    const generateLedger = () => {
        const ledger: any[] = [];
        
        inventory.forEach((v: any) => {
            (v.payments || []).forEach((p: any) => ledger.push({ id: `pay_${p.id}`, date: p.date, type: 'IN', amount: Number(p.amount), category: '營業收入 (Sales)', desc: `[收款] ${p.type} - ${p.method}`, ref: v.regMark || '未出牌', rawDate: new Date(p.date).getTime() }));
            (v.acquisition?.payments || []).forEach((p: any) => ledger.push({ id: `acq_${p.id}`, date: p.date, type: 'OUT', amount: Number(p.amount), category: '進貨成本 (COGS)', desc: `[進貨付款] ${p.method}`, ref: v.regMark || '未出牌', rawDate: new Date(p.date).getTime() }));
            (v.expenses || []).filter((e:any) => e.status === 'Paid').forEach((e: any) => ledger.push({ id: `exp_${e.id}`, date: e.date, type: 'OUT', amount: Number(e.amount), category: '營運開支 (Expenses)', desc: `[雜費支出] ${e.type} - ${e.company}`, ref: v.regMark || '未出牌', rawDate: new Date(e.date).getTime() }));
            (v.maintenanceRecords || []).filter((m:any) => m.chargeStatus === 'Paid' && m.charge > 0).forEach((m: any) => ledger.push({ id: `maint_in_${m.id}`, date: m.date, type: 'IN', amount: Number(m.charge), category: '售後服務 (Service)', desc: `[維修收費] ${m.item}`, ref: v.regMark || '未出牌', rawDate: new Date(m.date).getTime() }));
            (v.maintenanceRecords || []).filter((m:any) => m.costStatus === 'Paid' && m.cost > 0).forEach((m: any) => ledger.push({ id: `maint_out_${m.id}`, date: m.date, type: 'OUT', amount: Number(m.cost), category: '營運開支 (Expenses)', desc: `[維修成本] ${m.item} - ${m.vendor}`, ref: v.regMark || '未出牌', rawDate: new Date(m.date).getTime() }));
        });

        ledgers.forEach((l: any) => {
            const isCashIn = l.type === 'receivable' ? (l.note.includes('收') || l.note.includes('還')) : (l.note.includes('借入') || l.note.includes('收'));
            ledger.push({ id: `ptn_${l.id}`, date: l.date, type: isCashIn ? 'IN' : 'OUT', amount: Number(l.amount), category: '往來帳 (Partner Ledger)', desc: `[行家] ${l.note}`, ref: l.partner, rawDate: new Date(l.date).getTime() });
        });

        return ledger.sort((a, b) => b.rawDate - a.rawDate);
    };

    const rawLedger = generateLedger();

    // ============================================================================
    // ★ 核心引擎 3：財務 Dashboard 數據計算
    // ============================================================================
    const calculateDashboardStats = () => {
        const now = new Date();
        const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        
        // 1. 本月現金流
        const thisMonthLedger = rawLedger.filter(l => l.date.startsWith(currentMonthPrefix));
        const monthIn = thisMonthLedger.filter(l => l.type === 'IN').reduce((sum, l) => sum + l.amount, 0);
        const monthOut = thisMonthLedger.filter(l => l.type === 'OUT').reduce((sum, l) => sum + l.amount, 0);
        const monthNet = monthIn - monthOut;

        // 2. 總應收 (AR) 與總應付 (AP)
        let totalAR = 0;
        let totalAP = 0;
        
        inventory.forEach((v: any) => {
            if (v.status === 'Sold' || v.status === 'Reserved') {
                const received = (v.payments || []).reduce((acc:number, p:any) => acc + (Number(p.amount) || 0), 0);
                const cbFees = (v.crossBorder?.tasks || []).reduce((sum:number, t:any) => sum + (Number(t.fee) || 0), 0);
                const salesAddonsTotal = ((v as any).salesAddons || []).reduce((sum: number, addon: any) => sum + (Number(addon.amount) || 0), 0);
                const balance = ((v.price || 0) + cbFees + salesAddonsTotal) - received;
                if (balance > 0) totalAR += balance;
            }
            (v.expenses || []).forEach((e:any) => { if (e.status === 'Unpaid') totalAP += Number(e.amount); });
            (v.maintenanceRecords || []).forEach((m:any) => { if (m.costStatus === 'Unpaid' && m.cost > 0) totalAP += Number(m.cost); });
            
            const acqPaid = (v.acquisition?.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
            const acqOffset = Number(v.acquisition?.offsetAmount || 0);
            const acqBalance = (v.costPrice || 0) - acqPaid - acqOffset;
            if (acqBalance > 0) totalAP += acqBalance;
        });

        // 加上行家戶口結餘
        const partnerBalances: Record<string, number> = {};
        ledgers.forEach(l => {
            if (!partnerBalances[l.partner]) partnerBalances[l.partner] = 0;
            partnerBalances[l.partner] += (l.type === 'receivable' ? Number(l.amount) : -Number(l.amount));
        });
        Object.values(partnerBalances).forEach(bal => {
            if (bal > 0) totalAR += bal;
            else if (bal < 0) totalAP += Math.abs(bal);
        });

        // 3. 庫存總值
        const stockValue = inventory.filter((v: any) => v.status === 'In Stock').reduce((sum: number, v: any) => sum + (v.price || 0), 0);

        return { monthIn, monthOut, monthNet, totalAR, totalAP, stockValue };
    };

    const dashStats = calculateDashboardStats();

    // ============================================================================
    // ★ 輔助函數：行家來往 & 會計帳目
    // ============================================================================
    
    // 行家來往資料處理
    const allPartners = Array.from(new Set([...(settings.expenseCompanies || []), ...ledgers.map(l => l.partner)])).filter(Boolean).sort();
    const filteredPartners = allPartners.filter(p => p.toLowerCase().includes(partnerSearch.toLowerCase()));
    const partnerHistory = ledgers.filter(l => l.partner === selectedPartner).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const partnerBalance = partnerHistory.reduce((sum, l) => sum + (l.type === 'receivable' ? Number(l.amount) : -Number(l.amount)), 0);

    const handleAddLedgerRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = Number(newLedger.amount);
        if (!amt || !selectedPartner || !db) return;
        try {
            await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'partner_ledgers'), { partner: selectedPartner, date: newLedger.date, type: newLedger.type, amount: amt, note: newLedger.note || (newLedger.type === 'receivable' ? '借出/應收' : '收到還款/墊支'), createdAt: serverTimestamp(), createdBy: staffId });
            setNewLedger({ ...newLedger, amount: '', note: '' });
            alert('✅ 紀錄已成功加入！');
        } catch (err) { alert('❌ 加入失敗'); }
    };

    const handleDeleteLedgerRecord = async (id: string) => {
        if (!db || !confirm("確定刪除此筆對帳紀錄？")) return;
        await deleteDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'partner_ledgers', id));
    };

    const handleSettleBalance = () => {
        if (partnerBalance === 0) return;
        setNewLedger({ date: new Date().toISOString().split('T')[0], type: partnerBalance > 0 ? 'payable' : 'receivable', amount: Math.abs(partnerBalance).toString(), note: '結清帳目對數 (Settlement)' });
    };

    // 會計帳目過濾與匯出
    const filteredAccLedger = rawLedger.filter(l => {
        if (isDateFilterEnabled) {
            if (reportStartDate && l.date < reportStartDate) return false;
            if (reportEndDate && l.date > reportEndDate) return false;
        }
        if (accFilterType !== 'All' && l.type !== accFilterType) return false;
        if (accSearchTerm) {
            const lower = accSearchTerm.toLowerCase();
            return l.desc.toLowerCase().includes(lower) || l.ref.toLowerCase().includes(lower) || l.category.toLowerCase().includes(lower);
        }
        return true;
    });

    const filteredTotalIn = filteredAccLedger.filter(l => l.type === 'IN').reduce((sum, l) => sum + l.amount, 0);
    const filteredTotalOut = filteredAccLedger.filter(l => l.type === 'OUT').reduce((sum, l) => sum + l.amount, 0);

    const exportAccountingCSV = () => {
        if (filteredAccLedger.length === 0) { alert('沒有資料可以匯出'); return; }
        const bom = "\uFEFF";
        const headers = "日期 (Date),類別 (Category),對象/車牌 (Reference),摘要 (Description),收入 (Cash In),支出 (Cash Out)\n";
        const rows = filteredAccLedger.map(l => `${l.date},${l.category},${l.ref},"${l.desc.replace(/"/g, '""')}",${l.type === 'IN' ? l.amount : ''},${l.type === 'OUT' ? l.amount : ''}`).join("\n");
        const blob = new Blob([bom + headers + rows], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `GL_Accounting_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <div className="p-2 md:p-4 bg-slate-100/50 rounded-lg shadow-sm h-full min-h-0 overflow-hidden flex flex-col">
            
            {/* ★ 頂部 Header & 導航 ★ */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 flex-none print:hidden">
                <div>
                    <h2 className="text-xl md:text-2xl font-black flex items-center text-slate-800 tracking-tight">
                        <Briefcase className="mr-2 text-blue-600" size={24}/> 財務總覽 (Financial Hub)
                    </h2>
                </div>

                {/* 4 大分頁按鈕 */}
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-full md:w-auto overflow-x-auto scrollbar-hide">
                    <button onClick={() => setFinanceTab('dashboard')} className={`flex-1 md:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center whitespace-nowrap ${financeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutDashboard size={16} className="mr-1.5"/> 財務數據</button>
                    <button onClick={() => setFinanceTab('reports')} className={`flex-1 md:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center whitespace-nowrap ${financeTab === 'reports' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><FileBarChart size={16} className="mr-1.5"/> 統計報表</button>
                    
                    {/* ★ 只對 All Data 權限顯示以下按鈕 */}
                    {isFullAccess && (
                        <>
                            <button onClick={() => setFinanceTab('partner')} className={`flex-1 md:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center whitespace-nowrap ${financeTab === 'partner' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Users size={16} className="mr-1.5"/> 行家來往</button>
                            <button onClick={() => setFinanceTab('accounting')} className={`flex-1 md:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center whitespace-nowrap ${financeTab === 'accounting' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Receipt size={16} className="mr-1.5"/> 會計帳目</button>
                            <button onClick={() => setFinanceTab('capital')} className={`flex-1 md:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center whitespace-nowrap ${financeTab === 'capital' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><BarChart3 size={16} className="mr-1.5"/> 資金預算沙盤</button>
                        </>
                    )}
                </div>
            </div>

            {/* ========================================== */}
            {/* Tab 1: 財務數據 (Dashboard) */}
            {/* ========================================== */}
            {financeTab === 'dashboard' && (
                <div className="flex-1 overflow-y-auto animate-fade-in pb-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {/* 本月現金流卡片 */}
                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <div className="col-span-full mb-2 border-b border-slate-100 pb-2">
                                <h3 className="font-bold text-slate-700 text-lg flex items-center"><CalendarDays size={20} className="mr-2 text-blue-500"/> 本月現金流狀況 (Cash Flow - {new Date().toLocaleString('zh-HK', {month: 'long'})})</h3>
                            </div>
                            
                            <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 relative overflow-hidden group">
                                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><DollarSign size={80}/></div>
                                <p className="text-sm font-bold text-emerald-700 mb-1">本月總流入 (Cash In)</p>
                                <p className="text-3xl font-black font-mono text-emerald-600">{formatCurrency(dashStats.monthIn)}</p>
                            </div>
                            
                            <div className="bg-red-50/50 p-5 rounded-xl border border-red-100 relative overflow-hidden group">
                                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><DollarSign size={80}/></div>
                                <p className="text-sm font-bold text-red-700 mb-1">本月總流出 (Cash Out)</p>
                                <p className="text-3xl font-black font-mono text-red-600">{formatCurrency(dashStats.monthOut)}</p>
                            </div>
                            
                            <div className={`p-5 rounded-xl border relative overflow-hidden group ${dashStats.monthNet >= 0 ? 'bg-blue-50/50 border-blue-200' : 'bg-orange-50/50 border-orange-200'}`}>
                                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><BarChart3 size={80}/></div>
                                <p className={`text-sm font-bold mb-1 ${dashStats.monthNet >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>本月淨現金流 (Net Cash Flow)</p>
                                <p className={`text-3xl font-black font-mono ${dashStats.monthNet >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{dashStats.monthNet >= 0 ? '+' : ''}{formatCurrency(dashStats.monthNet)}</p>
                            </div>
                        </div>

                        {/* 應收應付總額 */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                            <h3 className="font-bold text-slate-300 text-sm mb-4 uppercase tracking-widest">總應收帳款 (Total A/R)</h3>
                            <p className="text-4xl font-black font-mono text-green-400 mb-2">{formatCurrency(dashStats.totalAR)}</p>
                            <p className="text-xs text-slate-400">包含賣車尾款、代辦費、行家借出款項</p>
                        </div>

                        <div className="bg-gradient-to-br from-slate-100 to-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                            <h3 className="font-bold text-slate-500 text-sm mb-4 uppercase tracking-widest">總應付帳款 (Total A/P)</h3>
                            <p className="text-4xl font-black font-mono text-red-500 mb-2">{formatCurrency(dashStats.totalAP)}</p>
                            <p className="text-xs text-slate-400">包含未找車房數、收車尾數、行家欠款</p>
                        </div>

                        <div className="bg-gradient-to-br from-slate-100 to-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                            <h3 className="font-bold text-slate-500 text-sm mb-4 uppercase tracking-widest">庫存總值 (Stock Value)</h3>
                            <p className="text-4xl font-black font-mono text-slate-700 mb-2">{formatCurrency(dashStats.stockValue)}</p>
                            <p className="text-xs text-slate-400">按目前在場車輛之定價計算</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================== */}
            {/* Tab 2: 統計報表 (原 Reports) */}
            {/* ========================================== */}
            {financeTab === 'reports' && (
                <div className="flex-1 flex flex-col animate-fade-in min-h-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex justify-between items-center p-4 border-b border-slate-100 flex-none print:hidden">
                        <h3 className="font-bold text-slate-700 flex items-center"><FileBarChart size={18} className="mr-2 text-indigo-500"/> 車輛微觀統計</h3>
                        <button onClick={handlePrint} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm flex items-center"><Printer size={16} className="mr-2"/> 輸出報表</button>
                    </div>

                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex-none print:hidden">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1">報表類型</label>
                                <select value={reportType} onChange={e => setReportType(e.target.value as any)} className="w-full border border-slate-200 p-2 rounded-lg text-xs font-bold text-slate-700 bg-white outline-none focus:ring-2 ring-indigo-200 cursor-pointer">
                                    <option value="receivable">應收未收 (Receivables)</option>
                                    <option value="payable">應付未付 (Payable - Unpaid)</option>
                                    <option value="paid_expenses">應付已付 (Paid Expenses)</option>
                                    <option value="sales">銷售統計 (Sales Profit)</option>
                                </select>
                            </div>

                            {reportType === 'receivable' && (
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1">業務類別</label>
                                    <select value={reportCategory} onChange={e => setReportCategory(e.target.value as any)} className="w-full border border-slate-200 p-2 rounded-lg text-xs font-bold text-slate-700 bg-white outline-none">
                                        <option value="All">全部 (All)</option>
                                        <option value="Vehicle">車輛銷售 (Sales)</option>
                                        <option value="Service">中港/代辦服務 (Services)</option>
                                    </select>
                                </div>
                            )}

                            <div className="col-span-2 md:col-span-1 relative">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1">關鍵字搜尋</label>
                                <Search size={14} className="absolute left-3 top-8 text-gray-400"/>
                                <input type="text" value={reportSearchTerm} onChange={e => setReportSearchTerm(e.target.value)} placeholder="車牌/對象..." className="w-full border border-slate-200 p-2 pl-8 rounded-lg text-xs focus:ring-2 ring-indigo-200 outline-none bg-white"/>
                            </div>

                            <div className="col-span-2 md:col-span-2 bg-white border border-slate-200 p-2 rounded-lg flex flex-col justify-center shadow-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="flex items-center text-[10px] font-bold text-gray-700 cursor-pointer">
                                        <input type="checkbox" checked={isDateFilterEnabled} onChange={(e) => setIsDateFilterEnabled(e.target.checked)} className="mr-1.5 accent-indigo-600"/>
                                        啟用日期區間鎖定
                                    </label>
                                    <button onClick={setThisMonth} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded hover:bg-indigo-100 font-bold active:scale-95 transition-transform">抓取本月</button>
                                </div>
                                <div className={`flex items-center gap-1 transition-opacity ${!isDateFilterEnabled ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                    <input type="date" value={reportStartDate} onChange={e => { setReportStartDate(e.target.value); setIsDateFilterEnabled(true); }} className="w-full border-b border-gray-200 p-1 text-xs outline-none focus:border-indigo-500 bg-transparent cursor-pointer" />
                                    <span className="text-gray-400 text-xs px-1">至</span>
                                    <input type="date" value={reportEndDate} onChange={e => { setReportEndDate(e.target.value); setIsDateFilterEnabled(true); }} className="w-full border-b border-gray-200 p-1 text-xs outline-none focus:border-indigo-500 bg-transparent cursor-pointer" />
                                </div>
                            </div>
                            
                            {(reportType === 'payable' || reportType === 'paid_expenses') && (
                                <div className="col-span-2 md:col-span-1 mt-1">
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1">負責公司/供應商</label>
                                    <select value={reportCompany} onChange={e => setReportCompany(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-xs bg-white outline-none"><option value="">全部</option>{settings.expenseCompanies?.map((c:string) => <option key={c} value={c}>{c}</option>)}</select>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden relative bg-white">
                        <div className="absolute inset-0 overflow-auto scrollbar-thin">
                            <table className="w-full border-collapse text-xs whitespace-nowrap">
                                <thead className="sticky top-0 bg-slate-100 z-10 text-slate-600 shadow-sm print:bg-transparent print:shadow-none">
                                    <tr className="border-b-2 border-slate-200 text-left">
                                        <th className="p-3 w-24">日期</th><th className="p-3">項目</th><th className="p-3 w-28">車牌</th>
                                        {reportType === 'receivable' && <th className="p-3 w-20">類別</th>}
                                        {(reportType === 'payable' || reportType === 'paid_expenses') && <th className="p-3">供應商/車房</th>}
                                        {(reportType === 'payable' || reportType === 'paid_expenses') && <th className="p-3">類型/方式</th>}
                                        {reportType === 'sales' && <th className="p-3 text-right">總成本</th>}
                                        <th className="p-3 text-right w-28">金額</th>
                                        {reportType === 'sales' && <th className="p-3 text-right w-24">利潤</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {reportData.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-indigo-50/50 cursor-pointer transition-colors" onClick={() => handleReportItemClick(item.vehicleId)}>
                                            <td className="p-3 font-mono text-slate-500">{item.date}</td>
                                            <td className="p-3 font-bold truncate max-w-[200px]"><span className={item.type === 'Service' ? 'text-indigo-700' : (item.title.includes('[進貨') ? 'text-red-700' : 'text-slate-800')}>{item.title}</span></td>
                                            <td className="p-3 font-mono"><span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded text-slate-800 font-bold">{item.regMark || '未出牌'}</span></td>
                                            {reportType === 'receivable' && <td className="p-3 text-xs"><span className={`px-2 py-1 rounded border ${item.type==='Vehicle'?'bg-blue-50 text-blue-700 border-blue-100':'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>{item.type === 'Vehicle' ? '車價' : '代辦'}</span></td>}
                                            {(reportType === 'payable' || reportType === 'paid_expenses') && <td className="p-3 font-bold text-slate-700">{item.company}</td>}
                                            {(reportType === 'payable' || reportType === 'paid_expenses') && <td className="p-3"><span className={`px-2 py-1 rounded border ${item.invoiceNo === '本地收車' || item.invoiceNo === '國外訂車' || item.title.includes('[進貨付款]') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>{item.invoiceNo || '-'}</span></td>}
                                            {reportType === 'sales' && <td className="p-3 text-right font-mono">{formatCurrency(item.cost)}</td>}
                                            <td className="p-3 text-right font-mono font-black text-slate-800 text-sm">{formatCurrency(item.amount)}</td>
                                            {reportType === 'sales' && <td className={`p-3 text-right font-mono font-black text-sm ${item.profit > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(item.profit)}</td>}
                                        </tr>
                                    ))}
                                    {reportData.length === 0 && <tr><td colSpan={10} className="p-12 text-center text-gray-400">目前區間無符合條件的數據</td></tr>}
                                </tbody>
                                <tfoot className="sticky bottom-0 bg-white font-bold border-t-2 border-slate-300 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] print:shadow-none">
                                    <tr>
                                        <td colSpan={reportType === 'payable' || reportType === 'paid_expenses' ? 5 : (reportType === 'receivable' ? 4 : 3)} className="p-4 text-right text-slate-500 uppercase tracking-widest">總計 (Total):</td>
                                        {reportType === 'sales' && <td className="p-4"></td>}
                                        <td className={`p-4 text-right text-base font-black font-mono ${reportType === 'payable' ? 'text-red-600' : (reportType === 'paid_expenses' ? 'text-emerald-600' : 'text-indigo-700')}`}>{formatCurrency(totalReportAmount)}</td>
                                        {reportType === 'sales' && <td className="p-4 text-right text-emerald-700 text-base font-black font-mono">{formatCurrency(totalReportProfit)}</td>}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================== */}
            {/* Tab 3: 行家來往 (Partner Ledger) */}
            {/* ========================================== */}
            {financeTab === 'partner' && (
                <div className="flex-1 flex overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
                    <div className="w-1/3 md:w-80 bg-slate-50 border-r border-slate-200 flex flex-col">
                        <div className="p-4 border-b border-slate-200 bg-white">
                            <h3 className="font-bold text-slate-700 flex items-center mb-3"><Users size={18} className="mr-2 text-amber-500"/> 行家/夥伴名單</h3>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
                                <input value={partnerSearch} onChange={e => setPartnerSearch(e.target.value)} placeholder="搜尋名稱..." className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 ring-amber-200"/>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {filteredPartners.map((partner, idx) => {
                                const pLedgers = ledgers.filter(l => l.partner === partner);
                                const pBalance = pLedgers.reduce((sum, l) => sum + (l.type === 'receivable' ? Number(l.amount) : -Number(l.amount)), 0);
                                return (
                                    <div key={idx} onClick={() => setSelectedPartner(partner)} className={`p-3 rounded-xl cursor-pointer transition-all flex justify-between items-center ${selectedPartner === partner ? 'bg-amber-100 border border-amber-300 shadow-sm' : 'hover:bg-white border border-transparent hover:border-slate-200'}`}>
                                        <span className={`font-bold text-sm truncate ${selectedPartner === partner ? 'text-amber-900' : 'text-slate-700'}`}>{partner}</span>
                                        {pBalance !== 0 && <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${pBalance > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{pBalance > 0 ? '欠我們 ' : '我們欠 '}${Math.abs(pBalance).toLocaleString()}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col relative bg-white overflow-hidden">
                        {!selectedPartner ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10">
                                <Briefcase size={48} className="mb-4 opacity-30 text-amber-500"/>
                                <h3 className="text-lg font-bold text-slate-600 mb-1">請選擇左側行家</h3>
                            </div>
                        ) : (
                            <>
                                <div className="p-6 bg-slate-900 text-white flex justify-between items-center flex-none shadow-md z-10">
                                    <div><h3 className="text-2xl font-black tracking-wide mb-1">{selectedPartner}</h3><p className="text-xs text-slate-400">行家往來對帳單</p></div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">目前結餘 (Balance)</p>
                                        <div className="flex items-center justify-end">
                                            <span className={`text-3xl font-black font-mono ${partnerBalance > 0 ? 'text-green-400' : (partnerBalance < 0 ? 'text-red-400' : 'text-slate-300')}`}>{partnerBalance === 0 ? '$0' : `${partnerBalance > 0 ? '+' : '-'}$${Math.abs(partnerBalance).toLocaleString()}`}</span>
                                            {partnerBalance !== 0 && <button onClick={handleSettleBalance} className="ml-4 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded text-xs font-bold transition-colors">一鍵結清</button>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                                    <div className="space-y-3">
                                        {partnerHistory.map(l => (
                                            <div key={l.id} className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-amber-300 transition-colors group">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${l.type === 'receivable' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{l.type === 'receivable' ? '入' : '出'}</div>
                                                    <div><div className="font-bold text-slate-800">{l.note || '-'}</div><div className="text-xs text-slate-400 font-mono mt-0.5">{l.date} • {l.createdBy} 記錄</div></div>
                                                </div>
                                                <div className="text-right flex items-center gap-4">
                                                    <span className={`text-lg font-black font-mono ${l.type === 'receivable' ? 'text-green-600' : 'text-red-600'}`}>{l.type === 'receivable' ? '+' : '-'}${Number(l.amount).toLocaleString()}</span>
                                                    <button onClick={() => handleDeleteLedgerRecord(l.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"><Trash2 size={16}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <form onSubmit={handleAddLedgerRecord} className="p-4 bg-white border-t border-slate-200 flex-none shadow-[0_-5px_15px_rgba(0,0,0,0.03)] z-10">
                                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                                        <input type="date" value={newLedger.date} onChange={e => setNewLedger({...newLedger, date: e.target.value})} className="w-full sm:w-32 p-2.5 border rounded-lg text-sm font-bold text-slate-700 outline-none" required />
                                        <select value={newLedger.type} onChange={e => setNewLedger({...newLedger, type: e.target.value})} className="w-full sm:w-40 p-2.5 border rounded-lg text-sm font-bold outline-none bg-slate-50 cursor-pointer"><option value="receivable" className="text-green-700">🟢 我方應收 (借出/收佣)</option><option value="payable" className="text-red-700">🔴 我方應付 (借入/墊支)</option></select>
                                        <input type="text" placeholder="說明備註..." value={newLedger.note} onChange={e => setNewLedger({...newLedger, note: e.target.value})} className="flex-1 w-full p-2.5 border rounded-lg text-sm outline-none focus:ring-2 ring-amber-200" required />
                                        <div className="flex items-center bg-white border rounded-lg overflow-hidden w-full sm:w-40 focus-within:ring-2 ring-amber-200"><span className="pl-3 text-slate-400 font-bold">$</span><input type="number" min="1" placeholder="金額" value={newLedger.amount} onChange={e => setNewLedger({...newLedger, amount: e.target.value})} className="w-full p-2.5 outline-none text-right font-mono font-black text-slate-800" required /></div>
                                        <button type="submit" className="w-full sm:w-auto bg-amber-500 text-white font-bold px-6 py-2.5 rounded-lg shadow-md hover:bg-amber-600">記帳</button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================== */}
            {/* Tab 4: 會計帳目 (Accounting) */}
            {/* ========================================== */}
            {financeTab === 'accounting' && (
                <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                    
                    {/* 控制列 (Filters) */}
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 flex-none">
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg flex items-center"><Receipt size={20} className="mr-2 text-emerald-600"/> 會計流水帳 (Cashbook)</h3>
                            <p className="text-xs text-slate-500 mt-1">系統自動聚合所有已收/已付的現金流，供對帳使用。</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
                                <select value={accFilterType} onChange={e => setAccFilterType(e.target.value as any)} className="bg-transparent text-xs font-bold text-slate-700 py-2 px-3 outline-none cursor-pointer border-r border-slate-200">
                                    <option value="All">全部 (All)</option>
                                    <option value="IN">只看收入 (IN)</option>
                                    <option value="OUT">只看支出 (OUT)</option>
                                </select>
                                <div className="relative">
                                    <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400"/>
                                    <input value={accSearchTerm} onChange={e => setAccSearchTerm(e.target.value)} placeholder="搜尋摘要/車牌..." className="bg-transparent text-xs py-2 pl-7 pr-3 outline-none w-32 md:w-48"/>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-lg">
                                <label className="flex items-center text-[10px] font-bold text-gray-700 cursor-pointer ml-2">
                                    <input type="checkbox" checked={isDateFilterEnabled} onChange={(e) => setIsDateFilterEnabled(e.target.checked)} className="mr-1.5 accent-emerald-600"/>鎖定區間
                                </label>
                                <div className={`flex items-center gap-1 transition-opacity ${!isDateFilterEnabled ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                    <input type="date" value={reportStartDate} onChange={e => { setReportStartDate(e.target.value); setIsDateFilterEnabled(true); }} className="w-full border-b border-gray-200 p-1 text-xs outline-none bg-transparent cursor-pointer" />
                                    <span className="text-gray-400 text-xs px-1">至</span>
                                    <input type="date" value={reportEndDate} onChange={e => { setReportEndDate(e.target.value); setIsDateFilterEnabled(true); }} className="w-full border-b border-gray-200 p-1 text-xs outline-none bg-transparent cursor-pointer" />
                                </div>
                            </div>

                            <button onClick={exportAccountingCSV} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md hover:bg-emerald-700 active:scale-95 transition-all flex items-center ml-auto lg:ml-0">
                                <DownloadCloud size={14} className="mr-1.5"/> 匯出 CSV
                            </button>
                        </div>
                    </div>

                    {/* 流水帳表格 */}
                    <div className="flex-1 overflow-y-auto bg-white relative">
                        <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
                            <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 pl-6 w-16 text-center"><CheckSquare size={16} className="text-slate-400 inline"/></th>
                                    <th className="p-3 w-28">日期</th>
                                    <th className="p-3 w-40">會計類別</th>
                                    <th className="p-3 w-32">對象 / 車牌</th>
                                    <th className="p-3 max-w-xs">摘要</th>
                                    <th className="p-3 text-right text-emerald-700">收入 (IN)</th>
                                    <th className="p-3 text-right pr-6 text-red-700">支出 (OUT)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAccLedger.map((l: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-emerald-50/30 transition-colors group">
                                        <td className="p-3 pl-6 text-center">
                                            <input type="checkbox" className="w-4 h-4 accent-emerald-500 cursor-pointer" onChange={(e) => {
                                                const row = e.target.closest('tr');
                                                if(e.target.checked) row?.classList.add('opacity-40', 'bg-slate-50');
                                                else row?.classList.remove('opacity-40', 'bg-slate-50');
                                            }} title="對帳用"/>
                                        </td>
                                        <td className="p-3 font-mono text-slate-500 text-xs">{l.date}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold border ${l.category.includes('營業收入') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : l.category.includes('進貨成本') ? 'bg-red-50 text-red-700 border-red-200' : l.category.includes('營運開支') ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                                {l.category}
                                            </span>
                                        </td>
                                        <td className="p-3 font-bold text-slate-700">{l.ref}</td>
                                        <td className="p-3 text-slate-600 truncate max-w-xs" title={l.desc}>{l.desc}</td>
                                        <td className="p-3 text-right font-mono font-bold text-emerald-600 bg-emerald-50/10">
                                            {l.type === 'IN' ? formatCurrency(l.amount) : ''}
                                        </td>
                                        <td className="p-3 pr-6 text-right font-mono font-bold text-red-600 bg-red-50/10">
                                            {l.type === 'OUT' ? formatCurrency(l.amount) : ''}
                                        </td>
                                    </tr>
                                ))}
                                {filteredAccLedger.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-slate-400">目前沒有符合條件的紀錄</td></tr>}
                            </tbody>
                            <tfoot className="sticky bottom-0 bg-slate-50 font-bold border-t-2 border-slate-300 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
                                <tr>
                                    <td colSpan={5} className="p-3 text-right text-slate-500 uppercase tracking-widest">目前顯示區間總計:</td>
                                    <td className="p-3 text-right text-base font-black font-mono text-emerald-600">{formatCurrency(filteredTotalIn)}</td>
                                    <td className="p-3 pr-6 text-right text-base font-black font-mono text-red-600">{formatCurrency(filteredTotalOut)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        {/* ========================================== */}
            {/* Tab 5: 資金預算沙盤 (Capital Sandbox) */}
            {/* ========================================== */}
            {financeTab === 'capital' && (() => {
                // 數學計算引擎
                const principal = Number(capPrincipal.replace(/,/g, '')) || 0;
                const upfrontFee = principal * (capFee / 100);
                const upfrontInterest = principal * (capInterest / 100);
                const usableCash = principal - upfrontFee - upfrontInterest;
                
                const totalInterest = principal * (capInterest / 100) * capYears;
                const totalCost = upfrontFee + totalInterest;
                
                // 損益兩平點 (Break-even Yield)：每年至少要賺幾多%，先夠還利息同手續費？
                const breakEvenYield = usableCash > 0 ? (totalCost / usableCash / capYears) * 100 : 0;

                // 分配計算
                const valUsedCar = usableCash * (allocUsedCar / 100);
                const valLimited = usableCash * (allocLimited / 100);
                const valRental = usableCash * (allocRental / 100);

                const retUsedCar = valUsedCar * (yieldUsedCar / 100);
                const retLimited = valLimited * (yieldLimited / 100);
                const retRental = valRental * (yieldRental / 100);
                
                const totalAnnualReturn = retUsedCar + retLimited + retRental;
                const blendedYield = usableCash > 0 ? (totalAnnualReturn / usableCash) * 100 : 0;
                const netAnnualProfit = totalAnnualReturn - (principal * (capInterest / 100)) - (upfrontFee / capYears);

                return (
                    <div className="flex-1 flex flex-col bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-y-auto animate-fade-in p-4 md:p-6 space-y-6">
                        
                        <div className="bg-purple-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 w-48 h-48 bg-purple-600/30 rounded-full blur-3xl"></div>
                            <h3 className="text-xl font-black mb-2 flex items-center"><DollarSign className="mr-2 text-yellow-400"/> 資金成本與槓桿模擬器 (Capital Sandbox)</h3>
                            <p className="text-sm text-purple-200 max-w-2xl">計算包含「先扣利息與手續費」的真實資金成本，並將可用現金流分配至三大業務板塊，模擬您的年度預期回報與風險。</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* 左側：資金結構 */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                                <h4 className="font-bold text-slate-800 text-lg border-b pb-2">1. 外部資金結構 (Capital Structure)</h4>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">申請總額 (Principal HKD)</label>
                                        <input type="text" value={formatNumberInput(capPrincipal)} onChange={e => setCapPrincipal(e.target.value.replace(/,/g, ''))} className="w-full text-2xl font-black font-mono text-slate-800 border-b-2 border-purple-300 outline-none focus:border-purple-600 p-1 bg-transparent"/>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">年利率 (%)</label>
                                            <input type="number" value={capInterest} onChange={e => setCapInterest(Number(e.target.value))} className="w-full text-lg font-bold border rounded p-2 outline-none focus:ring-2 ring-purple-200"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">一次性手續費 (%)</label>
                                            <input type="number" value={capFee} onChange={e => setCapFee(Number(e.target.value))} className="w-full text-lg font-bold border rounded p-2 outline-none focus:ring-2 ring-purple-200"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">借款期 (年)</label>
                                            <input type="number" value={capYears} onChange={e => setCapYears(Number(e.target.value))} className="w-full text-lg font-bold border rounded p-2 outline-none focus:ring-2 ring-purple-200"/>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                                    <div className="flex justify-between text-sm"><span className="text-slate-500">先扣手續費:</span><span className="font-mono text-red-500 font-bold">-{formatCurrency(upfrontFee)}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-slate-500">先扣首年利息:</span><span className="font-mono text-red-500 font-bold">-{formatCurrency(upfrontInterest)}</span></div>
                                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                                        <span className="font-bold text-slate-800">實際到手可用現金:</span>
                                        <span className="text-2xl font-black font-mono text-emerald-600">{formatCurrency(usableCash)}</span>
                                    </div>
                                </div>

                                <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex justify-between items-center">
                                    <div>
                                        <div className="text-xs font-bold text-red-600 uppercase">損益兩平點 (Break-even Yield)</div>
                                        <div className="text-[10px] text-red-500/80 mt-0.5">這筆可用現金每年需賺取多少，才夠冚皮？</div>
                                    </div>
                                    <div className="text-2xl font-black text-red-700">{breakEvenYield.toFixed(2)}%</div>
                                </div>
                            </div>

                            {/* 右側：投資分配與回報 */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                                <div className="flex justify-between items-center border-b pb-2">
                                    <h4 className="font-bold text-slate-800 text-lg">2. 資金池分配矩陣 (Allocation)</h4>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${allocUsedCar + allocLimited + allocRental === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 animate-pulse'}`}>總分配: {allocUsedCar + allocLimited + allocRental}%</span>
                                </div>

                                {/* 跑道 1 */}
                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                    <div className="flex justify-between font-bold text-blue-800 text-sm mb-2"><span>A. 常規二手車及中港買賣 (高周轉)</span><span>{formatCurrency(valUsedCar)}</span></div>
                                    <div className="flex gap-4 items-center">
                                        <div className="flex-1"><label className="text-[10px] text-blue-600">分配比例 {allocUsedCar}%</label><input type="range" min="0" max="100" value={allocUsedCar} onChange={e=>setAllocUsedCar(Number(e.target.value))} className="w-full accent-blue-600"/></div>
                                        <div className="w-24"><label className="text-[10px] text-blue-600">預期年回報 %</label><input type="number" value={yieldUsedCar} onChange={e=>setYieldUsedCar(Number(e.target.value))} className="w-full p-1 text-sm border border-blue-300 rounded text-center font-bold"/></div>
                                    </div>
                                </div>

                                {/* 跑道 2 */}
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                    <div className="flex justify-between font-bold text-amber-800 text-sm mb-2"><span>B. 限量版 Quota 買賣 (高利潤)</span><span>{formatCurrency(valLimited)}</span></div>
                                    <div className="flex gap-4 items-center">
                                        <div className="flex-1"><label className="text-[10px] text-amber-600">分配比例 {allocLimited}%</label><input type="range" min="0" max="100" value={allocLimited} onChange={e=>setAllocLimited(Number(e.target.value))} className="w-full accent-amber-500"/></div>
                                        <div className="w-24"><label className="text-[10px] text-amber-600">預期年回報 %</label><input type="number" value={yieldLimited} onChange={e=>setYieldLimited(Number(e.target.value))} className="w-full p-1 text-sm border border-amber-300 rounded text-center font-bold"/></div>
                                    </div>
                                </div>

                                {/* 跑道 3 */}
                                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                    <div className="flex justify-between font-bold text-emerald-800 text-sm mb-2"><span>C. 未來拓展：車輛出租 (穩定防守)</span><span>{formatCurrency(valRental)}</span></div>
                                    <div className="flex gap-4 items-center">
                                        <div className="flex-1"><label className="text-[10px] text-emerald-600">分配比例 {allocRental}%</label><input type="range" min="0" max="100" value={allocRental} onChange={e=>setAllocRental(Number(e.target.value))} className="w-full accent-emerald-500"/></div>
                                        <div className="w-24"><label className="text-[10px] text-emerald-600">預期年回報 %</label><input type="number" value={yieldRental} onChange={e=>setYieldRental(Number(e.target.value))} className="w-full p-1 text-sm border border-emerald-300 rounded text-center font-bold"/></div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* 底部總結 */}
                            <div className="lg:col-span-2 bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center text-white">
                                <div className="mb-4 md:mb-0 w-full md:w-auto">
                                    <div className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-1">Portfolio Projection (投資組合預期)</div>
                                    <div className="text-3xl font-black text-white">{blendedYield.toFixed(2)}% <span className="text-sm text-slate-400 font-normal">混合年回報率</span></div>
                                </div>
                                <div className="flex gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-700 pt-4 md:pt-0">
                                    <div className="text-right">
                                        <div className="text-slate-400 text-[10px] uppercase">預期每年總利潤</div>
                                        <div className="text-xl font-mono font-bold text-blue-400">{formatCurrency(totalAnnualReturn)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-slate-400 text-[10px] uppercase">扣除資金成本後 <span className="text-emerald-400">真實純利</span></div>
                                        <div className={`text-2xl font-mono font-black ${netAnnualProfit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {formatCurrency(netAnnualProfit)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
