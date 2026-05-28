'use client';

import React, { useState } from 'react';
import { 
    BookOpen, Copy, Printer, ExternalLink, Download, 
    ChevronDown, ChevronUp, FileText, CheckCircle2, 
    Link as LinkIcon, Share2, Car, Globe, ShieldCheck
} from 'lucide-react';

// --- 預設 AI 整理的業務 SOP 知識庫 ---
const PROCEDURES = [
    {
        category: "本地車輛業務",
        icon: Car,
        items: [
            {
                id: "td25",
                title: "車輛過戶 (轉手)",
                description: "辦理香港車輛擁有權轉讓手續",
                docs: [
                    "過戶表格 (TD25) - 新舊車主需填妥並簽署",
                    "新車主汽車保險單 (Cover Note / Policy) 正本",
                    "新舊車主身份證正本 (若委託代辦，需授權書及代辦人身份證)",
                    "車輛登記文件 (牌簿 VRD) 正本",
                    "新車主三個月內之地址證明正本"
                ],
                steps: [
                    "確認車輛無未清繳的罰款或欠債。",
                    "新車主聯絡保險公司購買保險，獲取 Cover Note。",
                    "雙方填妥並簽署 TD25 表格，簽名必須與牌簿及身份證相同。",
                    "準備好所有文件，前往運輸署牌照事務處辦理。",
                    "繳交過戶費用 (電單車 $250 / 其他車輛 $1,000)。",
                    "運輸署即時發出印有新車主資料的新牌簿。"
                ],
                forms: [{ name: "TD25 - 車輛過戶通知書", url: "https://www.td.gov.hk/filemanager/common/td25_e-fillable_chi.pdf" }],
                links: [{ name: "運輸署 - 牌照事務處預約", url: "https://www.gov.hk/tc/apps/tdabsbooking.htm" }]
            },
            {
                id: "td320",
                title: "保留車輛登記號碼 (套牌/留牌)",
                description: "將舊車的車牌號碼保留，以供日後套用於另一部車",
                docs: [
                    "留牌表格 (TD320) - 車主填妥並簽署",
                    "車輛登記文件 (牌簿 VRD) 正本",
                    "車輛牌照 (行車證) 正本",
                    "車主身份證正本",
                    "三個月內之地址證明正本"
                ],
                steps: [
                    "車主填妥並簽署 TD320 表格。",
                    "前往運輸署牌照事務處辦理，必須交回原有的牌簿與行車證。",
                    "繳交留牌費用 $560。",
                    "運輸署會發出「保留車輛登記號碼憑證」(留牌紙)。",
                    "運輸署會為原車輛編配一個新的普通車牌，並發出新牌簿及行車證。",
                    "車主需通知保險公司更新保單上的車牌號碼，並重新製作實體車牌掛上。"
                ],
                forms: [{ name: "TD320 - 保留車輛登記號碼", url: "https://www.td.gov.hk/filemanager/common/td320_e-fillable_chi.pdf" }],
                links: [{ name: "運輸署 - 留牌指南", url: "https://www.td.gov.hk/tc/public_services/licences_and_permits/vehicle_licences/how_to_apply_for_registering_and_licensing_a_vehic/index.html" }]
            },
            {
                id: "td558",
                title: "續領車輛牌照 (續牌費)",
                description: "為車輛延續行車證 (可續4個月或1年)",
                docs: [
                    "續領牌照表格 (TD558)",
                    "車輛登記文件 (牌簿 VRD) 正本",
                    "有效的汽車保險單 (Cover Note / Policy) (必須涵蓋新牌照的首天)",
                    "三個月內之地址證明",
                    "車主身份證副本",
                    "驗車紙正本 (適用於車齡達 6 年或以上的私家車及所有商用車)"
                ],
                steps: [
                    "如車輛需驗車，請先預約驗車中心並獲取合格驗車紙 (COR)。",
                    "確保汽車保險有效。",
                    "填妥 TD558 表格。",
                    "透過郵寄、投遞箱或親身前往運輸署辦理。",
                    "繳交相應的牌照費用 (視乎引擎汽缸容量)。",
                    "獲取新行車證，並張貼於車頭擋風玻璃左面。"
                ],
                forms: [{ name: "TD558 - 續領車輛牌照", url: "https://www.td.gov.hk/filemanager/common/td558_e-fillable_chi.pdf" }],
                links: [{ name: "運輸署 - 網上續領牌照", url: "https://www.gov.hk/tc/residents/transport/vehicle/renewvlicence.htm" }]
            }
        ]
    },
    {
        category: "中港跨境業務",
        icon: Globe,
        items: [
            {
                id: "cb_extend",
                title: "中港牌批文延期",
                description: "辦理粵港澳機動車輛往來批文延期手續",
                docs: [
                    "批文卡原件及複印件",
                    "香港商業登記證 (BR) 複印件",
                    "香港車輛登記文件 (牌簿) 複印件",
                    "內地交強險憑證",
                    "公司印章 (公章)"
                ],
                steps: [
                    "確保內地交強險及香港保險在有效期內。",
                    "登入廣東省公安廳政務服務網，提交延期申請。",
                    "上傳所需文件的彩色掃描件。",
                    "等待審批結果 (通常約需 3-5 個工作日)。",
                    "審批通過後，攜帶批文卡原件前往中旅社或指定窗口辦理刷卡延期。"
                ],
                forms: [],
                links: [{ name: "廣東省公安廳交通管理局", url: "http://gdgajj.gd.gov.cn/" }]
            },
            {
                id: "cb_closedroad",
                title: "申請 / 續領禁區紙 (封閉道路通行許可證)",
                description: "中港車輛進出香港邊境禁區必備證件",
                docs: [
                    "申請表格 (TD547)",
                    "廣東省公安廳發出的有效批文正本及副本",
                    "香港車輛登記文件 (牌簿) 副本",
                    "香港有效汽車保險單副本",
                    "車主/公司身份證明文件副本"
                ],
                steps: [
                    "取得廣東省公安廳的有效批文後，填妥 TD547 表格。",
                    "準備好所有副本文件，親身或郵寄至過境服務分組辦理。",
                    "繳交費用 (新申請 / 續期視乎口岸及期限，通常為每年 $540 或 $3,150)。",
                    "領取禁區紙，必須張貼於車輛擋風玻璃上。"
                ],
                forms: [{ name: "TD547 - 封閉道路通行許可證", url: "https://www.td.gov.hk/filemanager/common/td547_e-fillable_chi.pdf" }],
                links: [{ name: "運輸署 - 過境車輛", url: "https://www.td.gov.hk/tc/public_services/licences_and_permits/closed_road_permit_for_cross_boundary_vehicles/index.html" }]
            }
        ]
    }
];

