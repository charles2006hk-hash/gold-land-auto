'use client';

import React, { useState, useEffect } from 'react';
import { 
  List, Save, Ship, Car, 
  DollarSign, Trash2, ArrowRight, ArrowLeft, 
  ShieldCheck, Globe, CheckCircle, Search, Plus,
  Plane, Cog, RotateCcw, Zap, CreditCard, Anchor, Pencil, Lock, Unlock, FileSignature, Printer, ImageIcon, UploadCloud, Database, X, Eye, FileDown, Download, Loader2
} from 'lucide-react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";

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

const STATUS_OPTIONS: any = {
    QUOTING: { id: 'QUOTING', label: '報價中', color: 'bg-slate-100 text-slate-600 border-slate-300' },
    IN_PROGRESS: { id: 'IN_PROGRESS', label: '進行中', color: 'bg-orange-100 text-orange-700 border-orange-300' },
    DELIVERED: { id: 'DELIVERED', label: '已交貨', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' }
};

// ==========================================
// 外部純函數與組件
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

const formatNum = (val: any) => {
    const str = String(val ?? '');
    return str.replace(/[^0-9.]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const parseNum = (val: any) => {
    if (typeof val === 'number') return val;
    return Number(String(val || '0').replace(/,/g, '')) || 0;
};

const getFeeTotal = (feeObj: any) => { 
    if (!feeObj) return 0; 
    return Object.values(feeObj).reduce((sum: number, val: any) => {
        const actualVal = (val && typeof val === 'object' && val.val !== undefined) ? val.val : val;
        return sum + parseNum(actualVal);
    }, 0); 
};

const flattenFees = (feesObj: any) => {
    if (!feesObj) return {};
    const flattened: any = {};
    Object.entries(feesObj).forEach(([k, v]: [string, any]) => {
        if (v && typeof v === 'object' && v.val !== undefined) {
            flattened[k] = String(v.val);
        } else {
            flattened[k] = String(v ?? '0');
        }
    });
    return flattened;
};

const convertJpYear = (era: string, num: string) => {
    const y = parseInt(num) || 0; if (y <= 0) return '';
    return era === 'Reiwa' ? `(${y + 2018}年)` : (era === 'Heisei' ? `(${y + 1988}年)` : '');
};

const getColorHex = (name: string) => {
    if (!name) return 'transparent'; const n = name.toLowerCase();
    if (n.includes('white')) return '#f8f9fa'; if (n.includes('black')) return '#1a1a1a';
    if (n.includes('silver')) return '#c0c0c0'; if (n.includes('grey') || n.includes('gray')) return '#808080';
    if (n.includes('blue')) return '#3b82f6'; if (n.includes('red')) return '#ef4444';
    return name;
};

const InputField = ({ label, value, onChange, prefix, placeholder, list, type = 'text', readOnly = false }: any) => (
    <div className="flex flex-col gap-0.5 w-full">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
        <div className="relative group">
            {prefix && <span className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">{prefix}</span>}
            <input readOnly={readOnly} type={type} list={list} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`w-full bg-white border-b-2 border-slate-200 py-1 ${prefix?'pl-4':'pl-1'} pr-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 transition-colors md:bg-transparent md:border-b-2 md:rounded-none rounded-lg shadow-sm md:shadow-none`} />
        </div>
    </div>
);

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
                <span>出發: {departureDate}</span>
                <span className={isArrived ? 'text-emerald-600' : 'text-blue-600'}>{isArrived ? '已抵達' : `預計: ${arrivalDate} (${daysLeft > 0 ? `還有 ${daysLeft} 天` : '即將抵達'})`}</span>
            </div>
            <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-visible">
                <div className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ${isArrived ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${percentage}%` }}></div>
                <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 z-10" style={{ left: `${percentage}%`, transform: `translate(-50%, -50%)` }}>
                    <div className={`p-1 rounded-full shadow-md border-2 border-white ${isArrived ? 'bg-emerald-500' : 'bg-blue-600'}`}><Icon className="w-3 h-3 text-white" /></div>
                </div>
            </div>
        </div>
    );
};

const QuotationPreview = ({ item, onClose }: any) => {
    if (!item) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-[210mm] h-[90vh] md:h-[297mm] md:max-h-[90vh] rounded-xl overflow-hidden flex flex-col shadow-2xl scale-95 md:scale-100 origin-center transition-transform">
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center print:hidden">
                    <div className="flex items-center gap-2"><Printer size={20}/><span className="font-bold">報價單預覽 (PDF Preview)</span></div>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="bg-blue-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">正式列印 / 輸出 PDF</button>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X/></button>
                    </div>
                </div>
                <div id="print-area" className="flex-1 overflow-y-auto p-10 text-slate-900 bg-white">
                    <div className="flex justify-between items-start border-b-4 border-slate-800 pb-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">Gold Land Auto</h1>
                            <h2 className="text-xl font-bold tracking-widest mt-1">金田汽車</h2>
                            <p className="text-[10px] text-slate-500 mt-2">海外訂購車輛正式報價單</p>
                        </div>
                        <div className="text-right">
                            <div className="bg-slate-800 text-white px-3 py-1 text-xs font-bold uppercase tracking-widest inline-block mb-2">Quotation</div>
                            <p className="text-xs font-mono text-slate-500">Date: {item.date}</p>
                            <p className="text-xs font-mono text-slate-500">Ref: QT-{item.id.slice(0,8).toUpperCase()}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <h3 className="bg-slate-100 px-2 py-1 text-[10px] font-black uppercase mb-2 border-l-4 border-slate-800">Vehicle Specification</h3>
                            <div className="space-y-1 text-sm">
                                <p><span className="text-slate-500 w-24 inline-block font-bold">Model:</span> <span className="font-black text-lg">{item.details?.manufacturer || item.carInfo?.make} {item.details?.model || item.carInfo?.model}</span></p>
                                <p><span className="text-slate-500 w-24 inline-block">Year:</span> <span className="font-bold">{item.details?.year || item.carInfo?.year}</span></p>
                                <p><span className="text-slate-500 w-24 inline-block">Chassis:</span> <span className="font-mono">{item.details?.chassisNo || item.details?.chassis || 'TBC'}</span></p>
                                <p><span className="text-slate-500 w-24 inline-block">Color:</span> <span className="font-bold">{item.details?.exteriorColor || item.carInfo?.exteriorColor}</span></p>
                            </div>
                        </div>
                        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-2">Transport Info</h3>
                            <p className="text-xs font-bold">Shipping: {item.details?.transportType === 'SEA' ? '船運 (Sea Freight)' : '空運 (Air Freight)'}</p>
                            <p className="text-xs text-slate-500 mt-1">Departure: {item.details?.departureDate || 'TBC'}</p>
                        </div>
                    </div>
                    <table className="w-full text-sm mb-10">
                        <thead className="bg-slate-800 text-white">
                            <tr><th className="p-3 text-left uppercase tracking-widest text-[10px]">Description</th><th className="p-3 text-right uppercase tracking-widest text-[10px]">Amount</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr><td className="p-3 font-bold">車輛到港成本 (含海外雜費及船運)</td><td className="p-3 text-right font-mono">{fmt(item.results?.landedCost)}</td></tr>
                            <tr><td className="p-3">政府首次登記稅 (FRT)</td><td className="p-3 text-right font-mono">{fmt(item.results?.frtTax)}</td></tr>
                            <tr><td className="p-3">出牌、保險及其他本地雜費</td><td className="p-3 text-right font-mono">{fmt(item.results?.totalCost - item.results?.landedCost)}</td></tr>
                            <tr className="bg-slate-50"><td className="p-4 font-black text-lg">Final Quotation (總報價)</td><td className="p-4 text-right font-black text-2xl text-blue-700">{fmt(item.results?.finalPrice)}</td></tr>
                        </tbody>
                    </table>
                    <div className="mt-auto border-t-2 border-slate-200 pt-10 grid grid-cols-2 gap-20">
                        <div className="text-center pt-8 border-t border-slate-800"><p className="text-[10px] font-bold uppercase">For and on behalf of Gold Land Auto</p></div>
                        <div className="text-center pt-8 border-t border-slate-800"><p className="text-[10px] font-bold uppercase">Customer Confirmation</p></div>
                    </div>
                </div>
            </div>
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: fixed; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 15mm; }
                    .print\\:hidden { display: none !important; }
                }
            `}</style>
        </div>
    );
};

// ==========================================
// 主系統組件
// ==========================================
export default function ImportOrderManager({ db, staffId, appId, settings, updateSettings }: any) {
    const [view, setView] = useState<'dashboard' | 'calc'>('dashboard');
    const [mobileTab, setMobileTab] = useState<'basic' | 'fees' | 'result'>('basic');
    
    const [history, setHistory] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [previewItem, setPreviewItem] = useState<any | null>(null);

    // 相片畫廊與放大狀態
    const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
    const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);

    // 表單狀態
    const [editingId, setEditingId] = useState<string | null>(null);
    const [region, setRegion] = useState('JP');
    const [carPrice, setCarPrice] = useState('');
    const [prpPrice, setPrpPrice] = useState('');
    const [carInfo, setCarInfo] = useState({ make: '', model: '', year: '', code: '', exteriorColor: '', interiorColor: '', transmission: 'AT', cc: '', seats: '', mileage: '', chassis: '' });
    const [orderPhotos, setOrderPhotos] = useState<string[]>([]);
    const [transport, setTransport] = useState({ type: 'SEA', departureDate: '', duration: '' });
    const [margin, setMargin] = useState('30000');
    const [originFees, setOriginFees] = useState<any>(REGION_CONFIGS['JP'].origin);
    const [hkMiscFees, setHkMiscFees] = useState<any>(REGION_CONFIGS['JP'].hk_misc);
    const [hkLicenseFees, setHkLicenseFees] = useState<any>(REGION_CONFIGS['JP'].hk_license);
    const [insType, setInsType] = useState<'3rd'|'comp'>('comp');
    const [insNCD, setInsNCD] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [jpEra, setJpEra] = useState('Reiwa');
    const [jpEraYear, setJpEraYear] = useState('');

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

    // 切換選中單據時，重置畫廊 index
    useEffect(() => {
        setSelectedPhotoIdx(0);
    }, [selectedId]);

    // --- 計算邏輯 ---
    const regData = REGION_CONFIGS[region] || REGION_CONFIGS['JP'];
    const currentRate = settings?.rates?.[region] || (region === 'JP' ? 0.053 : region === 'UK' ? 10.2 : 7.8);
    const carPriceHKD = Math.round(parseNum(carPrice) * currentRate);
    const frtTax = calcFRT(parseNum(prpPrice));
    const totalOriginHKD = getFeeTotal(originFees) * currentRate;
    const totalHkMisc = getFeeTotal(hkMiscFees);
    const estIns = estimateInsurance(carPriceHKD + frtTax, parseNum(carInfo.cc), insType, insNCD);
    const finalIns = parseNum(hkLicenseFees.insurance || '0') > 0 ? parseNum(hkLicenseFees.insurance) : estIns;
    const pureLicenseFee = parseNum(hkLicenseFees.fee || '0');
    const totalHkLicense = pureLicenseFee + frtTax + finalIns; 
    const landedCost = carPriceHKD + totalOriginHKD + totalHkMisc + frtTax;
    const totalCost = landedCost + pureLicenseFee + finalIns;
    const finalPrice = totalCost + parseNum(margin);

    useEffect(() => {
        if (!db || !appId) return;
        const q = query(collection(db, `artifacts/${appId}/staff/CHARLES_data/import_orders`));
        return onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a:any, b:any) => b.ts - a.ts);
            setHistory(list);
            if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
        });
    }, [db, appId]);

    // 數據搬遷邏輯
    const handleMigrateOldData = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file || !db) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                let rawData;
                try { rawData = JSON.parse(text); } 
                catch (err1) {
                    const lines = text.split('\n').filter(line => line.trim() !== '');
                    rawData = lines.map(line => JSON.parse(line));
                }

                let list: any[] = [];
                if (Array.isArray(rawData)) { list = rawData; } 
                else if (typeof rawData === 'object' && rawData !== null) {
                    const coreData = rawData.payload || rawData;
                    if (coreData.history) { list = Array.isArray(coreData.history) ? coreData.history : Object.keys(coreData.history).map(k => ({ id: k, ...coreData.history[k] })); } 
                    else if (coreData.import_orders) { list = Array.isArray(coreData.import_orders) ? coreData.import_orders : Object.keys(coreData.import_orders).map(k => ({ id: k, ...coreData.import_orders[k] })); } 
                    else if (rawData.__collections__ && rawData.__collections__.history) { const hist = rawData.__collections__.history; list = Object.keys(hist).map(k => ({ id: k, ...hist[k] })); } 
                    else { list = Object.keys(coreData).map(k => ({ id: k, ...coreData[k] })); }
                }

                list = list.filter(item => item && (item.details || item.vals || item.results));
                if (list.length === 0) return alert("找不到有效數據");

                if (confirm(`準備搬遷 ${list.length} 筆數據至雲端？系統將自動整理圖片與數據結構。`)) {
                    const storage = getStorage(); 
                    let currentBatch = writeBatch(db);
                    let opCount = 0;

                    for (let i = 0; i < list.length; i++) {
                        const oldItem = list[i];
                        const newRef = doc(collection(db, `artifacts/${appId}/staff/CHARLES_data/import_orders`));
                        const mappedPhotos: string[] = [];
                        const oldAttachments = oldItem.attachments || [];
                        
                        for (let a of oldAttachments) {
                            if (a.type?.startsWith('image/') && a.data) {
                                try {
                                    const fileName = `import_orders/migration_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                                    const sRef = storageRef(storage, fileName);
                                    await uploadString(sRef, a.data, 'data_url');
                                    mappedPhotos.push(await getDownloadURL(sRef));
                                } catch (e) {}
                            }
                        }

                        const totalCostObj = oldItem.results?.totalCost || 0;
                        const oldFinalPrice = oldItem.results?.finalPrice || oldItem.quote?.finalPrice;
                        const defaultMargin = 30000;
                        const finalPriceToSave = oldFinalPrice ? oldFinalPrice : (totalCostObj + defaultMargin);
                        const marginToSave = oldFinalPrice ? (oldFinalPrice - totalCostObj) : defaultMargin;

                        currentBatch.set(newRef, {
                            ...oldItem, region: oldItem.country || oldItem.region || 'JP',
                            photos: mappedPhotos,
                            results: { ...oldItem.results, frtTax: oldItem.results?.frt || oldItem.results?.frtTax || 0, finalPrice: finalPriceToSave },
                            quote: { margin: marginToSave, finalPrice: finalPriceToSave },
                            migratedFromOldApp: true, importTs: Date.now()
                        });

                        opCount++;
                        if (opCount >= 400) {
                            await currentBatch.commit();
                            currentBatch = writeBatch(db);
                            opCount = 0;
                        }
                    }
                    if (opCount > 0) { await currentBatch.commit(); }
                    alert("✅ 搬遷完成！"); setView('dashboard');
                }
            } catch (err) { alert("檔案解析失敗"); }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handlePhotoUpload = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 800; let w = img.width, h = img.height;
                if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } } 
                else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d'); ctx?.drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                try {
                    const storage = getStorage();
                    const fileName = `import_orders/uploads/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                    const sRef = storageRef(storage, fileName);
                    setOrderPhotos(prev => [...prev, "loading..."]); 
                    await uploadString(sRef, dataUrl, 'data_url');
                    const finalUrl = await getDownloadURL(sRef);
                    setOrderPhotos(prev => prev.filter(u => u !== "loading...").concat(finalUrl));
                } catch (e) { alert("上傳失敗"); }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!carPrice || !prpPrice) return alert("請填寫基本車價與 PRP");
        const record = {
            ts: Date.now(), date: new Date().toLocaleDateString('zh-HK'), region,
            details: { ...carInfo, transportType: transport.type, departureDate: transport.departureDate, shippingDuration: transport.duration },
            vals: { carPrice: parseNum(carPrice), prp: parseNum(prpPrice), rate: currentRate },
            fees: { origin: originFees, hk_misc: hkMiscFees, hk_license: hkLicenseFees, finalInsurance: finalIns },
            results: { carPriceHKD, totalOriginHKD, totalHkMisc, totalHkLicense, landedCost, totalCost, finalPrice, frtTax },
            quote: { margin: parseNum(margin), finalPrice },
            photos: orderPhotos.filter(p => p !== "loading..."), 
            status: editingId ? (history.find(h=>h.id===editingId)?.status || 'QUOTING') : 'QUOTING', createdBy: staffId
        };
        try {
            if (editingId) {
                await updateDoc(doc(db, `artifacts/${appId}/staff/CHARLES_data/import_orders`, editingId), record);
                setSelectedId(editingId); 
            } else {
                const newDoc = await addDoc(collection(db, `artifacts/${appId}/staff/CHARLES_data/import_orders`), { ...record, timestamp: serverTimestamp() });
                setSelectedId(newDoc.id);
            }
            alert("✅ 儲存成功！"); setView('dashboard'); setOrderPhotos([]); setEditingId(null);
        } catch (e) { alert("儲存失敗"); }
    };

    const handleAddNew = () => {
        setEditingId(null); setRegion('JP'); setCarPrice(''); setPrpPrice('');
        setCarInfo({ make: '', model: '', year: '', code: '', exteriorColor: '', interiorColor: '', transmission: 'AT', cc: '', seats: '', mileage: '', chassis: '' });
        setOrderPhotos([]); setTransport({ type: 'SEA', departureDate: '', duration: '' });
        setOriginFees(REGION_CONFIGS['JP'].origin); setHkMiscFees(REGION_CONFIGS['JP'].hk_misc); setHkLicenseFees(REGION_CONFIGS['JP'].hk_license);
        setMargin('30000'); setView('calc');
    };

    const handleEdit = (item: any) => {
        setEditingId(item.id); setRegion(item.region || 'JP');
        setCarPrice(formatNum(item.vals?.carPrice)); setPrpPrice(formatNum(item.vals?.prp));
        setCarInfo({
            make: item.details?.manufacturer || item.carInfo?.make || '', model: item.details?.model || item.carInfo?.model || '', year: item.details?.year || item.carInfo?.year || '',
            code: item.details?.code || item.carInfo?.code || '', exteriorColor: item.details?.exteriorColor || item.carInfo?.exteriorColor || '', interiorColor: item.details?.interiorColor || item.carInfo?.interiorColor || '',
            transmission: item.details?.transmission || item.carInfo?.transmission || 'AT', cc: item.details?.engineCapacity || item.details?.cc || item.carInfo?.cc || '', seats: item.details?.seats || item.carInfo?.seats || '',
            mileage: item.details?.mileage || item.carInfo?.mileage || '', chassis: item.details?.chassisNo || item.details?.chassis || item.carInfo?.chassis || ''
        });
        setOrderPhotos(item.photos || []);
        setTransport({ type: item.details?.transportType || 'SEA', departureDate: item.details?.departureDate || '', duration: item.details?.shippingDuration || '' });
        setOriginFees(flattenFees(item.fees?.origin)); setHkMiscFees(flattenFees(item.fees?.hk_misc)); setHkLicenseFees(flattenFees(item.fees?.hk_license));
        setMargin(formatNum(item.quote?.margin || '30000')); setView('calc');
    };

    const handleImportToInventory = async (item: any) => {
        if (!db || !appId || !confirm("確定將此訂單匯入至主系統庫存？相片將自動派發至智能圖庫！")) return;
        try {
            const vehicleData = {
                regMark: '', make: item.details?.manufacturer || item.carInfo?.make || '', model: item.details?.model || item.carInfo?.model || '',
                year: item.details?.year || item.carInfo?.year || '', chassisNo: item.details?.chassisNo || item.details?.chassis || item.carInfo?.chassis || '',
                price: item.results?.finalPrice, costPrice: item.results?.totalCost, status: 'In Stock', managedBy: staffId,
                acquisition: { type: 'Import', currency: REGION_CONFIGS[item.region]?.currency, exchangeRate: item.vals?.rate, foreignPrice: item.vals?.carPrice, a1Price: item.vals?.prp, frtTax: item.results?.frtTax, eta: item.details?.departureDate },
                photos: item.photos || [], createdAt: serverTimestamp()
            };
            const docRef = await addDoc(collection(db, `artifacts/${appId}/staff/CHARLES_data/inventory`), vehicleData);
            if (item.photos?.length > 0) {
                const batch = writeBatch(db);
                item.photos.forEach((url: string) => {
                    const mediaRef = doc(collection(db, `artifacts/${appId}/staff/CHARLES_data/media_library`));
                    batch.set(mediaRef, { url, vehicleId: docRef.id, source: 'Import Order', status: 'assigned', uploadedAt: serverTimestamp() });
                });
                await batch.commit();
            }
            await updateDoc(doc(db, `artifacts/${appId}/staff/CHARLES_data/import_orders`, item.id), { isImported: true, linkedVehicleId: docRef.id });
            alert("✅ 匯入成功！");
        } catch (e) { alert("匯入失敗"); }
    };

    const handleDelete = async (item: any) => {
        if (item.isLocked || item.isImported) return alert("紀錄已鎖定或已匯入，無法刪除！");
        if (confirm("確定刪除此紀錄？")) {
            await deleteDoc(doc(db, `artifacts/${appId}/staff/CHARLES_data/import_orders`, item.id));
            if (selectedId === item.id) setSelectedId(null);
        }
    };

    const toggleLock = async (item: any) => {
        await updateDoc(doc(db, `artifacts/${appId}/staff/CHARLES_data/import_orders`, item.id), { isLocked: !item.isLocked });
    };

    const filteredHistory = history.filter(h => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (h.details?.model || '').toLowerCase().includes(q) || (h.details?.chassisNo || '').toLowerCase().includes(q);
        }
        return true;
    });

    const selectedItem = history.find(h => h.id === selectedId);

    // --- UI 渲染 ---
    return (
        <div className="bg-white md:bg-slate-100 h-full rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
            <QuotationPreview item={previewItem} onClose={() => setPreviewItem(null)} />
            
            {/* ★ 全螢幕相片放大與下載模態視窗 */}
            {zoomPhoto && (
                <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setZoomPhoto(null)}>
                    <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2" title="關閉"><X size={32}/></button>
                    <img src={zoomPhoto} className="max-w-full max-h-[75vh] object-contain mb-8 shadow-2xl rounded-lg border border-white/10 bg-black" onClick={e => e.stopPropagation()} />
                    <div className="flex gap-4">
                        <a href={zoomPhoto} download={`car_photo_${Date.now()}.jpg`} target="_blank" rel="noopener noreferrer" className="bg-white text-slate-900 px-6 py-3 rounded-full font-black shadow-xl flex items-center gap-2 hover:bg-slate-200 hover:scale-105 active:scale-95 transition-all" onClick={e => e.stopPropagation()}>
                            <Download size={18}/> 下載原圖
                        </a>
                    </div>
                </div>
            )}
            
            <div className="bg-slate-900 text-white p-3 flex justify-between items-center z-30 flex-none safe-area-top shadow-md">
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition" onClick={() => setView('dashboard')}>
                    <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg"><Ship size={18}/></div>
                    <span className="font-black text-sm md:text-lg tracking-tighter">海外訂車管家</span>
                </div>
                <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
                    {view === 'dashboard' && (
                        <label className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 cursor-pointer flex items-center gap-1 transition-colors border border-slate-600 shadow-inner">
                            <FileDown size={12}/> 搬家
                            <input type="file" accept=".json" onChange={handleMigrateOldData} className="hidden" />
                        </label>
                    )}
                </div>
            </div>

            <div className="flex-1 w-full relative min-h-0 flex">
                {view === 'dashboard' ? (
                    // ★ Master-Detail View (主從視圖)
                    <div className="flex w-full h-full">
                        {/* 左側列表 (Master) */}
                        <div className={`w-full md:w-80 lg:w-96 flex-none bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 ${selectedId && 'hidden md:flex'}`}>
                            <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
                                <button onClick={handleAddNew} className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-black text-sm flex justify-center items-center gap-2 hover:bg-blue-700 active:scale-95 transition shadow-sm"><Plus size={16}/> 新增報價單</button>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-xs transition-all shadow-sm" placeholder="搜尋型號或車身號碼..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {filteredHistory.map(item => {
                                    const st = STATUS_OPTIONS[item.status || 'QUOTING'];
                                    const isSelected = selectedId === item.id;
                                    return (
                                        <div key={item.id} onClick={() => setSelectedId(item.id)} className={`p-4 border-b border-slate-100 cursor-pointer transition-all border-l-4 ${isSelected ? 'bg-blue-50/80 border-l-blue-600' : 'hover:bg-slate-50 border-l-transparent'}`}>
                                            <div className="flex justify-between items-start mb-1.5">
                                                <div className="flex items-center gap-1.5"><span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${st.color}`}>{st.label}</span><span className="text-[9px] text-slate-400 font-bold">{item.date}</span></div>
                                                {item.isLocked && <Lock size={12} className="text-yellow-500"/>}
                                            </div>
                                            <div className="font-black text-slate-800 text-sm truncate">{item.details?.manufacturer || item.carInfo?.make} {item.details?.model || item.carInfo?.model}</div>
                                            <div className="flex justify-between items-end mt-2.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] text-slate-500 font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">{item.region}</span>
                                                    {item.photos?.length > 0 && (
                                                        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded" title="相片數量">
                                                            <ImageIcon size={10} className="text-slate-400"/> {item.photos.length}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="font-black text-blue-700 text-base tracking-tight">{fmt(item.results?.finalPrice)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredHistory.length === 0 && <div className="text-center py-10 text-slate-400 text-xs font-bold">無紀錄</div>}
                            </div>
                        </div>

                        {/* 右側詳情 (Detail - No Rolling Layout) */}
                        <div className={`flex-1 h-full bg-slate-50/50 flex flex-col p-4 md:p-6 lg:overflow-hidden overflow-y-auto ${!selectedId && 'hidden md:flex'}`}>
                            {selectedItem ? (
                                <div className="flex flex-col h-full w-full max-w-6xl mx-auto">
                                    <button onClick={() => setSelectedId(null)} className="md:hidden flex items-center gap-1 text-slate-500 font-bold text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm w-fit mb-3"><ArrowLeft size={14}/> 返回列表</button>
                                    
                                    {/* 頂部 Header */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 shrink-0 mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider border ${STATUS_OPTIONS[selectedItem.status || 'QUOTING'].color}`}>{STATUS_OPTIONS[selectedItem.status || 'QUOTING'].label}</span>
                                                <span className="bg-blue-100 text-blue-900 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">{selectedItem.region}</span>
                                                <span className="text-xs text-slate-400 font-bold ml-2">{selectedItem.date}</span>
                                            </div>
                                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedItem.details?.manufacturer || selectedItem.carInfo?.make} {selectedItem.details?.model || selectedItem.carInfo?.model} <span className="text-slate-500">{selectedItem.details?.year || selectedItem.carInfo?.year}</span></h2>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            <button onClick={() => handleImportToInventory(selectedItem)} className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 font-bold text-xs border shadow-sm ${selectedItem.isImported ? 'bg-white text-slate-500 border-slate-200' : 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 active:scale-95'}`}>{selectedItem.isImported ? <RotateCcw size={14}/> : <Database size={14}/>} {selectedItem.isImported ? '取消匯入' : '匯入主庫存'}</button>
                                            <button onClick={() => handleEdit(selectedItem)} className="px-3 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl transition flex items-center gap-1.5 font-bold text-xs shadow-sm active:scale-95"><Pencil size={14}/> 編輯</button>
                                            <button onClick={() => setPreviewItem(selectedItem)} className="px-3 py-2 bg-white text-blue-600 border border-slate-200 hover:bg-blue-50 rounded-xl transition flex items-center gap-1.5 font-bold text-xs shadow-sm active:scale-95"><Printer size={14}/> 列印</button>
                                            <button onClick={() => toggleLock(selectedItem)} className={`p-2 rounded-xl transition border shadow-sm active:scale-95 ${selectedItem.isLocked ? 'text-red-600 bg-red-50 border-red-200' : 'text-slate-400 bg-white hover:bg-slate-50 border-slate-200'}`}>{selectedItem.isLocked ? <Lock size={16}/> : <Unlock size={16}/>}</button>
                                            <button onClick={() => handleDelete(selectedItem)} disabled={selectedItem.isLocked} className="p-2 text-slate-400 bg-white hover:text-red-600 hover:bg-red-50 disabled:opacity-30 rounded-xl transition border border-slate-200 shadow-sm active:scale-95"><Trash2 size={16}/></button>
                                        </div>
                                    </div>

                                    {/* ★ 全新黃金比例排版：左邊 (佔 2 欄) 放相片與規格，右邊 (佔 1 欄) 放財務 */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                                        
                                        {/* 左側：相片畫廊 + 車輛規格 + 物流 (佔 2 欄，獨立滾動) */}
                                        <div className="lg:col-span-2 flex flex-col gap-5 overflow-y-auto pr-2 scrollbar-hide">
                                            
                                            {/* 相片畫廊 (置於車輛規格上方) */}
                                            {selectedItem.photos?.length > 0 && (
                                                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col shrink-0">
                                                    {/* ★ 修正：使用 object-contain 及限定高度，確保相片全貌顯示 */}
                                                    <div className="relative rounded-xl overflow-hidden bg-slate-100 group cursor-zoom-in flex items-center justify-center h-64 md:h-[320px]" onClick={() => setZoomPhoto(selectedItem.photos[selectedPhotoIdx])}>
                                                        <img src={selectedItem.photos[selectedPhotoIdx]} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 p-1" />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                                                            <div className="bg-white/95 text-slate-800 px-4 py-2 rounded-lg font-black text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg flex items-center gap-1.5 transform scale-95 group-hover:scale-100"><Search size={14}/> 點擊放大下載</div>
                                                        </div>
                                                    </div>
                                                    {selectedItem.photos.length > 1 && (
                                                        <div className="h-16 mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide shrink-0">
                                                            {selectedItem.photos.map((p: string, idx: number) => (
                                                                <div key={idx} onClick={() => setSelectedPhotoIdx(idx)} className={`w-20 h-full flex-none rounded-lg overflow-hidden cursor-pointer border-2 transition-all bg-slate-50 ${selectedPhotoIdx === idx ? 'border-blue-500 shadow-sm scale-95' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-95'}`}>
                                                                    <img src={p} className="w-full h-full object-cover" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 中欄：規格與運輸 */}
                                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 shrink-0">
                                                <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase mb-4 flex items-center gap-2"><Car size={18} className="text-blue-500"/> 車輛規格</h3>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-5 gap-x-4">
                                                    <div className="col-span-2"><span className="block text-[10px] font-bold text-slate-400 uppercase">車身號碼</span><span className="font-bold text-sm text-slate-800 break-all">{selectedItem.details?.chassisNo || selectedItem.details?.chassis || '-'}</span></div>
                                                    <div><span className="block text-[10px] font-bold text-slate-400 uppercase">排量(cc)</span><span className="font-bold text-sm text-slate-800">{selectedItem.details?.cc || selectedItem.details?.engineCapacity || '-'}</span></div>
                                                    <div><span className="block text-[10px] font-bold text-slate-400 uppercase">波箱</span><span className="font-bold text-sm text-slate-800">{selectedItem.details?.transmission || '-'}</span></div>
                                                    <div><span className="block text-[10px] font-bold text-slate-400 uppercase">咪數(km)</span><span className="font-bold text-sm text-slate-800">{formatNum(selectedItem.details?.mileage) || '-'}</span></div>
                                                    <div><span className="block text-[10px] font-bold text-slate-400 uppercase">外觀顏色</span><span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">{selectedItem.details?.exteriorColor && <div className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{backgroundColor: getColorHex(selectedItem.details.exteriorColor)}}></div>}{selectedItem.details?.exteriorColor || '-'}</span></div>
                                                    <div className="col-span-2"><span className="block text-[10px] font-bold text-slate-400 uppercase">內飾顏色</span><span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">{selectedItem.details?.interiorColor && <div className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{backgroundColor: getColorHex(selectedItem.details.interiorColor)}}></div>}{selectedItem.details?.interiorColor || '-'}</span></div>
                                                </div>
                                            </div>
                                            
                                            {selectedItem.details?.departureDate && (
                                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 shrink-0">
                                                    <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase mb-3 flex items-center gap-2"><Plane size={18} className="text-slate-500"/> 物流進度</h3>
                                                    <TransportProgressBar departureDate={selectedItem.details?.departureDate} durationDays={selectedItem.details?.shippingDuration} type={selectedItem.details?.transportType} />
                                                </div>
                                            )}
                                        </div>

                                        {/* 右側：財務結算 (佔 1 欄，高度填滿) */}
                                        <div className="lg:col-span-1 flex flex-col h-full bg-slate-900 rounded-2xl shadow-xl overflow-hidden text-white min-h-[400px]">
                                            <div className="p-5 border-b border-white/10 shrink-0">
                                                <h3 className="font-black text-blue-400 text-sm tracking-widest uppercase mb-4 flex items-center gap-2"><DollarSign size={18}/> 財務結算</h3>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end"><span className="text-xs text-slate-400 font-bold uppercase">當地車價</span><span className="font-mono text-sm">{REGION_CONFIGS[selectedItem.region]?.symbol}{formatNum(selectedItem.vals?.carPrice)}</span></div>
                                                    <div className="flex justify-between items-end"><span className="text-xs text-slate-400 font-bold uppercase">海關 A1 價</span><span className="font-mono text-sm">${formatNum(selectedItem.vals?.prp)}</span></div>
                                                </div>
                                            </div>
                                            <div className="p-5 bg-slate-800/50 border-b border-white/10 space-y-4 shrink-0">
                                                <div className="flex justify-between items-end"><span className="text-[10px] text-slate-400 font-bold uppercase">到港成本</span><span className="font-mono font-bold text-slate-200">{fmt(selectedItem.results?.landedCost)}</span></div>
                                                <div className="flex justify-between items-end"><span className="text-[10px] text-slate-400 font-bold uppercase">A1 入口稅</span><span className="font-mono font-bold text-slate-200">{fmt(selectedItem.results?.frtTax)}</span></div>
                                                <div className="flex justify-between items-end pt-3 border-t border-slate-700"><span className="text-xs text-slate-300 font-bold uppercase">總成本</span><span className="font-mono font-black text-lg text-emerald-400">{fmt(selectedItem.results?.totalCost)}</span></div>
                                            </div>
                                            <div className="p-5 bg-gradient-to-br from-blue-700 to-indigo-900 flex-1 flex flex-col justify-center text-center relative">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-blue-200 opacity-80">Final Quote</p>
                                                <p className="text-3xl xl:text-4xl font-black font-mono tracking-tighter drop-shadow-md">{fmt(selectedItem.results?.finalPrice)}</p>
                                                <p className="text-[10px] text-blue-200 font-bold mt-2">(利潤: {fmt(selectedItem.quote?.margin)})</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center h-full">
                                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-slate-300"><Ship size={40} className="text-slate-300"/></div>
                                    <p className="font-bold text-slate-600 mb-1">未選擇任何報價單</p>
                                    <p className="text-xs">請從左側列表選擇一筆紀錄，或點擊「新增報價單」。</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ================= 全螢幕：計算器 (編輯模式) ================= */
                    <div className="flex flex-col w-full h-full bg-slate-100 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm shrink-0">
                            <h2 className="font-black text-slate-800 text-lg flex items-center gap-2">{editingId ? <Pencil className="text-orange-500 w-5 h-5"/> : <Plus className="text-blue-500 w-5 h-5"/>} {editingId ? `編輯報價單 (${editingId.slice(0,6)})` : '新增報價單'}</h2>
                            <button onClick={() => setView('dashboard')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition flex items-center gap-2"><X size={16}/> 放棄並返回</button>
                        </div>

                        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                            <div className={`w-full md:w-[35%] h-full overflow-y-auto p-4 md:p-6 space-y-8 md:border-r border-slate-200 bg-white md:bg-transparent pb-32 md:pb-6 ${mobileTab!=='basic'?'hidden md:block':''}`}>
                                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">{Object.values(REGION_CONFIGS).map((c:any) => (<button key={c.id} onClick={()=>setRegion(c.id)} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${region===c.id?'bg-white text-blue-700 shadow-sm':'text-slate-500'}`}>{c.name}</button>))}</div>
                                <div>
                                    <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2 mb-4"><DollarSign className="w-5 h-5 text-blue-600" /><h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">核心價格</h3></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><InputField label={`當地車價 (${regData.currency})`} value={carPrice} onChange={(v:any)=>setCarPrice(formatNum(v))} prefix={regData.symbol} placeholder="0" /><div className="text-[9px] text-slate-400 font-bold mt-1 text-right">折合 {fmt(carPriceHKD)}</div></div>
                                        <div><InputField label="海關 A1 零售價 (HKD)" value={prpPrice} onChange={(v:any)=>setPrpPrice(formatNum(v))} prefix="$" placeholder="填入 A1 價" />{frtTax > 0 && <div className="text-[9px] text-red-500 font-bold mt-1 text-right">入口稅 {fmt(frtTax)}</div>}</div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2 mb-4"><Car className="w-5 h-5 text-slate-700" /><h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">車輛資料</h3></div>
                                    <div className="mb-4">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">車輛相片 (上傳雲端)</label>
                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                            {orderPhotos.map((url, i) => (
                                                <div key={i} className="relative w-16 h-12 rounded-md border border-slate-300 overflow-hidden flex-none">
                                                    {url === 'loading...' ? (
                                                        <div className="w-full h-full flex items-center justify-center bg-slate-100"><Loader2 className="w-4 h-4 animate-spin text-blue-500"/></div>
                                                    ) : (
                                                        <img src={url} className="w-full h-full object-cover" />
                                                    )}
                                                    <button onClick={() => setOrderPhotos(orderPhotos.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-500/80 text-white p-0.5 rounded-bl-md"><Trash2 size={10}/></button>
                                                </div>
                                            ))}
                                            <label className="w-16 h-12 rounded-md border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 flex-none"><UploadCloud size={16}/><input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" /></label>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4"><InputField label="品牌" value={carInfo.make} onChange={(v:any)=>setCarInfo({...carInfo, make:v})} list="makes_list" /><InputField label="型號" value={carInfo.model} onChange={(v:any)=>setCarInfo({...carInfo, model:v})} list="models_list" /></div>
                                        <div className="grid grid-cols-4 gap-3">
                                            <InputField label="年份" value={carInfo.year} onChange={(v:any)=>setCarInfo({...carInfo, year:v})} type="number" />
                                            <InputField label="代號" value={carInfo.code} onChange={(v:any)=>setCarInfo({...carInfo, code:v})} />
                                            <InputField label="外觀顏色" value={carInfo.exteriorColor} onChange={(v:any)=>setCarInfo({...carInfo, exteriorColor:v})} />
                                            <InputField label="內飾顏色" value={carInfo.interiorColor} onChange={(v:any)=>setCarInfo({...carInfo, interiorColor:v})} />
                                        </div>
                                        {region === 'JP' && (<div className="bg-slate-50 border border-slate-200 p-2 rounded-lg flex items-center gap-2"><span className="text-[9px] font-bold text-slate-500 whitespace-nowrap">🇯🇵 年號換算:</span><select value={jpEra} onChange={e=>setJpEra(e.target.value)} className="bg-transparent font-bold text-xs outline-none text-slate-700"><option value="Reiwa">令和</option><option value="Heisei">平成</option></select><input type="number" value={jpEraYear} onChange={e=>setJpEraYear(e.target.value)} className="w-10 bg-white border border-slate-300 rounded p-1 text-center font-bold text-xs outline-none" /><span className="text-blue-600 font-black text-xs ml-auto">{convertJpYear(jpEra, jpEraYear)}</span></div>)}
                                        <div className="grid grid-cols-4 gap-3">
                                            <div className="col-span-1"><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">波箱</label><select value={carInfo.transmission} onChange={e=>setCarInfo({...carInfo, transmission:e.target.value})} className="w-full bg-white md:bg-transparent border-b-2 border-slate-200 py-1 pl-1 text-sm font-bold text-slate-800 outline-none"><option value="AT">AT</option><option value="MT">MT</option></select></div>
                                            <InputField label="排量(cc)" value={carInfo.cc} onChange={(v:any)=>setCarInfo({...carInfo, cc:v})} />
                                            <InputField label="座位" value={carInfo.seats} onChange={(v:any)=>setCarInfo({...carInfo, seats:v})} />
                                            <InputField label="咪數(km)" value={formatNum(carInfo.mileage)} onChange={(v:any)=>setCarInfo({...carInfo, mileage:v})} />
                                        </div>
                                        <InputField label="車身號碼 (Chassis)" value={carInfo.chassis} onChange={(v:any)=>setCarInfo({...carInfo, chassis:v.toUpperCase()})} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2 mb-4"><Plane className="w-5 h-5 text-slate-700" /><h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">運輸資訊</h3></div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-1"><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">方式</label><select value={transport.type} onChange={e=>setTransport({...transport, type: e.target.value})} className="w-full bg-white md:bg-transparent border-b-2 border-slate-200 py-1 pl-1 text-sm font-bold text-slate-800 outline-none"><option value="SEA">船運</option><option value="AIR">空運</option></select></div>
                                        <div className="col-span-2"><InputField label="出發日期" type="date" value={transport.departureDate} onChange={(v:any)=>setTransport({...transport, departureDate: v})} /></div>
                                        <div className="col-span-3"><InputField label="需時 (天)" type="number" value={transport.duration} onChange={(v:any)=>setTransport({...transport, duration: v})} /></div>
                                    </div>
                                </div>
                            </div>
                            <div className={`w-full md:w-[40%] h-full overflow-y-auto p-4 md:p-6 space-y-8 bg-slate-50/50 pb-32 md:pb-6 md:border-r border-slate-200 ${mobileTab!=='fees'?'hidden md:block':''}`}>
                                <div>
                                    <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2 mb-4"><ShieldCheck className="w-5 h-5 text-indigo-500" /><h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">出牌與智能保險</h3></div>
                                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mb-6 shadow-sm">
                                        <div className="flex justify-between items-center mb-3"><div className="flex bg-white rounded p-0.5 border border-indigo-200"><button onClick={()=>setInsType('3rd')} className={`px-4 py-1 text-xs font-bold rounded ${insType==='3rd'?'bg-indigo-600 text-white':'text-indigo-400'}`}>三保</button><button onClick={()=>setInsType('comp')} className={`px-4 py-1 text-xs font-bold rounded ${insType==='comp'?'bg-indigo-600 text-white':'text-indigo-400'}`}>全保</button></div><span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-3 py-1 rounded-lg">NCD: {insNCD}%</span></div>
                                        <input type="range" min="0" max="60" step="10" value={insNCD} onChange={e=>setInsNCD(Number(e.target.value))} className="w-full accent-indigo-600 mb-4"/>
                                        <div className="flex justify-between items-center pt-3 border-t border-indigo-100"><span className="text-sm font-bold text-indigo-700">AI 預估保費</span><span className="text-2xl font-black font-mono text-indigo-700">{fmt(estIns)}</span></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6 mb-4"><InputField label="牌費" value={formatNum(hkLicenseFees.fee)} onChange={(v:any)=>setHkLicenseFees({...hkLicenseFees, fee: v})} /><InputField label="實際保費" value={formatNum(hkLicenseFees.insurance || estIns.toString())} onChange={(v:any)=>setHkLicenseFees({...hkLicenseFees, insurance: v})} /></div>
                                    <div className="flex justify-between items-center text-sm font-bold text-red-600 bg-red-50 p-3 rounded-lg border border-red-100"><span>首次登記稅 (FRT)</span><span className="font-mono">{fmt(frtTax)}</span></div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2 mb-4"><Globe className="w-5 h-5 text-emerald-500" /><h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">其他雜費</h3></div>
                                    <div className="mb-6"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 block">當地雜費 ({regData.currency})</span><div className="grid grid-cols-3 gap-x-4 gap-y-6">{Object.entries(originFees).map(([k, v]:any) => (<InputField key={k} label={k} value={formatNum(v)} onChange={(val:any)=>setOriginFees({...originFees, [k]: val})} />))}</div></div>
                                    <div className="pt-4 border-t border-slate-200"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 block">香港雜費 (HKD)</span><div className="grid grid-cols-3 gap-x-4 gap-y-6">{Object.entries(hkMiscFees).map(([k, v]:any) => (<InputField key={k} label={k} value={formatNum(v)} onChange={(val:any)=>setHkMiscFees({...hkMiscFees, [k]: val})} />))}</div></div>
                                </div>
                            </div>
                            <div className={`w-full md:w-[25%] h-full flex flex-col overflow-y-auto p-4 md:p-6 bg-white pb-32 md:pb-6 ${mobileTab!=='result'?'hidden md:flex' : ''}`}>
                                <div className="flex-1 space-y-6">
                                    <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2 mb-4 flex-none"><Zap className="w-5 h-5 text-amber-500" /><h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">報價結算</h3></div>
                                    <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl space-y-4"><div className="flex justify-between items-center border-b border-white/10 pb-2"><span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">到港成本</span> <span className="text-xl font-mono font-black">{fmt(landedCost)}</span></div><div className="flex justify-between items-center"><span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">總成本</span> <span className="text-2xl font-mono font-black text-blue-400">{fmt(totalCost)}</span></div></div>
                                    <div className="p-4 bg-emerald-50 rounded-3xl border border-emerald-100 space-y-3"><div className="flex justify-between items-center"><label className="text-xs font-black text-emerald-800">期望利潤</label> <div className="relative w-24"><span className="absolute left-2 top-1 text-[10px] text-emerald-400">$</span><input type="text" value={margin} onChange={e=>setMargin(formatNum(e.target.value))} className="w-full bg-white border border-emerald-200 rounded-lg p-1.5 pl-5 text-right font-mono font-bold text-emerald-700 text-sm outline-none" /></div></div><input type="range" min="0" max="200000" step="5000" value={parseNum(margin)} onChange={e=>setMargin(formatNum(e.target.value))} className="w-full accent-emerald-500 mt-2"/></div>
                                    <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-6 rounded-3xl shadow-2xl text-white text-center relative overflow-hidden"><div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div><p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-blue-100 opacity-80">Final Quote</p><p className="text-4xl lg:text-5xl font-black font-mono tracking-tighter drop-shadow-lg">{fmt(finalPrice)}</p></div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-slate-100 flex-none sticky bottom-0 bg-white pb-2 hidden md:block z-10"><button onClick={handleSave} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2"><Save size={20}/> {editingId ? '更新並返回' : '儲存紀錄'}</button></div>
                            </div>
                        </div>

                        {/* Mobile Actions for Calc */}
                        <div className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900 text-white p-4 flex justify-between items-center z-50 rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.3)] safe-area-bottom">
                            <div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Live Cost</p><p className="text-xl font-black font-mono text-blue-400 leading-none">{fmt(totalCost)}</p></div>
                            <div className="flex gap-2">{mobileTab !== 'basic' && <button onClick={() => setMobileTab(mobileTab === 'result' ? 'fees' : 'basic')} className="p-3 bg-slate-800 rounded-xl"><ArrowLeft size={16}/></button>}{mobileTab !== 'result' ? (<button onClick={() => setMobileTab(mobileTab === 'basic' ? 'fees' : 'result')} className="px-6 py-3 bg-white text-slate-900 rounded-xl font-black text-sm flex items-center">下一步 <ArrowRight size={16} className="ml-1"/></button>) : (<button onClick={handleSave} className="px-6 py-3 bg-green-600 text-white rounded-xl font-black text-sm flex items-center"><Save size={16} className="mr-1"/> 儲存</button>)}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
