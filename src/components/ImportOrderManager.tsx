'use client';

import React, { useState, useEffect } from 'react';
import { 
  List, Save, Ship, Car, 
  DollarSign, Trash2, ArrowRight, ArrowLeft, 
  ShieldCheck, Globe, CheckCircle,
  Plane
} from 'lucide-react';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";

// --- 專業級預設費用數據 ---
const REGION_CONFIGS: any = {
  JP: { 
    id: 'JP', name: '日本', currency: 'JPY', symbol: '¥', 
    origin: { auction: '20000', shipping: '100000', insurance: '0' },
    hk_misc: { terminal: '500', emission: '5500', glass: '2000', booking: '1000', fuel: '500', process: '2000', misc: '1000' },
    hk_license: { fee: '5794', insurance: '2000' }
  },
  UK: { 
    id: 'UK', name: '英國', currency: 'GBP', symbol: '£', 
    origin: { shipping: '1500', inspection: '300', insurance: '0', other: '200' },
    hk_misc: { terminal: '500', emission: '6500', glass: '2500', booking: '1000', fuel: '500', process: '2500', misc: '1000' },
    hk_license: { fee: '5794', insurance: '2500' }
  },
  OT: { 
    id: 'OT', name: '其他', currency: 'USD', symbol: '$', 
    origin: { shipping: '2000', inspection: '500', insurance: '0', other: '500' },
    hk_misc: { terminal: '500', emission: '6500', glass: '2500', booking: '1000', fuel: '500', process: '2500', misc: '1000' },
    hk_license: { fee: '5794', insurance: '2500' }
  }
};

// ==========================================
// 外部純函數與組件 (避免失焦與重新渲染)
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

// 智能保險估算
const estimateInsurance = (carValueHKD: number, cc: number, type: '3rd' | 'comp', ncd: number) => {
    let base = type === '3rd' ? (cc > 2500 ? 4500 : 3000) : Math.max(5000, carValueHKD * (cc > 2500 ? 0.025 : 0.02));
    return Math.round((base * (1 - (ncd / 100))) / 100) * 100;
};

