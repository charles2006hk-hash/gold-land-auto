// src/components/DatabaseModule.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
    Database, Plus, Search, Trash2, Edit, Save, 
    FileText, File, AlertTriangle, X, Loader2, Zap, DownloadCloud,
    User as UserIcon, Bell, Printer, ImageIcon,
    ArrowLeft, Upload, RefreshCw, ShieldCheck
} from 'lucide-react';
import { 
    collection, addDoc, deleteDoc, doc, onSnapshot, query, 
    orderBy, serverTimestamp, writeBatch, updateDoc, getDocs, where,
    Firestore
} from 'firebase/firestore';
import { DatabaseEntry, SystemSettings, Vehicle, DatabaseAttachment } from '@/types';
import { DB_CATEGORIES, DOCUMENT_FIELD_SCHEMA } from '@/config/constants';
import { compressImage } from '@/utils/imageHelpers'; // 確保您有這個工具函數

// --- 輔助工具函數 ---
const formatCurrency = (amount: number) => new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', maximumFractionDigits: 0 }).format(amount || 0);

// 計算日期剩餘天數
const getDaysRemaining = (targetDate?: string) => {
    if (!targetDate) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

// 日期狀態標籤組件
const DateStatusBadge = ({ date, label }: { date?: string, label: string }) => {
    if (!date) return <div className="text-gray-300 text-xs text-center">-</div>;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(date);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let colorClass = "text-green-700 bg-green-100 border-green-200"; 
    let statusText = "有效";

    if (diffDays < 0) {
        colorClass = "text-red-700 bg-red-100 border-red-200 font-bold"; 
        statusText = `過期 ${Math.abs(diffDays)}天`;
    } else if (diffDays <= 30) {
        colorClass = "text-amber-700 bg-amber-100 border-amber-200 font-bold"; 
        statusText = `剩 ${diffDays}天`;
    }

    return (
        <div className={`border rounded px-2 py-1 text-[10px] inline-flex flex-col items-center justify-center min-w-[80px] text-center leading-tight ${colorClass}`} title={`${label}: ${date}`}>
            <div className="font-bold mb-0.5 scale-95 opacity-80">{label}</div>
            <div className="font-mono font-bold text-sm">{date}</div>
            <div className="scale-90 opacity-90">{statusText}</div>
        </div>
    );
};

// --- A4 智能證件排版與列印組件 (內嵌) ---
const A4DocumentPrinter = ({ selectedItems, onClose }: any) => {
    const [images, setImages] = useState(
        selectedItems.map((item: any, index: number) => ({
            id: item.id,
            url: item.url,
            x: 60,
            y: 40 + (index * 80),
            width: 85.6,
            height: 54
        }))
    );

    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    const handlePointerDown = (e: any, id: string) => {
        setDraggingId(id);
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        setStartPos({ x: clientX, y: clientY });
    };

    const handlePointerMove = (e: any) => {
        if (!draggingId) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const dx = (clientX - startPos.x) * 0.28; 
        const dy = (clientY - startPos.y) * 0.28;
        setImages(images.map((img: any) => img.id === draggingId ? { ...img, x: img.x + dx, y: img.y + dy } : img));
        setStartPos({ x: clientX, y: clientY });
    };

    const handlePointerUp = () => setDraggingId(null);

    useEffect(() => {
        if (draggingId) {
            window.addEventListener('mousemove', handlePointerMove);
            window.addEventListener('mouseup', handlePointerUp);
            window.addEventListener('touchmove', handlePointerMove, { passive: false });
            window.addEventListener('touchend', handlePointerUp);
        }
        return () => {
            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('mouseup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
        };
    }, [draggingId, startPos]);

    const applyTemplate = (type: 'id_card' | 'a4_full') => {
        setImages(images.map((img: any, index: number) => {
            if (type === 'id_card') return { ...img, width: 85.6, height: 54, x: 62, y: 40 + (index * 70) };
            if (type === 'a4_full') return { ...img, width: 190, height: 270, x: 10, y: 10 };
            return img;
        }));
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('請允許瀏覽器彈出視窗以進行列印');
            return;
        }

        const imagesHtml = images.map((img: any) => `
            <img src="${img.url}" style="position: absolute; left: ${img.x}mm; top: ${img.y}mm; width: ${img.width}mm; height: ${img.height}mm; object-fit: cover; border-radius: 2px; box-shadow: 0 0 2px rgba(0,0,0,0.2);" />
        `).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>A4 文件列印</title>
                <style>
                    @page { size: A4; margin: 0; }
                    body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .a4-page { position: relative; width: 210mm; height: 297mm; background: white; overflow: hidden; margin: 0; }
                </style>
            </head>
            <body>
                <div class="a4-page">
                    ${imagesHtml}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            setTimeout(() => { printWindow.close(); }, 500);
        }, 500);
    };

    return (
        <div className="fixed inset-0 z-[250] bg-slate-900/95 flex flex-col md:flex-row overflow-hidden backdrop-blur-sm">
            <div className="w-full md:w-72 bg-slate-800 text-white p-5 flex flex-col gap-4 border-r border-slate-700 flex-none">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold flex items-center"><Printer size={18} className="mr-2 text-yellow-400"/> 智能排版輸出</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full"><X size={20}/></button>
                </div>

                <div className="bg-slate-900/50 p-3 rounded-lg text-xs text-slate-300 leading-relaxed mb-2">
                    💡 已選取 {images.length} 張圖片。<br/>
                    您可以直接在右側 A4 紙上「拖曳」圖片調整位置。
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-400 mb-2 block">快速套用尺寸模板</label>
                    <div className="flex flex-col gap-2">
                        <button onClick={() => applyTemplate('id_card')} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-sm text-left flex justify-between items-center transition shadow-sm">
                            <span>💳 標準證件 (1:1 大小)</span> <span className="text-[10px] text-slate-400">86x54mm</span>
                        </button>
                        <button onClick={() => applyTemplate('a4_full')} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-sm text-left flex justify-between items-center transition shadow-sm">
                            <span>📄 A4 滿版文件</span> <span className="text-[10px] text-slate-400">適應A4</span>
                        </button>
                    </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-700">
                    <button onClick={handlePrint} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center transition active:scale-95">
                        <Printer size={18} className="mr-2"/> 正式列印
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-gray-300 flex justify-center items-start pt-10 pb-20 relative select-none touch-none">
                <div id="a4-print-area" className="bg-white shadow-2xl relative overflow-hidden" style={{ width: '210mm', height: '297mm', transform: 'scale(0.85)', transformOrigin: 'top center' }}>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:10mm_10mm] pointer-events-none"></div>
                    {images.map((img: any) => (
                        <div key={img.id} style={{ position: 'absolute', left: `${img.x}mm`, top: `${img.y}mm`, width: `${img.width}mm`, height: `${img.height}mm`, zIndex: draggingId === img.id ? 10 : 1 }} className={`cursor-move transition-shadow ${draggingId === img.id ? 'ring-4 ring-blue-500 shadow-2xl' : 'shadow-md border border-gray-200 hover:ring-2 hover:ring-blue-300'}`} onMouseDown={(e) => handlePointerDown(e, img.id)} onTouchStart={(e) => { e.preventDefault(); handlePointerDown(e, img.id); }}>
                            <img src={img.url} className="w-full h-full object-cover pointer-events-none" draggable={false} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- DatabaseModule 主體 ---
export interface DatabaseModuleProps {
    db: any;
    staffId: string | null;
    appId: string;
    settings: SystemSettings;
    editingEntry: DatabaseEntry | null;
    setEditingEntry: React.Dispatch<React.SetStateAction<DatabaseEntry | null>>;
    isDbEditing: boolean;
    setIsDbEditing: React.Dispatch<React.SetStateAction<boolean>>;
    inventory: Vehicle[];
    currentUser: any;
    systemUsers: any[];
}

export default function DatabaseModule({ db, staffId, appId, settings, editingEntry, setEditingEntry, isDbEditing, setIsDbEditing, inventory, currentUser, systemUsers }: DatabaseModuleProps) {
    const [entries, setEntries] = useState<DatabaseEntry[]>([]);
    const [selectedCatFilter, setSelectedCatFilter] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [availableDocs, setAvailableDocs] = useState<any[]>([]);
    
    // 重複資料處理狀態
    const [dupeGroups, setDupeGroups] = useState<DatabaseEntry[][]>([]);
    const [showDupeModal, setShowDupeModal] = useState(false);

    // AI 識別狀態
    const [isScanning, setIsScanning] = useState(false);

    // A4 智能排版與圖片選取狀態
    const [selectedForPrint, setSelectedForPrint] = useState<number[]>([]);
    const [showA4Printer, setShowA4Printer] = useState(false);
    const [activeGroupImages, setActiveGroupImages] = useState<Record<string, string>>({});

    const [toastMsg, setToastMsg] = useState<{text: string, type: 'success'|'error'} | null>(null);

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMsg({text, type});
        setTimeout(() => setToastMsg(null), 3000); 
    };

    useEffect(() => {
        setSelectedForPrint([]);
    }, [editingEntry?.id]);

    // AI 識別函數
    const analyzeImageWithAI = async (imageDataOrUrl: string, docType: string) => {
        setIsScanning(true);
        try {
            let base64ToSend = imageDataOrUrl;

            if (imageDataOrUrl.startsWith('http')) {
                const res = await fetch(imageDataOrUrl);
                const blob = await res.blob();
                base64ToSend = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                }) as string;
            }

            const response = await fetch('/api/ocr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64ToSend, docType: docType })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || '識別請求失敗');
            const data = result.data;

            if (data) {
                setEditingEntry((prev: any) => {
                    if (!prev) return null;

                    const parseNum = (val: any) => {
                        if (val === undefined || val === null || val === '') return undefined;
                        if (typeof val === 'number') return val;
                        const clean = String(val).replace(/[^0-9.]/g, '');
                        return clean ? Number(clean) : undefined;
                    };

                    let finalA1 = data.priceA1;
                    let finalTax = data.priceTax;
                    let finalColor = data.vehicleColor || data.color;

                    if (data.description) {
                        if (!finalA1) {
                            const matchA1 = data.description.match(/(應課稅值|登記稅值|A1)[^\d]*([0-9,]+(\.\d+)?)/);
                            if (matchA1) finalA1 = matchA1[2];
                        }
                        if (!finalTax) {
                            const matchTax = data.description.match(/(已繳付|已繳稅)[^\d]*([0-9,]+(\.\d+)?)/);
                            if (matchTax) finalTax = matchTax[2];
                        }
                        if (!finalColor) {
                            const matchColor = data.description.match(/顏色[:：]?\s*([A-Za-z\u4e00-\u9fa5]+)/i);
                            if (matchColor) finalColor = matchColor[1];
                        }
                    }

                    let matchedDocType = prev.docType;
                    const aiDocStr = (data.documentType || '').toLowerCase();
                    if (!matchedDocType || matchedDocType === '其他') {
                        if (aiDocStr.includes('保險') || aiDocStr.includes('insurance') || aiDocStr.includes('cover')) matchedDocType = '香港保險';
                        else if (aiDocStr.includes('br') || aiDocStr.includes('商業登記')) matchedDocType = '商業登記(BR)';
                        else matchedDocType = data.documentType;
                    }

                    const currentTags = Array.isArray(prev.tags) ? prev.tags : [];
                    const aiTags = Array.isArray(data.tags) ? data.tags : [];
                    const mergedTags = Array.from(new Set([...currentTags, ...aiTags, matchedDocType])).filter(Boolean);

                    const newExtractedData = { ...(prev.extractedData || {}) };
                    if (data.insuranceCompany) newExtractedData.insuranceCompany = data.insuranceCompany;
                    if (data.policyNumber) newExtractedData.policyNumber = data.policyNumber;
                    if (data.insuranceType) newExtractedData.insuranceType = data.insuranceType;
                    if (data.insuredPerson) newExtractedData.insuredPerson = data.insuredPerson;
                    if (data.brNumber) newExtractedData.brNumber = data.brNumber;
                    if (data.brExpiryDate) newExtractedData.brExpiryDate = data.brExpiryDate;
                    if (data.natureOfBusiness) newExtractedData.natureOfBusiness = data.natureOfBusiness;

                    const finalName = data.name || data.registeredOwnerName || data.insuredPerson || prev.name;
                    const finalOwnerId = data.registeredOwnerId || data.idNumber || prev.registeredOwnerId;

                    let finalSeating = prev.seating;
                    const aiSeatingRaw = data.seating ?? data.seatingCapacity;
                    if (aiSeatingRaw !== undefined) {
                        const parsedSeat = parseNum(aiSeatingRaw);
                        if (parsedSeat !== undefined) finalSeating = parsedSeat + 1;
                    }

                    return {
                        ...prev,
                        name: finalName, 
                        docType: matchedDocType, 
                        idNumber: data.idNumber || prev.idNumber,
                        phone: data.phone || prev.phone,
                        address: data.address || prev.address,
                        expiryDate: data.expiryDate || prev.expiryDate,
                        quotaNo: data.quotaNo || prev.quotaNo,
                        plateNoHK: data.plateNoHK || prev.plateNoHK,
                        make: data.make || prev.make,
                        model: data.model || prev.model,
                        chassisNo: data.chassisNo || prev.chassisNo,
                        engineNo: data.engineNo || prev.engineNo,
                        manufactureYear: data.manufactureYear || prev.manufactureYear,
                        firstRegCondition: data.firstRegCondition || prev.firstRegCondition,
                        vehicleColor: finalColor || prev.vehicleColor,
                        engineSize: parseNum(data.engineSize) ?? prev.engineSize,
                        priceA1: parseNum(finalA1) ?? prev.priceA1,
                        priceTax: parseNum(finalTax) ?? prev.priceTax,
                        prevOwners: parseNum(data.prevOwners) ?? prev.prevOwners,
                        registeredOwnerName: data.registeredOwnerName || prev.registeredOwnerName,
                        registeredOwnerId: finalOwnerId,
                        registeredOwnerDate: data.registeredOwnerDate || data.ownerRegDate || data.dateOfRegAsOwner || prev.registeredOwnerDate,
                        seating: finalSeating,
                        
                        hkid_name: data.hkid_name || prev.hkid_name,
                        hkid_code: data.hkid_code || prev.hkid_code,
                        hkid_dob: data.hkid_dob || prev.hkid_dob,
                        hkid_issueDate: data.hkid_issueDate || prev.hkid_issueDate,
                        hrp_nameCN: data.hrp_nameCN || prev.hrp_nameCN,
                        hrp_expiry: data.hrp_expiry || prev.hrp_expiry,
                        hrp_num: data.hrp_num || prev.hrp_num,
                        hkdl_num: data.hkdl_num || prev.hkdl_num,
                        hkdl_validTo: data.hkdl_validTo || prev.hkdl_validTo,
                        hkdl_ref: data.hkdl_ref || prev.hkdl_ref,
                        cndl_num: data.cndl_num || prev.cndl_num,
                        cndl_address: data.cndl_address || prev.cndl_address,
                        cndl_firstIssue: data.cndl_firstIssue || prev.cndl_firstIssue,
                        cndl_validPeriod: data.cndl_validPeriod || prev.cndl_validPeriod,
                        cndl_issueLoc: data.cndl_issueLoc || prev.cndl_issueLoc,
                        cndl_fileNum: data.cndl_fileNum || prev.cndl_fileNum,
                        
                        extractedData: newExtractedData,
                        tags: mergedTags,
                        description: prev.description + (data.description ? `\n[AI 識別摘要]: ${data.description}` : '')
                    };
                });
                showToast('✨ AI 識別成功！已按文件標準自動填入。');
            }
        } catch (error: any) {
            showToast(`識別失敗: ${error.message}`, 'error');
        }
        setIsScanning(false);
    };

    // 資料讀取與權限過濾
    useEffect(() => {
        if (!db || !staffId) return;
        const colRef = collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'database');
        const q = query(colRef, orderBy('createdAt', 'desc'));
        
        const unsub = onSnapshot(q, (snapshot) => {
            const list: DatabaseEntry[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                let attachments = data.attachments || [];
                if (!attachments.length && data.images && Array.isArray(data.images)) {
                    attachments = data.images.map((img: string, idx: number) => ({ name: `圖片 ${idx+1}`, data: img }));
                }
                
                list.push({ 
                    id: doc.id, 
                    ...data,
                    category: data.category || 'Person', 
                    name: data.name || data.title || '',
                    phone: data.phone || '', 
                    address: data.address || '', 
                    idNumber: data.idNumber || '',
                    plateNoHK: data.plateNoHK || '', 
                    plateNoCN: data.plateNoCN || '', 
                    quotaNo: data.quotaNo || '',
                    docType: data.docType || '', 
                    description: data.description || '',
                    relatedPlateNo: data.relatedPlateNo || '',
                    tags: data.tags || [], 
                    roles: data.roles || [], 
                    attachments: attachments,
                    make: data.make || '',
                    model: data.model || '',
                    manufactureYear: data.manufactureYear || '',
                    vehicleColor: data.vehicleColor || '',
                    chassisNo: data.chassisNo || '',
                    engineNo: data.engineNo || '',
                    engineSize: data.engineSize || 0,
                    firstRegCondition: data.firstRegCondition || '',
                    priceA1: data.priceA1 || 0,
                    priceTax: data.priceTax || 0,
                    prevOwners: data.prevOwners !== undefined ? Number(data.prevOwners) : 0,
                    seating: data.seating !== undefined ? Number(data.seating) : 0, 
                    registeredOwnerName: data.registeredOwnerName || '',
                    registeredOwnerId: data.registeredOwnerId || '',
                    registeredOwnerDate: data.registeredOwnerDate || '',
                    createdAt: data.createdAt, 
                    updatedAt: data.updatedAt,
                    reminderEnabled: data.reminderEnabled || false, 
                    expiryDate: data.expiryDate || '',
                    renewalCount: data.renewalCount || 0, 
                    renewalDuration: data.renewalDuration || 1, 
                    renewalUnit: data.renewalUnit || 'year',
                    managedBy: data.managedBy || '', 
                } as DatabaseEntry);
            });

            // 權限過濾：管理員看全部，普通員工看自己的和公開的
            const filteredList = list.filter(entry => {
                if (staffId === 'BOSS' || currentUser?.modules?.includes('all') || currentUser?.dataAccess === 'all') {
                    return true;
                }
                return entry.managedBy === staffId || entry.isPublic === true;
            });

            setEntries(filteredList); 
        });
        return () => unsub();
    }, [staffId, db, appId, currentUser]);

    // 處理圖片/PDF上傳
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const files = e.target.files;
          if (!files || files.length === 0) return;
          const file = files[0];

          if (file.type === 'application/pdf') {
              if (file.size > 15 * 1024 * 1024) { alert("PDF 檔案過大 (限制 15MB)"); return; } 
              try {
                  const pdfjsLib = await import('pdfjs-dist');
                  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${(pdfjsLib as any).version}/build/pdf.worker.min.mjs`;
                  const arrayBuffer = await file.arrayBuffer();
                  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, cMapUrl: `https://unpkg.com/pdfjs-dist@${(pdfjsLib as any).version}/cmaps/`, cMapPacked: true });
                  const pdf = await loadingTask.promise;
                  const newAttachments: DatabaseAttachment[] = [];
                  const MAX_PAGES = 5; 
                  const numPages = Math.min(pdf.numPages, MAX_PAGES);
                  for (let i = 1; i <= numPages; i++) {
                      const page = await pdf.getPage(i);
                      const viewport = page.getViewport({ scale: 2.0 }); 
                      const canvas = document.createElement('canvas');
                      const context = canvas.getContext('2d');
                      canvas.height = viewport.height; canvas.width = viewport.width;
                      if (context) {
                          await page.render({ canvasContext: context, viewport: viewport } as any).promise;
                          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                          newAttachments.push({ name: `${file.name}_P${i}.jpg`, data: dataUrl });
                      }
                  }
                  setEditingEntry(prev => prev ? { ...prev, attachments: [...prev.attachments, ...newAttachments] } : null);
                  showToast(`成功匯入 PDF 前 ${numPages} 頁！`);
              } catch (err: any) { showToast(`PDF 解析失敗: ${err.message}`, 'error'); }
              e.target.value = ''; 
              return;
          }

          if (file.size > 15 * 1024 * 1024) { showToast(`檔案過大 (限制 15MB)`, 'error'); return; }
          
          try {
              const compressedBase64 = await compressImage(file, 200);
              setEditingEntry(prev => prev ? { 
                  ...prev, 
                  attachments: [...prev.attachments, { name: file.name, data: compressedBase64 }] 
              } : null);
          } catch (error) {
              showToast("圖片處理失敗，請重試", 'error');
          }
          
          e.target.value = '';
    };

    // 下載圖片
    const downloadImage = async (dataUrl: string, filename: string) => {
        if (dataUrl.startsWith('http')) {
            try {
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                const localUrl = URL.createObjectURL(blob);
                const link = document.createElement('a'); 
                link.href = localUrl; 
                link.download = filename || 'download.jpg';
                document.body.appendChild(link); 
                link.click(); 
                document.body.removeChild(link);
                URL.revokeObjectURL(localUrl); 
            } catch(e) { 
                window.open(dataUrl, '_blank'); 
            } 
        } else {
            const link = document.createElement('a'); 
            link.href = dataUrl; 
            link.download = filename || 'download.png';
            document.body.appendChild(link); 
            link.click(); 
            document.body.removeChild(link);
        }
    };

    const handleQuickRenew = () => {
        if (!editingEntry || !editingEntry.expiryDate) { showToast("請先設定當前的到期日", 'error'); return; }
        const duration = Number(editingEntry.renewalDuration) || 1;
        const unit = editingEntry.renewalUnit || 'year';
        const currentDate = new Date(editingEntry.expiryDate);
        if (unit === 'year') { currentDate.setFullYear(currentDate.getFullYear() + duration); } 
        else { currentDate.setMonth(currentDate.getMonth() + duration); }
        setEditingEntry({ ...editingEntry, expiryDate: currentDate.toISOString().split('T')[0], renewalCount: (editingEntry.renewalCount || 0) + 1 });
    };

    // 儲存邏輯
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); 
        
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        if (!db || !staffId || !editingEntry) return;
        const autoTags = new Set(editingEntry.tags || []);
        if(editingEntry.name) autoTags.add(editingEntry.name);
        
        const finalEntry = { 
            ...editingEntry, 
            phone: editingEntry.phone || '',
            address: editingEntry.address || '',
            idNumber: editingEntry.idNumber || '',
            plateNoHK: editingEntry.plateNoHK || '',
            plateNoCN: editingEntry.plateNoCN || '',
            quotaNo: editingEntry.quotaNo || '',
            docType: editingEntry.docType || '',
            description: editingEntry.description || '',
            relatedPlateNo: editingEntry.relatedPlateNo || '',
            make: editingEntry.make || '',
            model: editingEntry.model || '',
            chassisNo: editingEntry.chassisNo || '',
            engineNo: editingEntry.engineNo || '',
            manufactureYear: editingEntry.manufactureYear || '',
            vehicleColor: editingEntry.vehicleColor || '',
            firstRegCondition: editingEntry.firstRegCondition || '',
            registeredOwnerName: editingEntry.registeredOwnerName || '',
            registeredOwnerId: editingEntry.registeredOwnerId || '',
            registeredOwnerDate: editingEntry.registeredOwnerDate || '',
            engineSize: Number(editingEntry.engineSize) || 0,
            priceA1: Number(editingEntry.priceA1) || 0,
            priceTax: Number(editingEntry.priceTax) || 0,
            prevOwners: editingEntry.prevOwners !== undefined ? Number(editingEntry.prevOwners) : 0,
            seating: Number(editingEntry.seating) || 0, 
            tags: Array.from(autoTags), 
            roles: editingEntry.roles || [], 
            attachments: editingEntry.attachments || [],
            reminderEnabled: editingEntry.reminderEnabled || false,
            expiryDate: editingEntry.expiryDate || '',
            renewalCount: editingEntry.renewalCount || 0,
            renewalDuration: editingEntry.renewalDuration || 1,
            renewalUnit: editingEntry.renewalUnit || 'year',
            customReminders: editingEntry.customReminders || [],
            extractedData: editingEntry.extractedData || {},
            managedBy: editingEntry.managedBy || staffId, 
            
            hkid_name: editingEntry.hkid_name || '',
            hkid_code: editingEntry.hkid_code || '',
            hkid_dob: editingEntry.hkid_dob || '',
            hkid_issueDate: editingEntry.hkid_issueDate || '',
            hrp_nameCN: editingEntry.hrp_nameCN || '',
            hrp_expiry: editingEntry.hrp_expiry || '',
            hrp_num: editingEntry.hrp_num || '',
            hkdl_num: editingEntry.hkdl_num || '',
            hkdl_validTo: editingEntry.hkdl_validTo || '',
            hkdl_ref: editingEntry.hkdl_ref || '',
            cndl_num: editingEntry.cndl_num || '',
            cndl_address: editingEntry.cndl_address || '',
            cndl_firstIssue: editingEntry.cndl_firstIssue || '',
            cndl_validPeriod: editingEntry.cndl_validPeriod || '',
            cndl_issueLoc: editingEntry.cndl_issueLoc || '',
            cndl_fileNum: editingEntry.cndl_fileNum || ''
        };

        try {
            if (editingEntry.id) {
                const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'database', editingEntry.id);
                const cleanData = JSON.parse(JSON.stringify(finalEntry));
                await updateDoc(docRef, { ...cleanData, updatedAt: serverTimestamp() });
                setIsDbEditing(false); 
                showToast('✅ 資料已成功更新！'); 
            } else {
                const { id, ...dataToSave } = finalEntry;
                const colRef = collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'database');
                const cleanData = JSON.parse(JSON.stringify(dataToSave));
                const newRef = await addDoc(colRef, { ...cleanData, createdAt: serverTimestamp() });
                setEditingEntry({ ...finalEntry, id: newRef.id }); 
                setIsDbEditing(false);
                showToast('✅ 新資料已建立！'); 
            }
        } catch (err) { 
            showToast('❌ 儲存失敗，請檢查網路連線', 'error'); 
        }
    };

    const handleDelete = async (id: string) => {
        if (!db || !staffId) return;
        if (!confirm('確定刪除此筆資料？無法復原。')) return;
        const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'database', id);
        await deleteDoc(docRef);
        if (editingEntry?.id === id) { setEditingEntry(null); setIsDbEditing(false); }
    };

    const toggleRole = (role: string) => {
        setEditingEntry(prev => { if (!prev) return null; const currentRoles = prev.roles || []; if (currentRoles.includes(role)) return { ...prev, roles: currentRoles.filter(r => r !== role) }; return { ...prev, roles: [...currentRoles, role] }; });
    };

    const addTag = () => {
        if (tagInput.trim() && editingEntry) { setEditingEntry({ ...editingEntry, tags: [...(editingEntry.tags || []), tagInput.trim()] }); setTagInput(''); }
    };

    // 智能搜尋邏輯
    const filteredEntries = entries.filter(entry => {
        const matchCat = selectedCatFilter === 'All' || entry.category === selectedCatFilter;
        const searchContent = `${entry.name} ${entry.phone} ${entry.idNumber} ${entry.plateNoHK} ${entry.plateNoCN} ${entry.quotaNo} ${entry.tags?.join(' ')} ${entry.make || ''} ${entry.model || ''} ${entry.registeredOwnerDate || ''} ${entry.chassisNo || ''} ${entry.engineNo || ''}`;
        return matchCat && searchContent.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const scanForDuplicates = () => {
        const nameMap = new Map<string, DatabaseEntry[]>();
        entries.forEach(e => {
            const key = e.name.trim(); if (!key) return;
            if (!nameMap.has(key)) nameMap.set(key, []);
            nameMap.get(key)?.push(e);
        });
        const duplicates: DatabaseEntry[][] = [];
        nameMap.forEach((group) => { if (group.length > 1) duplicates.push(group); });
        if (duplicates.length === 0) { showToast("未發現重複資料"); } 
        else { setDupeGroups(duplicates); setShowDupeModal(true); }
    };

    const resolveDuplicate = async (keepId: string, group: DatabaseEntry[]) => {
        if (!confirm("確定保留選中的資料，並刪除其他重複項？")) return;
        if (!db) return;
        const deleteIds = group.filter(e => e.id !== keepId).map(e => e.id);
        try {
            const batch = writeBatch(db);
            deleteIds.forEach(id => {
                const ref = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'database', id);
                batch.delete(ref);
            });
            await batch.commit();
            const newGroups = dupeGroups.map(g => g.filter(e => !deleteIds.includes(e.id))).filter(g => g.length > 1);
            setDupeGroups(newGroups);
            if (newGroups.length === 0) setShowDupeModal(false);
            showToast("✅ 已成功刪除重複項目");
        } catch (e) { showToast("處理失敗", "error"); }
    };

   return (
        <div className="flex h-full bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden relative">
            
            {/* 左側列表區塊 */}
            <div className={`w-full md:w-1/3 border-r border-slate-100 flex-col bg-slate-50 ${editingEntry ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center text-slate-700"><Database className="mr-2" size={20}/> 資料庫</h2>
                        <div className="flex gap-2">
                            <button onClick={scanForDuplicates} className="bg-amber-100 text-amber-700 p-2 rounded-full hover:bg-amber-200" title="檢查重複"><RefreshCw size={18}/></button>
                            <button onClick={(e) => { 
                                e.preventDefault(); 
                                const defaultDoc = settings.dbDocTypes?.['Person']?.[0] || '';
                                setEditingEntry({ id: '', category: 'Person', docType: defaultDoc, name: '', description: '', attachments: [], tags: [], roles: [], createdAt: null }); 
                                setIsDbEditing(true); 
                            }} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 shadow-sm transition-transform active:scale-95"><Plus size={20}/></button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" placeholder="搜尋姓名、車牌、標籤..." className="w-full pl-9 p-2 rounded border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">{['All', ...DB_CATEGORIES.map(c => c.id)].map(cat => (<button key={cat} type="button" onClick={() => setSelectedCatFilter(cat)} className={`px-3 py-1 text-xs rounded-full whitespace-nowrap border transition-colors ${selectedCatFilter === cat ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}>{cat === 'All' ? '全部' : (DB_CATEGORIES.find(c => c.id === cat)?.label.split(' ')[0] || cat)}</button>))}</div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {filteredEntries.map(entry => {
                        const isExpired = entry.reminderEnabled && entry.expiryDate && new Date(entry.expiryDate) < new Date();
                        const isSoon = entry.reminderEnabled && entry.expiryDate && getDaysRemaining(entry.expiryDate)! <= 30 && !isExpired;
                        const isAssignedToOther = entry.managedBy && entry.managedBy !== staffId;

                        return (
                        <div key={entry.id} onClick={() => { setEditingEntry(entry); setIsDbEditing(false); }} className={`p-3 rounded-lg border cursor-pointer transition-all ${editingEntry?.id === entry.id ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                      <div className="font-bold text-slate-800 truncate">{entry.name || '(未命名)'}</div>
                                      {entry.reminderEnabled && (<Bell size={12} className={isExpired ? "text-red-500 fill-red-500" : (isSoon ? "text-amber-500 fill-amber-500" : "text-green-500")} />)}
                                      {isAssignedToOther && <span className="text-[9px] bg-gray-200 text-gray-600 px-1 rounded flex items-center"><UserIcon size={8} className="mr-0.5"/> {entry.managedBy}</span>}
                                  </div>
                                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-1">
                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border">{entry.category}</span>
                                        {entry.roles?.map(r => <span key={r} className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">{r}</span>)}
                                        {entry.plateNoHK && <span className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-100">{entry.plateNoHK}</span>}
                                    </div>
                                </div>
                                {entry.attachments?.length > 0 && <span className="text-xs text-slate-400 flex items-center bg-gray-50 px-1.5 py-0.5 rounded"><File size={10} className="mr-1"/>{entry.attachments.length}</span>}
                            </div>
                        </div>
                       );
                  })}
                    {filteredEntries.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">沒有找到相關資料</div>}
                </div>
            </div>

            {/* 右側編輯/詳情區塊 */}
            <div className={`flex-1 flex-col h-full overflow-hidden bg-white ${!editingEntry ? 'hidden md:flex' : 'flex'}`}>
                {editingEntry ? (
                    <form onSubmit={handleSave} className="flex flex-col h-full">
                        <div className="flex-none p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setEditingEntry(null)} className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 active:bg-slate-200 rounded-full transition-colors">
                                    <ArrowLeft size={20}/>
                                </button>
                                <div className="font-bold text-slate-700 text-lg flex items-center">
                                    {isDbEditing || !editingEntry.id ? (editingEntry.id ? '編輯資料' : '新增資料') : editingEntry.name}
                                    {!isDbEditing && <span className="ml-2 text-xs font-normal text-gray-500 px-2 py-1 bg-white rounded border">{DB_CATEGORIES.find(c => c.id === editingEntry.category)?.label}</span>}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {isDbEditing || !editingEntry.id ? (
                                    <>
                                        <button type="button" onClick={(e) => { e.preventDefault(); setIsDbEditing(false); if(!editingEntry.id) setEditingEntry(null); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded">取消</button>
                                        <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm flex items-center"><Save size={16} className="mr-1"/> 儲存</button>
                                    </>
                                ) : (
                                    <>
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(editingEntry.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors" title="刪除"><Trash2 size={18}/></button>
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsDbEditing(true); }} className="px-4 py-2 text-sm bg-slate-800 text-white rounded hover:bg-slate-700 flex items-center transition-colors"><Edit size={16} className="mr-1"/> 編輯</button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {isDbEditing && (
                                <div className="space-y-4">
                                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 flex items-center">
                                        <label className="text-xs font-bold text-yellow-800 mr-2 flex-none flex items-center"><UserIcon size={14} className="mr-1"/>文件負責人:</label>
                                        <select 
                                            disabled={!(staffId === 'BOSS' || currentUser?.modules?.includes('all'))} 
                                            value={editingEntry.id ? (editingEntry.managedBy || '') : (editingEntry.managedBy || staffId || '')}
                                            onChange={e => setEditingEntry({...editingEntry, managedBy: e.target.value})}
                                            className="w-full border-yellow-300 rounded text-sm bg-white p-1"
                                        >
                                            <option value="">-- 未指派 (Unassigned) --</option>
                                            {systemUsers && systemUsers.map((u:any) => (
                                                <option key={u.email} value={u.email}>{u.email}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                        <label className="block text-xs font-bold text-blue-800 mb-2">資料類別</label>
                                        <div className="flex flex-wrap gap-2">
                                            {DB_CATEGORIES.map(cat => (
                                                <button 
                                                    key={cat.id} 
                                                    type="button" 
                                                    onClick={() => {
                                                        const newDefaultDoc = settings.dbDocTypes?.[cat.id]?.[0] || '';
                                                        setEditingEntry({...editingEntry, category: cat.id as any, docType: newDefaultDoc});
                                                    }} 
                                                    className={`px-3 py-1.5 text-sm rounded-md border transition-all ${editingEntry.category === cat.id ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 hover:bg-blue-100'}`}
                                                >
                                                    {cat.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* 第一欄：文字輸入區 */}
                                <div className="space-y-4">
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">名稱 / 標題 (Name)</label><input disabled={!isDbEditing} value={editingEntry.name} onChange={e => setEditingEntry({...editingEntry, name: e.target.value})} className="w-full p-2 border rounded text-lg font-bold" placeholder="姓名 / 公司名" required /></div>
                                    {editingEntry.category === 'Person' && (
                                        <>
                                            <div><label className="block text-xs font-bold text-slate-500 mb-1">人員角色</label><div className="flex flex-wrap gap-2">{(settings.dbRoles || ['客戶', '司機']).map(role => (<button key={role} type="button" disabled={!isDbEditing} onClick={() => toggleRole(role)} className={`px-2 py-1 text-xs rounded border ${editingEntry.roles?.includes(role) ? 'bg-green-100 text-green-800 border-green-300 font-bold' : 'bg-white text-gray-500'}`}>{role}</button>))}</div></div>
                                            <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-slate-500 mb-1">電話</label><input disabled={!isDbEditing} value={editingEntry.phone || ''} onChange={e => setEditingEntry({...editingEntry, phone: e.target.value})} className="w-full p-2 border rounded text-sm"/></div><div><label className="block text-xs font-bold text-slate-500 mb-1">證件號碼</label><input disabled={!isDbEditing} value={editingEntry.idNumber || ''} onChange={e => setEditingEntry({...editingEntry, idNumber: e.target.value})} className="w-full p-2 border rounded text-sm" placeholder="HKID / 回鄉證"/></div></div>
                                            <div><label className="block text-xs font-bold text-slate-500 mb-1">地址</label><input disabled={!isDbEditing} value={editingEntry.address || ''} onChange={e => setEditingEntry({...editingEntry, address: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                                        </>
                                    )}
                                    {editingEntry.category === 'Company' && (
                                        <>
                                            <div><label className="block text-xs font-bold text-slate-500 mb-1">商業登記號 (BR)</label><input disabled={!isDbEditing} value={editingEntry.idNumber || ''} onChange={e => setEditingEntry({...editingEntry, idNumber: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                                            <div><label className="block text-xs font-bold text-slate-500 mb-1">公司電話</label><input disabled={!isDbEditing} value={editingEntry.phone || ''} onChange={e => setEditingEntry({...editingEntry, phone: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                                            <div><label className="block text-xs font-bold text-slate-500 mb-1">公司地址</label><input disabled={!isDbEditing} value={editingEntry.address || ''} onChange={e => setEditingEntry({...editingEntry, address: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                                        </>
                                    )}
                                    
                                    {editingEntry.category === 'Vehicle' && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div><label className="block text-xs font-bold text-slate-500 mb-1">香港車牌 (Reg Mark)</label><input disabled={!isDbEditing} value={editingEntry.plateNoHK || ''} onChange={e => setEditingEntry({...editingEntry, plateNoHK: e.target.value, relatedPlateNo: e.target.value})} className="w-full p-2 border rounded bg-yellow-50 font-mono font-bold"/></div>
                                                <div><label className="block text-xs font-bold text-slate-500 mb-1">國內車牌</label><input disabled={!isDbEditing} value={editingEntry.plateNoCN || ''} onChange={e => setEditingEntry({...editingEntry, plateNoCN: e.target.value})} className="w-full p-2 border rounded bg-blue-50 font-mono"/></div>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded border border-gray-200 mt-4 space-y-3">
                                                <div className="flex justify-between items-center border-b pb-2 mb-2"><label className="block text-xs font-bold text-gray-700"><FileText size={14} className="inline mr-1"/> VRD 牌薄詳細資料</label></div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    <div><label className="text-[10px] text-gray-500">廠名</label><input disabled={!isDbEditing} value={editingEntry.make || ''} onChange={e => setEditingEntry({...editingEntry, make: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    <div><label className="text-[10px] text-gray-500">型號</label><input disabled={!isDbEditing} value={editingEntry.model || ''} onChange={e => setEditingEntry({...editingEntry, model: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    <div><label className="text-[10px] text-gray-500">年份</label><input disabled={!isDbEditing} value={editingEntry.manufactureYear || ''} onChange={e => setEditingEntry({...editingEntry, manufactureYear: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    <div><label className="text-[10px] text-gray-500">顏色</label><input disabled={!isDbEditing} value={editingEntry.vehicleColor || ''} onChange={e => setEditingEntry({...editingEntry, vehicleColor: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    <div className="col-span-1"><label className="text-[10px] text-gray-500">底盤號</label><input disabled={!isDbEditing} value={editingEntry.chassisNo || ''} onChange={e => setEditingEntry({...editingEntry, chassisNo: e.target.value})} className="w-full p-1.5 border rounded text-xs font-mono"/></div>
                                                    <div className="col-span-1"><label className="text-[10px] text-gray-500">引擎號</label><input disabled={!isDbEditing} value={editingEntry.engineNo || ''} onChange={e => setEditingEntry({...editingEntry, engineNo: e.target.value})} className="w-full p-1.5 border rounded text-xs font-mono"/></div>
                                                    <div className="col-span-1"><label className="text-[10px] text-gray-500">容量</label><input type="number" disabled={!isDbEditing} value={editingEntry.engineSize || ''} onChange={e => setEditingEntry({...editingEntry, engineSize: Number(e.target.value)})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    <div className="col-span-1"><label className="text-[10px] text-gray-500">狀況</label><input disabled={!isDbEditing} value={editingEntry.firstRegCondition || ''} onChange={e => setEditingEntry({...editingEntry, firstRegCondition: e.target.value})} className="w-full p-1.5 border rounded text-xs" placeholder="BRAND NEW"/></div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    <div><label className="text-[10px] text-gray-500">A1 稅值</label><input type="number" disabled={!isDbEditing} value={editingEntry.priceA1 || ''} onChange={e => setEditingEntry({...editingEntry, priceA1: Number(e.target.value)})} className="w-full p-1.5 border rounded text-xs font-bold text-blue-600"/></div>
                                                    <div><label className="text-[10px] text-gray-500">已繳稅款</label><input type="number" disabled={!isDbEditing} value={editingEntry.priceTax || ''} onChange={e => setEditingEntry({...editingEntry, priceTax: Number(e.target.value)})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    <div><label className="text-[10px] text-gray-500">手數</label><input type="number" disabled={!isDbEditing} value={editingEntry.prevOwners || ''} onChange={e => setEditingEntry({...editingEntry, prevOwners: Number(e.target.value)})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    <div><label className="text-[10px] text-gray-500">座位數</label><input type="number" disabled={!isDbEditing} value={editingEntry.seating || ''} onChange={e => setEditingEntry({...editingEntry, seating: Number(e.target.value)})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                </div>
                                                <div className="bg-white p-2 rounded border border-slate-100">
                                                    <label className="text-[10px] font-bold text-slate-400 mb-1 block">VRD 登記車主</label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        <div className="col-span-2"><input disabled={!isDbEditing} value={editingEntry.registeredOwnerName || ''} onChange={e => setEditingEntry({...editingEntry, registeredOwnerName: e.target.value})} className="w-full p-1.5 border rounded text-xs" placeholder="車主全名"/></div>
                                                        <div className="col-span-1"><input disabled={!isDbEditing} value={editingEntry.registeredOwnerId || ''} onChange={e => setEditingEntry({...editingEntry, registeredOwnerId: e.target.value})} className="w-full p-1.5 border rounded text-xs" placeholder="身份證號碼"/></div>
                                                        <div className="col-span-1"><input type="date" disabled={!isDbEditing} value={editingEntry.registeredOwnerDate || ''} onChange={e => setEditingEntry({...editingEntry, registeredOwnerDate: e.target.value})} className="w-full p-1.5 border rounded text-xs text-slate-500" title="登記為車主日期"/></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    
                                    {editingEntry.category === 'CrossBorder' && (
                                        <div className="space-y-4 mb-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">指標號 (Quota No)</label>
                                                    <input disabled={!isDbEditing} value={editingEntry.quotaNo || ''} onChange={e => setEditingEntry({...editingEntry, quotaNo: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">關聯香港車牌</label>
                                                    {isDbEditing ? (
                                                        <select value={editingEntry.relatedPlateNo || ''} onChange={e => setEditingEntry({...editingEntry, relatedPlateNo: e.target.value})} className="w-full p-2 border rounded text-sm bg-blue-50 text-blue-800 font-bold">
                                                            <option value="">-- 無關聯 --</option>
                                                            {inventory.map(v => (<option key={v.id} value={v.regMark}>{v.regMark} {v.make} {v.model}</option>))}
                                                        </select>
                                                    ) : (
                                                        <div className="w-full p-2 border rounded text-sm bg-gray-50">{editingEntry.relatedPlateNo || '-'}</div>
                                                    )}
                                                </div>
                                            </div>

                                            {editingEntry.docType === '四證八面' && (
                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-4 animate-fade-in mt-2">
                                                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                                                        <span className="text-xs font-black text-slate-700 bg-yellow-200 px-2 rounded">1. 香港身份證</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                        <div><label className="text-[10px] text-gray-500">姓名 (Name)</label><input disabled={!isDbEditing} value={editingEntry.hkid_name || ''} onChange={e => setEditingEntry({...editingEntry, hkid_name: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                        <div><label className="text-[10px] text-gray-500">身份證號碼</label><input disabled={!isDbEditing} value={editingEntry.idNumber || ''} onChange={e => setEditingEntry({...editingEntry, idNumber: e.target.value})} className="w-full p-1.5 border rounded text-xs font-bold"/></div>
                                                        <div><label className="text-[10px] text-gray-500">電碼 (Code)</label><input disabled={!isDbEditing} value={editingEntry.hkid_code || ''} onChange={e => setEditingEntry({...editingEntry, hkid_code: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                        <div><label className="text-[10px] text-gray-500">出生日期</label><input type="date" disabled={!isDbEditing} value={editingEntry.hkid_dob || ''} onChange={e => setEditingEntry({...editingEntry, hkid_dob: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                        <div><label className="text-[10px] text-gray-500">簽發日期</label><input type="date" disabled={!isDbEditing} value={editingEntry.hkid_issueDate || ''} onChange={e => setEditingEntry({...editingEntry, hkid_issueDate: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    </div>

                                                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1 pt-2">
                                                        <span className="text-xs font-black text-slate-700 bg-blue-200 px-2 rounded">2. 回鄉證 (港澳居民通行證)</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                        <div><label className="text-[10px] text-gray-500">姓名 (簡體)</label><input disabled={!isDbEditing} value={editingEntry.hrp_nameCN || ''} onChange={e => setEditingEntry({...editingEntry, hrp_nameCN: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                        <div><label className="text-[10px] text-gray-500">證件號碼</label><input disabled={!isDbEditing} value={editingEntry.hrp_num || ''} onChange={e => setEditingEntry({...editingEntry, hrp_num: e.target.value})} className="w-full p-1.5 border rounded text-xs font-mono"/></div>
                                                        <div><label className="text-[10px] text-gray-500">有效期至</label><input type="date" disabled={!isDbEditing} value={editingEntry.hrp_expiry || ''} onChange={e => setEditingEntry({...editingEntry, hrp_expiry: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    </div>

                                                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1 pt-2">
                                                        <span className="text-xs font-black text-slate-700 bg-green-200 px-2 rounded">3. 香港駕駛執照</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                        <div><label className="text-[10px] text-gray-500">執照號碼</label><input disabled={!isDbEditing} value={editingEntry.hkdl_num || ''} onChange={e => setEditingEntry({...editingEntry, hkdl_num: e.target.value})} className="w-full p-1.5 border rounded text-xs font-mono"/></div>
                                                        <div><label className="text-[10px] text-gray-500">有效期至</label><input type="date" disabled={!isDbEditing} value={editingEntry.hkdl_validTo || ''} onChange={e => setEditingEntry({...editingEntry, hkdl_validTo: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                        <div><label className="text-[10px] text-gray-500">檔號 (Ref No)</label><input disabled={!isDbEditing} value={editingEntry.hkdl_ref || ''} onChange={e => setEditingEntry({...editingEntry, hkdl_ref: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                    </div>

                                                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1 pt-2">
                                                        <span className="text-xs font-black text-slate-700 bg-red-200 px-2 rounded">4. 中國機動車駕駛證</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div><label className="text-[10px] text-gray-500">證號</label><input disabled={!isDbEditing} value={editingEntry.cndl_num || ''} onChange={e => setEditingEntry({...editingEntry, cndl_num: e.target.value})} className="w-full p-1.5 border rounded text-xs font-mono"/></div>
                                                        <div><label className="text-[10px] text-gray-500">檔案編號 (副頁)</label><input disabled={!isDbEditing} value={editingEntry.cndl_fileNum || ''} onChange={e => setEditingEntry({...editingEntry, cndl_fileNum: e.target.value})} className="w-full p-1.5 border rounded text-xs font-mono"/></div>
                                                        <div className="col-span-2"><label className="text-[10px] text-gray-500">住址</label><input disabled={!isDbEditing} value={editingEntry.cndl_address || ''} onChange={e => setEditingEntry({...editingEntry, cndl_address: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                        <div><label className="text-[10px] text-gray-500">初次領證日期</label><input type="date" disabled={!isDbEditing} value={editingEntry.cndl_firstIssue || ''} onChange={e => setEditingEntry({...editingEntry, cndl_firstIssue: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                        <div><label className="text-[10px] text-gray-500">簽發地 (印章)</label><input disabled={!isDbEditing} value={editingEntry.cndl_issueLoc || ''} onChange={e => setEditingEntry({...editingEntry, cndl_issueLoc: e.target.value})} className="w-full p-1.5 border rounded text-xs"/></div>
                                                        <div className="col-span-2"><label className="text-[10px] text-gray-500">有效期限 (起止)</label><input disabled={!isDbEditing} value={editingEntry.cndl_validPeriod || ''} onChange={e => setEditingEntry({...editingEntry, cndl_validPeriod: e.target.value})} className="w-full p-1.5 border rounded text-xs" placeholder="例如: 2023-01-01 至 2029-01-01"/></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">文件類型</label><input list="doctype_list" disabled={!isDbEditing} value={editingEntry.docType || ''} onChange={e => setEditingEntry({...editingEntry, docType: e.target.value})} className="w-full p-2 border rounded text-sm bg-gray-50" placeholder="選擇或輸入新類型..."/><datalist id="doctype_list">{(settings.dbDocTypes[editingEntry.category] || []).map(t => <option key={t} value={t}/>)}</datalist></div>
                                    
                                    {editingEntry.docType && DOCUMENT_FIELD_SCHEMA[editingEntry.docType] && (
                                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 mt-2 animate-fade-in space-y-3">
                                            <div className="text-[10px] font-bold text-blue-600 flex items-center mb-1">
                                                <ShieldCheck size={14} className="mr-1"/> {editingEntry.docType} 專屬數據欄位
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {DOCUMENT_FIELD_SCHEMA[editingEntry.docType].map((field) => (
                                                    <div key={field.key} className={field.type === 'date' ? 'col-span-1' : 'col-span-2 md:col-span-1'}>
                                                        <label className="block text-[10px] text-slate-400 font-bold mb-1">{field.label}</label>
                                                        <input 
                                                            type={field.type} 
                                                            disabled={!isDbEditing} 
                                                            value={editingEntry.extractedData?.[field.key] || ''} 
                                                            onChange={e => {
                                                                const newExtData = { ...(editingEntry.extractedData || {}), [field.key]: e.target.value };
                                                                setEditingEntry({ ...editingEntry, extractedData: newExtData });
                                                            }} 
                                                            className="w-full p-2 border border-slate-200 rounded text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none font-medium" 
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {toastMsg && (
                                        <div className={`fixed top-10 left-1/2 transform -translate-x-1/2 z-[99999] px-6 py-3 rounded-full shadow-2xl text-sm font-bold flex items-center transition-all animate-fade-in ${toastMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                                            {toastMsg.text}
                                        </div>
                                    )}

                                    <div className={`p-4 rounded-lg border transition-all ${editingEntry.reminderEnabled ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="flex items-center cursor-pointer"><input type="checkbox" disabled={!isDbEditing} checked={editingEntry.reminderEnabled || false} onChange={e => setEditingEntry({ ...editingEntry, reminderEnabled: e.target.checked })} className="w-4 h-4 text-amber-600 rounded mr-2" /><span className={`text-sm font-bold flex items-center ${editingEntry.reminderEnabled ? 'text-amber-800' : 'text-gray-500'}`}><Bell size={16} className="mr-1"/> 啟用到期提醒功能</span></label>
                                            {editingEntry.reminderEnabled && (<div className="text-xs text-amber-700 font-mono bg-white px-2 py-1 rounded border border-amber-200">已續期次數: <span className="font-bold">{editingEntry.renewalCount || 0}</span></div>)}
                                        </div>
                                        {editingEntry.reminderEnabled && (
                                            <div className="grid grid-cols-2 gap-4 animate-fade-in">
                                                <div className="col-span-2 md:col-span-1"><label className="block text-xs font-bold text-amber-800 mb-1">當前到期日</label><input type="date" disabled={!isDbEditing} value={editingEntry.expiryDate || ''} onChange={e => setEditingEntry({...editingEntry, expiryDate: e.target.value})} className="w-full p-2 border border-amber-300 rounded text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none font-bold" /><div className="mt-1"><DateStatusBadge date={editingEntry.expiryDate} label="狀態" /></div></div>
                                                <div className="col-span-2 md:col-span-1 bg-white p-2 rounded border border-amber-100"><label className="block text-xs font-bold text-gray-500 mb-1">自動續期規則</label><div className="flex gap-2 mb-2"><input type="number" disabled={!isDbEditing} value={editingEntry.renewalDuration} onChange={e => setEditingEntry({...editingEntry, renewalDuration: Number(e.target.value)})} className="w-16 p-1 border rounded text-center text-sm" min="1" /><select disabled={!isDbEditing} value={editingEntry.renewalUnit} onChange={e => setEditingEntry({...editingEntry, renewalUnit: e.target.value as any})} className="flex-1 p-1 border rounded text-sm"><option value="year">年</option><option value="month">月</option></select></div>{isDbEditing && (<button type="button" onClick={handleQuickRenew} className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-1.5 rounded flex items-center justify-center shadow-sm transition-transform active:scale-95"><RefreshCw size={12} className="mr-1"/> 立即續期</button>)}</div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {(editingEntry.customReminders || []).map((rem: any, idx: number) => (
                                        <div key={rem.id} className="p-4 rounded-lg border bg-blue-50/50 border-blue-200 mt-3 animate-fade-in relative shadow-sm">
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex-1 mr-4">
                                                    <input 
                                                        type="text"
                                                        disabled={!isDbEditing} 
                                                        value={rem.title} 
                                                        onChange={e => {
                                                            const newR = editingEntry.customReminders!.map((r:any, i:number) => 
                                                                i === idx ? { ...r, title: e.target.value } : r
                                                            );
                                                            setEditingEntry({...editingEntry, customReminders: newR});
                                                        }} 
                                                        placeholder="輸入文件名稱 (例如：體檢報告、保險)..." 
                                                        className="w-full bg-transparent border-b border-blue-300 font-bold text-blue-800 outline-none focus:border-blue-600 pb-1 text-sm" 
                                                    />
                                                </div>
                                                {isDbEditing && (
                                                    <button type="button" onClick={() => {
                                                        const newR = editingEntry.customReminders!.filter((r:any) => r.id !== rem.id);
                                                        setEditingEntry({...editingEntry, customReminders: newR});
                                                    }} className="text-red-400 hover:text-red-600 p-1 bg-white rounded-full shadow-sm border border-red-100"><X size={14}/></button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2 md:col-span-1">
                                                    <label className="block text-xs font-bold text-blue-800 mb-1">到期日</label>
                                                    <input type="date" disabled={!isDbEditing} value={rem.expiryDate || ''} onChange={e => {
                                                        const newR = editingEntry.customReminders!.map((r:any, i:number) => 
                                                            i === idx ? { ...r, expiryDate: e.target.value } : r
                                                        );
                                                        setEditingEntry({...editingEntry, customReminders: newR});
                                                    }} className="w-full p-2 border border-blue-300 rounded text-sm bg-white font-bold focus:ring-2 focus:ring-blue-400 outline-none" />
                                                    <div className="mt-1"><DateStatusBadge date={rem.expiryDate} label="狀態" /></div>
                                                </div>
                                                <div className="col-span-2 md:col-span-1 bg-white p-2 rounded border border-blue-100">
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">獨立續期規則</label>
                                                    <div className="flex gap-2 mb-2">
                                                        <input type="number" disabled={!isDbEditing} value={rem.renewalDuration} onChange={e => {
                                                            const newR = editingEntry.customReminders!.map((r:any, i:number) => 
                                                                i === idx ? { ...r, renewalDuration: Number(e.target.value) } : r
                                                            );
                                                            setEditingEntry({...editingEntry, customReminders: newR});
                                                        }} className="w-16 p-1 border rounded text-center text-sm" min="1" />
                                                        <select disabled={!isDbEditing} value={rem.renewalUnit} onChange={e => {
                                                            const newR = editingEntry.customReminders!.map((r:any, i:number) => 
                                                                i === idx ? { ...r, renewalUnit: e.target.value } : r
                                                            );
                                                            setEditingEntry({...editingEntry, customReminders: newR});
                                                        }} className="flex-1 p-1 border rounded text-sm"><option value="year">年</option><option value="month">月</option></select>
                                                    </div>
                                                    {isDbEditing && (
                                                        <button type="button" onClick={() => {
                                                            if (!rem.expiryDate) { showToast("請先設定到期日", "error"); return; }
                                                            const currentDate = new Date(rem.expiryDate);
                                                            if (rem.renewalUnit === 'year') currentDate.setFullYear(currentDate.getFullYear() + rem.renewalDuration);
                                                            else currentDate.setMonth(currentDate.getMonth() + rem.renewalDuration);
                                                            
                                                            const newR = editingEntry.customReminders!.map((r:any, i:number) => 
                                                                i === idx ? { ...r, expiryDate: currentDate.toISOString().split('T')[0], renewalCount: (r.renewalCount || 0) + 1 } : r
                                                            );
                                                            setEditingEntry({...editingEntry, customReminders: newR});
                                                        }} className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1.5 rounded flex items-center justify-center shadow-sm"><RefreshCw size={12} className="mr-1"/> 立即續期 ({rem.renewalCount || 0})</button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {isDbEditing && (editingEntry.customReminders?.length || 0) < 5 && (
                                        <button type="button" onClick={() => {
                                            const newRem = { id: Date.now().toString(), title: '', expiryDate: '', renewalCount: 0, renewalDuration: 1, renewalUnit: 'year' };
                                            setEditingEntry({...editingEntry, customReminders: [...(editingEntry.customReminders || []), newRem]});
                                        }} className="w-full mt-3 py-2.5 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors flex justify-center items-center">
                                            <Plus size={16} className="mr-1"/> 增加其他文件提醒 (已用 {(editingEntry.customReminders?.length || 0) + 1} / 6)
                                        </button>
                                    )}
                                    
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">備註</label><textarea disabled={!isDbEditing} value={editingEntry.description || ''} onChange={e => setEditingEntry({...editingEntry, description: e.target.value})} className="w-full p-2 border rounded text-sm h-24" placeholder="輸入詳細說明..."/></div>
                                    <div><label className="block text-xs font-bold text-slate-500">標籤</label><div className="flex gap-2 mb-2 flex-wrap">{editingEntry.tags?.map(tag => <span key={tag} className="bg-slate-200 px-2 py-1 rounded text-xs flex items-center">{tag} {isDbEditing && <button type="button" onClick={() => setEditingEntry({...editingEntry, tags: editingEntry.tags.filter(t => t !== tag)})} className="ml-1 text-slate-500 hover:text-red-500"><X size={10}/></button>}</span>)}</div>{isDbEditing && <div className="flex gap-1"><input value={tagInput} onChange={e => setTagInput(e.target.value)} className="flex-1 p-1.5 border rounded text-xs" placeholder="新增..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} /><button type="button" onClick={addTag} className="bg-slate-200 px-3 py-1 rounded text-xs"><Plus size={12}/></button></div>}</div>
                                </div>

                                {/* 第二欄：圖片列表與上傳區 */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-xs font-bold text-slate-500">文件圖片 ({editingEntry.attachments?.length || 0})</label>
                                        <div className="flex gap-2">
                                            {isDbEditing && (
                                                <button 
                                                    type="button" 
                                                    onClick={async () => {
                                                        try {
                                                            const q = query(
                                                                collection(db!, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library'), 
                                                                where('status', '==', 'unassigned')
                                                            );
                                                            const snap = await getDocs(q);
                                                            
                                                            const docs = snap.docs
                                                                .map(d => ({id: d.id, ...d.data()}))
                                                                .filter((d: any) => d.mediaType === 'document');
                                                            
                                                            setAvailableDocs(docs);
                                                            setShowMediaPicker(true);
                                                        } catch (error: any) {
                                                            console.error("載入 Inbox 失敗:", error);
                                                            showToast(`無法讀取 Inbox，請檢查網路。\n錯誤訊息: ${error.message}`, 'error');
                                                        }
                                                    }} 
                                                    className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full hover:bg-indigo-100 flex items-center border border-indigo-200 shadow-sm transition-colors font-bold active:scale-95"
                                                >
                                                    <DownloadCloud size={14} className="mr-1"/> 從 Inbox 導入
                                                </button>
                                            )}
                                            {selectedForPrint.length > 0 && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setShowA4Printer(true)} 
                                                    className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full hover:bg-purple-700 flex items-center shadow-sm transition-colors"
                                                >
                                                    <Printer size={14} className="mr-1"/> A4排版 ({selectedForPrint.length})
                                                </button>
                                            )}
                                            
                                            {isDbEditing && (
                                                <label className="cursor-pointer text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 flex items-center border border-blue-200 shadow-sm transition-colors">
                                                    <Upload size={14} className="mr-1"/> 上傳圖片
                                                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-6 max-h-[800px] overflow-y-auto pr-2">
                                        {editingEntry.attachments?.map((file, idx) => (
                                            <div key={idx} className={`relative group border rounded-xl overflow-hidden bg-white shadow-md flex flex-col transition-all ${selectedForPrint.includes(idx) ? 'ring-2 ring-purple-500' : ''}`}>
                                                
                                                <div className="w-full bg-slate-50 relative p-1">
                                                    <img src={file.data} className="w-full h-auto object-contain" style={{ maxHeight: 'none' }} />
                                                    <div className="absolute top-2 right-2 flex gap-2">
                                                        {isDbEditing && (
                                                            <>
                                                                <button type="button" onClick={() => analyzeImageWithAI(file.data, editingEntry.docType || editingEntry.category)} disabled={isScanning} className="bg-yellow-400 text-yellow-900 p-2 rounded-full opacity-90 hover:opacity-100 hover:bg-yellow-300 shadow-lg transition-all flex items-center justify-center transform active:scale-95" title="AI 智能識別文字">
                                                                    {isScanning ? <Loader2 size={18} className="animate-spin"/> : <Zap size={18} fill="currentColor"/>}
                                                                </button>
                                                                <button type="button" onClick={() => setEditingEntry(prev => prev ? { ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) } : null)} className="bg-red-500 text-white p-2 rounded-full opacity-90 hover:opacity-100 shadow-lg transition-all transform active:scale-95" title="刪除圖片"><X size={18}/></button>
                                                            </>
                                                        )}
                                                    </div>

                                                    <div className="absolute top-2 left-2 z-20 bg-white/80 p-1 rounded-md backdrop-blur-sm shadow-sm">
                                                        <input 
                                                            type="checkbox" 
                                                            className="w-4 h-4 accent-purple-600 cursor-pointer block"
                                                            checked={selectedForPrint.includes(idx)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedForPrint([...selectedForPrint, idx]);
                                                                else setSelectedForPrint(selectedForPrint.filter(i => i !== idx));
                                                            }}
                                                        />
                                                    </div>

                                                    <button type="button" onClick={(e) => { e.preventDefault(); downloadImage(file.data, file.name); }} className="absolute top-2 left-10 bg-blue-600 text-white p-2 rounded-full opacity-80 hover:opacity-100 transition-opacity shadow-lg" title="下載圖片"><DownloadCloud size={18}/></button>
                                                </div>
                                                
                                                <div className="p-3 border-t bg-white text-sm text-slate-700 font-medium flex items-center"><File size={16} className="mr-2 text-blue-600 flex-shrink-0"/>{isDbEditing ? (<input value={file.name} onChange={e => { const newAttachments = [...editingEntry.attachments]; newAttachments[idx].name = e.target.value; setEditingEntry({...editingEntry, attachments: newAttachments}); }} className="w-full bg-transparent outline-none focus:border-b-2 border-blue-400 py-1" placeholder="輸入檔名..." />) : (<span className="truncate">{file.name}</span>)}</div>
                                            </div>
                                        ))}
                                        {(!editingEntry.attachments || editingEntry.attachments.length === 0) && (<div className="border-2 border-dashed border-slate-200 rounded-xl h-60 flex flex-col items-center justify-center text-slate-400 text-sm bg-slate-50/30"><ImageIcon size={48} className="mb-3 opacity-30"/>暫無附件圖片</div>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                ) : (<div className="flex-1 flex flex-col items-center justify-center text-slate-400"><Database size={48} className="mb-4"/><p>請選擇或新增資料</p></div>)}
            </div>
            {showDupeModal && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-amber-50 rounded-t-xl"><h3 className="font-bold text-amber-800 flex items-center"><AlertTriangle className="mr-2"/> 發現重複資料 ({dupeGroups.length} 組)</h3><button onClick={() => setShowDupeModal(false)}><X/></button></div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">{dupeGroups.map((group, idx) => (<div key={idx} className="border rounded-lg p-3 bg-slate-50"><h4 className="font-bold mb-2 text-slate-700">名稱: {group[0].name}</h4><div className="space-y-2">{group.map(item => (<div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border"><div className="text-xs"><div><span className="font-bold">ID:</span> {item.id}</div><div><span className="font-bold">建立:</span> {item.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}</div></div><button onClick={() => resolveDuplicate(item.id, group)} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">保留此筆 (刪除其他)</button></div>))}</div></div>))}</div>
                    </div>
                </div>
            )}
            {showA4Printer && (
                <A4DocumentPrinter 
                    selectedItems={selectedForPrint.map(idx => ({
                        id: idx.toString(),
                        url: editingEntry?.attachments[idx].data 
                    }))}
                    onClose={() => setShowA4Printer(false)} 
                />
            )}
            {showMediaPicker && (
                <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
                        <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center"><FileText className="mr-2"/> 選擇 Inbox 中的文件</h3>
                            <button onClick={() => setShowMediaPicker(false)} className="hover:bg-white/20 p-1 rounded-full"><X/></button>
                        </div>
                        <div className="p-4 grid grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto bg-slate-50 flex-1">
                            {availableDocs.map(mediaItem => (
                                <div key={mediaItem.id} className="relative aspect-auto bg-white p-1 rounded-lg border-2 border-slate-200 shadow-sm hover:border-indigo-400 group cursor-pointer"
                                    onClick={async () => {
                                        try {
                                            setEditingEntry(prev => prev ? { 
                                                ...prev, 
                                                attachments: [...prev.attachments, { 
                                                    name: mediaItem.fileName || 'Inbox文件', 
                                                    data: mediaItem.url 
                                                }] 
                                            } : null);
                                            
                                            const docRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library', mediaItem.id);
                                            await updateDoc(docRef, {
                                                status: 'database_linked', 
                                                updatedAt: serverTimestamp()
                                            });

                                            setAvailableDocs(prev => prev.filter(d => d.id !== mediaItem.id)); 
                                            showToast('✅ 成功導入文件！');
                                            
                                        } catch (e) { 
                                            console.error("更新 Firebase 狀態失敗:", e);
                                            showToast("導入失敗，請檢查網絡權限。", "error"); 
                                        }
                                    }}
                                >
                                    <img src={mediaItem.url} className="w-full h-32 object-contain" />
                                    <div className="absolute inset-0 bg-indigo-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-bold text-sm transition-opacity rounded-lg">
                                        點擊導入
                                    </div>
                                </div>
                            ))}
                            {availableDocs.length === 0 && <div className="col-span-full py-10 text-center text-slate-400">智能圖庫的 Inbox 中目前沒有文件。</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