export default function BusinessProcessModule(props: any) {
    const [activeCategory, setActiveCategory] = useState(PROCEDURES[0].category);
    const [expandedItem, setExpandedItem] = useState<string | null>(PROCEDURES[0].items[0].id);

    // 一鍵複製轉發給客戶 (WhatsApp 友好格式)
    const handleCopyToWhatsApp = (item: any) => {
        const text = `📋 *【${item.title}】辦理指南*\n\n` +
            `📝 *所需準備文件：*\n${item.docs.map((d:string) => `• ${d}`).join('\n')}\n\n` +
            `✅ *辦理步驟：*\n${item.steps.map((s:string, i:number) => `${i+1}. ${s}`).join('\n')}\n\n` +
            (item.forms.length > 0 ? `📎 *相關表格下載：*\n${item.forms.map((f:any) => `${f.name}: ${f.url}`).join('\n')}\n\n` : '') +
            `💡 _以上資訊由 金田汽車 提供，如有疑問請隨時聯絡我們！_`;
        
        navigator.clipboard.writeText(text).then(() => {
            alert("✅ 複製成功！\n您可以直接在 WhatsApp 或微信中貼上並發送給客戶。");
        });
    };

    // 觸發列印/存為 PDF
    const handlePrintPDF = () => {
        window.print();
    };

    return (
        <div className="flex flex-col md:flex-row h-full bg-slate-50 relative">
            
            {/* 隱藏的列印樣式，確保輸出 PDF 漂亮乾淨 */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; background: white; padding: 20px; }
                    .no-print { display: none !important; }
                }
            `}</style>

            {/* 左側欄：分類選單 */}
            <div className="w-full md:w-64 bg-white border-r border-slate-200 flex-none overflow-y-auto no-print">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                    <BookOpen className="text-blue-600" size={20} />
                    <h2 className="font-black text-slate-800">辦理指南知識庫</h2>
                </div>
                <div className="p-2 space-y-1">
                    {PROCEDURES.map((cat, idx) => {
                        const Icon = cat.icon;
                        return (
                            <button 
                                key={idx}
                                onClick={() => setActiveCategory(cat.category)}
                                className={`w-full text-left flex items-center p-3 rounded-lg font-bold transition-all ${activeCategory === cat.category ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                <Icon size={18} className="mr-3 flex-none" />
                                {cat.category}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 右側欄：該分類的具體步驟清單 */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 no-print">
                <div className="max-w-4xl mx-auto space-y-4">
                    {PROCEDURES.find(c => c.category === activeCategory)?.items.map((item) => {
                        const isExpanded = expandedItem === item.id;
                        return (
                            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
                                {/* Accordion Header */}
                                <div 
                                    className="p-4 md:p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                                >
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                            {item.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                                    </div>
                                    <div className="text-slate-400 bg-slate-100 p-1.5 rounded-full">
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {/* Accordion Body */}
                                {isExpanded && (
                                    <div className="px-4 md:px-5 pb-5 border-t border-slate-100 bg-slate-50/50">
                                        
                                        {/* 操作列按鈕 */}
                                        <div className="flex flex-wrap gap-2 py-4 justify-end">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleCopyToWhatsApp(item); }}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors shadow-sm"
                                            >
                                                <Share2 size={14} /> 複製文字 (發給客戶)
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handlePrintPDF(); }}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors shadow-sm"
                                            >
                                                <Printer size={14} /> 列印 / 存為 PDF
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-area">
                                            {/* 左邊：文件清單 */}
                                            <div>
                                                <h4 className="font-black text-slate-700 flex items-center gap-1.5 mb-3 border-b pb-2">
                                                    <FileText size={16} className="text-amber-500" /> 所需準備文件
                                                </h4>
                                                <ul className="space-y-2">
                                                    {item.docs.map((doc, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                                            <CheckCircle2 size={16} className="text-emerald-500 flex-none mt-0.5" />
                                                            <span>{doc}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                
                                                {/* 相關表格下載 */}
                                                {item.forms.length > 0 && (
                                                    <div className="mt-6">
                                                        <h4 className="font-black text-slate-700 flex items-center gap-1.5 mb-3 border-b pb-2">
                                                            <Download size={16} className="text-blue-500" /> 相關表格下載
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {item.forms.map((form, idx) => (
                                                                <a key={idx} href={form.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2.5 bg-white border border-blue-100 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all group">
                                                                    <span className="text-sm font-bold text-blue-700 group-hover:text-blue-800">{form.name}</span>
                                                                    <ExternalLink size={14} className="text-blue-400 group-hover:text-blue-600" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 右邊：辦理步驟 */}
                                            <div>
                                                <h4 className="font-black text-slate-700 flex items-center gap-1.5 mb-3 border-b pb-2">
                                                    <ShieldCheck size={16} className="text-indigo-500" /> 辦理步驟
                                                </h4>
                                                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-200 before:to-transparent">
                                                    {item.steps.map((step, idx) => (
                                                        <div key={idx} className="relative flex items-start gap-3">
                                                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs flex-none z-10 shadow-sm mt-0.5">
                                                                {idx + 1}
                                                            </div>
                                                            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-sm text-slate-700 flex-1">
                                                                {step}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* 網上辦理 / 實用連結 */}
                                                {item.links.length > 0 && (
                                                    <div className="mt-6">
                                                        <h4 className="font-black text-slate-700 flex items-center gap-1.5 mb-3 border-b pb-2">
                                                            <LinkIcon size={16} className="text-purple-500" /> 實用連結 / 網上預約
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {item.links.map((link, idx) => (
                                                                <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors">
                                                                    {link.name} <ExternalLink size={12} />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
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
    );
}
