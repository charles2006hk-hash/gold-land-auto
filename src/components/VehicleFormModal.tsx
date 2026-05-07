// src/components/VehicleFormModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
    ChevronLeft, Car, X, FileText, DollarSign, DownloadCloud, Wrench, Globe, 
    Database, Search, Link, Bell, Eye, Share2, Trash2, User as UserIcon, Check, 
    CalendarDays, MapPin, Loader2, Image as ImageIcon, Edit, ShieldCheck
} from 'lucide-react';
import { query, collection, where, onSnapshot, getDocs } from "firebase/firestore";

// 匯入您的常數與型別
import { COMPANY_INFO, ALL_CB_PORTS, PORTS_HK_GD, PORTS_MO_GD } from '@/config/constants';
import { Vehicle, CrossBorderData, Payment, Expense } from '@/types';
import { compressImage } from '@/utils/imageHelpers';
import { CompanyStamp, SignatureImg } from './DocumentTemplate';

// --- 輔助工具函數 ---
const formatCurrency = (amount: number) => new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', maximumFractionDigits: 0 }).format(amount || 0);

const formatNumberInput = (value: string) => {
  let cleanVal = value.replace(/[^0-9.-]/g, '');
  const isNegative = cleanVal.startsWith('-');
  cleanVal = cleanVal.replace(/-/g, ''); 
  const parts = cleanVal.split('.');
  if (parts.length > 2) cleanVal = parts[0] + '.' + parts.slice(1).join('');
  if (!cleanVal) return isNegative ? '-' : '';
  const [integer, decimal] = cleanVal.split('.');
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return isNegative ? '-' + (decimal !== undefined ? formattedInteger + '.' + decimal : formattedInteger) : (decimal !== undefined ? formattedInteger + '.' + decimal : formattedInteger);
};

const calculateLicenseFee = (fuelType: 'Petrol' | 'Diesel' | 'Electric', engineSize: number) => {
  if (!engineSize) return 0;
  if (fuelType === 'Petrol') {
    if (engineSize <= 1500) return 5074; if (engineSize <= 2500) return 7498;
    if (engineSize <= 3500) return 9929; if (engineSize <= 4500) return 12360; return 14694;
  }
  if (fuelType === 'Diesel') {
    if (engineSize <= 1500) return 6972; if (engineSize <= 2500) return 9396;
    if (engineSize <= 3500) return 11827; if (engineSize <= 4500) return 14258; return 16592;
  }
  if (fuelType === 'Electric') {
    if (engineSize <= 75) return 1614; if (engineSize <= 125) return 2114;
    if (engineSize <= 175) return 2614; if (engineSize <= 225) return 3114; return 5114;
  }
  return 0;
};

const getColorHex = (colorName: string) => {
    if (!colorName) return '#e2e8f0'; 
    const lower = colorName.toLowerCase();
    if (lower.includes('white') || lower.includes('白')) return '#ffffff';
    if (lower.includes('black') || lower.includes('黑')) return '#000000';
    if (lower.includes('silver') || lower.includes('銀')) return '#c0c0c0';
    if (lower.includes('grey') || lower.includes('gray') || lower.includes('灰')) return '#808080';
    if (lower.includes('blue') || lower.includes('藍')) return '#3b82f6';
    if (lower.includes('red') || lower.includes('紅')) return '#ef4444';
    if (lower.includes('gold') || lower.includes('金')) return '#eab308';
    if (lower.includes('green') || lower.includes('綠')) return '#22c55e';
    return '#94a3b8'; 
};

