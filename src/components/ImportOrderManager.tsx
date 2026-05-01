'use client';

import React, { useState, useEffect } from 'react';
import { 
  List, Save, Ship, Car, 
  DollarSign, Trash2, ShieldCheck, Globe,
  Plane, CheckCircle
} from 'lucide-react';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";

// --- 專業級預設費用數據 ---
const REGION_CONFIGS: any = {
  JP: { 
    id: 'JP', name: '日本', currency: 'JPY', symbol: '¥', 
    origin: { auction: '20,000', shipping: '100,000', insurance: '0' },
    hk_misc: { terminal: '500', emission: '5,500', glass: '2,000', booking: '1,000', fuel: '500', process: '2,000', misc: '1,000' },
    hk_license: { fee: '5,794', insurance: '2,000' }
  },
  UK: { 
    id: 'UK', name: '英國', currency: 'GBP', symbol: '£', 
    origin: { shipping: '1,500', inspection: '300', insurance: '0', other: '200' },
    hk_misc: { terminal: '500', emission: '6,500', glass: '2,500', booking: '1,000', fuel: '500', process: '2,500', misc: '1,000' },
    hk_license: { fee: '5,794', insurance: '2,500' }
  },
  OT: { 
    id: 'OT', name: '其他', currency: 'USD', symbol: '$', 
    origin: { shipping: '2,000', inspection: '500', insurance: '0', other: '500' },
    hk_misc: { terminal: '500', emission: '6,500', glass: '2,500', booking: '1,000', fuel: '500', process: '2,500', misc: '1,000' },
    hk_license: { fee: '5,794', insurance: '2,500' }
  }
};

// ==========================================
// 外部純函數 (避免組件重新渲染)
// ==========================================
const calcFRT = (prp: number) => {
    let v = prp; let t = 0;
    if (v > 0) { let tx = Math.min(v, 150000); t += tx * 0.46; v -= tx; }
    if (v > 0) { let tx = Math.min(v, 150000); t += tx * 0.86; v -= tx; }
    if (v > 0) { let tx = Math.min(v, 200000); t += tx * 1.15; v -= tx; }
    if (v > 0) { t += v * 1.32; }
    return Math.round(t);
};

const calcLicenseFee = (cc: number) => {
    if (!cc) return 0;
    if (cc <= 1500) return 5074;
    if (cc <= 2500) return 7498;
    if (cc <= 3500) return 9929;
    if (cc <= 4500) return 12360;
    return 14694;
};

const estimateInsurance = (carValueHKD: number, cc: number, type: '3rd' | 'comp', ncd: number) => {
    let base = type === '3rd' ? (cc > 2500 ? 4500 : 3000) : Math.max(5000, carValueHKD * (cc > 2500 ? 0.025 : 0.02));
    return Math.round((base * (1 - (ncd / 100))) / 100) * 100;
};

