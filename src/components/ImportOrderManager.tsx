'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, List, Settings, Save, Ship, Car, FileText, 
  DollarSign, Trash2, PlusCircle, Search, Eye, Download, 
  CheckCircle, AlertTriangle, Loader2, Plane, Anchor
} from 'lucide-react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

// 定義預設常數 (來自您的原代碼)
const COUNTRIES: any = {
  JP: { id: 'JP', name: '日本 (Japan)', currency: 'JPY', symbol: '¥' },
  UK: { id: 'UK', name: '英國 (UK)', currency: 'GBP', symbol: '£' },
  OT: { id: 'OT', name: '其他 (Others)', currency: 'USD', symbol: '$' },
};

// --- 主組件 ---
export default function ImportOrderManager({ db, staffId, appId, inventory, settings }: any) {
    const [activeTab, setActiveTab] = useState<'calculator' | 'history'>('calculator');
    const [country, setCountry] = useState('JP');
    const [history, setHistory] = useState<any[]>([]);
    const [carPrice, setCarPrice] = useState('');
    const [prp, setPrp] = useState('');

    // 簡單的狀態
    const [details, setDetails] = useState({ manufacturer: '', model: '', year: '', code: '', chassisNo: '' });
    
    // 監聽歷史訂單
    useEffect(() => {
        if (!db || !appId) return;
        const ref = collection(db, `artifacts/${appId}/stores/import_orders/history`);
        const unsub = onSnapshot(query(ref), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            list.sort((a: any, b: any) => (b.ts || 0) - (a.ts || 0));
            setHistory(list);
        });
        return () => unsub();
    }, [db, appId]);

    // 格式化數字
    const formatNum = (val: string) => val.replace(/[^0-9.-]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const fmt = (n: number) => new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', maximumFractionDigits: 0 }).format(n);

    // 模擬計算
    const rate = country === 'JP' ? 0.053 : (country === 'UK' ? 10.2 : 7.8); // 這裡可以改為讀取 settings.rates
    const carPriceHKD = (parseFloat(carPrice.replace(/,/g, '')) || 0) * rate;

    const saveRecord = async () => {
        if (!db) return;
        const record = {
            ts: Date.now(),
            date: new Date().toLocaleString('zh-HK'),
            country,
            details,
            vals: { carPrice, prp, rate },
            results: { carPriceHKD },
            status: 'QUOTING',
            createdBy: staffId
        };
        try {
            await addDoc(collection(db, `artifacts/${appId}/stores/import_orders/history`), { ...record, timestamp: serverTimestamp() });
            alert("✅ 報價紀錄已儲存！");
            setActiveTab('history');
        } catch (e) {
            alert("❌ 儲存失敗");
        }
    };

    return (
        <div className="bg-slate-50 min-h-full rounded-2xl shadow-inner border border-slate-200 overflow-hidden flex flex-col animate-fade-in">
            {/* 內部導航 */}
            <div className="bg-slate-900 text-white p-3 flex justify-between items-center flex-none">
                <div className="flex items-center gap-2 font-black text-lg tracking-tighter">
                    <Ship className="w-5 h-5 text-blue-400"/> 海外訂車管家 (Import Orders)
                </div>
                <div className="flex bg-slate-800 rounded-lg p-1">
                    <button onClick={() => setActiveTab('calculator')} className={`px-4 py-1.5 rounded text-xs font-bold transition-colors ${activeTab === 'calculator' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><Calculator size={14} className="inline mr-1"/>計算報價</button>
                    <button onClick={() => setActiveTab('history')} className={`px-4 py-1.5 rounded text-xs font-bold transition-colors ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><List size={14} className="inline mr-1"/>訂單紀錄 ({history.length})</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'calculator' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="flex gap-3">
                            {Object.values(COUNTRIES).map((c: any) => (
                                <button key={c.id} onClick={() => setCountry(c.id)} className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center transition-all ${country === c.id ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-200' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                    <span className="font-black text-lg">{c.name.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-blue-500">
                            <h3 className="font-extrabold text-slate-800 text-lg mb-4 flex items-center border-b pb-2"><Car className="mr-2"/> 車輛資料</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">廠牌</label><input value={details.manufacturer} onChange={e=>setDetails({...details, manufacturer: e.target.value})} className="w-full border-2 rounded-lg p-2 font-bold outline-none focus:border-blue-500"/></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">型號</label><input value={details.model} onChange={e=>setDetails({...details, model: e.target.value})} className="w-full border-2 rounded-lg p-2 font-bold outline-none focus:border-blue-500"/></div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-slate-700">
                            <h3 className="font-extrabold text-slate-800 text-lg mb-4 flex items-center border-b pb-2"><DollarSign className="mr-2"/> 核心成本</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">當地車價 ({COUNTRIES[country].currency})</label><div className="relative"><span className="absolute left-3 top-2.5 font-bold text-slate-400">{COUNTRIES[country].symbol}</span><input value={carPrice} onChange={e=>setCarPrice(formatNum(e.target.value))} className="w-full border-2 rounded-lg p-2 pl-8 font-bold font-mono outline-none focus:border-blue-500"/></div></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">PRP 基準 ($)</label><div className="relative"><span className="absolute left-3 top-2.5 font-bold text-slate-400">$</span><input value={prp} onChange={e=>setPrp(formatNum(e.target.value))} className="w-full border-2 rounded-lg p-2 pl-8 font-bold font-mono outline-none focus:border-blue-500"/></div></div>
                            </div>
                            <div className="mt-4 p-5 bg-slate-100 rounded-xl flex justify-between items-center border border-slate-200">
                                <span className="text-slate-600 font-bold uppercase tracking-wide">車價折合 (HKD) @ 匯率 {rate}</span>
                                <span className="text-3xl font-black text-slate-800">{fmt(carPriceHKD)}</span>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button onClick={saveRecord} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 active:scale-95 transition-transform flex items-center">
                                <Save className="mr-2"/> 儲存報價
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4 max-w-5xl mx-auto">
                        {history.map(item => (
                            <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-1 rounded font-bold uppercase">{item.status}</span>
                                        <span className="font-bold text-lg text-slate-800">{item.details.manufacturer} {item.details.model}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-blue-700">{fmt(item.results.carPriceHKD)}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{item.date}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {history.length === 0 && <div className="text-center py-20 text-slate-400 font-bold border-2 border-dashed rounded-2xl">暫無訂單紀錄</div>}
                    </div>
                )}
            </div>
        </div>
    );
}
