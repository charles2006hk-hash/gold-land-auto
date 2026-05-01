'use client';

import React, { useState, useEffect } from 'react';
import { 
  List, Save, Ship, Car, 
  DollarSign, Trash2, ArrowRight, ArrowLeft, 
  ShieldCheck, Globe, CheckCircle, Search,
  Plane, Cog, RotateCcw, Zap, CreditCard, Anchor, Pencil, Lock, Unlock, FileSignature, Printer, ImageIcon, UploadCloud, Database, X, Eye, FileDown, Download
} from 'lucide-react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from "firebase/firestore";

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
// 外部輔助函數與組件
// ==========================================
const fmt = (n: number) => new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', maximumFractionDigits: 0 }).format(n || 0);
const formatNum = (val: string) => val.replace(/[^0-9.]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const parseNum = (val: string) => Number(String(val).replace(/,/g, '')) || 0;
const getFeeTotal = (feeObj: any) => { if (!feeObj) return 0; return Object.values(feeObj).reduce((sum: number, val: any) => sum + parseNum(String(val)), 0); };

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

// 簡約輸入框組件
const InputField = ({ label, value, onChange, prefix, placeholder, list, type = 'text', readOnly = false }: any) => (
    <div className="flex flex-col gap-0.5 w-full">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
        <div className="relative group">
            {prefix && <span className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">{prefix}</span>}
            <input readOnly={readOnly} type={type} list={list} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`w-full bg-white border-b-2 border-slate-200 py-1 ${prefix?'pl-4':'pl-1'} pr-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 transition-colors md:bg-transparent md:border-b-2 md:rounded-none rounded-lg shadow-sm md:shadow-none`} />
        </div>
    </div>
);

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

// PDF 預覽模態視窗
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
                                <p><span className="text-slate-500 w-24 inline-block font-bold">Model:</span> <span className="font-black text-lg">{item.details.manufacturer || item.details.make} {item.details.model}</span></p>
                                <p><span className="text-slate-500 w-24 inline-block">Year:</span> <span className="font-bold">{item.details.year}</span></p>
                                <p><span className="text-slate-500 w-24 inline-block">Chassis:</span> <span className="font-mono">{item.details.chassisNo || item.details.chassis || 'TBC'}</span></p>
                                <p><span className="text-slate-500 w-24 inline-block">Color:</span> <span className="font-bold">{item.details.exteriorColor}</span></p>
                            </div>
                        </div>
                        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-2">Transport Info</h3>
                            <p className="text-xs font-bold">Shipping: {item.details.transportType === 'SEA' ? '船運 (Sea Freight)' : '空運 (Air Freight)'}</p>
                            <p className="text-xs text-slate-500 mt-1">Departure: {item.details.departureDate || 'TBC'}</p>
                        </div>
                    </div>

                    <table className="w-full text-sm mb-10">
                        <thead className="bg-slate-800 text-white">
                            <tr><th className="p-3 text-left uppercase tracking-widest text-[10px]">Description</th><th className="p-3 text-right uppercase tracking-widest text-[10px]">Amount</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr><td className="p-3 font-bold">車輛到港成本 (含海外雜費及船運)</td><td className="p-3 text-right font-mono">{fmt(item.results.landedCost)}</td></tr>
                            <tr><td className="p-3">政府首次登記稅 (FRT)</td><td className="p-3 text-right font-mono">{fmt(item.results.frtTax)}</td></tr>
                            <tr><td className="p-3">出牌、保險及其他本地雜費</td><td className="p-3 text-right font-mono">{fmt(item.results.totalCost - item.results.landedCost)}</td></tr>
                            <tr className="bg-slate-50"><td className="p-4 font-black text-lg">Final Quotation (總報價)</td><td className="p-4 text-right font-black text-2xl text-blue-700">{fmt(item.results.finalPrice)}</td></tr>
                        </tbody>
                    </table>

                    <div className="mt-auto border-t-2 border-slate-200 pt-10 grid grid-cols-2 gap-20">
                        <div className="text-center pt-8 border-t border-slate-800">
                            <p className="text-[10px] font-bold uppercase">For and on behalf of Gold Land Auto</p>
                        </div>
                        <div className="text-center pt-8 border-t border-slate-800">
                            <p className="text-[10px] font-bold uppercase">Customer Confirmation</p>
                        </div>
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
    const [view, setView] = useState<'calc' | 'history'>('calc');
    const [mobileTab, setMobileTab] = useState<'basic' | 'fees' | 'result'>('basic');
    const [history, setHistory] = useState<any[]>([]);
    const [previewItem, setPreviewItem] = useState<any | null>(null);

    // 狀態變量
    const [editingId, setEditingId] = useState<string | null>(null);
    const [region, setRegion] = useState('JP');
    const [carPrice, setCarPrice] = useState('');
    const [prpPrice, setPrpPrice] = useState('');
    
    // 車輛資料
    const [carInfo, setCarInfo] = useState({ 
        make: '', model: '', year: '', code: '', 
        exteriorColor: '', interiorColor: '', 
        transmission: 'AT', cc: '', seats: '', mileage: '', chassis: '' 
    });
    
    // 相片陣列
    const [orderPhotos, setOrderPhotos] = useState<string[]>([]);
    const [transport, setTransport] = useState({ type: 'SEA', departureDate: '', duration: '' });
    const [margin, setMargin] = useState('30000');
    
    // 將 originFees 宣告為 any 避免 TS 報錯
    const [originFees, setOriginFees] = useState<any>(REGION_CONFIGS['JP'].origin);
    const [hkMiscFees, setHkMiscFees] = useState<any>(REGION_CONFIGS['JP'].hk_misc);
    const [hkLicenseFees, setHkLicenseFees] = useState<any>(REGION_CONFIGS['JP'].hk_license);

    const [insType, setInsType] = useState<'3rd'|'comp'>('comp');
    const [insNCD, setInsNCD] = useState(0);

    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [jpEra, setJpEra] = useState('Reiwa');
    const [jpEraYear, setJpEraYear] = useState('');

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

    // 載入歷史紀錄
    useEffect(() => {
        if (!db || !appId) return;
        const q = query(collection(db, `artifacts/${appId}/staff/CHARLES_data/import_orders`));
        return onSnapshot(q, (snap) => {
            setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a:any, b:any) => b.ts - a.ts));
        });
    }, [db, appId]);

    // ★ 數據搬家小工具 (處理從另一個 Firebase 導出的 JSON)
    const handleMigrateOldData = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file || !db) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const rawData = JSON.parse(event.target?.result as string);
                const list = Array.isArray(rawData) ? rawData : (rawData.import_orders || []);
                if (list.length === 0) return alert("檔案中找不到有效訂單數據");
                
                if (confirm(`準備匯入 ${list.length} 筆舊系統數據，確定嗎？`)) {
                    const batch = writeBatch(db);
                    list.forEach((oldItem: any) => {
                        const newRef = doc(collection(db, `artifacts/${appId}/staff/CHARLES_data/import_orders`));
                        batch.set(newRef, {
                            ...oldItem,
                            migratedFromOldApp: true,
                            importTs: Date.now()
                        });
                    });
                    await batch.commit();
                    alert(`✅ 成功搬遷 ${list.length} 筆數據！`);
                }
            } catch (err) { alert("檔案解析失敗，請確保是正確的 JSON 格式"); }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    };

    const handlePhotoUpload = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 800;
                let w = img.width, h = img.height;
                if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } } 
                else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                setOrderPhotos(prev => [...prev, dataUrl]);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!carPrice || !prpPrice) return alert("請填寫基本車價與 PRP");
        
        if (carInfo.make && !(settings?.makes || []).includes(carInfo.make)) updateSettings('makes', [...(settings?.makes || []), carInfo.make]);
        if (carInfo.exteriorColor && !(settings?.colors || []).includes(carInfo.exteriorColor)) updateSettings('colors', [...(settings?.colors || []), carInfo.exteriorColor]);

        const record = {
            ts: Date.now(), date: new Date().toLocaleDateString('zh-HK'),
            region, 
            details: { ...carInfo, transportType: transport.type, departureDate: transport.departureDate, shippingDuration: transport.duration }, 
            vals: { carPrice: parseNum(carPrice), prp: parseNum(prpPrice), rate: currentRate },
            fees: { origin: originFees, hk_misc: hkMiscFees, hk_license: hkLicenseFees, finalInsurance: finalIns },
            results: { carPriceHKD, totalOriginHKD, totalHkMisc, totalHkLicense, landedCost, totalCost, finalPrice, frtTax },
            quote: { margin: parseNum(margin), finalPrice },
            photos: orderPhotos, status: editingId ? (history.find(h=>h.id===editingId)?.status || 'QUOTING') : 'QUOTING', createdBy: staffId
        };

        try {
            if (editingId) {
                await updateDoc(doc(db, `artifacts/${appId}/staff/CHARLES_data/import_orders`, editingId), record);
                alert("✅ 紀錄已成功更新！");
                setEditingId(null);
            } else {
                await addDoc(collection(db, `artifacts/${appId}/staff/CHARLES_data/import_orders`), { ...record, timestamp: serverTimestamp() });
                alert("✅ 新報價紀錄已存檔！");
            }
            setView('history');
            setOrderPhotos([]);
        } catch (e) { alert("儲存失敗"); }
    };

    // ★ 匯入主系統 (Inventory) 邏輯
    const handleImportToInventory = async (item: any) => {
        if (!db || !appId) return;
        
        if (item.isImported) {
            if (!confirm("確定要取消匯入？這將會從主庫存中刪除該車輛，但保留此處的報價紀錄。")) return;
            try {
                if (item.linkedVehicleId) {
                    await deleteDoc(doc(db, `artifacts/${appId}/staff/CHARLES_data/inventory`, item.linkedVehicleId));
                }
                await updateDoc(doc(db, `artifacts/${appId}/staff/CHARLES_data/import_orders`, item.id), {
                    isImported: false, linkedVehicleId: null
                });
                alert("✅ 已取消匯入，車輛已從主庫存移除。");
            } catch (e) { alert("操作失敗"); }
        } else {
            if (!confirm("確定將此訂單匯入至主系統庫存？這會自動建立一台新車資料。")) return;
            try {
                const vehicleData = {
                    regMark: '',
                    make: item.details.manufacturer || item.details.make || '',
                    model: item.details.model || '',
                    year: item.details.year || '',
                    chassisNo: item.details.chassisNo || item.details.chassis || '',
                    engineNo: '',
                    colorExt: item.details.exteriorColor || '',
                    colorInt: item.details.interiorColor || '',
                    transmission: item.details.transmission || 'AT',
                    engineSize: parseNum(item.details.engineCapacity || item.details.cc),
                    seating: parseNum(item.details.seats),
                    mileage: parseNum(item.details.mileage),
                    price: item.results.finalPrice, 
                    costPrice: item.results.totalCost, 
                    status: 'In Stock',
                    stockInDate: new Date().toISOString().split('T')[0],
                    purchaseType: 'New',
                    sourceType: 'own',
                    managedBy: staffId,
                    acquisition: {
                        type: 'Import',
                        vendor: `${item.region} 海外供應商`,
                        currency: REGION_CONFIGS[item.region].currency,
                        exchangeRate: item.vals.rate,
                        foreignPrice: item.vals.carPrice,
                        portFee: item.results.totalHkMisc,
                        a1Price: item.vals.prp,
                        frtTax: item.results.frtTax,
                        eta: item.details.departureDate,
                        paymentStatus: 'Unpaid',
                        payments: []
                    },
                    photos: item.photos || [],
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };

                const docRef = await addDoc(collection(db, `artifacts/${appId}/staff/CHARLES_data/inventory`), vehicleData);
                
                await updateDoc(doc(db, `artifacts/${appId}/staff/CHARLES_data/import_orders`, item.id), {
                    isImported: true, linkedVehicleId: docRef.id
                });
                alert("✅ 成功匯入至主系統庫存！您可以去「車輛管理」查看。");
            } catch (e) { console.error(e); alert("匯入失敗"); }
        }
    };

    const handleEdit = (item: any) => {
        setEditingId(item.id);
        setRegion(item.region);
        setCarPrice(formatNum(String(item.vals.carPrice)));
        setPrpPrice(formatNum(String(item.vals.prp)));
        
        setCarInfo({
            make: item.details.manufacturer || item.details.make || '', model: item.details.model || '', year: item.details.year || '',
            code: item.details.code || '', exteriorColor: item.details.exteriorColor || '', interiorColor: item.details.interiorColor || '',
            transmission: item.details.transmission || 'AT', cc: item.details.engineCapacity || item.details.cc || '', seats: item.details.seats || '',
            mileage: item.details.mileage || '', chassis: item.details.chassisNo || item.details.chassis || ''
        });
        setJpEra('Reiwa'); setJpEraYear('');

        setOrderPhotos(item.photos || []);
        setTransport({ type: item.details.transportType || 'SEA', departureDate: item.details.departureDate || '', duration: item.details.shippingDuration || '' });
        setOriginFees(item.fees.origin); setHkMiscFees(item.fees.hk_misc); setHkLicenseFees(item.fees.hk_license);
        setMargin(formatNum(String(item.quote.margin)));
        setView('calc');
    };

    const handleDelete = async (item: any) => {
        if (item.isLocked) return alert("紀錄已鎖定，無法刪除！");
        if (item.isImported) return alert("此紀錄已匯入主庫存，請先取消匯入。");
        if (!confirm("確定刪除此紀錄？")) return;
        await deleteDoc(doc(db, `artifacts/${appId}/staff/CHARLES_data/import_orders`, item.id));
    };

    const toggleLock = async (item: any) => {
        await updateDoc(doc(db, `artifacts/${appId}/staff/CHARLES_data/import_orders`, item.id), { isLocked: !item.isLocked });
    };

    const filteredHistory = history.filter(h => {
        if (filterStatus !== 'ALL' && h.status !== filterStatus) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (h.details.model || '').toLowerCase().includes(q) || (h.details.chassisNo || h.details.chassis || '').toLowerCase().includes(q);
        }
        return true;
    });

    // --- UI 渲染 ---
    return (
        <div className="bg-white md:bg-slate-100 h-full rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
            <QuotationPreview item={previewItem} onClose={() => setPreviewItem(null)} />
            
            <div className="bg-slate-900 text-white p-3 flex justify-between items-center z-30 flex-none safe-area-top">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg"><Ship size={18}/></div>
                    <span className="font-black text-sm md:text-lg tracking-tighter">海外訂車管家</span>
                </div>
                <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
                    {view === 'history' && (
                        <label className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 cursor-pointer flex items-center gap-1 transition-colors border border-slate-600 shadow-inner">
                            <FileDown size={12}/> 搬家
                            <input type="file" accept=".json" onChange={handleMigrateOldData} className="hidden" />
                        </label>
                    )}
                    <button onClick={() => setView('calc')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view==='calc' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>算帳</button>
                    <button onClick={() => setView('history')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view==='history' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>紀錄 ({history.length})</button>
                </div>
            </div>

            {editingId && view === 'calc' && (
                <div className="bg-orange-100 border-b border-orange-300 text-orange-800 px-4 py-2 text-xs font-bold flex justify-between items-center z-20 shrink-0">
                    <span className="flex items-center"><Pencil size={14} className="mr-1"/> 正在修改報價單 ({editingId.slice(0,6)})</span>
                    <button onClick={() => {setEditingId(null); setView('history'); setOrderPhotos([]);}} className="underline">放棄修改</button>
                </div>
            )}

            {view === 'calc' && (
                <div className="md:hidden flex bg-white border-b border-slate-200 p-1 gap-1 shrink-0 z-20">
                    <button onClick={()=>setMobileTab('basic')} className={`flex-1 py-2 text-xs font-bold rounded-md ${mobileTab==='basic'?'bg-slate-100 text-blue-700':'text-slate-400'}`}>1. 規格</button>
                    <button onClick={()=>setMobileTab('fees')} className={`flex-1 py-2 text-xs font-bold rounded-md ${mobileTab==='fees'?'bg-slate-100 text-blue-700':'text-slate-400'}`}>2. 雜費</button>
                    <button onClick={()=>setMobileTab('result')} className={`flex-1 py-2 text-xs font-bold rounded-md ${mobileTab==='result'?'bg-slate-100 text-blue-700':'text-slate-400'}`}>3. 報價</button>
                </div>
            )}

            {/* 核心內容區 (鎖死高度，獨立捲動) */}
            <div className="flex-1 w-full relative min-h-0 flex flex-col md:flex-row">
                
                {view === 'history' ? (
                    <div className="w-full h-full flex flex-col bg-slate-50/50 overflow-hidden">
                        
                        {/* 頂部過濾與搜尋 */}
                        <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-sm z-10 flex-none">
                            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide w-full sm:w-auto">
                                <button onClick={() => setFilterStatus('ALL')} className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition whitespace-nowrap ${filterStatus === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>全部</button>
                                <button onClick={() => setFilterStatus('QUOTING')} className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition whitespace-nowrap ${filterStatus === 'QUOTING' ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-white text-slate-500 border-slate-200'}`}>報價中</button>
                                <button onClick={() => setFilterStatus('IN_PROGRESS')} className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition whitespace-nowrap ${filterStatus === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-white text-slate-500 border-slate-200'}`}>進行中</button>
                                <button onClick={() => setFilterStatus('DELIVERED')} className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition whitespace-nowrap ${filterStatus === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white text-slate-500 border-slate-200'}`}>已交貨</button>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none font-bold text-xs" placeholder="搜尋型號或車身號碼..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                        </div>

                        {/* 列表內容 */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-6xl mx-auto w-full">
                            {filteredHistory.map(item => {
                                const st = STATUS_OPTIONS[item.status || 'QUOTING'];
                                const borderCol = item.isLocked ? 'border-l-yellow-400' : (item.status === 'IN_PROGRESS' ? 'border-l-orange-400' : (item.status === 'DELIVERED' ? 'border-l-emerald-400' : 'border-l-slate-400'));
                                const bgCol = item.isLocked ? 'bg-yellow-50/20' : 'bg-white';

                                return (
                                    <div key={item.id} className={`p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all border-l-8 ${borderCol} ${bgCol} flex flex-col`}>
                                        
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1 flex gap-4">
                                                {/* 縮圖預覽 */}
                                                <div className="w-20 h-16 rounded-lg bg-slate-100 border border-slate-200 flex-none overflow-hidden flex items-center justify-center">
                                                    {item.photos && item.photos.length > 0 ? (
                                                        <img src={item.photos[0]} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon size={20} className="text-slate-300"/>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider border ${st.color}`}>{st.label}</span>
                                                        <span className="bg-blue-100 text-blue-900 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider border border-blue-200">{item.region}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold">{item.date}</span>
                                                    </div>
                                                    <div className="font-black text-slate-900 text-xl tracking-tight leading-tight truncate">
                                                        {item.details?.manufacturer || item.carInfo?.make} {item.details?.model || item.carInfo?.model} <span className="font-bold text-slate-500 text-lg">{item.details?.year || item.carInfo?.year}</span>
                                                    </div>
                                                    
                                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                                        {item.details.transmission && <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] flex items-center text-slate-600 font-bold"><Cog size={12} className="mr-1"/>{item.details.transmission}</span>}
                                                        {item.details.mileage && <span className="bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded text-[10px] flex items-center text-orange-700 font-bold"><RotateCcw size={12} className="mr-1"/>{formatNum(item.details.mileage)} km</span>}
                                                        {item.details.exteriorColor && <span className="flex items-center text-[10px] text-slate-600 font-bold ml-1"><div className="w-2.5 h-2.5 rounded-full border border-slate-300 mr-1" style={{backgroundColor: getColorHex(item.details.exteriorColor)}}></div>{item.details.exteriorColor}</span>}
                                                        {item.details.interiorColor && <span className="flex items-center text-[10px] text-slate-600 font-bold ml-1"><div className="w-2.5 h-2.5 rounded-full border border-slate-300 mr-1" style={{backgroundColor: getColorHex(item.details.interiorColor)}}></div>{item.details.interiorColor}</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 操作按鈕 */}
                                            <div className="flex flex-col items-end gap-2 ml-4">
                                                <div className="flex gap-1.5 flex-wrap justify-end">
                                                    <button onClick={() => handleImportToInventory(item)} className={`p-1.5 rounded-lg transition flex items-center gap-1 font-bold text-[10px] border shadow-sm ${item.isImported ? 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`} title={item.isImported ? "取消匯入" : "匯入至車輛庫存"}>
                                                        {item.isImported ? <RotateCcw className="w-4 h-4"/> : <Database className="w-4 h-4"/>} 
                                                        <span className="hidden sm:inline">{item.isImported ? '取消匯入' : '匯入主庫存'}</span>
                                                    </button>
                                                    <button onClick={() => setPreviewItem(item)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition" title="預覽報價單"><Eye className="w-4 h-4"/></button>
                                                    <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1 font-bold text-[10px] border border-slate-200"><Pencil className="w-4 h-4"/> <span className="hidden sm:inline">編輯</span></button>
                                                    <button onClick={() => toggleLock(item)} className={`p-1.5 rounded-lg transition border ${item.isLocked ? 'text-red-600 bg-red-50 border-red-200' : 'text-slate-400 bg-white hover:bg-slate-100 border-slate-200'}`} title={item.isLocked?"解鎖":"鎖定"}>{item.isLocked ? <Lock className="w-4 h-4"/> : <Unlock className="w-4 h-4"/>}</button>
                                                    <button onClick={() => handleDelete(item)} disabled={item.isLocked} className="p-1.5 text-slate-400 bg-white hover:text-red-600 hover:bg-red-50 disabled:opacity-30 rounded-lg transition border border-slate-200" title="刪除"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-2">
                                            <TransportProgressBar departureDate={item.details.departureDate} durationDays={item.details.shippingDuration} type={item.details.transportType} />
                                        </div>

                                        {/* 底部價格摘要 */}
                                        <div className="flex justify-between items-end border-t border-slate-100 pt-3 mt-1">
                                            <div className="text-[10px] text-slate-500 font-bold space-y-0.5">
                                                <div>到港: <span className="text-slate-800">{fmt(item.results.landedCost)}</span></div>
                                                <div>A1稅: <span className="text-slate-800">{fmt(item.results.frtTax)}</span></div>
                                            </div>
                                            <div className="text-3xl font-black text-blue-700 tracking-tighter">{fmt(item.results.finalPrice)}</div>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredHistory.length === 0 && <div className="text-center py-20 text-slate-400 font-bold border-2 border-dashed border-slate-300 rounded-2xl">暫無紀錄</div>}
                        </div>
                    </div>
                ) : (
                    /* ================= 桌面版：左中右 三欄聯動版面 ================= */
                    <div className="flex flex-col md:flex-row h-full min-h-0 w-full">
                        
                        {/* 🟥 左欄：車輛資料與運輸 (固定 35% 闊度) */}
                        <div className={`w-full md:w-[35%] h-full overflow-y-auto p-4 md:p-6 space-y-8 md:border-r border-slate-200 bg-white md:bg-transparent pb-32 md:pb-6 ${mobileTab!=='basic'?'hidden md:block':''}`}>
                            
                            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                                {Object.values(REGION_CONFIGS).map((c:any) => (
                                    <button key={c.id} onClick={()=>setRegion(c.id)} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${region===c.id?'bg-white text-blue-700 shadow-sm':'text-slate-500'}`}>{c.name}</button>
                                ))}
                            </div>

                            {/* 核心價格 (移至最左側) */}
                            <div>
                                <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2 mb-4">
                                    <DollarSign className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">核心價格</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <InputField label={`當地車價 (${regData.currency})`} value={carPrice} onChange={(v:any)=>setCarPrice(formatNum(v))} prefix={regData.symbol} placeholder="0" />
                                        <div className="text-[9px] text-slate-400 font-bold mt-1 text-right">折合 {fmt(carPriceHKD)}</div>
                                    </div>
                                    <div>
                                        <InputField label="海關 A1 零售價 (HKD)" value={prpPrice} onChange={(v:any)=>setPrpPrice(formatNum(v))} prefix="$" placeholder="填入 A1 價" />
                                        {frtTax > 0 && <div className="text-[9px] text-red-500 font-bold mt-1 text-right">入口稅 {fmt(frtTax)}</div>}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2 mb-4">
                                    <Car className="w-5 h-5 text-slate-700" />
                                    <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">車輛資料</h3>
                                </div>
                                
                                {/* 圖片上傳 */}
                                <div className="mb-4">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">車輛相片 (自動壓縮)</label>
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                        {orderPhotos.map((url, i) => (
                                            <div key={i} className="relative w-16 h-12 rounded-md border border-slate-300 overflow-hidden flex-none">
                                                <img src={url} className="w-full h-full object-cover" />
                                                <button onClick={() => setOrderPhotos(orderPhotos.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-500/80 text-white p-0.5 rounded-bl-md"><Trash2 size={10}/></button>
                                            </div>
                                        ))}
                                        <label className="w-16 h-12 rounded-md border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 flex-none">
                                            <UploadCloud size={16}/>
                                            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="品牌" value={carInfo.make} onChange={(v:any)=>setCarInfo({...carInfo, make:v})} list="makes_list" placeholder="選擇或輸入..." />
                                        <datalist id="makes_list">{settings?.makes?.map((m:any) => <option key={m} value={m}/>)}</datalist>
                                        
                                        <InputField label="型號" value={carInfo.model} onChange={(v:any)=>setCarInfo({...carInfo, model:v})} list="models_list" placeholder="選擇或輸入..." />
                                        <datalist id="models_list">{(settings?.models?.[carInfo.make] || []).map((m:any) => <option key={m} value={m}/>)}</datalist>
                                    </div>

                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="col-span-2 sm:col-span-1">
                                            <InputField label="年份" value={carInfo.year} onChange={(v:any)=>setCarInfo({...carInfo, year:v})} type="number" placeholder="2024" />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <InputField label="代號" value={carInfo.code} onChange={(v:any)=>setCarInfo({...carInfo, code:v})} placeholder="AH30" />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <InputField label="外觀顏色" value={carInfo.exteriorColor} onChange={(v:any)=>setCarInfo({...carInfo, exteriorColor:v})} list="colors_list" placeholder="e.g. White" />
                                            <datalist id="colors_list">{settings?.colors?.map((c:any) => <option key={c} value={c}/>)}</datalist>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <InputField label="內飾顏色" value={carInfo.interiorColor} onChange={(v:any)=>setCarInfo({...carInfo, interiorColor:v})} list="colors_list" placeholder="e.g. Black" />
                                        </div>
                                    </div>

                                    {/* 日本年號輔助 */}
                                    {region === 'JP' && (
                                        <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-slate-500 whitespace-nowrap">🇯🇵 年號換算:</span>
                                            <select value={jpEra} onChange={e=>setJpEra(e.target.value)} className="bg-transparent font-bold text-xs outline-none text-slate-700"><option value="Reiwa">令和</option><option value="Heisei">平成</option></select>
                                            <input type="number" value={jpEraYear} onChange={e=>setJpEraYear(e.target.value)} className="w-10 bg-white border border-slate-300 rounded p-1 text-center font-bold text-xs outline-none" placeholder="年" />
                                            <span className="text-blue-600 font-black text-xs ml-auto">{convertJpYear(jpEra, jpEraYear)}</span>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">波箱 (Trans)</label>
                                            <select value={carInfo.transmission} onChange={e=>setCarInfo({...carInfo, transmission:e.target.value})} className="w-full bg-white md:bg-transparent border-b-2 border-slate-200 py-1.5 md:py-1 pl-1 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 rounded-lg md:rounded-none">
                                                <option value="AT">AT (自動)</option><option value="MT">MT (手動)</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <InputField label="排氣量 (cc)" value={carInfo.cc} onChange={(v:any)=>setCarInfo({...carInfo, cc:v})} type="number" placeholder="2494" />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <InputField label="座位數" value={carInfo.seats} onChange={(v:any)=>setCarInfo({...carInfo, seats:v})} type="number" placeholder="7" />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <InputField label="車輛咪數(km)" value={formatNum(carInfo.mileage)} onChange={(v:any)=>setCarInfo({...carInfo, mileage:formatNum(v)})} placeholder="15,000" />
                                        </div>
                                    </div>

                                    <div>
                                        <InputField label="車身號碼 (Chassis)" value={carInfo.chassis} onChange={(v:any)=>setCarInfo({...carInfo, chassis:v.toUpperCase()})} placeholder="e.g. NHP10-1234567" />
                                    </div>
                                </div>
                            </div>

                            {/* 運輸資訊 */}
                            <div>
                                <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2 mb-4">
                                    <Plane className="w-5 h-5 text-slate-700" />
                                    <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">運輸資訊</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">運輸方式</label>
                                        <select value={transport.type} onChange={e=>setTransport({...transport, type: e.target.value})} className="w-full bg-white md:bg-transparent border-b-2 border-slate-200 py-1.5 md:py-1 pl-1 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 rounded-lg md:rounded-none">
                                            <option value="SEA">船運 (Sea)</option><option value="AIR">空運 (Air)</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <InputField label="出發日期" type="date" value={transport.departureDate} onChange={(v:any)=>setTransport({...transport, departureDate: v})} />
                                    </div>
                                    <div className="col-span-3">
                                        <InputField label="預計需時 (天)" type="number" value={transport.duration} onChange={(v:any)=>setTransport({...transport, duration: v})} placeholder="e.g. 14" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 🟨 中欄：雜費細項 (固定 40% 闊度，緊湊排版) */}
                        <div className={`w-full md:w-[40%] h-full overflow-y-auto p-4 md:p-6 space-y-8 bg-slate-50/50 pb-32 md:pb-6 md:border-r border-slate-200 ${mobileTab!=='fees'?'hidden md:block':''}`}>
                            
                            {/* 智能保險與出牌 */}
                            <div>
                                <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2 mb-4">
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
                                        <span className="text-2xl font-black font-mono text-indigo-700">{fmt(estIns)}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 mb-4">
                                    <InputField label="牌費" value={formatNum(hkLicenseFees.fee)} onChange={(v:any)=>setHkLicenseFees({...hkLicenseFees, fee: formatNum(v)})} />
                                    <InputField label="實際保費" value={formatNum(hkLicenseFees.insurance || estIns.toString())} onChange={(v:any)=>setHkLicenseFees({...hkLicenseFees, insurance: formatNum(v)})} />
                                </div>

                                <div className="flex justify-between items-center text-sm font-bold text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                                    <span>首次登記稅 (FRT)</span>
                                    <span className="font-mono">{fmt(frtTax)}</span>
                                </div>
                            </div>

                            {/* 當地與香港雜費 (緊湊 3 欄) */}
                            <div>
                                <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2 mb-4">
                                    <Globe className="w-5 h-5 text-emerald-500" />
                                    <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">其他雜費</h3>
                                </div>
                                
                                <div className="mb-6">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 block">當地雜費 ({regData.currency})</span>
                                    <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                                        {Object.entries(originFees).map(([k, v]:any) => (
                                            <div key={k} className="flex flex-col">
                                                <InputField label={k} value={formatNum(v)} onChange={(val:any)=>setOriginFees({...originFees, [k]: formatNum(val)})} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-200">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 block">香港雜費 (HKD)</span>
                                    <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                                        {Object.entries(hkMiscFees).map(([k, v]:any) => (
                                            <div key={k} className="flex flex-col">
                                                <InputField label={k} value={formatNum(v)} onChange={(val:any)=>setHkMiscFees({...hkMiscFees, [k]: formatNum(val)})} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 🟩 右欄：結算與報價 (固定 25% 闊度) */}
                        <div className={`w-full md:w-[25%] h-full flex flex-col overflow-y-auto p-4 md:p-6 bg-white pb-32 md:pb-6 ${mobileTab!=='result'?'hidden md:flex' : ''}`}>
                            <div className="flex-1 space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2 mb-4 flex-none">
                                    <Zap className="w-5 h-5 text-amber-500" />
                                    <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">報價結算</h3>
                                </div>
                                
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

                            {/* 桌面版專屬吸底按鈕 */}
                            <div className="mt-6 pt-4 border-t border-slate-100 flex-none sticky bottom-0 bg-white pb-2 hidden md:block z-10">
                                <button onClick={handleSave} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                                    <Save size={20}/> {editingId ? '更新報價紀錄' : '儲存並產生成本單'}
                                </button>
                            </div>
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
