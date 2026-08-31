import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Maximize, Wand2, Loader2, RotateCcw, ArrowLeft, Image as ImageIcon, Crop } from 'lucide-react';

interface Point { x: number; y: number }

export default function DocumentScannerModal({ 
    imageUrl, 
    onClose, 
    onSave 
}: { 
    imageUrl: string; 
    onClose: () => void; 
    onSave: (base64: string) => void;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [points, setPoints] = useState<Point[]>([]);
    const [draggingIdx, setDraggingId] = useState<number | null>(null);
    
    // 狀態管理
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [previewData, setPreviewData] = useState<string | null>(null);
    
    // 調教參數
    const [filterMode, setFilterMode] = useState<'original' | 'texture' | 'magic' | 'bw'>('texture');
    const [edgeTrim, setEdgeTrim] = useState<number>(0.02); // 預設內縮 2% 去除邊緣手指

    // 載入圖片並初始化 4 個頂點
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            setImage(img);
            const w = img.width; const h = img.height;
            // 預設稍微內縮，提供緩衝空間
            setPoints([
                { x: w * 0.1, y: h * 0.1 },     
                { x: w * 0.9, y: h * 0.1 },     
                { x: w * 0.9, y: h * 0.9 },     
                { x: w * 0.1, y: h * 0.9 }      
            ]);
        };
        img.src = imageUrl;
    }, [imageUrl]);

    // 渲染拉框畫面 (僅在非預覽狀態下)
    useEffect(() => {
        if (isPreviewing) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !image) return;

        canvas.width = image.width;
        canvas.height = image.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(image, 0, 0);

        // 畫遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(canvas.width, 0); ctx.lineTo(canvas.width, canvas.height); ctx.lineTo(0, canvas.height); ctx.closePath();
        ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[3].x, points[3].y); ctx.lineTo(points[2].x, points[2].y); ctx.lineTo(points[1].x, points[1].y); ctx.closePath();
        ctx.fill('evenodd');

        // 畫裁切框線
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = Math.max(4, canvas.width / 250);
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[1].x, points[1].y); ctx.lineTo(points[2].x, points[2].y); ctx.lineTo(points[3].x, points[3].y);
        ctx.closePath();
        ctx.stroke();

        // 畫 4 個控制點
        points.forEach((p, idx) => {
            ctx.fillStyle = draggingIdx === idx ? '#ef4444' : '#ffffff';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = Math.max(3, canvas.width / 350);
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(25, canvas.width / 40), 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.strokeStyle = draggingIdx === idx ? '#ffffff' : '#3b82f6';
            ctx.lineWidth = Math.max(2, canvas.width / 500);
            const crossSize = Math.max(10, canvas.width / 90);
            ctx.beginPath();
            ctx.moveTo(p.x - crossSize, p.y); ctx.lineTo(p.x + crossSize, p.y);
            ctx.moveTo(p.x, p.y - crossSize); ctx.lineTo(p.x, p.y + crossSize);
            ctx.stroke();
        });
    }, [image, points, draggingIdx, isPreviewing]);

    const getPointerPos = (e: React.PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const onPointerDown = (e: React.PointerEvent) => {
        if (isPreviewing) return;
        const pos = getPointerPos(e);
        const canvas = canvasRef.current;
        const hitRadius = Math.max(80, (canvas?.width || 1000) / 12);
        const hitIdx = points.findIndex(p => Math.hypot(p.x - pos.x, p.y - pos.y) < hitRadius);
        if (hitIdx !== -1) setDraggingId(hitIdx);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (draggingIdx === null || isPreviewing) return;
        const pos = getPointerPos(e);
        setPoints(prev => prev.map((p, idx) => idx === draggingIdx ? pos : p));
    };

    const onPointerUp = () => setDraggingId(null);

    // ★★★ 核心影像處理引擎 (帶入參數以支援實時切換) ★★★
    const processScan = async (currentMode = filterMode, currentTrim = edgeTrim) => {
        if (!image) return;
        setIsProcessing(true);
        setIsPreviewing(true);
        
        await new Promise(resolve => setTimeout(resolve, 50));

        // 1. 動態計算比例
        const widthTop = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
        const widthBottom = Math.hypot(points[2].x - points[3].x, points[2].y - points[3].y);
        const heightLeft = Math.hypot(points[3].x - points[0].x, points[3].y - points[0].y);
        const heightRight = Math.hypot(points[2].x - points[1].x, points[2].y - points[1].y);
        
        const widthAvg = (widthTop + widthBottom) / 2;
        const heightAvg = (heightLeft + heightRight) / 2;
        
        let ratio = heightAvg / widthAvg;
        if (ratio > 1.6) ratio = 1.5; 
        if (ratio < 1.2 && ratio > 1.0) ratio = 1.3;

        let outWidth = Math.max(widthAvg, 1600); 
        outWidth = Math.min(outWidth, 2200); 
        let outHeight = Math.round(outWidth * ratio);
        outWidth = Math.round(outWidth);

        // 2. 獲取原圖像素
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = image.width; srcCanvas.height = image.height;
        const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
        if (!srcCtx) return;
        srcCtx.drawImage(image, 0, 0);
        const srcData = srcCtx.getImageData(0, 0, image.width, image.height).data;
        const srcW = image.width; const srcH = image.height;

        // 3. 目標畫布
        const dstCanvas = document.createElement('canvas');
        dstCanvas.width = outWidth; dstCanvas.height = outHeight;
        const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true });
        if (!dstCtx) return;
        const dstImgData = dstCtx.createImageData(outWidth, outHeight);
        const dstData = dstImgData.data;

        // 4. 計算透視矩陣 (Homography)
        const [x0, y0] = [points[0].x, points[0].y], [x1, y1] = [points[1].x, points[1].y];
        const [x2, y2] = [points[2].x, points[2].y], [x3, y3] = [points[3].x, points[3].y];
        const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
        const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
        const det = dx1 * dy2 - dx2 * dy1 || 0.0001;
        const g = (sx * dy2 - sy * dx2) / det, h = (dx1 * sy - dy1 * sx) / det;
        const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0;
        const d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;

        // 5. 投影映射 (結合 UV 內縮裁切)
        for (let y = 0; y < outHeight; y++) {
            // ★ UV 內縮：這能完美物理裁切掉四周邊緣的手指與雜物
            const v = currentTrim + (y / outHeight) * (1 - 2 * currentTrim); 
            for (let x = 0; x < outWidth; x++) {
                const u = currentTrim + (x / outWidth) * (1 - 2 * currentTrim); 
                
                const denominator = g * u + h * v + 1 || 0.0001;
                const srcX = (a * u + b * v + c) / denominator;
                const srcY = (d * u + e * v + f) / denominator;

                let xf = Math.floor(srcX), yf = Math.floor(srcY);
                if (xf < 0) xf = 0; if (xf >= srcW - 1) xf = srcW - 2;
                if (yf < 0) yf = 0; if (yf >= srcH - 1) yf = srcH - 2;

                const dx = srcX - xf, dy = srcY - yf;
                const w1 = (1-dx)*(1-dy), w2 = dx*(1-dy), w3 = (1-dx)*dy, w4 = dx*dy;
                const i1 = (yf * srcW + xf) * 4, i2 = i1 + 4, i3 = ((yf + 1) * srcW + xf) * 4, i4 = i3 + 4;

                const dstIdx = (y * outWidth + x) * 4;
                dstData[dstIdx] = srcData[i1]*w1 + srcData[i2]*w2 + srcData[i3]*w3 + srcData[i4]*w4;
                dstData[dstIdx+1] = srcData[i1+1]*w1 + srcData[i2+1]*w2 + srcData[i3+1]*w3 + srcData[i4+1]*w4;
                dstData[dstIdx+2] = srcData[i1+2]*w1 + srcData[i2+2]*w2 + srcData[i3+2]*w3 + srcData[i4+2]*w4;
                dstData[dstIdx+3] = 255;
            }
        }
        dstCtx.putImageData(dstImgData, 0, 0);

        // 6. 光照校正與濾鏡 (如果不是原圖模式)
        if (currentMode !== 'original') {
            const illCanvas = document.createElement('canvas');
            illCanvas.width = outWidth; illCanvas.height = outHeight;
            const illCtx = illCanvas.getContext('2d', { willReadFrequently: true });
            
            if (illCtx) {
                illCtx.drawImage(dstCanvas, 0, 0);
                illCtx.globalCompositeOperation = 'lighten';
                const offset = Math.max(2, Math.floor(outWidth / 150));
                illCtx.drawImage(dstCanvas, offset, offset);
                illCtx.drawImage(dstCanvas, -offset, -offset);
                
                const tinyCanvas = document.createElement('canvas');
                tinyCanvas.width = 32; tinyCanvas.height = Math.floor(32 * ratio);
                const tinyCtx = tinyCanvas.getContext('2d');
                tinyCtx?.drawImage(illCanvas, 0, 0, tinyCanvas.width, tinyCanvas.height);
                
                illCtx.globalCompositeOperation = 'source-over';
                illCtx.imageSmoothingEnabled = true;
                illCtx.imageSmoothingQuality = 'high';
                illCtx.drawImage(tinyCanvas, 0, 0, tinyCanvas.width, tinyCanvas.height, 0, 0, outWidth, outHeight);

                const illData = illCtx.getImageData(0, 0, outWidth, outHeight).data;
                const finalData = dstCtx.getImageData(0, 0, outWidth, outHeight);
                const fd = finalData.data;

                for (let i = 0; i < fd.length; i += 4) {
                    let origR = fd[i], origG = fd[i+1], origB = fd[i+2];
                    let normR = (origR / Math.max(1, illData[i])) * 255;
                    let normG = (origG / Math.max(1, illData[i+1])) * 255;
                    let normB = (origB / Math.max(1, illData[i+2])) * 255;

                    let r, g, b;

                    if (currentMode === 'bw') {
                        let gray = normR * 0.299 + normG * 0.587 + normB * 0.114;
                        gray = gray > 180 ? 255 : (gray < 100 ? 0 : gray * 0.8);
                        r = g = b = gray;
                    } else if (currentMode === 'magic') {
                        r = normR > 210 ? 255 : (normR < 120 ? normR * 0.8 : normR);
                        g = normG > 210 ? 255 : (normG < 120 ? normG * 0.8 : normG);
                        b = normB > 210 ? 255 : (normB < 120 ? normB * 0.8 : normB);
                    } else {
                        // ★ 保留紋理模式：將平坦的除霧圖 (70%) 與原始物理圖 (30%) 混合
                        // 這能消除嚴重的漸層陰影，但完美保留紙張紋理與細節
                        r = origR * 0.3 + normR * 0.7;
                        g = origG * 0.3 + normG * 0.7;
                        b = origB * 0.3 + normB * 0.7;
                        // 輕微對比提升，避免死白
                        r = r > 235 ? 255 : r * 0.95;
                        g = g > 235 ? 255 : g * 0.95;
                        b = b > 235 ? 255 : b * 0.95;
                    }

                    fd[i] = r; fd[i+1] = g; fd[i+2] = b;
                }
                dstCtx.putImageData(finalData, 0, 0);

                // 7. 卷積銳化 (僅對強力漂白與黑白模式，保留紋理模式不銳化以維持自然)
                if (currentMode === 'magic' || currentMode === 'bw') {
                    const sharpData = dstCtx.getImageData(0, 0, outWidth, outHeight);
                    const sData = sharpData.data;
                    const copyData = new Uint8ClampedArray(sData); 
                    for (let y = 1; y < outHeight - 1; y++) {
                        for (let x = 1; x < outWidth - 1; x++) {
                            const idx = (y * outWidth + x) * 4;
                            for (let c = 0; c < 3; c++) {
                                const val = 5 * copyData[idx + c] - copyData[idx - 4 + c] - copyData[idx + 4 + c] - copyData[idx - outWidth * 4 + c] - copyData[idx + outWidth * 4 + c];
                                sData[idx + c] = Math.min(255, Math.max(0, val));
                            }
                        }
                    }
                    dstCtx.putImageData(sharpData, 0, 0);
                }
            }
        }
        
        setPreviewData(dstCanvas.toDataURL('image/jpeg', 0.95));
        setIsProcessing(false);
    };

    // 參數切換處理器 (改變參數後自動重算)
    const handleFilterChange = (mode: any) => {
        setFilterMode(mode);
        if (isPreviewing) processScan(mode, edgeTrim);
    };

    const handleTrimChange = (trim: number) => {
        setEdgeTrim(trim);
        if (isPreviewing) processScan(filterMode, trim);
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/95 flex flex-col items-center justify-center p-2 md:p-6 backdrop-blur-md animate-in fade-in">
            <div className="bg-slate-800 w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full max-h-[90vh]">
                
                {/* 頂部標題 */}
                <div className="p-4 bg-slate-900 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-white font-bold text-sm md:text-base flex items-center">
                            <Maximize size={18} className="mr-2 text-blue-400"/> 智能文檔掃描 (Pro Scanner)
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1">
                            {isPreviewing ? "您可以在下方即時切換濾鏡與邊緣裁切程度" : "請將四個點對齊文件角落，系統將為您自動補正"}
                        </p>
                    </div>
                    <button onClick={onClose} disabled={isProcessing} className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-full transition-colors"><X size={18}/></button>
                </div>

                {/* 畫布 / 預覽區 */}
                <div ref={containerRef} className="flex-1 overflow-hidden bg-black/80 relative flex items-center justify-center touch-none select-none p-2">
                    {isProcessing ? (
                        <div className="flex flex-col items-center text-blue-400">
                            <Loader2 size={48} className="animate-spin mb-4" />
                            <p className="font-bold tracking-widest animate-pulse">正在為您運算高畫質成品...</p>
                        </div>
                    ) : isPreviewing && previewData ? (
                        <div className="w-full h-full flex items-center justify-center animate-in zoom-in-95 duration-200">
                            <img src={previewData} className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-sm" alt="Scanned Preview" />
                        </div>
                    ) : (
                        <canvas
                            ref={canvasRef}
                            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
                            className="shadow-2xl touch-none rounded object-contain max-w-full max-h-full cursor-crosshair"
                            style={{ display: 'block' }}
                        />
                    )}
                </div>

                {/* ★ 底部調教面板 (互動式 UI) ★ */}
                {isPreviewing ? (
                    <div className="bg-slate-900 flex flex-col shrink-0 border-t border-slate-800">
                        {/* 控制面板列 */}
                        <div className="p-3 border-b border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 濾鏡選擇 */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 mb-1.5 flex items-center"><Wand2 size={12} className="mr-1"/> 影像質感濾鏡</label>
                                <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
                                    <button onClick={() => handleFilterChange('original')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${filterMode === 'original' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:bg-slate-700'}`}>原圖</button>
                                    <button onClick={() => handleFilterChange('texture')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${filterMode === 'texture' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:bg-slate-700'}`}>保留紋理</button>
                                    <button onClick={() => handleFilterChange('magic')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${filterMode === 'magic' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-700'}`}>強力漂白</button>
                                    <button onClick={() => handleFilterChange('bw')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${filterMode === 'bw' ? 'bg-slate-200 text-slate-800 shadow' : 'text-slate-400 hover:bg-slate-700'}`}>黑白</button>
                                </div>
                            </div>
                            {/* 邊緣去背裁切 */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 mb-1.5 flex items-center"><Crop size={12} className="mr-1"/> 邊緣雜物/手指內縮</label>
                                <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
                                    <button onClick={() => handleTrimChange(0)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${edgeTrim === 0 ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:bg-slate-700'}`}>不裁切</button>
                                    <button onClick={() => handleTrimChange(0.02)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${edgeTrim === 0.02 ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-700'}`}>微縮 2%</button>
                                    <button onClick={() => handleTrimChange(0.05)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${edgeTrim === 0.05 ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-700'}`}>適中 5%</button>
                                    <button onClick={() => handleTrimChange(0.08)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${edgeTrim === 0.08 ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-700'}`}>大裁 8%</button>
                                </div>
                            </div>
                        </div>
                        {/* 動作列 */}
                        <div className="p-3 flex justify-between items-center bg-slate-900">
                            <button onClick={() => { setIsPreviewing(false); setPreviewData(null); }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center">
                                <ArrowLeft size={16} className="mr-1.5"/> 重調框線
                            </button>
                            <button onClick={() => previewData && onSave(previewData)} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-black rounded-xl shadow-lg shadow-green-900/50 transition-transform active:scale-95 flex items-center gap-2">
                                <Check size={18}/> 儲存並取代原圖
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-slate-900 flex justify-between items-center shrink-0">
                        <button onClick={() => {
                            if(!image) return;
                            const w = image.width, h = image.height;
                            setPoints([{ x: w*0.1, y: h*0.1 }, { x: w*0.9, y: h*0.1 }, { x: w*0.9, y: h*0.9 }, { x: w*0.1, y: h*0.9 }]);
                        }} className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center">
                            <RotateCcw size={14} className="mr-1"/> 復原框線
                        </button>
                        <button onClick={() => processScan()} disabled={isProcessing} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl shadow-lg shadow-blue-900/50 transition-transform active:scale-95 flex items-center justify-center disabled:opacity-50">
                            <Maximize size={16} className="mr-1.5"/> 預覽掃描結果
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
