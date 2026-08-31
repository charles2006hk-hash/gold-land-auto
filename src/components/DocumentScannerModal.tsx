import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Maximize, Wand2, Loader2, RotateCcw, ArrowLeft } from 'lucide-react';

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
    const [isProcessing, setIsProcessing] = useState(false);
    const [filterMode, setFilterMode] = useState<'magic' | 'bw' | 'original'>('magic');
    
    // ★ 新增：預覽掃描結果的狀態
    const [previewData, setPreviewData] = useState<string | null>(null);

    // 載入圖片並初始化 4 個頂點
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            setImage(img);
            const w = img.width; const h = img.height;
            setPoints([
                { x: w * 0.15, y: h * 0.15 },     // TL
                { x: w * 0.85, y: h * 0.15 },     // TR
                { x: w * 0.85, y: h * 0.85 },     // BR
                { x: w * 0.15, y: h * 0.85 }      // BL
            ]);
        };
        img.src = imageUrl;
    }, [imageUrl]);

    // 渲染圖片與藍色控制點 (只有在非預覽模式才需要畫)
    useEffect(() => {
        if (previewData) return; // 如果在預覽模式，就不畫控制點

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !image) return;

        canvas.width = image.width;
        canvas.height = image.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(image, 0, 0);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(canvas.width, 0); ctx.lineTo(canvas.width, canvas.height); ctx.lineTo(0, canvas.height); ctx.closePath();
        ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[3].x, points[3].y); ctx.lineTo(points[2].x, points[2].y); ctx.lineTo(points[1].x, points[1].y); ctx.closePath();
        ctx.fill('evenodd');

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = Math.max(4, canvas.width / 250);
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[1].x, points[1].y); ctx.lineTo(points[2].x, points[2].y); ctx.lineTo(points[3].x, points[3].y);
        ctx.closePath();
        ctx.stroke();

        points.forEach((p, idx) => {
            ctx.fillStyle = draggingIdx === idx ? '#ef4444' : '#ffffff';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = Math.max(3, canvas.width / 350);
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(20, canvas.width / 45), 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.strokeStyle = draggingIdx === idx ? '#ffffff' : '#3b82f6';
            ctx.lineWidth = Math.max(2, canvas.width / 500);
            const crossSize = Math.max(8, canvas.width / 100);
            ctx.beginPath();
            ctx.moveTo(p.x - crossSize, p.y); ctx.lineTo(p.x + crossSize, p.y);
            ctx.moveTo(p.x, p.y - crossSize); ctx.lineTo(p.x, p.y + crossSize);
            ctx.stroke();
        });
    }, [image, points, draggingIdx, previewData]);

    const getPointerPos = (e: React.PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const onPointerDown = (e: React.PointerEvent) => {
        const pos = getPointerPos(e);
        const canvas = canvasRef.current;
        const hitRadius = Math.max(60, (canvas?.width || 1000) / 15);
        const hitIdx = points.findIndex(p => Math.hypot(p.x - pos.x, p.y - pos.y) < hitRadius);
        if (hitIdx !== -1) setDraggingId(hitIdx);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (draggingIdx === null) return;
        const pos = getPointerPos(e);
        setPoints(prev => prev.map((p, idx) => idx === draggingIdx ? pos : p));
    };

    const onPointerUp = () => setDraggingId(null);

    // 透視變換演算法
    const processScan = async () => {
        if (!image) return;
        setIsProcessing(true);
        
        await new Promise(resolve => setTimeout(resolve, 50));

        const widthTop = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
        const widthBottom = Math.hypot(points[2].x - points[3].x, points[2].y - points[3].y);
        const heightLeft = Math.hypot(points[3].x - points[0].x, points[3].y - points[0].y);
        const heightRight = Math.hypot(points[2].x - points[1].x, points[2].y - points[1].y);
        
        const outWidth = Math.max(widthTop, widthBottom, 1200); 
        const outHeight = Math.max(heightLeft, heightRight, outWidth * 1.414);

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = image.width; srcCanvas.height = image.height;
        const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
        if (!srcCtx) return;
        srcCtx.drawImage(image, 0, 0);
        const srcImgData = srcCtx.getImageData(0, 0, image.width, image.height);
        const srcData = srcImgData.data;
        const srcW = image.width; const srcH = image.height;

        const dstCanvas = document.createElement('canvas');
        dstCanvas.width = outWidth; dstCanvas.height = outHeight;
        const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true });
        if (!dstCtx) return;
        const dstImgData = dstCtx.createImageData(outWidth, outHeight);
        const dstData = dstImgData.data;

        const x0 = points[0].x, y0 = points[0].y;
        const x1 = points[1].x, y1 = points[1].y;
        const x2 = points[2].x, y2 = points[2].y;
        const x3 = points[3].x, y3 = points[3].y;

        const sx = x0 - x1 + x2 - x3;
        const sy = y0 - y1 + y2 - y3;
        const dx1 = x1 - x2;
        const dx2 = x3 - x2;
        const dy1 = y1 - y2;
        const dy2 = y3 - y2;

        const det = dx1 * dy2 - dx2 * dy1;
        const g = (sx * dy2 - sy * dx2) / det;
        const h = (dx1 * sy - dy1 * sx) / det;
        
        const a = x1 - x0 + g * x1;
        const b = x3 - x0 + h * x3;
        const c = x0;
        const d = y1 - y0 + g * y1;
        const e = y3 - y0 + h * y3;
        const f = y0;

        const lut = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            let val = i;
            if (filterMode === 'bw') val = (i - 128) * 2.5 + 128 + 40; 
            else if (filterMode === 'magic') val = (i - 128) * 1.5 + 128 + 30; 
            lut[i] = Math.min(255, Math.max(0, val));
        }

        for (let y = 0; y < outHeight; y++) {
            const v = y / outHeight; 
            for (let x = 0; x < outWidth; x++) {
                const u = x / outWidth; 

                const denominator = g * u + h * v + 1;
                const srcX = (a * u + b * v + c) / denominator;
                const srcY = (d * u + e * v + f) / denominator;

                let xf = Math.floor(srcX);
                let yf = Math.floor(srcY);
                if (xf < 0) xf = 0; if (xf >= srcW - 1) xf = srcW - 2;
                if (yf < 0) yf = 0; if (yf >= srcH - 1) yf = srcH - 2;

                const dx = srcX - xf;
                const dy = srcY - yf;
                const omdx = 1 - dx;
                const omdy = 1 - dy;

                const w1 = omdx * omdy, w2 = dx * omdy, w3 = omdx * dy, w4 = dx * dy;

                const i1 = (yf * srcW + xf) * 4, i2 = i1 + 4, i3 = ((yf + 1) * srcW + xf) * 4, i4 = i3 + 4;

                let pr = srcData[i1] * w1 + srcData[i2] * w2 + srcData[i3] * w3 + srcData[i4] * w4;
                let pg = srcData[i1+1] * w1 + srcData[i2+1] * w2 + srcData[i3+1] * w3 + srcData[i4+1] * w4;
                let pb = srcData[i1+2] * w1 + srcData[i2+2] * w2 + srcData[i3+2] * w3 + srcData[i4+2] * w4;

                if (filterMode === 'bw') {
                    const gray = Math.round(pr * 0.299 + pg * 0.587 + pb * 0.114);
                    pr = pg = pb = lut[gray];
                } else if (filterMode === 'magic') {
                    pr = lut[Math.round(pr)]; pg = lut[Math.round(pg)]; pb = lut[Math.round(pb)];
                }

                const dstIdx = (y * outWidth + x) * 4;
                dstData[dstIdx] = pr; dstData[dstIdx + 1] = pg; dstData[dstIdx + 2] = pb; dstData[dstIdx + 3] = 255;
            }
        }
        
        dstCtx.putImageData(dstImgData, 0, 0);
        
        const resultBase64 = dstCanvas.toDataURL('image/jpeg', 0.92);
        
        // ★ 不直接存檔，而是切換到預覽畫面
        setPreviewData(resultBase64);
        setIsProcessing(false);
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/95 flex flex-col items-center justify-center p-2 md:p-6 backdrop-blur-md animate-in fade-in">
            <div className="bg-slate-800 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full max-h-[90vh]">
                
                {/* 頂部標題 */}
                <div className="p-4 bg-slate-900 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-white font-bold text-sm md:text-base flex items-center">
                            <Maximize size={18} className="mr-2 text-blue-400"/> 智能文檔掃描 (Pro Scanner)
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1">
                            {previewData ? "請確認掃描結果是否清晰" : "請拖曳四個藍色圓點，精準對齊牌簿/文件的四個角落"}
                        </p>
                    </div>
                    <button onClick={onClose} disabled={isProcessing} className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-full transition-colors"><X size={18}/></button>
                </div>

                {/* 主畫面：如果是預覽模式就顯示圖，否則顯示拉框 Canvas */}
                <div ref={containerRef} className="flex-1 overflow-hidden bg-black/80 relative flex items-center justify-center touch-none select-none p-2">
                    {isProcessing ? (
                        <div className="flex flex-col items-center text-blue-400">
                            <Loader2 size={48} className="animate-spin mb-4" />
                            <p className="font-bold tracking-widest animate-pulse">正在透過透視矩陣重建高畫質文檔...</p>
                        </div>
                    ) : previewData ? (
                        // ★ 預覽掃描結果
                        <div className="w-full h-full flex items-center justify-center animate-in zoom-in-95 duration-200">
                            <img src={previewData} className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-sm" alt="Scanned Preview" />
                        </div>
                    ) : (
                        // ★ 拉框作業區
                        <canvas
                            ref={canvasRef}
                            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
                            className="shadow-2xl touch-none rounded object-contain max-w-full max-h-full cursor-crosshair"
                            style={{ display: 'block' }}
                        />
                    )}
                </div>

                {/* 底部操作列 */}
                {previewData ? (
                    // ★ 預覽模式的底部列
                    <div className="p-4 bg-slate-900 flex justify-between items-center shrink-0 border-t border-slate-800">
                        <button onClick={() => setPreviewData(null)} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-xl transition-colors flex items-center shadow-md">
                            <ArrowLeft size={16} className="mr-1.5"/> 返回重調框線
                        </button>
                        <button onClick={() => onSave(previewData)} className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-black rounded-xl shadow-lg shadow-green-900/50 transition-transform active:scale-95 flex items-center gap-2">
                            <Check size={18}/> 確認並替換原圖
                        </button>
                    </div>
                ) : (
                    // ★ 拉框模式的底部列
                    <div className="p-4 bg-slate-900 flex flex-col md:flex-row justify-between items-center shrink-0 gap-4">
                        <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl">
                            <button onClick={() => setFilterMode('magic')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center ${filterMode === 'magic' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><Wand2 size={14} className="mr-1.5"/>魔法增強</button>
                            <button onClick={() => setFilterMode('bw')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterMode === 'bw' ? 'bg-slate-200 text-slate-800 shadow-md' : 'text-slate-400 hover:text-white'}`}>黑白掃描</button>
                            <button onClick={() => setFilterMode('original')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterMode === 'original' ? 'bg-slate-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>原圖色彩</button>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <button onClick={() => {
                                if(!image) return;
                                const w = image.width, h = image.height;
                                setPoints([{ x: w*0.15, y: h*0.15 }, { x: w*0.85, y: h*0.15 }, { x: w*0.85, y: h*0.85 }, { x: w*0.15, y: h*0.85 }]);
                            }} className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center flex-1 md:flex-none">
                                <RotateCcw size={14} className="mr-1"/> 重設
                            </button>
                            <button onClick={processScan} disabled={isProcessing} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl shadow-lg shadow-blue-900/50 transition-transform active:scale-95 flex items-center justify-center flex-1 md:flex-none disabled:opacity-50">
                                <Maximize size={16} className="mr-1.5"/> 預覽掃描效果
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
