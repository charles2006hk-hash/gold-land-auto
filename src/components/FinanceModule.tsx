// src/components/FinanceModule.tsx
'use client';

import React, { useMemo } from 'react';
import { 
    BarChart3, TrendingUp, TrendingDown, DollarSign, Wallet, 
    ArrowUpRight, ArrowDownRight, Calendar, PieChart, Activity
} from 'lucide-react';

const formatCurrency = (amount: number) => new Intl.NumberFormat('zh-HK', { 
    style: 'currency', 
    currency: 'HKD', 
    maximumFractionDigits: 0 
}).format(amount || 0);

export default function FinanceModule({ inventory, settings }: any) {
    // --- 核心邏輯修正：精準現金流計算 ---
    const financialStats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let monthlyInflow = 0;  // 實際流入 (現金、轉帳等所有已收到的錢)
        let monthlyOutflow = 0; // 實際流出 (付給車房、進貨支出、退款)

        inventory.forEach((v: any) => {
            // 1. 計算流入 (來自客戶的每一筆付款)
            (v.payments || []).forEach((p: any) => {
                const pDate = new Date(p.date);
                if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
                    monthlyInflow += (p.amount || 0);
                }
            });

            // 2. 計算流入 (來自維修服務的「對客收費」)
            // 如果您的維修收費是獨立記錄且已收齊，應計入流入
            (v.maintenanceRecords || []).forEach((m: any) => {
                const mDate = new Date(m.date);
                if (mDate.getMonth() === currentMonth && mDate.getFullYear() === currentYear) {
                    if (m.chargeStatus === 'Paid') {
                        monthlyInflow += (m.charge || 0);
                    }
                }
            });

            // 3. 計算流出 (維修雜費支出)
            (v.expenses || []).forEach((e: any) => {
                const eDate = new Date(e.date);
                if (eDate.getMonth() === currentMonth && eDate.getFullYear() === currentYear) {
                    if (e.status === 'Paid') {
                        monthlyOutflow += (e.amount || 0);
                    }
                }
            });

            // 4. 計算流出 (進貨付給行家/前車主的錢)
            (v.acquisition?.payments || []).forEach((ap: any) => {
                const apDate = new Date(ap.date);
                if (apDate.getMonth() === currentMonth && apDate.getFullYear() === currentYear) {
                    monthlyOutflow += (ap.amount || 0);
                }
            });
            
            // 5. 維修成本支出 (付給車房)
            (v.maintenanceRecords || []).forEach((m: any) => {
                const mDate = new Date(m.date);
                if (mDate.getMonth() === currentMonth && mDate.getFullYear() === currentYear) {
                    if (m.costStatus === 'Paid') {
                        monthlyOutflow += (m.cost || 0);
                    }
                }
            });
        });

        return {
            monthlyInflow,
            monthlyOutflow,
            netCashFlow: monthlyInflow - monthlyOutflow
        };
    }, [inventory]);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* 頂部看板 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                        <TrendingUp size={80} className="text-emerald-600" />
                    </div>
                    <p className="text-slate-500 text-sm font-bold mb-1">本月實際現金流入</p>
                    <h3 className="text-3xl font-black text-emerald-600 font-mono">
                        {formatCurrency(financialStats.monthlyInflow)}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-2 flex items-center">
                        <ArrowUpRight size={12} className="mr-1"/> 來自所有單據與維修已收帳項
                    </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                        <TrendingDown size={80} className="text-red-600" />
                    </div>
                    <p className="text-slate-500 text-sm font-bold mb-1">本月實際現金流出</p>
                    <h3 className="text-3xl font-black text-red-600 font-mono">
                        {formatCurrency(financialStats.monthlyOutflow)}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-2 flex items-center">
                        <ArrowDownRight size={12} className="mr-1"/> 包含收車款、維修成本及雜支
                    </p>
                </div>

                <div className={`${financialStats.netCashFlow >= 0 ? 'bg-slate-900' : 'bg-red-900'} p-6 rounded-2xl shadow-lg relative overflow-hidden`}>
                    <p className="text-slate-400 text-sm font-bold mb-1">本月淨現金流</p>
                    <h3 className="text-3xl font-black text-white font-mono">
                        {formatCurrency(financialStats.netCashFlow)}
                    </h3>
                    <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-400 transition-all duration-1000" 
                            style={{ width: `${Math.min(100, (financialStats.monthlyInflow / (financialStats.monthlyOutflow || 1)) * 50)}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* 這裡可以繼續放圖表或其他詳細列表 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-slate-800 flex items-center"><Activity size={20} className="mr-2 text-blue-500"/> 財務健康度分析</h3>
                    <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold">Real-time Data</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-sm text-slate-500">流入/流出比率 (Coverage)</span>
                            <span className="text-lg font-bold text-slate-700">
                                {((financialStats.monthlyInflow / (financialStats.monthlyOutflow || 1)) * 100).toFixed(1)}%
                            </span>
                        </div>
                        {/* 簡單的進度條視覺化 */}
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                            <div className="bg-emerald-500 h-full" style={{ width: '60%' }}></div>
                            <div className="bg-red-400 h-full" style={{ width: '40%' }}></div>
                        </div>
                    </div>
                    <div className="flex items-center justify-center border-l border-slate-100">
                         <p className="text-xs text-slate-400 text-center px-10">
                            提示：現金流流入是根據本月「實際收款日」計算。若流入異常，請檢查車輛編輯內的「收款記錄」日期是否正確。
                         </p>
                    </div>
                </div>
            </div>
        </div>
    );
}


