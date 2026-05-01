'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, List, Save, Ship, Car, FileText, 
  DollarSign, Trash2, Search, ArrowRight, ArrowLeft, 
  ShieldCheck, Fuel, Globe, Info, Zap, CheckCircle, Plus
} from 'lucide-react';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";

// --- 常數與智能數據庫 ---
const REGIONS: any = {
  JP: { id: 'JP', name: '日本', currency: 'JPY', symbol: '¥', rate: 0.053, shipping: 10000, emission: 5500, tow: 1500 },
  UK: { id: 'UK', name: '英國', currency: 'GBP', symbol: '£', rate: 10.2, shipping: 15000, emission: 6500, tow: 2000 },
  OT: { id: 'OT', name: '其他', currency: 'USD', symbol: '$', rate: 7.8, shipping: 12000, emission: 6500, tow: 1500 },
};

// 計算首次登記稅 (FRT)
const calcFRT = (a1Price: number) => {
    let p = a1Price; let tax = 0;
    if (p > 0) { const t = Math.min(p, 150000); tax += t * 0.46; p -= t; }
    if (p > 0) { const t = Math.min(p, 150000); tax += t * 0.86; p -= t; }
    if (p > 0) { const t = Math.min(p, 200000); tax += t * 1.15; p -= t; }
    if (p > 0) { tax += p * 1.32; }
    return Math.round(tax);
};

// 計算政府牌費 (按 cc)
const calcLicenseFee = (cc: number) => {
    if (!cc) return 0;
    if (cc <= 1500) return 5074;
    if (cc <= 2500) return 7498;
    if (cc <= 3500) return 9929;
    if (cc <= 4500) return 12360;
    return 14694;
};

// 智能保險估算引擎 (Deep Estimator)
const estimateInsurance = (carValueHKD: number, cc: number, type: '3rd' | 'comp', ncd: number) => {
    let base = 0;
    if (type === '3rd') {
        // 3保基準價：大概 $3000，大馬力再貴啲
        base = cc > 2500 ? 4500 : 3000;
    } else {
        // 全保基準價：通常係車價嘅 2% - 3% (最少 $5000)
        const rate = cc > 2500 ? 0.025 : 0.02; 
        base = Math.max(5000, carValueHKD * rate);
    }
    // 扣減 NCD
    const finalPremium = base * (1 - (ncd / 100));
    return Math.round(finalPremium / 100) * 100; // 齊頭百位數
};

