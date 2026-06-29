'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Save, Printer, Download, FlipHorizontal, History, Trash2, Stamp, CheckCircle } from 'lucide-react';

export default function StampMakerModule({ db, appId, staffId }: any) {
    const [history, setHistory] = useState<any[]>([]);
    
    // 印章設定狀態
    const [companyEn, setCompanyEn] = useState('GOLD LAND AUTO LIMITED');
    const [companyCh, setCompanyCh] = useState('金田汽車有限公司');
    const [stampType, setStampType] = useState('round_24'); // round_24, round_22
    const [isMirrored, setIsMirrored] = useState(false); // 光敏機常需要鏡像列印
    const [isProcessing, setIsProcessing] = useState(false);

    // 監聽歷史紀錄
    useEffect(() => {
        if (!db || !appId) return;
        const q = query(collection(db, `artifacts/${appId}/staff/CHARLES_data/stamp_history`), orderBy('createdAt', 'desc'));
        return onSnapshot(q, (snap) => {
            setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }, [db, appId]);

    // 儲存至歷史紀錄
    const handleSaveHistory = async () => {
        if (!db || !companyEn) return;
        try {
            await addDoc(collection(db, `artifacts/${appId}/staff/CHARLES_data/stamp_history`), {
                companyEn,
                companyCh,
                stampType,
                createdAt: serverTimestamp(),
                createdBy: staffId
            });
            alert("✅ 印章設定已儲存至歷史紀錄！");
        } catch (e) {
            console.error(e);
            alert("儲存失敗");
        }
    };

    // 刪除歷史紀錄
    const handleDelete = async (id: string) => {
        if (confirm("確定刪除此印章紀錄？")) {
            await deleteDoc(doc(db, `artifacts/${appId}/staff/CHARLES_data/stamp_history`, id));
        }
    };

    // 載入歷史紀錄
    const loadHistory = (item: any) => {
        setCompanyEn(item.companyEn || '');
        setCompanyCh(item.companyCh || '');
        setStampType(item.stampType || 'round_24');
    };

    // 列印輸出 (產生專屬列印視窗，強制設定物理尺寸)
    const handlePrint = () => {
        const svgElement = document.getElementById('stamp-svg');
        if (!svgElement) return;

        // 24mm 印章
        const sizeMM = stampType === 'round_24' ? 24 : 22;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
            <head>
                <title>Stamp Print Export</title>
                <style>
                    @page { margin: 0; size: A4 portrait; }
                    body { 
                        margin: 0; 
                        padding: 20mm; /* 距離邊緣 20mm，方便剪裁 */
                        background: white; 
                        /* 強制黑白與高對比，光敏機專用 */
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact;
                        display: flex;
                        gap: 20mm;
                    }
                    .stamp-container {
                        width: ${sizeMM}mm;
                        height: ${sizeMM}mm;
                        transform: ${isMirrored ? 'scaleX(-1)' : 'none'};
                    }
                    svg { width: 100%; height: 100%; }
                </style>
            </head>
            <body>
                <div class="stamp-container">${svgElement.outerHTML}</div>
                <div class="stamp-container">${svgElement.outerHTML}</div>
                <script>
                    window.onload = () => {
                        window.print();
                        setTimeout(() => window.close(), 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // 下載高解析度 PNG
    const handleDownloadPNG = () => {
        const svgElement = document.getElementById('stamp-svg');
        if (!svgElement) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = 1200; 
        canvas.height = 1200;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const data = (new XMLSerializer()).serializeToString(svgElement);
        const DOMURL = window.URL || window.webkitURL || window;
        const img = new Image();
        const svgBlob = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
        const url = DOMURL.createObjectURL(svgBlob);

        img.onload = () => {
            if (isMirrored) {
                ctx.translate(1200, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(img, 0, 0, 1200, 1200);
            DOMURL.revokeObjectURL(url);
            
            const imgURI = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
            const evt = new MouseEvent('click', { view: window, bubbles: false, cancelable: true });
            const a = document.createElement('a');
            a.setAttribute('download', `Stamp_${companyEn}_${stampType}.png`);
            a.setAttribute('href', imgURI);
            a.setAttribute('target', '_blank');
            a.dispatchEvent(evt);
        };
        img.src = url;
    };

    // ★ 核心：SVG 智能排版繪製邏輯
    const renderStampSVG = () => {
        // --- 1. 中文名稱自動分行與排版算法 ---
        let chLines: string[] = [];
        const ch = companyCh.trim();
        
        if (ch.length <= 3) {
            chLines = [ch];
        } else if (ch.length <= 6) {
            const mid = Math.ceil(ch.length / 2);
            chLines = [ch.slice(0, mid), ch.slice(mid)];
        } else {
            // >= 7 個字，啟用 3 行模式
            if (ch.endsWith("有限公司")) {
                const rest = ch.slice(0, -4);
                const mid = Math.ceil(rest.length / 2);
                chLines = [rest.slice(0, mid), rest.slice(mid), "有限公司"];
            } else if (ch.endsWith("公司")) {
                const rest = ch.slice(0, -2);
                const mid = Math.ceil(rest.length / 2);
                chLines = [rest.slice(0, mid), rest.slice(mid), "公司"];
            } else {
                const third = Math.ceil(ch.length / 3);
                chLines = [ch.slice(0, third), ch.slice(third, third * 2), ch.slice(third * 2)];
            }
        }

        // --- 2. 針對行數動態設定字體大小與 Y 軸間距 ---
        let fontSize = "48";
        let startY = 165;
        let lineGap = 0;

        if (chLines.length === 2) {
            fontSize = "40";
            startY = 132;
            lineGap = 50;
        } else if (chLines.length === 3) {
            fontSize = "32";   // 3行模式下縮小字體以防穿出第三圈
            startY = 112;      // 向上微調起始位置
            lineGap = 42;      // 精密行距
        }

        // --- 3. 英文長度動態調整字型大小 ---
        const enLength = companyEn.length;
        const enFontSize = enLength > 28 ? "18" : enLength > 22 ? "22" : "24";

        return (
            <svg id="stamp-svg" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-black">
                {/* 最外層：傳統香港雙圈設計 (粗+幼) */}
                <circle cx="150" cy="150" r="146" fill="none" stroke="black" strokeWidth="4" />
                <circle cx="150" cy="150" r="139" fill="none" stroke="black" strokeWidth="1.5" />
                
                {/* 內部第三圈：劃分中英文區域 */}
                <circle cx="150" cy="150" r="95" fill="none" stroke="black" strokeWidth="1.5" />

                {/* 隱藏的路徑：供英文與符號沿著圓弧排列 (半徑設在 139 與 95 之間，約 117) */}
                <defs>
                    <path id="top-curve" d="M 33,150 a 117,117 0 1,1 234,0" fill="none" />
                    <path id="bottom-curve" d="M 267,150 a 117,117 0 0,1 -234,0" fill="none" />
                </defs>

                {/* 英文公司名稱 (Times New Roman 類字型) */}
                <text fill="black" fontSize={enFontSize} fontWeight="bold" fontFamily="'Times New Roman', Times, serif" letterSpacing="1">
                    <textPath href="#top-curve" startOffset="50%" textAnchor="middle">
                        {companyEn.toUpperCase()}
                    </textPath>
                </text>

                {/* 底部符號 */}
                <text fill="black" fontSize="26" fontWeight="normal" fontFamily="Arial, sans-serif">
                    <textPath href="#bottom-curve" startOffset="50%" textAnchor="middle">
                        ❇
                    </textPath>
                </text>

                {/* 中文公司名稱 (楷體，自動換行排版) */}
                <g fill="black" fontWeight="900" fontFamily="'Kaiti', 'STKaiti', 'KaiTi_GB2312', 'BiauKai', serif" textAnchor="middle" letterSpacing="2">
                    {chLines.map((line, index) => (
                        <text key={index} x="150" y={startY + (index * lineGap)} fontSize={fontSize}>
                            {line}
                        </text>
                    ))}
                </g>
            </svg>
        );
    };

    return (
        <div className="flex flex-col md:flex-row h-full bg-slate-100 p-4 gap-4 overflow-hidden">
            
            {/* 左側：控制面板 */}
            <div className="w-full md:w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-4 bg-slate-800 text-white flex items-center gap-2">
                    <Stamp size={20} />
                    <h2 className="font-black tracking-widest">光敏印章製作中心</h2>
                </div>
                
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">公司英文名稱 (外圈)</label>
                        <input value={companyEn} onChange={e => setCompanyEn(e.target.value)} className="w-full border-2 border-slate-200 rounded-lg p-2 font-bold text-slate-800 outline-none focus:border-blue-500 uppercase" placeholder="例如: GOLD LAND AUTO LIMITED" />
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">公司中文名稱 (中心)</label>
                        <input value={companyCh} onChange={e => setCompanyCh(e.target.value)} className="w-full border-2 border-slate-200 rounded-lg p-2 font-bold text-slate-800 outline-none focus:border-blue-500" placeholder="例如: 金田汽車有限公司" />
                        <p className="text-[10px] text-slate-400 mt-1">系統將自動根據字數適配 1 至 3 行排版，確保不穿出內圈。</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">尺寸規格</label>
                            <select value={stampType} onChange={e => setStampType(e.target.value)} className="w-full border-2 border-slate-200 rounded-lg p-2 font-bold text-slate-700 outline-none cursor-pointer">
                                <option value="round_24">24mm 標準圓章</option>
                                <option value="round_22">22mm 迷你圓章</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">光敏機設定</label>
                            <button onClick={() => setIsMirrored(!isMirrored)} className={`w-full p-2 border-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${isMirrored ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                                <FlipHorizontal size={16} />
                                {isMirrored ? '已開反像 (Mirror)' : '正像 (Normal)'}
                            </button>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-200 space-y-3">
                        <button onClick={handleSaveHistory} className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all">
                            <Save size={18} /> 儲存至雲端歷史紀錄
                        </button>
                        
                        <div className="flex gap-2">
                            <button onClick={handleDownloadPNG} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black shadow-md hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                                <Download size={18} /> 匯出 PNG
                            </button>
                            <button onClick={handlePrint} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black shadow-md hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2">
                                <Printer size={18} /> A4 硫酸紙列印
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 中間：即時預覽區 */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute top-4 left-4 bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500"/> 即時純黑向量預覽 (Live Vector Preview)
                </div>
                
                {/* 模擬硫酸紙/曝光墊的背景 */}
                <div className="bg-[#f0f0f0] p-12 rounded-2xl shadow-inner border border-slate-300 relative flex flex-col items-center justify-center min-w-[300px] min-h-[300px]">
                    <div className={`w-[200px] h-[200px] transition-transform duration-300 ${isMirrored ? 'scale-x-[-1]' : 'scale-x-100'}`}>
                        {renderStampSVG()}
                    </div>
                    
                    <div className="absolute bottom-4 text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                        Physical Output Size: {stampType === 'round_24' ? '24mm x 24mm' : '22mm x 22mm'}
                    </div>
                </div>
            </div>

            {/* 右側：歷史紀錄 */}
            <div className="w-full md:w-1/4 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-64 md:h-auto">
                <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
                    <History size={16} className="text-slate-600" />
                    <h3 className="font-bold text-slate-700 text-sm">歷史印章紀錄</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50">
                    {history.map((item) => (
                        <div key={item.id} className="bg-white p-3 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md cursor-pointer transition-all group" onClick={() => loadHistory(item)}>
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold">{item.stampType === 'round_24' ? '24mm' : '22mm'}</span>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                            </div>
                            <div className="font-black text-xs text-slate-800 truncate mb-0.5">{item.companyCh}</div>
                            <div className="text-[9px] text-slate-500 font-bold truncate">{item.companyEn}</div>
                        </div>
                    ))}
                    {history.length === 0 && <div className="text-center py-8 text-xs text-slate-400 font-bold">尚無紀錄</div>}
                </div>
            </div>

        </div>
    );
}
