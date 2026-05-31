'use client';

import React, { useState } from 'react';
import { 
    BookOpen, Copy, Printer, ExternalLink, Download, 
    ChevronDown, ChevronUp, FileText, CheckCircle2, 
    Link as LinkIcon, Share2, Car, Globe, ShieldCheck,
    Check, X, Calculator, HelpCircle
} from 'lucide-react';

export default function BusinessProcessModule(props: any) {
    const [activeCategory, setActiveCategory] = useState("香港車輛業務");
    const [expandedItem, setExpandedItem] = useState<string | null>("td25");

    // --- 動態自定義狀態 (用於即時注入文字與 PDF) ---
    const [ownerType, setOwnerType] = useState<'hk' | 'cn' | 'overseas'>('hk'); // 過戶車主身份
    const [licenceType, setLicenceType] = useState<'petrol' | 'electric'>('petrol'); // 續牌車種類型
    const [ccOrWeight, setCcOrWeight] = useState<string>('1500'); // CC或重量
    const [calculatedFee, setCalculatedFee] = useState<string>('3929'); // 計算後的牌費
    const [plateType, setPlateType] = useState<'traditional' | 'custom'>('traditional'); // 車牌類型

    // --- 預設 AI 整合的業務 SOP 數據中心 ---
    const PROCEDURES = [
        {
            category: "香港車輛業務",
            icon: Car,
            items: [
                {
                    id: "td25",
                    title: "車輛過戶 (轉手)",
                    description: "辦理香港車輛擁有權轉讓手續 (已整合不同國籍車主必備文件)",
                    docs: [
                        `【車主身份確認：${ownerType === 'hk' ? '香港本地居民' : ownerType === 'cn' ? '中國內地人士' : '國外/海外人士'}】`,
                        ownerType === 'hk' ? "新舊車主香港身份證正本 (若委託代辦，需兩張身份證正本 + 雙方簽署授權書)" :
                        ownerType === 'cn' ? "新舊車主有效內地護照正本 + 蓋有香港入境印章的逗留簽證/通行證紀錄 (不可單憑內地身份證辦理)" :
                        "新舊車主外國護照正本 + 有效香港簽證紀錄 / 或者是香港法團商業登記證 (BR) 正本及公司印章",
                        "過戶表格 (TD25) - 新舊車主需填妥並簽署 (簽名須與牌簿及證件完全一致)",
                        "新車主汽車保險單 (Cover Note / Policy) 正本 - 必須覆蓋過戶當日",
                        "車輛登記文件 (牌簿 VRD) 正本",
                        "新車主最近三個月內之香港有效地址證明正本 (如水電費單、銀行月結單)"
                    ],
                    steps: [
                        "確認車輛無未清繳的交通罰款、未繳牌費或法庭傳票。",
                        "新車主聯絡保險公司購買保險，並獲取臨時保單 (Cover Note)。",
                        "雙方填妥並簽署 TD25 表格。請務必核對舊車主簽名是否與當初買車時的牌簿簽名相符。",
                        "準備好所有文件，前往運輸署牌照事務處排隊辦理，或透過網上預約前往專屬窗口。",
                        "繳交過戶費用：電單車及機動三輪車為 $250 / 其他所有車輛 (包括私家車、貨車) 為 $1,000。",
                        "運輸署職員審批後，即時發出印有新車主資料的新牌簿 (VRD)。"
                    ],
                    forms: [{ name: "TD25 - 車輛過戶通知書 (電子填表版)", url: "https://www.td.gov.hk/filemanager/common/td25_e-fillable_chi.pdf" }],
                    links: [{ name: "運輸署 - 網上預約過戶/牌照服務", url: "https://www.gov.hk/tc/apps/tdabs.htm" }]
                },
                {
                    id: "first_reg",
                    title: "新車登記出牌 (行貨 vs 水貨)",
                    description: "全新車或進口二手車在香港首次登記及出牌流程",
                    docs: [
                        "首次登記表格 (TD22) - 填妥並簽署",
                        "香港海關發出的「汽車評稅通知書」正本 (核對首次登記稅金額)",
                        "車輛機械查驗合格證明書 (驗車紙) - 證明符合香港安全及環保規格",
                        "有效汽車保險單 (Cover Note) 正本",
                        "車主身份證明文件 (身份證/商業登記證 BR) 正本及三個月內地址證明",
                        "【水貨/平行進口額外文件】: 運輸署發出的進口車輛批准信、環境保護署發出的符合廢氣及噪音排放標準認可信"
                    ],
                    steps: [
                        "【行貨情況】: 通常由香港官方代理商 (如大昌行、錦龍等) 全權辦妥首次登記稅並安排上線驗車，出車時已落好牌簿。",
                        "【水貨情況 (平行進口)】: 抵港後必須先向海關申報並評定車價 (核定首次登記稅)；隨後安排車輛前往驗車中心進行廢氣及安全檢測。",
                        "確保獲取海關評稅通知書及環保署合格證明後，向保險公司購買汽車保險。",
                        "攜帶所有正本文件前往運輸署金鐘牌照事務處 (首次登記組) 遞交申請。",
                        "繳交首次登記稅、一年或四個月的行車牌費、以及交通意外傷亡援助基金徵費 ($114)。",
                        "獲編配香港車牌號碼，獲發首次登記牌簿及行車證，隨後可製作實體車牌掛車。"
                    ],
                    forms: [{ name: "TD22 - 車輛首次登記申請書", url: "https://www.td.gov.hk/filemanager/common/td22_chi.pdf" }],
                    links: [{ name: "環境保護署 - 進口車輛環保標準指南", url: "https://www.epd.gov.hk/epd/tc_chi/environmentinhk/air/guide_ref/import_vapil.html" }]
                },
                {
                    id: "td558",
                    title: "車輛例牌 (續領行車證)",
                    description: "為車輛續期行車證，內建傳統私家車及電動車牌費動態試算",
                    docs: [
                        `【預計續牌車型：${licenceType === 'petrol' ? '傳統汽油/柴油私家車' : '純電動私家車'} | 注入牌費金額: $${calculatedFee}】`,
                        "續領牌照表格 (TD558) - 車主親筆簽署",
                        "車輛登記文件 (牌簿 VRD) 正本",
                        "有效的汽車保險單 (Cover Note) - 保險生效日期必須涵蓋新行車證生效首天",
                        "車主三個月內之地址證明正本 (如水電單或銀行信)",
                        licenceType === 'petrol' ? "驗車紙正本 (適用於車齡達 6 年或以上的私家車，需先至指定驗車中心年審)" : "驗車紙正本 (電動私家車同樣適用車齡達 6 年或以上需年審之規定)"
                    ],
                    steps: [
                        "若車齡達 6 年或以上，需提早 4 個月內預約政府指定汽車檢查中心進行年驗，獲取合格驗車紙 (COR)。",
                        "聯絡保險公司續期或購買新汽車保單，確保保單生效日與新行車證無縫銜接。",
                        "填妥 TD558 表格。可使用下方工具動態試算牌費並填入表格中。",
                        "透過運輸署網上預約系統預約親身辦理、或將文件投入運輸署投遞箱、亦可郵寄辦理。",
                        "繳交對應之行車牌費（已包含 $114 基金徵費）。",
                        "領取新行車證（俗稱行車貼紙），裁剪後張貼於車頭擋風玻璃左下角。"
                    ],
                    forms: [{ name: "TD558 - 續領車輛牌照申請書", url: "https://www.td.gov.hk/filemanager/common/td558_e-fillable_chi.pdf" }],
                    links: [{ name: "運輸署 - 網上預約續領行車證", url: "https://www.gov.hk/tc/apps/tdabs.htm" }]
                },
                {
                    id: "td320",
                    title: "車輛留牌 / 套牌 & 自訂車牌拍賣",
                    description: "保留原有車牌、轉移登記號碼，或申請/購買自訂與特別車牌",
                    docs: [
                        `【車牌種類：${plateType === 'traditional' ? '傳統特別車牌/常規車牌' : '自訂車牌 (Personalized Mark)'}】`,
                        "留牌表格 (TD320) - 適用於將原有車牌抽起保留 / 套牌表格 (TD319) - 適用於兩車對調或換牌",
                        "車輛登記文件 (牌簿 VRD) 正本 及 車輛牌照 (行車證) 正本",
                        "車主身份證明文件正本 及 三個月內有效地址證明",
                        plateType === 'custom' ? "運輸署發出的「自訂車輛登記號碼分配通知書」正本及拍賣官簽署的回執" : "特別車牌拍賣中標確認書 (如適用)"
                    ],
                    steps: [
                        "【留牌/套牌】: 填妥 TD320，親身前往運輸署辦理。繳交 $560 留牌費，原車會被編配一個隨機的新舊車牌（給予新牌簿及行車證），並獲發一張為期 1 年的「留牌紙」。",
                        "【傳統特別車牌拍賣】: 運輸署定期於週末舉辦傳統幸運車牌拍賣（如雙字頭、好意頭數字），市民中標並繳付款項後，可持確認書於 12 個月內將該牌套上自己名下的車輛。",
                        "【自訂車牌申請 (DIY)】: 運輸署每年分 1-2 期接受市民自訂車牌組合申請（最多 8 個位，可含空格）。通過兩輪審批後，需繳付 $5,000 按金並進入公開拍賣。若現場無其他人競投，則由申請人以底價 $5,000 得標。",
                        "得標或成功辦理套牌後，需立刻通知保險公司更新保單上的車牌號碼 (Reg Mark)。",
                        "前往汽車用品舖製作符合法例規格（前白後黃、反光物料、字體大小合規）的實體車牌並掛上車身。"
                    ],
                    forms: [
                        { name: "TD320 - 保留車輛登記號碼申請書", url: "https://www.td.gov.hk/filemanager/common/td320_e-fillable_chi.pdf" },
                        { name: "TD319 - 轉移車輛登記號碼申請書", url: "https://www.td.gov.hk/filemanager/common/td319_e-fillable_chi.pdf" }
                    ],
                    links: [
                        { name: "運輸署 - 自訂車輛登記號碼網上服務", url: "https://www.gov.hk/tc/residents/transport/vehicle/vrm.htm" },
                        { name: "最新傳統 / 自訂車牌拍賣時間表", url: "https://www.td.gov.hk/tc/public_services/licences_and_permits/vehicle_registration_marks_auction/index.html" }
                    ]
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
                        "符合規記的「等效先認」跨境汽車保險單"
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
                }
            ]
        },
        {
            category: "常規中港及保險業務",
            icon: ShieldCheck,
            items: [
                {
                    id: "wellsmart_ins",
                    title: "俊銘保險 (Wellsmart Insurance)",
                    description: "全新修正：下載俊銘保險經紀的相關投保及理賠官方表格",
                    docs: [
                        "車主身份證 / 公司商業登記證 BR 副本",
                        "車輛登記文件 (牌簿 VRD) 副本",
                        "指定司機的香港駕駛執照副本 (如需記名保險)"
                    ],
                    steps: [
                        "根據客戶的車款及跨境需求，引導客戶前往俊銘官方網站瀏覽最新的保險計劃。",
                        "點擊下方修正後的官方連結，下載「汽車保險投保書」或「交通意外理賠申請表」。",
                        "請客戶清晰填寫表格，並在聲明頁面親筆簽署 (公司車需加蓋公司印章)。",
                        "將填妥的表格連同牌簿副本、身份證副本，電郵或 WhatsApp 發送給俊銘保險專員進行精準報價或啟動理賠程序。"
                    ],
                    forms: [{ name: "俊銘保險 - 官方表格及保險資訊下載區", url: "https://www.wellsmart.com.hk/tc/insurance-info.html" }],
                    links: [{ name: "俊銘保險 (Wellsmart) 官方網站主頁", url: "https://www.wellsmart.com.hk/tc/index.html" }]
                }
            ]
        }
    ];

    // 一鍵複製轉發給客戶 (WhatsApp 友好格式)
    const handleCopyToWhatsApp = (item: any) => {
        const text = `📋 *【${item.title}】辦理指南*\n\n` +
            `📝 *所需準備文件：*\n${item.docs.map((d:string) => `• ${d}`).join('\n')}\n\n` +
            `✅ *辦理步驟：*\n${item.steps.map((s:string, i:number) => `${i+1}. ${s}`).join('\n')}\n\n` +
            (item.forms.length > 0 ? `📎 *相關表格下載：*\n${item.forms.map((f:any) => `${f.name}: ${f.url}`).join('\n')}\n\n` : '') +
            (item.links.length > 0 ? `🔗 *官方實用連結：*\n${item.links.map((l:any) => `${l.name}: ${l.url}`).join('\n')}\n\n` : '') +
            `💡 _以上資訊由 金田汽車 提供，如有疑問請隨時聯絡我們！_`;
        
        navigator.clipboard.writeText(text).then(() => {
            alert("✅ 複製成功！\n您可以直接在 WhatsApp 或微信中貼上並發送給客戶。");
        });
    };

    // 觸發列印/存為 PDF (已升級強效置頂引擎，防空白頁)
    const handlePrintPDF = () => {
        window.print();
    };

    const currentItem = PROCEDURES.find(c => c.category === activeCategory)?.items.find(i => i.id === expandedItem) 
                        || PROCEDURES.find(c => c.category === activeCategory)?.items[0];

    return (
        <div className="flex flex-col md:flex-row h-full bg-slate-50 relative">
            
            {/* ★★★ 終極強效置頂列印引擎 CSS ★★★ */}
            <style>{`
                @media print {
                    /* 徹底切斷外部所有框架的渲染干擾，全面隱藏 */
                    body > div, main, sidebar, header, .no-print, nav, aside { 
                        display: none !important; 
                        visibility: hidden !important; 
                    }
                    /* 強行建立一個絕對置頂、寬度 100% 的乾淨列印根節點 */
                    .super-print-root {
                        display: block !important;
                        visibility: visible !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        background: white !important;
                        color: black !important;
                        padding: 30px !important;
                        z-index: 9999999 !important;
                    }
                    .super-print-root * {
                        visibility: visible !important;
                        color: black !important;
                    }
                    /* 確保表格和高難度排版在紙張上完美延展 */
                    .print-grid {
                        display: block !important;
                    }
                    .print-col {
                        width: 100% !important;
                        margin-bottom: 25px !important;
                        page-break-inside: avoid !important;
                    }
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
                                onClick={() => {
                                    setActiveCategory(cat.category);
                                    setExpandedItem(cat.items[0].id);
                                }}
                                className={`w-full text-left flex items-center p-3 rounded-lg font-bold transition-all ${activeCategory === cat.category ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                <Icon size={18} className="mr-3 flex-none" />
                                {cat.category}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 右側主要內容區 */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0">
                
                {/* 中間欄：該分組下的子業務列表 */}
                <div className="w-full md:w-72 bg-white border-r border-slate-200 overflow-y-auto p-2 space-y-1 no-print flex-none">
                    <div className="p-2 text-xs font-bold text-slate-400 uppercase tracking-wider">選擇業務子項目</div>
                    {PROCEDURES.find(c => c.category === activeCategory)?.items.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setExpandedItem(item.id)}
                            className={`w-full text-left p-3 rounded-xl transition-all flex flex-col border ${expandedItem === item.id ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100'}`}
                        >
                            <span className="font-bold text-sm">{item.title}</span>
                            <span className={`text-xs mt-1 line-clamp-1 ${expandedItem === item.id ? 'text-slate-300' : 'text-slate-400'}`}>{item.description}</span>
                        </button>
                    ))}
                </div>

                {/* 右邊大區塊：單個業務的詳情看板 (即將被塞入強效列印區) */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
                    {currentItem && (
                        <div className="max-w-3xl mx-auto space-y-6 super-print-root">
                            
                            {/* 看板標頭 */}
                            <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wider no-print">{activeCategory}</span>
                                    <h3 className="font-black text-2xl text-slate-800 mt-1">{currentItem.title}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{currentItem.description}</p>
                                </div>
                                
                                {/* 操作列 (不列印) */}
                                <div className="flex gap-2 flex-none no-print">
                                    <button 
                                        onClick={() => handleCopyToWhatsApp(currentItem)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-colors shadow-sm"
                                    >
                                        <Share2 size={14} /> 複製文字 (發給客戶)
                                    </button>
                                    <button 
                                        onClick={handlePrintPDF}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors shadow-sm"
                                    >
                                        <Printer size={14} /> 列印 / 存為 PDF
                                    </button>
                                </div>
                            </div>

                            {/* ★★★ 智能互動組件注入區 (只在非列印狀態下操作，但結果會完美注入文件) ★Filter/Controls */}
                            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 no-print space-y-3">
                                <div className="flex items-center gap-2 text-xs font-black text-amber-800 uppercase tracking-wider">
                                    <Calculator size={14} /> 業務資料動態設定與試算工具 (設定後自動注入下方指南)
                                </div>
                                
                                {/* 針對車輛過戶的動態設定 */}
                                {currentItem.id === 'td25' && (
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                                        <span>選擇新舊車主身份別：</span>
                                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                                            <button onClick={() => setOwnerType('hk')} className={`px-2.5 py-1 text-xs font-bold rounded-md ${ownerType === 'hk' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>香港本地</button>
                                            <button onClick={() => setOwnerType('cn')} className={`px-2.5 py-1 text-xs font-bold rounded-md ${ownerType === 'cn' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>中國內地</button>
                                            <button onClick={() => setOwnerType('overseas')} className={`px-2.5 py-1 text-xs font-bold rounded-md ${ownerType === 'overseas' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>國外/海外</button>
                                        </div>
                                    </div>
                                )}

                                {/* 針對續牌費的動態設定 */}
                                {currentItem.id === 'td558' && (
                                    <div className="space-y-2 text-sm text-slate-700">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span>車種類型：</span>
                                            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                                                <button onClick={() => { setLicenceType('petrol'); setCalculatedFee('3929'); }} className={`px-2.5 py-1 text-xs font-bold rounded-md ${licenceType === 'petrol' ? 'bg-amber-600 text-white' : 'text-slate-600'}`}>傳統私家車 (汽油)</button>
                                                <button onClick={() => { setLicenceType('electric'); setCalculatedFee('1214'); }} className={`px-2.5 py-1 text-xs font-bold rounded-md ${licenceType === 'electric' ? 'bg-amber-600 text-white' : 'text-slate-600'}`}>純電動私家車</button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 pt-1">
                                            <label className="flex items-center gap-1">
                                                <span className="text-xs font-bold text-slate-500">{licenceType === 'petrol' ? '引擎汽缸容量 (cc):' : '車輛淨重 (kg):'}</span>
                                                <input type="number" value={ccOrWeight} onChange={e => setCcOrWeight(e.target.value)} className="w-20 px-2 py-0.5 border rounded text-xs text-center font-bold" />
                                            </label>
                                            <label className="flex items-center gap-1">
                                                <span className="text-xs font-bold text-slate-500">計算後牌費費用 ($):</span>
                                                <input type="number" value={calculatedFee} onChange={e => setCalculatedFee(e.target.value)} className="w-24 px-2 py-0.5 border border-amber-300 rounded text-xs text-center font-black bg-white text-red-600" />
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* 針對留牌套牌的設定 */}
                                {currentItem.id === 'td320' && (
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                                        <span>車牌性質分流：</span>
                                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                                            <button onClick={() => setPlateType('traditional')} className={`px-2.5 py-1 text-xs font-bold rounded-md ${plateType === 'traditional' ? 'bg-purple-600 text-white' : 'text-slate-600'}`}>傳統/常規特別車牌</button>
                                            <button onClick={() => setPlateType('custom')} className={`px-2.5 py-1 text-xs font-bold rounded-md ${plateType === 'custom' ? 'bg-purple-600 text-white' : 'text-slate-600'}`}>自訂車牌 (1-8位組合)</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 核心內容雙欄排版 (對應列印引擎優化) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-grid">
                                
                                {/* 左邊：文件清單 */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 print-col shadow-sm">
                                    <h4 className="font-black text-slate-800 flex items-center gap-1.5 mb-3 border-b border-slate-100 pb-2 text-base">
                                        <FileText size={16} className="text-amber-500" /> 所需準備文件
                                    </h4>
                                    <ul className="space-y-2.5">
                                        {currentItem.docs.map((doc, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                                                <CheckCircle2 size={16} className="text-emerald-500 flex-none mt-0.5" />
                                                <span>{doc}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    
                                    {/* 表格下載區 */}
                                    {currentItem.forms.length > 0 && (
                                        <div className="mt-6">
                                            <h4 className="font-black text-slate-800 flex items-center gap-1.5 mb-3 border-b border-slate-100 pb-2 text-base">
                                                <Download size={16} className="text-blue-500" /> 相關表格下載
                                            </h4>
                                            <div className="space-y-2">
                                                {currentItem.forms.map((form, idx) => (
                                                    <a key={idx} href={form.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2.5 bg-slate-50 border border-blue-100 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all group">
                                                        <span className="text-xs font-bold text-blue-700 group-hover:text-blue-800 line-clamp-1">{form.name}</span>
                                                        <ExternalLink size={14} className="text-blue-400 group-hover:text-blue-600 flex-none" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 右邊：辦理步驟與官方連結 */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 print-col shadow-sm">
                                    <h4 className="font-black text-slate-800 flex items-center gap-1.5 mb-3 border-b border-slate-100 pb-2 text-base">
                                        <ShieldCheck size={16} className="text-indigo-500" /> 辦理步驟及標準 SOP
                                    </h4>
                                    <div className="space-y-3">
                                        {currentItem.steps.map((step, idx) => (
                                            <div key={idx} className="flex items-start gap-3">
                                                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs flex-none mt-0.5">
                                                    {idx + 1}
                                                </div>
                                                <div className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-2 rounded border border-slate-100 flex-1">
                                                    {step}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* 實用官方連結 */}
                                    {currentItem.links.length > 0 && (
                                        <div className="mt-6">
                                            <h4 className="font-black text-slate-800 flex items-center gap-1.5 mb-2 border-b border-slate-100 pb-2 text-base">
                                                <LinkIcon size={16} className="text-purple-500" /> 實用官方連結 / 網上辦理位置
                                            </h4>
                                            <div className="space-y-1.5">
                                                {currentItem.links.map((link, idx) => (
                                                    <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 px-3 py-2 rounded-lg border border-purple-100 transition-colors">
                                                        <span>{link.name}</span> <ExternalLink size={12} />
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

            </div>
        </div>
    );
}
