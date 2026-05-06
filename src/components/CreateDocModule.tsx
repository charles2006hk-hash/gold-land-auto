'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Plus, Trash2, Edit, Eye, Car, Printer, Save, Check, X, Globe, ChevronLeft, RefreshCw 
} from 'lucide-react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, where, getDocs } from "firebase/firestore";
import { CompanyStamp, SignatureImg } from './DocumentTemplate';

// 輔助格式化函數
const formatCurrency = (amount: number) => new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', maximumFractionDigits: 0 }).format(amount || 0);

export default function CreateDocModule({ 
    inventory, openPrintPreview, db, staffId, appId, externalRequest, setExternalRequest, COMPANY_INFO
}: { 
    inventory: any[];
    openPrintPreview: any;
    db: any;
    staffId: string;
    appId: string;
    externalRequest?: any;
    setExternalRequest?: (req: any) => void;
    COMPANY_INFO: any;
}) {
    const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
    const [docHistory, setDocHistory] = useState<any[]>([]);
    const [mobileStep, setMobileStep] = useState<'list' | 'edit' | 'preview'>('list');
    
    const [docId, setDocId] = useState<string | null>(null);
    const [selectedDocType, setSelectedDocType] = useState('sales_contract');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
    
    // ★ 相片抓取狀態
    const [carPhotos, setCarPhotos] = useState<string[]>([]);
    const [isFetchingPhotos, setIsFetchingPhotos] = useState(false);

    const [formData, setFormData] = useState({
        companyNameEn: COMPANY_INFO?.name_en || 'GOLD LAND AUTO', 
        companyNameCh: COMPANY_INFO?.name_ch || '金田汽車',
        companyAddress: COMPANY_INFO?.address_ch || '', 
        companyPhone: COMPANY_INFO?.phone || '', 
        companyEmail: COMPANY_INFO?.email || '', 
        
        customerName: '', customerId: '', customerAddress: '', customerPhone: '',
        
        // ★ 車輛資料擴增 (加入了波箱、容積、里數、座位、手數)
        regMark: '', make: '', model: '', chassisNo: '', engineNo: '', year: '', color: '', colorInterior: '', 
        transmission: 'Automatic', engineSize: '', mileage: '', seat: '', previousOwners: '',
        
        price: '', deposit: '', balance: '', 
        
        docDate: new Date().toISOString().split('T')[0], 
        deliveryDate: new Date().toISOString().split('T')[0], 
        handoverTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), 
        remarks: '', paymentMethod: 'Cheque',

        orderType: 'None', 
        overseasCountry: 'Japan',
        etaFormat: 'date', 
        etaDays: '',       
        etaDate: '',
        
        overseasTotalFee: '',
        chk_ov_local: true, chk_ov_auction: true, chk_ov_shipping: true, chk_ov_ins: true, chk_ov_tax: false, chk_ov_doc: true, chk_ov_misc: false,
        localTotalFee: '',
        chk_hk_tax: true, chk_hk_emissions: true, chk_hk_insp: true, chk_hk_reg: true, chk_hk_ins: false, chk_hk_misc: false,

        // ★ 新增：用於合約列印的相片
        contractPhotos: [] as string[]
    });

    const [checklist, setChecklist] = useState({ vrd: false, keys: false, tools: false, manual: false, other: '' });
    const [savedDocs, setSavedDocs] = useState<any[]>([]);
    const [docItems, setDocItems] = useState<{ id: string, desc: string, amount: number, isSelected: boolean, isFree?: boolean }[]>([]);
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemAmount, setNewItemAmount] = useState('');
    const [depositItems, setDepositItems] = useState<{ id: string, label: string, amount: number }[]>([{ id: 'dep_1', label: 'Deposit (訂金)', amount: 0 }]);
    const [showTerms, setShowTerms] = useState(true);
    const [showStampAndSig, setShowStampAndSig] = useState(true); 

    const [filterType, setFilterType] = useState<string>('All');
    const [docSearchTerm, setDocSearchTerm] = useState('');
    const [isDateFilterEnabled, setIsDateFilterEnabled] = useState(false);
    const [filterStartDate, setFilterStartDate] = useState(() => {
        const date = new Date();
        return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    });
    const [filterEndDate, setFilterEndDate] = useState(() => {
        const date = new Date();
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
    });

    // ★★★ 手動與自動皆可呼叫的：智能抓取車輛相片函數 ★★★
    const fetchVehiclePhotos = async (carIdToFetch: string) => {
        if (!db || !appId || !carIdToFetch || carIdToFetch === 'BLANK') {
            setCarPhotos([]);
            return;
        }
        setIsFetchingPhotos(true);
        try {
            const q = query(
                collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library'), 
                where('status', '==', 'linked'), 
                where('relatedVehicleId', '==', carIdToFetch)
            );
            const snapshot = await getDocs(q);
            const list: string[] = [];
            let cover = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.isPrimary) cover = data.url;
                else list.push(data.url);
            });
            if (cover) list.unshift(cover);
            
            const invCar = inventory.find(v => v.id === carIdToFetch);
            const merged = Array.from(new Set([...list, ...(invCar?.photos || [])]));
            setCarPhotos(merged);

            // ★ 自動預選前 5 張相片 (只限新增單據時)
            if (!docId && formData.contractPhotos.length === 0) {
                setFormData(prev => ({ ...prev, contractPhotos: merged.slice(0, 5) }));
            }
        } catch (e) {
            console.error("相片拉取失敗", e);
        } finally {
            setIsFetchingPhotos(false);
        }
    };

    // 當選擇車輛變更時，自動觸發一次相片抓取
    useEffect(() => {
        if (selectedCarId && selectedCarId !== 'BLANK') {
            fetchVehiclePhotos(selectedCarId);
        }
    }, [selectedCarId]);


    const filteredDocHistory = savedDocs.filter((doc: any) => {
        if (filterType !== 'All' && doc.type !== filterType) return false;
        
        if (docSearchTerm) {
            const searchLower = docSearchTerm.toLowerCase();
            const searchStr = [
                doc.summary,
                doc.formData?.customerName,
                doc.formData?.customerPhone,
                doc.formData?.customerId,
                doc.formData?.regMark,
                doc.formData?.make,
                doc.formData?.model,
                doc.formData?.chassisNo,
                doc.formData?.engineNo,
                doc.formData?.docDate,
                doc.id
            ].join(' ').toLowerCase();

            if (!searchStr.includes(searchLower)) {
                return false;
            }
        }

        if (isDateFilterEnabled) {
            const docDateStr = doc.formData?.docDate || (doc.updatedAt?.toDate ? doc.updatedAt.toDate().toISOString().split('T')[0] : '');
            if (!docDateStr) return false; 
            if (filterStartDate && docDateStr < filterStartDate) return false;
            if (filterEndDate && docDateStr > filterEndDate) return false;
        }
        return true;
    });

    const DEFAULT_REMARKS = "匯豐銀行香港賬戶：747-057347-838\n賬戶名稱：GOLD LAND POWER LIMITED T/A GOLD LAND AUTO\n「轉數快」識別碼 6134530";

    useEffect(() => {
        if (externalRequest) {
            setDocId(externalRequest.id);
            setSelectedDocType(externalRequest.type);
            const newFormData = { ...externalRequest.formData };
            if (!newFormData.docDate) newFormData.docDate = new Date().toISOString().split('T')[0];
            if (!newFormData.contractPhotos) newFormData.contractPhotos = [];
            
            setFormData(newFormData);
            setChecklist(externalRequest.checklist || { vrd: false, keys: false, tools: false, manual: false, other: '' });
            setDocItems(externalRequest.docItems || []);
            setDepositItems(externalRequest.depositItems || [{ id: 'dep_1', label: 'Deposit (訂金)', amount: 0 }]);
            setShowTerms(externalRequest.showTerms !== false);
            setViewMode('edit');
            
            // 嘗試抓取圖庫照片
            if (externalRequest.vehicleId) {
                setSelectedCarId(externalRequest.vehicleId);
            }
            
            if (setExternalRequest) setExternalRequest(null);
        }
    }, [externalRequest]);

    useEffect(() => {
        if (!db || !appId) return;
        const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'sales_documents'), orderBy('updatedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSavedDocs(list);   
            setDocHistory(list);  
        });
        return () => unsubscribe();
    }, [db, appId, inventory, staffId]); 

    useEffect(() => {
        if (selectedDocType === 'sales_contract' || selectedDocType === 'quotation') {
            setFormData(prev => {
                if (!prev.remarks) return { ...prev, remarks: DEFAULT_REMARKS };
                return prev;
            });
        }
    }, [selectedDocType]);

    const startNewDoc = () => {
        setDocId(null);
        handleSelectBlank();
        setViewMode('edit');
    };

    const editDoc = (doc: any) => {
        setDocId(doc.id);
        setSelectedDocType(doc.type);
        const newFormData = { ...doc.formData };
        if (!newFormData.docDate) newFormData.docDate = doc.updatedAt?.toDate ? doc.updatedAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        if (!newFormData.contractPhotos) newFormData.contractPhotos = [];
        
        setFormData(newFormData);
        setChecklist(doc.checklist || { vrd: false, keys: false, tools: false, manual: false, other: '' });
        setDocItems(doc.docItems || []);
        setDepositItems(doc.depositItems || [{ id: 'dep_1', label: 'Deposit (訂金)', amount: 0 }]);
        setShowTerms(doc.showTerms !== false); 
        
        // 如果這個單據有關聯車牌，試著把 selectedCarId 設回去，以便抓照片
        if (doc.formData?.regMark) {
            const invCar = inventory.find(v => v.regMark === doc.formData.regMark);
            if (invCar) setSelectedCarId(invCar.id);
        }
        
        setViewMode('edit');
    };

    const deleteDocRecord = async (id: string) => {
        if (!confirm("確定刪除此單據記錄？")) return;
        try { await deleteDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'sales_documents', id)); } 
        catch (e) { console.error("刪除失敗", e); alert("刪除失敗"); }
    };

    const saveDocRecord = async () => {
        if (!db || !staffId) return null;
        const summaryStr = `${formData.customerName || '無聯絡人'} - ${formData.regMark || '無車牌'} - ${formData.year || ''} ${formData.make} ${formData.model}`;

        const docData = {
            type: selectedDocType, formData, checklist, docItems, depositItems, showTerms, showStampAndSig,
            updatedAt: serverTimestamp(), summary: summaryStr 
        };

        try {
            let currentId = docId;
            if (docId) { 
                await updateDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'sales_documents', docId), docData); 
            } else { 
                const ref = await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'sales_documents'), { ...docData, createdAt: serverTimestamp() }); 
                setDocId(ref.id); currentId = ref.id;
            }
            alert("✅ 單據已成功儲存");
            return currentId; 
        } catch (e) { console.error(e); alert("儲存失敗"); return null; }
    };

    const addItem = () => {
        if (!newItemDesc || !newItemAmount) return;
        setDocItems([...docItems, { id: Date.now().toString(), desc: newItemDesc, amount: Number(newItemAmount), isSelected: true }]);
        setNewItemDesc(''); setNewItemAmount('');
    };
    
    const toggleItem = (id: string) => setDocItems(prev => prev.map(item => item.id === id ? { ...item, isSelected: !item.isSelected } : item));
    const deleteItem = (id: string) => setDocItems(prev => prev.filter(item => item.id !== id));

    const filteredInventory = inventory.filter(v => (v.regMark || '').includes(searchTerm.toUpperCase()) || (v.make || '').toUpperCase().includes(searchTerm.toUpperCase()));

    const handleSelectCar = (car: any) => {
        setSelectedCarId(car.id);
        setFormData(prev => ({
            ...prev,
            regMark: car.regMark || '', make: car.make || '', model: car.model || '',
            chassisNo: car.chassisNo || '', engineNo: car.engineNo || '', year: car.year || '',
            color: car.colorExt || car.color || '',
            colorInterior: car.colorInt || car.colorInterior || car.innerColor || '',
            
            // ★ 完美寫入詳細資料
            transmission: car.transmission || 'Automatic',
            engineSize: car.engineSize ? car.engineSize.toString() : '',
            mileage: car.mileage ? car.mileage.toString() : '',
            seat: car.seating ? car.seating.toString() : '',
            previousOwners: car.previousOwners !== undefined ? car.previousOwners.toString() : '',

            price: car.price ? car.price.toString() : '',
            customerName: car.customerName || '', customerPhone: car.customerPhone || '',
            customerId: car.customerID || '', customerAddress: car.customerAddress || '',
            
            docDate: new Date().toISOString().split('T')[0],
            deliveryDate: new Date().toISOString().split('T')[0],
            handoverTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            
            etaFormat: 'date', etaDays: '',
            etaDate: car.eta || car.acquisition?.eta || '',
            orderType: car.acquisition?.type === 'Import' ? 'Overseas' : 'None',
            contractPhotos: [] // 點擊新車時清空，交由 useEffect 自動帶入
        }));

        const autoPayments: { id: string, label: string, amount: number }[] = [];
        if (car.payments && car.payments.length > 0) {
            car.payments.forEach((p: any) => { autoPayments.push({ id: p.id, label: `${p.type} ${p.method ? `(${p.method})` : ''}`, amount: Number(p.amount) || 0 }); });
        } else {
            autoPayments.push({ id: 'dep_1', label: 'Deposit (訂金)', amount: 0 });
        }
        setDepositItems(autoPayments);
        setShowTerms(true);

        const items: any[] = [];
        if (car.crossBorder?.tasks) {
            car.crossBorder.tasks.forEach((t: any, i: number) => {
                if (t.fee > 0) { items.push({ id: `cb_${i}`, desc: `[中港] ${t.item}`, amount: t.fee, isSelected: true }); }
            });
        }
        if (car.salesAddons && car.salesAddons.length > 0) {
            car.salesAddons.forEach((addon: any, i: number) => {
                if (addon.amount > 0) { items.push({ id: `addon_${i}`, desc: addon.name, amount: addon.amount, isSelected: true, isFree: addon.isFree || false }); }
            });
        }
        if (car.maintenanceRecords && car.maintenanceRecords.length > 0) {
            const unpaidMaint = car.maintenanceRecords.filter((m:any) => m.charge > 0 && m.chargeStatus !== 'Paid');
            const groupedByDate: Record<string, { amount: number, items: string[] }> = {};
            unpaidMaint.forEach((m: any) => {
                if (!groupedByDate[m.date]) groupedByDate[m.date] = { amount: 0, items: [] };
                groupedByDate[m.date].amount += m.charge;
                groupedByDate[m.date].items.push(m.item);
            });
            Object.entries(groupedByDate).forEach(([date, data], i) => {
                const summary = data.items.length > 2 ? `${data.items.slice(0,2).join('、')} 等${data.items.length}項` : data.items.join('、');
                items.push({ id: `maint_batch_${date}`, desc: `[${date} 維修保養] ${summary}`, amount: data.amount, isSelected: true });
            });
        }
        
        setDocItems(items);
        setMobileStep('edit');
    };

    const handleSelectBlank = () => {
        setSelectedCarId('BLANK');
        setFormData(prev => ({ 
            ...prev, 
            regMark: '', make: '', model: '', chassisNo: '', engineNo: '', year: '', color: '', colorInterior: '', seat: '', price: '', deposit: '', balance: '', customerName: '', customerId: '', customerAddress: '', customerPhone: '', 
            transmission: 'Automatic', engineSize: '', mileage: '', previousOwners: '', contractPhotos: [],
            docDate: new Date().toISOString().split('T')[0], 
            deliveryDate: new Date().toISOString().split('T')[0],
            handoverTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), 
            
            orderType: 'None', overseasCountry: 'Japan',
            overseasTotalFee: '', localTotalFee: '',
            chk_ov_local: true, chk_ov_auction: true, chk_ov_shipping: true, chk_ov_ins: true, chk_ov_tax: false, chk_ov_doc: true, chk_ov_misc: false,
            chk_hk_tax: true, chk_hk_emissions: true, chk_hk_insp: true, chk_hk_reg: true, chk_hk_ins: false, chk_hk_misc: false,
            etaFormat: 'date', etaDays: '', etaDate: ''
        }));
        setChecklist({ vrd: false, keys: false, tools: false, manual: false, other: '' });
        setDocItems([]);
        setDepositItems([{ id: 'dep_1', label: 'Deposit (訂金)', amount: 0 }]);
        setShowTerms(true);
        setShowStampAndSig(true); 
        setMobileStep('edit');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePrint = async () => {
        const finalId = await saveDocRecord();
        const dummyVehicle: any = {
            id: finalId || docId || 'DRAFT', 
            ...formData,
            photos: formData.contractPhotos || [], // ★ 將挑選好的相片傳入模板
            price: Number(formData.price), 
            deposit: depositItems.reduce((sum, item) => sum + item.amount, 0),
            customerID: formData.customerId, 
            soldDate: formData.deliveryDate,
            handoverTime: formData.handoverTime,
            checklist: checklist,
            selectedItems: docItems.filter(i => i.isSelected),
            depositItems: depositItems, 
            showTerms: showTerms,       
            companyNameEn: formData.companyNameEn, 
            companyNameCh: formData.companyNameCh,
            companyEmail: formData.companyEmail, 
            companyPhone: formData.companyPhone, 
            paymentMethod: formData.paymentMethod 
        };
        openPrintPreview(selectedDocType as any, dummyVehicle);
    };

    // --- 實時預覽 ---
    const LivePreview = () => {
        const isBill = selectedDocType === 'invoice' || selectedDocType === 'receipt';
        const isQuotation = selectedDocType === 'quotation';
        
        const price = Number(formData.price) || 0;
        const deposit = depositItems.reduce((sum, item) => sum + (item.amount || 0), 0);
        const extrasTotal = docItems.filter(i => i.isSelected && !i.isFree).reduce((sum, i) => sum + i.amount, 0);
        
        const ovFee = Number(formData.overseasTotalFee) || 0;
        const hkFee = Number(formData.localTotalFee) || 0;
        const orderFeesTotal = (formData.orderType === 'Overseas') ? (ovFee + hkFee) : 0;

        // 同步修復：如果是海外訂單，基礎車價直接等於海外+本地雜費總和
        const basePrice = formData.orderType === 'Overseas' ? orderFeesTotal : price;
        const balance = basePrice + extrasTotal - deposit;

        const titleMap: any = {
            'sales_contract': { en: 'VEHICLE SALES AGREEMENT', ch: '汽車買賣合約' },
            'purchase_contract': { en: 'VEHICLE PURCHASE AGREEMENT', ch: '汽車收購合約' },
            'consignment_contract': { en: 'VEHICLE CONSIGNMENT AGREEMENT', ch: '汽車寄賣合約' },
            'quotation': { en: 'QUOTATION', ch: '報價單' },
            'invoice': { en: 'INVOICE', ch: '發票' },
            'receipt': { en: 'OFFICIAL RECEIPT', ch: '正式收據' }
        };
        const t = titleMap[selectedDocType] || titleMap['sales_contract'];

        const displayDate = formData.docDate ? new Date(formData.docDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
        const hasOrderDetails = (isQuotation || selectedDocType === 'sales_contract') && formData.orderType && formData.orderType !== 'None';
        const partPaymentLabel = hasOrderDetails ? 'Part D: Payment Details' : 'Part C: Payment Details';
        const etaDisplay = formData.etaFormat === 'days' ? `${formData.etaDays || '___'} Days (天)` : (formData.etaDate || 'TBC (待定)');

        return (
            <div className="w-full h-full bg-gray-300 overflow-hidden flex justify-center pt-4 relative">
                <div className="bg-white shadow-2xl origin-top flex flex-col justify-between" style={{ width: '210mm', height: '297mm', transform: 'scale(0.8)', marginBottom: '-40%' }}>
                    <div className="p-10 font-sans text-slate-900 h-full flex flex-col relative">
                        
                        {/* Header */}
                        <div className="flex justify-between items-start mb-6 border-b-2 border-slate-800 pb-4">
                            <div className="flex items-center gap-4">
                                <img src={COMPANY_INFO?.logo_url || ''} alt="Logo" className="w-20 h-20 object-contain" onError={(e) => e.currentTarget.style.display='none'} />
                                <div>
                                    <h1 className="text-xl font-black text-slate-900 tracking-wide uppercase">{formData.companyNameEn}</h1>
                                    <h2 className="text-lg font-bold text-slate-700 tracking-widest">{formData.companyNameCh}</h2>
                                    <div className="text-[10px] text-slate-500 mt-1 leading-tight font-serif">
                                        <p>{formData.companyAddress}</p>
                                        <p>Tel: {formData.companyPhone} | Email: {formData.companyEmail}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 inline-block mb-1">{t.en}</div>
                                <div className="text-xs font-bold text-slate-600 tracking-[0.5em] text-center">{t.ch}</div>
                                <div className="mt-2 text-[10px] font-mono">NO: {docId ? docId.slice(0,6).toUpperCase() : 'PREVIEW-DRAFT'}</div>
                                <div className="text-[10px] font-mono font-bold text-blue-800">DATE: {displayDate}</div>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1">
                            {(!isBill) ? (
                                <>
                                    {/* ★★★ Part A & B 左右並排 (1/3 與 2/3) ★★★ */}
                                    <div className="grid grid-cols-3 gap-4 mb-3">
                                        <div className="col-span-1">
                                            <div className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 uppercase mb-1">Part A: Customer</div>
                                            <div className="border border-slate-300 p-2 text-[10px] h-[72px] flex flex-col justify-center space-y-1">
                                                <p className="truncate"><span className="text-slate-500 font-bold">NAME:</span> {formData.customerName || '(Client)'}</p>
                                                <p className="truncate"><span className="text-slate-500 font-bold">TEL:</span> {formData.customerPhone}</p>
                                                <p className="truncate"><span className="text-slate-500 font-bold">ID:</span> {formData.customerId}</p>
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 uppercase mb-1">Part B: Vehicle Details</div>
                                            <table className="w-full text-[10px] border-collapse border border-slate-300 h-[72px]">
                                                <tbody>
                                                    <tr>
                                                        <td className="border p-1 bg-slate-50 font-bold w-[16%]">Reg. No.</td>
                                                        <td className="border p-1 font-mono font-bold w-[34%]">{formData.regMark || 'TBC'}</td>
                                                        <td className="border p-1 bg-slate-50 font-bold w-[16%]">Make/Model</td>
                                                        <td className="border p-1 w-[34%]">{formData.make} {formData.model}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border p-1 bg-slate-50 font-bold">Chassis No.</td>
                                                        <td className="border p-1 font-mono">{formData.chassisNo || 'TBC'}</td>
                                                        <td className="border p-1 bg-slate-50 font-bold">Engine No.</td>
                                                        <td className="border p-1 font-mono">{formData.engineNo || 'TBC'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border p-1 bg-slate-50 font-bold">Year</td>
                                                        <td className="border p-1">{formData.year}</td>
                                                        <td className="border p-1 bg-slate-50 font-bold">Color (Ext/Int)</td>
                                                        <td className="border p-1">{formData.color || '-'} / {formData.colorInterior || '-'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border p-1 bg-slate-50 font-bold">Mileage</td>
                                                        <td className="border p-1">{formData.mileage ? `${Number(formData.mileage).toLocaleString()} km` : '-'}</td>
                                                        <td className="border p-1 bg-slate-50 font-bold">Engine Cap.</td>
                                                        <td className="border p-1">{formData.engineSize ? `${formData.engineSize} cc` : '-'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border p-1 bg-slate-50 font-bold">Transmission</td>
                                                        <td className="border p-1">{formData.transmission === 'Manual' ? 'Manual (手波)' : (formData.transmission === 'Automatic' ? 'Auto (自動波)' : '-')}</td>
                                                        <td className="border p-1 bg-slate-50 font-bold">Seat / Prev.</td>
                                                        <td className="border p-1">{formData.seat || '-'} 座 / {formData.previousOwners || '0'} 手</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* ★★★ 車輛縮圖區 (最多5張) ★★★ */}
                                    {formData.contractPhotos.length > 0 && (
                                        <div className="mb-3">
                                            <div className="bg-slate-100 border border-slate-200 rounded-lg p-1.5 flex gap-2 justify-center items-center">
                                                {formData.contractPhotos.map((url: string, idx: number) => (
                                                    <div key={idx} className="w-[36mm] h-[25mm] rounded-md overflow-hidden border border-slate-300 bg-white shadow-sm flex-shrink-0">
                                                        <img src={url} className="w-full h-full object-cover" alt="car-thumb" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {hasOrderDetails && (
                                        <div className="mb-3 break-inside-avoid">
                                            <div className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 uppercase mb-1">Part C: Order & Shipping Details (訂購與運輸明細)</div>
                                            <table className="w-full text-[10px] border-collapse border border-slate-300">
                                                <tbody>
                                                    <tr>
                                                        <td className="border p-1.5 bg-slate-50 font-bold w-[20%]">Order Type (類別)</td>
                                                        <td className="border p-1.5 w-[30%]">{formData.orderType === 'Overseas' ? `Overseas 境外訂購 (${formData.overseasCountry})` : 'Local 本地訂購'}</td>
                                                        <td className="border p-1.5 bg-slate-50 font-bold w-[20%] text-blue-800">Est. Arrival (ETA)</td>
                                                        <td className="border p-1.5 w-[30%] font-mono font-bold text-blue-700">{etaDisplay}</td>
                                                    </tr>
                                                    {formData.orderType === 'Overseas' && (
                                                        <>
                                                            <tr><td colSpan={4} className="border p-1.5 bg-slate-100 font-bold text-center">Estimated Overseas Charges (預估當地費用)</td></tr>
                                                            <tr>
                                                                <td colSpan={3} className="border p-1.5 text-slate-600">
                                                                    <span className="font-bold text-slate-800">Included (包含項目):</span> {' '}
                                                                    {[{k:'chk_ov_local', l:'當地人費用'}, {k:'chk_ov_auction', l:'拍賣手續'}, {k:'chk_ov_shipping', l:'運輸'}, {k:'chk_ov_ins', l:'保險'}, {k:'chk_ov_tax', l:'稅金'}, {k:'chk_ov_doc', l:'文件費'}, {k:'chk_ov_misc', l:'雜費'}].filter(opt => (formData as any)[opt.k]).map(opt => opt.l).join(', ') || 'N/A'}
                                                                </td>
                                                                <td className="border p-1.5 font-mono text-right font-bold">{formatCurrency(ovFee)}</td>
                                                            </tr>
                                                            <tr><td colSpan={4} className="border p-1.5 bg-slate-100 font-bold text-center">Estimated Local Charges (預估到港本地費用)</td></tr>
                                                            <tr>
                                                                <td colSpan={3} className="border p-1.5 text-slate-600">
                                                                    <span className="font-bold text-slate-800">Included (包含項目):</span> {' '}
                                                                    {[{k:'chk_hk_tax', l:'政府稅金'}, {k:'chk_hk_emissions', l:'環保'}, {k:'chk_hk_insp', l:'驗車'}, {k:'chk_hk_reg', l:'出牌文件'}, {k:'chk_hk_ins', l:'保險'}, {k:'chk_hk_misc', l:'雜費'}].filter(opt => (formData as any)[opt.k]).map(opt => opt.l).join(', ') || 'N/A'}
                                                                </td>
                                                                <td className="border p-1.5 font-mono text-right font-bold">{formatCurrency(hkFee)}</td>
                                                            </tr>
                                                        </>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    <div className="mb-3 break-inside-avoid">
                                            <div className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 uppercase mb-1">{partPaymentLabel}</div>
                                            <table className="w-full text-[10px] border-collapse border border-slate-300">
                                                <tbody>
                                                    <tr>
                                                        <td className="border p-1.5 font-bold w-1/2">{formData.orderType === 'Overseas' ? 'Overseas & Local Charges (海外與本地總費用)' : 'Vehicle Price (車價)'}</td>
                                                        <td className="border p-1.5 text-right font-mono font-bold">{formatCurrency(basePrice)}</td>
                                                    </tr>
                                                    
                                                    {docItems.filter(i=>i.isSelected).map((item, i) => (
                                                        <tr key={i} className="border-b">
                                                            <td className="border p-1.5 text-slate-600 pl-4">+ {item.desc} {item.isFree ? <span className="font-bold text-slate-400">(贈送 F.O.C.)</span> : ''}</td>
                                                            <td className="border p-1.5 text-right font-mono">{item.isFree ? 'F.O.C.' : formatCurrency(item.amount)}</td>
                                                        </tr>
                                                    ))}

                                                    {depositItems.map((item, idx) => (
                                                        <tr key={`dep-${idx}`} className="border-b">
                                                            <td className="border p-1.5 font-bold text-slate-600">Less: {item.label}</td>
                                                            <td className="border p-1.5 text-right font-mono text-blue-600">{formatCurrency(item.amount)}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-slate-50 font-bold"><td className="border p-1.5 text-right">Balance Due (餘額)</td><td className="border p-1.5 text-right font-mono text-sm text-red-600">{formatCurrency(balance)}</td></tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                ) : (
                                    /* Invoice / Receipt 佈局 */
                                    <table className="w-full text-[10px] border-collapse mb-6">
                                        <thead><tr className="bg-slate-800 text-white"><th className="p-2 text-left">Description</th><th className="p-2 text-right">Amount</th></tr></thead>
                                        <tbody>
                                            <tr className="border-b">
                                                <td className="p-2 font-medium">{formData.orderType === 'Overseas' ? 'Overseas & Local Charges (海外與本地總費用)' : `Vehicle Price (${formData.make} ${formData.model})`}</td>
                                                <td className="p-2 text-right font-mono font-bold">{formatCurrency(basePrice)}</td>
                                            </tr>

                                            {docItems.filter(i=>i.isSelected).map((item, i) => (
                                                <tr key={i} className="border-b">
                                                    <td className="p-2 font-medium text-slate-600 pl-4">+ {item.desc} {item.isFree ? <span className="font-bold text-slate-400">(贈送 F.O.C.)</span> : ''}</td>
                                                    <td className="p-2 text-right font-mono">{item.isFree ? 'F.O.C.' : formatCurrency(item.amount)}</td>
                                                </tr>
                                            ))}

                                            {depositItems.map((item, idx) => (
                                                <tr key={`dep-${idx}`} className="border-b">
                                                    <td className="p-2 font-bold text-slate-600">Less: {item.label}{selectedDocType === 'receipt' && idx === depositItems.length - 1 && <span className="ml-2 text-gray-400 font-normal">[{formData.paymentMethod}]</span>}</td>
                                                    <td className="p-2 text-right font-mono text-blue-600">{formatCurrency(item.amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-50 font-bold text-xs border-t-2 border-slate-800"><td className="p-2 text-right">Balance Due (餘額)</td><td className="p-2 text-right font-mono text-sm text-red-600">{formatCurrency(balance)}</td></tr>
                                    </tfoot>
                                </table>
                            )}

                            {selectedDocType === 'receipt' && (
                                <div className="mb-4 p-2 bg-slate-50 border border-slate-200 rounded text-[10px]">
                                    <span className="font-bold">Payment Method:</span> {formData.paymentMethod}
                                </div>
                            )}

                            {!isBill && showTerms && (
                                <div className="mb-4 p-2 border border-slate-300 bg-gray-50 text-[8px] leading-relaxed text-justify font-serif break-inside-avoid">
                                    {isQuotation ? (
                                        <>
                                            <p className="mb-1"><span className="font-bold">VALIDITY:</span> This quotation is valid for 14 days from the date of issue. Prices and ETA are subject to change without prior notice due to exchange rate fluctuations and overseas shipping schedules.</p>
                                            <p><span className="font-bold">注意事項：</span> 本報價單有效期為發出日起計 14 天。因海外匯率波動及船期變更，預計費用及到港時間 (ETA) 或會於未經事先通知下作適度調整。</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="mb-1">I, <b>{formData.customerName || '___________'}</b>, agree to purchase the vehicle at HKD <b>{formatCurrency(balance + deposit)}</b> on <b>{formData.deliveryDate || '___________'}</b> at <b>{formData.handoverTime || '_______'}</b>. Responsibilities transfer at this time.</p>
                                        </>
                                  )}
                                </div>
                            )}

                            {formData.remarks && (
                                <div className="mb-4 border border-dashed border-slate-300 p-2 bg-slate-50 rounded break-inside-avoid">
                                    <p className="text-[9px] font-bold text-slate-500 mb-1">Remarks:</p>
                                    <p className="text-[9px] whitespace-pre-wrap font-mono leading-tight">{formData.remarks}</p>
                                </div>
                            )}
                        </div>

                        {/* Signature */}
                        <div className="mt-auto">
                            <div className="grid grid-cols-2 gap-12 mt-8 break-inside-avoid">
                                <div className="pt-12 border-t border-slate-800 text-center relative">
                                    {showStampAndSig && (
                                        <>
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 scale-75 opacity-50"><CompanyStamp nameEn={formData.companyNameEn} nameCh={formData.companyNameCh}/></div>
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2"><SignatureImg /></div>
                                        </>
                                    )}
                                    <p className="font-bold text-[8px] uppercase mt-6">For {formData.companyNameEn}</p>
                                </div>
                                <div className="pt-12 border-t border-slate-800 text-center">
                                    <p className="font-bold text-[8px] uppercase mt-6">{isQuotation ? "Client Confirmation (客戶確認)" : "Customer Signature"}</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
