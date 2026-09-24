// src/components/MediaLibraryModule.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Upload, Settings, ImageIcon, Clipboard, Loader2, Plus, 
    Car, FileText, Check, Maximize2, Edit, Trash2, Star, 
    Minimize2, X, Move, Save, PenTool, Crop, Shield
} from 'lucide-react';
import { 
    collection, query, orderBy, onSnapshot, doc, updateDoc, 
    serverTimestamp, deleteDoc, writeBatch, addDoc 
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { compressImage } from '@/utils/imageHelpers';
import { MediaLibraryItem, Vehicle, SystemSettings } from '@/types';

// ==================================================================
// 1. 圖片/文件智能分流壓縮工具函數
// ==================================================================
export const compressImageSmart = (file: File, type: 'vehicle' | 'document' = 'vehicle'): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                const MAX_SIZE = type === 'document' ? 2400 : 1280;
                
                if (width > height) {
                    if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                } else {
                    if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                }
                
                const quality = type === 'document' ? 0.92 : 0.6;
                
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error("Compression failed"));
                }, 'image/jpeg', quality);
            };
        };
        reader.onerror = error => reject(error);
    });
};

// ==================================================================
// 2. ★★★ 終極雙軌版：圖片編輯器 (精準 4 點透視遮罩 + 拖曳裁剪) ★★★
// ==================================================================
const ImageEditorModal = ({ imageUrl, onClose, onSave }: { imageUrl: string, onClose: () => void, onSave: (dataUrl: string) => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // 核心影像資料
    const [snapshot, setSnapshot] = useState<ImageData | null>(null);
    const [originalImg, setOriginalImg] = useState<HTMLImageElement | null>(null);
    
    // 編輯模式
    const [mode, setMode] = useState<'mask' | 'crop'>('mask');
    const [maskStyle, setMaskStyle] = useState<'blur' | 'front' | 'rear'>('blur');
    
    // 遮罩與裁剪座標狀態
    const [points, setPoints] = useState<{x: number, y: number}[]>([]);
    const [cropStart, setCropStart] = useState<{x: number, y: number} | null>(null);
    const [cropEnd, setCropEnd] = useState<{x: number, y: number} | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // 1. 初始化畫布與圖片
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d', { willReadFrequently: true });
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl;
        img.onload = () => {
            if (canvas && ctx) {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                setOriginalImg(img);
                setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));
            }
        };
    }, [imageUrl]);

    // 2. 共用繪製引擎 (處理紅點、紅線、以及半透明裁剪遮罩)
    const drawOverlay = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !snapshot) return;

        // 永遠先還原乾淨底圖
        ctx.putImageData(snapshot, 0, 0);

        if (mode === 'mask' && points.length > 0) {
            const dynamicLineWidth = Math.max(4, canvas.width / 250);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = dynamicLineWidth;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
            ctx.stroke();

            points.forEach((p, idx) => {
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(p.x, p.y, dynamicLineWidth * 1.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${dynamicLineWidth * 3}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText((idx + 1).toString(), p.x, p.y - (dynamicLineWidth * 3.5));
            });
        } else if (mode === 'crop' && cropStart && cropEnd) {
            const x = Math.min(cropStart.x, cropEnd.x);
            const y = Math.min(cropStart.y, cropEnd.y);
            const w = Math.abs(cropEnd.x - cropStart.x);
            const h = Math.abs(cropEnd.y - cropStart.y);

            // 畫出半透明黑底
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, canvas.width, y);
            ctx.fillRect(0, y + h, canvas.width, canvas.height - y - h);
            ctx.fillRect(0, y, x, h);
            ctx.fillRect(x + w, y, canvas.width - x - w, h);

            // 畫出虛線裁剪框
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = Math.max(3, canvas.width / 400);
            ctx.setLineDash([10, 10]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);
        }
    };

    // 監聽狀態改變並觸發重繪
    useEffect(() => { drawOverlay(); }, [points, cropStart, cropEnd, mode, snapshot]);

    // 3. 處理游標與觸控事件
    const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const { x, y } = getCoordinates(e);

        if (mode === 'mask') {
            if (points.length >= 4) return;
            const newPoints = [...points, { x, y }];
            setPoints(newPoints);
            if (newPoints.length === 4) applyMask(newPoints);
        } else if (mode === 'crop') {
            setIsDragging(true);
            setCropStart({ x, y });
            setCropEnd({ x, y });
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (mode === 'crop' && isDragging) {
            setCropEnd(getCoordinates(e));
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (mode === 'crop') setIsDragging(false);
    };

    // 4. 執行透視遮罩 (專剋斜角車牌)
    const applyMask = (quad: {x: number, y: number}[]) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !snapshot || !originalImg) return;

        // 還原底圖，擦除紅點
        ctx.putImageData(snapshot, 0, 0);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(quad[0].x, quad[0].y);
        ctx.lineTo(quad[1].x, quad[1].y);
        ctx.lineTo(quad[2].x, quad[2].y);
        ctx.lineTo(quad[3].x, quad[3].y);
        ctx.closePath();

        if (maskStyle === 'blur') {
            ctx.clip();
            ctx.filter = `blur(${Math.max(15, canvas.width / 40)}px)`;
            ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = maskStyle === 'front' ? 'rgba(250, 250, 252, 0.98)' : 'rgba(250, 204, 21, 0.98)';
            ctx.fill();
            ctx.lineWidth = Math.max(2, canvas.width / 500);
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.stroke();
        }
        ctx.restore();

        // 寫入新的 Snapshot，讓下一次操作(或裁剪)基於已遮罩的圖
        const newSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setSnapshot(newSnapshot);
        // 更新 originalImg 確保連續操作不出錯
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
        tempCanvas.getContext('2d')?.putImageData(newSnapshot, 0, 0);
        const newImg = new Image();
        newImg.onload = () => setOriginalImg(newImg);
        newImg.src = tempCanvas.toDataURL();

        setPoints([]); 
    };

    // 5. 輸出儲存邏輯 (智能判定裁剪範圍)
    const handleSaveClick = () => {
        const canvas = canvasRef.current;
        if (!canvas || !snapshot) return;

        // 建立乾淨的離線畫布，避免將 UI 框線存入圖片
        const cleanCanvas = document.createElement('canvas');
        cleanCanvas.width = canvas.width;
        cleanCanvas.height = canvas.height;
        cleanCanvas.getContext('2d')?.putImageData(snapshot, 0, 0);

        if (mode === 'crop' && cropStart && cropEnd) {
            const x = Math.min(cropStart.x, cropEnd.x);
            const y = Math.min(cropStart.y, cropEnd.y);
            const w = Math.abs(cropEnd.x - cropStart.x);
            const h = Math.abs(cropEnd.y - cropStart.y);

            // 防呆：避免使用者點擊一下產生過小的無效圖片
            if (w > 50 && h > 50) { 
                const cropCanvas = document.createElement('canvas');
                cropCanvas.width = w;
                cropCanvas.height = h;
                const cropCtx = cropCanvas.getContext('2d');
                cropCtx?.drawImage(cleanCanvas, x, y, w, h, 0, 0, w, h);
                onSave(cropCanvas.toDataURL('image/jpeg', 0.92));
                return;
            }
        }
        
        // 如果沒有裁剪或無效裁剪，直接輸出包含遮罩的整張圖片
        onSave(cleanCanvas.toDataURL('image/jpeg', 0.92));
    };

    const promptText = mode === 'crop' 
        ? "🖱️ 請在圖片上拖曳框選要保留的區域"
        : points.length === 0 ? "👆 請點擊車牌【左上角】(第 1 點)" :
          points.length === 1 ? "👆 請點擊車牌【右上角】(第 2 點)" :
          points.length === 2 ? "👆 請點擊車牌【右下角】(第 3 點)" :
          "👆 請點擊車牌【左下角】(第 4 點) 即可完成！";

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/95 flex flex-col items-center justify-center p-2 md:p-6 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-800 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full max-h-[90vh]">
                
                {/* 頂部工具列 */}
                <div className="p-4 bg-slate-900 flex justify-between items-center shrink-0">
                    <h3 className="text-white font-bold text-sm md:text-base flex items-center">
                        <span className="bg-blue-600 p-1.5 rounded-lg mr-2"><PenTool size={16}/></span> 
                        智能圖片編輯器
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-full transition-colors"><X size={18}/></button>
                </div>

                {/* 雙軌模式切換區 */}
                <div className="bg-slate-800 p-2 flex justify-center border-b border-slate-700 shrink-0">
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                        <button onClick={() => { setMode('mask'); setPoints([]); }} className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition-all ${mode === 'mask' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                            <Shield size={16}/> 四點透視遮罩
                        </button>
                        <button onClick={() => { setMode('crop'); setCropStart(null); setCropEnd(null); }} className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition-all ${mode === 'crop' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                            <Crop size={16}/> 裁剪 / 縮放
                        </button>
                    </div>
                </div>

                {/* 遮罩專屬設定 */}
                {mode === 'mask' && (
                    <div className="bg-slate-800 p-2 flex flex-wrap justify-center gap-3 border-b border-slate-700 shrink-0 animate-in fade-in">
                        <button onClick={() => { setMaskStyle('blur'); setPoints([]); }} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${maskStyle === 'blur' ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'}`}>💧 質感毛玻璃</button>
                        <button onClick={() => { setMaskStyle('front'); setPoints([]); }} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${maskStyle === 'front' ? 'bg-white text-slate-800' : 'bg-slate-700 text-slate-300'}`}>⬜ 前牌 (純白)</button>
                        <button onClick={() => { setMaskStyle('rear'); setPoints([]); }} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${maskStyle === 'rear' ? 'bg-yellow-400 text-yellow-950' : 'bg-slate-700 text-slate-300'}`}>🟨 後牌 (純黃)</button>
                    </div>
                )}

                {/* 畫布區塊 */}
                <div ref={containerRef} className="flex-1 overflow-hidden bg-black/80 relative flex items-center justify-center p-2 touch-none select-none">
                    <canvas
                        ref={canvasRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        className="cursor-crosshair shadow-2xl touch-none rounded-sm max-w-full max-h-full object-contain"
                        style={{ display: 'block' }}
                    />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white font-bold pointer-events-none drop-shadow-md bg-black/60 px-5 py-2.5 rounded-full flex items-center shadow-lg border border-white/10">
                        {promptText}
                        {mode === 'mask' && points.length > 0 && (
                            <span 
                                className="ml-4 pl-4 border-l border-white/30 text-red-400 pointer-events-auto cursor-pointer hover:text-red-300 underline"
                                onPointerDown={(e) => { e.stopPropagation(); setPoints(prev => prev.slice(0, -1)); }}
                            >
                                撤銷上一步
                            </span>
                        )}
                    </div>
                </div>

                {/* 底部操作區 */}
                <div className="p-4 bg-slate-900 flex justify-between items-center shrink-0">
                    <button onClick={() => {
                        const canvas = canvasRef.current;
                        const ctx = canvas?.getContext('2d');
                        if (canvas && ctx && originalImg) {
                            ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);
                            setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));
                            setPoints([]);
                            setCropStart(null);
                            setCropEnd(null);
                        }
                    }} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-xl transition-colors">
                        還原重來
                    </button>
                    <button onClick={handleSaveClick} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl shadow-lg shadow-blue-900/50 transition-transform active:scale-95 flex items-center gap-2">
                        <Check size={18}/> 儲存並替換
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==================================================================
// 3. 智能圖庫主體 (MediaLibraryModule)
// ==================================================================
export default function MediaLibraryModule({ db, storage, staffId, appId, settings, inventory }: any) {
    const [mediaItems, setMediaItems] = useState<MediaLibraryItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const [selectedInboxIds, setSelectedInboxIds] = useState<string[]>([]);
    const [targetVehicleId, setTargetVehicleId] = useState<string>('');
    const [classifyForm, setClassifyForm] = useState({ make: '', model: '', year: new Date().getFullYear().toString(), color: '', type: '外觀 (Exterior)' as '外觀 (Exterior)'|'內飾 (Interior)', tags: '' });
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileTab, setMobileTab] = useState<'inbox' | 'classify' | 'gallery'>('inbox');
    const [classifySearch, setClassifySearch] = useState('');
    const [editingMedia, setEditingMedia] = useState<MediaLibraryItem | null>(null);
    const [activeGroupImages, setActiveGroupImages] = useState<Record<string, string>>({});

    const handleSaveEditedImage = async (oldItem: MediaLibraryItem, newBase64: string) => {
        if (!storage || !db) return;
        try {
            const newFilePath = `media/${appId}/edited_${Date.now()}.jpg`;
            const storageRef = ref(storage, newFilePath);
            await uploadString(storageRef, newBase64, 'data_url');
            const newUrl = await getDownloadURL(storageRef);

            const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', oldItem.id);
            await updateDoc(docRef, { url: newUrl, path: newFilePath, updatedAt: serverTimestamp() });

            if (oldItem.path) {
                const oldRef = ref(storage, oldItem.path);
                await deleteObject(oldRef).catch(e => console.warn("舊圖刪除失敗(可忽略)", e));
            }
            setEditingMedia(null); 
        } catch (err) {
            console.error(err); alert('儲存失敗，請檢查網路連線。');
        }
    };

    useEffect(() => {
        if (!db || !staffId) return;

        // ★ 智能權限判斷：是否擁有全部資料視角
        const hasAllAccess = currentUser?.dataAccess === 'all' || currentUser?.modules?.includes('all') || String(staffId).toUpperCase() === 'BOSS';

        const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library'), orderBy('createdAt', 'desc'));
        
        return onSnapshot(q, (snap) => {
            const list: MediaLibraryItem[] = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() } as MediaLibraryItem));
            
            const myImages = list.filter(img => {
                // 如果有上帝視角，直接看全公司所有圖片
                if (hasAllAccess) return true;
                
                const uploader = String(img.uploadedBy || '').toUpperCase();
                const currentStatus = img.status as string;
                const isAssigned = currentStatus === 'linked' || currentStatus === 'assigned';
                const targetId = img.relatedVehicleId || (img as any).vehicleId;
                
                // 如果已綁定車輛，檢查使用者是否對該車輛有權限 (inventory 已經根據使用者權限過濾過)
                if (isAssigned && targetId) return inventory.some((v: Vehicle) => v.id === targetId);
                
                // 如果未綁定 (待處理區)，且沒有上帝視角，則只能看自己上傳的
                if (currentStatus === 'unassigned' || !currentStatus) return uploader === String(staffId).toUpperCase();
                
                return false; 
            });
            setMediaItems(myImages);
        });
    }, [db, staffId, appId, inventory, currentUser]); // 👈 確保依賴陣列有 currentUser

    const libraryGroups = useMemo(() => {
        const groups: Record<string, { key: string, title: string, items: MediaLibraryItem[], status: string, timestamp: number }> = {};
        const filteredItems = mediaItems.filter(i => {
            const currentStatus = i.status as string;
            if (currentStatus !== 'linked' && currentStatus !== 'assigned') return false;
            
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            const aiText = `${i.aiData?.year} ${i.aiData?.make} ${i.aiData?.model} ${i.aiData?.color}`.toLowerCase();
            const targetId = i.relatedVehicleId || (i as any).vehicleId;
            const car = inventory.find((v:any) => v.id === targetId);
            const regMark = car ? (car.regMark || '').toLowerCase() : '';
            return aiText.includes(query) || regMark.includes(query);
        });

        filteredItems.forEach(item => {
            const targetId = item.relatedVehicleId || (item as any).vehicleId;
            let groupKey = targetId || `${item.aiData?.year}-${item.aiData?.make}-${item.aiData?.model}`;
            let groupTitle = `${item.aiData?.year || ''} ${item.aiData?.make || ''} ${item.aiData?.model || ''}`.trim() || '未分類車輛';
            let status = 'Unknown';

            if (targetId) {
                const car = inventory.find((v:any) => v.id === targetId);
                if (car) { groupTitle = `${car.year} ${car.make} ${car.model} (${car.regMark || '未出牌'})`; status = car.status; }
            } else {
                const matchCar = inventory.find((v:any) => v.make === item.aiData?.make && v.model === item.aiData?.model && v.year == item.aiData?.year);
                if (matchCar) status = matchCar.status;
            }

            if (!groups[groupKey]) { groups[groupKey] = { key: groupKey, title: groupTitle, items: [], status: status, timestamp: item.createdAt?.seconds || 0 }; }
            groups[groupKey].items.push(item);
        });

        Object.values(groups).forEach(group => { group.items.sort((a, b) => (b.isPrimary?1:0) - (a.isPrimary?1:0)); });
        return Object.values(groups).sort((a, b) => b.timestamp - a.timestamp);
    }, [mediaItems, inventory, searchQuery]);

    const handleSmartUpload = async (e: any, forcedType?: 'vehicle' | 'document') => {
        const files = e.target?.files || e.dataTransfer?.files;
        if (!files || !storage || files.length === 0) return;
        setUploading(true);

        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            const lowerName = file.name.toLowerCase();
            let autoType: 'vehicle' | 'document' = forcedType || 'vehicle';
            if (!forcedType && (file.type === 'application/pdf' || lowerName.includes('id') || lowerName.includes('br') || lowerName.includes('scan') || lowerName.includes('doc'))) {
                autoType = 'document';
            }

            try {
                if (file.type === 'application/pdf') {
                    const pdfjsLib = await import('pdfjs-dist');
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    const MAX_PAGES = Math.min(pdf.numPages, 10);
                    for (let p = 1; p <= MAX_PAGES; p++) {
                        const page = await pdf.getPage(p);
                        const viewport = page.getViewport({ scale: 2.0 });
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = viewport.width; canvas.height = viewport.height;
                        if (ctx) {
                            await page.render({ canvasContext: ctx, viewport } as any).promise;
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                            await uploadToStorage(dataUrl, `${file.name}_P${p}.jpg`, 'document');
                        }
                    }
                    continue; 
                }

                if (lowerName.endsWith('.heic') || lowerName.endsWith('.heif')) {
                    // @ts-ignore
                    const heic2any = (await import('heic2any')).default;
                    const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 }) as Blob;
                    file = new window.File([convertedBlob], file.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' });
                }

                const compressedBlob = await compressImageSmart(file, autoType); 
                const base64Data = await new Promise<string>((resolve) => {
                    const r = new FileReader();
                    r.onloadend = () => resolve(r.result as string);
                    r.readAsDataURL(compressedBlob);
                });

                await uploadToStorage(base64Data, file.name, autoType);

            } catch (err) { console.error(`處理 ${file.name} 失敗:`, err); }
        }
        setUploading(false);
    };

    const uploadToStorage = async (base64Data: string, fileName: string, type: 'vehicle' | 'document') => {
        const filePath = `media/${appId}/${Date.now()}_${fileName}`;
        const storageRef = ref(storage, filePath);
        await uploadString(storageRef, base64Data, 'data_url');
        const downloadURL = await getDownloadURL(storageRef);
        
        await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library'), { 
            url: downloadURL, path: filePath, fileName: fileName, tags: ["Inbox"], status: 'unassigned', 
            mediaType: type, aiData: {}, createdAt: serverTimestamp(), uploadedBy: staffId 
        });
    };

    const handlePasteUpload = async () => {
        try {
            const clipboardItems = await navigator.clipboard.read();
            setUploading(true);
            let hasImage = false;
            for (const item of clipboardItems) {
                const imageType = item.types.find(t => t.startsWith('image/'));
                if (imageType) {
                    hasImage = true;
                    const blob = await item.getType(imageType);
                    const file = new window.File([blob], `pasted_${Date.now()}.png`, { type: imageType });
                    const compressedBase64 = await compressImage(file, 130);
                    const filePath = `media/${appId}/${Date.now()}_${file.name}`;
                    const storageRef = ref(storage, filePath);
                    await uploadString(storageRef, compressedBase64, 'data_url');
                    const downloadURL = await getDownloadURL(storageRef);
                    
                    await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library'), { 
                        url: downloadURL, path: filePath, fileName: file.name, tags: ["Inbox", "Pasted"], 
                        status: 'unassigned', aiData: {}, createdAt: serverTimestamp(), uploadedBy: staffId 
                    });
                }
            }
            if (!hasImage) alert("剪貼簿中沒有圖片 / No Image found");
        } catch (err) {
            console.error(err); alert("無法讀取剪貼簿 (需使用 HTTPS 或在 Safari 手動允許)");
        } finally { setUploading(false); }
    };

    const handleSetPrimary = async (targetId: string, groupItems: MediaLibraryItem[]) => {
        if (!db) return;
        const batch = writeBatch(db);
        groupItems.forEach(item => { if (item.isPrimary) batch.update(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', item.id), { isPrimary: false }); });
        batch.update(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', targetId), { isPrimary: true });
        await batch.commit();
    };

    const handleDeleteImage = async (item: MediaLibraryItem) => {
        const confirmDelete = window.confirm("確定要永久刪除這張圖片嗎？\n此操作無法復原。");
        if (!confirmDelete) return;
        try {
            if (item.path) {
                const storageRef = ref(storage, item.path);
                await deleteObject(storageRef).catch(err => {
                    console.warn("⚠️ Storage 檔案可能已不存在或無權限，略過並繼續刪除資料庫紀錄:", err);
                });
            }
            await deleteDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', item.id));
        } catch (error) { 
            console.error("Error deleting image doc:", error); 
            alert("資料庫紀錄刪除失敗，請檢查網路連線。"); 
        }
    };

    const handleReturnToInbox = async (item: MediaLibraryItem) => {
        if (!confirm("確定要將此圖片退回「待處理區」並解除車輛綁定嗎？")) return;
        if (!db) return;
        try {
            const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', item.id);
            await updateDoc(docRef, { status: 'unassigned', relatedVehicleId: null, vehicleId: null, updatedAt: serverTimestamp() });
            setActiveGroupImages(prev => {
                const newState = { ...prev };
                delete newState[item.relatedVehicleId || (item as any).vehicleId || ''];
                return newState;
            });
        } catch (err) { console.error(err); alert("退回失敗"); }
    };

    const handleClassify = async () => {
        if (!db || selectedInboxIds.length === 0) return;
        const batch = writeBatch(db);
        let finalRelatedId = targetVehicleId;
        if (!finalRelatedId) {
            const matchCar = inventory.find((v:any) => v.make === classifyForm.make && v.model === classifyForm.model && v.year == classifyForm.year && v.colorExt === classifyForm.color);
            if (matchCar) finalRelatedId = matchCar.id;
        }

        const itemsToClassify = mediaItems.filter(i => selectedInboxIds.includes(i.id));

        itemsToClassify.forEach(item => {
            const ref = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', item.id);
            const finalMediaType = classifyForm.type.includes('文件') ? 'document' : 'vehicle';
            batch.update(ref, { 
                status: 'linked', 
                relatedVehicleId: finalRelatedId || null, 
                mediaType: finalMediaType,
                tags: [classifyForm.make, classifyForm.model, classifyForm.year, classifyForm.color, classifyForm.type], 
                aiData: { ...classifyForm } 
            });
        });

        if (finalRelatedId) {
            const existingCar = inventory.find((v:any) => v.id === finalRelatedId);
            if (existingCar) {
                const existingPhotos = existingCar.photos || [];
                const newVehiclePhotos = itemsToClassify
                    .filter(i => (!classifyForm.type.includes('文件') && i.mediaType !== 'document'))
                    .map(i => i.url);
                
                const mergedPhotos = Array.from(new Set([...existingPhotos, ...newVehiclePhotos]));
                
                const invRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory', finalRelatedId);
                batch.update(invRef, { photos: mergedPhotos });
            }
        }

        await batch.commit();
        setSelectedInboxIds([]); setTargetVehicleId('');
    };

    const handleSwitchZone = async (item: MediaLibraryItem) => {
        if (!db) return;
        const newZone = item.mediaType === 'document' ? 'vehicle' : 'document';
        try {
            const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', item.id);
            await updateDoc(docRef, { mediaType: newZone, updatedAt: serverTimestamp() });
        } catch (err) {
            console.error(err); alert("切換失敗");
        }
    };

    
    const inboxItems = mediaItems.filter(i => i.status === 'unassigned' || !i.status);

    return (
        <div className="flex flex-col h-full bg-slate-100 p-2 overflow-hidden relative">
            <div className="flex md:hidden bg-white rounded-lg p-1 mb-2 shadow-sm shrink-0 gap-1">
                <button onClick={() => setMobileTab('inbox')} className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center transition-colors ${mobileTab==='inbox' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Upload size={14} className="mr-1.5"/> 1. 來源{inboxItems.length > 0 && <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center">{inboxItems.length}</span>}</button>
                <button onClick={() => setMobileTab('classify')} className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center transition-colors ${mobileTab==='classify' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Settings size={14} className="mr-1.5"/> 2. 歸類{selectedInboxIds.length > 0 && <span className="ml-1 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center">{selectedInboxIds.length}</span>}</button>
                <button onClick={() => setMobileTab('gallery')} className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center transition-colors ${mobileTab==='gallery' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><ImageIcon size={14} className="mr-1.5"/> 3. 圖庫</button>
            </div>

            <div className="flex flex-1 md:flex-row h-full gap-4 overflow-hidden">
                <div className={`w-full md:w-[28%] bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[500px] transition-all duration-300 ${mobileTab === 'inbox' ? 'flex' : 'hidden md:flex'}`}>
                    <div className="p-3 border-b bg-slate-50 flex justify-between items-center flex-none">
                        <h3 className="font-bold text-slate-800 flex items-center"><Upload size={16} className="mr-2 text-blue-600"/> 待處理區 ({inboxItems.length})</h3>
                        <div className="flex gap-2">
                            <button onClick={handlePasteUpload} disabled={uploading} className="bg-white border border-slate-300 text-slate-600 px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-100 flex items-center shadow-sm disabled:opacity-50"><Clipboard size={14} className="mr-1"/> 貼上</button>
                            <label className={`bg-blue-600 text-white px-2 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-700 flex items-center shadow-sm ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>{uploading ? <Loader2 className="animate-spin mr-1" size={12}/> : <Plus size={12} className="mr-1"/>} 匯入<input type="file" multiple accept="image/*,application/pdf,.heic,.heif" className="hidden" onChange={(e) => handleSmartUpload(e)} disabled={uploading}/></label>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {['vehicle', 'document'].map((zoneType) => {
                            const zoneItems = inboxItems.filter(i => (zoneType === 'vehicle' ? i.mediaType !== 'document' : i.mediaType === 'document'));
                            return (
                                <div key={zoneType} className={`h-1/2 flex flex-col border-b-4 border-slate-300 relative transition-all duration-200`} onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add(zoneType === 'vehicle' ? 'bg-slate-200' : 'bg-indigo-100', 'ring-4', zoneType === 'vehicle' ? 'ring-slate-400' : 'ring-indigo-400', 'ring-inset'); }} onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('bg-slate-200', 'bg-indigo-100', 'ring-4', 'ring-slate-400', 'ring-indigo-400', 'ring-inset'); }} onDrop={async (e) => { e.preventDefault(); e.currentTarget.classList.remove('bg-slate-200', 'bg-indigo-100', 'ring-4', 'ring-slate-400', 'ring-indigo-400', 'ring-inset'); const dragId = e.dataTransfer.getData('text/plain'); if (dragId) { const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', dragId); await updateDoc(docRef, { mediaType: zoneType, updatedAt: serverTimestamp() }); return; } if (e.dataTransfer.files && e.dataTransfer.files.length > 0) { const mockEvent = { target: { files: e.dataTransfer.files } }; handleSmartUpload(mockEvent, zoneType as any); } }}>
                                    <div className={`p-1.5 text-[10px] font-bold text-center text-white shadow-md flex items-center justify-center gap-2 ${zoneType === 'vehicle' ? 'bg-slate-800' : 'bg-indigo-600'}`}>{zoneType === 'vehicle' ? <><Car size={14}/> 🚗 車輛相片區 (Vehicle)</> : <><FileText size={14}/> 📄 文件資料區 (Document)</>}</div>
                                    <div className={`flex-1 overflow-y-auto p-2 columns-2 md:columns-3 gap-2 space-y-2 ${zoneType === 'vehicle' ? 'bg-slate-100' : 'bg-indigo-50/50'}`}>
                                        {zoneItems.map(item => (
                                            <div key={item.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)} onClick={() => setSelectedInboxIds(p => p.includes(item.id) ? p.filter(i=>i!==item.id) : [...p, item.id])} className={`relative rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all group shadow-sm break-inside-avoid inline-block w-full ${selectedInboxIds.includes(item.id) ? 'ring-4 ring-blue-500 opacity-100 scale-95' : 'opacity-90 hover:opacity-100 hover:shadow-md'}`}>
                                                <img src={item.url} draggable={false} className="w-full h-auto block bg-black/5 pointer-events-none select-none"/>
                                                
                                                {selectedInboxIds.includes(item.id) && <div className="absolute top-0 right-0 bg-blue-600 text-white p-0.5 z-10 rounded-bl-md"><Check size={12}/></div>}
                                                
                                                <div className="absolute top-1 right-1 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20">
                                                    <button onClick={(e) => { e.stopPropagation(); handleSwitchZone(item); }} className="p-1 rounded-full bg-black/60 hover:bg-emerald-500 text-white backdrop-blur-sm shadow-sm" title={zoneType === 'vehicle' ? "移至文件區" : "移至車輛相片區"}>
                                                        <Move size={12} className="transform rotate-90" />
                                                    </button>
                                                    
                                                    <button onClick={(e) => { e.stopPropagation(); setPreviewImage(item.url); }} className="p-1 rounded-full bg-black/60 hover:bg-blue-500 text-white backdrop-blur-sm shadow-sm" title="預覽"><Maximize2 size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingMedia(item); }} className="p-1 rounded-full bg-black/60 hover:bg-amber-500 text-white backdrop-blur-sm shadow-sm" title="編輯圖片"><Edit size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteImage(item); }} className="p-1 rounded-full bg-black/60 hover:bg-red-500 text-white backdrop-blur-sm shadow-sm" title="刪除"><Trash2 size={12} /></button>
                                                </div>
                                            </div>
                                        ))}
                                        {zoneItems.length === 0 && <div className={`col-span-3 py-8 text-center text-xs font-bold border-2 border-dashed rounded-xl m-1 ${zoneType === 'vehicle' ? 'text-slate-400 border-slate-300' : 'text-indigo-300 border-indigo-200'}`}>拖曳 {zoneType === 'vehicle' ? '相片' : '文件或 PDF'} 至此</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className={`w-full md:w-1/4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[250px] ${mobileTab === 'classify' ? 'flex' : 'hidden md:flex'}`}>
                    <div className="p-3 border-b bg-slate-50 flex items-center"><h3 className="font-bold text-slate-700 flex items-center"><Settings size={16} className="mr-2"/> 歸類</h3><span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">已選: {selectedInboxIds.length}</span></div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                            <label className="text-[10px] font-bold text-blue-800 mb-1 block">配對庫存</label>
                            <input type="text" placeholder="輸入車牌或型號篩選..." value={classifySearch} onChange={e => setClassifySearch(e.target.value)} className="w-full p-1.5 text-xs border rounded mb-2 outline-none focus:border-blue-400"/>
                            <select value={targetVehicleId} onChange={(e) => { const vId = e.target.value; setTargetVehicleId(vId); const v = inventory.find((i:any) => i.id === vId); if (v) setClassifyForm(prev => ({ ...prev, make: v.make || '', model: v.model || '', year: v.year || '', color: v.colorExt || '' })); }} className="w-full p-1 text-xs border rounded">
                                <option value="">-- 手動 / 不關聯 --</option>
                                {inventory.filter((v: Vehicle) => { const search = classifySearch.toUpperCase(); return !search || (v.regMark || '').includes(search) || (v.model || '').toUpperCase().includes(search); }).sort((a: Vehicle, b: Vehicle) => (a.regMark || '').localeCompare(b.regMark || '')).map((v: Vehicle) => (<option key={v.id} value={v.id}>{v.regMark || '(未出牌)'} - {v.make} {v.model}</option>))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <div><label className="text-[10px] font-bold text-slate-500">Year</label><input value={classifyForm.year} onChange={e => setClassifyForm({...classifyForm, year: e.target.value})} className="w-full p-1 border rounded text-xs"/></div>
                            <div><label className="text-[10px] font-bold text-slate-500">Make</label><input list="makeList" value={classifyForm.make} onChange={e => setClassifyForm({...classifyForm, make: e.target.value})} className="w-full p-1 border rounded text-xs"/><datalist id="makeList">{settings?.makes?.map((m:string) => <option key={m} value={m}/>)}</datalist></div>
                            <div><label className="text-[10px] font-bold text-slate-500">Model</label><input list="modelList" value={classifyForm.model} onChange={e => setClassifyForm({...classifyForm, model: e.target.value})} className="w-full p-1 border rounded text-xs"/><datalist id="modelList">{(settings?.models?.[classifyForm.make] || []).map((m:string) => <option key={m} value={m}/>)}</datalist></div>
                            <div><label className="text-[10px] font-bold text-slate-500">Color</label><input list="colorList" value={classifyForm.color} onChange={e => setClassifyForm({...classifyForm, color: e.target.value})} className="w-full p-1 border rounded text-xs"/><datalist id="colorList">{settings?.colors?.map((c:string) => <option key={c} value={c}/>)}</datalist></div>
                            <div><label className="text-[10px] font-bold text-slate-500 mb-1 block">Type</label><div className="flex gap-1">{['外觀', '內飾', '文件'].map(t => (<button key={t} onClick={() => setClassifyForm({...classifyForm, type: t as any})} className={`text-[10px] py-1 px-2 rounded border ${classifyForm.type.includes(t) ? 'bg-blue-600 text-white' : 'bg-white'}`}>{t}</button>))}</div></div>
                        </div>
                    </div>
                    <div className="p-3 border-t bg-slate-50"><button onClick={() => { handleClassify(); setMobileTab('gallery'); }} disabled={selectedInboxIds.length === 0} className="w-full bg-slate-800 text-white py-2 rounded-lg text-xs font-bold disabled:opacity-50">歸檔</button></div>
                </div>

                <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden ${mobileTab === 'gallery' ? 'flex' : 'hidden md:flex'}`}>
                    <div className="p-3 border-b bg-slate-50 flex justify-between items-center gap-2"><h3 className="font-bold text-slate-700 flex items-center"><ImageIcon size={18} className="mr-2"/> 圖庫</h3><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜尋..." className="w-32 md:w-48 px-2 py-1 text-xs border rounded-full"/></div>
                    
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 text-xs text-amber-800"><Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0 mt-0.5"/><div><p className="font-bold">圖庫管理說明：</p><ul className="list-disc pl-4 mt-1 space-y-0.5 text-amber-700"><li>點擊圖片左上角的 <span className="font-bold text-yellow-600">星星</span> 可設為該車輛的首圖 (封面)。</li><li>點擊右上角的 <span className="font-bold text-red-600">垃圾桶</span> 可永久刪除圖片。</li><li>點擊圖片本身可放大預覽。</li></ul></div></div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {libraryGroups.map(group => {
                                const isExpanded = expandedGroupKey === group.key;
                                const currentActiveImgUrl = activeGroupImages[group.key] || group.items[0]?.url;
                                const activeItem = group.items.find(img => img.url === currentActiveImgUrl) || group.items[0];

                                return (
                                    <div key={group.key} className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ${isExpanded ? 'col-span-full ring-2 ring-blue-500/50 shadow-lg' : 'hover:border-blue-300'}`}>
                                        <div className="p-3 flex justify-between items-center bg-white border-b border-slate-100 transition-colors cursor-pointer hover:bg-slate-50" onClick={() => setExpandedGroupKey(isExpanded ? null : group.key)}>
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-16 h-12 rounded-md bg-slate-900 flex-shrink-0 overflow-hidden relative shadow-inner">
                                                    {group.items[0] ? <img src={group.items[0].url} className="w-full h-full object-cover opacity-90"/> : <div className="flex items-center justify-center h-full text-slate-400"><ImageIcon size={20}/></div>}
                                                </div>
                                                <div className="flex flex-col justify-center min-w-0 gap-1.5">
                                                    {(() => {
                                                        const linkedCar = inventory.find((v:any) => v.id === group.key);
                                                        const displayPlate = linkedCar?.regMark || '';
                                                        return displayPlate ? <span className="bg-[#FFD600] text-black border border-black font-black font-mono text-[11px] px-1.5 py-0.5 rounded-[3px] shadow-sm w-max truncate leading-none">{displayPlate}</span> : <span className="font-bold text-sm text-slate-800 truncate w-full">{group.title.split(' (')[0]}</span>;
                                                    })()}
                                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                        <span className="text-[10px] text-slate-600 font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-[4px] flex items-center leading-none"><ImageIcon size={10} className="mr-1"/> {group.items.length}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-[4px] font-bold shadow-sm leading-none ${group.status === 'In Stock' ? 'bg-green-500 text-white' : group.status === 'Reserved' ? 'bg-yellow-500 text-white' : group.status === 'Sold' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{group.status === 'In Stock' ? '在庫' : group.status === 'Reserved' ? '已訂' : group.status === 'Sold' ? '已售' : group.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 pr-1">
                                                {isExpanded && activeItem && (
                                                    <div className="flex items-center bg-slate-100 p-1 rounded-lg shadow-inner" onClick={e => e.stopPropagation()}>
                                                        <button onClick={() => handleReturnToInbox(activeItem)} className="p-1.5 rounded-md hover:bg-white text-slate-500 hover:text-blue-600 transition-colors tooltip-trigger" title="退回待處理區"><Upload size={16} className="transform rotate-180"/></button>
                                                        <div className="w-px h-4 bg-slate-300 mx-1"></div>
                                                        <button onClick={() => handleSetPrimary(activeItem.id, group.items)} className={`p-1.5 rounded-md transition-colors ${activeItem.isPrimary ? 'bg-yellow-500 text-white shadow-sm' : 'hover:bg-white text-slate-500 hover:text-yellow-600'}`} title="設為車輛封面"><Star size={16} className={activeItem.isPrimary ? 'fill-white' : ''}/></button>
                                                        <div className="w-px h-4 bg-slate-300 mx-1"></div>
                                                        <button onClick={() => setEditingMedia(activeItem)} className="p-1.5 rounded-md hover:bg-white text-slate-500 hover:text-indigo-600 transition-colors" title="編輯圖片 (排版/遮車牌)"><Edit size={16}/></button>
                                                        <button onClick={() => handleDeleteImage(activeItem)} className="p-1.5 rounded-md hover:bg-white text-slate-500 hover:text-red-500 transition-colors" title="永久刪除"><Trash2 size={16}/></button>
                                                    </div>
                                                )}
                                                <div className="text-slate-400 bg-slate-50 p-2 rounded-full hover:bg-slate-200 transition-colors">{isExpanded ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}</div>
                                            </div>
                                        </div>
                                        {isExpanded && activeItem && (
                                            <div className="p-4 bg-slate-50/50 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                                                <div className="w-full max-w-4xl mb-3 flex justify-between items-center px-1"><span className="text-sm font-bold text-slate-700 bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-200 flex items-center"><Car size={14} className="mr-2 text-blue-500"/>{group.title.split(' (')[0] || '未分類車輛'}</span><span className="text-[10px] text-slate-400 hidden md:block">點擊圖片可全螢幕預覽</span></div>
                                                <div className="w-full max-w-4xl aspect-[4/3] bg-slate-900 rounded-xl relative overflow-hidden shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] cursor-zoom-in group mb-4" onClick={() => setPreviewImage(activeItem.url)}><img src={activeItem.url} className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-125 transition-transform duration-700" /><img src={activeItem.url} className="relative z-10 w-full h-full object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-105" /><div className="absolute bottom-3 right-3 z-20 bg-black/60 text-white text-[10px] px-3 py-1.5 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">點擊全螢幕放大</div></div>
                                                <div className="w-full max-w-4xl bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                                    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-300">
                                                        {group.items.map((img, index) => (
                                                            <div 
                                                                key={img.id} 
                                                                draggable
                                                                onDragStart={(e) => e.dataTransfer.setData('text/plain', index.toString())}
                                                                onDragOver={(e) => e.preventDefault()}
                                                                onDrop={async (e) => {
                                                                    e.preventDefault();
                                                                    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
                                                                    if (isNaN(sourceIndex) || sourceIndex === index) return;
                                                                    
                                                                    const newItems = [...group.items];
                                                                    const [movedItem] = newItems.splice(sourceIndex, 1);
                                                                    newItems.splice(index, 0, movedItem);
                                                                    
                                                                    const vehiclePhotosToSync = newItems
                                                                        .filter(i => i.mediaType !== 'document')
                                                                        .map(i => i.url);

                                                                    if (db) {
                                                                        const batch = writeBatch(db);
                                                                        const baseTime = Date.now();
                                                                        newItems.forEach((item, idx) => {
                                                                            const ref = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', item.id);
                                                                            batch.update(ref, { createdAt: { seconds: Math.floor((baseTime - idx * 1000) / 1000), nanoseconds: 0 } });
                                                                        });
                                                                        
                                                                        const targetVehicleId = img.relatedVehicleId || (img as any).vehicleId;
                                                                        if (targetVehicleId && inventory.some((v:any) => v.id === targetVehicleId)) {
                                                                            const invRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory', targetVehicleId);
                                                                            batch.update(invRef, { photos: vehiclePhotosToSync });
                                                                        }
                                                                        
                                                                        await batch.commit();
                                                                    }
                                                                }}
                                                                onClick={() => setActiveGroupImages(prev => ({...prev, [group.key]: img.url}))} 
                                                                className={`relative w-24 aspect-[4/3] flex-shrink-0 rounded-lg overflow-hidden cursor-move transition-all duration-200 ${activeItem.id === img.id ? 'ring-4 ring-blue-500 ring-offset-1 border-transparent scale-95' : 'border-2 border-transparent hover:border-slate-300 opacity-70 hover:opacity-100'}`}
                                                            >
                                                                <img src={img.url} draggable={false} className="w-full h-full object-cover pointer-events-none" />
                                                                {img.isPrimary && (<div className="absolute top-1 left-1 bg-yellow-500/90 rounded-full p-1 backdrop-blur-sm shadow-sm"><Star size={10} className="text-white fill-white"/></div>)}
                                                                {img.mediaType === 'document' && <div className="absolute bottom-1 right-1 bg-indigo-600/90 text-white text-[8px] px-1.5 py-0.5 rounded backdrop-blur-sm">文件</div>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {previewImage && (<div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}><img src={previewImage} className="max-w-full max-h-[90vh] object-contain"/><button className="absolute top-4 right-4 text-white"><X size={32}/></button></div>)}
            
            {editingMedia && (
                <ImageEditorModal 
                    imageUrl={editingMedia.url} 
                    onClose={() => setEditingMedia(null)} 
                    onSave={(newBase64) => handleSaveEditedImage(editingMedia, newBase64)} 
                />
            )}
        </div>
    );
}
