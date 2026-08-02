'use client';

import React, { useState } from 'react';
import { 
  Layout, FileCheck, Plus, Search, X, ChevronDown, 
  Globe, Database, RefreshCw, CheckCircle, Car, Check, Building2, 
  Calendar, Share2, Trash2 
} from 'lucide-react';
import { 
  Vehicle, DatabaseEntry, SystemSettings, Payment, CrossBorderTask 
} from '@/types';
import { 
  PORTS_HK_GD, PORTS_MO_GD 
} from '@/config/constants';
import { 
  Firestore, doc, updateDoc 
} from 'firebase/firestore';

import SmartNewsTicker from '@/components/SmartNewsTicker';
import SmartNotificationCenter from '@/components/SmartNotificationCenter';

// --- 輔助格式化工具 ---
const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', maximumFractionDigits: 0 }).format(amount || 0);

// 計算日期剩餘天數
const getDaysRemaining = (targetDate?: string) => {
  if (!targetDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export interface DashboardModuleProps {
  inventory: Vehicle[];
  dbEntries: DatabaseEntry[];
  settings: SystemSettings;
  staffId: string;
  currentUser: any;
  stats: {
    totalStockValue: number;
    totalReceivable: number;
    totalPayable: number;
    totalSoldThisMonth: number;
  };
  primaryImages: Record<string, string>;
  unpaidCompanyExpenses: any[];
  loopReminders: any[];
  setActiveTab: (tab: any) => void;
  setEditingVehicle: (v: Vehicle | null) => void;
  setActiveCbVehicleId: (id: string | null) => void;
  setEditingEntry: (e: DatabaseEntry | null) => void;
  setIsDbEditing: (edit: boolean) => void;
  setShareVehicle: (v: Vehicle | null) => void;
  setShareCleanMode: (clean: boolean) => void;
  deleteVehicle: (id: string) => void;
  db: Firestore | null;
  appId: string;
  triggerSmartPrint: (htmlContent: string, title?: string) => void;
}

export default function DashboardModule({
  inventory,
  dbEntries,
  settings,
  staffId,
  currentUser,
  stats,
  primaryImages,
  unpaidCompanyExpenses,
  loopReminders,
  setActiveTab,
  setEditingVehicle,
  setActiveCbVehicleId,
  setEditingEntry,
  setIsDbEditing,
  setShareVehicle,
  setShareCleanMode,
  deleteVehicle,
  db,
  appId,
  triggerSmartPrint,
}: DashboardModuleProps) {
  // --- 內部狀態 ---
  const [isAlertExpanded, setIsAlertExpanded] = useState(false);
  const [dashMobileTab, setDashMobileTab] = useState<'instock' | 'action'>('instock');
  const [dashSearchInStock, setDashSearchInStock] = useState('');
  const [dashSearchAction, setDashSearchAction] = useState('');

  // ============================================================================
  // 1. 戰情警報數據過濾 (Alerts Filtering)
  // ============================================================================
  const docAlerts: any[] = [];
  dbEntries.forEach(d => {
    if (d.reminderEnabled && d.expiryDate) {
      const days = getDaysRemaining(d.expiryDate);
      if (days !== null && days <= 30) {
        docAlerts.push({ id: d.id, title: d.name, desc: d.docType || '文件', date: d.expiryDate, days, status: days < 0 ? 'expired' : 'soon', raw: d, source: 'database' });
      }
    }
    if (d.customReminders && d.customReminders.length > 0) {
      d.customReminders.forEach((rem: any) => {
        if (rem.expiryDate) {
          const days = getDaysRemaining(rem.expiryDate);
          if (days !== null && days <= 30) {
            docAlerts.push({ id: `${d.id}_${rem.id}`, title: d.name, desc: rem.title || '附加文件', date: rem.expiryDate, days, status: days < 0 ? 'expired' : 'soon', raw: d, source: 'database' });
          }
        }
      });
    }
  });

  inventory.forEach(v => {
    const anyV = v as any;
    if (anyV.licenseExpiry && anyV.licenseReminderEnabled !== false) {
      const days = getDaysRemaining(anyV.licenseExpiry);
      if (days !== null && days <= 30) {
        docAlerts.push({ id: anyV.id + '_lic', title: anyV.regMark || '未出牌', desc: '牌費到期', date: anyV.licenseExpiry, days, status: days < 0 ? 'expired' : 'soon', raw: anyV, source: 'vehicle' });
      }
    }
    if (anyV.insuranceExpiry && anyV.insuranceReminderEnabled !== false) {
      const days = getDaysRemaining(anyV.insuranceExpiry);
      if (days !== null && days <= 30) {
        docAlerts.push({ id: anyV.id + '_ins', title: anyV.regMark || '未出牌', desc: '保險到期', date: anyV.insuranceExpiry, days, status: days < 0 ? 'expired' : 'soon', raw: anyV, source: 'vehicle' });
      }
    }
    if (anyV.logistics?.inspectionPassedDate && !anyV.logistics?.registeredDate) {
      const passedDate = new Date(anyV.logistics.inspectionPassedDate);
      if (!isNaN(passedDate.getTime())) {
        const expiryDate = new Date(passedDate.setMonth(passedDate.getMonth() + 4));
        const expiryDateStr = expiryDate.toISOString().split('T')[0];
        const days = getDaysRemaining(expiryDateStr);
        if (days !== null && days <= 30) {
          docAlerts.push({ id: anyV.id + '_insp', title: anyV.regMark || '未出牌', desc: '驗車紙過期警告', date: expiryDateStr, days, status: days < 0 ? 'expired' : 'soon', raw: anyV, source: 'vehicle' });
        }
      }
    }
  });

  unpaidCompanyExpenses.forEach(exp => {
    if (exp.dueDate && exp.flow === 'OUT') {
      const days = getDaysRemaining(exp.dueDate);
      if (days !== null && days <= 30) {
        docAlerts.push({ id: exp.id, title: exp.title || '日常營運開支', desc: `[財務] ${exp.category}`, date: exp.dueDate, days, status: days < 0 ? 'expired' : 'soon', raw: exp, source: 'ledger' });
      }
    }
  });
  docAlerts.sort((a, b) => a.days - b.days);

  const cbAlerts: any[] = [];
  const cbDateFields = { 
    dateHkInsurance: '香港保險', dateReservedPlate: '留牌紙', dateBr: '商業登記 (BR)', 
    dateLicenseFee: '香港牌費', dateMainlandJqx: '內地交強險', dateMainlandSyx: '內地商業險', 
    dateClosedRoad: '禁區紙', dateApproval: '批文卡', dateMainlandLicense: '內地行駛證', 
    dateHkInspection: '香港驗車' 
  };

  inventory.forEach(v => {
    const cb = v.crossBorder;
    if (!cb) return;
    Object.entries(cbDateFields).forEach(([field, label]) => {
      const dateStr = (cb as any)?.[field];
      const reminderKey = field.replace('date', 'cb_remind_');
      const isRemind = (cb as any)?.[reminderKey] !== false;
      if (dateStr && isRemind) {
        const days = getDaysRemaining(dateStr);
        if (days !== null && days <= 30) {
          cbAlerts.push({ id: v.id, title: v.regMark || '未出牌', desc: label, date: dateStr, days, status: days < 0 ? 'expired' : 'soon', raw: v });
        }
      }
    });
  });
  cbAlerts.sort((a, b) => a.days - b.days);

  const cbExpiredCount = cbAlerts.filter(a => a.status === 'expired').length;
  const cbSoonCount = cbAlerts.filter(a => a.status === 'soon').length;
  const docExpiredCount = docAlerts.filter(a => a.status === 'expired').length;
  const docSoonCount = docAlerts.filter(a => a.status === 'soon').length;
  const totalUrgentAlerts = cbExpiredCount + docExpiredCount + loopReminders.length;
  const totalSoonAlerts = cbSoonCount + docSoonCount;

  // ============================================================================
  // 2. 雙欄車輛列表篩選與過濾
  // ============================================================================
  const sortedList = [...inventory].sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));

  const inStockCars = sortedList.filter(c => c.status === 'In Stock');
  const actionCars = sortedList.filter(c => {
    if (c.status === 'Reserved') return true;
    if (c.status === 'Sold') {
      const received = (c.payments || []).reduce((acc: any, p: any) => acc + (Number(p.amount) || 0), 0);
      const salesAddonsTotal = ((c as any).salesAddons || []).reduce((sum: number, a: any) => sum + (a.isFree ? 0 : (Number(a.amount) || 0)), 0);
      const maintCharge = (c.maintenanceRecords || []).reduce((sum: number, m: any) => sum + (m.chargeStatus !== 'Paid' ? (Number(m.charge) || 0) : 0), 0);
      const totalReceivable = (Number(c.price) || 0) + salesAddonsTotal + maintCharge;
      const balance = totalReceivable - received;
      const unpaidExps = (c.expenses || []).filter((e: any) => e.status === 'Unpaid').length;
      const unpaidMaint = (c.maintenanceRecords || []).filter((m: any) => m.costStatus === 'Unpaid' && Number(m.cost) > 0).length;
      const pendingCb = (c.crossBorder?.tasks || []).filter((t: any) => (Number(t.fee) > 0) && !(c.payments || []).some((p: any) => p.relatedTaskId === t.id)).length;
      const totalExpenses = (c.expenses || []).reduce((sum: number, e: any) => sum + ((e.isIncludedInPrice || e.paymentMethod === 'Included') ? 0 : (Number(e.amount) || 0)), 0);
      const baseAcqCost = (Number(c.costPrice) || 0) - totalExpenses;
      const acqPaid = (c.acquisition?.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      const acqOffset = Number(c.acquisition?.offsetAmount || 0);
      const acqBalance = baseAcqCost - acqPaid - acqOffset;
      return balance > 1 || unpaidExps > 0 || unpaidMaint > 0 || pendingCb > 0 || acqBalance > 1;
    }
    return false;
  });

  const filteredInStockCars = inStockCars.filter(car =>
    !dashSearchInStock ||
    (car.regMark || '').toLowerCase().includes(dashSearchInStock.toLowerCase()) ||
    (car.make || '').toLowerCase().includes(dashSearchInStock.toLowerCase()) ||
    (car.model || '').toLowerCase().includes(dashSearchInStock.toLowerCase())
  );

  const filteredActionCars = actionCars.filter(car =>
    !dashSearchAction ||
    (car.regMark || '').toLowerCase().includes(dashSearchAction.toLowerCase()) ||
    (car.make || '').toLowerCase().includes(dashSearchAction.toLowerCase()) ||
    (car.model || '').toLowerCase().includes(dashSearchAction.toLowerCase())
  );

  // ============================================================================
  // 3. 卡片渲染邏輯 (Card Render Helper)
  // ============================================================================
  const getInventoryAging = (car: any) => {
    if (!car.stockInDate) return null;
    const start = new Date(car.stockInDate).getTime();
    let end = new Date().getTime();
    let prefix = car.status === 'Sold' ? '售出耗時' : '在庫';
    if (car.status === 'Sold') {
      if (!car.stockOutDate) return null;
      end = new Date(car.stockOutDate).getTime();
    }
    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    if (days < 30) return null;
    if (days >= 365) return { label: `${prefix} 1年+`, style: 'bg-black text-red-500 animate-pulse' };
    if (days >= 270) return { label: `${prefix} 9個月+`, style: 'bg-red-800 text-white' };
    if (days >= 180) return { label: `${prefix} 6個月+`, style: 'bg-red-600 text-white' };
    if (days >= 90) return { label: `${prefix} 3個月+`, style: 'bg-orange-500 text-white' };
    if (days >= 30) return { label: `${prefix} 1個月+`, style: 'bg-yellow-500 text-white' };
    return null;
  };

  const renderDashboardCard = (car: any) => {
    const getLogisticsBadge = (vehicleData: any) => {
      const log = vehicleData.logistics || {};
      if (log.registeredDate) return null;
      if (log.inspectionPassedDate) {
        const passed = new Date(log.inspectionPassedDate);
        const expiry = new Date(passed.setMonth(passed.getMonth() + 4));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expiry.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const expiryStr = expiry.toISOString().split('T')[0];
        if (diffDays < 0) return { text: `驗車已過期`, color: 'bg-red-50 text-red-600 border-red-300 animate-pulse' };
        if (diffDays <= 30) return { text: `出牌期限: ${expiryStr}`, color: 'bg-orange-50 text-orange-600 border-orange-300' };
        return { text: `可於 ${expiryStr} 前出牌`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      }
      if (log.emissionsClearDate) return { text: '待驗車', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      const arrivalStr = log.arrivalDate || vehicleData.acquisition?.eta || vehicleData.eta;
      if (arrivalStr) {
        const arr = new Date(arrivalStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        arr.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((arr.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 0) return { text: `🚢 剩 ${diffDays} 天到港`, color: 'bg-blue-50 text-blue-600 border-blue-200' };
        return { text: '🚢 已到港 (待驗環保)', color: 'bg-blue-100 text-blue-700 border-blue-300' };
      }
      return null;
    };

    const logisticsBadge = getLogisticsBadge(car);
    const received = (car.payments || []).reduce((acc: any, p: any) => acc + (Number(p.amount) || 0), 0);
    const salesAddonsTotal = ((car as any).salesAddons || []).reduce((sum: number, a: any) => sum + (a.isFree ? 0 : (Number(a.amount) || 0)), 0);
    const maintCharge = (car.maintenanceRecords || []).reduce((sum: number, m: any) => sum + (m.chargeStatus !== 'Paid' ? (Number(m.charge) || 0) : 0), 0);
    const totalReceivable = (Number(car.price) || 0) + salesAddonsTotal + maintCharge;
    const balance = totalReceivable - received;
    const pendingCbTasks = (car.crossBorder?.tasks || []).filter((t: any) => (Number(t.fee) > 0) && !(car.payments || []).some((p: any) => p.relatedTaskId === t.id));
    const pendingCbTotal = pendingCbTasks.reduce((sum: number, t: any) => sum + Number(t.fee), 0);
    const unpaidExpsAmt = (car.expenses || []).reduce((sum: number, e: any) => sum + ((e.status === 'Unpaid' && !e.isIncludedInPrice && e.paymentMethod !== 'Included') ? (Number(e.amount) || 0) : 0), 0);
    const unpaidMaintAmt = (car.maintenanceRecords || []).reduce((sum: number, m: any) => sum + (m.costStatus === 'Unpaid' ? (Number(m.cost) || 0) : 0), 0);
    const totalUnpaidAmount = unpaidExpsAmt + unpaidMaintAmt;

    const baseThumbUrl = primaryImages[car.id] || (car.photos && car.photos.length > 0 ? car.photos[0] : null);
    const isOneForOne = (car as any).acquisition?.vendor?.includes('一換一');
    const oneForOnePlaceholder = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%231e3a8a'/%3E%3Ctext x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' font-weight='bold' fill='%23ffffff'%3E一換一 QUOTA%3C/text%3E%3Ctext x='50%25' y='60%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%2393c5fd'%3EEV Replacement Scheme%3C/text%3E%3C/svg%3E";
    const thumbUrl = baseThumbUrl || (isOneForOne ? oneForOnePlaceholder : null);
    const aging = getInventoryAging(car);

    let statusText = '在庫';
    let dotColor = "bg-green-500";
    if (car.status === 'Reserved') { statusText = '已訂'; dotColor = "bg-yellow-500"; }
    else if (car.status === 'Sold') { statusText = '已售'; dotColor = "bg-blue-600"; }

    const isLicenseExpired = car.licenseExpiry && new Date(car.licenseExpiry) < new Date();
    const cbTags: { label: string; color: string }[] = [];
    const ports = car.crossBorder?.ports || [];
    if (car.crossBorder?.isEnabled || car.crossBorder?.mainlandPlate) {
      if (ports.some((p: string) => ['皇崗', '深圳灣', '蓮塘', '沙頭角', '文錦渡', '港珠澳大橋(港)'].includes(p))) cbTags.push({ label: '粵港', color: 'bg-indigo-600' });
      if (ports.some((p: string) => ['港珠澳大橋(澳)', '關閘(拱北)', '橫琴', '青茂'].includes(p))) cbTags.push({ label: '粵澳', color: 'bg-emerald-600' });
      if (cbTags.length === 0) cbTags.push({ label: '中港', color: 'bg-slate-700' });
    }

    const specs: string[] = [];
    if (car.previousOwners !== undefined && car.previousOwners !== '') specs.push(`${car.previousOwners}手`);
    if (car.seating) specs.push(`${car.seating}座`);
    if (car.transmission) specs.push(car.transmission === 'Manual' ? '手波' : '自動波');
    if (car.engineSize) specs.push(`${car.engineSize}${car.fuelType === 'Electric' ? 'Kw' : 'cc'}`);
    if (car.colorExt) specs.push(car.colorExt.split(' ')[0].replace(/[()]/g, ''));
    if (car.mileage) specs.push(`${Number(car.mileage).toLocaleString()}km`);

    return (
      <div 
        key={car.id} 
        onClick={() => setEditingVehicle(car)} 
        className="flex w-full box-border overflow-hidden bg-white/60 backdrop-blur-md p-2.5 md:p-3 rounded-2xl border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:bg-white/90 hover:shadow-[0_8px_24px_rgba(59,130,246,0.08)] hover:border-blue-300/50 cursor-pointer transition-all duration-300 group relative active:scale-[0.98]"
      >
        <div className="w-28 md:w-32 aspect-[4/3] rounded-lg overflow-hidden relative flex-shrink-0 bg-slate-100 border border-slate-200/50 shadow-inner">
          {thumbUrl ? (
            <img src={thumbUrl} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Car" loading="lazy" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50"><Car size={20}/><span className="text-[8px] mt-1">No Img</span></div>
          )}
          <div className="absolute top-1.5 left-1.5 z-20 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded-md shadow-sm border border-white/50 w-fit">
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shadow-[0_0_4px_currentColor]`} />
              <span className="text-[9px] font-black text-slate-800 leading-none pt-px">{statusText}</span>
            </div>
            {aging && <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold shadow-sm ${aging.style}`}>{aging.label}</span>}
          </div>
        </div>

        <div className="ml-2.5 flex-1 min-w-0 flex flex-col justify-between py-0.5 relative">
          <button 
            onClick={(e) => { e.stopPropagation(); setShareCleanMode(false); setShareVehicle(car); }} 
            className="absolute -top-1 -right-1 p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all z-10"
            title="產生對客推介單"
          >
            <Share2 size={14}/>
          </button>

          <div className="w-full pr-6">
            <div className="font-bold text-[13px] md:text-sm text-slate-800 leading-tight truncate w-full mb-1">
              {car.year} {car.make} {car.model}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 w-full mb-1.5">
              <span className="bg-[#FFD600] text-black border border-black font-black font-mono text-[9px] px-1.5 py-0.5 rounded-[2px] shadow-sm leading-none flex-shrink-0">
                {car.regMark || '未出牌'}
              </span>
              {car.crossBorder?.mainlandPlate && (
                <span className={`${car.crossBorder.mainlandPlate.startsWith('粵Z') ? 'bg-black text-white border-white' : 'bg-[#003399] text-white border-white'} border font-bold font-mono text-[8px] px-1.5 py-0.5 rounded-[2px] shadow-sm leading-none flex-shrink-0`}>
                  {car.crossBorder.mainlandPlate}
                </span>
              )}
              {cbTags.map((t: any, i: number) => (
                <span key={i} className={`text-[8px] text-white px-1 py-[1px] rounded-[2px] shadow-sm font-bold leading-none flex-shrink-0 ${t.color}`}>{t.label}</span>
              ))}
            </div>

            {specs.length > 0 && (
              <div className="text-[9px] text-slate-500 font-medium leading-none truncate w-full mb-1.5">
                {specs.join(' • ')}
              </div>
            )}

            {car.licenseExpiry && (
              <div className="flex w-full">
                <span className={`text-[8px] px-1.5 py-[2px] rounded-[3px] shadow-sm font-mono flex items-center border leading-none ${isLicenseExpired ? 'text-red-600 bg-red-50 border-red-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
                  <Calendar size={8} className="mr-0.5 opacity-70"/>牌費: {car.licenseExpiry}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-between items-end mt-1.5 pt-1.5 border-t border-slate-50 w-full gap-x-1 gap-y-1.5">
            <div className="font-black text-[15px] md:text-base text-slate-800 tracking-tight whitespace-nowrap leading-none mb-0.5">
              {formatCurrency(car.price)}
            </div>
            
            <div className="flex flex-col gap-1 items-end min-w-0 ml-auto">
              {(logisticsBadge || received > 0) && (
                <div className="flex flex-wrap justify-end items-center gap-1">
                  {received > 0 && balance > 0 && (
                    <span className="text-[8px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-[2px] rounded-[3px] leading-none font-bold whitespace-nowrap">
                      有訂 / 部份已付
                    </span>
                  )}
                  {logisticsBadge && (
                    <span className={`text-[9px] px-1.5 py-[2px] rounded-[3px] leading-none flex items-center shadow-sm border whitespace-nowrap font-bold ${logisticsBadge.color}`}>
                      {logisticsBadge.text}
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap justify-end items-center gap-1">
                {(() => {
                  const totalExpenses = (car.expenses || []).reduce((sum: number, e: any) => sum + ((e.isIncludedInPrice || e.paymentMethod === 'Included') ? 0 : (Number(e.amount) || 0)), 0);
                  const baseAcqCost = (car.costPrice || 0) - totalExpenses;
                  const acqPaid = (car.acquisition?.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
                  const acqOffset = Number(car.acquisition?.offsetAmount || 0);
                  const acqBalance = baseAcqCost - acqPaid - acqOffset;
                  if (acqBalance > 1) {
                    return (
                      <span className="text-[9px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-[2px] rounded-[3px] leading-none flex items-center shadow-sm whitespace-nowrap font-bold">
                        欠車價 <span className="font-mono ml-1">{formatCurrency(acqBalance)}</span>
                      </span>
                    );
                  }
                  return null;
                })()}

                {totalUnpaidAmount > 0 && (
                  <span className="text-[10px] text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-[2px] rounded-[3px] leading-none flex items-center shadow-sm whitespace-nowrap font-bold">
                    <span className="mr-1 opacity-80 text-[8px] font-sans">未付成本</span>
                    <span className="font-mono">{formatCurrency(totalUnpaidAmount)}</span>
                  </span>
                )}
                
                {pendingCbTotal > 0 && (
                  <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-[2px] rounded-[3px] leading-none flex items-center shadow-sm whitespace-nowrap font-bold">
                    <span className="mr-1 opacity-80 text-[8px] font-sans">中港待收</span>
                    <span className="font-mono">{formatCurrency(pendingCbTotal)}</span>
                  </span>
                )}
                {balance > 0 && (
                  <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-[2px] rounded-[3px] leading-none flex items-center shadow-sm whitespace-nowrap font-bold">
                    <span className="mr-1 opacity-80 text-[8px] font-sans">車款待收</span>
                    <span className="font-mono">{formatCurrency(balance)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // 4. 主渲染 (Render Module Layout)
  // ============================================================================
  return (
    <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden space-y-3 animate-fade-in relative pb-10 scrollbar-thin">
      
      {/* 頂部 Header 與最新通告 / 通知鈴鐺 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 flex-none">
        <h2 className="text-2xl font-bold text-slate-800 whitespace-nowrap">業務儀表板</h2>
        <div className="flex-1 w-full min-w-0 px-0 md:px-4">
          <SmartNewsTicker dbEntries={dbEntries} inventory={inventory} staffId={staffId} currentUser={currentUser} />
        </div>
        <div className="hidden md:block">
          <SmartNotificationCenter inventory={inventory} settings={settings} triggerSmartPrint={triggerSmartPrint} currentUser={currentUser} />
        </div>
      </div>

      {/* 🚨 整合式戰情通報橫幅 (雙狀態呈現 + 無限Rolling捲動) */}
      {(totalUrgentAlerts > 0 || totalSoonAlerts > 0) && (
        <div className="w-full bg-slate-900 text-white rounded-2xl border border-slate-800 overflow-hidden shadow-sm flex-none transition-all duration-300">
          
          {/* 1. 頂部狀態列：清晰標示「已過期」與「即將到期」 */}
          <div 
            onClick={() => setIsAlertExpanded(!isAlertExpanded)}
            className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-slate-800/80 transition-colors"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex items-center gap-1.5 bg-red-500/20 text-red-400 px-2.5 py-0.5 rounded-full border border-red-500/30 font-bold text-xs shrink-0">
                <span>🚨 待辦預警</span>
                <span className="bg-red-600 text-white px-1.5 py-0.2 rounded-full text-[10px]">
                  {totalUrgentAlerts + totalSoonAlerts}
                </span>
              </div>

              {/* 橫向膠囊摘要：完整展示「已過期」及「即將到期」數量 */}
              <div className="hidden md:flex items-center gap-2 text-xs font-medium truncate">
                {loopReminders.length > 0 && (
                  <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    🔄 兜圈死線 ({loopReminders.length})
                  </span>
                )}
                {(cbExpiredCount > 0 || cbSoonCount > 0) && (
                  <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1.5">
                    <span className="text-slate-300">🌐 中港:</span>
                    {cbExpiredCount > 0 && <span className="text-red-400 font-bold">過期 {cbExpiredCount}</span>}
                    {cbSoonCount > 0 && <span className="text-amber-400">臨期 {cbSoonCount}</span>}
                  </span>
                )}
                {(docExpiredCount > 0 || docSoonCount > 0) && (
                  <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1.5">
                    <span className="text-slate-300">📄 牌費/文件:</span>
                    {docExpiredCount > 0 && <span className="text-red-400 font-bold">過期 {docExpiredCount}</span>}
                    {docSoonCount > 0 && <span className="text-amber-400">臨期 {docSoonCount}</span>}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0 font-bold">
              <span>{isAlertExpanded ? '收起詳情' : '點擊展開管理'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isAlertExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {/* 2. 展開面板：啟用滾動區域 (Rolling List)，移除 .slice 限制 */}
          {isAlertExpanded && (
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* --- 區塊 1: 粵港車兜圈死線 --- */}
              <div className="flex flex-col bg-slate-900/50 rounded-xl border border-white/5 p-2">
                <div className="text-xs font-bold text-amber-400 flex items-center justify-between border-b border-white/10 pb-2 mb-1.5 px-1">
                  <span>🔄 粵港車兜圈死線</span>
                  <span className="font-mono bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px]">{loopReminders.length} 台</span>
                </div>
                {/* 滾動容器 (Rolling Container) */}
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-1">
                  {loopReminders.map((car: any) => (
                    <div key={car.id} className="flex justify-between items-center text-xs p-2 rounded bg-white/5 hover:bg-white/10 transition-colors">
                      <span className="font-bold text-white truncate pr-2">{car.regMark || '未出牌'}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-amber-400 font-mono text-[11px]">剩 {car.diffDays} 天</span>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm(`確定 [${car.regMark || '未出牌'}] 已成功回港打卡嗎？`)) return;
                            try {
                              await updateDoc(doc(db!, 'artifacts', appId, 'staff', 'CHARLES_data', 'inventory', car.id), { lastOutboundDate: '' });
                              alert('✅ 已重置兜圈時間。');
                            } catch { alert('更新失敗'); }
                          }}
                          className="p-1 bg-white/10 hover:bg-emerald-600/50 text-emerald-400 rounded transition-colors"
                          title="標記為已回港"
                        >
                          <Check size={12}/>
                        </button>
                      </div>
                    </div>
                  ))}
                  {loopReminders.length === 0 && <p className="text-slate-500 text-xs text-center py-6">暫無到期項目</p>}
                </div>
              </div>

              {/* --- 區塊 2: 中港業務到期 (包含過期與臨期，全量滾動展示) --- */}
              <div className="flex flex-col bg-slate-900/50 rounded-xl border border-white/5 p-2">
                <div className="text-xs font-bold text-blue-400 flex items-center justify-between border-b border-white/10 pb-2 mb-1.5 px-1">
                  <span>🌐 中港業務到期</span>
                  <div className="flex gap-1 text-[10px] font-mono">
                    {cbExpiredCount > 0 && <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">過期 {cbExpiredCount}</span>}
                    {cbSoonCount > 0 && <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">臨期 {cbSoonCount}</span>}
                  </div>
                </div>
                {/* 滾動容器 (Rolling Container) - 移除 .slice() 限制 */}
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-1">
                  {cbAlerts.map((item: any, idx: number) => (
                    <div 
                      key={idx} 
                      onClick={() => { setActiveTab('cross_border'); setActiveCbVehicleId(item.id); }}
                      className={`flex justify-between items-center text-xs p-2 rounded cursor-pointer transition-colors border-l-2 ${
                        item.status === 'expired' 
                          ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500' 
                          : 'bg-white/5 hover:bg-white/10 border-amber-400'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-white">{item.title}</span>
                        <span className="text-slate-400 text-[10px] ml-1">({item.desc})</span>
                      </div>
                      <span className={`shrink-0 font-mono text-[11px] ${item.status === 'expired' ? 'text-red-400 font-bold' : 'text-amber-400'}`}>
                        {item.status === 'expired' ? `過期 ${Math.abs(item.days)}天` : `剩 ${item.days}天`}
                      </span>
                    </div>
                  ))}
                  {cbAlerts.length === 0 && <p className="text-slate-500 text-xs text-center py-6">暫無到期項目</p>}
                </div>
              </div>

              {/* --- 區塊 3: 牌費 & 文件到期 (包含過期與臨期，全量滾動展示) --- */}
              <div className="flex flex-col bg-slate-900/50 rounded-xl border border-white/5 p-2">
                <div className="text-xs font-bold text-emerald-400 flex items-center justify-between border-b border-white/10 pb-2 mb-1.5 px-1">
                  <span>📄 牌費 & 文件到期</span>
                  <div className="flex gap-1 text-[10px] font-mono">
                    {docExpiredCount > 0 && <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">過期 {docExpiredCount}</span>}
                    {docSoonCount > 0 && <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">臨期 {docSoonCount}</span>}
                  </div>
                </div>
                {/* 滾動容器 (Rolling Container) - 移除 .slice() 限制 */}
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-1">
                  {docAlerts.map((item: any, idx: number) => (
                    <div 
                      key={idx}
                      onClick={() => {
                        if (item.source === 'vehicle') { setActiveTab('inventory'); setEditingVehicle(item.raw); }
                        else { setActiveTab('database'); setEditingEntry(item.raw); setIsDbEditing(true); }
                      }}
                      className={`flex justify-between items-center text-xs p-2 rounded cursor-pointer transition-colors border-l-2 ${
                        item.status === 'expired' 
                          ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500' 
                          : 'bg-white/5 hover:bg-white/10 border-amber-400'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-white">{item.title}</span>
                        <span className="text-slate-400 text-[10px] ml-1">({item.desc})</span>
                      </div>
                      <span className={`shrink-0 font-mono text-[11px] ${item.status === 'expired' ? 'text-red-400 font-bold' : 'text-amber-400'}`}>
                        {item.status === 'expired' ? `過期 ${Math.abs(item.days)}天` : `剩 ${item.days}天`}
                      </span>
                    </div>
                  ))}
                  {docAlerts.length === 0 && <p className="text-slate-500 text-xs text-center py-6">暫無到期項目</p>}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* 4 格扁平 KPI Cards (減少 padding 改為 p-3) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-none">
        <div className="bg-white/70 backdrop-blur-md p-3 rounded-xl border border-white/80 shadow-sm relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500" />
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">庫存總值</span>
          <span className="text-lg lg:text-xl font-black text-slate-800 font-mono mt-0.5 truncate">
            {formatCurrency(stats.totalStockValue)}
          </span>
        </div>

        <div className="bg-white/70 backdrop-blur-md p-3 rounded-xl border border-white/80 shadow-sm relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">未付費用</span>
          <span className="text-lg lg:text-xl font-black text-red-600 font-mono mt-0.5 truncate">
            {formatCurrency(stats.totalPayable)}
          </span>
        </div>

        <div className="bg-white/70 backdrop-blur-md p-3 rounded-xl border border-white/80 shadow-sm relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">應收尾數</span>
          <span className="text-lg lg:text-xl font-black text-blue-600 font-mono mt-0.5 truncate">
            {formatCurrency(stats.totalReceivable)}
          </span>
        </div>

        <div className="bg-white/70 backdrop-blur-md p-3 rounded-xl border border-white/80 shadow-sm relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">本月銷售額</span>
          <span className="text-lg lg:text-xl font-black text-emerald-600 font-mono mt-0.5 truncate">
            {formatCurrency(stats.totalSoldThisMonth)}
          </span>
        </div>
      </div>

      {/* 手機專屬 Tab 切換按鈕 */}
      <div className="md:hidden flex p-1.5 bg-slate-200/60 rounded-xl mx-1 mt-1 mb-2">
        <button 
          onClick={() => setDashMobileTab('instock')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex justify-center items-center gap-1.5 ${dashMobileTab === 'instock' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500'}`}
        >
          在庫待售
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${dashMobileTab === 'instock' ? 'bg-green-100 text-green-700' : 'bg-slate-300 text-slate-500'}`}>{inStockCars.length}</span>
        </button>
        <button 
          onClick={() => setDashMobileTab('action')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex justify-center items-center gap-1.5 ${dashMobileTab === 'action' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}
        >
          已訂/待結清
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${dashMobileTab === 'action' ? 'bg-amber-100 text-amber-700' : 'bg-slate-300 text-slate-500'}`}>{actionCars.length}</span>
        </button>
      </div>

      {/* 左右雙軌看板（整合式 Header，徹底移去獨立一行之全幅搜尋框） */}
      <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-[500px] lg:min-h-0 shrink-0 overflow-hidden">
        
        {/* ==================== 在庫待售看板 ==================== */}
        <div className={`flex-1 flex-col bg-white/40 backdrop-blur-xl rounded-2xl border border-white/60 shadow-sm overflow-hidden min-h-0 ${dashMobileTab === 'instock' ? 'flex' : 'hidden md:flex'}`}>
          <div className="flex items-center justify-between p-3 border-b border-slate-200/60 bg-white/60 gap-2 flex-none">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-sm flex items-center">
                <Layout className="w-4 h-4 mr-1.5 text-green-600" /> 在庫待售
              </h3>
              <span className="bg-green-100 text-green-800 font-mono text-xs px-2 py-0.5 rounded-full font-bold">
                {filteredInStockCars.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-1 max-w-[180px] sm:max-w-[240px]">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="搜尋庫存車..." 
                  value={dashSearchInStock}
                  onChange={(e) => setDashSearchInStock(e.target.value)}
                  className="w-full bg-white/80 border border-slate-200/80 rounded-lg pl-8 pr-6 py-1 text-xs font-medium outline-none focus:border-green-500 focus:bg-white transition-all"
                />
                {dashSearchInStock && (
                  <button onClick={() => setDashSearchInStock('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button 
                onClick={() => { setEditingVehicle({} as any); setActiveTab('inventory_add'); }}
                className="bg-slate-900 hover:bg-slate-800 text-white p-1 rounded-lg shrink-0 transition-colors"
                title="新增入庫"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-thin">
            {filteredInStockCars.map(car => renderDashboardCard(car))}
            {filteredInStockCars.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs">
                {dashSearchInStock ? '找不到符合的車輛' : '目前無在庫車輛'}
              </div>
            )}
          </div>
        </div>

        {/* ==================== 已訂與待結清看板 ==================== */}
        <div className={`flex-1 flex-col bg-white/40 backdrop-blur-xl rounded-2xl border border-white/60 shadow-sm overflow-hidden min-h-0 ${dashMobileTab === 'action' ? 'flex' : 'hidden md:flex'}`}>
          <div className="flex items-center justify-between p-3 border-b border-slate-200/60 bg-white/60 gap-2 flex-none">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-sm flex items-center">
                <FileCheck className="w-4 h-4 mr-1.5 text-amber-600" /> 已訂 / 待結清
              </h3>
              <span className="bg-amber-100 text-amber-800 font-mono text-xs px-2 py-0.5 rounded-full font-bold">
                {filteredActionCars.length}
              </span>
            </div>

            <div className="relative flex-1 max-w-[180px] sm:max-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="搜尋交易車..." 
                value={dashSearchAction}
                onChange={(e) => setDashSearchAction(e.target.value)}
                className="w-full bg-white/80 border border-slate-200/80 rounded-lg pl-8 pr-6 py-1 text-xs font-medium outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
              {dashSearchAction && (
                <button onClick={() => setDashSearchAction('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-thin">
            {filteredActionCars.map(car => renderDashboardCard(car))}
            {filteredActionCars.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center">
                {dashSearchAction ? (
                  <span className="mt-2">找不到符合的車輛</span>
                ) : (
                  <>
                    <CheckCircle size={32} className="mb-2 text-green-400 opacity-50" />
                    <span className="mt-2">所有交易皆已完美結清</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
