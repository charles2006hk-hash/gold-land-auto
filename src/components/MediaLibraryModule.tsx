// src/components/MediaLibraryModule.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Upload, Settings, ImageIcon, Clipboard, Loader2, Plus, 
    Car, FileText, Check, Maximize2, Edit, Trash2, Star, 
    Minimize2, X, Move, MousePointer2, Save
} from 'lucide-react';
import { 
    collection, query, orderBy, onSnapshot, doc, updateDoc, 
    serverTimestamp, deleteDoc, writeBatch, where, addDoc 
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { compressImage } from '@/utils/imageHelpers';
import { MediaLibraryItem, Vehicle, SystemSettings } from '@/types';

// ==================================================================
// 1. 圖片壓縮工具函數 (目標約 100-150KB)
// ==================================================================
export const compressImageSmart = (file: File): Promise<Blob> => {
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
                
                const MAX_SIZE = 1280;
                if (width > height) {
                    if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                } else {
                    if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error("Compression failed"));
                }, 'image/jpeg', 0.6);
            };
        };
        reader.onerror = error => reject(error);
    });
};

// ==================================================================
// 2. 智慧圖片編輯器 (支援自由拖曳、縮放、車牌遮罩)
// ==================================================================
const ImageEditorModal = ({ mediaItem, onClose, onSave }: any) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
    const [brightness, setBrightness] = useState(100);
    
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [editorMode, setEditorMode] = useState<'pan' | 'mask'>('pan');
    const [masks, setMasks] = useState<{x:number, y:number, w:number, h:number}[]>([]);
    const [isDrawingMask, setIsDrawingMask] = useState(false);
    const [isDraggingImage, setIsDraggingImage] = useState(false);
    const [startPos, setStartPos] = useState({x:0, y:0});
    const [currentPos, setCurrentPos] = useState({x:0, y:0});
    const [isProcessing, setIsProcessing] = useState(false);

    const CANVAS_W = 1200;
    const CANVAS_H = 900;

    useEffect(() => {
        const loadImg = async () => {
            try {
                const res = await fetch(mediaItem.url);
                const blob = await res.blob();
                const localUrl = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                    setImgObj(img);
                    const defaultScale = Math.max(CANVAS_W / img.width, CANVAS_H / img.height);
                    setZoom(defaultScale);
                    setPan({ x: (CANVAS_W - img.width * defaultScale) / 2, y: (CANVAS_H - img.height * defaultScale) / 2 });
                };
                img.src = localUrl;
            } catch(e) { 
                alert("圖片加載失敗"); onClose(); 
            }
        };
        loadImg();
    }, [mediaItem]);

    useEffect(() => {
        if (!imgObj || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);
        ctx.filter = `brightness(${brightness}%)`;
        ctx.drawImage(imgObj, 0, 0);
        ctx.restore();

        ctx.fillStyle = '#1e293b'; 
        masks.forEach(m => { ctx.fillRect(m.x, m.y, m.w, m.h); });

        if (editorMode === 'mask' && isDrawingMask) {
            ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
            const w = currentPos.x - startPos.x;
            const h = currentPos.y - startPos.y;
            ctx.fillRect(startPos.x, startPos.y, w, h);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 4;
            ctx.strokeRect(startPos.x, startPos.y, w, h);
        }
    }, [imgObj, brightness, zoom, pan, masks, isDrawingMask, currentPos, editorMode]);

    const getCanvasPos = (clientX: number, clientY: number) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const handlePointerDown = (e: any) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        if (editorMode === 'mask') {
            setIsDrawingMask(true);
            const pos = getCanvasPos(clientX, clientY);
            setStartPos(pos); setCurrentPos(pos);
        } else if (editorMode === 'pan') {
            setIsDraggingImage(true);
            setStartPos({ x: clientX, y: clientY }); 
        }
    };

    const handlePointerMove = (e: any) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        if (editorMode === 'mask' && isDrawingMask) {
            setCurrentPos(getCanvasPos(clientX, clientY));
        } else if (editorMode === 'pan' && isDraggingImage) {
            const rect = canvasRef.current!.getBoundingClientRect();
            const ratio = CANVAS_W / rect.width;
            setPan(prev => ({ x: prev.x + (clientX - startPos.x) * ratio, y: prev.y + (clientY - startPos.y) * ratio }));
            setStartPos({ x: clientX, y: clientY }); 
        }
    };

    const handlePointerUp = () => {
        if (editorMode === 'mask' && isDrawingMask) {
            setIsDrawingMask(false);
            const w = currentPos.x - startPos.x;
            const h = currentPos.y - startPos.y;
            if (Math.abs(w) > 20 && Math.abs(h) > 20) {
                setMasks([...masks, { x: w > 0 ? startPos.x : currentPos.x, y: h > 0 ? startPos.y : currentPos.y, w: Math.abs(w), h: Math.abs(h) }]);
            }
        } else if (editorMode === 'pan') {
            setIsDraggingImage(false);
        }
    };

    const handleSaveClick = async () => {
        if (!canvasRef.current) return;
        setIsProcessing(true);
        try {
            const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85); 
            await onSave(mediaItem, dataUrl);
        } catch(e) { alert('儲存失敗'); } 
        finally { setIsProcessing(false); }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center md:p-4">
            <div className="w-full md:max-w-6xl bg-slate-900 text-white md:rounded-2xl flex flex-col h-full md:h-[90vh] overflow-hidden shadow-2xl">
                <div className="p-4 flex justify-between items-center border-b border-slate-700 bg-slate-800 flex-none">
                    <h3 className="font-bold flex items-center"><Edit size={18} className="mr-2 text-blue-400"/> 圖片排版與美化 (輸出比例 4:3)</h3>
                    <button onClick={onClose} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
                </div>
                
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    <div className="flex-1 p-2 md:p-6 flex items-center justify-center bg-black/80 overflow-hidden relative touch-none">
                        {!imgObj && <div className="text-white flex items-center"><Loader2 className="animate-spin mr-2"/> 載入中...</div>}
                        <canvas 
                            ref={canvasRef}
                            onMouseDown={handlePointerDown} onMouseMove={handlePointerMove}
                            onMouseUp={handlePointerUp} onMouseLeave={handlePointerUp}
                            onTouchStart={(e) => { e.preventDefault(); handlePointerDown(e); }}
                            onTouchMove={(e) => { e.preventDefault(); handlePointerMove(e); }}
                            onTouchEnd={handlePointerUp}
                            className={`max-w-full max-h-full object-contain shadow-[0_0_50px_rgba(0,0,0,0.5)] border-2 border-slate-700 ${editorMode === 'pan' ? (isDraggingImage ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair'}`}
                        />
                    </div>

                    <div className="w-full md:w-80 bg-slate-800 p-5 flex flex-col gap-6 overflow-y-auto flex-none border-t md:border-t-0 md:border-l border-slate-700">
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-2 block">1. 選擇操作模式</label>
                            <div className="flex bg-slate-900 rounded-lg p-1">
                                <button onClick={() => setEditorMode('pan')} className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center transition ${editorMode === 'pan' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><Move size={16} className="mr-2"/> 移動排版</button>
                                <button onClick={() => setEditorMode('mask')} className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center transition ${editorMode === 'mask' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><MousePointer2 size={16} className="mr-2"/> 畫遮罩</button>
                            </div>
                        </div>

                        {editorMode === 'pan' && (
                            <div className="space-y-4 animate-in fade-in">
                                <div>
                                    <label className="text-xs text-slate-400 font-bold mb-2 flex justify-between"><span>🔍 圖片縮放 (Zoom)</span><span className="text-blue-400">{Math.round(zoom * 100)}%</span></label>
                                    <input type="range" min="0.2" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-blue-500"/>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 font-bold mb-2 flex justify-between"><span>☀️ 亮度調整 (Brightness)</span><span className="text-yellow-400">{brightness}%</span></label>
                                    <input type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full accent-yellow-500"/>
                                </div>
                            </div>
                        )}

                        {editorMode === 'mask' && masks.length > 0 && (
                            <div className="animate-in fade-in">
                                <button onClick={() => setMasks([])} className="w-full bg-slate-700 hover:bg-slate-600 text-red-300 text-sm font-bold py-2.5 rounded-lg transition border border-slate-600">復原 (清除所有遮罩)</button>
                            </div>
                        )}

                        <div className="mt-auto pt-4 border-t border-slate-700">
                            <button onClick={handleSaveClick} disabled={isProcessing || !imgObj} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center transition disabled:opacity-50 active:scale-95">
                                {isProcessing ? <><Loader2 className="animate-spin mr-2" size={18}/> 處理中...</> : <><Save size={18} className="mr-2"/> 覆蓋並儲存</>}
                            </button>
                        </div>
                    </div>
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
        const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library'), orderBy('createdAt', 'desc'));
        return onSnapshot(q, (snap) => {
            const list: MediaLibraryItem[] = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() } as MediaLibraryItem));
            const myImages = list.filter(img => {
                const currentStaff = String(staffId).toUpperCase();
                const uploader = String(img.uploadedBy || '').toUpperCase();
                if (currentStaff === 'BOSS') return true;
                if (img.status === 'linked' && img.relatedVehicleId) return inventory.some((v: Vehicle) => v.id === img.relatedVehicleId);
                if (img.status === 'unassigned' || !img.status) return uploader === currentStaff;
                return false; 
            });
            setMediaItems(myImages);
        });
    }, [db, staffId, appId, inventory]);

    const libraryGroups = useMemo(() => {
        const groups: Record<string, { key: string, title: string, items: MediaLibraryItem[], status: string, timestamp: number }> = {};
        const filteredItems = mediaItems.filter(i => {
            if (i.status !== 'linked') return false;
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            const aiText = `${i.aiData?.year} ${i.aiData?.make} ${i.aiData?.model} ${i.aiData?.color}`.toLowerCase();
            const car = inventory.find((v:any) => v.id === i.relatedVehicleId);
            const regMark = car ? (car.regMark || '').toLowerCase() : '';
            return aiText.includes(query) || regMark.includes(query);
        });

        filteredItems.forEach(item => {
            let groupKey = item.relatedVehicleId || `${item.aiData?.year}-${item.aiData?.make}-${item.aiData?.model}`;
            let groupTitle = `${item.aiData?.year || ''} ${item.aiData?.make || ''} ${item.aiData?.model || ''}`.trim() || '未分類車輛';
            let status = 'Unknown';

            if (item.relatedVehicleId) {
                const car = inventory.find((v:any) => v.id === item.relatedVehicleId);
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

                const compressedBase64 = await compressImage(file, autoType === 'document' ? 250 : 130); 
                await uploadToStorage(compressedBase64, file.name, autoType);

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
                await deleteObject(storageRef);
            }
            await deleteDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', item.id));
        } catch (error) { console.error("Error deleting image:", error); alert("刪除失敗，可能是權限不足或檔案不存在。"); }
    };

    const handleReturnToInbox = async (item: MediaLibraryItem) => {
        if (!confirm("確定要將此圖片退回「待處理區」並解除車輛綁定嗎？")) return;
        if (!db) return;
        try {
            const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', item.id);
            await updateDoc(docRef, { status: 'unassigned', relatedVehicleId: null, updatedAt: serverTimestamp() });
            setActiveGroupImages(prev => {
                const newState = { ...prev };
                delete newState[item.relatedVehicleId || ''];
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
        selectedInboxIds.forEach(id => {
            const ref = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', id);
            batch.update(ref, { status: 'linked', relatedVehicleId: finalRelatedId || null, tags: [classifyForm.make, classifyForm.model, classifyForm.year, classifyForm.color, classifyForm.type], aiData: { ...classifyForm } });
        });
        await batch.commit();
        setSelectedInboxIds([]); setTargetVehicleId('');
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
                                                <img src={item.url} className="w-full h-auto block bg-black/5"/>
                                                {selectedInboxIds.includes(item.id) && <div className="absolute top-0 right-0 bg-blue-600 text-white p-0.5 z-10 rounded-bl-md"><Check size={12}/></div>}
                                                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20"><button onClick={(e) => { e.stopPropagation(); setPreviewImage(item.url); }} className="p-1 rounded-full bg-black/60 hover:bg-blue-500 text-white backdrop-blur-sm" title="預覽"><Maximize2 size={12} /></button><button onClick={(e) => { e.stopPropagation(); setEditingMedia(item); }} className="p-1 rounded-full bg-black/60 hover:bg-amber-500 text-white backdrop-blur-sm" title="編輯圖片"><Edit size={12} /></button><button onClick={(e) => { e.stopPropagation(); handleDeleteImage(item); }} className="p-1 rounded-full bg-black/60 hover:bg-red-500 text-white backdrop-blur-sm" title="刪除"><Trash2 size={12} /></button></div>
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
                                                <div className="w-full max-w-4xl bg-white p-3 rounded-xl border border-slate-200 shadow-sm"><div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-300">{group.items.map(img => (<div key={img.id} onClick={() => setActiveGroupImages(prev => ({...prev, [group.key]: img.url}))} className={`relative w-24 aspect-[4/3] flex-shrink-0 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${activeItem.id === img.id ? 'ring-4 ring-blue-500 ring-offset-1 border-transparent scale-95' : 'border-2 border-transparent hover:border-slate-300 opacity-70 hover:opacity-100'}`}><img src={img.url} className="w-full h-full object-cover" />{img.isPrimary && (<div className="absolute top-1 left-1 bg-yellow-500/90 rounded-full p-1 backdrop-blur-sm shadow-sm"><Star size={10} className="text-white fill-white"/></div>)}</div>))}</div></div>
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
            {editingMedia && <ImageEditorModal mediaItem={editingMedia} onClose={() => setEditingMedia(null)} onSave={handleSaveEditedImage} />}
        </div>
    );
}
