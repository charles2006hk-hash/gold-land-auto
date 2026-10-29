'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Save, Printer, Download, FlipHorizontal, History, Trash2, Stamp, CheckCircle, Type } from 'lucide-react';

export default function StampMakerModule({ db, appId, staffId }: any) {
    const [history, setHistory] = useState<any[]>([]);
    
    // 印章設定狀態
    const [companyEn, setCompanyEn] = useState('YAU LUEN GLOVE FTY. CO., LTD');
    const [chLine1, setChLine1] = useState('友聯手套廠');
    const [chLine2, setChLine2] = useState('有限公司');
    const [chLine3, setChLine3] = useState('');
    const [stampType, setStampType] = useState('oval'); // 預設改為橢圓印
    const [isMirrored, setIsMirrored] = useState(false); 

    // ★ 新增：橢圓印章專屬設定 (mm)
    const [ovalWidth, setOvalWidth] = useState(33); // 預設 33mm
    const [ovalHeight, setOvalHeight] = useState(22); // 預設 22mm
    const [ovalBottomText, setOvalBottomText] = useState('24746847'); // 底部數字或文字

    // 監聽歷史紀錄
    useEffect(() => {
        if (!db || !appId) return;
        const q = query(collection(db, `artifacts/${appId}/staff/CHARLES_data/stamp_history`), orderBy('createdAt', 'desc'));
        return onSnapshot(q, (snap) => {
            setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }, [db, appId]);

    const handleSaveHistory = async () => {
        if (!db || !companyEn) return;
        try {
            await addDoc(collection(db, `artifacts/${appId}/staff/CHARLES_data/stamp_history`), {
                companyEn,
                companyCh: `${chLine1}${chLine2}${chLine3}`, 
                chLine1, chLine2, chLine3, stampType,
                ovalWidth, ovalHeight, ovalBottomText, // 儲存橢圓設定
                createdAt: serverTimestamp(), createdBy: staffId
            });
            alert("✅ 印章設定已儲存至歷史紀錄！");
        } catch (e) {
            alert("儲存失敗");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("確定刪除此印章紀錄？")) {
            await deleteDoc(doc(db, `artifacts/${appId}/staff/CHARLES_data/stamp_history`, id));
        }
    };

    const loadHistory = (item: any) => {
        setCompanyEn(item.companyEn || '');
        if (item.chLine1 !== undefined) {
            setChLine1(item.chLine1 || '');
            setChLine2(item.chLine2 || '');
            setChLine3(item.chLine3 || '');
        } else {
            setChLine1(item.companyCh || '');
            setChLine2(''); setChLine3('');
        }
        setStampType(item.stampType || 'round_24');
        if (item.ovalWidth) setOvalWidth(item.ovalWidth);
        if (item.ovalHeight) setOvalHeight(item.ovalHeight);
        if (item.ovalBottomText !== undefined) setOvalBottomText(item.ovalBottomText);
    };

    const handlePrint = () => {
        const svgElement = document.getElementById('stamp-svg');
        if (!svgElement) return;
        
        const isRect = stampType === 'rect_24x66';
        const isOval = stampType === 'oval';
        
        let widthMM = 24;
        let heightMM = 24;
        
        if (isRect) { widthMM = 66; heightMM = 24; }
        else if (isOval) { widthMM = ovalWidth; heightMM = ovalHeight; }
        else if (stampType === 'round_22') { widthMM = 22; heightMM = 22; }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
            <head>
                <title>Stamp Print Export</title>
                <style>
                    @page { margin: 0; size: A4 portrait; }
                    body { 
                        margin: 0; padding: 20mm; background: white; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important;
                        filter: grayscale(100%) contrast(200%) !important;
                        display: flex; gap: 20mm; flex-wrap: wrap;
                    }
                    .stamp-container { width: ${widthMM}mm; height: ${heightMM}mm; transform: ${isMirrored ? 'scaleX(-1)' : 'none'}; }
                    svg { width: 100%; height: 100%; }
                    text, g { fill: #000000 !important; }
                    circle, path, line, ellipse { stroke: #000000 !important; }
                </style>
            </head>
            <body>
                <div class="stamp-container">${svgElement.outerHTML}</div>
                <div class="stamp-container">${svgElement.outerHTML}</div>
                <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleDownloadPNG = () => {
        const svgElement = document.getElementById('stamp-svg');
        if (!svgElement) return;
        
        const isRect = stampType === 'rect_24x66';
        const isOval = stampType === 'oval';
        
        const canvas = document.createElement('canvas');
        
        if (isRect) {
            canvas.width = 3300; canvas.height = 1200;
        } else if (isOval) {
            // 以高解析度輸出
            canvas.width = ovalWidth * 50; 
            canvas.height = ovalHeight * 50;
        } else {
            canvas.width = 1200; canvas.height = 1200;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const data = (new XMLSerializer()).serializeToString(svgElement);
        const img = new Image();
        const url = URL.createObjectURL(new Blob([data], {type: 'image/svg+xml;charset=utf-8'}));

        img.onload = () => {
            if (isMirrored) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            const a = document.createElement('a');
            a.download = `Stamp_${companyEn}.png`;
            a.href = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
            a.click();
        };
        img.src = url;
    };

    // ★ 引擎 1：圓章
    const renderRoundStamp = (activeLines: string[], maxLen: number) => {
        const enLen = companyEn.length;
        const lAdjust = enLen > 28 ? "spacingAndGlyphs" : "spacing";

        return (
            <svg id="stamp-svg" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-black">
                <circle cx="150" cy="150" r="146" fill="none" stroke="black" strokeWidth="4" />
                <circle cx="150" cy="150" r="139" fill="none" stroke="black" strokeWidth="1.5" />
                <circle cx="150" cy="150" r="95" fill="none" stroke="black" strokeWidth="1.5" />

                <defs>
                    <path id="en-arc-path" d="M 112.0,243.6 A 101,101 0 1,1 188.0,243.6" fill="none" />
                </defs>

                <text fill="black" fontSize="36" fontWeight="bold" fontFamily="'Times New Roman Condensed', 'Arial Narrow', 'Helvetica Condensed', 'Times New Roman', Times, serif" fontStretch="condensed">
                    <textPath href="#en-arc-path" startOffset="50%" textAnchor="middle" textLength="556" lengthAdjust={lAdjust}>
                        {companyEn.toUpperCase()}
                    </textPath>
                </text>

                <text x="150" y="267" fill="black" fontSize="36" fontWeight="normal" fontFamily="Arial, sans-serif" textAnchor="middle" dominantBaseline="central">
                    ❇
                </text>

                <g fill="black" fontWeight="900" fontFamily="'Kaiti', 'STKaiti', 'KaiTi_GB2312', 'BiauKai', serif" textAnchor="middle" letterSpacing="4">
                    {activeLines.length === 1 && (() => {
                        const fSize = Math.min(180 / maxLen, 76);
                        return <text x="150" y={150 + fSize * 0.35} fontSize={fSize}>{activeLines[0]}</text>;
                    })()}
                    {activeLines.length === 2 && (() => {
                        const fSize = Math.min(160 / maxLen, 54);
                        return (
                            <>
                                <text x="150" y={150 - fSize * 0.55 + fSize * 0.35} fontSize={fSize}>{activeLines[0]}</text>
                                <text x="150" y={150 + fSize * 0.55 + fSize * 0.35} fontSize={fSize}>{activeLines[1]}</text>
                            </>
                        );
                    })()}
                    {activeLines.length === 3 && (() => {
                        const fSize = Math.min(145 / maxLen, 38);
                        return (
                            <>
                                <text x="150" y={150 - fSize * 1.15 + fSize * 0.35} fontSize={fSize}>{activeLines[0]}</text>
                                <text x="150" y={150 + fSize * 0.35} fontSize={fSize}>{activeLines[1]}</text>
                                <text x="150" y={150 + fSize * 1.15 + fSize * 0.35} fontSize={fSize}>{activeLines[2]}</text>
                            </>
                        );
                    })()}
                </g>
            </svg>
        );
    };

    // ★ 引擎 2：長條章
    const renderRectStamp = () => {
        const fullCh = [chLine1, chLine2, chLine3].join('');
        const enLen = companyEn.length;
        const chLen = fullCh.length;

        const fSizeEn = enLen > 30 ? "26" : "32";
        const fSizeCh = chLen > 15 ? "28" : "34";

        return (
            <svg id="stamp-svg" viewBox="0 0 660 240" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-black">
                <text x="30" y="35" fill="black" fontSize="30" fontStyle="italic" fontWeight="bold" fontFamily="'Times New Roman', Times, serif" textAnchor="start">
                    For and on behalf of
                </text>
                <text x="330" y="75" fill="black" fontSize={fSizeEn} fontWeight="bold" fontFamily="'Times New Roman', Times, serif" textAnchor="middle" textLength="600" lengthAdjust="spacingAndGlyphs">
                    {companyEn.toUpperCase()}
                </text>
                <text x="330" y="115" fill="black" fontSize={fSizeCh} fontWeight="900" fontFamily="'Kaiti', 'STKaiti', 'KaiTi_GB2312', 'BiauKai', serif" textAnchor="middle" textLength={chLen > 2 ? "600" : undefined} lengthAdjust={chLen > 2 ? "spacing" : undefined} letterSpacing={chLen <= 2 ? "20" : "0"}>
                    {fullCh}
                </text>
                <line x1="30" y1="195" x2="630" y2="195" stroke="black" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="0, 11" />
                <text x="630" y="232" fill="black" fontSize="28" fontStyle="italic" fontWeight="bold" fontFamily="'Times New Roman', Times, serif" textAnchor="end">
                    Authorized Signature(s)
                </text>
            </svg>
        );
    };

    // ★ 引擎 3：高精度 SVG 橢圓章 (無縫彎曲排版)
    const renderOvalStamp = (activeLines: string[], maxLen: number) => {
        // 設定 viewBox，乘以 10 以獲得高解析度的畫布比例
        const vBoxW = ovalWidth * 10;
        const vBoxH = ovalHeight * 10;
        
        const cx = vBoxW / 2;
        const cy = vBoxH / 2;
        
        // 外部邊界 (減去少許 padding 確保不被裁切)
        const rxOuter = vBoxW / 2 - 4;
        const ryOuter = vBoxH / 2 - 4;
        
        // 根據標準雙圈印章比例，文字環的厚度約為短半徑的 35%~40%
        const ringThickness = Math.min(rxOuter, ryOuter) * 0.38; 
        
        // 內圈半徑
        const rxInner = rxOuter - ringThickness;
        const ryInner = ryOuter - ringThickness;
        
        // 字體大小：根據環的厚度自動調整
        const fontSizeRing = ringThickness * 0.60;
        
        // ★ 核心魔法：為 textPath 建立「完美的隱形軌道」
        // 上半部軌道：貼近內圈 (由左至右上彎)
        const rxTextTop = rxInner + ringThickness * 0.2;
        const ryTextTop = ryInner + ringThickness * 0.2;
        
        // 下半部軌道：貼近外圈 (由左至右下彎)
        const rxTextBottom = rxOuter - ringThickness * 0.25;
        const ryTextBottom = ryOuter - ringThickness * 0.25;

        return (
            <svg id="stamp-svg" viewBox={`0 0 ${vBoxW} ${vBoxH}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-black">
                <defs>
                    {/* SVG 橢圓弧線指令: A rx,ry xAxisRotate LargeArcFlag SweepFlag x,y */}
                    {/* 上弧線: 從左極點到右極點，順時針 (Sweep=1) */}
                    <path id="oval-top-path" d={`M ${cx - rxTextTop},${cy} A ${rxTextTop},${ryTextTop} 0 0,1 ${cx + rxTextTop},${cy}`} fill="none" />
                    {/* 下弧線: 從左極點到右極點，逆時針 (Sweep=0) */}
                    <path id="oval-bottom-path" d={`M ${cx - rxTextBottom},${cy} A ${rxTextBottom},${ryTextBottom} 0 0,0 ${cx + rxTextBottom},${cy}`} fill="none" />
                </defs>

                {/* 外圈實線 */}
                <ellipse cx={cx} cy={cy} rx={rxOuter} ry={ryOuter} fill="none" stroke="black" strokeWidth="4" />
                {/* 內圈實線 */}
                <ellipse cx={cx} cy={cy} rx={rxInner} ry={ryInner} fill="none" stroke="black" strokeWidth="1.5" />
                
                {/* 頂部外環英文 */}
                {companyEn && (
                    <text fill="black" fontSize={fontSizeRing} fontWeight="bold" fontFamily="'Times New Roman Condensed', 'Arial Narrow', 'Helvetica Condensed', 'Times New Roman', Times, serif" fontStretch="condensed">
                        {/* startOffset="50%" 與 textAnchor="middle" 確保文字絕對置中於弧線 */}
                        <textPath href="#oval-top-path" startOffset="50%" textAnchor="middle" lengthAdjust={companyEn.length > 20 ? "spacingAndGlyphs" : "spacing"} textLength={companyEn.length > 20 ? (rxTextTop * Math.PI * 0.9) : undefined}>
                            {companyEn.toUpperCase()}
                        </textPath>
                    </text>
                )}

                {/* 底部外環文字/數字 */}
                {ovalBottomText && (
                    <text fill="black" fontSize={fontSizeRing * 0.9} fontWeight="bold" fontFamily="Arial, sans-serif">
                        <textPath href="#oval-bottom-path" startOffset="50%" textAnchor="middle" lengthAdjust="spacing">
                            {ovalBottomText}
                        </textPath>
                    </text>
                )}

                {/* 左右護法星號 (*) */}
                <text x={cx - (rxOuter + rxInner)/2} y={cy + (fontSizeRing * 0.1)} fill="black" fontSize={fontSizeRing * 1.5} textAnchor="middle" dominantBaseline="central" fontWeight="bold">
                    *
                </text>
                <text x={cx + (rxOuter + rxInner)/2} y={cy + (fontSizeRing * 0.1)} fill="black" fontSize={fontSizeRing * 1.5} textAnchor="middle" dominantBaseline="central" fontWeight="bold">
                    *
                </text>

                {/* 內環中央中文排版 */}
                <g fill="black" fontWeight="900" fontFamily="'Kaiti', 'STKaiti', 'KaiTi_GB2312', 'BiauKai', serif" textAnchor="middle" letterSpacing="2">
                    {activeLines.length === 1 && (() => {
                        const fSize = Math.min((rxInner * 1.5) / maxLen, ryInner * 0.6);
                        return <text x={cx} y={cy + fSize * 0.35} fontSize={fSize}>{activeLines[0]}</text>;
                    })()}
                    {activeLines.length === 2 && (() => {
                        const fSize = Math.min((rxInner * 1.4) / maxLen, ryInner * 0.45);
                        return (
                            <>
                                <text x={cx} y={cy - fSize * 0.6 + fSize * 0.35} fontSize={fSize}>{activeLines[0]}</text>
                                <text x={cx} y={cy + fSize * 0.7 + fSize * 0.35} fontSize={fSize}>{activeLines[1]}</text>
                            </>
                        );
                    })()}
                    {activeLines.length === 3 && (() => {
                        const fSize = Math.min((rxInner * 1.3) / maxLen, ryInner * 0.35);
                        return (
                            <>
                                <text x={cx} y={cy - fSize * 1.2 + fSize * 0.35} fontSize={fSize}>{activeLines[0]}</text>
                                <text x={cx} y={cy + fSize * 0.35} fontSize={fSize}>{activeLines[1]}</text>
                                <text x={cx} y={cy + fSize * 1.2 + fSize * 0.35} fontSize={fSize}>{activeLines[2]}</text>
                            </>
                        );
                    })()}
                </g>
            </svg>
        );
    };

    const isRect = stampType === 'rect_24x66';
    const isOval = stampType === 'oval';

    const renderPreview = () => {
        const activeLines = [chLine1, chLine2, chLine3].map(l => l.trim()).filter(l => l.length > 0);
        const maxLen = activeLines.length > 0 ? Math.max(...activeLines.map(l => l.length)) : 1;

        if (isRect) return renderRectStamp();
        if (isOval) return renderOvalStamp(activeLines, maxLen);
        return renderRoundStamp(activeLines, maxLen);
    };

    return (
        <div className="flex flex-col md:flex-row h-full bg-slate-100 p-4 gap-4 overflow-hidden">
            
            {/* 左側：控制面板 */}
            <div className="w-full md:w-[35%] bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-4 bg-slate-800 text-white flex items-center gap-2">
                    <Stamp size={20} />
                    <h2 className="font-black tracking-widest">光敏印章製作中心</h2>
                </div>
                
                <div className="p-6 space-y-5 overflow-y-auto flex-1 scrollbar-thin">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">公司英文名稱 (外圈/首行)</label>
                        <input value={companyEn} onChange={e => setCompanyEn(e.target.value)} className="w-full border-2 border-slate-200 rounded-lg p-2 font-bold text-slate-800 outline-none focus:border-blue-500 uppercase" />
                    </div>

                    {/* ★ 新增：橢圓底部的文字/數字 */}
                    {isOval && (
                        <div className="animate-fade-in">
                            <label className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1 block">底部文字 (編號/電話)</label>
                            <input value={ovalBottomText} onChange={e => setOvalBottomText(e.target.value)} className="w-full border-2 border-orange-200 bg-orange-50 rounded-lg p-2 font-bold text-slate-800 outline-none focus:border-orange-500" placeholder="例如: 24746847" />
                        </div>
                    )}
                    
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-2 shadow-inner">
                        <label className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1"><Type size={14}/> 公司中文名稱 (獨立3行設定)</label>
                        <input value={chLine1} onChange={e => setChLine1(e.target.value)} placeholder="第一行 (例: 金田)" className="w-full border-2 border-white rounded-lg p-2 font-bold text-slate-800 outline-none focus:border-blue-500 text-center shadow-sm" />
                        <input value={chLine2} onChange={e => setChLine2(e.target.value)} placeholder="第二行 (例: 汽車)" className="w-full border-2 border-white rounded-lg p-2 font-bold text-slate-800 outline-none focus:border-blue-500 text-center shadow-sm" />
                        <input value={chLine3} onChange={e => setChLine3(e.target.value)} placeholder="第三行 (例: 有限公司)" className="w-full border-2 border-white rounded-lg p-2 font-bold text-slate-800 outline-none focus:border-blue-500 text-center shadow-sm" />
                        <p className="text-[10px] text-blue-600 font-bold text-center pt-1">
                            {isRect ? "💡 長條章模式下，中英文將強制「左右滿版貼齊」，並預留巨型簽名區" : "💡 留空行即自動隱藏，字體會動態放大充盈貼服內圈"}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-500 mb-1 block">尺寸與形狀規格</label>
                            <select value={stampType} onChange={e => setStampType(e.target.value)} className="w-full border-2 border-slate-200 rounded-lg p-2 font-bold text-slate-700 outline-none cursor-pointer">
                                <option value="oval">33x22mm 橢圓印 (Oval)</option>
                                <option value="round_24">24mm 標準圓章</option>
                                <option value="round_22">22mm 迷你圓章</option>
                                <option value="rect_24x66">24x66mm 支票/授權印章</option>
                            </select>
                        </div>
                        
                        {/* ★ 新增：自定義橢圓長寬 */}
                        {isOval && (
                            <div className="col-span-2 flex gap-3 animate-fade-in bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <div className="flex-1">
                                    <label className="text-[10px] text-slate-500 font-bold mb-1 block uppercase">橫向直徑 (X) mm</label>
                                    <input type="number" value={ovalWidth} onChange={(e) => setOvalWidth(Number(e.target.value))} className="w-full p-2 border rounded text-sm text-center font-mono font-bold outline-none focus:border-blue-400" min="20" max="100"/>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] text-slate-500 font-bold mb-1 block uppercase">直向直徑 (Y) mm</label>
                                    <input type="number" value={ovalHeight} onChange={(e) => setOvalHeight(Number(e.target.value))} className="w-full p-2 border rounded text-sm text-center font-mono font-bold outline-none focus:border-blue-400" min="20" max="100"/>
                                </div>
                            </div>
                        )}

                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-500 mb-1 block">光敏機設定</label>
                            <button onClick={() => setIsMirrored(!isMirrored)} className={`w-full p-2 border-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${isMirrored ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                                <FlipHorizontal size={16} /> {isMirrored ? '反像 (Mirror)' : '正像 (Normal)'}
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 space-y-3">
                        <button onClick={handleSaveHistory} className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all active:scale-95">
                            <Save size={18} /> 儲存至雲端歷史紀錄
                        </button>
                        <div className="flex gap-2">
                            <button onClick={handleDownloadPNG} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                                <Download size={18} /> 匯出 PNG
                            </button>
                            <button onClick={handlePrint} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black shadow-md hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2">
                                <Printer size={18} /> 列印 (A4)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 中間：即時預覽區 */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute top-4 left-4 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border border-emerald-100 shadow-sm">
                    <CheckCircle size={14} /> 即時向量預覽 (Live Vector Preview)
                </div>
                
                <div className={`bg-slate-50 rounded-[40px] shadow-inner border border-slate-200 relative flex flex-col items-center justify-center transition-all duration-500 ${isRect ? 'p-8 md:p-12' : 'p-12 md:p-20'}`}>
                    <div 
                        className={`transition-all duration-500 flex justify-center items-center ${isMirrored ? 'scale-x-[-1]' : 'scale-x-100'} ${isRect ? 'w-[280px] h-[102px] md:w-[440px] md:h-[160px]' : (isOval ? 'w-[280px] md:w-[440px] max-h-[300px]' : 'w-[220px] h-[220px] md:w-[260px] md:h-[260px]')}`}
                    >
                        {renderPreview()}
                    </div>
                    <div className="absolute bottom-4 text-[10px] text-slate-400 font-mono tracking-widest uppercase bg-white px-2 py-0.5 rounded-full border border-slate-200">
                        Output: {isRect ? '24mm x 66mm' : (isOval ? `${ovalWidth}mm x ${ovalHeight}mm` : (stampType === 'round_24' ? '24mm' : '22mm'))}
                    </div>
                </div>
            </div>

            {/* 右側：歷史紀錄 */}
            <div className="w-full md:w-[25%] bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-64 md:h-auto">
                <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
                    <History size={16} className="text-slate-600" />
                    <h3 className="font-bold text-slate-700 text-sm">歷史印章紀錄</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50">
                    {history.map((item) => (
                        <div key={item.id} className="bg-white p-3 border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group" onClick={() => loadHistory(item)}>
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-[10px] text-white px-2 py-0.5 rounded font-bold ${item.stampType === 'rect_24x66' ? 'bg-indigo-600' : (item.stampType === 'oval' ? 'bg-orange-600' : 'bg-slate-800')}`}>
                                    {item.stampType === 'rect_24x66' ? '長條章' : (item.stampType === 'oval' ? `橢圓 ${item.ovalWidth}x${item.ovalHeight}` : (item.stampType === 'round_24' ? '24mm' : '22mm'))}
                                </span>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                            </div>
                            <div className="font-black text-xs text-slate-800 truncate mb-0.5">{item.chLine1 || item.companyCh}{item.chLine2}{item.chLine3}</div>
                            <div className="text-[9px] text-slate-500 font-bold truncate">{item.companyEn}</div>
                        </div>
                    ))}
                    {history.length === 0 && <div className="text-center py-8 text-xs text-slate-400 font-bold">尚無紀錄</div>}
                </div>
            </div>
        </div>
    );
}