const fmt = (n: number) => new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', maximumFractionDigits: 0 }).format(n || 0);
const formatNum = (val: string) => val.replace(/[^0-9.]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const parseNum = (val: string) => Number(String(val).replace(/,/g, '')) || 0;
const getFeeTotal = (feeObj: any) => { if (!feeObj) return 0; return Object.values(feeObj).reduce((sum: number, val: any) => sum + parseNum(String(val)), 0); };

// ★★★ 補回漏掉的日本年號轉換函數 ★★★
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
                <div className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ${isArrived ? 'bg-green-500' : (type === 'AIR' ? 'bg-sky-500' : 'bg-blue-600')}`} style={{ width: `${percentage}%` }}></div>
                <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 z-10" style={{ left: `${percentage}%`, transform: `translate(-50%, -50%)` }}>
                    <div className={`p-1 rounded-full shadow-md border-2 border-white ${isArrived ? 'bg-green-500' : (type === 'AIR' ? 'bg-sky-500' : 'bg-blue-600')}`}>
                         <Icon className="w-3 h-3 text-white" />
                    </div>
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
    const [mobileTab, setMobileTab] = useState<'basic' | 'fees' | 'result'>('basic');
    const [history, setHistory] = useState<any[]>([]);

    // 1. 車輛基礎狀態
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
    const [transport, setTransport] = useState({
        type: 'SEA', departureDate: '', duration: ''
    });

    // 日本年號專屬狀態
    const [jpEra, setJpEra] = useState('Reiwa');
    const [jpEraYear, setJpEraYear] = useState('');

    // 2. 雜費與保險
    const [originFees, setOriginFees] = useState<any>(REGION_CONFIGS['JP'].origin);
    const [hkMiscFees, setHkMiscFees] = useState<any>(REGION_CONFIGS['JP'].hk_misc);
    const [hkLicenseFees, setHkLicenseFees] = useState<any>(REGION_CONFIGS['JP'].hk_license);
    const [margin, setMargin] = useState('30000');
    
    // 智能保險狀態
    const [insType, setInsType] = useState<'3rd'|'comp'>('comp');
    const [insNCD, setInsNCD] = useState(0);
    const [customIns, setCustomIns] = useState('');

    // --- 聯動計算 Effect ---
    // 當地區切換時，自動重置雜費
    useEffect(() => {
        setOriginFees(REGION_CONFIGS[region].origin);
        setHkMiscFees(REGION_CONFIGS[region].hk_misc);
        setHkLicenseFees(REGION_CONFIGS[region].hk_license);
    }, [region]);

    // 當輸入日本年號時，自動推算西元年並填入 carInfo
    useEffect(() => {
        if (jpEraYear) {
            const y = parseInt(jpEraYear);
            if (y > 0) {
                const mappedYear = jpEra === 'Reiwa' ? y + 2018 : y + 1988;
                setCarInfo(prev => ({ ...prev, year: mappedYear.toString() }));
            }
        }
    }, [jpEra, jpEraYear]);

    // 當輸入 cc 數時，自動更新牌費
    useEffect(() => {
        const cc = parseNum(carInfo.cc);
        if (cc > 0) {
            const newFee = calcLicenseFee(cc).toString();
            setHkLicenseFees((prev: any) => ({ ...prev, fee: newFee }));
        }
    }, [carInfo.cc]);

    // --- 核心計算 ---
    const currentRate = settings?.rates?.[region] || (region === 'JP' ? 0.053 : region === 'UK' ? 10.2 : 7.8);
    const carPriceHKD = Math.round(parseNum(carPrice) * currentRate);
    const frtTax = calcFRT(parseNum(prpPrice));
    
    // 費用總和
    const totalOriginHKD = getFeeTotal(originFees) * currentRate;
    const totalHkMisc = getFeeTotal(hkMiscFees);
    
    // 智能保險覆寫邏輯
    const estIns = estimateInsurance(carPriceHKD + frtTax, parseNum(carInfo.cc), insType, insNCD);
    const finalIns = customIns ? parseNum(customIns) : estIns;
    
    const totalHkLicense = getFeeTotal(hkLicenseFees) + frtTax + finalIns - parseNum(hkLicenseFees.insurance || '0'); 
    
    const landedCost = carPriceHKD + totalOriginHKD + totalHkMisc + frtTax;
    const totalCost = landedCost + (totalHkLicense - frtTax);
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
        
        // 智能記憶字典
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

    // --- UI 輔助組件 ---
    const InputField = ({ label, value, onChange, prefix, placeholder, list, type = 'text' }: any) => (
        <div className="flex flex-col gap-1 w-full">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
            <div className="relative group">
                {prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">{prefix}</span>}
                <input type={type} list={list} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`w-full bg-slate-50 border border-slate-200 rounded-lg py-2 ${prefix?'pl-7':'pl-3'} pr-3 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm`} />
            </div>
        </div>
    );

    const SectionTitle = ({ icon, title }: any) => (
        <div className="flex items-center gap-2 border-b-2 border-slate-800 pb-2 mb-4">
            <span className="text-slate-900">{icon}</span>
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">{title}</h3>
        </div>
    );

    return (
        <div className="bg-white md:bg-slate-100 min-h-full rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
            
            {/* 頂部導航 */}
            <div className="bg-slate-900 text-white p-3 flex justify-between items-center z-30 sticky top-0 flex-none safe-area-top">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg"><Ship size={18}/></div>
                    <span className="font-black text-sm md:text-lg tracking-tighter">海外訂車管家</span>
                </div>
                <div className="flex bg-slate-800 rounded-xl p-1">
                    <button onClick={() => setView('calc')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view==='calc' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>計算</button>
                    <button onClick={() => setView('history')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view==='history' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>紀錄 ({history.length})</button>
                </div>
            </div>

            {/* iPhone Sub-channel (只在手機顯示) */}
            {view === 'calc' && (
                <div className="md:hidden flex bg-white border-b border-slate-200 p-1 gap-1 shrink-0">
                    <button onClick={()=>setMobileTab('basic')} className={`flex-1 py-2 text-xs font-bold rounded-md ${mobileTab==='basic'?'bg-slate-100 text-blue-700':'text-slate-400'}`}>1. 規格</button>
                    <button onClick={()=>setMobileTab('fees')} className={`flex-1 py-2 text-xs font-bold rounded-md ${mobileTab==='fees'?'bg-slate-100 text-blue-700':'text-slate-400'}`}>2. 雜費</button>
                    <button onClick={()=>setMobileTab('result')} className={`flex-1 py-2 text-xs font-bold rounded-md ${mobileTab==='result'?'bg-slate-100 text-blue-700':'text-slate-400'}`}>3. 報價</button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto w-full relative pb-32 md:pb-6">
                
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
                                
                                {/* 物流進度條 */}
                                {item.details.departureDate && item.details.shippingDuration && (
                                    <div className="mt-2 border-t border-slate-100 pt-2">
                                        <TransportProgressBar departureDate={item.details.departureDate} durationDays={item.details.shippingDuration} type={item.details.transportType} />
                                    </div>
                                )}
                            </div>
                        ))}
                        {history.length === 0 && <div className="text-center py-20 text-slate-400 font-bold border-2 border-dashed border-slate-300 rounded-2xl mx-4">暫無訂單紀錄</div>}
                    </div>
                ) : (
                    /* ================= 桌面版：三欄聯動 (還原截圖排版) ================= */
                    <div className="flex flex-col md:flex-row h-full">
                        
                        {/* 左欄：車輛資料與運輸 */}
                        <div className={`w-full md:w-[40%] p-4 md:p-6 space-y-6 md:border-r border-slate-200 bg-white overflow-y-auto ${mobileTab!=='basic'?'hidden md:block':''}`}>
                            
                            <SectionTitle icon={<Car className="w-5 h-5"/>} title="車輛資料" />

                            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 mb-4">
                                {Object.values(REGION_CONFIGS).map((c:any) => (
                                    <button key={c.id} onClick={()=>setRegion(c.id)} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${region===c.id?'bg-white text-blue-700 shadow-sm':'text-slate-500'}`}>{c.name}</button>
                                ))}
                            </div>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="品牌 (Make)" value={carInfo.make} onChange={(v:any)=>setCarInfo({...carInfo, make:v})} list="makes_list" placeholder="選擇或輸入..." />
                                    <datalist id="makes_list">{settings?.makes?.map((m:any) => <option key={m} value={m}/>)}</datalist>
                                    
                                    <InputField label="型號 (Model)" value={carInfo.model} onChange={(v:any)=>setCarInfo({...carInfo, model:v})} list="models_list" placeholder="選擇或輸入..." />
                                    <datalist id="models_list">{(settings?.models?.[carInfo.make] || []).map((m:any) => <option key={m} value={m}/>)}</datalist>
                                </div>

                                <div className="grid grid-cols-4 gap-3">
                                    <div className="col-span-2 sm:col-span-1"><InputField label="年份" value={carInfo.year} onChange={(v:any)=>setCarInfo({...carInfo, year:v})} type="number" placeholder="2024" /></div>
                                    <div className="col-span-2 sm:col-span-1"><InputField label="代號" value={carInfo.code} onChange={(v:any)=>setCarInfo({...carInfo, code:v})} placeholder="AH30" /></div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <InputField label="外觀顏色" value={carInfo.exteriorColor} onChange={(v:any)=>setCarInfo({...carInfo, exteriorColor:v})} list="colors_list" placeholder="e.g. White" />
                                        <datalist id="colors_list">{settings?.colors?.map((c:any) => <option key={c} value={c}/>)}</datalist>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1"><InputField label="內飾顏色" value={carInfo.interiorColor} onChange={(v:any)=>setCarInfo({...carInfo, interiorColor:v})} list="colors_list" placeholder="e.g. Black" /></div>
                                </div>

                                <div className="grid grid-cols-4 gap-3">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1">波箱 (Trans)</label>
                                        <select value={carInfo.transmission} onChange={e=>setCarInfo({...carInfo, transmission:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-3 text-sm font-bold outline-none focus:border-blue-500 transition-all shadow-sm">
                                            <option value="AT">AT (自動)</option><option value="MT">MT (手動)</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1"><InputField label="排氣量 (cc)" value={carInfo.cc} onChange={(v:any)=>setCarInfo({...carInfo, cc:v})} type="number" placeholder="2494" /></div>
                                    <div className="col-span-2 sm:col-span-1"><InputField label="座位數" value={carInfo.seats} onChange={(v:any)=>setCarInfo({...carInfo, seats:v})} type="number" placeholder="7" /></div>
                                    <div className="col-span-2 sm:col-span-1"><InputField label="車輛咪數 (km)" value={formatNum(carInfo.mileage)} onChange={(v:any)=>setCarInfo({...carInfo, mileage:formatNum(v)})} placeholder="15,000" /></div>
                                </div>

                                <div><InputField label="車身號碼 (Chassis No)" value={carInfo.chassis} onChange={(v:any)=>setCarInfo({...carInfo, chassis:v.toUpperCase()})} placeholder="e.g. NHP10-1234567" /></div>
                            </div>

                            {/* 日本年份輔助器 */}
                            {region === 'JP' && (
                                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl mt-4 flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">🇯🇵 年號輔助:</span>
                                    <select value={jpEra} onChange={e=>setJpEra(e.target.value)} className="bg-white border rounded p-1.5 text-xs font-bold outline-none text-slate-700"><option value="Reiwa">令和</option><option value="Heisei">平成</option></select>
                                    <input type="number" value={jpEraYear} onChange={e=>setJpEraYear(e.target.value)} className="w-16 bg-white border rounded p-1.5 text-center font-bold text-xs outline-none" placeholder="年" />
                                    <span className="text-blue-600 font-black text-sm ml-auto">{convertJpYear(jpEra, jpEraYear)}</span>
                                </div>
                            )}

                            {/* 運輸資訊 */}
                            <div className="mt-8">
                                <SectionTitle icon={<Plane className="w-5 h-5"/>} title="運輸資訊" />
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1">運輸方式</label>
                                        <select value={transport.type} onChange={e=>setTransport({...transport, type: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-3 text-sm font-bold outline-none focus:border-blue-500 transition-all shadow-sm">
                                            <option value="SEA">船運 (Sea)</option><option value="AIR">空運 (Air)</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2"><InputField label="出發日期" type="date" value={transport.departureDate} onChange={(v:any)=>setTransport({...transport, departureDate: v})} /></div>
                                    <div className="col-span-3"><InputField label="預計需時 (天)" type="number" value={transport.duration} onChange={(v:any)=>setTransport({...transport, duration: v})} placeholder="e.g. 14" /></div>
                                </div>
                            </div>
                        </div>

                        {/* 中欄：雜費細項 (智能聯動) */}
                        <div className={`w-full md:w-[35%] p-4 md:p-6 space-y-6 bg-slate-50/50 overflow-y-auto border-r border-slate-200 ${mobileTab!=='fees'?'hidden md:block':''}`}>
                            
                            {/* 車價與稅金 */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border-l-8 border-blue-500">
                                <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2 mb-4">
                                    <DollarSign className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">核心價格</h3>
                                </div>
                                <div className="space-y-4">
                                    <InputField label={`當地車價 (${REGION_CONFIGS[region].currency})`} value={carPrice} onChange={(v:any)=>setCarPrice(formatNum(v))} prefix={REGION_CONFIGS[region].symbol} placeholder="0" />
                                    <InputField label="海關 A1 零售價 (HKD)" value={prpPrice} onChange={(v:any)=>setPrpPrice(formatNum(v))} prefix="$" placeholder="查閱入口網頁填入" />
                                </div>
                            </div>

                            {/* 智能保險與出牌 */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2 mb-4">
                                    <ShieldCheck className="w-5 h-5 text-indigo-500" />
                                    <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">出牌與智能保險</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex bg-white rounded p-0.5 border border-indigo-200">
                                                <button onClick={()=>setInsType('3rd')} className={`px-2 py-1 text-[10px] font-bold rounded ${insType==='3rd'?'bg-indigo-600 text-white':'text-indigo-400'}`}>三保</button>
                                                <button onClick={()=>setInsType('comp')} className={`px-2 py-1 text-[10px] font-bold rounded ${insType==='comp'?'bg-indigo-600 text-white':'text-indigo-400'}`}>全保</button>
                                            </div>
                                            <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-1 rounded">NCD: {insNCD}%</span>
                                        </div>
                                        <input type="range" min="0" max="60" step="10" value={insNCD} onChange={e=>setInsNCD(Number(e.target.value))} className="w-full accent-indigo-600 mb-2"/>
                                        <div className="flex justify-between items-center pt-2 border-t border-indigo-100">
                                            <span className="text-xs font-bold text-indigo-700">AI 預估保費</span>
                                            <span className="text-lg font-black font-mono text-indigo-700">{fmt(estIns)}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        {Object.entries(hkLicenseFees).map(([k, v]:any) => (
                                            <div key={k}>
                                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1 truncate">{k === 'fee' ? '牌費' : k === 'insurance' ? '實際保費' : k}</label>
                                                <input value={formatNum(v)} onChange={e=>setHkLicenseFees({...hkLicenseFees, [k]: formatNum(e.target.value)})} className="w-full border-b-2 border-slate-200 py-1.5 text-xs font-mono font-bold outline-none focus:border-blue-500 bg-transparent text-slate-800" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold text-red-600 bg-red-50 p-2 rounded-lg mt-2"><span>首次登記稅 (FRT)</span> <span className="font-mono">{fmt(frtTax)}</span></div>
                                </div>
                            </div>

                            {/* 當地與香港雜費 */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2 mb-4">
                                    <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase flex items-center"><Globe className="w-5 h-5 text-emerald-500 mr-2"/> 其他雜費</h3>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">當地雜費 ({REGION_CONFIGS[region].currency})</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {Object.entries(originFees).map(([k, v]:any) => (
                                                <div key={k}><label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5 truncate">{k}</label><input value={formatNum(v)} onChange={e=>setOriginFees({...originFees, [k]: formatNum(e.target.value)})} className="w-full border-b-2 border-slate-200 py-1 text-xs font-mono font-bold outline-none focus:border-blue-500 bg-transparent" /></div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 pt-2 border-t border-slate-100">香港雜費 (HKD)</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {Object.entries(hkMiscFees).map(([k, v]:any) => (
                                                <div key={k}><label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5 truncate">{k}</label><input value={formatNum(v)} onChange={e=>setHkMiscFees({...hkMiscFees, [k]: formatNum(e.target.value)})} className="w-full border-b-2 border-slate-200 py-1 text-xs font-mono font-bold outline-none focus:border-blue-500 bg-transparent" /></div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 右欄：結算與報價 */}
                        <div className={`w-full md:w-[25%] p-4 md:p-6 space-y-6 bg-white flex flex-col overflow-y-auto ${mobileTab!=='result'?'hidden md:flex' : ''}`}>
                            <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2 mb-4 flex-none">
                                <Zap className="w-5 h-5 text-amber-500" />
                                <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">報價結算</h3>
                            </div>
                            
                            <div className="space-y-4 flex-1">
                                <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl space-y-4">
                                    <div className="flex justify-between items-center border-b border-white/10 pb-2"><span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">車輛到港成本</span> <span className="text-xl font-mono font-black">{fmt(landedCost)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">預計總成本</span> <span className="text-2xl font-mono font-black text-blue-400">{fmt(totalCost)}</span></div>
                                </div>

                                <div className="p-4 bg-emerald-50 rounded-3xl border border-emerald-100 space-y-3">
                                    <div className="flex justify-between items-center"><label className="text-xs font-black text-emerald-800">期望利潤 (Margin)</label> <div className="relative w-24"><span className="absolute left-2 top-1 text-[10px] text-emerald-400">$</span><input type="text" inputMode="decimal" value={margin} onChange={e=>setMargin(formatNum(e.target.value))} className="w-full bg-white border border-emerald-200 rounded-lg p-1.5 pl-5 text-right font-mono font-bold text-emerald-700 text-sm outline-none" /></div></div>
                                    <input type="range" min="0" max="200000" step="5000" value={parseNum(margin)} onChange={e=>setMargin(formatNum(e.target.value))} className="w-full accent-emerald-500 mt-2"/>
                                </div>

                                <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-6 rounded-3xl shadow-2xl text-white text-center relative overflow-hidden">
                                    <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-blue-100 opacity-80">Final Customer Quote</p>
                                    <p className="text-4xl lg:text-5xl font-black font-mono tracking-tighter drop-shadow-lg">{fmt(finalPrice)}</p>
                                </div>
                            </div>

                            <button onClick={handleSave} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 mt-6 flex-none">
                                <Save size={20}/> 儲存並產生成本單
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 📱 iPhone 吸底快速數據條 */}
            {view === 'calc' && (
                <div className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900 text-white p-4 flex justify-between items-center z-50 rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.3)] safe-area-bottom">
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Live Total Cost</p>
                        <p className="text-xl font-black font-mono text-blue-400 leading-none">{fmt(totalCost)}</p>
                    </div>
                    <div className="flex gap-2">
                        {mobileTab !== 'basic' && <button onClick={() => setMobileTab(mobileTab === 'result' ? 'fees' : 'basic')} className="p-3 bg-slate-800 rounded-xl"><ArrowLeft size={16}/></button>}
                        {mobileTab !== 'result' ? (
                            <button onClick={() => setMobileTab(mobileTab === 'basic' ? 'fees' : 'result')} className="px-6 py-3 bg-white text-slate-900 rounded-xl font-black text-sm flex items-center">下一步 <ArrowRight size={16} className="ml-1"/></button>
                        ) : (
                            <button onClick={handleSave} className="px-6 py-3 bg-green-600 text-white rounded-xl font-black text-sm flex items-center"><Save size={16} className="mr-1"/> 儲存</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
