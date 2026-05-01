'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, List, Save, Ship, Car, FileText, 
  DollarSign, Trash2, Search, ArrowRight, ArrowLeft, 
  ShieldCheck, Globe, Info, Zap, CheckCircle, Plus,
  RefreshCw, Anchor, Calendar, Clock, ChevronRight
} from 'lucide-react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

// --- 專業級預設費用數據 (源自您的原始系統) ---
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
// 核心計算引擎
// ==========================================
const calcFRT = (prp: number) => {
    let v = prp; let t = 0;
    if (v > 0) { let tx = Math.min(v, 150000); t += tx * 0.46; v -= tx; }
    if (v > 0) { let tx = Math.min(v, 150000); t += tx * 0.86; v -= tx; }
    if (v > 0) { let tx = Math.min(v, 200000); t += tx * 1.15; v -= tx; }
    if (v > 0) { t += v * 1.32; }
    return Math.round(t);
};

const convertJpYear = (era: string, num: string) => {
    const y = parseInt(num) || 0; if (y <= 0) return '';
    return era === 'Reiwa' ? `(${y + 2018}年)` : (era === 'Heisei' ? `(${y + 1988}年)` : '');
};

const fmt = (n: number) => new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', maximumFractionDigits: 0 }).format(n || 0);
const formatNum = (val: string) => val.replace(/[^0-9.]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const parseNum = (val: string) => Number(String(val).replace(/,/g, '')) || 0;

// ★★★ 新增這段：專門對付 TypeScript 嚴格檢查的加總工具 ★★★
const getFeeTotal = (feeObj: any) => {
    if (!feeObj) return 0;
    return Object.values(feeObj).reduce((sum: number, val: any) => sum + parseNum(String(val)), 0);
};

export default function ImportOrderManager({ db, staffId, appId, settings, updateSettings }: any) {
    const [view, setView] = useState<'calc' | 'history'>('calc');
    const [mobileTab, setMobileTab] = useState<'basic' | 'fees' | 'result'>('basic');
    const [history, setHistory] = useState<any[]>([]);

    // 1. 車輛基礎與 A1/PRP
    const [region, setRegion] = useState('JP');
    const [carInfo, setCarInfo] = useState({ make: '', model: '', year: '', cc: '', chassis: '', era: 'Reiwa', eraNum: '' });
    const [carPrice, setCarPrice] = useState('');
    const [prpPrice, setPrpPrice] = useState('');

    // 2. 雜費細項 (全自動帶入預設)
    const [originFees, setOriginFees] = useState<any>(REGION_CONFIGS['JP'].origin);
    const [hkMiscFees, setHkMiscFees] = useState<any>(REGION_CONFIGS['JP'].hk_misc);
    const [hkLicenseFees, setHkLicenseFees] = useState<any>(REGION_CONFIGS['JP'].hk_license);
    const [margin, setMargin] = useState('30000');

    // 當地區切換時，自動重置所有預設費用
    useEffect(() => {
        setOriginFees(REGION_CONFIGS[region].origin);
        setHkMiscFees(REGION_CONFIGS[region].hk_misc);
        setHkLicenseFees(REGION_CONFIGS[region].hk_license);
    }, [region]);

    // --- 計算邏輯 ---
    const currentRate = settings?.rates?.[region] || (region === 'JP' ? 0.053 : region === 'UK' ? 10.2 : 7.8);
    const carPriceHKD = Math.round(parseNum(carPrice) * currentRate);
    const frtTax = calcFRT(parseNum(prpPrice));
    
    const totalOriginHKD = getFeeTotal(originFees) * currentRate;
    const totalHkMisc = getFeeTotal(hkMiscFees);
    const totalHkLicense = getFeeTotal(hkLicenseFees) + frtTax;
    
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
        if (!carPrice || !prpPrice) return alert("請填寫基本價格");
        
        // 智能記憶：如果輸入了新品牌/型號，自動存入 settings
        if (carInfo.make && !settings.makes.includes(carInfo.make)) {
            const newMakes = [...settings.makes, carInfo.make];
            updateSettings('makes', newMakes);
        }

        const record = {
            ts: Date.now(), date: new Date().toLocaleString('zh-HK'),
            region, carInfo, 
            vals: { carPrice: parseNum(carPrice), prp: parseNum(prpPrice), rate: currentRate },
            fees: { origin: originFees, hk_misc: hkMiscFees, hk_license: hkLicenseFees },
            results: { carPriceHKD, totalOriginHKD, totalHkMisc, totalHkLicense, landedCost, totalCost, finalPrice },
            margin: parseNum(margin), createdBy: staffId
        };

        try {
            await addDoc(collection(db, `artifacts/${appId}/staff/CHARLES_data/import_orders`), { ...record, timestamp: serverTimestamp() });
            alert("✅ 完整訂購紀錄已存檔！");
            setView('history');
        } catch (e) { alert("儲存失敗"); }
    };

    // --- UI 輔助組件 ---
    const InputField = ({ label, value, onChange, prefix, placeholder }: any) => (
        <div className="flex flex-col gap-1 w-full">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
            <div className="relative group">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">{prefix}</span>
                <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`w-full bg-slate-50 border border-slate-200 rounded-lg py-2 ${prefix?'pl-7':'pl-3'} pr-3 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm`} />
            </div>
        </div>
    );

    return (
        <div className="bg-white md:bg-slate-100 min-h-full rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
            
            {/* 頂部導航 (iPhone Sub-channel 版) */}
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
                    <button onClick={()=>setMobileTab('basic')} className={`flex-1 py-2 text-xs font-bold rounded-md ${mobileTab==='basic'?'bg-slate-100 text-blue-700':'text-slate-400'}`}>1. 基礎資料</button>
                    <button onClick={()=>setMobileTab('fees')} className={`flex-1 py-2 text-xs font-bold rounded-md ${mobileTab==='fees'?'bg-slate-100 text-blue-700':'text-slate-400'}`}>2. 雜費細項</button>
                    <button onClick={()=>setMobileTab('result')} className={`flex-1 py-2 text-xs font-bold rounded-md ${mobileTab==='result'?'bg-slate-100 text-blue-700':'text-slate-400'}`}>3. 結算報價</button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto w-full relative pb-32 md:pb-6">
                {view === 'history' ? (
                    <div className="p-4 space-y-3 max-w-4xl mx-auto animate-fade-in">
                        {history.map(item => (
                            <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center hover:border-blue-400 transition-all group">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-blue-100 text-blue-700 text-[9px] px-2 py-0.5 rounded font-black border border-blue-200">{item.region}</span>
                                        <span className="font-bold text-slate-800 text-sm truncate">{item.carInfo.year} {item.carInfo.make} {item.carInfo.model}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">{item.date} • {item.createdBy}</div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-xl font-black text-blue-700">{fmt(item.results.finalPrice)}</div>
                                    <div className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 rounded inline-block">利潤: {fmt(item.margin)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* ================= 桌面版：左中右數據聯動版面 ================= */
                    <div className="flex flex-col md:flex-row h-full">
                        
                        {/* 左：核心輸入欄 */}
                        <div className={`w-full md:w-[30%] p-5 space-y-6 md:border-r border-slate-200 bg-white ${mobileTab!=='basic'?'hidden md:block':''}`}>
                            <SectionTitle icon={<Globe size={16}/>} title="來源與規格" />
                            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                                {Object.values(REGION_CONFIGS).map((c:any) => (
                                    <button key={c.id} onClick={()=>setRegion(c.id)} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${region===c.id?'bg-white text-blue-700 shadow-sm':'text-slate-500'}`}>{c.name}</button>
                                ))}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2"><InputField label="車牌/底盤號 (Chassis)" value={carInfo.chassis} onChange={(v:any)=>setCarInfo({...carInfo, chassis:v.toUpperCase()})} placeholder="例如: AH30-123456" /></div>
                                <InputField label="品牌 (Make)" value={carInfo.make} onChange={(v:any)=>setCarInfo({...carInfo, make:v})} list="makes" placeholder="Toyota" />
                                <InputField label="型號 (Model)" value={carInfo.model} onChange={(v:any)=>setCarInfo({...carInfo, model:v})} placeholder="Alphard" />
                                <InputField label="年份 (Year)" value={carInfo.year} onChange={(v:any)=>setCarInfo({...carInfo, year:v})} type="number" placeholder="2024" />
                                <InputField label="排量 (cc)" value={carInfo.cc} onChange={(v:any)=>setCarInfo({...carInfo, cc:v})} type="number" placeholder="2494" />
                            </div>

                            {/* 日本年號轉換區 */}
                            {region === 'JP' && (
                                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-center gap-2">
                                    <select value={carInfo.era} onChange={e=>setCarInfo({...carInfo, era:e.target.value})} className="bg-transparent font-bold text-xs outline-none text-blue-700"><option value="Reiwa">令和</option><option value="Heisei">平成</option></select>
                                    <input value={carInfo.eraNum} onChange={e=>setCarInfo({...carInfo, eraNum:e.target.value})} className="w-10 bg-white border rounded p-1 text-center font-bold text-xs" placeholder="年" />
                                    <span className="text-blue-600 font-black text-xs">{convertJpYear(carInfo.era, carInfo.eraNum)}</span>
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-100 space-y-4">
                                <InputField label={`當地車價 (${regData.currency})`} value={carPrice} onChange={setCarPrice} prefix={regData.symbol} placeholder="0" />
                                <InputField label="海關 A1 零售價 (HKD)" value={prpPrice} onChange={setPrpPrice} prefix="$" placeholder="查閱入口網頁填入" />
                            </div>
                        </div>

                        {/* 中：全雜費細項 */}
                        <div className={`w-full md:w-[40%] p-5 space-y-6 bg-slate-50/50 ${mobileTab!=='fees'?'hidden md:block':''}`}>
                            <SectionTitle icon={<List size={16}/>} title="費用明細精算" />
                            
                            {/* 當地費用 */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                                <p className="text-[10px] font-black text-slate-800 uppercase flex justify-between"><span>當地雜費 ({regData.currency})</span> <span>折合: {fmt(totalOriginHKD)}</span></p>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(originFees).map(([k, v]:any) => (
                                        <div key={k} className="flex flex-col"><span className="text-[9px] text-slate-400 mb-0.5">{k.toUpperCase()}</span><input value={v} onChange={e=>setOriginFees({...originFees, [k]: e.target.value})} className="border-b bg-transparent font-mono text-xs outline-none focus:border-blue-500 font-bold" /></div>
                                    ))}
                                </div>
                            </div>

                            {/* 香港雜費 */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                                <p className="text-[10px] font-black text-slate-800 uppercase flex justify-between"><span>香港雜費 (HKD)</span> <span>小計: {fmt(totalHkMisc)}</span></p>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                    {Object.entries(hkMiscFees).map(([k, v]:any) => (
                                        <div key={k} className="flex justify-between items-center border-b border-slate-50 pb-1"><span className="text-[10px] text-slate-500">{k.toUpperCase()}</span><input value={v} onChange={e=>setHkMiscFees({...hkMiscFees, [k]: e.target.value})} className="w-16 text-right font-mono text-xs outline-none font-bold text-slate-700" /></div>
                                    ))}
                                </div>
                            </div>

                            {/* 出牌與保險 */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                                <p className="text-[10px] font-black text-slate-800 uppercase flex justify-between"><span>出牌與保險 (HKD)</span> <span>連稅: {fmt(totalHkLicense)}</span></p>
                                <div className="flex justify-between items-center text-xs font-bold text-red-600 bg-red-50 p-2 rounded-lg"><span>首次登記稅 (FRT)</span> <span className="font-mono">{fmt(frtTax)}</span></div>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                    {Object.entries(hkLicenseFees).map(([k, v]:any) => (
                                        <div key={k} className="flex justify-between items-center border-b border-slate-50 pb-1"><span className="text-[10px] text-slate-500">{k.toUpperCase()}</span><input value={v} onChange={e=>setHkLicenseFees({...hkLicenseFees, [k]: e.target.value})} className="w-16 text-right font-mono text-xs outline-none font-bold text-slate-700" /></div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 右：結算與報價 */}
                        <div className={`w-full md:w-[30%] p-5 space-y-6 md:border-l border-slate-200 bg-white flex flex-col ${mobileTab!=='result'?'hidden md:flex' : ''}`}>
                            <SectionTitle icon={<ShieldCheck size={16}/>} title="報價結算" />
                            
                            <div className="space-y-4 flex-1">
                                <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl space-y-4">
                                    <div className="flex justify-between items-center border-b border-white/10 pb-2"><span className="text-xs text-slate-400 font-bold uppercase tracking-widest">車輛到港成本</span> <span className="text-xl font-mono font-black">{fmt(landedCost)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-xs text-slate-400 font-bold uppercase tracking-widest">預計總成本</span> <span className="text-2xl font-mono font-black text-blue-400">{fmt(totalCost)}</span></div>
                                </div>

                                <div className="p-4 bg-emerald-50 rounded-3xl border border-emerald-100 space-y-3">
                                    <div className="flex justify-between items-center"><label className="text-xs font-black text-emerald-800">期望利潤 (Margin)</label> <div className="relative w-24"><span className="absolute left-2 top-1 text-[10px] text-emerald-400">$</span><input value={margin} onChange={e=>setMargin(formatNum(e.target.value))} className="w-full bg-white border border-emerald-200 rounded p-1 pl-4 text-right font-mono font-bold text-emerald-700 text-sm outline-none" /></div></div>
                                    <input type="range" min="0" max="200000" step="5000" value={parseNum(margin)} onChange={e=>setMargin(formatNum(e.target.value))} className="w-full accent-emerald-500"/>
                                </div>

                                <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-6 rounded-3xl shadow-2xl text-white text-center relative overflow-hidden">
                                    <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-blue-100 opacity-80">Final Customer Quote</p>
                                    <p className="text-5xl font-black font-mono tracking-tighter drop-shadow-lg">{fmt(finalPrice)}</p>
                                </div>
                            </div>

                            <button onClick={handleSave} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 mt-6">
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
                        <p className="text-2xl font-black font-mono text-blue-400 leading-none">{fmt(totalCost)}</p>
                    </div>
                    <button onClick={handleSave} className="bg-white text-black px-6 py-3 rounded-2xl font-black text-sm active:scale-95 transition-transform flex items-center gap-2 shadow-lg">
                        <Save size={16}/> 儲存
                    </button>
                </div>
            )}
        </div>
    );
}

// --- 小組件 ---
const SectionTitle = ({ icon, title }: any) => (
    <div className="flex items-center gap-2 border-b-2 border-slate-800 pb-2 mb-4">
        <span className="text-slate-900">{icon}</span>
        <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">{title}</h3>
    </div>
);