const fmt = (n: number) => new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', maximumFractionDigits: 0 }).format(n || 0);
const formatNum = (val: string) => val.replace(/[^0-9.]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const parseNum = (val: string) => Number(String(val).replace(/,/g, '')) || 0;
const getFeeTotal = (feeObj: any) => { if (!feeObj) return 0; return Object.values(feeObj).reduce((sum: number, val: any) => sum + parseNum(String(val)), 0); };

const convertJpYear = (era: string, num: string) => {
    const y = parseInt(num) || 0; if (y <= 0) return '';
    return era === 'Reiwa' ? `(${y + 2018}年)` : (era === 'Heisei' ? `(${y + 1988}年)` : '');
};

// 物流進度條組件
const TransportProgressBar = ({ departureDate, durationDays, type }: any) => {
    if (!departureDate || !durationDays) return null;
    const start = new Date(departureDate).getTime();
    const days = parseFloat(durationDays) || 0;
    const end = start + (days * 24 * 60 * 60 * 1000);
    const now = Date.now();
    let percentage = 0;
    if (now > start) percentage = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    const Icon = type === 'AIR' ? Plane : Ship;
    const isArrived = percentage >= 100;
    const arrivalDate = new Date(end).toLocaleDateString('zh-HK');
    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

    return (
        <div className="w-full mt-3 mb-1">
            <div className="flex justify-between items-end mb-1 text-[10px] font-bold text-slate-500">
                <span>{departureDate}</span>
                <span className={isArrived ? 'text-green-600' : 'text-blue-600'}>{isArrived ? '已抵達' : `預計: ${arrivalDate} (${daysLeft > 0 ? `還有 ${daysLeft} 天` : '即將抵達'})`}</span>
            </div>
            <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-visible">
                <div className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ${isArrived ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${percentage}%` }}></div>
                <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 z-10" style={{ left: `${percentage}%`, transform: `translate(-50%, -50%)` }}>
                    <div className={`p-1 rounded-full shadow-md border-2 border-white ${isArrived ? 'bg-green-500' : 'bg-blue-600'}`}><Icon className="w-3 h-3 text-white" /></div>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 主系統組件
// ==========================================
export default function ImportOrderManager({ db, staffId, appId, settings, updateSettings }: any) {
    const [view, setView] = useState<'calc' | 'history'>('calc');
    const [history, setHistory] = useState<any[]>([]);

    // 1. 車輛基礎與 A1/PRP
    const [region, setRegion] = useState('JP');
    const [carPrice, setCarPrice] = useState('');
    const [prpPrice, setPrpPrice] = useState('');
    
    // ★ 車輛資料
    const [carInfo, setCarInfo] = useState({ 
        make: '', model: '', year: '', code: '', 
        exteriorColor: '', interiorColor: '', 
        transmission: 'AT', cc: '', seats: '', mileage: '', chassis: '' 
    });

    // ★ 運輸資訊
    const [transport, setTransport] = useState({ type: 'SEA', departureDate: '', duration: '' });

    // 日本年號
    const [jpEra, setJpEra] = useState('Reiwa');
    const [jpEraYear, setJpEraYear] = useState('');

    // 2. 雜費與保險
    const [originFees, setOriginFees] = useState<any>(REGION_CONFIGS['JP'].origin);
    const [hkMiscFees, setHkMiscFees] = useState<any>(REGION_CONFIGS['JP'].hk_misc);
    const [hkLicenseFees, setHkLicenseFees] = useState<any>(REGION_CONFIGS['JP'].hk_license);
    const [margin, setMargin] = useState('30000');
    
    // 智能保險
    const [insType, setInsType] = useState<'3rd'|'comp'>('comp');
    const [insNCD, setInsNCD] = useState(0);
    const [customIns, setCustomIns] = useState('');

    // --- 聯動 Effect ---
    useEffect(() => {
        setOriginFees(REGION_CONFIGS[region].origin);
        setHkMiscFees(REGION_CONFIGS[region].hk_misc);
        setHkLicenseFees(REGION_CONFIGS[region].hk_license);
    }, [region]);

    useEffect(() => {
        if (jpEraYear) {
            const y = parseInt(jpEraYear);
            if (y > 0) setCarInfo(prev => ({ ...prev, year: (jpEra === 'Reiwa' ? y + 2018 : y + 1988).toString() }));
        }
    }, [jpEra, jpEraYear]);

    useEffect(() => {
        const cc = parseNum(carInfo.cc);
        if (cc > 0) setHkLicenseFees((prev: any) => ({ ...prev, fee: calcLicenseFee(cc).toString() }));
    }, [carInfo.cc]);

    // --- 核心計算 ---
    const regData = REGION_CONFIGS[region] || REGION_CONFIGS['JP'];
    const currentRate = settings?.rates?.[region] || (region === 'JP' ? 0.053 : region === 'UK' ? 10.2 : 7.8);
    
    const carPriceHKD = Math.round(parseNum(carPrice) * currentRate);
    const frtTax = calcFRT(parseNum(prpPrice));
    
    const totalOriginHKD = getFeeTotal(originFees) * currentRate;
    const totalHkMisc = getFeeTotal(hkMiscFees);
    
    const estIns = estimateInsurance(carPriceHKD + frtTax, parseNum(carInfo.cc), insType, insNCD);
    const finalIns = customIns ? parseNum(customIns) : estIns;
    
    // 牌費小計 (減去可能存在的手動 insurance 欄位，改用智能保險)
    const pureLicenseFee = parseNum(hkLicenseFees.fee || '0');
    const totalHkLicense = pureLicenseFee + frtTax + finalIns; 
    
    const landedCost = carPriceHKD + totalOriginHKD + totalHkMisc + frtTax;
    const totalCost = landedCost + pureLicenseFee + finalIns;
    const finalPrice = totalCost + parseNum(margin);

    // 載入歷史紀錄
    useEffect(() => {
        if (!db || !appId) return;
        const q = query(collection(db, `artifacts/${appId}/staff/CHARLES_data/import_orders`));
        return onSnapshot(q, (snap) => {
            setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a:any, b:any) => b.ts - a.ts));
        });
    }, [db, appId]);

    const handleSave = async () => {
        if (!carPrice || !prpPrice) return alert("請填寫基本車價與 PRP");
        
        if (carInfo.make && !(settings?.makes || []).includes(carInfo.make)) updateSettings('makes', [...(settings?.makes || []), carInfo.make]);
        if (carInfo.exteriorColor && !(settings?.colors || []).includes(carInfo.exteriorColor)) updateSettings('colors', [...(settings?.colors || []), carInfo.exteriorColor]);

        const record = {
            ts: Date.now(), date: new Date().toLocaleDateString('zh-HK'),
            region, 
            details: {
                manufacturer: carInfo.make, model: carInfo.model, year: carInfo.year, code: carInfo.code,
                chassisNo: carInfo.chassis, engineCapacity: carInfo.cc, seats: carInfo.seats, 
                transmission: carInfo.transmission, exteriorColor: carInfo.exteriorColor, interiorColor: carInfo.interiorColor,
                mileage: carInfo.mileage,
                transportType: transport.type, departureDate: transport.departureDate, shippingDuration: transport.duration
            }, 
            vals: { carPrice: parseNum(carPrice), prp: parseNum(prpPrice), rate: currentRate },
            fees: { origin: originFees, hk_misc: hkMiscFees, hk_license: hkLicenseFees, finalInsurance: finalIns },
            results: { carPriceHKD, totalOriginHKD, totalHkMisc, totalHkLicense, landedCost, totalCost, finalPrice },
            quote: { margin: parseNum(margin), finalPrice },
            status: 'QUOTING', createdBy: staffId
        };

        try {
            await addDoc(collection(db, `artifacts/${appId}/staff/CHARLES_data/import_orders`), { ...record, timestamp: serverTimestamp() });
            alert("✅ 完整訂購紀錄已存檔！");
            setView('history');
        } catch (e) { alert("儲存失敗"); }
    };

    // --- UI 渲染 ---
    return (
        <div className="bg-slate-100 min-h-full rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
            
            {/* 頂部導航 */}
            <div className="bg-slate-900 text-white p-3 flex justify-between items-center z-30 sticky top-0 flex-none safe-area-top">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg"><Ship size={18}/></div>
                    <span className="font-black text-sm md:text-lg tracking-tighter">海外訂車管家</span>
                </div>
                <div className="flex bg-slate-800 rounded-xl p-1">
                    <button onClick={() => setView('calc')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view==='calc' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>算帳</button>
                    <button onClick={() => setView('history')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view==='history' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>紀錄 ({history.length})</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto w-full relative pb-32">
                {view === 'history' ? (
                    <div className="p-4 space-y-4 max-w-5xl mx-auto animate-fade-in">
                        {history.map(item => (
                            <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-400 transition-all group border-l-8 border-l-blue-500">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="w-full">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="bg-blue-100 text-blue-900 text-[10px] font-black px-2 py-0.5 rounded uppercase">{item.region}</span>
                                            <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-slate-200">{item.status}</span>
                                            <span className="text-[10px] text-slate-400 font-bold">{item.date}</span>
                                        </div>
                                        <div className="font-black text-slate-900 text-lg tracking-tight">
                                            {item.details.manufacturer} {item.details.model} <span className="text-slate-500">{item.details.year}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 font-mono mt-0.5">{item.details.chassisNo || '無車身號碼'}</div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-2xl font-black text-blue-700">{fmt(item.results.finalPrice)}</div>
                                        <div className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 rounded inline-block">利潤: {fmt(item.quote.margin)}</div>
                                    </div>
                                </div>
                                {item.details.departureDate && item.details.shippingDuration && (
                                    <div className="mt-2 border-t border-slate-100 pt-2"><TransportProgressBar departureDate={item.details.departureDate} durationDays={item.details.shippingDuration} type={item.details.transportType} /></div>
                                )}
                            </div>
                        ))}
                        {history.length === 0 && <div className="text-center py-20 text-slate-400 font-bold border-2 border-dashed border-slate-300 rounded-2xl mx-4">暫無訂單紀錄</div>}
                    </div>
                ) : (
                    /* ================= 計算器主視圖 (網格排版) ================= */
                    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
                        
                        {/* 來源切換 */}
                        <div className="flex bg-slate-200/60 p-1 rounded-xl gap-1 w-full max-w-md mx-auto mb-6">
                            {Object.values(REGION_CONFIGS).map((c:any) => (
                                <button key={c.id} onClick={()=>setRegion(c.id)} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${region===c.id?'bg-white text-blue-700 shadow-sm':'text-slate-500'}`}>{c.name}</button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            
                            {/* 左側：車輛與運輸 */}
                            <div className="lg:col-span-7 space-y-6">
                                
                                {/* 核心價格區塊 */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2 mb-4">
                                        <DollarSign className="w-5 h-5 text-blue-600" />
                                        <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">核心價格</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">當地車價 ({regData.currency})</span>
                                            <div className="relative">
                                                <span className="absolute left-0 top-1 text-slate-400 font-bold text-sm">{regData.symbol}</span>
                                                <input value={carPrice} onChange={e=>setCarPrice(formatNum(e.target.value))} placeholder="0" className="w-full border-b-2 border-slate-200 py-1 pl-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 bg-transparent transition-colors" />
                                            </div>
                                            <div className="text-[10px] text-blue-600 font-bold mt-1 text-right">折合 {fmt(carPriceHKD)}</div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">海關 A1 零售價 (HKD)</span>
                                            <div className="relative">
                                                <span className="absolute left-0 top-1 text-slate-400 font-bold text-sm">$</span>
                                                <input value={prpPrice} onChange={e=>setPrpPrice(formatNum(e.target.value))} placeholder="查閱海關填入" className="w-full border-b-2 border-slate-200 py-1 pl-4 text-sm font-bold text-red-600 outline-none focus:border-red-500 bg-transparent transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 車輛資料區塊 (完美還原截圖樣式) */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2 mb-4">
                                        <Car className="w-5 h-5 text-slate-700" />
                                        <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">車輛資料</h3>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">品牌</span>
                                                <input list="makes_list" value={carInfo.make} onChange={e=>setCarInfo({...carInfo, make:e.target.value})} className="w-full border-b-2 border-slate-200 py-1 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 bg-transparent" />
                                                <datalist id="makes_list">{settings?.makes?.map((m:any) => <option key={m} value={m}/>)}</datalist>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">型號</span>
                                                <input list="models_list" value={carInfo.model} onChange={e=>setCarInfo({...carInfo, model:e.target.value})} className="w-full border-b-2 border-slate-200 py-1 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 bg-transparent" />
                                                <datalist id="models_list">{(settings?.models?.[carInfo.make] || []).map((m:any) => <option key={m} value={m}/>)}</datalist>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                            <div className="flex flex-col relative">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">年份 {region==='JP'&&<span className="text-blue-500 float-right">{convertJpYear(jpEra, jpEraYear)}</span>}</span>
                                                <input type="number" value={carInfo.year} onChange={e=>setCarInfo({...carInfo, year:e.target.value})} className="w-full border-b-2 border-slate-200 py-1 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 bg-transparent" />
                                                {region === 'JP' && (
                                                    <div className="absolute top-12 left-0 w-full flex gap-1 bg-slate-50 p-1 rounded border">
                                                        <select value={jpEra} onChange={e=>setJpEra(e.target.value)} className="text-[10px] bg-transparent outline-none font-bold text-slate-600"><option value="Reiwa">令和</option><option value="Heisei">平成</option></select>
                                                        <input type="number" value={jpEraYear} onChange={e=>setJpEraYear(e.target.value)} className="w-full text-[10px] bg-transparent outline-none text-center" placeholder="年" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">代號</span>
                                                <input value={carInfo.code} onChange={e=>setCarInfo({...carInfo, code:e.target.value})} className="w-full border-b-2 border-slate-200 py-1 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 bg-transparent" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">外觀顏色</span>
                                                <input list="colors_list" value={carInfo.exteriorColor} onChange={e=>setCarInfo({...carInfo, exteriorColor:e.target.value})} className="w-full border-b-2 border-slate-200 py-1 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 bg-transparent" placeholder="e.g. White"/>
                                                <datalist id="colors_list">{settings?.colors?.map((c:any) => <option key={c} value={c}/>)}</datalist>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">內飾顏色</span>
                                                <input list="colors_list" value={carInfo.interiorColor} onChange={e=>setCarInfo({...carInfo, interiorColor:e.target.value})} className="w-full border-b-2 border-slate-200 py-1 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 bg-transparent" placeholder="e.g. Black"/>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">波箱 (Transmission)</span>
                                                <select value={carInfo.transmission} onChange={e=>setCarInfo({...carInfo, transmission:e.target.value})} className="w-full border-b-2 border-slate-200 py-1 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 bg-transparent cursor-pointer">
                                                    <option value="AT">AT (自動)</option><option value="MT">MT (手動)</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">排氣量 (cc)</span>
                                                <input type="number" value={carInfo.cc} onChange={e=>setCarInfo({...carInfo, cc:e.target.value})} className="w-full border-b-2 border-slate-200 py-1 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 bg-transparent" placeholder="2494"/>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">座位數</span>
                                                <input type="number" value={carInfo.seats} onChange={e=>setCarInfo({...carInfo, seats:e.target.value})} className="w-full border-b-2 border-slate-200 py-1 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 bg-transparent" placeholder="7"/>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">車輛咪數 (km)</span>
                                                <input type="text" inputMode="decimal" value={formatNum(carInfo.mileage)} onChange={e=>setCarInfo({...carInfo, mileage:formatNum(e.target.value)})} className="w-full border-b-2 border-slate-200 py-1 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 bg-transparent" placeholder="15,000"/>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">車身號碼 (Chassis No)</span>
                                                <input value={carInfo.chassis} onChange={e=>setCarInfo({...carInfo, chassis:e.target.value.toUpperCase()})} className="w-full border-b-2 border-slate-200 py-1 text-sm font-bold font-mono text-slate-800 outline-none focus:border-blue-500 bg-transparent uppercase tracking-widest" placeholder="e.g. NHP10-1234567"/>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 運輸資訊 */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2 mb-4">
                                        <Plane className="w-5 h-5 text-slate-700" />
                                        <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">運輸資訊</h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">運輸方式</span>
                                            <select value={transport.type} onChange={e=>setTransport({...transport, type: e.target.value})} className="w-full border-b-2 border-slate-200 py-1 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 bg-transparent cursor-pointer">
                                                <option value="SEA">船運 (Sea)</option><option value="AIR">空運 (Air)</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">出發日期</span>
                                            <input type="date" value={transport.departureDate} onChange={e=>setTransport({...transport, departureDate: e.target.value})} className="w-full border-b-2 border-slate-200 py-1 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 bg-transparent cursor-pointer" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">預計需時 (天)</span>
                                            <input type="number" value={transport.duration} onChange={e=>setTransport({...transport, duration: e.target.value})} className="w-full border-b-2 border-slate-200 py-1 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 bg-transparent" placeholder="e.g. 14"/>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 右側：智能費用精算 */}
                            <div className="lg:col-span-5 space-y-6">
                                
                                {/* 智能保險與出牌 (還原截圖樣式) */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2 mb-4">
                                        <ShieldCheck className="w-5 h-5 text-indigo-500" />
                                        <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">出牌與智能保險</h3>
                                    </div>
                                    
                                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mb-6">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex bg-white rounded p-0.5 border border-indigo-200 shadow-sm">
                                                <button onClick={()=>setInsType('3rd')} className={`px-4 py-1.5 text-xs font-bold rounded ${insType==='3rd'?'bg-indigo-600 text-white':'text-indigo-400'}`}>三保</button>
                                                <button onClick={()=>setInsType('comp')} className={`px-4 py-1.5 text-xs font-bold rounded ${insType==='comp'?'bg-indigo-600 text-white':'text-indigo-400'}`}>全保</button>
                                            </div>
                                            <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-3 py-1.5 rounded-lg">NCD: {insNCD}%</span>
                                        </div>
                                        <input type="range" min="0" max="60" step="10" value={insNCD} onChange={e=>setInsNCD(Number(e.target.value))} className="w-full accent-indigo-600 mb-4"/>
                                        <div className="flex justify-between items-center pt-3 border-t border-indigo-100">
                                            <span className="text-sm font-bold text-indigo-700">AI 預估保費</span>
                                            <span className="text-2xl font-black font-mono text-indigo-700">HK{fmt(estIns)}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">牌費</span>
                                            <input value={formatNum(hkLicenseFees.fee)} onChange={e=>setHkLicenseFees({...hkLicenseFees, fee: formatNum(e.target.value)})} className="w-full border-b-2 border-slate-200 py-1 text-sm font-bold font-mono text-slate-800 outline-none focus:border-blue-500 bg-transparent" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">實際保費</span>
                                            <input value={formatNum(hkLicenseFees.insurance || estIns.toString())} onChange={e=>setHkLicenseFees({...hkLicenseFees, insurance: formatNum(e.target.value)})} className="w-full border-b-2 border-slate-200 py-1 text-sm font-bold font-mono text-slate-800 outline-none focus:border-blue-500 bg-transparent" />
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-sm font-bold text-red-600 bg-red-50 p-3 rounded-lg">
                                        <span>首次登記稅 (FRT)</span>
                                        <span className="font-mono">HK{fmt(frtTax)}</span>
                                    </div>
                                </div>

                                {/* 其他雜費 (還原截圖樣式) */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2 mb-4">
                                        <Globe className="w-5 h-5 text-emerald-500" />
                                        <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">其他雜費</h3>
                                    </div>
                                    
                                    <div className="mb-6">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 block">當地雜費 ({regData.currency})</span>
                                        <div className="grid grid-cols-2 gap-6">
                                            {Object.entries(originFees).map(([k, v]:any) => (
                                                <div key={k} className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{k}</span>
                                                    <input value={formatNum(v)} onChange={e=>setOriginFees({...originFees, [k]: formatNum(e.target.value)})} className="w-full border-b-2 border-slate-200 py-1 text-sm font-bold font-mono text-slate-800 outline-none focus:border-blue-500 bg-transparent" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 block">香港雜費 (HKD)</span>
                                        <div className="grid grid-cols-2 gap-6">
                                            {Object.entries(hkMiscFees).map(([k, v]:any) => (
                                                <div key={k} className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{k}</span>
                                                    <input value={formatNum(v)} onChange={e=>setHkMiscFees({...hkMiscFees, [k]: formatNum(e.target.value)})} className="w-full border-b-2 border-slate-200 py-1 text-sm font-bold font-mono text-slate-800 outline-none focus:border-blue-500 bg-transparent" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 🖥️ 桌面/手機 共用吸底總結與儲存列 */}
            {view === 'calc' && (
                <div className="fixed md:absolute bottom-0 left-0 w-full bg-slate-900 text-white p-4 md:p-5 flex flex-col md:flex-row justify-between items-center z-50 rounded-t-3xl md:rounded-none shadow-[0_-10px_30px_rgba(0,0,0,0.3)] safe-area-bottom">
                    <div className="flex gap-6 items-center w-full md:w-auto mb-4 md:mb-0 justify-between md:justify-start">
                        <div>
                            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 md:mb-1.5">車輛到港成本</p>
                            <p className="text-xl md:text-2xl font-black font-mono text-slate-200 leading-none">{fmt(landedCost)}</p>
                        </div>
                        <div className="h-8 w-px bg-slate-700 hidden md:block"></div>
                        <div>
                            <p className="text-[10px] md:text-xs font-bold text-blue-300 uppercase tracking-widest leading-none mb-1 md:mb-1.5">預計總成本 (Total)</p>
                            <p className="text-2xl md:text-3xl font-black font-mono text-blue-400 leading-none">{fmt(totalCost)}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Margin</span>
                            <div className="relative w-20">
                                <span className="absolute left-1 top-0.5 text-emerald-400 text-xs font-bold">$</span>
                                <input value={margin} onChange={e=>setMargin(formatNum(e.target.value))} className="w-full bg-transparent text-right text-sm font-black text-emerald-400 outline-none font-mono" />
                            </div>
                        </div>
                        
                        <div className="flex flex-col text-right">
                            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mb-0.5">Final Quote</span>
                            <span className="text-xl md:text-2xl font-black font-mono text-emerald-400 leading-none">{fmt(finalPrice)}</span>
                        </div>

                        <button onClick={handleSave} className="bg-green-600 text-white px-6 py-3 rounded-xl font-black text-sm active:scale-95 transition-transform flex items-center gap-2 shadow-lg ml-2">
                            <Save size={18}/> <span className="hidden md:inline">儲存報價</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
