'use client';

import React, { useState } from 'react';
import { 
    BookOpen, Copy, Printer, ExternalLink, Download, 
    ChevronDown, ChevronUp, FileText, CheckCircle2, 
    Link as LinkIcon, Share2, Car, Globe, ShieldCheck
} from 'lucide-react';

// --- AI 深度整理：金田汽車業務 SOP 知識庫 ---
const PROCEDURES = [
    {
        category: "香港車輛業務",
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
                links: [{ name: "運輸署網上預約過戶", url: "https://www.gov.hk/tc/apps/tdabsbooking.htm" }]
            },
            {
                id: "td558",
                title: "車輛例牌 (續領行車證)",
                description: "為車輛延續行車證 (可續4個月或1年)",
                docs: [
                    "續領牌照表格 (TD558)",
                    "車輛登記文件 (牌簿 VRD) 正本",
                    "有效的汽車保險單 (Cover Note) (必須涵蓋新牌照首天)",
                    "三個月內之地址證明",
                    "驗車紙正本 (適用於車齡達 6 年或以上私家車/商用車)"
                ],
                steps: [
                    "如車輛需驗車，請先預約驗車中心並獲取合格驗車紙 (COR)。",
                    "確保汽車保險有效並覆蓋續牌期。",
                    "填妥 TD558 表格並由車主簽署。",
                    "透過郵寄、投遞箱或親身前往運輸署辦理，繳交相應牌照費用。",
                    "獲取新行車證，並張貼於車頭擋風玻璃左面。"
                ],
                forms: [{ name: "TD558 - 續領車輛牌照", url: "https://www.td.gov.hk/filemanager/common/td558_e-fillable_chi.pdf" }],
                links: [{ name: "網上續領車輛牌照", url: "https://www.gov.hk/tc/residents/transport/vehicle/renewvlicence.htm" }]
            },
            {
                id: "td320",
                title: "車輛套牌 / 留牌",
                description: "保留舊車牌號碼，或將幸運車牌套用於另一部車",
                docs: [
                    "留牌表格 (TD320) 或 套牌表格 (TD319)",
                    "車輛登記文件 (牌簿 VRD) 正本",
                    "車輛牌照 (行車證) 正本",
                    "車主身份證正本及三個月內地址證明正本"
                ],
                steps: [
                    "車主填妥並簽署 TD320(留牌) 或 TD319(套牌) 表格。",
                    "前往運輸署辦理，交回原有牌簿與行車證。",
                    "繳交留牌/套牌手續費 (通常為 $560)。",
                    "運輸署發出「保留車輛登記號碼憑證」(留牌紙) 或印有新號碼的牌簿。",
                    "通知保險公司更新保單上的車牌號碼。",
                    "前往車牌舖製作實體車牌並掛上車輛。"
                ],
                forms: [
                    { name: "TD320 - 保留車輛登記號碼", url: "https://www.td.gov.hk/filemanager/common/td320_e-fillable_chi.pdf" },
                    { name: "TD319 - 轉移車輛登記號碼", url: "https://www.td.gov.hk/filemanager/common/td319_e-fillable_chi.pdf" }
                ],
                links: []
            },
            {
                id: "hk_crp",
                title: "香港禁區紙辦理 (TD547)",
                description: "申請或續領封閉道路通行許可證 (常規中港車必備)",
                docs: [
                    "申請表格 (TD547)",
                    "廣東省公安廳發出的有效批文正本及副本",
                    "香港車輛登記文件 (牌簿) 副本",
                    "香港有效汽車保險單副本",
                    "車主/公司身份證明文件副本"
                ],
                steps: [
                    "確認廣東省公安廳批文仍然有效。",
                    "填妥 TD547 表格並準備好所有文件副本。",
                    "親身或郵寄至過境服務分組 (中環林士街停車場) 辦理。",
                    "繳交費用 (視乎口岸及期限，新申請通常 $540，續領可能不同)。",
                    "領取禁區紙正本，必須張貼於車輛擋風玻璃上。"
                ],
                forms: [{ name: "TD547 - 封閉道路通行許可證", url: "https://www.td.gov.hk/filemanager/common/td547_e-fillable_chi.pdf" }],
                links: [{ name: "運輸署 - 過境車輛申請指南", url: "https://www.td.gov.hk/tc/public_services/licences_and_permits/closed_road_permit_for_cross_boundary_vehicles/index.html" }]
            },
            {
                id: "chunming_ins",
                title: "俊銘保險 (各種表格下載)",
                description: "下載俊銘保險經紀的相關投保及理賠表格",
                docs: [
                    "車主身份證 / 公司 BR 副本",
                    "車輛牌簿 (VRD) 副本",
                    "司機駕駛執照副本 (如需記名)"
                ],
                steps: [
                    "根據客戶需求，選擇下載相應的投保書或理賠表格。",
                    "請客戶清晰填寫表格並在指定位置簽署 (如屬公司需蓋公司印)。",
                    "連同牌簿、身份證等所需文件，電郵或 WhatsApp 發送給俊銘保險專員。",
                    "等待報價及確認保單 (Cover Note)。"
                ],
                forms: [
                    { name: "汽車保險投保書 (通用)", url: "#" },
                    { name: "交通意外理賠申請表", url: "#" }
                ],
                links: [{ name: "俊銘保險官方網站", url: "https://www.chunming.com.hk/" }]
            }
        ]
    },
    {
        category: "港車北上專區",
        icon: Globe,
        items: [
            {
                id: "northbound_app",
                title: "港車北上申請流程",
                description: "從抽籤到獲取電子牌證的完整申請 SOP",
                docs: [
                    "香港身份證 及 港澳居民來往內地通行證 (回鄉證)",
                    "香港車輛登記文件 (牌簿 VRD)",
                    "司機的香港駕駛執照 及 內地駕駛證",
                    "符合規定的「等效先認」跨境汽車保險單"
                ],
                steps: [
                    "於「港車北上」指定網站登記電腦抽籤。",
                    "中籤後，在獲分配的指定時間內透過網上系統遞交正式申請。",
                    "申請獲初步審批後，聯絡保險公司購買「等效先認」內地交強險/商業險。",
                    "安排車輛前往香港的指定驗車中心 (如中檢) 進行車輛查驗 (如適用)。",
                    "內地交警及海關完成審批後，獲發「電子牌證」。",
                    "獲批後即可於「指定日子預約系統」預約出行日期。"
                ],
                forms: [],
                links: [
                    { name: "「港車北上」官方資訊網站", url: "https://www.hzmbqfs.gov.hk/tc/" },
                    { name: "港車北上網上申請/抽籤平台", url: "https://www.hzmbqfs.gov.hk/tc/application/" }
                ]
            },
            {
                id: "northbound_zhuhai",
                title: "港車北上珠海網站 (預約通關)",
                description: "廣東省交管局及珠海免稅通關系統相關操作",
                docs: ["已獲批的電子牌證號碼", "註冊時的手機號碼/賬號密碼"],
                steps: [
                    "成功申請港車北上後，必須在出發前進行預約。",
                    "登入「港車北上指定日子預約系統」或廣東省公安廳平台。",
                    "選擇預計經港珠澳大橋前往珠海的日期。",
                    "確認預約後，系統會發出預約確認通知。",
                    "到達口岸時，系統會自動識別車牌及電子標籤，實現免簽注快速通關。"
                ],
                forms: [],
                links: [{ name: "廣東省政務服務網 (港車北上專區)", url: "https://macao-zhuhai.dsat.gov.mo/" }]
            },
            {
                id: "northbound_cancel",
                title: "港車北上註銷手續",
                description: "如何申請註銷港車北上資格 (例如車輛需賣出或報廢)",
                docs: [
                    "原申請人的身份證明文件",
                    "車輛牌簿",
                    "註銷原因證明 (如賣車收據、報廢證明等)"
                ],
                steps: [
                    "登入「港車北上」內地政務系統的個人中心。",
                    "選擇「車輛註銷/退出」業務板塊。",
                    "填寫註銷原因，並上傳相關證明文件 (如已過戶的牌簿副本)。",
                    "提交申請後，等待內地交警部門審批 (約需數個工作日)。",
                    "註銷成功後，該車輛的電子牌證即時失效，新車主才可重新入籤申請。"
                ],
                forms: [],
                links: []
            },
            {
                id: "zhuhai_police",
                title: "珠海交警聯絡 (違章處理)",
                description: "處理內地交通違規、扣分及車輛事故聯絡",
                docs: ["香港駕駛執照", "內地機動車駕駛證", "違章通知書或短訊"],
                steps: [
                    "如在內地發生輕微交通事故，請立即拍照並將車輛移至安全位置，隨後透過微信「交管12123」App 處理。",
                    "如需報警，請在內地撥打 122 (交通事故) 或 110 (報警求助)。",
                    "查詢違章紀錄：關注微信公眾號「珠海交警」或登入「交管12123」App。",
                    "處理罰單：大部分違章可透過「交管12123」App 綁定內地銀行卡線上繳費扣分。",
                    "若需親身處理，需帶齊駕駛證前往珠海市交警支隊各業務大廳辦理。"
                ],
                forms: [],
                links: [
                    { name: "廣東省公安廳交通管理局", url: "http://gdgajj.gd.gov.cn/" }
                ]
            }
        ]
    },
    {
        category: "中港常規指標業務",
        icon: ShieldCheck,
        items: [
            {
                id: "ccic_yuenlong",
                title: "元朗中檢驗車預約",
                description: "中港車輛年審 - 中國檢驗有限公司 (元朗) 預約及辦理",
                docs: [
                    "廣東省公安廳發出的《批准通知書》(批文卡) 正本及副本",
                    "香港車輛登記文件 (牌簿) 正本及副本",
                    "車輛彩色照片 (左前方45度角，可見車牌)",
                    "公司蓋章 (如有)"
                ],
                steps: [
                    "登入中國檢驗有限公司 (CCIC) 網站，選擇「汽車檢驗網上預約」。",
                    "輸入中港車牌號碼、底盤號碼等資料，選擇前往元朗中心的日期及時段。",
                    "列印或截圖保留預約確認信。",
                    "按預約時間駛往元朗工業邨福宏街5號中檢汽車檢驗中心。",
                    "現場繳交驗車費，進行上線檢測及拓印引擎/底盤號碼。",
                    "檢驗合格後，領取最新的《機動車安全技術檢驗合格證明》。"
                ],
                forms: [],
                links: [{ name: "中檢公司 - 汽車檢驗網上預約", url: "http://www.cictc.com/tc/booking.html" }]
            },
            {
                id: "gd_police_portal",
                title: "廣東省公安廳平台查詢 (批文管理)",
                description: "查詢及辦理中港牌批文延期、換車、更換司機等業務",
                docs: [
                    "批文卡號碼",
                    "公司法人/登記人手機號碼 (接收驗證碼)"
                ],
                steps: [
                    "登入「廣東省公安廳交通管理局政務服務網」。",
                    "使用企業賬號或手機驗證碼登入系統。",
                    "進入「粵港澳機動車業務」板塊。",
                    "您可在此進行：批文有效期查詢、提交批文延期申請、變更司機資料、變更車輛資料 (換車) 等線上預審手續。",
                    "預審通過後，根據系統指示打印回執，前往指定實體窗口 (如中旅社) 辦理刷卡或換證手續。"
                ],
                forms: [],
                links: [
                    { name: "廣東省公安廳政務服務網", url: "http://gdgajj.gd.gov.cn/" },
                    { name: "業務辦理進度查詢", url: "http://gdgajj.gd.gov.cn/wsbl/bljd/index.html" }
                ]
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
