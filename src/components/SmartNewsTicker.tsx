import React, { useState, useEffect } from 'react';
import { Zap, ArrowUpDown, BarChart3, X, RefreshCw } from 'lucide-react';
import MarketIntelligence from '@/components/MarketIntelligence';

interface SmartNewsTickerProps {
    dbEntries: any[];
    inventory: any[];
    staffId: string;
    currentUser: any;
}

const SmartNewsTicker = ({ dbEntries, inventory, staffId, currentUser }: SmartNewsTickerProps) => {
    const [aiNewsFeed, setAiNewsFeed] = useState([
        { tag: '⏳ 系統提示', text: '正在載入 AI 即時整理的車市與財經快訊...', time: '--:--' }
    ]);

    const [finIndex, setFinIndex] = useState(0);
    const [financialStats, setFinancialStats] = useState([
        { label: '實時金融', value: '載入中...', color: 'text-slate-400' }
    ]);

    const [carSalesStats, setCarSalesStats] = useState({
        month: new Date().getMonth() + 1, 
        evCount: '...',
        petrolCount: '...',
        total: '...'
    });

    // 匯率計算機專用狀態
    const [isConverterOpen, setIsConverterOpen] = useState(false);
    const [allRates, setAllRates] = useState<Record<string, number> | null>(null);
    const [currA, setCurrA] = useState('CNY');
    const [currB, setCurrB] = useState('HKD');
    const [valA, setValA] = useState('100');
    const [valB, setValB] = useState('');

    // 大數據圖表專用的彈窗狀態
    const [isMarketIntelOpen, setIsMarketIntelOpen] = useState(false);

    useEffect(() => {
        if (isConverterOpen && allRates && allRates[currA] && allRates[currB]) {
            const rate = allRates[currB] / allRates[currA];
            setValB((Number(valA) * rate).toFixed(2));
        }
    }, [isConverterOpen, allRates]); 

    const handleAChange = (e: any, cA = currA, cB = currB) => {
        const v = e.target.value;
        setValA(v);
        if (v === '') {
            setValB('');
        } else if (allRates && allRates[cA] && allRates[cB]) {
            setValB((Number(v) * (allRates[cB] / allRates[cA])).toFixed(2));
        }
    };

    const handleBChange = (e: any, cA = currA, cB = currB) => {
        const v = e.target.value;
        setValB(v);
        if (v === '') {
            setValA('');
        } else if (allRates && allRates[cA] && allRates[cB]) {
            setValA((Number(v) * (allRates[cA] / allRates[cB])).toFixed(2));
        }
    };

    const swapCurrencies = () => {
        const tempC = currA; setCurrA(currB); setCurrB(tempC);
        const tempV = valA; setValA(valB); setValB(tempV);
    };

    useEffect(() => {
        const checkAndFetchNews = async () => {
            const now = new Date();
            const currentHour = now.getHours();
            const lastFetchStr = localStorage.getItem('goldland_news_last_fetch');
            const cachedNewsStr = localStorage.getItem('goldland_news_cache');
            
            let shouldFetch = false;
            if (!lastFetchStr || !cachedNewsStr) {
                shouldFetch = true;
            } else {
                const lastFetchDate = new Date(parseInt(lastFetchStr));
                const isNewDay = lastFetchDate.getDate() !== now.getDate() || lastFetchDate.getMonth() !== now.getMonth() || lastFetchDate.getFullYear() !== now.getFullYear();

                if (isNewDay) {
                    shouldFetch = true;
                } else {
                    if (currentHour >= 10 && currentHour < 22) {
                        const hoursSinceLastFetch = (now.getTime() - lastFetchDate.getTime()) / (1000 * 60 * 60);
                        if (hoursSinceLastFetch >= 3) shouldFetch = true;
                    }
                }
            }

            if (shouldFetch) {
                try {
                    const res = await fetch('/api/news');
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.length > 0) {
                            setAiNewsFeed(data);
                            localStorage.setItem('goldland_news_last_fetch', now.getTime().toString());
                            localStorage.setItem('goldland_news_cache', JSON.stringify(data));
                        }
                    }
                } catch (e) {
                    if (cachedNewsStr) setAiNewsFeed(JSON.parse(cachedNewsStr));
                }
            } else if (cachedNewsStr) {
                setAiNewsFeed(JSON.parse(cachedNewsStr));
            }
        };

        const fetchRealTimeData = async () => {
            try {
                let newStats: any[] = [];
                const indicesRes = await fetch('/api/finance');
                if (indicesRes.ok) {
                    const indicesData = await indicesRes.json();
                    if (Array.isArray(indicesData)) newStats = [...newStats, ...indicesData];
                }

                const forexRes = await fetch('https://open.er-api.com/v6/latest/HKD');
                if (forexRes.ok) {
                    const forexData = await forexRes.json();
                    if (forexData && forexData.rates) {
                        setAllRates(forexData.rates);
                        newStats.push(
                            { label: '人民幣/港元', value: (1 / forexData.rates.CNY).toFixed(3), color: 'text-red-400' },
                            { label: '百日圓/港元', value: (100 / forexData.rates.JPY).toFixed(2), color: 'text-yellow-400' },
                            { label: '澳元/港元', value: (1 / forexData.rates.AUD).toFixed(2), color: 'text-blue-300' },
                            { label: '歐元/港元', value: (1 / forexData.rates.EUR).toFixed(2), color: 'text-blue-300' },
                            { label: '英鎊/港元', value: (1 / forexData.rates.GBP).toFixed(2), color: 'text-blue-300' }
                        );
                    }
                }

                if (newStats.length > 0) setFinancialStats(newStats);
            } catch (error) {
                console.error("Financial data fetch error", error);
            }
        };

        const fetchVehicleStats = async () => {
            try {
                const res = await fetch('/api/td-stats');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.month) {
                        setCarSalesStats({
                            month: data.month, evCount: data.evCount, petrolCount: data.petrolCount, total: data.total
                        });
                    }
                }
            } catch (error) {}
        };

        checkAndFetchNews(); fetchRealTimeData(); fetchVehicleStats();
        
        const newsInterval = setInterval(checkAndFetchNews, 10 * 60 * 1000);
        const forexInterval = setInterval(fetchRealTimeData, 5 * 60 * 1000); 
        
        return () => { clearInterval(newsInterval); clearInterval(forexInterval); };
    }, []);

    useEffect(() => {
        const flipInterval = setInterval(() => {
            setFinIndex((prev) => (prev + 1) % financialStats.length);
        }, 3500);
        return () => clearInterval(flipInterval);
    }, [financialStats.length]);

    return (
        <>
            <div className="flex items-center bg-slate-100 text-slate-700 rounded-full shadow-inner overflow-hidden w-full border border-slate-200 h-8 relative max-w-5xl mx-auto">
                <style>{`
                    @keyframes marquee-inline { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                    .animate-marquee-inline { display: inline-flex; white-space: nowrap; animation: marquee-inline 150s linear infinite; }
                    .animate-marquee-inline:hover { animation-play-state: paused; }
                    .mask-edges-inline { -webkit-mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent); mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent); }
                `}</style>

                {/* 左側標籤 */}
                <div className="flex-none bg-blue-600 text-white text-[10px] font-bold px-2 md:px-3 h-full flex items-center z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                    <Zap size={12} className="mr-1 text-yellow-400 fill-yellow-400 animate-pulse"/> 
                    <span className="hidden md:inline">AI 快訊</span>
                    <span className="md:hidden">AI</span>
                </div>

                {/* ★ 金融實時翻頁區 (點擊打開匯率計算機) */}
                <div 
                    onClick={() => setIsConverterOpen(true)}
                    className="flex-none bg-slate-800 text-white h-full relative overflow-hidden flex items-center justify-center min-w-[130px] md:min-w-[160px] border-r border-slate-700 z-10 shadow-inner cursor-pointer hover:bg-slate-700 transition-colors group"
                    title="點擊開啟實時匯率換算"
                >
                    {financialStats.map((stat, idx) => {
                        let finalColor = stat.color;
                        const valStr = String(stat.value);
                        if (valStr.includes('+') || valStr.includes('▲')) finalColor = 'text-green-400';
                        else if (valStr.includes('-') || valStr.includes('▼')) finalColor = 'text-red-400';

                        return (
                            <div 
                                key={idx} 
                                className={`absolute inset-0 flex items-center justify-center px-1.5 md:px-2 transition-all duration-500 ease-in-out ${
                                    finIndex === idx ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                                }`}
                            >
                                <span className="text-[9px] md:text-[10px] text-slate-300 mr-1.5 whitespace-nowrap">{stat.label}</span>
                                <span className={`text-[10px] md:text-[11px] font-bold font-mono tracking-tight whitespace-nowrap ${finalColor}`}>{stat.value}</span>
                            </div>
                        );
                    })}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-yellow-400 transition-opacity z-20">
                        <ArrowUpDown size={12} />
                    </div>
                </div>

                {/* 中央：新聞滾動文字 */}
                <div className="flex-1 overflow-hidden relative mask-edges-inline flex items-center h-full">
                    <div className="animate-marquee-inline cursor-default h-full flex items-center">
                        {[...aiNewsFeed, ...aiNewsFeed].map((item, idx) => (
                            <div key={idx} className="flex items-center px-4 shrink-0 hover:bg-black/5 transition-colors h-full">
                                <span className="text-[9px] text-slate-400 font-mono mr-1.5">[{item.time}]</span>
                                <span className="text-[10px] font-bold text-blue-600 mr-1.5">{item.tag}</span>
                                <span className="text-[11px] text-slate-600 tracking-wide">{item.text}</span>
                                <span className="mx-4 text-slate-300">|</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ★ 右側：運輸署私家車銷售情報區 */}
                <div 
                    onClick={() => setIsMarketIntelOpen(true)}
                    className="hidden md:flex flex-none bg-slate-800 text-white h-full px-3 items-center border-l border-slate-700 z-20 shadow-inner cursor-pointer hover:bg-slate-700 transition-colors group"
                    title="點擊展開市場大數據與採購推算"
                >
                    <div className="flex items-center gap-3">
                        <div className="text-[9px] text-slate-400 leading-tight border-r border-slate-600 pr-2 group-hover:text-slate-300 transition-colors">
                            {carSalesStats.month}月全港登記<br/><span className="text-slate-200 font-bold tracking-widest">{carSalesStats.total}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px]">
                            <div className="flex items-center" title="電動車登記數 (Electric)">
                                <span className="text-green-400 font-bold mr-1.5">EV⚡</span>
                                <span className="font-mono text-white font-bold">{carSalesStats.evCount}</span>
                            </div>
                            <div className="flex items-center" title="燃油車登記數 (Petrol/Diesel)">
                                <span className="text-orange-400 font-bold mr-1.5">燃油⛽</span>
                                <span className="font-mono text-white font-bold">{carSalesStats.petrolCount}</span>
                            </div>
                            <BarChart3 size={14} className="ml-1 text-slate-400 group-hover:text-yellow-400 transition-colors" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ★★★ 雙向實時匯率計算機 (Modal) ★★★ */}
            {isConverterOpen && (
                <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsConverterOpen(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-900 p-5 text-white flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[50px] opacity-20 -mr-10 -mt-10 pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-500 rounded-full blur-[50px] opacity-20 -ml-10 -mb-10 pointer-events-none"></div>
                            <h3 className="font-bold flex items-center gap-2 text-lg relative z-10">
                                <RefreshCw size={18} className="text-yellow-400"/> 實時雙向匯率換算
                            </h3>
                            <button onClick={() => setIsConverterOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors relative z-10"><X size={20}/></button>
                        </div>
                        
                        <div className="p-6 space-y-4 bg-slate-50">
                            {/* 常用匯率快捷鍵 */}
                            <div className="flex gap-2 mb-2">
                                <button onClick={() => { setCurrA('CNY'); setCurrB('HKD'); handleAChange({target:{value: valA}}, 'CNY', 'HKD'); }} className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${currA==='CNY'&&currB==='HKD' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>🇨🇳 CNY ⇌ 🇭🇰 HKD</button>
                                <button onClick={() => { setCurrA('JPY'); setCurrB('HKD'); handleAChange({target:{value: valA}}, 'JPY', 'HKD'); }} className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${currA==='JPY'&&currB==='HKD' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>🇯🇵 JPY ⇌ 🇭🇰 HKD</button>
                            </div>

                            {/* Input A */}
                            <div className="relative bg-white rounded-2xl p-2 shadow-sm border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                                <div className="flex items-center">
                                    <select value={currA} onChange={e => { setCurrA(e.target.value); handleAChange({target:{value:valA}}, e.target.value, currB); }} className="bg-transparent px-2 py-2 outline-none font-bold text-slate-700 w-[100px] cursor-pointer border-r border-slate-100">
                                        <option value="CNY">🇨🇳 人民幣</option><option value="HKD">🇭🇰 港幣</option><option value="JPY">🇯🇵 日圓</option><option value="USD">🇺🇸 美元</option><option value="EUR">🇪🇺 歐元</option>
                                    </select>
                                    <input type="number" step="any" value={valA} onChange={e => handleAChange(e, currA, currB)} className="flex-1 px-3 py-2 outline-none font-mono text-2xl font-black text-right text-slate-800 bg-transparent w-full" placeholder="0.00" />
                                </div>
                            </div>

                            <div className="flex justify-center -my-5 relative z-10">
                                <button onClick={swapCurrencies} className="bg-slate-900 p-2 rounded-full shadow-md text-yellow-400 hover:scale-110 active:scale-95 transition-all border-4 border-slate-50"><ArrowUpDown size={14} /></button>
                            </div>

                            {/* Input B */}
                            <div className="relative bg-white rounded-2xl p-2 shadow-sm border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                                <div className="flex items-center">
                                    <select value={currB} onChange={e => { setCurrB(e.target.value); handleBChange({target:{value:valB}}, currA, e.target.value); }} className="bg-transparent px-2 py-2 outline-none font-bold text-slate-700 w-[100px] cursor-pointer border-r border-slate-100">
                                        <option value="HKD">🇭🇰 港幣</option><option value="CNY">🇨🇳 人民幣</option><option value="JPY">🇯🇵 日圓</option><option value="USD">🇺🇸 美元</option><option value="EUR">🇪🇺 歐元</option>
                                    </select>
                                    <input type="number" step="any" value={valB} onChange={e => handleBChange(e, currA, currB)} className="flex-1 px-3 py-2 outline-none font-mono text-2xl font-black text-right text-blue-600 bg-transparent w-full" placeholder="0.00" />
                                </div>
                            </div>

                            <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100/50 mt-2">
                                <div className="text-xs text-center text-slate-600 font-mono font-bold tracking-wide">
                                    {allRates && allRates[currA] && allRates[currB] ? `1 ${currA} = ${(allRates[currB] / allRates[currA]).toFixed(4)} ${currB}` : '正在同步實時匯率...'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ★★★ 市場大數據專屬全螢幕彈窗 (Modal) ★★★ */}
            {isMarketIntelOpen && (
                <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-fade-in" onClick={() => setIsMarketIntelOpen(false)}>
                    <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        
                        {/* 彈窗標題列 */}
                        <div className="bg-slate-900 p-5 text-white flex justify-between items-center flex-none">
                            <h3 className="font-bold flex items-center gap-2 text-lg">
                                <BarChart3 size={20} className="text-yellow-400"/> 
                                市場大數據與採購推算
                            </h3>
                            <button onClick={() => setIsMarketIntelOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                                <X size={24}/>
                            </button>
                        </div>
                        
                        {/* 數據內容區：完美包裹整塊組件 */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100">
                            <MarketIntelligence 
                                dbEntries={dbEntries} 
                                inventory={inventory} 
                                staffId={staffId} 
                                currentUser={currentUser} 
                            />
                        </div>

                    </div>
                </div>
            )}
        </>
    );
};

export default SmartNewsTicker;
