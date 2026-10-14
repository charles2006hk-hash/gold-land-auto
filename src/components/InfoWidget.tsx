// src/components/InfoWidget.tsx
import React, { useState, useEffect } from 'react';

const InfoWidget = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [portStatus, setPortStatus] = useState<any[]>([]);
    
    // ★ 新增：獨立控制旅客數據的載入狀態
    const [passengerStatus, setPassengerStatus] = useState<any[]>([]);
    const [passengerLoading, setPassengerLoading] = useState(true);
    const [loading, setLoading] = useState(true);

    const [tunnelStatus, setTunnelStatus] = useState<any>(null);
    const [trafficScreen, setTrafficScreen] = useState<'ports-car' | 'ports-passenger' | 'tunnels-ch' | 'tunnels-nt'>('ports-car');

    const CAR_PORT_MAPPING: Record<string, string> = {
        'SBC': '深圳灣', 
        'LMC': '皇崗', 
        'LMCC': '皇崗', 
        'HGP': '皇崗', 
        'HZM': '港珠澳大橋',
        'HYW': '香園圍 (蓮塘)', 
        'MKT': '文錦渡', 
        'STK': '沙頭角'
    };

    const PASSENGER_PORT_MAPPING: Record<string, string> = {
        'LWS': '羅湖',
        'LSC': '落馬洲支線',
        'SBC': '深圳灣',
        'HZM': '港珠澳大橋',
        'HYW': '香園圍 (蓮塘)',
        'MKT': '文錦渡',
        'HGP': '皇崗', 
        'STK': '沙頭角'
    };

    const PORT_HOURS: Record<string, string> = {
        '羅湖': '06:30 - 24:00',
        '落馬洲支線': '06:30 - 22:30',
        '深圳灣': '06:30 - 24:00',
        '港珠澳大橋': '24小時',
        '香園圍 (蓮塘)': '07:00 - 22:00',
        '文錦渡': '07:00 - 22:00',
        '皇崗': '24小時',
        '沙頭角': '07:00 - 22:00'
    };

    const getStatusIndicator = (code: number) => {
        if (code === 0) return <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] mx-auto"></div>;
        if (code === 1) return <div className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)] animate-pulse mx-auto"></div>;
        if (code === 2) return <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_6px_rgba(220,38,38,0.8)] animate-pulse mx-auto"></div>;
        return <div className="text-slate-600 font-black text-center">—</div>;
    };

    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setTrafficScreen(prev => {
                if (prev === 'ports-car') return 'ports-passenger';
                if (prev === 'ports-passenger') return 'tunnels-ch';
                if (prev === 'tunnels-ch') return 'tunnels-nt';
                return 'ports-car';
            });
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchCarTraffic = async () => {
            try {
                const res = await fetch(`/api/traffic?t=${Date.now()}`);
                if (!res.ok) throw new Error('API Error');
                const data = await res.json();
                
                if (data && typeof data === 'object') {
                    const uniquePorts = new Map<string, any>();
                    Object.keys(data).forEach(key => {
                        const portName = CAR_PORT_MAPPING[key];
                        if (portName) {
                            uniquePorts.set(portName, { 
                                name: portName, 
                                up: data[key].depQueue,  
                                down: data[key].arrQueue 
                            });
                        }
                    });

                    const formatted = Array.from(uniquePorts.values());
                    const sortOrder = ['深圳灣', '港珠澳大橋', '香園圍 (蓮塘)', '文錦渡', '皇崗', '沙頭角'];
                    formatted.sort((a, b) => {
                        const idxA = sortOrder.indexOf(a.name);
                        const idxB = sortOrder.indexOf(b.name);
                        return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
                    });
                    
                    const finalDisplay = sortOrder.map(portName => {
                        const found = formatted.find(p => p.name === portName);
                        return found || { name: portName, up: 99, down: 99 };
                    });

                    setPortStatus(finalDisplay);
                }
            } catch (e) { console.warn("私家車口岸數據延遲"); } finally { setLoading(false); }
        };

        // ★ 終極企業級修復：雙重保險資料擷取
        const fetchPassengerTraffic = async () => {
            try {
                let res;
                // 優先嘗試使用我們自己建立的 Vercel 內部 API 代理 (無 CORS 限制)
                res = await fetch(`/api/passengers?t=${Date.now()}`);
                
                // 如果本地 API 發生 404 (還沒建立) 或失敗，自動降級使用最穩定的 corsproxy 代理
                if (!res.ok) {
                    const targetUrl = 'https://secure1.info.gov.hk/immd/mobileapps/2bb9ae17/data/CPQueueTimeR.json';
                    res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, { cache: 'no-store' });
                }
                
                if (!res.ok) throw new Error('CORS Proxy & API Failed');
                
                const data = await res.json();

                if (data && typeof data === 'object') {
                    const formatted: any[] = [];
                    Object.keys(data).forEach(key => {
                        const portName = PASSENGER_PORT_MAPPING[key];
                        if (portName) {
                            formatted.push({
                                name: portName,
                                up: data[key].depQueue,   
                                down: data[key].arrQueue  
                            });
                        }
                    });

                    const sortOrder = ['羅湖', '落馬洲支線', '深圳灣', '港珠澳大橋', '香園圍 (蓮塘)', '文錦渡', '皇崗', '沙頭角'];
                    formatted.sort((a, b) => {
                        const idxA = sortOrder.indexOf(a.name);
                        const idxB = sortOrder.indexOf(b.name);
                        return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
                    });

                    setPassengerStatus(formatted);
                }
            } catch (e) {
                console.warn("旅客口岸數據擷取失敗:", e);
            } finally {
                // ★ 防呆：無論成功或失敗，一定要解除載入狀態，否則會永遠卡住
                setPassengerLoading(false);
            }
        };

        const fetchTunnels = async () => {
            try {
                const res = await fetch(`/api/tunnels?t=${Date.now()}`);
                const result = await res.json();
                if (result.success) setTunnelStatus(result.data);
            } catch (e) { console.warn("隧道數據延遲"); }
        };

        fetchCarTraffic(); 
        fetchPassengerTraffic();
        fetchTunnels();
        
        const trafficTimer = setInterval(() => { 
            fetchCarTraffic(); 
            fetchPassengerTraffic();
            fetchTunnels(); 
        }, 60000);
        return () => clearInterval(trafficTimer);
    }, []);

    const getLunarDate = () => {
        try {
            let mdStr = new Intl.DateTimeFormat('zh-HK', { calendar: 'chinese', month: 'long', day: 'numeric' }).format(currentTime);
            if (/\d/.test(mdStr)) {
                const parts = new Intl.DateTimeFormat('en-US', { calendar: 'chinese', month: 'numeric', day: 'numeric' }).formatToParts(currentTime);
                let m = 0, d = 0;
                parts.forEach(p => {
                    if (p.type === 'month') m = parseInt(p.value.match(/\d+/)?.[0] || '1', 10);
                    if (p.type === 'day') d = parseInt(p.value.match(/\d+/)?.[0] || '1', 10);
                });
                const dayNames = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
                const monthNames = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
                mdStr = `${monthNames[m - 1] || m + '月'}${dayNames[d - 1] || d + '日'}`;
            }

            const yearParts = new Intl.DateTimeFormat('en-US', { calendar: 'chinese', year: 'numeric' }).formatToParts(currentTime);
            let y = currentTime.getFullYear();
            yearParts.forEach(p => {
                if (p.type === 'year' || (p.type as string) === 'relatedYear') {
                    const match = p.value.match(/\d+/);
                    if (match) y = parseInt(match[0], 10);
                }
            });
            const stems = ["癸", "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬"];
            const branches = ["亥", "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌"];
            const zodiacs = ["豬", "鼠", "牛", "虎", "兔", "龍", "蛇", "馬", "羊", "猴", "雞", "狗"];

            const stem = stems[(y - 3) % 10];
            const branch = branches[(y - 3) % 12];
            const zodiac = zodiacs[(y - 3) % 12];

            if (!mdStr.includes('日')) mdStr += '日';
            return `${stem}${branch}年 (${zodiac}年) ${mdStr}`;
        } catch (e) { return ''; }
    };

    return (
        <div className="mx-3 mb-3 p-3 bg-black/30 rounded-2xl border border-white/5 text-xs backdrop-blur-md shadow-inner transition-all hover:bg-black/40 relative z-10 overflow-hidden pb-6">
            {/* 時間日期區 */}
            <div className="mb-2 border-b border-white/5 pb-2 relative z-10">
                <div className="text-xl font-mono font-bold text-white tracking-widest text-center">{currentTime.toLocaleTimeString('en-GB', { hour12: false })}</div>
                <div className="flex justify-between mt-1 text-slate-300">
                    <span>{currentTime.toLocaleDateString('zh-HK')}</span>
                    <span>{['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][currentTime.getDay()]}</span>
                </div>
                <div className="text-center mt-0.5 text-yellow-500 font-medium">
                    {getLunarDate()}
                </div>
            </div>
            
            <div className="relative h-[240px]">
                {/* 第一屏：私家車口岸 */}
                {trafficScreen === 'ports-car' && (
                    <div className="absolute inset-0 space-y-1.5 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex justify-between items-center text-slate-400 text-[10px] mb-1 px-1 border-b border-white/10 pb-1">
                            <span>私家車口岸</span>
                            <div className="flex gap-4 pr-1"><span className="w-8 text-center">出境</span><span className="w-8 text-center">入境</span></div>
                        </div>

                        {portStatus.length > 0 ? portStatus.map((port, idx) => (
                            <div key={`port_car_${idx}`} className="flex justify-between items-center text-slate-200 py-0.5 hover:bg-white/5 rounded transition-colors px-1">
                                <div className="flex flex-col min-w-0 pr-2">
                                    <span className="truncate font-medium text-white text-[11px] leading-tight">{port.name}</span>
                                    <span className="text-[8px] text-slate-500 tracking-tighter mt-[1px]">{PORT_HOURS[port.name] || ''}</span>
                                </div>
                                <div className="flex gap-4 text-right pr-2 shrink-0">
                                    <div className="w-8 flex justify-center items-center">{getStatusIndicator(port.up)}</div>
                                    <div className="w-8 flex justify-center items-center">{getStatusIndicator(port.down)}</div>
                                </div>
                            </div>
                        )) : (<div className="text-center text-slate-400 italic py-6">{loading ? '數據連線中...' : '暫無私家車口岸數據'}</div>)}
                    </div>
                )}

                {/* 第二屏：旅客口岸 (香港居民) */}
                {trafficScreen === 'ports-passenger' && (
                    <div className="absolute inset-0 space-y-1.5 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex justify-between items-center text-slate-400 text-[10px] mb-1 px-1 border-b border-white/10 pb-1">
                            <span className="text-teal-400 font-bold">旅客通關 (香港居民)</span>
                            <div className="flex gap-4 pr-1"><span className="w-8 text-center">出境</span><span className="w-8 text-center">入境</span></div>
                        </div>

                        {passengerStatus.length > 0 ? passengerStatus.map((port, idx) => (
                            <div key={`port_pax_${idx}`} className="flex justify-between items-center text-slate-200 py-0.5 hover:bg-white/5 rounded transition-colors px-1">
                                <div className="flex flex-col min-w-0 pr-2">
                                    <span className="truncate font-medium text-white text-[11px] leading-tight">{port.name}</span>
                                    <span className="text-[8px] text-slate-500 tracking-tighter mt-[1px]">{PORT_HOURS[port.name] || ''}</span>
                                </div>
                                <div className="flex gap-4 text-right pr-2 shrink-0">
                                    <div className="w-8 flex justify-center items-center">{getStatusIndicator(port.up)}</div>
                                    <div className="w-8 flex justify-center items-center">{getStatusIndicator(port.down)}</div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-slate-400 italic py-6">
                                {/* ★ 如果沒資料，會依據 loading 狀態顯示不同文字 */}
                                {passengerLoading ? '載入旅客通關數據中...' : '暫無旅客通關數據 (網路阻擋)'}
                            </div>
                        )}
                    </div>
                )}

                {/* 第三屏：過海隧道 */}
                {trafficScreen === 'tunnels-ch' && (
                    <div className="absolute inset-0 space-y-1.5 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex justify-between text-slate-400 text-[10px] mb-1 px-1 border-b border-white/10 pb-1">
                            <span>過海隧道預計 (分鐘)</span>
                            <div className="flex gap-2"><span>往港島</span><span>往九龍</span></div>
                        </div>
                        {tunnelStatus ? (
                            <div className="space-y-2 pt-1">
                                {tunnelStatus.crossHarbour.map((t: any, idx: number) => (
                                    <div key={`ch_${idx}`} className="flex justify-between items-center text-slate-200 py-1 px-1 hover:bg-white/5 rounded transition-colors">
                                        <span className="truncate mr-2 font-bold text-white text-[11px]">{t.short}</span>
                                        <div className="flex gap-3 text-right font-bold whitespace-nowrap min-w-[60px] justify-end font-mono">
                                            <span className={`w-6 text-center ${t.toHK === '--' ? 'text-slate-600' : t.toHK > 15 ? 'text-red-400 bg-red-400/10 rounded' : 'text-emerald-400'}`}>{t.toHK}</span>
                                            <span className={`w-6 text-center ${t.toKln === '--' ? 'text-slate-600' : t.toKln > 15 ? 'text-red-400 bg-red-400/10 rounded' : 'text-emerald-400'}`}>{t.toKln}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (<div className="text-center text-slate-400 italic py-6">路況載入中...</div>)}
                    </div>
                )}

                {/* 第四屏：新界隧道 */}
                {trafficScreen === 'tunnels-nt' && (
                    <div className="absolute inset-0 space-y-1.5 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex justify-between text-slate-400 text-[10px] mb-1 px-1 border-b border-white/10 pb-1">
                            <span>新界隧道預計 (分鐘)</span>
                            <div className="flex gap-2"><span>往九龍</span><span>往新界</span></div>
                        </div>
                        {tunnelStatus ? (
                            <div className="space-y-1.5 pt-0.5">
                                {tunnelStatus.newTerritories.map((t: any, idx: number) => (
                                    <div key={`nt_${idx}`} className="flex justify-between items-center text-slate-200 py-0.5 px-1 hover:bg-white/5 rounded transition-colors">
                                        <span className="truncate mr-2 font-bold text-slate-300 text-[11px]">{t.short}</span>
                                        <div className="flex gap-3 text-right font-bold whitespace-nowrap min-w-[60px] justify-end font-mono">
                                            <span className={`w-6 text-center ${t.toKln === '--' ? 'text-slate-600' : t.toKln > 15 ? 'text-red-400 bg-red-400/10 rounded' : 'text-emerald-400'}`}>{t.toKln}</span>
                                            <span className={`w-6 text-center ${t.toNT === '--' ? 'text-slate-600' : t.toNT > 15 ? 'text-red-400 bg-red-400/10 rounded' : 'text-emerald-400'}`}>{t.toNT}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (<div className="text-center text-slate-400 italic py-6">路況載入中...</div>)}
                    </div>
                )}
            </div>

            {/* 底部小圓點 */}
            <div className="absolute bottom-1.5 left-0 w-full flex justify-center gap-1.5 z-20">
                <div className={`h-1 rounded-full transition-all duration-500 ${trafficScreen === 'ports-car' ? 'w-4 bg-emerald-500' : 'w-1.5 bg-white/20'}`}></div>
                <div className={`h-1 rounded-full transition-all duration-500 ${trafficScreen === 'ports-passenger' ? 'w-4 bg-teal-400' : 'w-1.5 bg-white/20'}`}></div>
                <div className={`h-1 rounded-full transition-all duration-500 ${trafficScreen === 'tunnels-ch' ? 'w-4 bg-amber-500' : 'w-1.5 bg-white/20'}`}></div>
                <div className={`h-1 rounded-full transition-all duration-500 ${trafficScreen === 'tunnels-nt' ? 'w-4 bg-blue-500' : 'w-1.5 bg-white/20'}`}></div>
            </div>
        </div>
    );
};

export default InfoWidget;