// ============================================================================
// 👇👇👇 第二步：請把 page.tsx 裡面的 const VehicleFormModal = ... 剪下貼在下面 👇👇👇
// ============================================================================
const VehicleFormModal = ({ 
    db, staffId, appId, clients, settings, editingVehicle, setEditingVehicle, activeTab, setActiveTab, saveVehicle, addPayment, deletePayment, addExpense, deleteExpense,
    updateExpenseStatus, addSystemLog, allSalesDocs, onJumpToDoc,
    addSalesAddon = () => {}, deleteSalesAddon = () => {}
    updateSettings, systemUsers, currentUser
}: any) => {
    if (!editingVehicle && activeTab !== 'inventory_add') return null; 
    
    const v = editingVehicle || {} as Partial<Vehicle>;
    const isNew = !v.id; 
    
    const [selectedMake, setSelectedMake] = useState(v.make || '');
    const [currentStatus, setCurrentStatus] = useState<'In Stock' | 'Reserved' | 'Sold' | 'Withdrawn'>(v.status || 'In Stock');
    const [showVrdOverlay, setShowVrdOverlay] = useState(false);
    // ★★★ 升級：智能狀態日期追蹤 ★★★
    const [statusDates, setStatusDates] = useState({
        'In Stock': v.stockInDate || new Date().toISOString().split('T')[0],
        'Reserved': (v as any).reservedDate || '',
        'Sold': v.stockOutDate || '',
        'Withdrawn': (v as any).withdrawnDate || ''
    });

    // 當載入車輛，如果沒有設定已訂/已售日期，智能根據收款記錄推算
    useEffect(() => {
        if (v.id && v.payments && v.payments.length > 0) {
            const sorted = [...v.payments].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setStatusDates(prev => ({
                ...prev,
                'Reserved': prev['Reserved'] || sorted[0].date, // 第一筆錢 = 落訂
                'Sold': prev['Sold'] || sorted[sorted.length - 1].date // 最後一筆錢 = 結清/售出
            }));
        }
    }, [v.id, v.payments]);


    // ★ 終極防跳走：將分頁狀態綁定到 SessionStorage，無論點刷新都唔會彈走！
    const [rightTab, setRightTab] = useState<'vrd' | 'sales' | 'cost' | 'cb' | 'service'>(() => {
        if (typeof window !== 'undefined') return (sessionStorage.getItem('gla_veh_tab') as any) || 'vrd';
        return 'vrd';
    });

    useEffect(() => {
        if (typeof window !== 'undefined') sessionStorage.setItem('gla_veh_tab', rightTab);
    }, [rightTab]);
    
    const [cbEnabled, setCbEnabled] = useState(!!(v.crossBorder?.isEnabled));
    const [isPublic, setIsPublic] = useState(!!v.isPublic); 

    const [acqVendor, setAcqVendor] = useState((v as any).acquisition?.vendor || '');
    const [acqType, setAcqType] = useState<'Local' | 'Import'>((v as any).acquisition?.type || 'Local');
    const [sourceType, setSourceType] = useState<'own' | 'consignment' | 'partner'>(v.sourceType || 'own');
    const [acqForeignPrice, setAcqForeignPrice] = useState(formatNumberInput(String((v as any).acquisition?.foreignPrice || '')));
    const [acqExchangeRate, setAcqExchangeRate] = useState(String((v as any).acquisition?.exchangeRate || '1.0'));
    const [acqLocalChargesForeign, setAcqLocalChargesForeign] = useState(formatNumberInput(String((v as any).acquisition?.localChargesForeign || '')));
    const [acqPortFee, setAcqPortFee] = useState(formatNumberInput(String((v as any).acquisition?.portFee || '')));
    const [acqA1Price, setAcqA1Price] = useState(formatNumberInput(String((v as any).acquisition?.a1Price || '')));
    const [acqFrtTax, setAcqFrtTax] = useState(formatNumberInput(String((v as any).acquisition?.frtTax || '')));
    const [acqCostExclTax, setAcqCostExclTax] = useState('0'); 
    
    const [acqPayments, setAcqPayments] = useState<any[]>((v as any).acquisition?.payments || []);
    const [newAcqPayment, setNewAcqPayment] = useState({ date: new Date().toISOString().split('T')[0], method: 'Transfer', amount: '', note: '' });

    const [priceStr, setPriceStr] = useState(formatNumberInput(String(v.price || '')));
    const [costStr, setCostStr] = useState(formatNumberInput(String(v.costPrice || '')));
    const [mileageStr, setMileageStr] = useState(formatNumberInput(String(v.mileage || '')));
    const [priceA1Str, setPriceA1Str] = useState(formatNumberInput(String(v.priceA1 || '')));
    const [priceTaxStr, setPriceTaxStr] = useState(formatNumberInput(String(v.priceTax || '')));
    const [engineSizeStr, setEngineSizeStr] = useState(formatNumberInput(String(v.engineSize || '')));
    const [fuelType, setFuelType] = useState<'Petrol'|'Diesel'|'Electric'>(v.fuelType || 'Petrol');
    const [transmission, setTransmission] = useState<'Automatic'|'Manual'>(v.transmission || 'Automatic');
    const [autoLicenseFee, setAutoLicenseFee] = useState(v.licenseFee || 0);

    const [carPhotos, setCarPhotos] = useState<string[]>(v.photos || []);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [dragPhotoIdx, setDragPhotoIdx] = useState<number | null>(null);

    const [vrdSearch, setVrdSearch] = useState('');
    const [vrdResults, setVrdResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [vrdOwnerRaw, setVrdOwnerRaw] = useState(''); 

    const cbDateMap: Record<string, string> = { 'HkInsurance': '香港保險', 'ReservedPlate': '留牌紙', 'Br': '商業登記 (BR)', 'LicenseFee': '香港牌費', 'MainlandJqx': '內地交強險', 'MainlandSyx': '內地商業險', 'ClosedRoad': '禁區紙', 'Approval': '批文卡', 'MainlandLicense': '內地行駛證', 'HkInspection': '香港驗車(中港)' };
    const HK_PORTS = ['皇崗', '深圳灣', '蓮塘', '沙頭角', '文錦渡', '港珠澳大橋(港)'];
    const MO_PORTS = ['港珠澳大橋(澳)', '關閘(拱北)', '橫琴', '青茂'];

    const cbFees = (v.crossBorder?.tasks || []).reduce((sum: number, t: any) => sum + (t.fee || 0), 0);
    const totalReceived = (v.payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const totalExpenses = (v.expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const salesAddonsTotal = ((v as any).salesAddons || []).reduce((sum: number, a: any) => sum + (a.isFree ? 0 : (a.amount || 0)), 0);
    
    const currentRealTimePrice = Number(priceStr.replace(/,/g, '')) || 0;
    const totalRevenue = currentRealTimePrice + cbFees + salesAddonsTotal;
    const balance = totalRevenue - totalReceived;

    const pendingCbTasks = (v.crossBorder?.tasks || []).filter((t: any) => (t.fee !== 0) && !(v.payments || []).some((p: any) => p.relatedTaskId === t.id));

    const [newExpense, setNewExpense] = useState({ date: new Date().toISOString().split('T')[0], type: '', company: '', amount: '', status: 'Unpaid', paymentMethod: 'Cash', invoiceNo: '' });
    const [newPayment, setNewPayment] = useState({ date: new Date().toISOString().split('T')[0], type: settings.paymentTypes?.[0] || 'Deposit', amount: '', method: 'Cash', note: '', relatedTaskId: '' });
    const [newAddon, setNewAddon] = useState({ name: '文件費', amount: '' });

   // ★ 新增：維修保養狀態與函數
    const [newMaintenance, setNewMaintenance] = useState({ date: new Date().toISOString().split('T')[0], item: '', vendor: '', cost: '', costStatus: 'Unpaid', charge: '', chargeStatus: 'Unpaid', note: '' });

    // ★ 新增：維修保養的修改(Edit)狀態與函數
    const [editingMaintenanceId, setEditingMaintenanceId] = useState<string | null>(null);
    const [editMaintenanceForm, setEditMaintenanceForm] = useState<any>({});

    // ★ 終極防跳走機制：自給自足嘅安全更新函數，唔依賴外部 props！
    const safeUpdateMaintenance = async (newRecords: any[]) => {
        // 1. 即時更新畫面 (絕對唔會觸發成個組件重新載入)
        setEditingVehicle((prev: any) => prev ? { ...prev, maintenanceRecords: newRecords } : null);
        
        // 2. 靜靜雞寫入資料庫
        if (v.id && db) {
            try {
                const { updateDoc, doc } = await import('firebase/firestore');
                await updateDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory', v.id), {
                    maintenanceRecords: newRecords
                });
            } catch (e) { console.error("更新失敗", e); }
        }
    };

    const handleAddMaintenance = () => {
        const cst = Number(newMaintenance.cost.replace(/,/g, ''));
        const chg = Number(newMaintenance.charge.replace(/,/g, ''));
        if (newMaintenance.item) {
            const obj = { id: Date.now().toString(), ...newMaintenance, cost: cst, charge: chg };
            
            // 呼叫安全更新函數
            safeUpdateMaintenance([...(v.maintenanceRecords || []), obj]);
            
            // ★ 智能記憶：如果輸入了新的維修項目或車房，自動存入系統資料庫下次用！
            if (newMaintenance.item && !settings.expenseTypes.some((t:any) => typeof t === 'string' ? t === newMaintenance.item : t.name === newMaintenance.item)) {
                updateSettings('expenseTypes', [...settings.expenseTypes, newMaintenance.item]);
            }
            if (newMaintenance.vendor && !settings.expenseCompanies.includes(newMaintenance.vendor)) {
                updateSettings('expenseCompanies', [...settings.expenseCompanies, newMaintenance.vendor]);
            }

            setNewMaintenance({ date: new Date().toISOString().split('T')[0], item: '', vendor: '', cost: '', costStatus: 'Unpaid', charge: '', chargeStatus: 'Unpaid', note: '' });
        }
    };
    
    const handleDeleteMaintenance = (id: string) => {
        safeUpdateMaintenance((v.maintenanceRecords || []).filter((m: any) => m.id !== id));
    };
    
    const toggleMaintenanceStatus = (m: any, type: 'costStatus' | 'chargeStatus') => {
        const newStatus = m[type] === 'Paid' ? 'Unpaid' : 'Paid';
        safeUpdateMaintenance((v.maintenanceRecords || []).map((x: any) => x.id === m.id ? { ...x, [type]: newStatus } : x));
    };

    const startEditMaintenance = (m: any) => {
        setEditingMaintenanceId(m.id);
        setEditMaintenanceForm({ ...m, cost: m.cost?.toString() || '0', charge: m.charge?.toString() || '0' });
    };

    const saveEditMaintenance = () => {
        const cst = Number(editMaintenanceForm.cost.replace(/,/g, ''));
        const chg = Number(editMaintenanceForm.charge.replace(/,/g, ''));
        const updated = { ...editMaintenanceForm, cost: cst, charge: chg };
        safeUpdateMaintenance((v.maintenanceRecords || []).map((x: any) => x.id === editingMaintenanceId ? updated : x));
        setEditingMaintenanceId(null);
    };

    // ★★★ 智能雙軌收支管理器 (解決新舊車入數問題) ★★★
    const handleAddPaymentClick = () => {
        const amt = Number(newPayment.amount.replace(/,/g, ''));
        if (amt > 0) {
            const obj = { id: Date.now().toString(), ...newPayment, amount: amt };
            if (v.id) { addPayment(v.id, obj as any); } 
            else { setEditingVehicle((prev: any) => ({ ...prev, payments: [...(prev.payments || []), obj] })); }
            setNewPayment({ ...newPayment, amount: '', note: '', relatedTaskId: '', method: 'Cash' });
        }
    };

    const handleDeletePaymentClick = (pid: string) => {
        if (v.id) deletePayment(v.id, pid);
        else setEditingVehicle((prev: any) => ({ ...prev, payments: (prev.payments || []).filter((p: any) => p.id !== pid) }));
    };

    const handleAddAddonClick = () => {
        const amt = Number(newAddon.amount.replace(/,/g, ''));
        if (amt > 0) {
            const obj = { id: Date.now().toString(), name: newAddon.name, amount: amt };
            if (v.id) addSalesAddon(v.id, obj);
            else setEditingVehicle((prev: any) => ({ ...prev, salesAddons: [...(prev.salesAddons || []), obj] }));
            setNewAddon({ name: '', amount: '' });
        }
    };

    const handleDeleteAddonClick = (aid: string) => {
        if (v.id) deleteSalesAddon(v.id, aid);
        else setEditingVehicle((prev: any) => ({ ...prev, salesAddons: (prev.salesAddons || []).filter((a: any) => a.id !== aid) }));
    };

    const handleAddExpenseClick = () => {
        const amt = Number(newExpense.amount.replace(/,/g, ''));
        if (amt > 0) {
            const obj = { id: Date.now().toString(), ...newExpense, amount: amt };
            if (v.id) addExpense(v.id, obj as any);
            else setEditingVehicle((prev: any) => ({ ...prev, expenses: [...(prev.expenses || []), obj] }));
            setNewExpense({ ...newExpense, amount: '' });
        }
    };

    const handleDeleteExpenseClick = (eid: string) => {
        if (v.id) deleteExpense(v.id, eid);
        else setEditingVehicle((prev: any) => ({ ...prev, expenses: (prev.expenses || []).filter((e: any) => e.id !== eid) }));
    };

    const handleToggleExpenseStatus = (exp: any) => {
        const newStatus = exp.status === 'Paid' ? 'Unpaid' : 'Paid';
        if (v.id) updateExpenseStatus(v.id, exp.id, newStatus);
        else setEditingVehicle((prev: any) => ({ ...prev, expenses: (prev.expenses || []).map((e: any) => e.id === exp.id ? { ...e, status: newStatus } : e) }));
    };
    // ★★★ 結束：智能雙軌管理器 ★★★

    useEffect(() => {
        if (acqType === 'Import') {
            const fp = Number(acqForeignPrice.replace(/,/g, ''));
            const localCharges = Number(acqLocalChargesForeign.replace(/,/g, ''));
            const er = Number(acqExchangeRate);
            const port = Number(acqPortFee.replace(/,/g, ''));
            const a1 = Number(acqA1Price.replace(/,/g, ''));

            const costExcl = Math.round((fp + localCharges) * er) + port;
            setAcqCostExclTax(formatNumberInput(String(costExcl)));

            let frt = 0;
            if (a1 > 0) {
                if (a1 <= 150000) { frt = a1 * 0.46; }
                else if (a1 <= 300000) { frt = 150000 * 0.46 + (a1 - 150000) * 0.86; }
                else if (a1 <= 500000) { frt = 150000 * 0.46 + 150000 * 0.86 + (a1 - 300000) * 1.15; }
                else { frt = 150000 * 0.46 + 150000 * 0.86 + 200000 * 1.15 + (a1 - 500000) * 1.32; }
            }
            setAcqFrtTax(formatNumberInput(String(Math.round(frt))));
            setCostStr(formatNumberInput(String(costExcl + Math.round(frt))));
        }
    }, [acqForeignPrice, acqLocalChargesForeign, acqExchangeRate, acqPortFee, acqA1Price, acqType]);

    const totalAcqPaid = acqPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const acqOffsetAmount = acqType === 'Local' ? Number(String((v as any).acquisition?.offsetAmount || '').replace(/,/g, '')) : 0;
    const acqBalance = Number(costStr.replace(/,/g, '')) - totalAcqPaid - acqOffsetAmount;

    const handleAddAcqPayment = () => {
        const amt = Number(newAcqPayment.amount.replace(/,/g, ''));
        if (amt > 0) {
            setAcqPayments([...acqPayments, { id: Date.now().toString(), ...newAcqPayment, amount: amt }]);
            setNewAcqPayment({ ...newAcqPayment, amount: '', note: '' });
        }
    };
    const handleDeleteAcqPayment = (id: string) => { setAcqPayments(acqPayments.filter(p => p.id !== id)); };

    useEffect(() => { const size = Number(engineSizeStr.replace(/,/g, '')); setAutoLicenseFee(calculateLicenseFee(fuelType, size)); }, [fuelType, engineSizeStr]);
    const calcRegisteredPrice = () => { const a1 = Number(priceA1Str.replace(/,/g, '')) || 0; const tax = Number(priceTaxStr.replace(/,/g, '')) || 0; return formatNumberInput(String(a1 + tax)); };

    useEffect(() => {
        if (!v.id || !db || !staffId) return;
        const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'media_library'), where('status', '==', 'linked'), where('relatedVehicleId', '==', v.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const linkedUrls: string[] = []; let coverUrl = '';
            snapshot.forEach(doc => { const data = doc.data(); if (data.isPrimary) coverUrl = data.url; else linkedUrls.push(data.url); });
            if (coverUrl) linkedUrls.unshift(coverUrl);
            setCarPhotos(Array.from(new Set([...linkedUrls, ...(v.photos || [])])));
        });
        return () => unsubscribe();
    }, [v.id, db, staffId, appId]);

    const handleGoToMediaLibrary = () => { setEditingVehicle(null); setActiveTab('media_center'); };
    const setFieldValue = (name: string, val: string) => { const el = document.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement; if(el) el.value = val; };

    const handleExpenseTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedType = e.target.value;
        const setting = settings.expenseTypes.find((item: any) => (typeof item === 'string' ? item === selectedType : item.name === selectedType));
        let defaultComp = ''; let defaultAmt = ''; let targetDate = newExpense.date;
        if (setting && typeof setting !== 'string') {
            defaultComp = setting.defaultCompany || '';
            defaultAmt = setting.defaultAmount ? formatNumberInput(setting.defaultAmount.toString()) : '';
            if (setting.defaultDays && Number(setting.defaultDays) > 0) { const d = new Date(); d.setDate(d.getDate() + Number(setting.defaultDays)); targetDate = d.toISOString().split('T')[0]; }
        }
        setNewExpense({ ...newExpense, type: selectedType, company: defaultComp, amount: defaultAmt, date: targetDate });
    };

    const handleSearchVRD = async () => {
        if (!vrdSearch || !db) return;
        setSearching(true); setVrdResults([]); 
        try {
            const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'database'), where('category', '==', 'Vehicle')); 
            const snapshot = await getDocs(q);
            const searchKey = vrdSearch.toUpperCase().trim();
            const matches: any[] = [];
            snapshot.forEach(doc => { const data = doc.data(); if ((data.plateNoHK||'').toUpperCase().includes(searchKey) || (data.chassisNo||'').toUpperCase().includes(searchKey)) matches.push(data); });
            if (matches.length > 0) setVrdResults(matches); else alert("資料庫中心找不到相符的車輛");
        } catch (e) { alert("搜尋錯誤"); } finally { setSearching(false); }
    };

    const applyVrdData = (vrdData: any) => {
        if (!vrdData) return;

        if (vrdData.engineSize !== undefined && vrdData.engineSize !== null) setEngineSizeStr(formatNumberInput(vrdData.engineSize.toString()));
        if (vrdData.priceA1 !== undefined && vrdData.priceA1 !== null) setPriceA1Str(formatNumberInput(vrdData.priceA1.toString()));
        if (vrdData.priceTax !== undefined && vrdData.priceTax !== null) setPriceTaxStr(formatNumberInput(vrdData.priceTax.toString()));

        // ★ 強制更新 DOM 上的座位數和手數
        if (vrdData.seating) {
            const seatInput = document.querySelector('input[name="seating"]') as HTMLInputElement;
            if (seatInput) seatInput.value = vrdData.seating.toString();
        }
        if (vrdData.prevOwners !== undefined) {
            const prevOwnerInput = document.querySelector('input[name="previousOwners"]') as HTMLInputElement;
            if (prevOwnerInput) prevOwnerInput.value = vrdData.prevOwners.toString();
        }

        const rawMake = vrdData.make || vrdData.brand || ''; 
        let matchedMake = rawMake;
        if (rawMake) {
            matchedMake = settings.makes.find((m: string) => m.toLowerCase() === rawMake.toLowerCase()) || 
                          settings.makes.find((m: string) => rawMake.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(rawMake.toLowerCase())) || rawMake;
            setSelectedMake(matchedMake);
        }
        
        let alertMessage = "✅ VRD 導入成功";
        let finalCName = '';
        let finalCPhone = '';
        let finalCID = vrdData.registeredOwnerId || '';
        let finalCAddress = '';

        const ownerName = vrdData.registeredOwnerName || vrdData.owner;
        if (ownerName) {
            const exist = clients.find((c: any) => c.name === ownerName);
            if (exist) {
                finalCName = exist.name;
                finalCPhone = exist.phone || '';
                finalCID = exist.idNumber || exist.hkid || finalCID;
                finalCAddress = exist.address || '';
                setVrdOwnerRaw(''); 
                alertMessage = `✅ 自動配對客戶：${exist.name}`;
            } else { 
                setVrdOwnerRaw(ownerName); 
                finalCName = ownerName;
                alertMessage = `⚠️ 系統無客戶檔案，已暫填姓名。`; 
            }
        } 

        setEditingVehicle((prev: any) => {
            if (!prev) return prev;
            return {
                ...prev,
                regMark: vrdData.plateNoHK || vrdData.regNo || prev.regMark,
                make: matchedMake,
                model: vrdData.model || prev.model,
                year: vrdData.manufactureYear || vrdData.year || prev.year,
                chassisNo: vrdData.chassisNo || prev.chassisNo,
                engineNo: vrdData.engineNo || prev.engineNo,
                engineSize: vrdData.engineSize || prev.engineSize,
                priceA1: vrdData.priceA1 || prev.priceA1,
                priceTax: vrdData.priceTax || prev.priceTax,
                seating: vrdData.seating || prev.seating, // ★ 新增：連動座位數
                colorExt: vrdData.vehicleColor || vrdData.color || prev.colorExt,
                previousOwners: vrdData.prevOwners !== undefined ? vrdData.prevOwners.toString() : prev.previousOwners,
                registeredOwnerDate: vrdData.registeredOwnerDate || prev.registeredOwnerDate,
                customerName: finalCName || prev.customerName,
                customerPhone: finalCPhone || prev.customerPhone,
                customerID: finalCID || prev.customerID,
                customerAddress: finalCAddress || prev.customerAddress
            };
        });

        setVrdResults([]); 
        setVrdSearch(''); 
        setShowVrdOverlay(false);
        setTimeout(() => alert(alertMessage), 150);
    };

    const handleSaveWrapper = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (!e.currentTarget.querySelector('[name="isPublic_hidden"]')) {
            const hiddenPublic = document.createElement('input');
            hiddenPublic.type = 'hidden';
            hiddenPublic.name = 'isPublic_hidden';
            hiddenPublic.value = isPublic ? 'true' : 'false';
            e.currentTarget.appendChild(hiddenPublic);
        }

        if (!e.currentTarget.querySelector('[name="cb_isEnabled_hidden"]')) {
            const hiddenCb = document.createElement('input');
            hiddenCb.type = 'hidden';
            hiddenCb.name = 'cb_isEnabled_hidden';
            hiddenCb.value = cbEnabled ? 'true' : 'false';
            e.currentTarget.appendChild(hiddenCb);
        }

        const formData = new FormData(e.currentTarget);
        if(!formData.has('mileage')) { 
            const hiddenMileage = document.createElement('input'); 
            hiddenMileage.type = 'hidden'; 
            hiddenMileage.name = 'mileage'; 
            hiddenMileage.value = (mileageStr || '').replace(/,/g, ''); 
            e.currentTarget.appendChild(hiddenMileage); 
        }
        
        if(editingVehicle) {
            editingVehicle.photos = carPhotos;
            (editingVehicle as any).acqPayments = acqPayments; 
        }
        
        // ★★★ 修正 1：智能學習行家名字庫邏輯 (加強防錯機制) ★★★
        const st = formData.get('sourceType') as string;
        const vendorName = formData.get('acq_vendor') as string;
        if (st === 'partner' && vendorName && db) {
            const currentPartners = settings?.partners || [];
            if (!currentPartners.includes(vendorName)) {
                try {
                    const { doc, updateDoc, setDoc, arrayUnion } = await import('firebase/firestore');
                    const settingsRef = doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system', 'settings');
                    
                    // 嘗試更新，如果失敗 (例如欄位未初始化) 則改用 setDoc 合併，徹底解決紅字 Error！
                    await updateDoc(settingsRef, { partners: arrayUnion(vendorName) }).catch(async () => {
                        await setDoc(settingsRef, { partners: arrayUnion(vendorName) }, { merge: true });
                    });
                    
                    console.log(`✅ 已自動將新行家 [${vendorName}] 加入字庫`);
                    if (settings.partners) settings.partners.push(vendorName); else settings.partners = [vendorName];
                } catch (err) {
                    console.warn('更新行家字典失敗 (但不影響車輛儲存):', err);
                }
            }
        }

        try { await saveVehicle(e); } catch (err) { alert(`儲存失敗: ${err}`); }
    };

    const handleClose = () => { setEditingVehicle(null); if(activeTab === 'inventory_add') setActiveTab('inventory'); };

    const isOneForOne = acqVendor.includes('一換一');
    const oneForOnePlaceholder = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%231e3a8a'/%3E%3Ctext x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' font-weight='bold' fill='%23ffffff'%3E一換一 QUOTA%3C/text%3E%3Ctext x='50%25' y='60%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%2393c5fd'%3EEV Replacement Scheme%3C/text%3E%3C/svg%3E";
    const displayPhotos = (isOneForOne && carPhotos.length === 0) ? [oneForOnePlaceholder] : carPhotos;


    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-0 md:p-4 overflow-hidden w-full">
        <div className="bg-slate-100 md:rounded-2xl shadow-2xl w-full max-w-[100vw] overflow-hidden md:max-w-[98vw] xl:max-w-[1500px] h-full md:h-[92vh] flex flex-col border-0 md:border border-slate-600 relative">
          
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center flex-none shadow-md z-20 safe-area-top w-full">
            <div className="flex items-center gap-3">
                <button type="button" onClick={handleClose} className="md:hidden p-2 -ml-2 mr-1 text-slate-300 hover:text-white"><ChevronLeft size={28} /></button>
                {isNew ? (
                    <div className="flex items-center gap-2"><div className="p-2 bg-yellow-500 rounded-lg text-black"><Car size={24} /></div><h2 className="text-xl font-bold">車輛入庫</h2></div>
                ) : (
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-start"><span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5 hidden md:block">Registration</span><span className="bg-[#FFD600] text-black border-[3px] border-black font-black font-mono text-xl md:text-2xl px-3 py-0.5 rounded-[4px] shadow-sm transform -skew-x-3">{v.regMark || '未出牌'}</span></div>
                        {v.crossBorder?.mainlandPlate && (<div className="flex flex-col items-start"><span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5 hidden md:block">Mainland</span><span className={`${v.crossBorder.mainlandPlate.startsWith('粵Z') ? 'bg-black text-white border-white' : 'bg-[#003399] text-white border-white'} border-2 font-bold font-mono text-sm md:text-lg px-2 py-1 rounded-[3px] shadow-sm`}>{v.crossBorder.mainlandPlate}</span></div>)}
                    </div>
                )}
            </div>
            <button type="button" onClick={handleClose} className="hidden md:block p-2 hover:bg-slate-700 rounded-full transition-colors"><X size={24} /></button>
          </div>

          <form 
            onSubmit={handleSaveWrapper} 
            onKeyDown={(e) => {
                // ★ 終極防呆：防止在輸入框按 Enter 誤觸發整個表單儲存並關閉
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                    e.preventDefault();
                }
            }}
            className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden relative pb-[80px] md:pb-0 overflow-x-hidden w-full"
          >  
            <div className="md:hidden flex border-b border-slate-200 px-2 gap-1 flex-none bg-slate-50 pt-2 overflow-x-auto scrollbar-hide sticky top-0 z-40 w-full shadow-sm">
                <button type="button" onClick={() => setRightTab('vrd')} className={`pb-3 px-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${rightTab === 'vrd' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}><FileText size={16} className="inline mr-1 mb-0.5"/>基本/VRD</button>
                <button type="button" onClick={() => setRightTab('sales')} className={`pb-3 px-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${rightTab === 'sales' ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500'}`}><DollarSign size={16} className="inline mr-1 mb-0.5"/>銷售/收款</button>
                <button type="button" onClick={() => setRightTab('cost')} className={`pb-3 px-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${rightTab === 'cost' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500'}`}><DownloadCloud size={16} className="inline mr-1 mb-0.5"/>進貨/成本</button>
                {/* ★ 新增：手機版維修保養按鈕 */}
                <button type="button" onClick={() => setRightTab('service')} className={`pb-3 px-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${rightTab === 'service' ? 'border-orange-600 text-orange-700' : 'border-transparent text-slate-500'}`}><Wrench size={16} className="inline mr-1 mb-0.5"/>維修/保養</button>
                <button type="button" onClick={() => setRightTab('cb')} className={`pb-3 px-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${rightTab === 'cb' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500'}`}><Globe size={16} className="inline mr-1 mb-0.5"/>中港車管家</button>
            </div>

            {/* ================= 左側欄 (VRD & Photos) ================= */}
            <div className={`w-full lg:w-[30%] md:w-[35%] min-w-0 md:min-w-[320px] bg-slate-200/50 border-r border-slate-300 flex-col flex-none md:h-full md:overflow-hidden relative order-1 md:order-1 ${rightTab === 'vrd' ? 'flex' : 'hidden md:flex'}`}>
                 
                 {/* VRD 搜尋遮罩 */}
                 {showVrdOverlay && (
                    <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-sm flex flex-col p-4 md:p-6 animate-in fade-in duration-200">
                        <div className="flex justify-between items-center mb-6 border-b pb-2"><h3 className="font-bold text-lg text-blue-800 flex items-center"><Database size={20} className="mr-2"/> 連動資料庫</h3><button type="button" onClick={() => setShowVrdOverlay(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20}/></button></div>
                        <div className="flex flex-col h-full overflow-hidden pb-10">
                            <div className="flex gap-2 mb-4 flex-none">
                                <input 
                                    value={vrdSearch} 
                                    onChange={e => setVrdSearch(e.target.value.toUpperCase())} 
                                    placeholder="車牌或底盤號" 
                                    className="flex-1 p-3 border-2 border-blue-200 rounded-lg font-mono uppercase focus:border-blue-500 outline-none w-full min-w-0" 
                                    autoFocus 
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault(); 
                                            if (vrdResults && vrdResults.length > 0) applyVrdData(vrdResults[0]);
                                            else if (vrdSearch.trim() !== '') handleSearchVRD(); 
                                        }
                                    }} 
                                />
                                <button type="button" onClick={handleSearchVRD} disabled={searching} className="bg-blue-600 text-white px-6 rounded-lg font-bold hover:bg-blue-700 flex-none">
                                    {searching ? <Loader2 className="animate-spin"/> : '搜尋'}
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2">{vrdResults.map((res, idx) => (<div key={idx} className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex justify-between items-center hover:bg-blue-100"><div><div className="font-bold text-lg text-slate-800">{res.plateNoHK || res.regNo}</div><div className="text-xs text-slate-600">{res.manufactureYear} {res.make} {res.model}</div></div><button type="button" onClick={() => applyVrdData(res)} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex-none">導入</button></div>))}</div>
                        </div>
                    </div>
                 )}

                 <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 scrollbar-thin">
                    {/* VRD Card */}
                    <div className="bg-white rounded-xl shadow-sm border-2 border-red-100 overflow-hidden relative group">
                        <div className="absolute top-0 left-0 w-full h-2 bg-red-400/80"></div>
                        <div className="p-4 space-y-4 md:space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-red-800 text-sm flex items-center">
                                    <FileText size={14} className="mr-1"/> 登記文件 (VRD)
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button 
                                        type="button" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const plateInput = document.querySelector('input[name="regMark"]') as HTMLInputElement;
                                            const currentPlate = plateInput ? plateInput.value : (v.regMark || '');
                                            const dateInput = document.querySelector('input[name="registeredOwnerDate"]') as HTMLInputElement;
                                            const ownerDate = dateInput ? dateInput.value : (v.registeredOwnerDate || '');
                                            
                                            let tdFormatDate = '未填寫日期';
                                            if (ownerDate && ownerDate.includes('-')) {
                                                const parts = ownerDate.split('-');
                                                if (parts.length === 3) tdFormatDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                                            }

                                            const w = 500; const h = 750; 
                                            const left = (window.screen.width / 2) - (w / 2);
                                            const top = (window.screen.height / 2) - (h / 2);
                                            window.open('https://vehiclelicence2.td.gov.hk/evlweb/eVehicleLicence', 'TD_License_Check', `popup=yes,width=${w},height=${h},top=${top},left=${left},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`);

                                            if (currentPlate && currentPlate !== '未出牌') navigator.clipboard.writeText(currentPlate);
                                            alert(`✅ 已自動複製車牌：${currentPlate}\n\n📆 車主登記日期為：\n👉👉   ${tdFormatDate}   👈👈`);
                                        }} 
                                        className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1.5 md:py-1 rounded hover:bg-amber-100 flex items-center shadow-sm transition-colors"
                                    >
                                        <Search size={12} className="mr-1"/> 查牌費
                                    </button>
                                    
                                    <button type="button" onClick={() => setShowVrdOverlay(true)} className="text-[10px] bg-blue-600 text-white px-2 py-1.5 md:py-1 rounded hover:bg-blue-700 flex items-center shadow-sm transition-colors">
                                        <Link size={12} className="mr-1"/> 連結資料庫
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1 relative"><label className="text-xs md:text-[10px] text-slate-400 font-bold uppercase">Registration Mark</label><input name="regMark" defaultValue={v.regMark} placeholder="未出牌" className="w-full bg-[#FFD600] border-[3px] border-black py-3 md:py-2 text-2xl font-black font-mono text-center text-black focus:ring-4 focus:ring-yellow-200 rounded-md uppercase"/></div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-3">
                                <div>
                                    <label className="text-xs md:text-[9px] text-slate-400 font-bold uppercase">Make</label>
                                    <input list="make_list" name="make" value={selectedMake} onChange={(e) => setSelectedMake(e.target.value)} className="w-full bg-slate-50 border-b border-slate-300 md:border-slate-200 p-2.5 md:p-1 text-base md:text-sm font-bold text-slate-700 outline-none"/>
                                    <datalist id="make_list">{settings.makes.map((m:string) => <option key={m} value={m}>{m}</option>)}</datalist>
                                </div>
                                <div><label className="text-xs md:text-[9px] text-slate-400 font-bold uppercase">Model</label><input list="model_list" name="model" defaultValue={v.model} className="w-full bg-slate-50 border-b border-slate-300 md:border-slate-200 p-2.5 md:p-1 text-base md:text-sm font-bold text-slate-700 outline-none"/><datalist id="model_list">{(settings.models[selectedMake] || []).map((m:string) => <option key={m} value={m} />)}</datalist></div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-2">
                                <div className="col-span-1"><label className="text-xs md:text-[9px] text-slate-400 font-bold uppercase">Year</label><input name="year" type="number" defaultValue={v.year} className="w-full bg-slate-50 border-b border-slate-300 md:border-slate-200 p-2.5 md:p-1 text-base md:text-sm font-mono"/></div>
                                <div className="col-span-1"><label className="text-xs md:text-[9px] text-slate-400 font-bold uppercase">Mileage</label><input name="mileage" value={mileageStr} onChange={(e) => setMileageStr(formatNumberInput(e.target.value))} className="w-full bg-slate-50 border-b border-slate-300 md:border-slate-200 p-2.5 md:p-1 text-base md:text-sm font-mono text-left md:text-right" placeholder="km"/></div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-2">
                                <div className="col-span-1">
                                    <label className="text-xs md:text-[9px] text-slate-400 font-bold uppercase">Reg. as Owner Date</label>
                                    <input type="date" name="registeredOwnerDate" defaultValue={v.registeredOwnerDate} className="w-full bg-slate-50 border-b border-slate-300 md:border-slate-200 p-2.5 md:p-1 text-base md:text-xs font-mono outline-none text-slate-600"/>
                                </div>
                                <div className="col-span-1 bg-red-50/50 rounded px-2 md:px-1 py-1 md:py-0 border border-red-100 md:border-none relative group">
                                    <div className="flex justify-between items-center mb-0.5 md:mb-0">
                                        <label className="text-xs md:text-[9px] text-red-500 md:text-red-400 font-bold uppercase flex items-center">
                                            Lic. Expiry
                                            {/* ★ 鈴鐺圖示，根據開關狀態改變顏色 */}
                                            <Bell size={10} className={`ml-1 ${v.licenseReminderEnabled !== false ? 'text-red-500 animate-pulse' : 'text-gray-300'}`} />
                                        </label>
                                        
                                        {/* ★ 小巧的開關 Toggle */}
                                        <label className="flex items-center cursor-pointer relative z-10" title={v.licenseReminderEnabled !== false ? "提醒已開啟" : "不作提醒"}>
                                            <div className="relative">
                                                {/* 隱藏欄位：傳送 true/false 給 formData */}
                                                <input type="hidden" name="licenseReminderEnabled" value={v.licenseReminderEnabled !== false ? 'true' : 'false'} />
                                                
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    defaultChecked={v.licenseReminderEnabled !== false} 
                                                    onChange={(e) => {
                                                        // 當切換時，更新隱藏欄位的值
                                                        const hiddenInput = e.target.previousElementSibling as HTMLInputElement;
                                                        if (hiddenInput) hiddenInput.value = e.target.checked ? 'true' : 'false';
                                                        
                                                        // 即時更新畫面上的鈴鐺顏色 (透過簡單的 DOM 操作，不觸發整個元件 re-render)
                                                        const bellIcon = e.target.closest('.group')?.querySelector('.lucide-bell');
                                                        if (bellIcon) {
                                                            if (e.target.checked) {
                                                                bellIcon.classList.add('text-red-500', 'animate-pulse');
                                                                bellIcon.classList.remove('text-gray-300');
                                                            } else {
                                                                bellIcon.classList.remove('text-red-500', 'animate-pulse');
                                                                bellIcon.classList.add('text-gray-300');
                                                            }
                                                        }
                                                    }}
                                                />
                                                {/* Toggle UI (縮小版) */}
                                                <div className="w-5 h-3 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-red-500 shadow-inner"></div>
                                            </div>
                                        </label>
                                    </div>
                                    
                                    <input type="date" name="licenseExpiry" defaultValue={v.licenseExpiry} className="w-full bg-transparent border-b border-red-300 md:border-red-200 p-2 md:p-1 text-base md:text-xs font-mono text-left md:text-right text-red-700 outline-none relative z-0"/>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-2 pt-2">
                                <div>
                                    <label className="text-xs md:text-[9px] text-slate-400 font-bold uppercase">Prev Owners</label>
                                    <input name="previousOwners" defaultValue={v.previousOwners !== undefined ? v.previousOwners : ''} className="w-full bg-slate-50 border-b border-slate-300 md:border-slate-200 p-2.5 md:p-1 text-base md:text-xs text-left md:text-center" placeholder="首數"/>
                                </div>
                                <div>
                                    <label className="text-xs md:text-[9px] text-slate-400 font-bold uppercase">Color (Ext)</label>
                                    <input list="colors" name="colorExt" defaultValue={v.colorExt} className="w-full bg-slate-50 border-b border-slate-300 md:border-slate-200 p-2.5 md:p-1 text-base md:text-xs"/>
                                    <datalist id="colors">{settings.colors.map((c:string) => <option key={c} value={c} />)}</datalist>
                                </div>
                                <div>
                                    <label className="text-xs md:text-[9px] text-slate-400 font-bold uppercase">Color (Int)</label>
                                    <input list="colors" name="colorInt" defaultValue={v.colorInt} className="w-full bg-slate-50 border-b border-slate-300 md:border-slate-200 p-2.5 md:p-1 text-base md:text-xs"/>
                                </div>
                            </div>
                            
                            <div className="space-y-1 pt-4 md:pt-2 border-t border-dashed border-slate-300 md:border-slate-200">
                                <label className="text-xs md:text-[9px] text-slate-400 font-bold uppercase">Chassis No.</label>
                                <input name="chassisNo" defaultValue={v.chassisNo} className="w-full bg-slate-50 border-b border-slate-300 md:border-slate-200 p-2.5 md:p-1 text-base md:text-xs font-mono tracking-wider uppercase"/>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs md:text-[9px] text-slate-400 font-bold uppercase">Engine No.</label>
                                <input name="engineNo" defaultValue={v.engineNo} className="w-full bg-slate-50 border-b border-slate-300 md:border-slate-200 p-2.5 md:p-1 text-base md:text-xs font-mono tracking-wider uppercase"/>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-3 pt-2">
                                <div><label className="text-xs md:text-[9px] text-slate-400 font-bold uppercase">{fuelType === 'Electric' ? 'Rated Power (KW)' : 'Cyl. Cap. (cc)'}</label><input name="engineSize" value={engineSizeStr} onChange={(e) => setEngineSizeStr(formatNumberInput(e.target.value))} className="w-full bg-slate-50 border-b border-slate-300 md:border-slate-200 p-2.5 md:p-1 text-base md:text-xs text-left md:text-right font-mono" /></div>
                                <div><label className="text-xs md:text-[9px] text-slate-400 font-bold uppercase">Seating</label><input name="seating" type="number" defaultValue={v.seating || 5} className="w-full bg-slate-50 border-b border-slate-300 md:border-slate-200 p-2.5 md:p-1 text-base md:text-xs text-left md:text-right"/></div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-2 pt-4 md:pt-2 border-t border-dashed border-slate-300 md:border-slate-200">
                                <div><label className="text-xs md:text-[9px] text-slate-400 font-bold uppercase">Fuel Type</label><select name="fuelType" value={fuelType} onChange={(e) => setFuelType(e.target.value as any)} className="w-full bg-white md:bg-slate-50 border border-slate-300 md:border-b md:border-slate-200 p-3 md:p-1 text-base md:text-xs outline-none rounded md:rounded-none"><option value="Petrol">Petrol</option><option value="Diesel">Diesel</option><option value="Electric">Electric</option></select></div>
                                <div><label className="text-xs md:text-[9px] text-slate-400 font-bold uppercase">Transmission</label><select name="transmission" value={transmission} onChange={(e) => setTransmission(e.target.value as any)} className="w-full bg-white md:bg-slate-50 border border-slate-300 md:border-b md:border-slate-200 p-3 md:p-1 text-base md:text-xs outline-none rounded md:rounded-none"><option value="Automatic">Auto</option><option value="Manual">Manual</option></select></div>
                            </div>
                        </div>
                    </div>

                     {/* Photos Card */}
                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mt-4">
                        <div className="flex justify-between items-center mb-3"><h3 className="font-bold text-slate-700 text-sm flex items-center"><ImageIcon size={14} className="mr-1 text-blue-500"/> 車輛相片</h3><button type="button" onClick={handleGoToMediaLibrary} className="text-xs md:text-[10px] bg-blue-50 text-blue-600 px-3 py-2 md:py-1.5 rounded-lg border hover:bg-blue-100 font-bold shadow-sm">整理圖庫 <ArrowRight size={10} className="inline"/></button></div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[300px] md:max-h-[260px] overflow-y-auto pr-1">
                            {displayPhotos.map((url, idx) => (
                                <div 
                                    key={idx} 
                                    draggable={!isOneForOne} // ★ 一換一佔位圖不可拖曳
                                    onDragStart={() => setDragPhotoIdx(idx)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        if (dragPhotoIdx === null || dragPhotoIdx === idx || isOneForOne) return;
                                        const newArr = [...carPhotos];
                                        const item = newArr.splice(dragPhotoIdx, 1)[0];
                                        newArr.splice(idx, 0, item);
                                        setCarPhotos(newArr);
                                        setDragPhotoIdx(null);
                                    }}
                                    className={`relative aspect-video rounded-lg border overflow-hidden shadow-sm transition-transform ${!isOneForOne ? 'cursor-move hover:scale-[1.02]' : ''} ${dragPhotoIdx === idx ? 'opacity-50 ring-2 ring-blue-500' : ''} ${idx===0 ? 'col-span-2' : ''}`}
                                    onClick={() => setPreviewImage(url)}
                                >
                                    {/* 加入 pointer-events-none 確保拖曳順暢不被圖片干擾 */}
                                    <img src={url} className="w-full h-full object-cover pointer-events-none"/>
                                    {!isOneForOne && (
                                        <div className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded backdrop-blur-sm">
                                            <Eye size={12}/>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {displayPhotos.length === 0 && (<div className="col-span-full py-8 text-center text-slate-400 text-sm md:text-[10px] border-2 border-dashed rounded-lg bg-slate-50">暫無照片</div>)}
                        </div>
                    </div>
                 </div>
            </div>
            
            {/* ================= 右側欄 (Tabs System) ================= */}
            <div className={`w-full md:flex-1 flex-col md:h-full bg-white md:overflow-hidden order-2 md:order-2 min-w-0 ${rightTab !== 'vrd' ? 'flex' : 'hidden md:flex'}`}>
                
                {/* 頂部全域狀態列 */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 md:px-6 md:pt-6 bg-white flex-none border-t md:border-t-0 border-slate-200 w-full">
                    
                    {/* ★★★ 升級版：動態變形狀態按鈕 (整合專屬日期) ★★★ */}
                    <div className="flex flex-wrap bg-slate-100 rounded-lg p-1 border border-slate-200 shadow-inner w-full md:w-auto min-h-[44px]">
                        <input type="hidden" name="status" value={currentStatus} />
                        <input type="hidden" name="stockInDate" value={statusDates['In Stock'] || ''} />
                        <input type="hidden" name="reservedDate" value={statusDates['Reserved'] || ''} />
                        <input type="hidden" name="stockOutDate" value={statusDates['Sold'] || ''} />
                        <input type="hidden" name="withdrawnDate" value={statusDates['Withdrawn'] || ''} />
                        
                        {(['In Stock', 'Reserved', 'Sold', 'Withdrawn'] as const).map(status => (
                            <button 
                                key={status} 
                                type="button" 
                                onClick={() => {
                                    setCurrentStatus(status as any);
                                    
                                    // ★★★ 終極智能日期推算 ★★★
                                    if (!statusDates[status]) {
                                        let autoDate = new Date().toISOString().split('T')[0]; // 預設今日
                                        
                                        if (status === 'In Stock' && v.stockInDate) {
                                            // 在庫：永遠以最原始入庫日為準
                                            autoDate = v.stockInDate; 
                                        } 
                                        else if (status === 'Reserved' && v.payments && v.payments.length > 0) {
                                            // 已訂：找第一筆收款的日期 (落訂日)
                                            const sorted = [...v.payments].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                            autoDate = sorted[0].date;
                                        } 
                                        else if (status === 'Sold' && v.payments && v.payments.length > 0) {
                                            // 已售：找最後一筆收款的日期 (結清日)
                                            const sorted = [...v.payments].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                            autoDate = sorted[sorted.length - 1].date;
                                        }
                                        
                                        setStatusDates(prev => ({...prev, [status]: autoDate}));
                                    }
                                }} 
                                className={`flex-1 md:flex-none px-3 py-1.5 rounded-md transition-all flex flex-col items-center justify-center gap-1 ${currentStatus === status ? 'bg-white text-blue-700 shadow border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            >
                                <span className="font-bold text-sm md:text-xs">
                                    {status === 'In Stock' ? '在庫' : (status === 'Reserved' ? '已訂' : (status === 'Sold' ? '已售' : '撤回'))}
                                </span>
                                {/* 被選中時，底部展開專屬日期框 */}
                                {currentStatus === status && (
                                    <input 
                                        type="date"
                                        value={statusDates[status] || ''}
                                        onChange={(e) => setStatusDates({...statusDates, [status]: e.target.value})}
                                        onClick={(e) => e.stopPropagation()} // 防止點擊輸入框時觸發按鈕
                                        className="text-[10px] bg-blue-50 text-blue-700 px-1 py-0.5 rounded outline-none font-mono font-bold cursor-pointer border border-blue-200 shadow-inner w-full md:w-[95px] text-center"
                                        title={`${status === 'In Stock' ? '入庫' : (status === 'Reserved' ? '落訂' : (status === 'Sold' ? '售出' : '撤回'))}日期`}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full md:w-auto">
                        <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 md:py-1.5 rounded-lg border shadow-sm transition-colors w-full md:w-auto justify-center ${isPublic ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                            <Globe size={16} className={isPublic ? 'text-emerald-500' : 'text-slate-400'} />
                            <span className="text-sm md:text-xs font-bold">官網展示</span>
                            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="accent-emerald-600 w-5 h-5 md:w-4 md:h-4 cursor-pointer"/>
                        </label>

                        <div className="bg-yellow-50 rounded-lg p-2 md:p-1 border border-yellow-200 shadow-sm flex items-center px-3 w-full md:w-auto justify-between">
                            <span className="text-xs md:text-[10px] text-yellow-700 font-bold mr-2"><UserIcon size={14} className="inline mr-0.5"/>負責人:</span>
                            <select name="managedBy" defaultValue={v.id ? (v.managedBy || '') : (staffId || '')} className="text-sm md:text-xs font-bold text-slate-700 outline-none bg-transparent" disabled={!(staffId === 'BOSS' || (currentUser as any)?.modules?.includes('all'))}>
                                <option value="">-- 未指派 --</option>
                                {(systemUsers || []).map((u:any) => <option key={u.email} value={u.email}>{u.email}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 桌面版專屬的分頁導航 (Tabs) */}
                <div className="hidden md:flex border-b border-slate-200 px-6 gap-6 flex-none bg-slate-50 pt-2 overflow-x-auto scrollbar-hide w-full">
                    <button type="button" onClick={() => setRightTab('sales')} className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${(rightTab === 'sales' || rightTab === 'vrd') ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><DollarSign size={16} className="inline mr-1 mb-0.5"/>銷售與收款</button>
                    <button type="button" onClick={() => setRightTab('cost')} className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${rightTab === 'cost' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><DownloadCloud size={16} className="inline mr-1 mb-0.5"/>進貨與成本</button>
                    {/* ★ 新增：桌面版維修保養按鈕 */}
                    <button type="button" onClick={() => setRightTab('service')} className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${rightTab === 'service' ? 'border-orange-600 text-orange-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Wrench size={16} className="inline mr-1 mb-0.5"/>維修與保養</button>
                    <button type="button" onClick={() => setRightTab('cb')} className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${rightTab === 'cb' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Globe size={16} className="inline mr-1 mb-0.5"/>中港車管家</button>
                </div>

                {/* 分頁內容區 */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white scrollbar-thin relative w-full overflow-x-hidden">
                    
                    {/* ===== Tab 1: 銷售與收款 (Sales) ===== */}
                    <div className={`${rightTab === 'sales' ? 'block' : 'hidden'} md:${rightTab === 'vrd' || rightTab === 'sales' ? 'block' : 'hidden'} space-y-6 animate-fade-in w-full`}>
                        {/* 客戶資料 */}
                        <div className="relative">
                            <div className="flex justify-between items-center mb-3"><h3 className="font-bold text-slate-800 text-base md:text-sm flex items-center"><UserCircle size={18} className="mr-2 text-blue-600"/> 客戶資料 (Purchaser)</h3>{vrdOwnerRaw && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded border border-yellow-200">VRD 車主: {vrdOwnerRaw} (未建檔)</span>}</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 md:p-4 rounded-xl border border-slate-200">
                                <div className="relative"><span className="absolute top-2.5 left-3 text-[10px] text-gray-400 font-bold">NAME</span><input name="customerName" defaultValue={v.customerName} className="w-full pt-6 pb-2 px-3 bg-white border border-slate-200 rounded-lg text-base md:text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none" placeholder="輸入姓名..."/></div>
                                <div className="relative"><span className="absolute top-2.5 left-3 text-[10px] text-gray-400 font-bold">PHONE</span><input name="customerPhone" defaultValue={v.customerPhone} className="w-full pt-6 pb-2 px-3 bg-white border border-slate-200 rounded-lg text-base md:text-sm font-mono focus:ring-2 focus:ring-blue-100 outline-none"/></div>
                                <div className="relative"><span className="absolute top-2.5 left-3 text-[10px] text-gray-400 font-bold">ID / BR</span><input name="customerID" defaultValue={v.customerID} className="w-full pt-6 pb-2 px-3 bg-white border border-slate-200 rounded-lg text-base md:text-sm font-mono focus:ring-2 focus:ring-blue-100 outline-none"/></div>
                                <div className="relative"><span className="absolute top-2.5 left-3 text-[10px] text-gray-400 font-bold">ADDRESS</span><input name="customerAddress" defaultValue={v.customerAddress} className="w-full pt-6 pb-2 px-3 bg-white border border-slate-200 rounded-lg text-base md:text-sm focus:ring-2 focus:ring-blue-100 outline-none"/></div>
                            </div>
                        </div>

                        {/* 售價設定 */}
                        <div>
                            <h3 className="font-bold text-slate-800 text-base md:text-sm mb-3 flex items-center"><DollarSign size={18} className="mr-2 text-green-600"/> 售價與稅項 (Pricing)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-yellow-50 p-3 md:p-2 rounded-lg border border-yellow-200 md:col-span-2 w-full min-w-0">
                                    <label className="block text-xs md:text-[10px] text-yellow-800 font-bold mb-1">目標售價 (Sell Price HKD)</label>
                                    <input name="price" value={priceStr} onChange={e => setPriceStr(formatNumberInput(e.target.value))} className="w-full bg-white border border-yellow-300 p-2 md:p-1 text-2xl md:text-xl font-bold text-slate-900 outline-none font-mono rounded" placeholder="$0"/>
                                </div>
                                <div className="bg-white p-3 md:p-2 rounded-lg border border-slate-200 w-full min-w-0">
                                    <label className="block text-xs md:text-[10px] text-gray-400 font-bold mb-1">A1 Tax (首次登記稅值)</label>
                                    <input name="priceA1" value={priceA1Str} onChange={e => setPriceA1Str(formatNumberInput(e.target.value))} className="w-full bg-slate-50 border border-slate-200 p-2 md:p-1 text-base md:text-sm font-mono outline-none rounded"/>
                                </div>
                                <div className="bg-white p-3 md:p-2 rounded-lg border border-slate-200 w-full min-w-0">
                                    <label className="block text-xs md:text-[10px] text-gray-400 font-bold mb-1">Paid Tax (已繳稅款)</label>
                                    <input name="priceTax" value={priceTaxStr} onChange={e => setPriceTaxStr(formatNumberInput(e.target.value))} className="w-full bg-slate-50 border border-slate-200 p-2 md:p-1 text-base md:text-sm font-mono outline-none rounded"/>
                                </div>
                            </div>
                            
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-3 gap-3">
                                <span className="text-sm md:text-xs text-gray-500 font-bold">牌簿價: <span className="font-mono text-slate-700">{calcRegisteredPrice()}</span></span>
                                
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                                    {v.crossBorder?.isEnabled && (
                                        <button 
                                            type="button"
                                            onClick={() => { setEditingVehicle(null); setActiveTab('cross_border'); alert(`已為您跳轉至「中港業務」。`); }}
                                            className="flex flex-wrap items-center justify-center text-xs md:text-[10px] bg-purple-50 text-purple-700 border border-purple-200 p-2 md:px-2 md:py-1 rounded-lg md:rounded hover:bg-purple-100 transition-colors shadow-sm w-full md:w-auto h-auto leading-tight"
                                        >
                                            <Globe size={14} className="mr-1 flex-shrink-0"/> 
                                            中港代辦: {formatCurrency(cbFees)} 
                                            (已收: {formatCurrency((v.payments || []).filter((p:any) => p.relatedTaskId).reduce((sum:number, p:any) => sum + (p.amount || 0), 0))})
                                        </button>
                                    )}
                                    <span className="font-bold text-blue-600 text-base md:text-sm bg-blue-50 p-2 md:px-3 md:py-1 rounded-lg md:rounded border border-blue-100 w-full sm:w-auto text-center">客戶欠款餘額: {formatCurrency(balance)}</span>
                                </div>
                            </div>
                        </div>

                        {/* 對客附加收費 */}
                        <div className="bg-indigo-50/50 p-4 md:p-4 rounded-xl border border-indigo-100 w-full">
                            <h4 className="font-bold text-base md:text-sm text-indigo-800 mb-3 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                                <span>對客附加收費 (Sales Add-ons)</span>
                                <span className="text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full text-xs font-bold w-fit">總附加費: {formatCurrency(salesAddonsTotal)}</span>
                            </h4>
                            <div className="space-y-2 mb-4">
                                {((v as any).salesAddons || []).map((addon: any, idx: number) => (
                                    <div key={addon.id} className="flex items-center justify-between gap-2 text-sm md:text-xs p-3 md:p-2 bg-white border border-indigo-100 rounded-lg shadow-sm">
                                        <div className="font-bold text-slate-700 flex-1 pl-1 min-w-0 truncate">{addon.name}</div>
                                        
                                        {/* ★ 新增：贈送選框 */}
                                        <label className="flex items-center text-[10px] cursor-pointer text-indigo-500 font-bold bg-indigo-50 px-2 py-1 rounded">
                                            <input 
                                                type="checkbox" 
                                                checked={addon.isFree || false} 
                                                onChange={(e) => {
                                                    const newAddons = [...((v as any).salesAddons || [])];
                                                    newAddons[idx].isFree = e.target.checked;
                                                    if (v.id) updateSubItem(v.id, 'salesAddons', newAddons);
                                                    else setEditingVehicle((prev:any) => prev ? ({ ...prev, salesAddons: newAddons }) : null);
                                                }} 
                                                className="mr-1 accent-indigo-600"
                                            />
                                            贈送
                                        </label>

                                        <div className={`font-mono font-bold text-base md:text-sm flex-shrink-0 ${addon.isFree ? 'text-slate-400 line-through' : 'text-indigo-600'}`}>{formatCurrency(addon.amount)}</div>
                                        <button type="button" onClick={() => handleDeleteAddonClick(addon.id)} className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 md:p-1.5 rounded-md flex-shrink-0"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                                {((v as any).salesAddons || []).length === 0 && <div className="text-center text-sm md:text-xs text-indigo-300 py-3">無附加收費</div>}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3 md:gap-2">
                                <input type="text" placeholder="收費項目 (例如: 文件費)..." value={newAddon.name} onChange={e => setNewAddon({...newAddon, name: e.target.value})} className="flex-1 w-full text-sm md:text-xs p-3 md:p-2 border border-indigo-200 rounded-lg outline-none bg-white min-w-0"/>
                                <input type="text" placeholder="$ 金額" value={newAddon.amount} onChange={e => setNewAddon({...newAddon, amount: formatNumberInput(e.target.value)})} className="w-full sm:w-32 text-base md:text-sm p-3 md:p-2 border border-indigo-200 rounded-lg outline-none bg-white text-right font-mono font-bold text-indigo-600"/>
                                <button type="button" onClick={handleAddAddonClick} className="bg-indigo-600 text-white text-sm md:text-xs p-3 md:px-4 rounded-lg hover:bg-indigo-700 font-bold active:scale-95 transition-transform whitespace-nowrap w-full sm:w-auto">加入收費</button>
                            </div>
                        </div>

                        {/* 收款記錄 */}
                        <div className="bg-gray-50 p-4 md:p-4 rounded-xl border border-gray-200 w-full">
                            <h4 className="font-bold text-base md:text-sm text-gray-700 mb-3 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                                <span>收款記錄 (Payments Received)</span>
                                <span className="text-green-600 bg-green-100 px-3 py-1 rounded-full text-xs font-bold w-fit">總已收: {formatCurrency(totalReceived)}</span>
                            </h4>
                            
                            <div className="space-y-3 md:space-y-2 mb-4">
                                {(v.payments || []).map((p: any) => (
                                    <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-2 text-sm md:text-xs p-3 md:p-2.5 bg-white border rounded-lg shadow-sm relative">
                                        <div className="flex flex-wrap items-center gap-2 md:flex-1 min-w-0">
                                            <span className="text-gray-500 font-mono w-full sm:w-auto font-bold">{p.date}</span>
                                            <span className="font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md">{p.type}</span>
                                            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-md text-[10px] font-bold">{p.method || 'Cash'}</span>
                                            <span className="text-gray-600 flex-1 truncate w-full sm:w-auto mt-1 sm:mt-0">{p.note || '-'}</span>
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end gap-4 md:w-auto flex-shrink-0 border-t md:border-t-0 pt-2 md:pt-0 w-full md:w-auto">
                                            <span className="font-mono font-black text-blue-700 text-lg md:text-base">{formatCurrency(p.amount)}</span>
                                            {!p.relatedTaskId && <button type="button" onClick={() => handleDeletePaymentClick(p.id)} className="text-red-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 p-2 md:p-1.5 rounded-md flex-shrink-0"><Trash2 size={16}/></button>}
                                        </div>
                                    </div>
                                ))}
                                {pendingCbTasks.map((task: any) => (
                                    <div key={task.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-sm md:text-xs p-3 md:p-2.5 bg-amber-50 border border-amber-200 rounded-lg shadow-sm text-amber-800 cursor-pointer hover:bg-amber-100 transition-colors relative" onClick={() => { setNewPayment({ ...newPayment, amount: formatNumberInput(task.fee.toString()), note: `${task.item}`, relatedTaskId: task.id }); }} title="點擊載入收款欄">
                                        <div className="flex flex-wrap items-center gap-2 md:flex-1 min-w-0">
                                            <span className="text-amber-600/70 font-mono font-bold">{task.date}</span>
                                            <span className="font-bold flex items-center w-full sm:w-auto bg-amber-200/50 px-2 py-1 rounded-md"><Globe size={12} className="mr-1 flex-shrink-0"/>{task.item}</span>
                                            <span className="text-amber-700 w-full sm:w-auto truncate">{task.institution}</span>
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end gap-3 border-t border-amber-200/50 md:border-t-0 pt-2 md:pt-0 w-full md:w-auto">
                                            <span className="font-mono font-black text-lg md:text-base">{formatCurrency(task.fee)}</span>
                                            <span className="bg-amber-500 text-white px-2 py-1 rounded-md text-[10px] font-bold">待收</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3 md:gap-2 pt-4 border-t border-gray-200 w-full">
                                <input type="date" value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} className="w-full lg:w-32 text-sm md:text-xs p-3 md:p-2 border rounded-lg outline-none bg-white font-bold"/>
                                <select value={newPayment.type} onChange={e => setNewPayment({...newPayment, type: e.target.value as any})} className="w-full lg:w-28 text-sm md:text-xs p-3 md:p-2 border rounded-lg outline-none bg-white font-bold text-slate-700">{(settings.paymentTypes || ['Deposit']).map((pt: string) => <option key={pt} value={pt}>{pt}</option>)}</select>
                                <select value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})} className="w-full sm:col-span-2 lg:w-28 text-sm md:text-xs p-3 md:p-2 border rounded-lg outline-none bg-white font-bold text-blue-700">
                                    <option value="Cash">現金</option>
                                    <option value="Cheque">支票</option>
                                    <option value="Transfer">轉帳</option>
                                    <option value="USDT">USDT</option>
                                    <option value="Trade-in">對數 (Trade-in)</option>
                                </select>
                                <input type="text" placeholder="備註..." value={newPayment.note} onChange={e => setNewPayment({...newPayment, note: e.target.value})} className="w-full sm:col-span-2 lg:flex-1 text-sm md:text-xs p-3 md:p-2 border rounded-lg outline-none bg-white min-w-0"/>
                                
                                {/* ★ 修復：加入 lg:w-auto lg:flex-none，防止搶佔空間 */}
                                <div className="w-full sm:col-span-2 lg:w-auto lg:flex-none flex flex-col sm:flex-row gap-3 md:gap-2 mt-1 sm:mt-0">
                                    <input type="text" placeholder="$ 金額" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: formatNumberInput(e.target.value)})} className="w-full sm:flex-1 lg:w-32 text-lg md:text-sm p-3 md:p-2 border rounded-lg outline-none bg-white text-right font-mono font-black text-blue-600"/>
                                    <button type="button" onClick={handleAddPaymentClick} className="w-full sm:w-auto bg-slate-900 text-white text-sm md:text-xs p-3 md:px-5 rounded-lg hover:bg-slate-800 font-bold active:scale-95 transition-transform whitespace-nowrap shadow-md">新增收款</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ===== Tab 2: 進貨與成本 (Acquisition & Costs) ===== */}
                    <div className={`${rightTab === 'cost' ? 'block' : 'hidden'} space-y-6 animate-fade-in w-full`}>
                        {/* 進貨詳情區塊 */}
                        <div className="bg-red-50/40 p-4 md:p-5 rounded-xl border border-red-100 shadow-sm w-full">
                            
                            {/* ★ 排版升級：將「歸屬下拉」完美融入頂部 */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 pb-3 border-b border-red-100 gap-4 md:gap-2">
                                <h3 className="font-bold text-red-800 text-base md:text-sm flex items-center"><DownloadCloud size={18} className="mr-2"/> 進貨與收車設定</h3>
                                <div className="flex flex-wrap items-center gap-3 md:gap-4 w-full md:w-auto">
                                    
                                    {/* ★ 新增：歸屬下拉選單 (自家盤 | 寄賣 | 行家盤) */}
                                    <div className="flex items-center gap-2 bg-white px-2 py-1.5 md:py-1 rounded-lg border border-red-200 shadow-sm">
                                        <span className="text-xs md:text-[10px] text-indigo-500 font-bold uppercase">車輛歸屬:</span>
                                        <select name="sourceType" value={sourceType} onChange={e => setSourceType(e.target.value as any)} className="bg-transparent text-sm md:text-xs font-black outline-none cursor-pointer text-indigo-700">
                                            <option value="own">🟢 自家盤</option>
                                            <option value="consignment">🔵 寄賣</option>
                                            <option value="partner">🟠 行家盤</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-xs md:text-[10px] text-red-400 font-bold uppercase">狀態分類:</span>
                                        <select name="purchaseType" defaultValue={v.purchaseType || 'Used'} className="text-sm md:text-xs bg-white border border-red-200 rounded-lg md:rounded p-2 md:p-1 outline-none text-red-700 font-bold shadow-sm">
                                            <option value="Used">二手 (Used)</option>
                                            <option value="New">新車 (New)</option>
                                            <option value="Consignment">寄賣 (Consign)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white px-3 md:px-2 py-2 md:py-1 rounded-lg border border-red-200 shadow-sm">
                                        <span className="text-xs md:text-[10px] font-bold text-red-500">表單模式:</span>
                                        <select name="acq_type" value={acqType} onChange={e => setAcqType(e.target.value as any)} className="bg-transparent text-red-800 text-base md:text-sm font-bold outline-none cursor-pointer">
                                            <option value="Local">本地收車 (Local)</option>
                                            <option value="Import">國外訂車 (Import)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* ★ 智能 Datalist 放喺外層，等 Local 同 Import 都可以共用！ */}
                            <datalist id="vendor_list">
                                {sourceType === 'partner' 
                                    ? (settings?.partners || []).map((p: string) => <option key={p} value={p} />)
                                    : (settings?.expenseCompanies || []).map((c: string) => <option key={c} value={c} />)
                                }
                            </datalist>

                            {/* 國外訂車表單 */}
                            {acqType === 'Import' ? (
                                <div className="space-y-4 md:space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs md:text-[10px] text-red-500 font-bold mb-1 uppercase">Supplier / Vendor</label>
                                            <input name="acq_vendor" list="vendor_list" value={acqVendor} onChange={e => setAcqVendor(e.target.value)} className="w-full bg-white border border-red-200 p-3 md:p-2 rounded-lg md:rounded text-base md:text-sm outline-none focus:ring-2 focus:ring-red-200 shadow-sm" placeholder="供應商 / 拍賣場名稱"/>
                                            <datalist id="vendor_list">{settings.expenseCompanies?.map((c: string) => <option key={c} value={c} />)}</datalist>
                                        </div>
                                        <div><label className="block text-xs md:text-[10px] text-red-500 font-bold mb-1 uppercase">ETA (預計到港)</label><input type="date" name="acq_eta" defaultValue={(v as any).acquisition?.eta} className="w-full bg-white border border-red-200 p-3 md:p-2 rounded-lg md:rounded text-sm md:text-xs outline-none focus:ring-2 focus:ring-red-200 font-mono shadow-sm font-bold text-slate-700"/></div>
                                        <div><label className="block text-xs md:text-[10px] text-red-500 font-bold mb-1 uppercase">Payment Status</label><select name="acq_paymentStatus" defaultValue={(v as any).acquisition?.paymentStatus || 'Unpaid'} className="w-full bg-white border border-red-200 p-3 md:p-2 rounded-lg md:rounded text-sm md:text-xs outline-none font-bold text-slate-700 shadow-sm"><option value="Unpaid">未付 (Unpaid)</option><option value="Partial">部分付款 (Partial)</option><option value="Paid">已結清 (Paid)</option></select></div>
                                    </div>

                                    {/* 外幣與當地費用 */}
                                    <div className="bg-white p-4 md:p-3 rounded-xl md:rounded-lg border border-red-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-3 w-full">
                                        <div><label className="block text-xs md:text-[10px] text-red-500 font-bold mb-1 uppercase">Currency</label><select name="acq_currency" defaultValue={(v as any).acquisition?.currency || 'JPY'} className="w-full bg-slate-50 border border-red-100 p-3 md:p-2 rounded-lg text-base md:text-sm outline-none font-bold"><option value="JPY">日圓 (JPY)</option><option value="GBP">英鎊 (GBP)</option><option value="EUR">歐元 (EUR)</option><option value="RMB">人民幣 (RMB)</option><option value="USD">美金 (USD)</option></select></div>
                                        <div><label className="block text-xs md:text-[10px] text-red-500 font-bold mb-1 uppercase">Foreign Price (外幣車價)</label><input name="acq_foreignPrice" value={acqForeignPrice} onChange={e=>setAcqForeignPrice(formatNumberInput(e.target.value))} className="w-full bg-slate-50 border border-red-100 p-3 md:p-2 rounded-lg text-base md:text-sm outline-none font-mono text-right font-bold text-slate-800" placeholder="0"/></div>
                                        <div><label className="block text-xs md:text-[10px] text-red-500 font-bold mb-1 uppercase">Local Charges (當地費用)</label><input name="acq_localChargesForeign" value={acqLocalChargesForeign} onChange={e=>setAcqLocalChargesForeign(formatNumberInput(e.target.value))} className="w-full bg-slate-50 border border-red-100 p-3 md:p-2 rounded-lg text-base md:text-sm outline-none font-mono text-right" placeholder="0"/></div>
                                        <div><label className="block text-xs md:text-[10px] text-red-500 font-bold mb-1 uppercase">Rate (當時匯率)</label><input name="acq_exchangeRate" value={acqExchangeRate} onChange={e=>setAcqExchangeRate(e.target.value)} className="w-full bg-slate-50 border border-red-100 p-3 md:p-2 rounded-lg text-base md:text-sm outline-none font-mono text-right" placeholder="0.051"/></div>
                                    </div>

                                    {/* 港幣成本與海關稅金 */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end w-full">
                                        <div><label className="block text-xs md:text-[10px] text-red-500 font-bold mb-1 uppercase">Port Fee (到港雜費 HKD)</label><div className="flex items-center bg-white border border-red-200 rounded-lg px-2"><span className="text-gray-400 font-mono text-base md:text-sm">$</span><input name="acq_portFee" value={acqPortFee} onChange={e=>setAcqPortFee(formatNumberInput(e.target.value))} className="w-full p-3 md:p-2 text-base md:text-sm outline-none font-mono text-right font-bold"/></div></div>
                                        <div>
                                            <label className="block text-xs md:text-[10px] text-gray-500 font-bold mb-1 uppercase">Cost excl. Tax (未含稅成本)</label>
                                            <div className="bg-gray-100 border border-gray-300 p-3 md:p-2 rounded-lg text-base md:text-sm text-right font-mono font-bold text-gray-600">${acqCostExclTax}</div>
                                        </div>
                                        
                                        <div className="bg-red-50 p-3 md:p-2 rounded-lg border border-red-300 shadow-inner">
                                            <label className="block text-xs md:text-[10px] text-red-600 font-bold mb-1 uppercase">A1 (海關 PRP 費用 HKD)</label>
                                            <input name="acq_a1Price" value={acqA1Price} onChange={e=>setAcqA1Price(formatNumberInput(e.target.value))} className="w-full bg-white border border-red-200 p-2 md:p-1.5 rounded-lg text-base md:text-sm outline-none font-mono text-right font-black text-red-700" placeholder="0"/>
                                        </div>
                                        <div className="bg-red-50 p-3 md:p-2 rounded-lg border border-red-200 shadow-inner">
                                            <label className="block text-xs md:text-[10px] text-red-600 font-bold mb-1 uppercase">FRT (入口稅 HKD)</label>
                                            <input name="acq_frtTax" value={acqFrtTax} readOnly className="w-full bg-transparent border-b border-red-300 p-1 text-base md:text-sm outline-none font-mono text-right font-black text-red-800" placeholder="Auto Calc"/>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row justify-between items-end pt-4 border-t border-red-200 w-full gap-4">
                                        <div className="text-xs font-bold text-red-500/80 bg-red-50 px-3 py-2 rounded-lg border border-red-100 flex items-center">
                                            <Wrench size={14} className="mr-1.5"/>
                                            維修與雜費成本: {formatCurrency(totalExpenses)}
                                        </div>
                                        <div className="text-right w-full sm:w-auto">
                                            <span className="text-xs md:text-[10px] text-red-500 font-bold uppercase block mb-1">Total HKD Cost (港幣總成本)</span>
                                            <div className="flex items-center justify-end bg-white border-2 border-red-200 p-2 rounded-xl shadow-sm">
                                                <span className="text-red-700 font-mono text-2xl mr-1 font-black">$</span>
                                                {/* ★ 智能總計：包含(未含稅成本 + 稅金) 或 (收車價) + 維修雜費 */}
                                                <span className="bg-transparent text-3xl md:text-2xl font-mono font-black text-red-700 text-right w-full sm:w-auto min-w-0">
                                                    {(() => {
                                                        const baseCost = Number(costStr.replace(/,/g, '')) || 0;
                                                        // 解決 JS 浮點數誤差 (0.1+0.2=0.30000000004)
                                                        const finalTotal = Math.round((baseCost + totalExpenses) * 100) / 100;
                                                        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(finalTotal);
                                                    })()}
                                                </span>
                                                {/* 隱藏的 Input 為了給 saveVehicle 讀取 */}
                                                <input type="hidden" name="costPrice" value={Math.round(((Number(costStr.replace(/,/g, '')) || 0) + totalExpenses) * 100) / 100} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* ★★★ 本地收車表單 ★★★ */
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs md:text-[10px] text-red-500 font-bold mb-1 uppercase">Vendor / Prev. Owner</label>
                                        <input name="acq_vendor" list="vendor_list" value={acqVendor} onChange={e => setAcqVendor(e.target.value)} className="w-full bg-white border border-red-200 p-3 md:p-2 rounded-lg md:rounded text-base md:text-sm outline-none focus:ring-2 focus:ring-red-200 shadow-sm min-w-0" placeholder="收車對象名稱"/>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs md:text-[10px] text-red-500 font-bold mb-1 uppercase">Payment Status</label>
                                        <select name="acq_paymentStatus" defaultValue={(v as any).acquisition?.paymentStatus || 'Unpaid'} className="w-full bg-white border border-red-200 p-3 md:p-2 rounded-lg md:rounded text-base md:text-sm outline-none font-bold text-slate-700 shadow-sm min-w-0">
                                            <option value="Unpaid">未付 (Unpaid)</option><option value="Offset">對數抵銷 (Offset)</option><option value="Paid">已結清 (Paid)</option>
                                        </select>
                                    </div>

                                    <div className="bg-red-100/80 p-3 md:p-2 rounded-xl md:rounded border-2 border-red-300 sm:col-span-2 shadow-inner w-full min-w-0 flex flex-col justify-between">
                                        <label className="block text-xs md:text-[10px] text-red-800 font-black mb-1 uppercase">Purchase Price (收車本金 HKD)</label>
                                        <div className="flex items-center mb-2"><span className="text-red-700 font-mono text-xl mr-1 font-black">$</span><input value={costStr} onChange={e=>setCostStr(formatNumberInput(e.target.value))} className="w-full bg-white p-1.5 rounded text-lg outline-none font-mono font-black text-red-800 shadow-sm min-w-0" placeholder="0"/></div>
                                        
                                        <div className="border-t border-red-200/50 pt-2 flex justify-between items-center mt-auto">
                                            <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest">Total HKD Cost (港幣總成本)</span>
                                            <span className="text-red-700 font-mono text-xl font-black">
                                                ${(() => {
                                                    const baseCost = Number(costStr.replace(/,/g, '')) || 0;
                                                    const finalTotal = Math.round((baseCost + totalExpenses) * 100) / 100;
                                                    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(finalTotal);
                                                })()}
                                            </span>
                                            <input type="hidden" name="costPrice" value={Math.round(((Number(costStr.replace(/,/g, '')) || 0) + totalExpenses) * 100) / 100} />
                                        </div>
                                    </div>
                                    
                                    <div className="w-full min-w-0"><label className="block text-xs md:text-[10px] text-red-500 font-bold mb-1 uppercase">Offset Amount (對數 HKD)</label><input name="acq_offsetAmount" defaultValue={formatNumberInput(String((v as any).acquisition?.offsetAmount||''))} className="w-full bg-white border border-red-200 p-3 md:p-2.5 rounded-lg md:rounded text-base md:text-sm outline-none font-mono text-right text-blue-700 font-bold shadow-sm min-w-0" placeholder="$0"/></div>
                                    <div className="w-full min-w-0"><label className="block text-xs md:text-[10px] text-red-500 font-bold mb-1 uppercase">Advance Fee (代支 HKD)</label><input name="acq_advanceFee" defaultValue={formatNumberInput(String((v as any).acquisition?.advanceFee||''))} className="w-full bg-white border border-red-200 p-3 md:p-2.5 rounded-lg md:rounded text-base md:text-sm outline-none font-mono text-right shadow-sm min-w-0" placeholder="$0" title="例如代支留牌費等"/></div>
                                </div>
                            )}
                            
                            {/* ★★★ 進貨付款紀錄 (Outgoing Payments) ★★★ */}
                            <div className="mt-6 border-t border-red-200 pt-5 md:pt-4 w-full">
                                <h4 className="font-bold text-base md:text-xs text-red-800 mb-4 md:mb-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                    <span>付款紀錄 (Acquisition Payments)</span>
                                    <div className="flex gap-3 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-red-100">
                                        <span className="text-slate-600 font-mono text-sm md:text-xs font-bold">已付: {formatCurrency(totalAcqPaid)}</span>
                                        <span className="text-red-600 font-black font-mono text-sm md:text-xs">未付尾數: {formatCurrency(acqBalance)}</span>
                                    </div>
                                </h4>
                                
                                <div className="space-y-3 md:space-y-2 mb-4 w-full">
                                    {acqPayments.map((p: any) => (
                                        <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-2 text-sm md:text-xs p-3 md:p-2 bg-white border border-red-200 rounded-lg shadow-sm relative">
                                            <div className="flex flex-wrap items-center gap-2 md:flex-1 min-w-0">
                                                <span className="text-gray-500 font-mono w-full sm:w-auto font-bold">{p.date}</span>
                                                <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-md text-[10px] font-black flex-shrink-0">{p.method}</span>
                                                <span className="text-gray-600 flex-1 truncate w-full sm:w-auto mt-1 sm:mt-0 font-medium">{p.note || '-'}</span>
                                            </div>
                                            <div className="flex items-center justify-between md:justify-end gap-4 md:w-auto flex-shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                                                <span className="font-mono font-black text-red-700 text-lg md:text-sm">{formatCurrency(p.amount)}</span>
                                                <button type="button" onClick={() => handleDeleteAcqPayment(p.id)} className="text-red-400 hover:text-white bg-red-50 hover:bg-red-500 p-2 md:p-1.5 rounded-md flex-shrink-0 transition-colors"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    ))}
                                    {acqPayments.length === 0 && <div className="text-center text-sm md:text-xs text-gray-400 py-4 border-2 border-dashed rounded-lg bg-white/50 font-bold">尚無付款紀錄</div>}
                                </div>

                                {/* 新增進貨付款 */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3 md:gap-2 pt-2 w-full">
                                    <input type="date" value={newAcqPayment.date} onChange={e => setNewAcqPayment({...newAcqPayment, date: e.target.value})} className="w-full lg:w-32 text-sm md:text-xs p-3 md:p-2 border border-red-200 rounded-lg outline-none bg-white font-bold min-w-0"/>
                                    <select value={newAcqPayment.method} onChange={e => setNewAcqPayment({...newAcqPayment, method: e.target.value})} className="w-full lg:w-28 text-sm md:text-xs p-3 md:p-2 border border-red-200 rounded-lg outline-none bg-white font-black text-red-700 min-w-0">
                                        <option value="Cash">現金</option><option value="Cheque">支票</option><option value="Transfer">轉帳</option><option value="USDT">USDT</option>
                                    </select>
                                    <input type="text" placeholder="付款備註..." value={newAcqPayment.note} onChange={e => setNewAcqPayment({...newAcqPayment, note: e.target.value})} className="w-full sm:col-span-2 lg:flex-1 text-sm md:text-xs p-3 md:p-2 border border-red-200 rounded-lg outline-none bg-white min-w-0"/>
                                    
                                    <div className="w-full sm:col-span-2 lg:w-auto lg:flex-none flex flex-col sm:flex-row gap-3 md:gap-2 mt-1 sm:mt-0">
                                        <input type="text" placeholder="$ 金額" value={newAcqPayment.amount} onChange={e => setNewAcqPayment({...newAcqPayment, amount: formatNumberInput(e.target.value)})} className="w-full sm:flex-1 lg:w-32 text-lg md:text-sm p-3 md:p-2 border border-red-300 rounded-lg outline-none bg-white text-right font-mono font-black text-red-600 shadow-inner min-w-0"/>
                                        <button type="button" onClick={handleAddAcqPayment} className="w-full sm:w-auto bg-red-700 text-white text-sm md:text-xs p-3 md:px-5 rounded-lg hover:bg-red-800 font-bold active:scale-95 transition-transform whitespace-nowrap shadow-md">新增付款</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 車輛維修與雜費 (Expenses) */}
                        <div className="bg-gray-50 p-4 md:p-5 rounded-xl border border-gray-200 mt-6 shadow-sm w-full">
                            <h4 className="font-bold text-base md:text-sm text-gray-800 mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                <span>車輛維修與其他費用 (Expenses)</span>
                                <span className="text-slate-700 bg-white border border-slate-300 px-4 py-1.5 rounded-full text-xs shadow-sm w-fit">總支出: {formatCurrency(totalExpenses)}</span>
                            </h4>
                            
                            <div className="space-y-3 md:space-y-2 mb-4 w-full">
                                {(v.expenses || []).map((exp: any) => (
                                    <div key={exp.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-2 text-sm md:text-xs p-3 md:p-2.5 bg-white border rounded-lg shadow-sm relative">
                                        <div className="flex flex-wrap items-center gap-3 md:flex-1 min-w-0">
                                            <span className="text-gray-400 font-mono w-full sm:w-auto font-bold">{exp.date}</span>
                                            <span className="font-black text-slate-800 bg-slate-100 px-2 py-1 rounded-md">{exp.type}</span>
                                            <span className="text-gray-600 flex-1 truncate w-full sm:w-auto font-medium">{exp.company}</span>
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end gap-4 md:w-auto flex-shrink-0 border-t md:border-t-0 pt-2 md:pt-0 w-full md:w-auto">
                                            <span className="font-mono font-black text-lg md:text-base text-slate-700">{formatCurrency(exp.amount)}</span>
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => handleToggleExpenseStatus(exp)} className={`px-3 py-1.5 md:py-1 rounded-md text-[10px] md:text-[9px] font-black border transition-colors shadow-sm ${exp.status === 'Paid' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-50 text-red-600 border-red-200'}`}>{exp.status === 'Paid' ? '已付' : '未付'}</button>
                                                <button type="button" onClick={() => handleDeleteExpenseClick(exp.id)} className="text-gray-400 hover:text-white bg-gray-100 hover:bg-red-500 p-2 md:p-1.5 rounded-md flex-shrink-0 transition-colors"><X size={16}/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {/* 唯讀的中港業務代辦費 */}
                                {(v.crossBorder?.tasks || []).filter((t:any) => t.fee > 0).map((task: any) => (
                                    <div key={`cb-${task.id}`} className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-sm md:text-xs p-3 md:p-2.5 bg-blue-50/50 border border-blue-200 rounded-lg shadow-sm text-blue-900">
                                        <div className="flex items-center gap-3 md:flex-1 min-w-0">
                                            <span className="text-blue-400 font-mono w-20 md:w-24 flex-shrink-0 font-bold">{task.date}</span>
                                            <span className="font-black flex items-center bg-blue-100/50 px-2 py-1 rounded-md"><Globe size={12} className="mr-1 flex-shrink-0 text-blue-500"/>{task.item}</span>
                                            <span className="text-blue-600/80 flex-1 truncate font-medium">中港代辦費</span>
                                        </div>
                                        <div className="flex items-center justify-end gap-4 md:w-auto flex-shrink-0 w-full md:w-auto">
                                            <span className="font-mono font-black text-lg md:text-base text-blue-800">{formatCurrency(task.fee)}</span>
                                            <div className="w-16 md:w-14"></div> {/* 佔位 */}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 新增費用 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3 md:gap-2 pt-4 border-t border-gray-300 w-full">
                                <input type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full lg:w-32 text-sm md:text-xs p-3 md:p-2 border rounded-lg outline-none bg-white font-bold text-slate-700 min-w-0"/>
                                <select value={newExpense.type} onChange={handleExpenseTypeChange} className="w-full lg:w-32 text-sm md:text-xs p-3 md:p-2 border rounded-lg outline-none bg-white font-bold text-slate-800 min-w-0"><option value="">選項目...</option>{settings.expenseTypes.map((t: any, i: number) => { const name = typeof t === 'string' ? t : t.name; return <option key={i} value={name}>{name}</option>; })}</select>
                                <select value={newExpense.company} onChange={e => setNewExpense({...newExpense, company: e.target.value})} className="w-full sm:col-span-2 lg:flex-1 text-sm md:text-xs p-3 md:p-2 border rounded-lg outline-none bg-white font-bold text-slate-700 min-w-0"><option value="">選公司 / 車房...</option>{settings.expenseCompanies?.map((c: string)=><option key={c} value={c}>{c}</option>)}</select>
                                
                                <div className="w-full sm:col-span-2 lg:w-auto lg:flex-none flex flex-col sm:flex-row gap-3 md:gap-2 mt-1 sm:mt-0">
                                    <input type="text" placeholder="$ 金額" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: formatNumberInput(e.target.value)})} className="w-full sm:flex-1 lg:w-32 text-lg md:text-sm p-3 md:p-2 border border-red-200 rounded-lg outline-none bg-white text-right font-mono font-bold text-red-600 shadow-inner min-w-0"/>
                                    <button type="button" onClick={handleAddExpenseClick} className="w-full sm:w-auto bg-slate-800 text-white text-sm md:text-xs p-3 md:px-5 rounded-lg hover:bg-slate-900 font-bold active:scale-95 transition-transform whitespace-nowrap shadow-md">記一筆支出</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ===== Tab 4: 維修與保養 (Service & Maintenance) ===== */}
                    <div className={`${rightTab === 'service' ? 'block' : 'hidden'} space-y-6 animate-fade-in w-full pb-10`}>
                        
                        {/* 1. 保固與保險 */}
                        <div className="bg-orange-50/40 p-4 md:p-5 rounded-xl border border-orange-200 shadow-sm w-full">
                            <h3 className="font-bold text-orange-800 text-base md:text-sm mb-4 flex items-center"><ShieldCheck size={18} className="mr-2"/> 保固與車輛保險 (Warranty & Insurance)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs md:text-[10px] text-orange-600 font-bold uppercase mb-1">保養條款 (Warranty Terms)</label>
                                    <input name="warrantyType" list="warranty_list" defaultValue={v.warrantyType} placeholder="例如: 5年/10萬公里 (原廠)" className="w-full p-3 md:p-2 border border-orange-200 rounded-lg text-sm outline-none focus:ring-2 ring-orange-300 font-bold text-slate-700 shadow-sm"/>
                                    <datalist id="warranty_list">
                                        {((settings.warrantyTypes && settings.warrantyTypes.length > 0) ? settings.warrantyTypes : [
                                            '5年/10萬公里 (原廠全車)',
                                            '8年/16萬公里 高壓電池 (原廠 EV)',
                                            '3年/15萬公里 (寶馬原廠)',
                                            '2年不限里程 (平治/保時捷原廠)',
                                            '10年/25萬公里 高壓電池 (平治 EQE/EQS)',
                                            '4年/8萬公里 (Tesla 原廠)',
                                            '8年/19.2萬公里 高壓電池 (Tesla LR/Perf)',
                                            '電池終身保養 (BYD 原廠)',
                                            '不設保養 (No Warranty)'
                                        ]).map((w: string) => <option key={w} value={w}>{w}</option>)}
                                    </datalist>
                                </div>
                                <div className="bg-white p-3 md:p-2 rounded-lg border border-orange-200 shadow-inner group">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-xs md:text-[10px] text-orange-600 font-bold uppercase flex items-center">
                                            車輛保險到期日 (Insurance Expiry)
                                            <Bell size={10} className={`ml-1 ${v.insuranceReminderEnabled !== false ? 'text-orange-500 animate-pulse' : 'text-gray-300'}`} />
                                        </label>
                                        <label className="flex items-center cursor-pointer relative z-10" title={v.insuranceReminderEnabled !== false ? "提醒已開啟" : "不作提醒"}>
                                            <input type="hidden" name="insuranceReminderEnabled" value={v.insuranceReminderEnabled !== false ? 'true' : 'false'} />
                                            <input type="checkbox" className="sr-only peer" defaultChecked={v.insuranceReminderEnabled !== false} onChange={(e) => { const h = e.target.previousElementSibling as HTMLInputElement; if(h) h.value = e.target.checked?'true':'false'; }}/>
                                            <div className="w-5 h-3 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-orange-500 shadow-inner peer-checked:after:translate-x-full after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all"></div>
                                        </label>
                                    </div>
                                    <input type="date" name="insuranceExpiry" defaultValue={v.insuranceExpiry} className="w-full bg-transparent text-base md:text-sm font-mono outline-none font-bold text-slate-800"/>
                                </div>
                            </div>
                        </div>

                        {/* 2. 維修紀錄 (雙軌收支) */}
                            <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm w-full">
                                <h3 className="font-bold text-slate-800 text-base md:text-sm mb-4 flex items-center justify-between">
                                    <div className="flex items-center"><Wrench size={18} className="mr-2 text-slate-600"/> 維修與服務紀錄 (Service Records)</div>
                                </h3>
                                
                                {/* ★ 升級：自動分流「進行中」與「歷史歸檔」 */}
                                <div className="space-y-6 mb-6">
                                    {(() => {
                                        const allMaint = v.maintenanceRecords || [];
                                        
                                        // ★ 痛點 1 完美修復：智能結清判斷！
                                        // 如果成本係 0 (或者無填)，系統自動當佢已經找清；收費同理。
                                        // 只有真正要畀/要收嘅錢都變成 'Paid'，先會跌入歷史區！
                                        const isSettled = (m: any) => {
                                            const costOk = !m.cost || Number(m.cost) === 0 || m.costStatus === 'Paid';
                                            const chargeOk = !m.charge || Number(m.charge) === 0 || m.chargeStatus === 'Paid';
                                            return costOk && chargeOk;
                                        };

                                        const pendingMaint = allMaint.filter((m: any) => !isSettled(m));
                                        const historyMaint = allMaint.filter((m: any) => isSettled(m));

                                        // 共用渲染函數 (Render Card)
                                        const renderMaintCard = (m: any, isHistory: boolean) => {
                                            const isEditing = editingMaintenanceId === m.id;
                                            if (isEditing && !isHistory) {
                                                return (
                                                    <div key={m.id} className="flex flex-col md:flex-row gap-2 p-3 bg-blue-50 border border-blue-300 rounded-lg shadow-md animate-fade-in">
                                                        <input type="date" value={editMaintenanceForm.date} onChange={e => setEditMaintenanceForm({...editMaintenanceForm, date: e.target.value})} className="text-xs p-2 border rounded outline-none w-full md:w-32 font-bold"/>
                                                        <input type="text" value={editMaintenanceForm.item} onChange={e => setEditMaintenanceForm({...editMaintenanceForm, item: e.target.value})} className="text-xs p-2 border rounded outline-none flex-1 font-bold"/>
                                                        <input type="text" value={editMaintenanceForm.vendor} onChange={e => setEditMaintenanceForm({...editMaintenanceForm, vendor: e.target.value})} className="text-xs p-2 border rounded outline-none w-full md:w-32"/>
                                                        <div className="flex items-center gap-2 w-full md:w-auto">
                                                            <div className="relative"><span className="absolute -top-3 left-1 text-[8px] text-red-500 font-bold">成本</span><input type="text" value={editMaintenanceForm.cost} onChange={e => setEditMaintenanceForm({...editMaintenanceForm, cost: formatNumberInput(e.target.value)})} className="text-xs p-2 border rounded outline-none w-24 text-red-600 font-mono text-right"/></div>
                                                            <div className="relative"><span className="absolute -top-3 left-1 text-[8px] text-blue-500 font-bold">收費</span><input type="text" value={editMaintenanceForm.charge} onChange={e => setEditMaintenanceForm({...editMaintenanceForm, charge: formatNumberInput(e.target.value)})} className="text-xs p-2 border rounded outline-none w-24 text-blue-600 font-mono text-right"/></div>
                                                            {/* ★ 痛點 2 修復：加入 e.preventDefault() 攔截表單閃退 */}
                                                            <button type="button" onClick={(e) => { e.preventDefault(); saveEditMaintenance(); }} className="bg-green-500 text-white p-2 rounded hover:bg-green-600 shadow-sm"><Check size={14}/></button>
                                                            <button type="button" onClick={(e) => { e.preventDefault(); setEditingMaintenanceId(null); }} className="bg-gray-400 text-white p-2 rounded hover:bg-gray-500 shadow-sm"><X size={14}/></button>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={m.id} className={`flex flex-col md:flex-row justify-between gap-3 p-3 rounded-lg shadow-sm transition-colors border ${isHistory ? 'bg-slate-100/50 border-slate-200 opacity-70 hover:opacity-100' : 'bg-slate-50 border-slate-200 hover:border-blue-200'}`}>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-gray-500 font-mono text-xs font-bold">{m.date}</span>
                                                            <span className="font-bold text-slate-800 text-sm">{m.item}</span>
                                                            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px]">{m.vendor || '自理'}</span>
                                                        </div>
                                                        {m.note && <div className="text-xs text-gray-500 truncate">{m.note}</div>}
                                                    </div>
                                                    <div className="flex items-center gap-4 md:border-l md:pl-4 border-t md:border-t-0 pt-2 md:pt-0">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[9px] text-red-500 font-bold uppercase">成本 (給車房)</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-bold text-red-600">{formatCurrency(m.cost || 0)}</span>
                                                                {/* ★ 痛點 2 修復：攔截按鈕預設行為 */}
                                                                <button type="button" onClick={(e) => { e.preventDefault(); toggleMaintenanceStatus(m, 'costStatus'); }} className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors ${m.costStatus === 'Paid' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-50 text-red-600 border-red-200'}`}>{m.costStatus === 'Paid' ? '已付' : '未付'}</button>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[9px] text-blue-500 font-bold uppercase">收費 (對客收)</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-black text-blue-700">{formatCurrency(m.charge || 0)}</span>
                                                                {/* ★ 痛點 2 修復：攔截按鈕預設行為 */}
                                                                <button type="button" onClick={(e) => { e.preventDefault(); toggleMaintenanceStatus(m, 'chargeStatus'); }} className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors ${m.chargeStatus === 'Paid' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>{m.chargeStatus === 'Paid' ? '已收' : '未收'}</button>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center border-l pl-2 ml-2">
                                                            {!isHistory && <button type="button" onClick={(e) => { e.preventDefault(); startEditMaintenance(m); }} className="text-blue-400 hover:text-blue-600 p-1"><Edit size={14}/></button>}
                                                            <button type="button" onClick={(e) => { e.preventDefault(); handleDeleteMaintenance(m.id); }} className="text-gray-400 hover:text-red-500 p-1 ml-1"><Trash2 size={16}/></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        };

                                        return (
                                            <>
                                                {/* 進行中區域 */}
                                                <div className="space-y-3">
                                                    {pendingMaint.length > 0 ? pendingMaint.map((m: any) => renderMaintCard(m, false)) : (
                                                        <div className="text-center text-xs text-gray-400 py-6 border-2 border-dashed rounded-lg bg-slate-50">目前無待處理的維修項目</div>
                                                    )}
                                                </div>

                                                {/* 歷史歸檔區域 (摺疊式) */}
                                                {historyMaint.length > 0 && (
                                                    <details className="group bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mt-6">
                                                        <summary className="p-3 text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100 list-none flex items-center justify-between outline-none">
                                                            <span className="flex items-center"><History size={14} className="mr-2"/> 查看歷史歸檔紀錄 ({historyMaint.length} 筆)</span>
                                                            <ChevronDown size={16} className="transition-transform group-open:rotate-180"/>
                                                        </summary>
                                                        <div className="p-3 pt-0 space-y-2 border-t border-slate-200 mt-2">
                                                            {historyMaint.map((m: any) => renderMaintCard(m, true))}
                                                        </div>
                                                    </details>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* 新增維修 */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 w-full">
                                    <div className="text-xs font-bold text-slate-600 mb-3">新增紀錄 (New Service)</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                                        <input type="date" value={newMaintenance.date} onChange={e => setNewMaintenance({...newMaintenance, date: e.target.value})} className="w-full text-sm p-2 border rounded-lg outline-none bg-white font-bold text-slate-700"/>
                                        
                                        {/* ★ 維修項目下拉與手動輸入 */}
                                        <div className="w-full lg:col-span-2">
                                            <input list="maint_item_list" placeholder="維修/服務項目 (下拉選擇或手動輸入)..." value={newMaintenance.item} onChange={e => setNewMaintenance({...newMaintenance, item: e.target.value})} className="w-full text-sm p-2 border rounded-lg outline-none bg-white font-bold text-slate-800"/>
                                            <datalist id="maint_item_list">
                                                {settings.expenseTypes.map((t: any, i: number) => { const name = typeof t === 'string' ? t : t.name; return <option key={i} value={name}>{name}</option>; })}
                                            </datalist>
                                        </div>
                                        
                                        {/* ★ 車房下拉與手動輸入 */}
                                        <div className="w-full">
                                            <input list="maint_vendor_list" placeholder="車房 / 代理名稱" value={newMaintenance.vendor} onChange={e => setNewMaintenance({...newMaintenance, vendor: e.target.value})} className="w-full text-sm p-2 border rounded-lg outline-none bg-white"/>
                                            <datalist id="maint_vendor_list">
                                                {settings.expenseCompanies?.map((c: string) => <option key={c} value={c}>{c}</option>)}
                                            </datalist>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                                        <div className="lg:col-span-2 relative">
                                            <span className="absolute top-[-16px] left-1 text-[10px] text-red-500 font-bold uppercase">成本 (給車房)</span>
                                            <input type="text" placeholder="$ 成本金額" value={newMaintenance.cost} onChange={e => setNewMaintenance({...newMaintenance, cost: formatNumberInput(e.target.value)})} className="w-full text-sm p-2 border border-red-200 rounded-lg outline-none bg-red-50/50 text-right font-mono font-bold text-red-600"/>
                                        </div>
                                        <div className="lg:col-span-2 relative">
                                            <span className="absolute top-[-16px] left-1 text-[10px] text-blue-500 font-bold uppercase">收費 (對客收)</span>
                                            <input type="text" placeholder="$ 收費金額" value={newMaintenance.charge} onChange={e => setNewMaintenance({...newMaintenance, charge: formatNumberInput(e.target.value)})} className="w-full text-sm p-2 border border-blue-200 rounded-lg outline-none bg-blue-50/50 text-right font-mono font-bold text-blue-700"/>
                                        </div>
                                        <button type="button" onClick={handleAddMaintenance} className="w-full bg-slate-800 text-white text-sm py-2 px-4 rounded-lg hover:bg-slate-900 font-bold active:scale-95 transition-transform shadow-md">新增紀錄</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    
                    {/* ===== Tab 3: 中港車管家 (Cross-Border) ===== */}
                    <div className={`${rightTab === 'cb' ? 'block' : 'hidden'} animate-fade-in pb-10 w-full`}>
                        <div className="border-2 border-blue-200 rounded-2xl overflow-hidden bg-white shadow-md w-full">
                            <div className="bg-blue-50/80 p-4 md:p-5 flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-blue-200 gap-3">
                                <div className="flex items-center gap-2"><Globe size={24} className="text-blue-600"/><span className="font-black text-lg text-blue-900">中港車管家 (Cross-Border)</span></div>
                                <label className="flex items-center justify-center text-sm font-bold text-blue-700 cursor-pointer bg-white px-4 py-2.5 md:py-1.5 rounded-xl md:rounded-lg border-2 border-blue-300 shadow-sm hover:bg-blue-50 active:scale-95 transition-transform w-full sm:w-auto">
                                    <input type="checkbox" name="cb_isEnabled" checked={cbEnabled} onChange={e => setCbEnabled(e.target.checked)} className="mr-2 accent-blue-600 w-5 h-5 md:w-4 md:h-4"/> 
                                    啟用中港資料模組
                                </label>
                            </div>
                            
                            {cbEnabled ? (
                                <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 animate-fade-in bg-slate-50/30 w-full">
                                    <div className="col-span-1 w-full min-w-0"><label className="text-xs md:text-[10px] text-blue-800 font-black uppercase tracking-wider mb-1 block">Mainland Plate</label><input name="cb_mainlandPlate" defaultValue={v.crossBorder?.mainlandPlate} className="w-full bg-white border border-blue-200 rounded-lg p-3 md:p-2 text-base md:text-sm font-bold font-mono focus:ring-2 focus:ring-blue-300 outline-none shadow-sm" placeholder="粵Z..."/></div>
                                    <div className="col-span-1 w-full min-w-0"><label className="text-xs md:text-[10px] text-blue-800 font-black uppercase tracking-wider mb-1 block">Quota No. (指標號)</label><input name="cb_quotaNumber" defaultValue={v.crossBorder?.quotaNumber} className="w-full bg-white border border-blue-200 rounded-lg p-3 md:p-2 text-base md:text-sm font-bold font-mono focus:ring-2 focus:ring-blue-300 outline-none shadow-sm"/></div>
                                    <div className="col-span-1 sm:col-span-2 md:col-span-1 w-full min-w-0"><label className="text-xs md:text-[10px] text-blue-800 font-black uppercase tracking-wider mb-1 block">HK Company</label><input name="cb_hkCompany" defaultValue={v.crossBorder?.hkCompany} className="w-full bg-white border border-blue-200 rounded-lg p-3 md:p-2 text-base md:text-sm font-bold focus:ring-2 focus:ring-blue-300 outline-none shadow-sm"/></div>
                                    <div className="col-span-1 sm:col-span-2 md:col-span-1 w-full min-w-0"><label className="text-xs md:text-[10px] text-blue-800 font-black uppercase tracking-wider mb-1 block">Mainland Company</label><input name="cb_mainlandCompany" defaultValue={v.crossBorder?.mainlandCompany} className="w-full bg-white border border-blue-200 rounded-lg p-3 md:p-2 text-base md:text-sm font-bold focus:ring-2 focus:ring-blue-300 outline-none shadow-sm"/></div>
                                    
                                    <div className="col-span-1 sm:col-span-2 md:col-span-1 mt-2 md:mt-0 w-full min-w-0"><label className="text-xs md:text-[10px] text-indigo-700 font-black uppercase tracking-wider mb-1 block">Driver 1 (主司機)</label><input name="cb_driver1" defaultValue={v.crossBorder?.driver1} className="w-full bg-indigo-50 border border-indigo-200 rounded-lg p-3 md:p-2 text-base md:text-sm font-bold focus:ring-2 focus:ring-indigo-300 outline-none shadow-sm"/></div>
                                    <div className="col-span-1 w-full min-w-0"><label className="text-xs md:text-[10px] text-indigo-700 font-black uppercase tracking-wider mb-1 block">Driver 2</label><input name="cb_driver2" defaultValue={v.crossBorder?.driver2} className="w-full bg-indigo-50 border border-indigo-200 rounded-lg p-3 md:p-2 text-base md:text-sm font-bold focus:ring-2 focus:ring-indigo-300 outline-none shadow-sm"/></div>
                                    <div className="col-span-1 w-full min-w-0"><label className="text-xs md:text-[10px] text-indigo-700 font-black uppercase tracking-wider mb-1 block">Driver 3</label><input name="cb_driver3" defaultValue={v.crossBorder?.driver3} className="w-full bg-indigo-50 border border-indigo-200 rounded-lg p-3 md:p-2 text-base md:text-sm font-bold focus:ring-2 focus:ring-indigo-300 outline-none shadow-sm"/></div>
                                    <div className="col-span-1 w-full min-w-0"><label className="text-xs md:text-[10px] text-emerald-700 font-black uppercase tracking-wider mb-1 block">Insurance Agent</label><input name="cb_insuranceAgent" defaultValue={v.crossBorder?.insuranceAgent} className="w-full bg-emerald-50 border border-emerald-200 rounded-lg p-3 md:p-2 text-base md:text-sm font-bold focus:ring-2 focus:ring-emerald-300 outline-none shadow-sm"/></div>
                                    
                                    <div className="col-span-1 sm:col-span-2 md:col-span-4 mt-6 pt-5 border-t-2 border-dashed border-blue-200 w-full min-w-0">
                                        <label className="text-sm md:text-xs text-blue-900 font-black mb-3 block flex items-center bg-blue-100 w-fit px-3 py-1 rounded-full"><MapPin size={16} className="mr-1.5"/> 通行口岸 (Ports)</label>
                                        <div className="flex flex-wrap gap-x-4 gap-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm w-full">
                                            {[...HK_PORTS, ...MO_PORTS].map(port => (
                                                <label key={port} className="flex items-center text-sm md:text-xs font-bold text-slate-700 cursor-pointer hover:bg-blue-50 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 shadow-sm transition-colors">
                                                    <input type="checkbox" name={`cb_port_${port}`} defaultChecked={v.crossBorder?.ports?.includes(port)} className="mr-2 w-4 h-4 md:w-3.5 md:h-3.5 accent-blue-600"/> 
                                                    {port}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="col-span-1 sm:col-span-2 md:col-span-4 mt-6 pt-5 border-t-2 border-dashed border-blue-200 w-full min-w-0">
                                        <label className="text-sm md:text-xs text-red-700 font-black mb-3 block flex items-center bg-red-100 w-fit px-3 py-1 rounded-full"><CalendarDays size={16} className="mr-1.5"/> 證件到期日追蹤 (Expiry Dates)</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 md:gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm w-full">
                                            {Object.entries(cbDateMap).map(([key, label]) => {
                                                // ★ 動態判斷每個項目的提醒開關狀態 (預設為 true)
                                                const reminderKey = `cb_remind_${key}`;
                                                const isRemind = (v.crossBorder as any)?.[reminderKey] !== false;

                                                return (
                                                    <div key={key} className="bg-slate-50 p-3 md:p-2 rounded-xl md:rounded-lg border border-slate-200 hover:border-red-300 transition-colors focus-within:ring-2 ring-red-100 shadow-inner w-full min-w-0 group relative">
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <label className="flex items-center text-xs md:text-[10px] text-slate-500 font-bold truncate">
                                                                {label}
                                                                <Bell size={10} className={`ml-1 flex-shrink-0 ${isRemind ? 'text-red-500 animate-pulse' : 'text-gray-300'}`} />
                                                            </label>
                                                            
                                                            {/* 小巧的開關 Toggle */}
                                                            <label className="flex items-center cursor-pointer relative z-10" title={isRemind ? "提醒已開啟" : "不作提醒"}>
                                                                <div className="relative">
                                                                    <input type="hidden" name={reminderKey} value={isRemind ? 'true' : 'false'} />
                                                                    <input 
                                                                        type="checkbox" 
                                                                        className="sr-only peer"
                                                                        defaultChecked={isRemind} 
                                                                        onChange={(e) => {
                                                                            const hiddenInput = e.target.previousElementSibling as HTMLInputElement;
                                                                            if (hiddenInput) hiddenInput.value = e.target.checked ? 'true' : 'false';
                                                                            const bellIcon = e.target.closest('.group')?.querySelector('.lucide-bell');
                                                                            if (bellIcon) {
                                                                                if (e.target.checked) {
                                                                                    bellIcon.classList.add('text-red-500', 'animate-pulse');
                                                                                    bellIcon.classList.remove('text-gray-300');
                                                                                } else {
                                                                                    bellIcon.classList.remove('text-red-500', 'animate-pulse');
                                                                                    bellIcon.classList.add('text-gray-300');
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                    <div className="w-5 h-3 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-red-500 shadow-inner"></div>
                                                                </div>
                                                            </label>
                                                        </div>
                                                        <input type="date" name={`cb_date${key}`} defaultValue={(v.crossBorder as any)?.[`date${key}`]} className="w-full bg-transparent text-sm md:text-xs font-mono outline-none font-bold text-slate-800"/>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-12 text-center text-blue-400/60 bg-slate-50 flex flex-col items-center w-full">
                                    <Globe size={64} className="mb-4 opacity-50"/>
                                    <p className="text-lg font-black text-blue-900/50 mb-2">中港車管家目前處於停用狀態</p>
                                    <p className="text-sm text-blue-800/40">如需管理兩地牌、司機及通關口岸，請勾選上方的「啟用」按鈕</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 底部儲存列 (吸底設計) */}
                <div className="p-4 border-t border-slate-300 bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.05)] flex flex-col md:flex-row justify-between gap-4 items-start md:items-center flex-none w-full z-20 overflow-x-hidden">
                    <div className="w-full md:flex-1 max-w-2xl min-w-0">
                        <input name="remarks" defaultValue={v.remarks} placeholder="內部營運備註 (Internal Remarks)..." className="w-full text-sm md:text-xs p-3 md:p-2.5 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-400 bg-slate-50 font-mono font-bold text-slate-700"/>
                    </div>
                    
                    {/* 關聯單據跳轉按鈕 */}
                    {v.id && (
                        <div className="flex flex-col gap-1 w-full md:w-auto md:mr-auto min-w-0">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Related Docs (關聯單據):</span>
                            <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide max-w-full md:max-w-[300px]">
                                {(() => {
                                    const relatedDocs = allSalesDocs?.filter((d: any) => d.formData?.regMark === v.regMark) || [];
                                    if (relatedDocs.length === 0) return <span className="text-[10px] text-gray-400 font-bold bg-slate-100 px-2 py-1 rounded-md whitespace-nowrap">尚無單據</span>;

                                    return relatedDocs.map((doc: any) => {
                                        const typeMap: Record<string, string> = { 'sales_contract': '合約', 'purchase_contract': '收車', 'consignment_contract': '寄賣', 'invoice': '發票', 'receipt': '收據' };
                                        const typeLabel = typeMap[doc.type] || '單據';
                                        const dateStr = doc.updatedAt?.seconds ? new Date(doc.updatedAt.seconds * 1000).toLocaleDateString() : 'N/A';
                                        return (
                                            <button key={doc.id} type="button" onClick={() => onJumpToDoc(doc)} className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold hover:bg-blue-100 flex items-center transition-colors flex-shrink-0 shadow-sm active:scale-95 whitespace-nowrap" title={doc.summary}>
                                                <FileText size={12} className="mr-1 flex-shrink-0"/> {typeLabel} ({dateStr})
                                            </button>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end mt-2 md:mt-0 flex-none">
                        <button type="button" onClick={handleClose} className="w-full md:w-auto px-6 py-3 md:py-2.5 text-sm font-bold text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-xl transition-colors">取消</button>
                        <button type="submit" className="w-full md:w-auto px-8 py-3 md:py-2.5 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-black text-sm md:text-base rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all transform active:scale-95 flex items-center justify-center whitespace-nowrap"><Save size={20} className="mr-2"/> 儲存變更</button>
                    </div>
                </div>
            </div>

            {/* 圖片放大預覽 Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setPreviewImage(null)}>
                    <img src={previewImage} className="max-w-full max-h-full object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
                    <button type="button" onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 text-white p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-50">
                        <X size={28}/>
                    </button>
                </div>
            )}

          </form>
        </div>
      </div>
    );
};

export default VehicleFormModal;
