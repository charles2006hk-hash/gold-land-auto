import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Maximize, Wand2, Loader2, RotateCcw } from 'lucide-react';

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

    // 1. 載入圖片並初始化 4 個頂點 (預設內縮 10%)
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            setImage(img);
            const w = img.width; const h = img.height;
            setPoints([
                { x: w * 0.1, y: h * 0.1 },     // TL
                { x: w * 0.9, y: h * 0.1 },     // TR
                { x: w * 0.9, y: h * 0.9 },     // BR
                { x: w * 0.1, y: h * 0.9 }      // BL
            ]);
        };
        img.src = imageUrl;
    }, [imageUrl]);

    // 2. 渲染圖片與控制點
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !image) return;

        // 設定畫布尺寸適應螢幕，但保持內部坐標系與原圖一致
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 畫原圖
        ctx.drawImage(image, 0, 0);

        // 畫遮罩 (暗化未選取區域)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(canvas.width, 0); ctx.lineTo(canvas.width, canvas.height); ctx.lineTo(0, canvas.height); ctx.closePath();
        ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[3].x, points[3].y); ctx.lineTo(points[2].x, points[2].y); ctx.lineTo(points[1].x, points[1].y); ctx.closePath();
        ctx.fill('evenodd');

        // 畫裁切框線
        ctx.strokeStyle = '#3b82f6'; // Blue-500
        ctx.lineWidth = Math.max(4, canvas.width / 200);
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[1].x, points[1].y); ctx.lineTo(points[2].x, points[2].y); ctx.lineTo(points[3].x, points[3].y);
        ctx.closePath();
        ctx.stroke();

        // 畫 4 個控制節點
        points.forEach((p, idx) => {
            ctx.fillStyle = draggingIdx === idx ? '#ef4444' : '#ffffff';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = Math.max(2, canvas.width / 400);
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(15, canvas.width / 60), 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
    }, [image, points, draggingIdx]);

    // 拖曳邏輯轉換
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
        const hitRadius = Math.max(40, (canvas?.width || 1000) / 20);
        const hitIdx = points.findIndex(p => Math.hypot(p.x - pos.x, p.y - pos.y) < hitRadius);
        if (hitIdx !== -1) setDraggingId(hitIdx);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (draggingIdx === null) return;
        const pos = getPointerPos(e);
        setPoints(prev => prev.map((p, idx) => idx === draggingIdx ? pos : p));
    };

    const onPointerUp = () => setDraggingId(null);

    // ★ 核心 1：圖片濾鏡增強引擎 (Magic Color / B&W)
    const applyFilter = (ctx: CanvasRenderingContext2D, width: number, height: number, mode: string) => {
        if (mode === 'original') return;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // 增強對比度與亮度算法
        const contrast = mode === 'bw' ? 100 : 60; // 黑白模式對比極高
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const brightness = mode === 'bw' ? 20 : 15;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i], g = data[i+1], b = data[i+2];
            
            if (mode === 'bw') {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                r = g = b = gray;
            }

            data[i]   = Math.min(255, Math.max(0, factor * (r - 128) + 128 + brightness));
            data[i+1] = Math.min(255, Math.max(0, factor * (g - 128) + 128 + brightness));
            data[i+2] = Math.min(255, Math.max(0, factor * (b - 128) + 128 + brightness));
        }
        ctx.putImageData(imageData, 0, 0);
    };

    // ★ 核心 2：雙三角形仿射變換 (將不規則四邊形攤平成 A4 矩形)
    const processScan = async () => {
        if (!image) return;
        setIsProcessing(true);
        
        // 延遲以顯示 loading UI
        await new Promise(resolve => setTimeout(resolve, 50));

        // 計算輸出的 A4 尺寸 (寬高比 1 : 1.414)，寬度以選取範圍最大寬度為準，保證高清
        const widthTop = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
        const widthBottom = Math.hypot(points[2].x - points[3].x, points[2].y - points[3].y);
        const outWidth = Math.max(widthTop, widthBottom, 1200); // 確保最低有 1200px 解析度
        const outHeight = outWidth * 1.414; // A4 比例

        const outCanvas = document.createElement('canvas');
        outCanvas.width = outWidth; outCanvas.height = outHeight;
        const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
        if (!outCtx) return;

        outCtx.imageSmoothingEnabled = true;
        outCtx.imageSmoothingQuality = 'high';

        // 定義目標矩形的 4 個頂點
        const destPoints = [
            { x: 0, y: 0 }, { x: outWidth, y: 0 }, 
            { x: outWidth, y: outHeight }, { x: 0, y: outHeight }
        ];

        // 輔助函數：計算仿射變換矩陣並繪製三角形
        const drawTriangle = (src: Point[], dst: Point[]) => {
            outCtx.save();
            outCtx.beginPath();
            outCtx.moveTo(dst[0].x, dst[0].y); outCtx.lineTo(dst[1].x, dst[1].y); outCtx.lineTo(dst[2].x, dst[2].y);
            outCtx.closePath();
            outCtx.clip();

            const dX1 = src[1].x - src[0].x, dY1 = src[1].y - src[0].y;
            const dX2 = src[2].x - src[0].x, dY2 = src[2].y - src[0].y;
            const dX3 = dst[1].x - dst[0].x, dY3 = dst[1].y - dst[0].y;
            const dX4 = dst[2].x - dst[0].x, dY4 = dst[2].y - dst[0].y;

            const det = dX3 * dY4 - dY3 * dX4;
            if (det !== 0) {
                const a = (dX1 * dY4 - dY1 * dX4) / det;
                const b = (dY1 * dX3 - dX1 * dY3) / det;
                const c = (dX2 * dY4 - dY2 * dX4) / det;
                const d = (dY2 * dX3 - dX2 * dY3) / det;
                const e = src[0].x - a * dst[0].x - c * dst[0].y;
                const f = src[0].y - b * dst[0].x - d * dst[0].y;
                
                // 應用反向變換陣列
                outCtx.transform(a, b, c, d, e, f);
                outCtx.drawImage(image, 0, 0);
            }
            outCtx.restore();
        };

        // 將四邊形切成兩個三角形進行拼貼
        // 為了避免接縫產生白線，三角形邊緣稍微外擴 (透過線條覆蓋)
        drawTriangle([points[0], points[1], points[3]], [destPoints[0], destPoints[1], destPoints[3]]);
        drawTriangle([points[1], points[2], points[3]], [destPoints[1], destPoints[2], destPoints[3]]);

        // 應用掃描王增強濾鏡
        applyFilter(outCtx, outWidth, outHeight, filterMode);

        // 轉出 92% 高畫質 JPG
        const resultBase64 = outCanvas.toDataURL('image/jpeg', 0.92);
        onSave(resultBase64);
        setIsProcessing(false);
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/95 flex flex-col items-center justify-center p-2 md:p-6 backdrop-blur-md animate-in fade-in">
            <div className="bg-slate-800 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full max-h-[90vh]">
                
                {/* 頂部標題 */}
                <div className="p-4 bg-slate-900 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-white font-bold text-sm md:text-base flex items-center">
                            <Maximize size={18} className="mr-2 text-blue-400"/> 智能文檔掃描 (Document Scanner)
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1">請拖曳四個藍色圓點，對齊文件的四個角落</p>
                    </div>
                    <button onClick={onClose} disabled={isProcessing} className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-full transition-colors"><X size={18}/></button>
                </div>

                {/* 畫布區 */}
                <div ref={containerRef} className="flex-1 overflow-hidden bg-black/50 relative flex items-center justify-center touch-none select-none p-2">
                    {isProcessing ? (
                        <div className="flex flex-col items-center text-blue-400">
                            <Loader2 size={48} className="animate-spin mb-4" />
                            <p className="font-bold tracking-widest animate-pulse">正在重建高清文檔與套用濾鏡...</p>
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

                {/* 底部濾鏡與操作區 */}
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
                            setPoints([{ x: w*0.1, y: h*0.1 }, { x: w*0.9, y: h*0.1 }, { x: w*0.9, y: h*0.9 }, { x: w*0.1, y: h*0.9 }]);
                        }} className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center flex-1 md:flex-none">
                            <RotateCcw size={14} className="mr-1"/> 重設
                        </button>
                        <button onClick={processScan} disabled={isProcessing} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl shadow-lg shadow-blue-900/50 transition-transform active:scale-95 flex items-center justify-center flex-1 md:flex-none disabled:opacity-50">
                            <Check size={16} className="mr-1.5"/> 建立掃描檔
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
