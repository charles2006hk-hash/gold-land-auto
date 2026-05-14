// src/components/MarketIntelligence.tsx
import React, { useState } from 'react';
import { Zap, Search, X, RefreshCw, DollarSign } from 'lucide-react';

interface MarketIntelligenceProps {
    dbEntries: any[];
    inventory: any[];
    staffId: string;
    currentUser: any;
}

export default function MarketIntelligence({ dbEntries, inventory, staffId, currentUser }: MarketIntelligenceProps) {
    // 獨立管理自己展開/收起的狀態
    const [showMarketIntelligence, setShowMarketIntelligence] = useState(false);
    const [marketSearchQuery, setMarketSearchQuery] = useState('');

    return (
        <div className="flex flex-col items-end flex-none w-full mb-4">
            <button 
                onClick={() => setShowMarketIntelligence(!showMarketIntelligence)}
                className="group flex items-center gap-2 bg-slate-800 hover:bg-blue-600 text-blue-300 hover:text-white px-4 py-2 rounded-full shadow-md transition-all duration-300 ease-in-out border border-slate-700 mt-2"
            >
                <Zap size={16} className={`${showMarketIntelligence ? 'text-yellow-400' : 'text-blue-400'} group-hover:text-yellow-300`} />
                <span className="text-sm font-medium">
                    {showMarketIntelligence ? '收起市場分析沙盤' : '📊 展開香港車市數據與採購推算'}
                </span>
            </button>

            {/* 點擊後展開的分析面板 */}
            {showMarketIntelligence && (() => {
                // 取得實時數據
                const realTimeMarketStats = dbEntries
                    .filter(d => d.docType === '市場大數據' && (d as any).topModels)
                    .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0] as any;

                // ★ 搜尋過濾邏輯 (左側政府數據)
                const filteredTopModels = realTimeMarketStats?.topModels?.filter((car: any) => {
                    if (!marketSearchQuery) return true;
                    const q = marketSearchQuery.toLowerCase();
                    return car.make.toLowerCase().includes(q) || car.model.toLowerCase().includes(q);
                }) || [];

                return (
                <div className="w-full mt-3 bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl shadow-2xl p-5 md:p-6 text-white border border-blue-800 animate-in slide-in-from-top-4 fade-in duration-300 max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-700">
                    
                    <div className="flex justify-between items-end mb-4 border-b border-blue-800/50 pb-4 flex-none gap-4">
                        <h2 className="text-xl font-bold text-blue-100 flex items-center gap-2 whitespace-nowrap">
                            <span>📈</span> 採購雷達 
                            <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded hidden md:inline-block">
                                基於 {realTimeMarketStats?.name ? realTimeMarketStats.name.substring(0,10) : '政府最新'} 出牌數據
                            </span>
                        </h2>
                        
                        <button 
                            onClick={() => window.open('/api/sync-market-data', '_blank')}
                            className="text-xs bg-blue-600/50 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors border border-blue-500/50 flex items-center shadow whitespace-nowrap"
                        >
                            <RefreshCw size={12} className="mr-1.5"/> 同步最新明細
                        </button>
                    </div>

                    {/* ★ 全域搜尋框 */}
                    <div className="mb-5 flex-none relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="輸入品牌或型號進行比對 (例如: TOYOTA, TESLA, ALPHARD)..."
                            value={marketSearchQuery}
                            onChange={(e) => setMarketSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-10 py-2.5 border border-slate-700 rounded-xl leading-5 bg-slate-800/80 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                        />
                        {marketSearchQuery && (
                            <button 
                                onClick={() => setMarketSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 左側：市場熱門車型大數據榜 */}
                        <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700/50 shadow-inner flex flex-col max-h-[400px]">
                            <h3 className="text-[13px] font-bold text-blue-300 mb-4 flex items-center tracking-wider uppercase flex-none">
                                <Zap size={14} className="mr-1.5 text-yellow-400"/> 運輸署本月出牌榜 ({filteredTopModels.length} 筆)
                            </h3>
                            
                            {filteredTopModels.length > 0 ? (
                                <div className="space-y-2 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600">
                                    {filteredTopModels.map((car: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center bg-slate-800/80 p-3 rounded-lg hover:bg-slate-700 transition-colors border-l-4 border-blue-500">
                                            <div className="min-w-0 pr-2">
                                                <span className="font-bold text-sm tracking-wide block text-slate-100 truncate">{car.make} {car.model}</span>
                                                <div className="text-[10px] text-slate-400 font-mono mt-1 flex gap-2.5">
                                                    <span>全新: <span className="text-white">{car.new}</span></span>
                                                    <span title="曾於外地登記">二手水貨: <span className="text-yellow-400 font-bold">{car.used}</span></span>
                                                    {car.ev > 0 && <span className="text-green-400 bg-green-900/30 px-1 rounded">EV: {car.ev}</span>}
                                                </div>
                                            </div>
                                            <div className="text-right flex-none">
                                                <span className="text-blue-400 font-bold font-mono text-lg">{car.total}</span>
                                                <span className="text-[10px] text-slate-500 ml-1">台</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-slate-500 text-sm">
                                    {marketSearchQuery ? '找不到符合的車型' : '尚未同步最新車型數據'}
                                </div>
                            )}
                            <p className="text-[10px] text-slate-500 mt-4 text-right flex-none">
                                * 數據: DATA.GOV.HK (代碼A=全新, 其他=外地二手水貨)
                            </p>
                        </div>

                        {/* 右側：公司轉流推算 */}
                        <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700/50 shadow-inner flex flex-col max-h-[400px]">
                            <h3 className="text-[13px] font-bold text-yellow-400 mb-4 flex items-center tracking-wider uppercase flex-none">
                                <DollarSign size={14} className="mr-1.5"/> 公司資金轉流推算
                            </h3>
                            
                            <div className="space-y-3 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600">
                                {(() => {
                                    // 1. 判定權限：管理員可以看到全公司數據
                                    const isAdmin = staffId === 'BOSS' || currentUser?.modules?.includes('all') || currentUser?.dataAccess === 'all';
                                    
                                    // 2. 過濾售出車輛：管理員看全部，普通員工只看自己 managedBy 的車
                                    const soldCars = inventory.filter((v:any) => {
                                        const basicFilter = v.status === 'Sold' && v.stockInDate && v.stockOutDate;
                                        if (!basicFilter) return false;
                                        
                                        if (isAdmin) return true; // 老闆/管理員放行全公司
                                        return v.managedBy === staffId; // 普通員工只看自己的
                                    });

                                    const modelStats: Record<string, { count: number, totalDays: number }> = {};
                                    
                                    soldCars.forEach((car:any) => {
                                        const key = `${car.make} ${car.model}`;
                                        const inDate = new Date(car.stockInDate).getTime();
                                        const outDate = new Date(car.stockOutDate).getTime();
                                        let days = Math.floor((outDate - inDate) / (1000 * 60 * 60 * 24));
                                        if (days < 0) days = 0; 
                                        
                                        if (!modelStats[key]) modelStats[key] = { count: 0, totalDays: 0 };
                                        modelStats[key].count++;
                                        modelStats[key].totalDays += days;
                                    });

                                    // 3. 搜尋過濾邏輯
                                    const turnoverList = Object.entries(modelStats)
                                        .filter(([key, data]) => {
                                            if (data.count < 1) return false;
                                            if (!marketSearchQuery) return true;
                                            return key.toLowerCase().includes(marketSearchQuery.toLowerCase());
                                        }) 
                                        .map(([key, data]) => ({
                                            key,
                                            avgDays: Math.round(data.totalDays / data.count),
                                            count: data.count
                                        }))
                                        .sort((a,b) => a.avgDays - b.avgDays); 

                                    if (turnoverList.length === 0) {
                                        return <div className="text-center py-10 text-slate-500 text-sm">
                                            {marketSearchQuery ? '找不到符合搜尋的記錄' : (isAdmin ? '全公司尚未售出車輛' : '您目前尚未有成功售出並記錄的車輛')}
                                        </div>;
                                    }
                                    
                                    return turnoverList.map(item => (
                                        <div key={item.key} className="bg-slate-800/80 p-3 rounded-lg border-l-4 border-yellow-500 hover:bg-slate-700 transition-colors flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-sm tracking-wide text-slate-100 mb-1">{item.key}</div>
                                                <div className="text-[10px] text-slate-400">銷售樣本：<span className="text-white font-mono">{item.count}</span> 台</div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block mb-1 ${item.avgDays <= 15 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                    {item.avgDays <= 15 ? '極速變現' : '穩定周轉'}
                                                </div>
                                                <div className="text-xs text-slate-300">平均 <strong className="text-white font-mono text-lg">{item.avgDays}</strong> 天</div>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
                );
            })()}
        </div>
    );
}
