'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Flame, TrendingDown, Clock, CheckCircle2, ExternalLink, Star, Car, Filter, Loader2, Database } from 'lucide-react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';

export default function MarketRadarModule({ db, appId }: { db: any, appId: string }) {
    const [cars, setCars] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ai_picks' | 'new_arrivals' | 'price_drops' | 'sold'>('ai_picks');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('All');

    // ★ 實時監聽 Firestore 中的 28Car 數據庫
    useEffect(() => {
        if (!db || !appId) return;

        const q = query(
            collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', '28car_market_data'),
            orderBy('last_updated', 'desc'),
            limit(1000)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(doc => {
                list.push({ dbId: doc.id, ...doc.data() });
            });
            setCars(list);
            setLoading(false);
        }, (err) => {
            console.error("實時讀取市場數據庫失敗:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, appId]);

    const brands = ['All', ...Array.from(new Set(cars.map(c => c.brand)))].filter(b => b && b !== 'Unknown');

    // ★ 核心 AI 評分引擎
    const calculateAIScore = (car: any, marketAvgPrice: number) => {
        if (car.status === 'Sold') return 0; 
        let score = 50; 
        
        if (car.price > 0 && marketAvgPrice > 0 && car.price < marketAvgPrice) {
            const discountRatio = (marketAvgPrice - car.price) / marketAvgPrice;
            score += Math.min(discountRatio * 150, 35); 
        }

        const listedDate = new Date(car.listedAt || car.site_date || new Date());
        const daysListed = Math.max((new Date().getTime() - listedDate.getTime()) / (1000 * 3600 * 24), 1);
        const viewsPerDay = (car.views || 0) / daysListed;
        score += Math.min(viewsPerDay / 10, 15); 

        if (car.isPriceDrop === 1) score += 5;
        return Math.min(Math.round(score), 99); 
    };

    const getMarketAvg = (brand: string, model: string) => {
        const sameModelCars = cars.filter(c => c.brand === brand && c.status === 'Available' && c.price > 0);
        if (sameModelCars.length === 0) return 0;
        const total = sameModelCars.reduce((sum, c) => sum + c.price, 0);
        return total / sameModelCars.length;
    };

    const processedCars = useMemo(() => {
        return cars.map(car => {
            const avgPrice = getMarketAvg(car.brand, car.model);
            const score = calculateAIScore(car, avgPrice);
            
            let daysToSell = 0;
            if (car.status === 'Sold' && car.listedAt && car.last_updated) {
                daysToSell = Math.max(1, Math.ceil((new Date(car.last_updated).getTime() - new Date(car.listedAt).getTime()) / (1000 * 3600 * 24)));
            }

            return { ...car, aiScore: score, daysToSell };
        });
    }, [cars]);

    const filteredCars = useMemo(() => {
        let result = processedCars;
        if (selectedBrand !== 'All') result = result.filter(c => c.brand === selectedBrand);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c => (c.title||'').toLowerCase().includes(q) || (c.brand||'').toLowerCase().includes(q));
        }

        switch (activeTab) {
            case 'ai_picks': 
                // ★ 改為直接顯示評分最高的前 50 台，避免沒車顯示
                return result.filter(c => c.status === 'Available').sort((a, b) => b.aiScore - a.aiScore).slice(0, 50);
            case 'new_arrivals': 
                return result.filter(c => c.status === 'Available').sort((a, b) => new Date(b.listedAt || 0).getTime() - new Date(a.listedAt || 0).getTime());
            case 'price_drops': 
                return result.filter(c => c.status === 'Available' && c.isPriceDrop === 1).sort((a, b) => new Date(b.last_updated || 0).getTime() - new Date(a.last_updated || 0).getTime());
            case 'sold': 
                return result.filter(c => c.status === 'Sold').sort((a, b) => new Date(b.last_updated || 0).getTime() - new Date(a.last_updated || 0).getTime());
            default: return result;
        }
    }, [processedCars, activeTab, searchQuery, selectedBrand]);

    const renderCarCard = (car: any) => (
        <div key={car.id || car.dbId} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-4 flex flex-col group relative overflow-hidden">
            {activeTab === 'ai_picks' && car.aiScore >= 75 && <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-bl-full pointer-events-none"></div>}

            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 pr-4">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md mb-1.5 inline-block">{car.year} • {car.brand} • {car.sellerType === 'Private' ? '私人盤' : '車行盤'}</span>
                    <h3 className="font-bold text-sm text-slate-800 leading-tight line-clamp-2">{car.title}</h3>
                </div>
                {activeTab === 'ai_picks' && (
                    <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-full border-4 shadow-sm flex-none ${car.aiScore >= 75 ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-emerald-400 bg-emerald-50 text-emerald-700'}`}>
                        <span className="text-sm font-black leading-none">{car.aiScore}</span>
                        <span className="text-[8px] font-bold">分</span>
                    </div>
                )}
                {activeTab === 'sold' && (
                    <div className="bg-slate-800 text-white px-2 py-1 rounded-md text-[10px] font-bold flex flex-col items-center flex-none">
                        <span>成交耗時</span><span className="text-sm text-amber-400">{car.daysToSell} 天</span>
                    </div>
                )}
            </div>

            <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-end">
                <div>
                    {car.isPriceDrop === 1 && car.status !== 'Sold' ? (
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                                <span className="font-black text-red-600 text-lg">${(car.price || 0).toLocaleString()}</span>
                                <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold animate-pulse flex items-center">
                                    <TrendingDown size={10} className="mr-0.5"/> 減價盤
                                </span>
                            </div>
                        </div>
                    ) : (
                        <span className="font-black text-blue-700 text-lg">${(car.price || 0).toLocaleString()}</span>
                    )}
                </div>
                <a href={car.link} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-50 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><ExternalLink size={16} /></a>
            </div>

            <div className="flex gap-2 mt-3 text-[10px] font-mono text-slate-400">
                <span className="flex items-center bg-slate-50 px-1.5 py-0.5 rounded"><Flame size={10} className="mr-1"/> {car.views || 0} views</span>
                <span className="flex items-center bg-slate-50 px-1.5 py-0.5 rounded"><Clock size={10} className="mr-1"/> {(car.listedAt || car.site_date || '').slice(0, 10)}</span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 p-4 gap-4 overflow-hidden rounded-2xl border border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex-none">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl text-white shadow-md">
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Database size={20} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-black text-lg text-slate-800">28Car 市場大數據雷達</h2>
                            {/* ★ 顯示目前成功載入的車盤數量 */}
                            {!loading && <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm">已連線: {cars.length} 筆</span>}
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">實時同步雲端數據庫</p>
                    </div>
                </div>

                <div className="flex w-full md:w-auto gap-2">
                    <div className="relative flex-1 md:w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="搜尋車款、關鍵字..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:border-blue-500 outline-none bg-slate-50 focus:bg-white transition-colors"/>
                    </div>
                    <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-2 outline-none cursor-pointer">
                        {brands.map(b => <option key={b} value={b}>{b === 'All' ? '全廠牌' : b}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-none px-1">
                <button onClick={() => setActiveTab('ai_picks')} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black whitespace-nowrap transition-all ${activeTab === 'ai_picks' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 shadow-md transform -translate-y-0.5' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}><Star size={16} className={activeTab === 'ai_picks' ? 'fill-yellow-700' : ''}/> AI 筍盤推介</button>
                <button onClick={() => setActiveTab('new_arrivals')} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black whitespace-nowrap transition-all ${activeTab === 'new_arrivals' ? 'bg-blue-600 text-white shadow-md transform -translate-y-0.5' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}><Car size={16} /> 最新上架盤</button>
                <button onClick={() => setActiveTab('price_drops')} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black whitespace-nowrap transition-all ${activeTab === 'price_drops' ? 'bg-red-600 text-white shadow-md transform -translate-y-0.5' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}><TrendingDown size={16} /> 減價專區</button>
                <button onClick={() => setActiveTab('sold')} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black whitespace-nowrap transition-all ${activeTab === 'sold' ? 'bg-slate-800 text-white shadow-md transform -translate-y-0.5' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}><CheckCircle2 size={16} /> 成功售出/行情</button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin px-1 pb-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-40 mt-4"><Loader2 size={32} className="animate-spin text-blue-500 mb-2" /><p className="text-sm font-bold text-slate-500">正在讀取雲端數據庫...</p></div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredCars.map(car => renderCarCard(car))}
                        </div>
                        {filteredCars.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-40 bg-white border border-dashed border-slate-300 rounded-xl mt-4"><Filter size={32} className="text-slate-300 mb-2" /><p className="text-sm font-bold text-slate-400">目前沒有符合條件的車輛</p></div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
