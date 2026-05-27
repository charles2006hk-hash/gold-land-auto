'use client';

import React, { useState } from 'react';
import { 
  X, Briefcase, Search, Check, Copy, ExternalLink, 
  FileCheck, ImageIcon, Camera, Save, Loader2, GitMerge, 
  ArrowRight, Clipboard, Printer, Globe, Plus
} from 'lucide-react';
import { WORKFLOW_TEMPLATES } from '@/config/constants';
import { compressImage } from '@/utils/imageHelpers';
import { generateInsuranceForm } from '@/utils/InsurancePdfEngine';
import { Vehicle } from '@/types';

// --- 內部組件 1：運輸署打包系統 ---
const TDTaskPackModal = ({ vehicle, onClose, triggerSmartPrint }: any) => {
    const [taskType, setTaskType] = useState('TD22');
    
    const taskConfigs: Record<string, any> = {
        'TD22': {
            name: '車輛過戶 (TD22)',
            title: '運輸署 - 車輛過戶代辦清單',
            docs: ['買賣雙方已簽署的 TD22 表格正本', '買賣雙方身份證副本 (或公司 BR 副本)', '車輛登記文件 (牌簿 VRD) 正本', '新車主名下的有效汽車保險 (Cover Note)', '最近三個月內的地址證明'],
            fee: '$1,000 (過戶費)'
        },
        'TD558': {
            name: '續領牌費 (TD558)',
            title: '運輸署 - 續領車輛牌照代辦清單',
            docs: ['已簽署的 TD558 表格正本', '登記車主身份證副本', '車輛登記文件 (牌簿 VRD) 正本', '有效汽車保險 (涵蓋新牌照期)', '最近三個月內的地址證明', '驗車合格證明書 (如車齡超過6年)'],
            fee: '視乎引擎容積 (預設 $5,074 或以上)'
        },
        'TD148': {
            name: '留用/套用車牌 (TD148)',
            title: '運輸署 - 留用/套用車牌代辦清單',
            docs: ['已簽署的 TD148 表格正本', '登記車主身份證副本', '車輛登記文件 (牌簿 VRD) 正本', '地址證明'],
            fee: '$560 (留牌費)'
        }
    };

   const handlePrintPack = () => {
        const config = taskConfigs[taskType];
        const htmlContent = `
            <div style="padding: 20mm; font-family: 'Helvetica Neue', 'Microsoft JhengHei', sans-serif; line-height: 1.6;">
                <div style="border-bottom: 3px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <h1 style="margin: 0; color: #1e3a8a; font-size: 24px;">${config.title}</h1>
                        <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 18px;">車牌號碼: ${vehicle.regMark || '未出牌'}</p>
                    </div>
                    <div style="text-align: right; font-size: 12px; color: #666;">
                        列印日期: ${new Date().toLocaleDateString('zh-HK')}<br/>
                        系統編號: ${vehicle.id ? vehicle.id.substring(0, 8).toUpperCase() : 'N/A'}
                    </div>
                </div>

                <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px;">
                    <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #1e40af; border-left: 4px solid #3b82f6; padding-left: 10px; margin-top: 0;">車輛與車主預填資料 (Vehicle & Owner Info)</h3>
                    <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
                        <tr><th style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: left; width: 30%; color: #64748b; font-weight: normal;">廠牌及型號 (Make & Model)</th><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: left; font-weight: bold; color: #0f172a;">${vehicle.make || '-'} ${vehicle.model || '-'}</td></tr>
                        <tr><th style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: left; color: #64748b; font-weight: normal;">製造年份 (Year of Mfg)</th><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: left; font-weight: bold; color: #0f172a;">${vehicle.year || '-'}</td></tr>
                        <tr><th style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: left; color: #64748b; font-weight: normal;">底盤號碼 (Chassis No.)</th><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: left; font-weight: bold; color: #0f172a; font-family: monospace;">${vehicle.chassisNo || '-'}</td></tr>
                        <tr><th style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: left; color: #64748b; font-weight: normal;">引擎號碼 (Engine No.)</th><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: left; font-weight: bold; color: #0f172a; font-family: monospace;">${vehicle.engineNo || '-'}</td></tr>
                        <tr><th style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: left; color: #64748b; font-weight: normal;">登記車主 (Registered Owner)</th><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: left; font-weight: bold; color: #0f172a;">${vehicle.registeredOwnerName || vehicle.customerName || '-'}</td></tr>
                        <tr><th style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: left; color: #64748b; font-weight: normal;">身份證/公司編號 (ID/CI No.)</th><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: left; font-weight: bold; color: #0f172a;">${vehicle.registeredOwnerId || vehicle.customerID || '-'}</td></tr>
                        <tr><th style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: left; color: #64748b; font-weight: normal;">車主地址 (Address)</th><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: left; font-weight: bold; color: #0f172a;">${vehicle.customerAddress || '-'}</td></tr>
                    </table>
                </div>

                <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px;">
                    <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #1e40af; border-left: 4px solid #3b82f6; padding-left: 10px; margin-top: 0;">必須攜帶文件清單 (Required Documents Checklist)</h3>
                    <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px;">
                        ${config.docs.map((doc: string) => `<li style="margin-bottom: 12px; display: flex; align-items: flex-start;"><div style="width: 16px; height: 16px; border: 2px solid #94a3b8; border-radius: 4px; margin-right: 12px; margin-top: 2px; flex-shrink: 0;"></div><span>${doc}</span></li>`).join('')}
                    </ul>
                    <div style="margin-top: 15px; padding: 10px; background-color: #f8fafc; border-radius: 4px; font-size: 12px; border-left: 3px solid #f59e0b;">
                        <strong>政府規費預算:</strong> ${config.fee} (請備妥足夠現金或支票)
                    </div>
                </div>

                <div style="margin-top: 30px; display: flex; justify-content: space-between;">
                    <div>
                        <div style="border-bottom: 1px solid #333; width: 200px; margin-top: 40px; text-align: center; padding-bottom: 5px;"></div>
                        <div>負責同事簽收 (Handled By)</div>
                    </div>
                    <div>
                        <div style="border-bottom: 1px solid #333; width: 200px; margin-top: 40px; text-align: center; padding-bottom: 5px;"></div>
                        <div>日期 (Date)</div>
                    </div>
                </div>

                <div style="margin-top: 40px; font-size: 12px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px;">
                    Gold Land Auto DMS - 自動生成之辦理清單 (內部文件)
                </div>
            </div>
        `;
        triggerSmartPrint(htmlContent, `TD_Pack_${vehicle.regMark}`);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center">🖨️ 生成運輸署業務打包單</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full"><X size={20}/></button>
                </div>
                <div className="p-5 bg-slate-50 border-b border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 mb-2">1. 選擇辦理業務類型</label>
                    <select value={taskType} onChange={(e) => setTaskType(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 font-bold text-slate-800 outline-none focus:ring-2 ring-blue-500 cursor-pointer">
                        {Object.keys(taskConfigs).map(key => (<option key={key} value={key}>{taskConfigs[key].name}</option>))}
                    </select>
                </div>
                <div className="p-5 flex-1">
                    <h4 className="text-xs font-bold text-slate-500 mb-3">文件查核預覽 (Checklist)</h4>
                    <div className="space-y-2">
                        {taskConfigs[taskType].docs.map((doc: string, idx: number) => (
                            <div key={idx} className="flex items-start text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100"><div className="w-4 h-4 border-2 border-slate-400 rounded mr-3 mt-0.5 shrink-0 bg-white"></div><span>{doc}</span></div>
                        ))}
                    </div>
                </div>
                <div className="p-4 bg-white border-t border-slate-200">
                    <button onClick={handlePrintPack} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center">
                        生成並列印打包單 (PDF)
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 內部組件 2：保險投保書 ---
const InsuranceProposalModal = ({ vehicle, onClose }: any) => {
    const [company, setCompany] = useState<'DahSing' | 'Zurich'>('DahSing');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        const success = await generateInsuranceForm(vehicle, company);
        setIsGenerating(false);
        if (success) onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center">🛡️ 生成保險投保書 (Proposal Form)</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full"><X size={20}/></button>
                </div>
                <div className="p-5 bg-slate-50 border-b border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 mb-2">1. 選擇保險公司 (由 俊銘保險 代理)</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setCompany('DahSing')} className={`p-4 rounded-xl border-2 font-bold flex flex-col items-center justify-center transition-all ${company === 'DahSing' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md scale-105' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>大新保險<span className="text-[10px] font-normal mt-1 opacity-70">Dah Sing Insurance</span></button>
                        <button onClick={() => setCompany('Zurich')} className={`p-4 rounded-xl border-2 font-bold flex flex-col items-center justify-center transition-all ${company === 'Zurich' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md scale-105' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>蘇黎世保險<span className="text-[10px] font-normal mt-1 opacity-70">Zurich Insurance</span></button>
                    </div>
                </div>
                <div className="p-5 flex-1">
                    <h4 className="text-xs font-bold text-slate-500 mb-3">即將導入的數據預覽</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-100 p-3 rounded-xl border border-slate-200 font-mono">
                        <div><span className="text-slate-400">車主:</span> {vehicle.registeredOwnerName || vehicle.customerName || '未填寫'}</div>
                        <div><span className="text-slate-400">車牌:</span> {vehicle.regMark || '未填寫'}</div>
                        <div className="col-span-2"><span className="text-slate-400">廠型:</span> {vehicle.make} {vehicle.model} ({vehicle.year})</div>
                        <div className="col-span-2"><span className="text-slate-400">底盤:</span> {vehicle.chassisNo || '未填寫'}</div>
                    </div>
                </div>
                <div className="p-4 bg-white border-t border-slate-200">
                    <button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center disabled:opacity-50">
                        {isGenerating ? <Loader2 className="animate-spin mr-2"/> : <Printer size={16} className="mr-2"/>}
                        {isGenerating ? '生成中...' : '生成並下載 PDF'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 主組件：業務辦理流程 ---
interface BusinessProcessProps {
    db: any;
    staffId: string;
    appId: string;
    inventory: Vehicle[];
    updateVehicle: any;
    triggerSmartPrint: (htmlContent: string, title?: string) => void;
}

export default function BusinessProcessModule({ db, staffId, appId, inventory, updateVehicle, triggerSmartPrint }: BusinessProcessProps) {
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [note, setNote] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showTdPackModal, setShowTdPackModal] = useState(false);
    const [showInsuranceModal, setShowInsuranceModal] = useState(false);

    const handleSaveLog = async (currentStepName: string, nextStepIndex: number) => {
        if (!editingVehicle || !editingVehicle.id) return;
        setIsSaving(true);

        const newLog = {
            id: Date.now().toString(),
            action: 'Step Completed',
            stage: currentStepName,
            details: note || '完成步驟',
            timestamp: new Date().toLocaleString(),
            attachments: photo ? [photo] : [],
            user: staffId || 'System'
        };

        const currentWf = editingVehicle.activeWorkflow!;
        const updatedWf = { ...currentWf, currentStep: nextStepIndex, logs: [...(currentWf.logs || []), newLog] };

        await updateVehicle(editingVehicle.id, { activeWorkflow: updatedWf });
        setEditingVehicle(prev => prev ? { ...prev, activeWorkflow: updatedWf } : null);
        setNote(''); setPhoto(null); setIsSaving(false);
    };

    const handleStartWorkflow = async (typeKey: string) => {
        if (!editingVehicle || !editingVehicle.id) return;
        if (!confirm("確定為此車輛開啟新案件？")) return;

        const newWf = { type: typeKey, currentStep: 0, startDate: new Date().toISOString().split('T')[0], logs: [] };
        await updateVehicle(editingVehicle.id, { activeWorkflow: newWf });
        setEditingVehicle(prev => prev ? { ...prev, activeWorkflow: newWf } : null);
    };

    const getFieldValue = (field: string) => {
        if (!editingVehicle) return '';
        return (editingVehicle as any)[field] || (editingVehicle.crossBorder as any)?.[field] || (editingVehicle.crossBorder as any)?.[`cb_${field}`] || '';
    };

    const activeCases = inventory.filter(v => v.activeWorkflow);
    const filteredCases = activeCases.filter(v => (v.regMark || '').includes(searchTerm.toUpperCase()));

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50 animate-fade-in">
            <div className="flex justify-between items-center p-4 bg-white border-b border-slate-200 flex-none shadow-sm z-10">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center"><Briefcase size={24} className="mr-2 text-blue-600"/> 業務辦理中心</h2>
                    <p className="text-xs text-slate-500">集中處理港車北上、兩地牌新辦及維護流程</p>
                </div>
                <div className="relative">
                    <select className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 font-bold text-sm outline-none cursor-pointer appearance-none pr-8" onChange={(e) => { const v = inventory.find(i => i.id === e.target.value); if(v) setEditingVehicle(v); e.target.value = ""; }}>
                        <option value="">+ 開啟新案件 (選擇車輛)</option>
                        {inventory.filter(v => !v.activeWorkflow).map(v => (<option key={v.id} value={v.id}>{v.regMark} - {v.make} {v.model}</option>))}
                    </select>
                    <Plus size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white pointer-events-none"/>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="w-80 bg-white border-r border-slate-200 flex flex-col flex-none">
                    <div className="p-3 border-b bg-slate-50 relative">
                        <Search size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜尋案件 / 車牌..." className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 ring-blue-100" />
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {filteredCases.map(car => {
                            const wf = car.activeWorkflow!;
                            const template = (WORKFLOW_TEMPLATES as any)[wf.type] || { name: '未知流程', steps: [], color: 'bg-gray-500' };
                            const progress = Math.round(((wf.currentStep + 1) / template.steps.length) * 100);
                            return (
                                <div key={car.id} onClick={() => setEditingVehicle(car)} className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${editingVehicle?.id === car.id ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' : 'bg-white border-slate-200'}`}>
                                    <div className="flex justify-between items-start mb-2"><span className="font-bold font-mono text-sm bg-yellow-400 px-1 rounded text-black">{car.regMark}</span><span className="text-[10px] text-gray-400">{wf.startDate}</span></div>
                                    <div className="font-bold text-slate-700 text-sm mb-1">{template.name}</div>
                                    <div className="flex items-center gap-2 mb-1"><div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full ${template.color}`} style={{width: `${progress}%`}}></div></div><span className="text-[10px] font-bold text-blue-600">{wf.currentStep + 1}/{template.steps.length}</span></div>
                                    <div className="text-[10px] text-slate-500 truncate">當前: {template.steps[wf.currentStep]?.name}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden relative">
                    {editingVehicle ? (
                        editingVehicle.activeWorkflow ? (() => {
                            const wf = editingVehicle.activeWorkflow;
                            const template = (WORKFLOW_TEMPLATES as any)[wf.type];
                            const stepIndex = wf.currentStep;
                            const stepData = template.steps[stepIndex];
                            
                            if (!template || !stepData) return <div className="p-10">流程數據錯誤</div>;

                            return (
                                <div className="flex flex-col h-full">
                                    <div className="bg-white border-b border-slate-200 p-4 shadow-sm flex-none">
                                        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide pb-2">
                                            {template.steps.map((s:any, i:number) => (
                                                <div key={i} className={`flex-none flex flex-col items-center min-w-[80px] relative ${i <= stepIndex ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1 transition-all ${i < stepIndex ? 'bg-green-500 text-white' : (i === stepIndex ? 'bg-blue-600 text-white scale-110 shadow-lg ring-4 ring-blue-100' : 'bg-slate-200 text-slate-500')}`}>{i < stepIndex ? <Check size={14}/> : i + 1}</div>
                                                    <span className={`text-[10px] font-bold whitespace-nowrap ${i === stepIndex ? 'text-blue-700' : 'text-slate-500'}`}>{s.name}</span>
                                                    {i < template.steps.length - 1 && <div className="absolute top-4 left-[50%] w-full h-[2px] bg-slate-200 -z-10"></div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6">
                                        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="space-y-6">
                                                {showTdPackModal && <TDTaskPackModal vehicle={editingVehicle} onClose={() => setShowTdPackModal(false)} triggerSmartPrint={triggerSmartPrint} />}
                                                {showInsuranceModal && <InsuranceProposalModal vehicle={editingVehicle} onClose={() => setShowInsuranceModal(false)} />}
                                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                                   <div className="flex justify-between items-center mb-4">
                                                      <h4 className="font-bold text-slate-700 flex items-center"><Clipboard size={18} className="mr-2 text-blue-500"/> 資料準備</h4>
                                                      <div className="flex items-center gap-2">
                                                          <button onClick={() => setShowTdPackModal(true)} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-100 font-bold shadow-sm transition-transform active:scale-95">🖨️ 生成 TD 打包單</button>
                                                          <button onClick={() => setShowInsuranceModal(true)} className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 font-bold shadow-sm transition-transform active:scale-95 flex items-center">🛡️ 生成保險投保書</button>
                                                      </div>
                                                  </div>
                                                    <div className="space-y-3">
                                                        {(stepData.fields || []).map((field: string) => {
                                                            const val = getFieldValue(field);
                                                            const labels: any = { regMark: '香港車牌', chassisNo: '車架號', engineNo: '引擎號', driver1: '主司機', driver1_id: '證件號', hkCompany: '香港公司', mainlandCompany: '內地公司', colorExt: '顏色' };
                                                            return (
                                                                <div key={field} onClick={() => {navigator.clipboard.writeText(val); alert("已複製: "+val)}} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 cursor-pointer group transition-all">
                                                                    <div><div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{labels[field] || field}</div><div className="font-mono font-bold text-slate-800 text-lg">{val || '-'}</div></div>
                                                                    <div className="p-2 bg-white rounded-lg text-slate-300 group-hover:text-blue-500 shadow-sm"><Copy size={16}/></div>
                                                                </div>
                                                            );
                                                        })}
                                                        {(!stepData.fields || stepData.fields.length === 0) && <div className="text-slate-400 text-sm italic text-center py-4 bg-slate-50 rounded-xl">此步驟無需複製特定資料</div>}
                                                    </div>
                                                </div>

                                                <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                                                    <h4 className="font-bold text-indigo-800 mb-3 flex items-center"><Globe size={18} className="mr-2"/> 外部辦事傳送門</h4>
                                                    {stepData.url ? (
                                                        <button onClick={() => window.open(stepData.url, 'GovWindow', 'width=1280,height=800')} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all flex items-center justify-center">
                                                            <ExternalLink size={18} className="mr-2"/> 開啟: {stepData.name} 官網
                                                        </button>
                                                    ) : (
                                                        <div className="text-indigo-400 text-center text-sm border-2 border-dashed border-indigo-200 rounded-xl py-3">需線下辦理 (如驗車) 或無固定網址</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-full">
                                                <h4 className="font-bold text-slate-700 mb-4 flex items-center"><FileCheck size={18} className="mr-2 text-green-600"/> 辦理結果紀錄</h4>
                                                <div className="flex-1 bg-slate-50 rounded-xl p-3 mb-4 overflow-y-auto max-h-60 border border-slate-100 space-y-3">
                                                    {(wf.logs || []).slice().reverse().map((log:any, idx:number) => (
                                                        <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-xs">
                                                            <div className="flex justify-between mb-1"><span className="font-bold text-blue-600">{log.stage}</span><span className="text-gray-400">{log.timestamp?.split(' ')[0]}</span></div>
                                                            <p className="text-slate-600">{log.details}</p>
                                                            {log.attachments?.[0] && <div className="mt-2 text-blue-500 flex items-center gap-1 cursor-pointer" onClick={() => window.open(log.attachments[0])}><ImageIcon size={12}/> 查看截圖</div>}
                                                        </div>
                                                    ))}
                                                    {(wf.logs || []).length === 0 && <div className="text-center text-slate-400 text-xs py-10">尚無紀錄</div>}
                                                </div>
                                                <div className="mt-auto space-y-3">
                                                    <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full border p-3 rounded-xl text-sm focus:ring-2 ring-blue-100 outline-none resize-none bg-slate-50" rows={3} placeholder={`請記錄「${stepData.name}」的辦理結果...`}></textarea>
                                                    <div className="flex gap-3">
                                                        <label className={`flex-1 hover:bg-gray-200 text-slate-600 py-3 rounded-xl cursor-pointer flex items-center justify-center text-xs font-bold transition-colors border border-dashed border-gray-300 ${photo ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100'}`}>
                                                            <Camera size={16} className="mr-2"/> {photo ? '已選取截圖' : '上傳截圖'}
                                                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => { if(e.target.files?.[0]) { try { const compressed = await compressImage(e.target.files[0], 100); setPhoto(compressed); } catch(err) { alert("圖片處理失敗"); } } }} />
                                                        </label>
                                                        <button onClick={() => handleSaveLog(stepData.name, Math.min(stepIndex + 1, template.steps.length - 1))} disabled={isSaving} className="flex-[2] bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center disabled:opacity-50">
                                                            {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save size={16} className="mr-2"/>}
                                                            {stepIndex >= template.steps.length - 1 ? '完成所有流程' : '保存並下一步'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })() : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10">
                                <GitMerge size={64} className="mb-4 opacity-20"/>
                                <h3 className="text-xl font-bold text-slate-600 mb-2">{editingVehicle.regMark} 尚未開啟流程</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mt-8">
                                    {Object.entries(WORKFLOW_TEMPLATES).map(([key, tpl]: any) => (
                                        <button key={key} onClick={() => handleStartWorkflow(key)} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all text-left group">
                                            <div className={`w-10 h-10 rounded-lg ${tpl.color} text-white flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform`}><ArrowRight size={20}/></div>
                                            <h4 className="font-bold text-slate-800">{tpl.name}</h4>
                                            <div className="text-xs text-slate-500 mt-1">{tpl.steps.length} 個步驟</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <Briefcase size={64} className="mb-4 opacity-20"/>
                            <p>請選擇左側案件，或點擊上方「開啟新案件」</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
