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
}: any) { // ★ 放寬型別，徹底解決編譯衝突
    const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
    const [docHistory, setDocHistory] = useState<any[]>([]);
    const [mobileStep, setMobileStep] = useState<'list' | 'edit' | 'preview'>('list');
    
    const [docId, setDocId] = useState<string | null>(null);
    const [selectedDocType, setSelectedDocType] = useState('sales_contract');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
    
    // 相片抓取狀態
    const [carPhotos, setCarPhotos] = useState<string[]>([]);
    const [isFetchingPhotos, setIsFetchingPhotos] = useState(false);

    const [formData, setFormData] = useState({
        companyNameEn: COMPANY_INFO?.name_en || 'GOLD LAND AUTO', 
        companyNameCh: COMPANY_INFO?.name_ch || '金田汽車',
        companyAddress: COMPANY_INFO?.address_ch || '', 
        companyPhone: COMPANY_INFO?.phone || '', 
        companyEmail: COMPANY_INFO?.email || '', 
        
        customerName: '', customerId: '', customerAddress: '', customerPhone: '',
        
        // 車輛資料擴增
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

        // 用於合約列印的相片
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

    // 智能抓取車輛相片函數
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

            // 自動預選前 5 張相片 (只限新增單據時)
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
        
        if (doc.formData?.regMark) {
            const invCar = inventory.find(v => v.regMark === doc.formData.regMark);
            if (invCar) {
                setSelectedCarId(invCar.id);
            }
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
            contractPhotos: [] 
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
        
        // ★ 核心修復：這就是那個導致編譯失敗的陣列括號！現在 100% 補齊了！
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
            photos: formData.contractPhotos || [],
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
        openPrintPreview(selectedDocType, dummyVehicle);
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
                                                        <tr key={`dep-${idx}`} className="border-b text-blue-700 bg-blue-50/30">
                                                            <td className="border p-1.5 font-bold pl-4">Less: {item.label}</td>
                                                            <td className="border p-1.5 text-right font-mono font-bold text-[11px]">{formatCurrency(item.amount)}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-red-50/50 font-black">
                                                        <td className="border p-1.5 uppercase text-[11px]">Balance Due (總結餘/尾數)</td>
                                                        <td className="border p-1.5 text-right font-mono text-[13px] text-red-600">{formatCurrency(balance)}</td>
                                                    </tr>
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
                                                <td className="p-2 font-bold text-purple-800">{formData.orderType === 'Overseas' ? 'Overseas & Local Charges (海外與本地總費用)' : `Vehicle Price (${formData.make} ${formData.model})`}</td>
                                                <td className="p-2 text-right font-mono font-bold text-purple-800">{formatCurrency(basePrice)}</td>
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
        );
    };

    // --- Render View ---
    if (viewMode === 'list') {
        return (
            <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center"><FileText className="mr-2"/> 單據紀錄 (Document History)</h2>
                    <button onClick={startNewDoc} className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700 flex items-center shadow-sm transition-transform active:scale-95"><Plus size={16} className="mr-1"/> 開新單據</button>
                </div>
                
                <div className="bg-white p-3 border-b border-slate-200 flex flex-wrap gap-4 items-center shadow-sm z-10">
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-500">類型:</label>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border p-1.5 rounded text-xs font-bold text-slate-700 outline-none bg-slate-50 focus:ring-2 ring-blue-100 cursor-pointer">
                            <option value="All">全部單據</option>
                            <option value="sales_contract">買賣合約</option>
                            <option value="purchase_contract">收車合約</option>
                            <option value="consignment_contract">寄賣合約</option>
                            <option value="quotation">報價單</option> 
                            <option value="invoice">發票</option>
                            <option value="receipt">收據</option>
                        </select>
                    </div>
                    
                    <div className="flex items-center gap-2 relative">
                        <label className="text-[10px] font-bold text-slate-500">搜尋:</label>
                        <div className="relative">
                            <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"/>
                            <input value={docSearchTerm} onChange={e => setDocSearchTerm(e.target.value)} placeholder="全面搜尋..." className="pl-7 pr-2 py-1.5 border rounded text-xs outline-none focus:border-blue-500 w-48 bg-slate-50"/>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg ml-auto">
                        <label className="flex items-center text-[10px] font-bold text-gray-700 cursor-pointer mr-2">
                            <input type="checkbox" checked={isDateFilterEnabled} onChange={(e) => setIsDateFilterEnabled(e.target.checked)} className="mr-1.5 accent-blue-600"/>
                            鎖定區間
                        </label>
                        <div className={`flex items-center gap-1 transition-opacity ${!isDateFilterEnabled ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                            <input type="date" value={filterStartDate} onChange={e => { setFilterStartDate(e.target.value); setIsDateFilterEnabled(true); }} className="border-b border-gray-300 p-0.5 text-xs outline-none bg-transparent cursor-pointer" tabIndex={!isDateFilterEnabled ? -1 : 0}/>
                            <span className="text-gray-400 text-xs">至</span>
                            <input type="date" value={filterEndDate} onChange={e => { setFilterEndDate(e.target.value); setIsDateFilterEnabled(true); }} className="border-b border-gray-300 p-0.5 text-xs outline-none bg-transparent cursor-pointer" tabIndex={!isDateFilterEnabled ? -1 : 0}/>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50/50">
                    {filteredDocHistory.length === 0 ? <div className="text-center text-slate-400 py-10">找不到符合過濾條件的紀錄</div> : (
                        <table className="w-full text-sm text-left border-collapse bg-white shadow-sm">
                            <thead className="bg-slate-100 text-slate-600 border-b sticky top-0 shadow-sm z-10">
                                <tr>
                                    <th className="p-3 w-28">單據日期</th>
                                    <th className="p-3 w-32">單據類型</th>
                                    <th className="p-3">摘要內容</th>
                                    <th className="p-3 text-right w-32">總金額</th>
                                    <th className="p-3 text-right w-24">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDocHistory.map((doc: any) => {
                                    const typeMap: Record<string, string> = {
                                        'sales_contract': '買賣合約', 'purchase_contract': '收車合約',
                                        'consignment_contract': '寄賣合約', 'quotation': '報價單', 'invoice': '發票', 'receipt': '收據'
                                    };
                                    const typeName = typeMap[doc.type] || doc.type;
                                    const summaryText = doc.formData 
                                        ? `${doc.formData.customerName || '無聯絡人'} - ${doc.formData.regMark || '無車牌'} - ${doc.formData.year || ''} ${doc.formData.make || ''} ${doc.formData.model || ''}`
                                        : doc.summary;
                                    
                                    const docDateStr = doc.formData?.docDate || (doc.updatedAt?.toDate ? doc.updatedAt.toDate().toISOString().split('T')[0] : 'N/A');

                                    const price = Number(doc.formData?.price) || 0;
                                    const ovFee = Number(doc.formData?.overseasTotalFee) || 0;
                                    const hkFee = Number(doc.formData?.localTotalFee) || 0;
                                    const orderFeesTotal = doc.formData?.orderType === 'Overseas' ? (ovFee + hkFee) : 0;
                                    const basePrice = doc.formData?.orderType === 'Overseas' ? orderFeesTotal : price;
                                    const extrasTotal = (doc.docItems || []).filter((i:any) => i.isSelected && !i.isFree).reduce((sum:number, i:any) => sum + i.amount, 0);
                                    const totalAmt = basePrice + extrasTotal;

                                    return (
                                        <tr key={doc.id} className="hover:bg-blue-50/50 cursor-pointer text-xs transition-colors" onClick={() => editDoc(doc)}>
                                            <td className="p-3 font-mono text-slate-500">{docDateStr}</td>
                                            <td className="p-3 font-bold text-blue-600">{typeName}</td>
                                            <td className="p-3 text-slate-700">{summaryText}</td>
                                            <td className="p-3 text-right font-mono font-bold text-slate-800 text-sm">{formatCurrency(totalAmt)}</td>
                                            <td className="p-3 text-right">
                                                <button onClick={(e) => { e.stopPropagation(); if(confirm('刪除此單據?')) deleteDocRecord(doc.id); }} className="text-gray-400 hover:text-white hover:bg-red-500 p-1.5 rounded transition-colors"><Trash2 size={14}/></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-100 md:bg-transparent overflow-hidden relative">
            
            <div className="md:hidden bg-white p-2 border-b border-slate-200 flex gap-2 shrink-0">
                <button onClick={() => setMobileStep('list')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center transition-colors ${mobileStep==='list' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-500'}`}><Car size={14} className="mr-1"/> 1. 選車</button>
                <button onClick={() => setMobileStep('edit')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center transition-colors ${mobileStep==='edit' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-500'}`}><Edit size={14} className="mr-1"/> 2. 編輯</button>
                <button onClick={() => setMobileStep('preview')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center transition-colors ${mobileStep==='preview' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-500'}`}><Eye size={14} className="mr-1"/> 3. 預覽</button>
            </div>

            <div className="flex flex-1 md:flex-row h-full gap-4 relative overflow-hidden md:p-0 p-2">
                
                {/* --- 左欄：車輛庫存 --- */}
                <div className={`w-full md:w-1/4 bg-white rounded-xl shadow-sm border border-slate-200 flex-col overflow-hidden ${mobileStep === 'list' ? 'flex' : 'hidden md:flex'}`}>
                    <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                        <button onClick={() => setViewMode('list')} className="p-1.5 hover:bg-white rounded border bg-white shadow-sm transition-transform active:scale-95"><ChevronLeft size={16}/></button>
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜尋庫存車牌/型號..." className="flex-1 px-2 py-1.5 text-xs bg-white border rounded outline-none focus:ring-2 ring-blue-100"/>
                    </div>
                    <div className="p-2 border-b bg-slate-50">
                        <button onClick={handleSelectBlank} className="w-full py-2 text-xs font-bold rounded border border-dashed border-slate-300 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-colors">
                            + 建立空白單據 (Blank)
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {filteredInventory.map(car => (
                            <div key={car.id} onClick={() => handleSelectCar(car)} className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedCarId === car.id ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-200 shadow-sm' : 'bg-white hover:border-blue-200'}`}>
                                <div className="flex justify-between items-start font-bold text-sm mb-1">
                                    <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-mono shadow-sm">{car.regMark || '未出牌'}</span>
                                    <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 border border-slate-200">{car.status}</span>
                                </div>
                                <div className="text-xs text-slate-500 font-medium truncate">{car.year} {car.make} {car.model}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- 中欄：編輯器 --- */}
                <div className={`w-full md:w-[40%] bg-white rounded-xl shadow-sm border border-slate-200 flex-col overflow-hidden ${mobileStep === 'edit' ? 'flex' : 'hidden md:flex'}`}>
                    <div className="p-3 border-b bg-slate-50 flex justify-between items-center shadow-sm z-10">
                        <span className="font-bold text-slate-700 text-sm">{docId ? '✏️ 編輯單據' : '📝 新增單據'}</span>
                        <div className="flex gap-2">
                            <button onClick={saveDocRecord} className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 rounded text-xs font-bold flex items-center shadow-sm active:scale-95 transition-transform hover:bg-slate-50"><Save size={14} className="mr-1"/> 儲存</button>
                            <button onClick={handlePrint} className="px-5 py-1.5 bg-slate-800 text-white rounded text-xs font-bold flex items-center shadow-md active:scale-95 transition-transform hover:bg-slate-700"><Printer size={14} className="mr-1"/> 列印</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-1 bg-slate-100 p-1 rounded-lg">
                            {[{id:'sales_contract',l:'賣車'}, {id:'purchase_contract',l:'收車'}, {id:'consignment_contract',l:'寄賣'}, {id:'quotation',l:'報價單'}, {id:'invoice',l:'發票'}, {id:'receipt',l:'收據'}].map(t=>(
                                <button key={t.id} onClick={()=>setSelectedDocType(t.id)} className={`py-1.5 rounded text-[10px] font-bold transition-all ${selectedDocType===t.id?'bg-white shadow-sm text-blue-700':'text-slate-500 hover:bg-slate-200'}`}>{t.l}</button>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                <div className="text-[10px] font-bold text-blue-600 mb-2 uppercase tracking-wider">客戶資料 (Client)</div>
                                <input name="customerName" value={formData.customerName} onChange={handleChange} placeholder="姓名 / 公司名稱" className="w-full text-sm border-b mb-2 bg-transparent font-bold outline-none focus:border-blue-400"/>
                                <div className="flex gap-3"><input name="customerPhone" value={formData.customerPhone} onChange={handleChange} placeholder="電話" className="flex-1 text-xs border-b bg-transparent outline-none focus:border-blue-400 font-mono"/><input name="customerId" value={formData.customerId} onChange={handleChange} placeholder="身份證/BR" className="flex-1 text-xs border-b bg-transparent outline-none focus:border-blue-400 font-mono"/></div>
                                <input name="customerAddress" value={formData.customerAddress} onChange={handleChange} placeholder="地址" className="w-full text-xs border-b mt-2 bg-transparent outline-none focus:border-blue-400"/>
                            </div>
                            
                            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                <div className="text-[10px] font-bold text-indigo-600 mb-2 uppercase tracking-wider">單據與交易日期 (Dates)</div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[9px] text-indigo-500 mb-1 font-bold">單據日期 (Doc Date)</label>
                                        <input type="date" name="docDate" value={formData.docDate} onChange={handleChange} className="w-full text-xs border rounded-md p-1.5 bg-white outline-none font-bold text-indigo-700 shadow-sm cursor-pointer"/>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] text-indigo-500 mb-1 font-bold">交車日期 (Delivery)</label>
                                        <input type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleChange} className="w-full text-xs border rounded-md p-1.5 bg-white outline-none text-slate-700 shadow-sm cursor-pointer"/>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] text-indigo-500 mb-1 font-bold">交車時間 (Time)</label>
                                        <input type="time" name="handoverTime" value={formData.handoverTime} onChange={handleChange} className="w-full text-xs border rounded-md p-1.5 bg-white outline-none text-slate-700 shadow-sm cursor-pointer"/>
                                    </div>
                                </div>
                            </div>

                            {(selectedDocType === 'quotation' || selectedDocType === 'sales_contract') && (
                                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 mb-3 animate-fade-in">
                                    <div className="text-[10px] font-bold text-purple-700 mb-2 uppercase tracking-wider">訂購車輛資訊 (Order Details)</div>
                                    <div className="flex gap-2 mb-2">
                                        <select name="orderType" value={formData.orderType || 'None'} onChange={handleChange} className="text-xs p-1.5 border rounded outline-none flex-1 font-bold text-purple-800 bg-white shadow-sm cursor-pointer">
                                            <option value="None">無 / 現貨 (In Stock)</option>
                                            <option value="Local">本地訂購 (Local Order)</option>
                                            <option value="Overseas">海外訂購 (Overseas Order)</option>
                                        </select>
                                        {formData.orderType === 'Overseas' && (
                                            <select name="overseasCountry" value={formData.overseasCountry || 'Japan'} onChange={handleChange} className="text-xs p-1.5 border rounded outline-none flex-1 font-bold text-purple-800 bg-white shadow-sm cursor-pointer">
                                                <option value="Japan">日本 (Japan)</option>
                                                <option value="UK">英國 (UK)</option>
                                                <option value="Other">其他 (Other)</option>
                                            </select>
                                        )}
                                    </div>
                                    
                                    {formData.orderType === 'Overseas' && (
                                        <div className="space-y-3 mt-3 pt-3 border-t border-purple-200">
                                            <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-sm">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-bold text-purple-700">{formData.overseasCountry === 'Japan' ? '日本' : '海外'}當地費用包含：</span>
                                                    <div className="flex items-center gap-1 bg-purple-50 px-2 py-1 rounded">
                                                        <span className="text-[10px] font-bold text-purple-500">總額 $</span>
                                                        <input name="overseasTotalFee" type="number" value={formData.overseasTotalFee} onChange={handleChange} placeholder="0" className="w-20 p-1 bg-transparent border-b border-purple-300 outline-none text-right font-mono font-bold text-purple-800 text-xs focus:ring-1 ring-purple-400"/>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {[{k:'chk_ov_local', l:'當地人費用'}, {k:'chk_ov_auction', l:'拍賣手續'}, {k:'chk_ov_shipping', l:'運輸'}, {k:'chk_ov_ins', l:'保險'}, {k:'chk_ov_tax', l:'稅金'}, {k:'chk_ov_doc', l:'文件費'}, {k:'chk_ov_misc', l:'雜費'}].map(opt => (
                                                        <label key={opt.k} className="flex items-center text-[10px] text-slate-600 cursor-pointer hover:bg-slate-50 px-1 rounded">
                                                            <input type="checkbox" checked={(formData as any)[opt.k]} onChange={e => setFormData({...formData, [opt.k]: e.target.checked})} className="mr-1.5 accent-purple-600"/>{opt.l}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-sm">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-bold text-purple-700">香港到港費用包含：</span>
                                                    <div className="flex items-center gap-1 bg-purple-50 px-2 py-1 rounded">
                                                        <span className="text-[10px] font-bold text-purple-500">總額 $</span>
                                                        <input name="localTotalFee" type="number" value={formData.localTotalFee} onChange={handleChange} placeholder="0" className="w-20 p-1 bg-transparent border-b border-purple-300 outline-none text-right font-mono font-bold text-purple-800 text-xs focus:ring-1 ring-purple-400"/>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {[{k:'chk_hk_tax', l:'政府稅金'}, {k:'chk_hk_emissions', l:'環保'}, {k:'chk_hk_insp', l:'驗車'}, {k:'chk_hk_reg', l:'出牌文件'}, {k:'chk_hk_ins', l:'保險'}, {k:'chk_hk_misc', l:'雜費'}].map(opt => (
                                                        <label key={opt.k} className="flex items-center text-[10px] text-slate-600 cursor-pointer hover:bg-slate-50 px-1 rounded">
                                                            <input type="checkbox" checked={(formData as any)[opt.k]} onChange={e => setFormData({...formData, [opt.k]: e.target.checked})} className="mr-1.5 accent-purple-600"/>{opt.l}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {(formData.orderType === 'Overseas' || formData.orderType === 'Local') && (
                                        <div className="mt-2 flex gap-2 items-end">
                                            <div className="flex-1">
                                                <label className="text-[9px] text-purple-600 block mb-0.5 font-bold">預計船運/交車時間 (ETA)</label>
                                                <div className="flex bg-white rounded border border-purple-200 overflow-hidden shadow-sm">
                                                    <select name="etaFormat" value={formData.etaFormat || 'date'} onChange={handleChange} className="text-xs p-1.5 border-r border-purple-200 outline-none font-bold text-purple-800 bg-slate-50 cursor-pointer">
                                                        <option value="date">日期 (Date)</option>
                                                        <option value="days">日數 (Days)</option>
                                                    </select>
                                                    {formData.etaFormat === 'days' ? (
                                                        <div className="flex flex-1 items-center px-2">
                                                            <input name="etaDays" type="number" value={formData.etaDays || ''} onChange={handleChange} className="w-full text-xs outline-none text-purple-800 font-bold bg-transparent" placeholder="例如: 30"/>
                                                            <span className="text-[10px] text-slate-500 whitespace-nowrap ml-1 font-bold">天 (Days)</span>
                                                        </div>
                                                    ) : (
                                                        <input name="etaDate" type="date" value={formData.etaDate || ''} onChange={handleChange} className="flex-1 w-full p-1.5 text-xs outline-none text-purple-800 font-bold bg-transparent cursor-pointer"/>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                                <div className="text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-wider">車輛基本資料 (Vehicle Data)</div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="relative"><span className="absolute top-2 left-2 text-[8px] text-slate-400 font-bold uppercase">Reg Mark</span><input name="regMark" value={formData.regMark} onChange={handleChange} className="w-full border rounded-lg pt-5 pb-1.5 px-2 bg-white text-sm font-bold font-mono outline-none focus:ring-1 ring-blue-300"/></div>
                                    <div className="relative"><span className="absolute top-2 left-2 text-[8px] text-slate-400 font-bold uppercase">Year</span><input name="year" value={formData.year} onChange={handleChange} className="w-full border rounded-lg pt-5 pb-1.5 px-2 bg-white text-sm font-bold font-mono outline-none focus:ring-1 ring-blue-300"/></div>
                                </div>
                                <div className="relative mb-3"><span className="absolute top-2 left-2 text-[8px] text-slate-400 font-bold uppercase">Make (廠牌)</span><input name="make" value={formData.make} onChange={handleChange} className="w-full border rounded-lg pt-5 pb-1.5 px-2 bg-white text-sm font-bold outline-none focus:ring-1 ring-blue-300"/></div>
                                <div className="relative mb-3"><span className="absolute top-2 left-2 text-[8px] text-slate-400 font-bold uppercase">Model (型號)</span><input name="model" value={formData.model} onChange={handleChange} className="w-full border rounded-lg pt-5 pb-1.5 px-2 bg-white text-sm font-bold outline-none focus:ring-1 ring-blue-300"/></div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="relative"><span className="absolute top-2 left-2 text-[8px] text-slate-400 font-bold uppercase">Color Ext.</span><input name="color" value={formData.color} onChange={handleChange} className="w-full border rounded-lg pt-5 pb-1.5 px-2 bg-white text-sm font-bold outline-none focus:ring-1 ring-blue-300"/></div>
                                    <div className="relative"><span className="absolute top-2 left-2 text-[8px] text-slate-400 font-bold uppercase">Color Int.</span><input name="colorInterior" value={formData.colorInterior || ''} onChange={handleChange} className="w-full border rounded-lg pt-5 pb-1.5 px-2 bg-white text-sm font-bold outline-none focus:ring-1 ring-blue-300"/></div>
                                </div>
                                
                                {/* ★ 擴增車輛資料填寫區 */}
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="relative"><span className="absolute top-2 left-2 text-[8px] text-slate-400 font-bold uppercase">Engine Cap (容積)</span><input name="engineSize" value={formData.engineSize} onChange={handleChange} placeholder="cc" className="w-full border rounded-lg pt-5 pb-1.5 px-2 bg-white text-[10px] font-mono font-bold outline-none focus:ring-1 ring-blue-300"/></div>
                                    <div className="relative"><span className="absolute top-2 left-2 text-[8px] text-slate-400 font-bold uppercase">Mileage (里數)</span><input name="mileage" value={formData.mileage} onChange={handleChange} placeholder="km" className="w-full border rounded-lg pt-5 pb-1.5 px-2 bg-white text-[10px] font-mono font-bold outline-none focus:ring-1 ring-blue-300"/></div>
                                </div>
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                    <div className="relative"><span className="absolute top-2 left-2 text-[8px] text-slate-400 font-bold uppercase">Transmission</span>
                                        <select name="transmission" value={formData.transmission} onChange={handleChange} className="w-full border rounded-lg pt-5 pb-1.5 px-2 bg-white text-[10px] font-bold outline-none focus:ring-1 ring-blue-300 cursor-pointer">
                                            <option value="Automatic">Auto</option><option value="Manual">Manual</option>
                                        </select>
                                    </div>
                                    <div className="relative"><span className="absolute top-2 left-2 text-[8px] text-slate-400 font-bold uppercase">Seating</span><input name="seat" value={formData.seat} onChange={handleChange} className="w-full border rounded-lg pt-5 pb-1.5 px-2 bg-white text-[10px] font-bold outline-none focus:ring-1 ring-blue-300 text-center"/></div>
                                    <div className="relative"><span className="absolute top-2 left-2 text-[8px] text-slate-400 font-bold uppercase">Prev Owners</span><input name="previousOwners" value={formData.previousOwners} onChange={handleChange} className="w-full border rounded-lg pt-5 pb-1.5 px-2 bg-white text-[10px] font-bold outline-none focus:ring-1 ring-blue-300 text-center"/></div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative"><span className="absolute top-2 left-2 text-[8px] text-slate-400 font-bold uppercase">Chassis No.</span><input name="chassisNo" value={formData.chassisNo} onChange={handleChange} className="w-full border rounded-lg pt-5 pb-1.5 px-2 bg-white text-[10px] font-mono font-bold outline-none focus:ring-1 ring-blue-300"/></div>
                                    <div className="relative"><span className="absolute top-2 left-2 text-[8px] text-slate-400 font-bold uppercase">Engine No.</span><input name="engineNo" value={formData.engineNo} onChange={handleChange} className="w-full border rounded-lg pt-5 pb-1.5 px-2 bg-white text-[10px] font-mono font-bold outline-none focus:ring-1 ring-blue-300"/></div>
                                </div>
                            </div>

                            {/* ★★★ 相片縮圖選取區 ★★★ */}
                            <div className="p-3 bg-white rounded-xl border border-slate-300 shadow-sm mt-3">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-[10px] font-bold text-slate-600">單據相片 (點擊選取，最多選5張)</div>
                                    <button 
                                        type="button" 
                                        onClick={() => fetchVehiclePhotos(selectedCarId || '')} 
                                        disabled={!selectedCarId || isFetchingPhotos}
                                        className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 flex items-center font-bold transition-colors disabled:opacity-50"
                                    >
                                        <RefreshCw size={10} className={`mr-1 ${isFetchingPhotos ? 'animate-spin' : ''}`}/> 
                                        從圖庫同步
                                    </button>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                                    {carPhotos.map((url, idx) => {
                                        const isSelected = formData.contractPhotos?.includes(url);
                                        return (
                                            <div 
                                                key={idx} 
                                                onClick={() => {
                                                    let newPhotos = [...(formData.contractPhotos || [])];
                                                    if (isSelected) newPhotos = newPhotos.filter(p => p !== url);
                                                    else if (newPhotos.length < 5) newPhotos.push(url);
                                                    else alert("最多只能選擇 5 張相片");
                                                    setFormData({...formData, contractPhotos: newPhotos});
                                                }} 
                                                className={`relative w-20 h-14 rounded-lg border-2 cursor-pointer flex-shrink-0 transition-all ${isSelected ? 'border-blue-500 shadow-md scale-100' : 'border-transparent opacity-50 hover:opacity-80 scale-95'}`}
                                            >
                                                <img src={url} className="w-full h-full object-cover rounded-md" />
                                                {isSelected && <div className="absolute top-0 right-0 bg-blue-500 text-white rounded-bl-lg p-0.5"><Check size={12}/></div>}
                                            </div>
                                        )
                                    })}
                                    {carPhotos.length === 0 && <div className="text-xs text-gray-400 py-4 w-full text-center bg-slate-50 rounded-lg border border-dashed">請先選擇上方關聯車輛，或點擊同步</div>}
                                </div>
                            </div>

                            <div className="p-3 bg-yellow-50/50 rounded-xl border border-yellow-200 mb-3">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider">交易金額與收款 (Payment)</div>
                                    <div className="flex gap-3">
                                        <label className="flex items-center text-[10px] cursor-pointer text-slate-500 font-bold hover:text-slate-700">
                                            <input type="checkbox" checked={showStampAndSig} onChange={e => setShowStampAndSig(e.target.checked)} className="mr-1.5 accent-yellow-600"/>印章與簽名
                                        </label>
                                        <label className="flex items-center text-[10px] cursor-pointer text-slate-500 font-bold hover:text-slate-700">
                                            <input type="checkbox" checked={showTerms} onChange={e => setShowTerms(e.target.checked)} className="mr-1.5 accent-yellow-600"/>法律條款
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-3">
                                    {depositItems.map((item, idx) => (
                                        <div key={item.id} className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-yellow-100 shadow-sm">
                                            <input value={item.label} onChange={(e) => { const newArr = [...depositItems]; newArr[idx].label = e.target.value; setDepositItems(newArr); }} className="flex-1 text-[11px] font-bold bg-transparent border-b border-dashed border-yellow-300 outline-none text-slate-700 focus:border-yellow-500 px-1" />
                                            <span className="text-xs font-bold text-slate-400">$</span>
                                            <input type="number" value={item.amount} onChange={(e) => { const newArr = [...depositItems]; newArr[idx].amount = Number(e.target.value); setDepositItems(newArr); }} className="w-24 bg-white border border-yellow-200 rounded px-1 text-right text-xs text-blue-600 font-bold outline-none focus:ring-2 ring-yellow-400" />
                                            <button type="button" onClick={() => setDepositItems(prev => prev.filter(i => i.id !== item.id))} className="text-yellow-400 hover:text-red-500"><X size={12}/></button>
                                        </div>
                                    ))}
                                </div>

                                <div className="text-right mb-3">
                                    <button type="button" onClick={() => setDepositItems([...depositItems, { id: Date.now().toString(), label: selectedDocType === 'receipt' ? 'Payment (本次收款)' : 'Deposit (訂金)', amount: 0 }])} className="text-[10px] font-bold bg-white text-yellow-700 px-3 py-1.5 rounded-lg border border-yellow-200 hover:bg-yellow-100 shadow-sm active:scale-95 transition-transform">
                                        <Plus size={12} className="inline mr-1"/>新增收款欄位
                                    </button>
                                </div>

                                {selectedDocType === 'receipt' && (
                                    <div className="pt-3 border-t border-yellow-200 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-yellow-800">收款方式:</span>
                                        <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="text-xs p-1.5 rounded-lg border border-yellow-300 bg-white font-bold text-slate-700 outline-none shadow-sm cursor-pointer">
                                            <option value="Cheque">支票 (Cheque)</option>
                                            <option value="Transfer">銀行轉帳 (Transfer)</option>
                                            <option value="Cash">現金 (Cash)</option>
                                            <option value="USDT">USDT (泰達幣)</option>
                                            <option value="Trade-in">對數 (Trade-in)</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="p-3 bg-green-50/50 rounded-xl border border-green-100">
                                <div className="text-[10px] font-bold text-green-700 mb-3 flex justify-between uppercase tracking-wider">
                                    <span>額外收費項目 (Add-ons)</span><span className="text-green-500/70">請勾選納入單據</span>
                                </div>
                                <div className="space-y-2 mb-3">
                                    {docItems.map((item) => (
                                        <div key={item.id} className="flex items-center text-xs bg-white p-2 rounded-lg border border-green-100 shadow-sm transition-all">
                                            <input type="checkbox" checked={item.isSelected} onChange={() => toggleItem(item.id)} className="mr-2 accent-green-600 w-4 h-4 cursor-pointer"/>
                                            <input value={item.desc} onChange={(e) => { const newDesc = e.target.value; setDocItems(prev => prev.map(i => i.id === item.id ? { ...i, desc: newDesc } : i)); }} className={`flex-1 bg-transparent outline-none font-bold focus:border-b border-blue-300 mr-2 ${item.isFree ? 'text-slate-400 line-through' : 'text-slate-700'}`} />
                                            
                                            <label className="flex items-center text-[10px] cursor-pointer text-green-700 font-bold mr-2 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                                                <input type="checkbox" checked={item.isFree || false} onChange={() => {
                                                    setDocItems(prev => prev.map(i => i.id === item.id ? { ...i, isFree: !i.isFree } : i));
                                                }} className="mr-1 accent-green-600"/>贈送
                                            </label>

                                            <span className="font-mono font-bold mx-1 text-slate-400">$</span>
                                            <input type="number" value={item.amount} onChange={(e) => { const newAmt = Number(e.target.value); setDocItems(prev => prev.map(i => i.id === item.id ? { ...i, amount: newAmt } : i)); }} className={`w-20 bg-transparent outline-none focus:border-b border-blue-300 text-right font-mono font-black ${item.isFree ? 'text-slate-300' : 'text-slate-800'}`} disabled={item.isFree} />
                                            <button type="button" onClick={() => deleteItem(item.id)} className="text-gray-400 hover:text-white hover:bg-red-500 p-1.5 rounded-md ml-2 transition-colors"><X size={14}/></button>
                                        </div>
                                    ))}
                                    {docItems.length === 0 && <div className="text-gray-400 text-xs text-center italic py-4 border border-dashed rounded-lg">無額外項目</div>}
                                </div>
                                <div className="flex gap-2 pt-3 border-t border-green-200">
                                    <input value={newItemDesc} onChange={e=>setNewItemDesc(e.target.value)} placeholder="新增項目 (如: 代辦費)..." className="flex-1 text-xs border rounded-lg p-2 outline-none focus:ring-2 ring-green-200"/>
                                    <input type="number" value={newItemAmount} onChange={e=>setNewItemAmount(e.target.value)} placeholder="$ 金額" className="w-20 text-xs border rounded-lg p-2 outline-none font-mono text-right focus:ring-2 ring-green-200"/>
                                    <button type="button" onClick={addItem} className="bg-green-600 text-white px-3 rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm active:scale-95 transition-transform"><Plus size={16}/></button>
                                </div>
                            </div>

                            <div className="p-3 bg-white rounded border border-slate-300">
                                <div className="text-[10px] font-bold text-slate-600 mb-2">隨車附件</div>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <label className="flex items-center text-xs cursor-pointer"><input type="checkbox" checked={checklist.vrd} onChange={e=>setChecklist({...checklist, vrd: e.target.checked})} className="mr-1 accent-slate-600"/> 牌薄</label>
                                    <label className="flex items-center text-xs cursor-pointer"><input type="checkbox" checked={checklist.keys} onChange={e=>setChecklist({...checklist, keys: e.target.checked})} className="mr-1 accent-slate-600"/> 後備匙</label>
                                    <label className="flex items-center text-xs cursor-pointer"><input type="checkbox" checked={checklist.tools} onChange={e=>setChecklist({...checklist, tools: e.target.checked})} className="mr-1 accent-slate-600"/> 工具</label>
                                    <label className="flex items-center text-xs cursor-pointer"><input type="checkbox" checked={checklist.manual} onChange={e=>setChecklist({...checklist, manual: e.target.checked})} className="mr-1 accent-slate-600"/> 說明書</label>
                                </div>
                                <input value={checklist.other} onChange={e=>setChecklist({...checklist, other: e.target.value})} placeholder="其他附件..." className="w-full text-xs border-b border-slate-200 outline-none focus:border-blue-400 p-2 mb-3"/>
                                
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">備註 (Remarks) / 銀行轉帳資料</label>
                                <textarea name="remarks" value={formData.remarks} onChange={handleChange} className="w-full h-28 text-xs border rounded-lg p-3 bg-slate-50 resize-none outline-none focus:ring-2 ring-blue-100 font-mono text-slate-700"></textarea>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- 右欄：即時預覽 --- */}
                <div className={`flex-1 bg-slate-200/80 rounded-xl border border-slate-300 flex flex-col overflow-hidden items-center justify-center p-4 ${mobileStep === 'preview' ? 'flex' : 'hidden md:flex'}`}>
                    <div className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center bg-white/50 px-3 py-1 rounded-full shadow-sm">
                        <Eye size={12} className="mr-1.5"/> Live Preview 實時預覽
                    </div>
                    <div className="w-full h-full flex justify-center overflow-hidden">
                        <LivePreview />
                    </div>
                </div>
            </div>
        </div>
    );
}
