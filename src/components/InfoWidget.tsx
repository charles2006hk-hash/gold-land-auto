// src/components/InfoWidget.tsx
import React, { useState, useEffect } from 'react';

// --- 1. InfoWidget (外部組件) ---
const InfoWidget = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [portStatus, setPortStatus] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // ★ 新增：隧道資料與輪播螢幕狀態
    const [tunnelStatus, setTunnelStatus] = useState<any>(null);
    const [trafficScreen, setTrafficScreen] = useState<'ports' | 'tunnels'>('ports');

    const PORT_MAPPING: Record<string, string> = {
        'SBC': '深圳灣', 'LMC': '皇崗(落馬洲)', 'HZM': '港珠澳大橋',
        'HYW': '蓮塘/香園圍', 'MKT': '文錦渡', 'STK': '沙頭角'
    };

    const getStatusText = (code: number) => {
        if (code === 0) return '正常'; if (code === 1) return '繁忙';
        if (code === 2) return '擠塞'; if (code === 99) return '關閉'; return '-';
    };

    const getStatusColor = (code: number) => {
        if (code === 0) return 'text-green-400'; if (code === 1) return 'text-amber-400';
        if (code === 2) return 'text-red-500 font-bold'; return 'text-slate-600';
    };

    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // ★ 1. 控制畫面：每 10 秒切換一次屏幕
    useEffect(() => {
        const interval = setInterval(() => {
            setTrafficScreen(prev => prev === 'ports' ? 'tunnels' : 'ports');
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    // ★ 2. 抓取資料：每 60 秒在背景雙管齊下更新數據
    useEffect(() => {
        const fetchTraffic = async () => {
            try {
                const res = await fetch(`/api/traffic?t=${Date.now()}`);
                if (!res.ok) throw new Error('API Error');
                const data = await res.json();
                if (data && typeof data === 'object') {
                    const formatted = Object.keys(data).filter(key => PORT_MAPPING[key]).map(key => {
                        const info = data[key];
                        return { name: PORT_MAPPING[key], up: info.depQueue, down: info.arrQueue };
                    });
                    const sortOrder = ['深圳灣', '皇崗(落馬洲)', '港珠澳大橋', '蓮塘/香園圍', '文錦渡', '沙頭角'];
                    formatted.sort((a, b) => sortOrder.indexOf(a.name) - sortOrder.indexOf(b.name));
                    if (formatted.length > 0) setPortStatus(formatted);
                }
            } catch (e) { console.warn("口岸數據延遲"); } 
            finally { setLoading(false); }
        };

        const fetchTunnels = async () => {
            try {
                const res = await fetch(`/api/tunnels?t=${Date.now()}`);
                const result = await res.json();
                if (result.success) setTunnelStatus(result.data);
            } catch (e) { console.warn("隧道數據延遲"); }
        };

        fetchTraffic();
        fetchTunnels();
        
        const trafficTimer = setInterval(() => {
            fetchTraffic();
            fetchTunnels();
        }, 60000);
        return () => clearInterval(trafficTimer);
    }, []);

    // ★★★ 修改：升級版農曆轉換邏輯 (支援生肖與全中文日期) ★★★
    const getLunarDate = () => {
        try {
            const formatter = new Intl.DateTimeFormat('zh-HK', { calendar: 'chinese', dateStyle: 'full' });
            const parts = formatter.formatToParts(currentTime);
            
            let year = '', month = '', day = '';
            parts.forEach(p => {
                if (p.type === 'year') year = p.value;
                if (p.type === 'month') month = p.value;
                if (p.type === 'day') day = p.value;
            });

            // 提取干支 (過濾掉可能的西元年數字與年這字)
            const ganzhi = year.replace(/[0-9]/g, '').replace('年', '');
            
            // 生肖對照表
            const zodiacMap: Record<string, string> = {
                '子':'鼠', '丑':'牛', '寅':'虎', '卯':'兔', '辰':'龍', '巳':'蛇',
                '午':'馬', '未':'羊', '申':'猴', '酉':'雞', '戌':'狗', '亥':'豬'
            };
            
            let zodiac = '';
            if (ganzhi.length >= 2) {
                zodiac = zodiacMap[ganzhi.charAt(1)] || '';
            }

            // 如果日期回傳的是阿拉伯數字 (例如 14)，轉為農曆中文習慣 (十四)
            if (/^\d+$/.test(day)) {
                const num = parseInt(day, 10);
                const chars = ['十', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
                if (num <= 10) day = '初' + (num === 10 ? '十' : chars[num]);
                else if (num < 20) day = '十' + (num === 10 ? '' : chars[num % 10]);
                else if (num === 20) day = '二十';
                else if (num < 30) day = '廿' + chars[num % 10];
                else if (num === 30) day = '三十';
            }

            // 確保尾部有「日」字 (例如: 正月十四日)
            if (!day.includes('日')) day += '日';

            if (ganzhi && zodiac) {
                return `${ganzhi}年(${zodiac}年) ${month}${day}`;
            }
            return `${month}${day}`;
        } catch (e) {
            return '';
        }
    };

    return (
        // 🍏 登入頁同款：深色透底的玻璃輸入框質感 (Deep Dark Glass Cutout)
        <div className="mx-3 mb-3 p-3 bg-black/30 rounded-2xl border border-white/5 text-xs backdrop-blur-md shadow-inner transition-all hover:bg-black/40 relative z-10 overflow-hidden pb-5">
            {/* 時間日期區 (固定在頂部不輪播) */}
            <div className="mb-3 border-b border-white/5 pb-2 relative z-10">
                <div className="text-xl font-mono font-bold text-white tracking-widest text-center">{currentTime.toLocaleTimeString('en-GB', { hour12: false })}</div>
                <div className="flex justify-between mt-1 text-slate-300">
                    <span>{currentTime.toLocaleDateString('zh-HK')}</span>
                    <span>{['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][currentTime.getDay()]}</span>
                </div>
                <div className="text-center mt-1 text-yellow-500 font-medium">
                    {getLunarDate()}
                </div>
            </div>
            
            {/* ★ 戰情雙屏幕輪播區 (鎖定高度，防止畫面跳動) */}
            <div className="relative min-h-[175px]">
                {trafficScreen === 'ports' ? (
                    <div className="absolute inset-0 space-y-1.5 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex justify-between text-slate-400 text-[10px] mb-1 px-1"><span>口岸通關</span><div className="flex gap-3"><span>北上</span><span>南下</span></div></div>
                        {portStatus.length > 0 ? portStatus.map((port, idx) => (
                            <div key={`port_${idx}`} className="flex justify-between items-center text-slate-200 border-b border-white/5 pb-1 last:border-0 last:pb-0 px-1 hover:bg-white/5 rounded transition-colors">
                                <span className="truncate mr-2 font-medium text-white">{port.name}</span>
                                <div className="flex gap-3 text-right font-bold whitespace-nowrap min-w-[60px] justify-end">
                                    <span className={getStatusColor(port.up)}>{getStatusText(port.up)}</span>
                                    <span className={getStatusColor(port.down)}>{getStatusText(port.down)}</span>
                                </div>
                            </div>
                        )) : (<div className="text-center text-slate-400 italic py-6">{loading ? '口岸數據更新中...' : '暫無口岸數據'}</div>)}
                        <div className="text-[9px] text-right text-slate-500 mt-2 italic pr-1">入境處實時數據</div>
                    </div>
                ) : (
                    <div className="absolute inset-0 space-y-1.5 animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="flex justify-between text-slate-400 text-[10px] mb-1 px-1"><span>隧道預計 (分鐘)</span><div className="flex gap-2"><span>往港/九</span><span>往九/新</span></div></div>
                        {tunnelStatus ? (
                            <>
                                {tunnelStatus.crossHarbour.map((t: any, idx: number) => (
                                    <div key={`ch_${idx}`} className="flex justify-between items-center text-slate-200 border-b border-white/5 pb-1 px-1 hover:bg-white/5 rounded transition-colors">
                                        <span className="truncate mr-2 font-medium text-white">{t.short}</span>
                                        <div className="flex gap-3 text-right font-bold whitespace-nowrap min-w-[60px] justify-end font-mono">
                                            <span className={`w-6 text-center ${t.toHK === '--' ? 'text-slate-500' : t.toHK > 15 ? 'text-red-400 bg-red-400/10 rounded' : 'text-emerald-400'}`}>{t.toHK}</span>
                                            <span className={`w-6 text-center ${t.toKln === '--' ? 'text-slate-500' : t.toKln > 15 ? 'text-red-400 bg-red-400/10 rounded' : 'text-emerald-400'}`}>{t.toKln}</span>
                                        </div>
                                    </div>
                                ))}
                                {tunnelStatus.newTerritories.map((t: any, idx: number) => (
                                    <div key={`nt_${idx}`} className="flex justify-between items-center text-slate-200 border-b border-white/5 pb-1 last:border-0 last:pb-0 px-1 hover:bg-white/5 rounded transition-colors">
                                        <span className="truncate mr-2 font-medium text-white">{t.short}</span>
                                        <div className="flex gap-3 text-right font-bold whitespace-nowrap min-w-[60px] justify-end font-mono">
                                            <span className={`w-6 text-center ${t.toKln === '--' ? 'text-slate-500' : t.toKln > 15 ? 'text-red-400 bg-red-400/10 rounded' : 'text-emerald-400'}`}>{t.toKln}</span>
                                            <span className={`w-6 text-center ${t.toNT === '--' ? 'text-slate-500' : t.toNT > 15 ? 'text-red-400 bg-red-400/10 rounded' : 'text-emerald-400'}`}>{t.toNT}</span>
                                        </div>
                                    </div>
                                ))}
                                <div className="text-[9px] text-right text-slate-500 mt-2 italic pr-1">運輸署實時數據</div>
                            </>
                        ) : (<div className="text-center text-slate-400 italic py-6">隧道路況載入中...</div>)}
                    </div>
                )}
            </div>

            {/* 底部小圓點進度指示器 */}
            <div className="absolute bottom-1.5 left-0 w-full flex justify-center gap-1.5 z-20">
                <div className={`h-1 rounded-full transition-all duration-500 ${trafficScreen === 'ports' ? 'w-4 bg-blue-500' : 'w-1.5 bg-white/20'}`}></div>
                <div className={`h-1 rounded-full transition-all duration-500 ${trafficScreen === 'tunnels' ? 'w-4 bg-amber-500' : 'w-1.5 bg-white/20'}`}></div>
            </div>
        </div>
    );
};

export default InfoWidget;