// 數字格式化工具
const fmt = (n: number) => new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', maximumFractionDigits: 0 }).format(n || 0);
const formatNum = (val: string) => val.replace(/[^0-9.]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const parseNum = (val: string) => Number(val.replace(/,/g, '')) || 0;

// ==========================================
// 主組件
// ==========================================
export default function ImportOrderManager({ db, staffId, appId }: any) {
    const [view, setView] = useState<'calc' | 'history'>('calculator');
    const [step, setStep] = useState(1);
    const [history, setHistory] = useState<any[]>([]);

    // 1. 車輛基礎狀態
    const [region, setRegion] = useState('JP');
    const [carInfo, setCarInfo] = useState({ make: '', model: '', year: '', cc: '' });
    const [foreignPrice, setForeignPrice] = useState('');
    const [a1Price, setA1Price] = useState('');
    
    // 2. 雜費與保險狀態
    const [insType, setInsType] = useState<'3rd'|'comp'>('comp');
    const [insNCD, setInsNCD] = useState(0);
    const [customFees, setCustomFees] = useState({ shipping: '', emission: '', tow: '', insurance: '' });

    // 3. 報價利潤狀態
    const [margin, setMargin] = useState('30000');

    // --- 自動計算邏輯 ---
    const regData = REGIONS[region];
    const carPriceHKD = Math.round(parseNum(foreignPrice) * regData.rate);
    const frtTax = calcFRT(parseNum(a1Price));
    const licenseFee = calcLicenseFee(parseNum(carInfo.cc));
    
    // 動態獲取費用 (如果有手動輸入就用手動，否則用預設/智能計算)
    const activeShipping = customFees.shipping !== '' ? parseNum(customFees.shipping) : regData.shipping;
    const activeEmission = customFees.emission !== '' ? parseNum(customFees.emission) : regData.emission;
    const activeTow = customFees.tow !== '' ? parseNum(customFees.tow) : regData.tow;
    
    // 智能保險估算
    const estimatedIns = estimateInsurance(carPriceHKD + frtTax, parseNum(carInfo.cc), insType, insNCD);
    const activeInsurance = customFees.insurance !== '' ? parseNum(customFees.insurance) : estimatedIns;

    // 成本總計
    const totalCost = carPriceHKD + frtTax + licenseFee + activeShipping + activeEmission + activeTow + activeInsurance;
    const finalPrice = totalCost + parseNum(margin);

    // 載入紀錄
    useEffect(() => {
        if (!db || !appId) return;
        const unsub = onSnapshot(query(collection(db, `artifacts/${appId}/stores/import_orders/history`)), (snap) => {
            setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a:any, b:any) => b.ts - a.ts));
        });
        return () => unsub();
    }, [db, appId]);

    const handleSave = async () => {
        if (!db) return;
        if (!foreignPrice || !a1Price) return alert("請先填寫車價及 A1 價格");

        const record = {
            ts: Date.now(), date: new Date().toLocaleDateString('zh-HK'),
            region, carInfo, 
            costs: { foreignPrice: parseNum(foreignPrice), rate: regData.rate, carPriceHKD, a1Price: parseNum(a1Price), frtTax, licenseFee, shipping: activeShipping, emission: activeEmission, tow: activeTow, insurance: activeInsurance, totalCost },
            quote: { margin: parseNum(margin), finalPrice },
            status: 'QUOTING', createdBy: staffId
        };

        try {
            await addDoc(collection(db, `artifacts/${appId}/stores/import_orders/history`), { ...record, timestamp: serverTimestamp() });
            alert("✅ 報價單已成功生成並存檔！");
            setView('history');
            setStep(1); // Reset
        } catch (e) { alert("❌ 儲存失敗"); }
    };

    // --- UI 渲染 ---
    return (
        <div className="bg-slate-50 min-h-full rounded-2xl shadow-inner border border-slate-200 overflow-hidden flex flex-col relative pb-20 md:pb-0">
            
            {/* 頂部導航 */}
            <div className="bg-slate-900 text-white p-3 flex justify-between items-center flex-none z-10 sticky top-0">
                <div className="flex items-center gap-2 font-black text-sm md:text-lg tracking-tight">
                    <Ship className="w-5 h-5 text-blue-400"/> 智能訂車管家
                </div>
                <div className="flex bg-slate-800 rounded-lg p-1">
                    <button onClick={() => {setView('calc'); setStep(1);}} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${view === 'calc' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>計算器</button>
                    <button onClick={() => setView('history')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${view === 'history' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>紀錄 ({history.length})</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto w-full relative">
                
                {view === 'history' && (
                    <div className="p-4 space-y-3 max-w-4xl mx-auto animate-fade-in">
                        {history.map(item => (
                            <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-blue-100 text-blue-800 text-[9px] px-2 py-0.5 rounded font-black">{item.region}</span>
                                        <span className="font-bold text-slate-800 text-sm">{item.carInfo.year} {item.carInfo.make} {item.carInfo.model}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">{item.date} • {item.createdBy}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">總報價</div>
                                    <div className="text-xl font-black text-blue-700">{fmt(item.quote.finalPrice)}</div>
                                </div>
                            </div>
                        ))}
                        {history.length === 0 && <div className="text-center py-20 text-slate-400 font-bold">暫無報價紀錄</div>}
                    </div>
                )}

                {view === 'calc' && (
                    <div className="w-full max-w-3xl mx-auto pb-6 animate-fade-in">
                        
                        {/* 步驟指示器 (Wizard) */}
                        <div className="bg-white px-4 py-3 border-b border-slate-200 flex justify-between items-center sticky top-0 z-20">
                            {[1, 2, 3].map(s => (
                                <div key={s} className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= s ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                                        {step > s ? <CheckCircle size={14}/> : s}
                                    </div>
                                    <span className={`text-[10px] font-bold hidden md:block ${step >= s ? 'text-blue-800' : 'text-slate-400'}`}>
                                        {s === 1 ? '車輛來源' : s === 2 ? '智能算帳' : '利潤報價'}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 space-y-6">
                            {/* ================= STEP 1: 車輛與來源 ================= */}
                            {step === 1 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4">
                                    {/* 國家選擇 (iPhone Style Segmented Control) */}
                                    <div className="bg-slate-200/60 p-1 rounded-xl flex gap-1">
                                        {Object.values(REGIONS).map((c: any) => (
                                            <button key={c.id} onClick={() => setRegion(c.id)} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${region === c.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>

                                    {/* 金額輸入 (大字體) */}
                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                                        <div className="flex items-center gap-2 text-slate-800 font-black mb-2"><DollarSign size={18} className="text-blue-500"/> 核心價格</div>
                                        
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">海外車價 ({regData.currency})</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-300">{regData.symbol}</span>
                                                <input type="text" inputMode="decimal" value={foreignPrice} onChange={e=>setForeignPrice(formatNum(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-xl py-4 pl-10 pr-4 text-3xl font-black font-mono text-slate-800 outline-none transition-colors" placeholder="0" />
                                            </div>
                                            {carPriceHKD > 0 && <div className="text-right text-xs font-bold text-blue-600 mt-1">折合 {fmt(carPriceHKD)} HKD</div>}
                                        </div>

                                        <div className="pt-4 border-t border-slate-100">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1 flex items-center justify-between">
                                                <span>海關 A1 零售價 (HKD)</span>
                                                {frtTax > 0 && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[9px]">自動稅金: {fmt(frtTax)}</span>}
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-300">$</span>
                                                <input type="text" inputMode="decimal" value={a1Price} onChange={e=>setA1Price(formatNum(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-red-400 focus:bg-white rounded-xl py-4 pl-10 pr-4 text-2xl font-black font-mono text-red-700 outline-none transition-colors" placeholder="查閱海關網頁填入" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 基礎資料 */}
                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                        <div className="flex items-center gap-2 text-slate-800 font-black mb-4"><Car size={18} className="text-slate-400"/> 車輛規格</div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="text-[10px] font-bold text-slate-400">廠牌</label><input value={carInfo.make} onChange={e=>setCarInfo({...carInfo, make:e.target.value})} className="w-full border-b-2 border-slate-200 py-2 font-bold outline-none focus:border-blue-500" placeholder="Toyota"/></div>
                                            <div><label className="text-[10px] font-bold text-slate-400">型號</label><input value={carInfo.model} onChange={e=>setCarInfo({...carInfo, model:e.target.value})} className="w-full border-b-2 border-slate-200 py-2 font-bold outline-none focus:border-blue-500" placeholder="Alphard"/></div>
                                            <div><label className="text-[10px] font-bold text-slate-400">年份</label><input type="number" value={carInfo.year} onChange={e=>setCarInfo({...carInfo, year:e.target.value})} className="w-full border-b-2 border-slate-200 py-2 font-mono font-bold outline-none focus:border-blue-500" placeholder="2024"/></div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 flex justify-between"><span>容積(cc)</span> {licenseFee > 0 && <span className="text-amber-600">牌費: {fmt(licenseFee)}</span>}</label>
                                                <input type="number" value={carInfo.cc} onChange={e=>setCarInfo({...carInfo, cc:e.target.value})} className="w-full border-b-2 border-slate-200 py-2 font-mono font-bold outline-none focus:border-blue-500" placeholder="2494"/>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ================= STEP 2: 智能算帳 (保險與雜費) ================= */}
                            {step === 2 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4">
                                    
                                    {/* 智能保險估算器 */}
                                    <div className="bg-gradient-to-br from-indigo-900 to-blue-900 p-5 rounded-2xl shadow-lg text-white">
                                        <div className="flex items-center gap-2 font-black mb-4"><ShieldCheck className="text-yellow-400"/> AI 智能保險估價</div>
                                        
                                        <div className="bg-white/10 p-1 rounded-lg flex gap-1 mb-4">
                                            <button onClick={() => setInsType('3rd')} className={`flex-1 py-2 rounded-md text-xs font-bold transition ${insType === '3rd' ? 'bg-white text-indigo-900' : 'text-indigo-200'}`}>三保 (3rd Party)</button>
                                            <button onClick={() => setInsType('comp')} className={`flex-1 py-2 rounded-md text-xs font-bold transition ${insType === 'comp' ? 'bg-white text-indigo-900' : 'text-indigo-200'}`}>全保 (Comprehensive)</button>
                                        </div>

                                        <div className="mb-4">
                                            <div className="flex justify-between text-xs font-bold text-indigo-200 mb-2"><span>客戶 NCD (無索償折扣)</span><span className="text-white">{insNCD}%</span></div>
                                            <input type="range" min="0" max="60" step="10" value={insNCD} onChange={e=>setInsNCD(Number(e.target.value))} className="w-full accent-yellow-400"/>
                                        </div>

                                        <div className="bg-black/20 p-4 rounded-xl flex justify-between items-center border border-white/10 backdrop-blur-sm">
                                            <div>
                                                <div className="text-[10px] text-indigo-200 font-bold uppercase">預估保費 (Estimated)</div>
                                                <div className="text-xs text-indigo-300 mt-0.5">基於車價 {fmt(carPriceHKD + frtTax)} 計算</div>
                                            </div>
                                            <div className="text-3xl font-black font-mono text-yellow-400">{fmt(estimatedIns)}</div>
                                        </div>
                                    </div>

                                    {/* 物流與雜費 (已帶入預設值) */}
                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                        <div className="flex items-center gap-2 text-slate-800 font-black mb-4"><Globe size={18} className="text-emerald-500"/> 物流與到港雜費</div>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <span className="text-sm font-bold text-slate-600">當地物流運費</span>
                                                <input type="text" inputMode="decimal" placeholder={regData.shipping.toString()} value={customFees.shipping} onChange={e=>setCustomFees({...customFees, shipping: formatNum(e.target.value)})} className="w-24 bg-slate-50 border rounded p-1.5 text-right font-mono font-bold outline-none focus:border-blue-400"/>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <span className="text-sm font-bold text-slate-600">到港環保及驗車</span>
                                                <input type="text" inputMode="decimal" placeholder={regData.emission.toString()} value={customFees.emission} onChange={e=>setCustomFees({...customFees, emission: formatNum(e.target.value)})} className="w-24 bg-slate-50 border rounded p-1.5 text-right font-mono font-bold outline-none focus:border-blue-400"/>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <span className="text-sm font-bold text-slate-600">本地拖車及碼頭費</span>
                                                <input type="text" inputMode="decimal" placeholder={regData.tow.toString()} value={customFees.tow} onChange={e=>setCustomFees({...customFees, tow: formatNum(e.target.value)})} className="w-24 bg-slate-50 border rounded p-1.5 text-right font-mono font-bold outline-none focus:border-blue-400"/>
                                            </div>
                                            <div className="flex items-center justify-between pt-1">
                                                <span className="text-sm font-bold text-indigo-600">保險費 (覆寫預估值)</span>
                                                <input type="text" inputMode="decimal" placeholder={estimatedIns.toString()} value={customFees.insurance} onChange={e=>setCustomFees({...customFees, insurance: formatNum(e.target.value)})} className="w-24 bg-indigo-50 border border-indigo-200 rounded p-1.5 text-right font-mono font-bold text-indigo-700 outline-none focus:border-indigo-500"/>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ================= STEP 3: 利潤與報價 ================= */}
                            {step === 3 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4">
                                    <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-emerald-200">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-center">Total Cost (總成本)</div>
                                        <div className="text-3xl font-black font-mono text-slate-800 text-center mb-6">{fmt(totalCost)}</div>
                                        
                                        <div className="border-t border-slate-100 pt-5">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-sm font-black text-slate-700 flex items-center"><Zap className="w-4 h-4 mr-1 text-amber-500"/> 設定利潤 (Margin)</label>
                                                <div className="relative w-28">
                                                    <span className="absolute left-2 top-1.5 text-xs font-bold text-emerald-600">$</span>
                                                    <input type="text" inputMode="decimal" value={margin} onChange={e=>setMargin(formatNum(e.target.value))} className="w-full bg-emerald-50 border border-emerald-200 rounded-lg p-1.5 pl-5 text-right font-mono font-bold text-emerald-700 outline-none focus:border-emerald-500"/>
                                                </div>
                                            </div>
                                            <input type="range" min="10000" max="150000" step="5000" value={parseNum(margin)} onChange={e=>setMargin(formatNum(e.target.value))} className="w-full accent-emerald-500 mt-2"/>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-xl text-white text-center relative overflow-hidden">
                                        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                                        <div className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-2 relative z-10">對客最終報價 (Final Quote)</div>
                                        <div className="text-5xl font-black font-mono relative z-10 drop-shadow-md">{fmt(finalPrice)}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* 📱 底部吸底操作列 (Sticky Bottom Bar) */}
            {view === 'calc' && (
                <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-30 flex items-center justify-between pb-safe">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Live Cost</span>
                        <span className="text-lg font-black font-mono text-slate-800 leading-none">{fmt(totalCost)}</span>
                    </div>
                    
                    <div className="flex gap-2">
                        {step > 1 && (
                            <button onClick={() => setStep(s => s - 1)} className="p-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 active:scale-95 transition-transform">
                                <ArrowLeft size={20}/>
                            </button>
                        )}
                        {step < 3 ? (
                            <button onClick={() => {
                                if (step === 1 && (!foreignPrice || !a1Price)) return alert("請先填寫車價及 A1 價格");
                                setStep(s => s + 1);
                            }} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center shadow-lg active:scale-95 transition-transform">
                                下一步 <ArrowRight size={18} className="ml-1"/>
                            </button>
                        ) : (
                            <button onClick={handleSave} className="px-6 py-3 bg-green-600 text-white rounded-xl font-black flex items-center shadow-lg active:scale-95 transition-transform">
                                <Save size={18} className="mr-1.5"/> 儲存報價
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
