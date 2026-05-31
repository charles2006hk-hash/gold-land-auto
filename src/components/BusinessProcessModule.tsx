'use client';

import React, { useState, useEffect } from 'react';
import { 
    BookOpen, Printer, ExternalLink, Download, 
    ChevronDown, ChevronUp, FileText, CheckCircle2, 
    Link as LinkIcon, Share2, Car, Globe, ShieldCheck,
    Calculator, HelpCircle, Scale, AlertTriangle, User, MapPin, Calendar
} from 'lucide-react';

export default function BusinessProcessModule(props: any) {
    const [activeCategory, setActiveCategory] = useState("香港車輛業務");
    const [expandedItem, setExpandedItem] = useState<string | null>("td25");

    // --- 1. 車輛牌費動態試算引擎狀態 ---
    const [ownerType, setOwnerType] = useState<'hk' | 'cn' | 'overseas'>('hk'); 
    const [licenceType, setLicenceType] = useState<'petrol' | 'electric'>('petrol'); 
    // ★ 更新：電動車改為輸入 kW，汽油車為 cc
    const [ccOrKw, setCcOrKw] = useState<string>('1500'); 
    const [calculatedFee, setCalculatedFee] = useState<string>('5074'); 
    const [plateType, setPlateType] = useState<'traditional' | 'custom'>('traditional'); 

    // --- 2. 香港法律級：交通意外和解書線上填寫狀態 ---
    const [settlementDate, setSettlementDate] = useState<string>('');
    const [settlementLoc, setSettlementLoc] = useState<string>('');
    const [partyAName, setPartyAName] = useState<string>('');
    const [partyAPlate, setPartyAPlate] = useState<string>('');
    const [partyBName, setPartyBName] = useState<string>('');
    const [partyBPlate, setPartyBPlate] = useState<string>('');
    const [settlementAmt, setSettlementAmt] = useState<string>('');
    const [settlementTerms, setSettlementTerms] = useState<string>('雙方同意以上和解金額已包括所有車輛損毀及醫療追討，此後互不追究。');

    // --- ★ 核心修正：監聽並精確計算香港運輸署最新牌費 (已內含 $114 TAVA 基金) ---
    useEffect(() => {
        const num = parseInt(ccOrKw) || 0;
        let fee = 0;
        if (licenceType === 'petrol') {
            // 傳統汽油私家車最新一年牌費公式 (根據 2026 最新收費表)
            if (num <= 1500) fee = 5074;
            else if (num <= 2500) fee = 7498;
            else if (num <= 3500) fee = 9929;
            else if (num <= 4500) fee = 12360;
            else fee = 14694;
        } else {
            // 純電動私家車最新一年牌費公式 (根據 2026/03/01 生效，按「額定功率 kW」計算)
            if (num <= 75) fee = 1614;
            else if (num <= 125) fee = 2114;
            else if (num <= 175) fee = 2614;
            else if (num <= 225) fee = 3114;
            else fee = 5114;
        }
        setCalculatedFee(fee.toString());
    }, [licenceType, ccOrKw]);

    // --- 業務 SOP 數據中心 ---
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
                        `【目前設定車主身份：${ownerType === 'hk' ? '香港本地居民' : ownerType === 'cn' ? '中國內地人士' : '國外/海外人士'}】`,
                        ownerType === 'hk' ? "新舊車主香港身份證正本 (若委託代辦，需雙方身份證正本 + 授權書)" :
                        ownerType === 'cn' ? "新舊車主有效內地護照正本 + 蓋有香港入境印章的逗留簽證/通行證紙本紀錄 (運輸署嚴格拒絕單憑內地身份證辦理)" :
                        "新舊車主外國護照正本 + 有效香港簽證紀錄 / 若是香港公司則需商業登記證 (BR) 正本及公司長條印章",
                        "過戶表格 (TD25) - 新舊車主填妥並簽署 (簽名必須與牌簿及當初買車登記時完全一致)",
                        "新車主汽車保險單 (Cover Note / Policy) 正本 - 保單生效日必須涵蓋過戶當日",
                        "車輛登記文件 (牌簿 VRD) 正本",
                        "新車主最近三個月內之香港有效地址證明正本 (如水電費單、銀行月結單，不接受電子版截圖列印)"
                    ],
                    steps: [
                        "確認車輛無未清繳的交通罰款、欠稅或法庭傳票。",
                        "新車主聯絡保險公司購買保險，獲取 Cover Note。",
                        "雙方填妥並簽署 TD25 表格，特別注意舊車主簽名若與牌簿不符會被當場拒絕。",
                        "準備好所有文件，親身前往運輸署牌照事務處辦理，或透過網上預約專屬窗口。",
                        "繳交過戶費用：電單車 $250 / 其他所有普通車輛 (私家車) 為 $1,000。",
                        "運輸署職員審批後，即時發出印有新車主資料的新牌簿 (VRD)。"
                    ],
                    forms: [{ name: "TD25 - 車輛過戶通知書 (電子可填寫版)", url: "https://www.td.gov.hk/filemanager/common/td25_e-fillable_chi.pdf" }],
                    links: [{ name: "運輸署 - 網上預約過戶/牌照服務窗口", url: "https://www.gov.hk/tc/apps/tdabs.htm" }]
                },
                {
                    id: "first_reg",
                    title: "新車登記出牌 (行貨 vs 水貨)",
                    description: "全新車或進口二手車在香港首次登記及海關A價評稅指南",
                    docs: [
                        "首次登記表格 (TD22) - 填妥並簽署",
                        "香港海關發出的「汽車評稅通知書」正本 - 核對首次登記稅金額及海關核准車價(A價)",
                        "車輛機械查驗合格證明書 (驗車紙) - 證明符合香港安全及環保規格",
                        "有效汽車保險單 (Cover Note) 正本",
                        "車主身份證明文件 (身份證/公司 BR) 正本及三個月內香港地址證明",
                        "【水貨/平行進口額外文件】: 運輸署發出的進口車輛批准信、環境保護署發出的符合廢氣及噪音排放標準認可信"
                    ],
                    steps: [
                        "【行貨/代理進口】: 通常由大昌行、錦龍等官方代理全權辦妥海關評稅與上線驗車，出車給客戶時已落好首登記牌簿。",
                        "【水貨/平行進口】: 車輛抵港後，必須先向香港海關申報並評定臨時車價（即海關A價，作為首次登記稅的課稅基準）。",
                        "前往海關官方系統線上查詢或核對相似車款的核准臨時車價 (A價)。",
                        "安排車輛前往政府指定驗車中心進行環境保護署的廢氣與噪音檢測，拿到合格證。",
                        "購買汽車保險後，攜帶所有正本文件前往運輸署金鐘牌照事務處 (首次登記組) 遞交申請。",
                        "繳交昂貴的首次登記稅、一年行車牌費，獲配車牌號碼並發放首次登記牌簿。"
                    ],
                    forms: [{ name: "TD22 - 車輛首次登記申請書 (最新電子版)", url: "https://www.td.gov.hk/filemanager/common/td22_e-fillable_chi.pdf" }],
                    links: [
                        { name: "香港海關 - 汽車核准居民臨時車價 (A價) 官方查詢系統", url: "https://eservices.customs.gov.hk/FRT/pbs/showEnquiryForm" },
                        { name: "環境保護署 - 進口車輛環保標準指南", url: "https://www.epd.gov.hk/epd/tc_chi/environmentinhk/air/guide_ref/import_vapil.html" }
                    ]
                },
                {
                    id: "td558",
                    title: "車輛例牌 (續領行車證)",
                    description: "為車輛續期行車證，內建最新汽油車及電動車牌費動態計算器",
                    docs: [
                        `【動態注入試算車型：${licenceType === 'petrol' ? '傳統汽油/柴油私家車' : '純電動私家車'} | 精確牌費: $${calculatedFee}】`,
                        "續領牌照表格 (TD558) - 車主親筆簽署",
                        "車輛登記文件 (牌簿 VRD) 正本",
                        "有效的汽車保險單 (Cover Note) - 保險生效日期必須涵蓋新行車證生效首天",
                        "車主三個月內之香港有效地址證明正本",
                        licenceType === 'petrol' ? `驗車紙正本 (車齡已滿 6 年之私家車，需先至指定驗車中心年審拿到 COR)` : `驗車紙正本 (電動車同樣適用滿 6 年需上線年審之法規)`
                    ],
                    steps: [
                        "若車齡已達 6 年或以上，需提早 4 個月內預約政府指定汽車檢查中心進行年驗。",
                        "使用下方工具輸入 CC 數或電動車額定功率 (kW)，系統會採用最新數據自動計算出一年牌費。",
                        "填妥 TD558 表格，金額必須與試算完全相符。",
                        "透過運輸署網上預約系統預約親身辦理、或將文件投入運輸署投遞箱、亦可郵寄辦理。",
                        "成功繳費後獲取新行車證（行車貼紙），裁剪後張貼於車頭擋風玻璃左下角。"
                    ],
                    forms: [{ name: "TD558 - 續領車輛牌照申請書 (電子填表版)", url: "https://www.td.gov.hk/filemanager/common/td558_e-fillable_chi.pdf" }],
                    links: [{ name: "運輸署 - 網上預約續領行車證/牌照服務", url: "https://www.gov.hk/tc/apps/tdabs.htm" }]
                },
                {
                    id: "td320",
                    title: "車輛留牌 / 套牌 & 自訂車牌",
                    description: "保留舊牌、轉移登記號碼，或申請特別/自訂車牌與拍賣資訊",
                    docs: [
                        `【車牌模式分流：${plateType === 'traditional' ? '傳統常規特別車牌拍賣' : '自訂車牌 (1-8位英數組合)'}】`,
                        "留牌表格 (TD320) - 抽起原有車牌保留 1 年 / 套牌表格 (TD319) - 兩車對調號碼",
                        "車輛登記文件 (牌簿 VRD) 正本 及 車輛牌照 (行車證) 正本",
                        "車主身份證明文件正本 及 三個月內有效地址證明",
                        plateType === 'custom' ? "運輸署發出的「自訂車輛登記號碼分配通知書」正本" : "特別車牌拍賣中標確認書 (如適用)"
                    ],
                    steps: [
                        "【常規留牌】: 填妥 TD320，親身前往運輸署辦理。繳交 $560 留牌費，原車會被編配一個隨機新車牌，並獲發一張為期 1 年的「留牌紙」。",
                        "【傳統特別車牌查詢與拍賣】: 運輸署定期舉辦特別幸運車牌拍賣（如雙字頭、好意頭數字組合）。市民可透過下方官方連結查詢傳統車牌的拍賣時間表與底價資訊。",
                        "【自訂車牌申請 (DIY)】: 運輸署每年分期接受市民自訂 1-8 位的專屬車牌。通過審批後，需繳付 $5,000 按金並進入公開拍賣。若現場無人競投，則由申請人以底價 $5,000 得標。",
                        "得標或成功辦理套牌後，需立刻通知保險公司更新保單上的車牌號碼 (Reg Mark)。",
                        "前往汽車用品舖製作符合法例規格的前白後黃反光實體車牌掛上車身。"
                    ],
                    forms: [
                        { name: "TD320 - 保留車輛登記號碼申請書", url: "https://www.td.gov.hk/filemanager/common/td320_e-fillable_chi.pdf" },
                        { name: "TD319 - 轉移車輛登記號碼申請書", url: "https://www.td.gov.hk/filemanager/common/td319_e-fillable_chi.pdf" }
                    ],
                    links: [
                        { name: "運輸署 - 自訂車輛登記號碼網上查詢、申請與網上服務", url: "https://www.gov.hk/tc/residents/transport/vehicle/ospvrm.htm" },
                        { name: "運輸署 - 傳統特別車牌號碼查詢與拍賣指南", url: "https://www.gov.hk/tc/residents/transport/vehicle/regmarks.htm" }
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
                    description: "兩地常規常規牌照年審 - 中國檢驗有限公司 (元朗) 流程",
                    docs: [
                        "廣東省公安廳發出的《批准通知書》(批文卡) 正本及副本",
                        "香港車輛登記文件 (牌簿) 正本及副本",
                        "車輛彩色照片 (左前方45度角，清晰可見車牌)",
                        "兩地牌公司蓋章 (長條印/公章)"
                    ],
                    steps: [
                        "登入中國檢驗有限公司 (CCIC) 官方預約網絡系統。",
                        "輸入中港車牌號碼、底盤號碼、接收短訊的手機號，選擇前往元朗中心的日期及時段。",
                        "按預約時間駛往元朗工業邨福宏街5號中檢汽車檢驗中心。",
                        "現場繳交驗車費，進行上線安全檢測、拓印底盤號碼並拍攝官方照片。",
                        "檢驗合格後，領取最新的《機動車安全技術檢驗合格證明》，為後續公安廳刷卡延期做準備。"
                    ],
                    forms: [],
                    links: [{ name: "中檢公司 - 汽車檢驗網上預約官方門戶", url: "http://www.cictc.com/tc/booking.html" }]
                },
                {
                    id: "gd_police_portal",
                    title: "廣東省公安廳網上辦理及查詢",
                    description: "中港牌批文卡管理 - 線上資料上傳與變更司機預審",
                    docs: [
                        "批文卡原件及企業註冊賬號密碼",
                        "新司機的回鄉證、香港駕照、內地駕照彩色掃描件",
                        "公司最新商業登記證 BR 掃描件"
                    ],
                    steps: [
                        "登入廣東省公安廳交通管理局政務服務網（大灣區兩地牌專區）。",
                        "進入「粵港澳機動車業務」板塊，可即時查詢批文剩餘有效期、違章紀錄。",
                        "如需進行批文延期、更換車輛（換車）或變更司機，必須先在此平台填寫資料並上傳所有高清彩色文件掃描件進行線上「預審」。",
                        "內地交警線上審批通過後，打印帶有條碼的業務回執，再前往指定實體窗口辦理刷卡換證。"
                    ],
                    forms: [],
                    links: [
                        { name: "廣東省公安廳交通管理局政務服務網", url: "http://gdgajj.gd.gov.cn/" },
                        { name: "內地兩地牌業務網上辦理進度實時查詢", url: "http://gdgajj.gd.gov.cn/wsbl/bljd/index.html" }
                    ]
                },
                {
                    id: "cb_rules",
                    title: "兩地牌常規維護與黃金注意事項",
                    description: "核心部署：每年批文續期、公司年檢與強硬回港法規",
                    docs: [
                        "香港公司 BR 及 內地外資企業年審執照",
                        "兩地有效汽車保險單",
                        "批文卡正本"
                    ],
                    steps: [
                        "【每年公司年檢】: 中港牌通常掛在香港殼公司名下，每年必須準時辦理香港公司的商業登記證 (BR) 續期及遞交周年申報表 (NAR1)，若公司死掉，中港指標會被即時註銷！",
                        "【每年批文延期】: 常規兩地牌批文有效期通常為1年，必須在到期前 60 天內，辦妥內地交強險、香港驗車（中檢）及公安廳線上申報，完成刷卡延期。",
                        "【🚨 核心防封死：3個月強行回港法規】: 根據海關與邊檢法規，常規中港車進入內地後，*每 3 個月內必須至少返回香港一次*（即通關回港走一次大橋或口岸紀錄），否則車輛在內地會被鎖定為「超期滯留」，面臨高額罰款甚至扣留指標！",
                        "【司機限制】: 車輛只能由批文卡上登記的「正港司機」或「副港司機」駕駛通關，絕不可私自借給未登記人士開過關。"
                    ],
                    forms: [],
                    links: []
                }
            ]
        },
        {
            category: "大灣區跨境專區 (港車/澳車)",
            icon: Globe,
            items: [
                {
                    id: "northbound_app",
                    title: "港車北上 (香港車去廣東)",
                    description: "香港私家車經港珠澳大橋進入廣東省完整 SOP",
                    docs: ["香港身份證及回鄉證", "香港牌簿 VRD 正本", "兩地駕駛執照", "「等效先認」跨境保險"],
                    steps: [
                        "於港車北上官方網站進行電腦登記抽籤。",
                        "中籤後，於指定時間內登入網上系統填寫申請資料並上傳文件。",
                        "初步審批通過後，聯絡保險公司加購中國內地交強險（等效先認）。",
                        "預約車輛前往香港指定驗車點（如中檢）進行封閉查驗。",
                        "內地審批完成獲發電子牌證後，出發前必須透過「指定日子預約系統」預約通關出行日期。"
                    ],
                    forms: [],
                    links: [{ name: "「港車北上」官方網上申請與抽籤平台", url: "https://www.hzmbqfs.gov.hk/tc/application/" }]
                },
                {
                    id: "macau_pnr",
                    title: "港車轉乘計劃 (香港車去澳門)",
                    description: "香港私家車經港珠澳大橋駛往澳門東停車場停泊指南",
                    docs: [
                        "有效香港汽車保險",
                        "澳門跨境車輛強制責任保險 (可線上即時購買短期)",
                        "香港有效駕駛執照"
                    ],
                    steps: [
                        "本計劃免抽籤、免常規指標！香港車主只需透過網上系統申請「港車轉乘計劃」。",
                        "獲取香港運輸署發出的封閉道路通行許可證 (禁區紙)。",
                        "出發前至少 1 小時，透過澳門當局網站預約「港珠澳大橋邊檢大樓東停車場」泊位。",
                        "開車經港珠澳大橋到達澳門口岸後，將車輛停泊於東停車場，隨後人員下車辦理入境手續，轉乘澳門本地巴士或的士進入澳門市區。",
                        "注意：車輛不可直接開入澳門市區道路，只能停在邊境東停車場。"
                    ],
                    forms: [],
                    links: [
                        { name: "澳門交通事務局 - 港珠澳大橋東停車場網上預約系統", url: "https://hzmbparking.dsat.gov.mo/" },
                        { name: "運輸署 - 港車轉乘計劃申請指南", url: "https://www.td.gov.hk/tc/public_services/licences_and_permits/hzmb_hong_kong_private_cars_to_macao_pnr/index.html" }
                    ]
                },
                {
                    id: "macau_southbound",
                    title: "澳車南下 (澳門車來香港)",
                    description: "澳門常規車輛經大橋前往香港國際機場及市區政策指南",
                    docs: ["澳門有效車輛登記文件", "香港禁區紙與臨時牌照申請", "香港短期汽車保險"],
                    steps: [
                        "第一階段（已實施）：澳門私家車經大橋前往香港國際機場人工島指定停車場停泊，旅客可直接入閘搭乘飛機，車輛不入香港市區。",
                        "第二階段（規劃部署中）：未來將允許符合資格的澳門私家車直接駛入香港市區道路，其申請流程、保險購買、禁區紙配額將比照「港車北上」對等模式辦理。",
                        "前線同仁需緊密關注香港運輸署關於澳車南下市區配額的最新招標公告，以便第一時間協助澳門行家與客戶代辦。"
                    ],
                    forms: [],
                    links: [{ name: "香港運輸署 - 港珠澳大橋跨界車輛政策", url: "https://www.td.gov.hk/tc/public_services/licences_and_permits/hzmb/index.html" }]
                },
                {
                    id: "macau_northbound",
                    title: "澳車北上 (澳門車去廣東)",
                    description: "澳門私家車經港珠澳大橋進入廣東省手續",
                    docs: ["澳門居民身份證", "回鄉證", "澳門車輛登記摺/所有權登記憑證", "內地交強險"],
                    steps: [
                        "透過「澳車北上」App 或官方門戶網站註冊賬號。",
                        "提交電腦抽籤登記，中籤後上傳澳門車牌簿、回鄉證及駕駛執照。",
                        "前往澳門指定驗車中心（如新通達）進行車輛查驗與安裝電子標籤。",
                        "購買內地交強險並等待珠海交警審批獲發電子牌證。",
                        "出發前在 App 內進行通關日期預約，即可免簽注經大橋開往廣東全省。"
                    ],
                    forms: [],
                    links: [{ name: "澳門交通事務局 - 澳車北上官方資訊網", url: "https://macao-zhuhai.dsat.gov.mo/" }]
                }
            ]
        },
        {
            category: "汽車保險與意外和解",
            icon: Scale,
            items: [
                {
                    id: "wellsmart_ins",
                    title: "俊銘保險表格及官網",
                    description: "全新修正：俊銘保險經紀投保渠道與理賠服務",
                    docs: [
                        "車主身份證 / 公司 BR 副本",
                        "車輛登記文件 (牌簿 VRD) 副本",
                        "司機駕駛執照及 NCD 減免證明 (如有)"
                    ],
                    steps: [
                        "點擊下方修正後的官方主頁，瀏覽最新的私家車、商用車及中港跨境保險方案。",
                        "若車主不幸發生交通意外，引導其點擊「表格下載區」連結，即時下載官方《汽車意外索償申請表》。",
                        "填妥後連同現場照片、對手資料，於意外發生後 14 天內提交給保險經紀啟動索償程序。"
                    ],
                    forms: [{ name: "俊銘保險 - 官方理賠及投保表格下載中心", url: "https://www.wellsmart.com.hk/tc/insurance-info.html" }],
                    links: [{ name: "俊銘保險 (Wellsmart) 官方網站主頁", url: "https://www.wellsmart.com.hk/tc/index.html" }]
                },
                {
                    id: "accident_guide",
                    title: "交通意外處理、警察與公正行指南",
                    description: "車禍現場黃金處置 SOP - 報警與公正行找尋方法",
                    docs: [
                        "現場四周、兩車碰撞位置、煞車痕及雙方車牌的高清照片",
                        "對方的姓名、身份證號碼、電話及車主保險公司名稱",
                        "警員編號 及 交通意外報案編號 (OBR)"
                    ],
                    steps: [
                        "【第一步：確保安全】: 立即熄火、亮起危險警告燈，在安全情況下拍照存證，若無人受傷且碰撞輕微，將車移至路邊免阻交通。",
                        "【報警時機 (警察資料)】: 若有人受傷、涉及政府公物（如路欄、燈柱）或對方拒絕出示證件，*必須立即撥打 999 報警*。警察到場後會抄錄口供並發出「報案監收據/意外編號」。",
                        "【尋找公正行 (公正行資料)】: 若打算向對方保險公司索償，*切勿私自修車*！必須先聘請香港認可的「獨立汽車公正行」（如中聯公正行、香港汽車公正行等）。",
                        "公正行會派出專業驗車師到車房拍照評估，寫出法定「汽車損毀估價報告」，這份報告是法庭與保險公司打官司賠償的唯一鐵證（費用約 $800-$1,500，可向輸家追回）。",
                        "【私下和解】: 若金額輕微（如 $10,000 以下）且雙方達成共識，可使用下方「線上法律和解書生成器」即時簽約，免除扣分及加保費之苦。"
                    ],
                    forms: [],
                    links: []
                },
                {
                    id: "settlement_generator",
                    title: "⚖️ 交通意外線上和解書生成器",
                    description: "依據香港法律規範設計，在線填寫即可一鍵輸出 A4 法律級別空白/完備和解合約",
                    docs: ["填寫下方表單後，按下「列印 / 存為 PDF」按鈕，即可產出標準法律文本。"],
                    steps: [
                        "與對方在現場談妥最終賠償總金額。",
                        "在下方工具中，清晰填入雙方的中英文全名、香港身份證號碼、雙方車牌、事發地點及日期。",
                        "按下頂部右邊的「列印 / 存為 PDF」按鈕，系統會完美排版出一張符合香港合約法、具備完全法律約束力的「交通意外和解書」。",
                        "列印出來後，雙方當場簽名作實，現金交收或轉帳留底。此後任何一方不得再向警察、保險公司或法庭追究此意外。"
                    ],
                    forms: [],
                    links: []
                }
            ]
        }
    ];

    // WhatsApp 轉發排版
    const handleCopyToWhatsApp = (item: any) => {
        let text = `📋 *【${item.title}】辦理指南*\n\n` +
            `📝 *所需準備文件：*\n${item.docs.map((d:string) => `• ${d}`).join('\n')}\n\n` +
            `✅ *辦理步驟：*\n${item.steps.map((s:string, i:number) => `${i+1}. ${s}`).join('\n')}\n\n`;
            
        if (item.forms && item.forms.length > 0) {
            text += `📎 *相關表格下載：*\n${item.forms.map((f:any) => `${f.name}: ${f.url}`).join('\n')}\n\n`;
        }
        if (item.links && item.links.length > 0) {
            text += `🔗 *官方實用連結：*\n${item.links.map((l:any) => `${l.name}: ${l.url}`).join('\n')}\n\n`;
        }
        text += `💡 _以上資訊由 金田汽車 提供，如有疑問請隨時聯絡我們！_`;
        
        navigator.clipboard.writeText(text).then(() => {
            alert("✅ 複製成功！\n您可以直接在 WhatsApp 或微信中貼上並發送給客戶。");
        });
    };

    // ★ 核心修正：棄用原生 window.print()，改用強效 iframe 智能引擎，破解外層框架隱藏限制
    const handlePrintPDF = () => {
        const printContent = document.getElementById('business-process-print-root');
        if (printContent && props.triggerSmartPrint) {
            // 將欲列印的 HTML 與標題丟給 page.tsx 的獨立列印引擎
            props.triggerSmartPrint(printContent.outerHTML, `指南_${currentItem.title}`);
        } else {
            // 退路機制
            window.print();
        }
    };

    const currentItem = PROCEDURES.find(c => c.category === activeCategory)?.items.find(i => i.id === expandedItem) 
                        || PROCEDURES.find(c => c.category === activeCategory)?.items[0];

    return (
        <div className="flex flex-col md:flex-row h-full bg-slate-50 relative">
            
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
                
                {/* 中間欄：子業務列表 */}
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

                {/* 右邊大區塊：看板詳情與互動工具 */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
                    {currentItem && (
                        // ★ 給予這個外殼 ID，讓 iframe 智能列印引擎可以整塊抽離
                        <div id="business-process-print-root" className="max-w-3xl mx-auto space-y-5">
                            
                            {/* ★ 內聯 CSS 確保獨立列印時格式維持完美 */}
                            <style>{`
                                .print-grid { display: grid; gap: 1.5rem; }
                                @media (min-width: 768px) { .print-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
                                .law-contract { font-family: serif; color: #0f172a; }
                                .no-print-area { display: block; }
                                @media print {
                                    .no-print-area { display: none !important; }
                                    .print-grid { display: block !important; }
                                    .print-col { width: 100% !important; margin-bottom: 20px !important; page-break-inside: avoid !important; border: 1px solid #ccc !important; padding: 15px !important; border-radius: 8px; }
                                    .law-contract { border: 2px solid black !important; padding: 30px !important; background: white !important; margin-top: 0; }
                                    body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                                }
                            `}</style>

                            {/* 看板標頭 */}
                            <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wider no-print-area">{activeCategory}</span>
                                    <h3 className="font-black text-2xl text-slate-800 mt-1">{currentItem.title}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{currentItem.description}</p>
                                </div>
                                
                                <div className="flex gap-2 flex-none no-print-area">
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

                            {/* ★★★ 智能控制面板 (設定會自動實時更新下方指南或和解書文本) ★★★ */}
                            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 no-print-area space-y-3">
                                <div className="flex items-center gap-2 text-xs font-black text-amber-800 uppercase tracking-wider">
                                    <Calculator size={14} /> 業務資料動態設定面板 (設定將自動注入文案與PDF中)
                                </div>
                                
                                {currentItem.id === 'td25' && (
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                                        <span>選擇新舊車主身份別：</span>
                                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                                            <button onClick={() => setOwnerType('hk')} className={`px-2.5 py-1 text-xs font-bold rounded-md ${ownerType === 'hk' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>香港本地</button>
                                            <button onClick={() => setOwnerType('cn')} className={`px-2.5 py-1 text-xs font-bold rounded-md ${ownerType === 'cn' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>中國內地</button>
                                            <button onClick={() => setOwnerType('overseas')} className={`px-2.5 py-1 text-xs font-bold rounded-md ${ownerType === 'overseas' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>海外/國外</button>
                                        </div>
                                    </div>
                                )}

                                {currentItem.id === 'td558' && (
                                    <div className="space-y-3 text-sm text-slate-700">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span>選擇計費私家車種類：</span>
                                            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                                                <button onClick={() => { setLicenceType('petrol'); setCcOrKw('1500'); }} className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${licenceType === 'petrol' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>汽油私家車</button>
                                                <button onClick={() => { setLicenceType('electric'); setCcOrKw('75'); }} className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${licenceType === 'electric' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>純電動私家車</button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                                            <label className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                                    {licenceType === 'petrol' ? '引擎容量 (cc)' : '額定功率 (kW)'}:
                                                </span>
                                                <input type="number" value={ccOrKw} onChange={e => setCcOrKw(e.target.value)} className="w-24 px-2 py-1 border border-slate-300 rounded font-bold text-center outline-none focus:border-amber-400 bg-slate-50 text-sm" />
                                            </label>
                                            <div className="flex items-center text-xs font-bold text-slate-600">
                                                <ArrowRight size={14} className="text-amber-400 mx-2"/>
                                                系統實時核算一年牌費 (已含 TAVA)：
                                                <span className="text-lg font-black text-red-600 ml-2 font-mono">${calculatedFee}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentItem.id === 'td320' && (
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                                        <span>車牌種類分流：</span>
                                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                                            <button onClick={() => setPlateType('traditional')} className={`px-2.5 py-1 text-xs font-bold rounded-md ${plateType === 'traditional' ? 'bg-purple-600 text-white' : 'text-slate-600'}`}>傳統特別車牌</button>
                                            <button onClick={() => setPlateType('custom')} className={`px-2.5 py-1 text-xs font-bold rounded-md ${plateType === 'custom' ? 'bg-purple-600 text-white' : 'text-slate-600'}`}>自訂專屬車牌</button>
                                        </div>
                                    </div>
                                )}

                                {currentItem.id === 'settlement_generator' && <span className="text-xs font-bold text-emerald-700 block">請直接在下方合約藍框欄位內填寫，填寫完點擊右上角「列印/存為PDF」即可輸出實體法律文件！</span>}
                            </div>

                            {/* ★★★ 核心渲染：如果是線上和解書生成器，直接印出法律合約格式 ★★★ */}
                            {currentItem.id === 'settlement_generator' ? (
                                <div className="law-contract bg-white border-2 border-slate-800 p-6 md:p-10 font-serif text-slate-900 shadow-lg space-y-6 relative rounded-sm">
                                    <div className="text-center space-y-1">
                                        <h2 className="font-black text-2xl tracking-widest border-b-2 border-slate-900 pb-2">交 通 意 外 和 解 申 報 書</h2>
                                        <p className="text-xs font-sans text-slate-500 pt-1 no-print-area">（本和解書嚴格依照香港法律合約規範設計，簽署後具備完全約束力）</p>
                                    </div>

                                    <p className="text-sm leading-relaxed indent-8">
                                        本和解協議由以下雙方於 
                                        <input type="text" placeholder=" 填寫日期 (如2026年5月30日) " value={settlementDate} onChange={e=>setSettlementDate(e.target.value)} className="mx-1 border-b border-blue-400 outline-none text-center font-bold font-sans text-sm bg-blue-50/50 p-0.5 min-w-[180px] print:border-b-0 print:bg-transparent" /> 
                                        在自願及公平原則下共同簽署作實：
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-sans no-print-area bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <div className="space-y-2">
                                            <div className="font-bold text-blue-700 border-b pb-1">甲方資料 (賠償方/過錯方)</div>
                                            <label className="flex items-center gap-1">姓名：<input type="text" className="border px-2 py-0.5 rounded text-xs flex-1" value={partyAName} onChange={e=>setPartyAName(e.target.value)} /></label>
                                            <label className="flex items-center gap-1">車牌：<input type="text" className="border px-2 py-0.5 rounded text-xs flex-1 font-mono uppercase" value={partyAPlate} onChange={e=>setPartyAPlate(e.target.value)} /></label>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="font-bold text-purple-700 border-b pb-1">乙方資料 (受款方/受害方)</div>
                                            <label className="flex items-center gap-1">姓名：<input type="text" className="border px-2 py-0.5 rounded text-xs flex-1" value={partyBName} onChange={e=>setPartyBName(e.target.value)} /></label>
                                            <label className="flex items-center gap-1">車牌：<input type="text" className="border px-2 py-0.5 rounded text-xs flex-1 font-mono uppercase" value={partyBPlate} onChange={e=>setPartyBPlate(e.target.value)} /></label>
                                        </div>
                                    </div>

                                    <div className="space-y-4 text-sm leading-relaxed font-sans">
                                        <div className="flex flex-wrap items-center gap-1">
                                            1. 事發地點位於：
                                            <input type="text" placeholder="請輸入詳細事發路段" value={settlementLoc} onChange={e=>setSettlementLoc(e.target.value)} className="border-b border-blue-400 outline-none px-2 font-bold text-slate-800 min-w-[280px] print:border-0" />
                                            ，雙方車輛不幸發生輕微交通碰撞意外。
                                        </div>
                                        <div>
                                            2. 經雙方友好協商，甲方同意向乙方支付合共港幣 
                                            <input type="number" placeholder="金額" value={settlementAmt} onChange={e=>setSettlementAmt(e.target.value)} className="mx-1 border-b border-blue-400 text-center outline-none font-black text-red-600 w-24 print:border-0" /> 
                                            元正（HK$ <span className="font-bold border-b border-slate-500 min-w-[60px] inline-block text-center font-mono">{settlementAmt || '________'}</span>），作為本宗意外之全數及最終車輛損毀與相關賠償。
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            3. 條款與承諾：
                                            <textarea value={settlementTerms} onChange={e=>setSettlementTerms(e.target.value)} className="w-full h-16 border rounded p-2 text-xs text-slate-700 bg-slate-50 font-serif resize-none outline-none focus:border-blue-400 print:border-0 print:bg-transparent print:h-auto" />
                                        </div>
                                        <div>
                                            4. 雙方明確聲明，簽署本協議並收妥上述款項後，此事件即告徹底解決。任何一方此後均無權再向香港警務處、各保險公司或經由任何法律訴訟途徑向對方追討任何形式之經濟責任、醫療費用或進行民事索償。
                                        </div>
                                    </div>

                                    {/* 簽名欄 */}
                                    <div className="grid grid-cols-2 gap-10 pt-16 font-sans text-sm">
                                        <div className="border-t border-slate-900 pt-3 text-center space-y-4">
                                            <p className="font-bold">甲方簽署 (車牌: {partyAPlate || '_______'})</p>
                                            <p className="text-xs text-slate-400 pt-4">姓名: {partyAName || '________________'}</p>
                                            <p className="text-xs text-slate-400">身份證: ___________________</p>
                                        </div>
                                        <div className="border-t border-slate-900 pt-3 text-center space-y-4">
                                            <p className="font-bold">乙方簽署 (車牌: {partyBPlate || '_______'})</p>
                                            <p className="text-xs text-slate-400 pt-4">姓名: {partyBName || '________________'}</p>
                                            <p className="text-xs text-slate-400">身份證: ___________________</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* 標準雙欄指南排版 */
                                <div className="print-grid">
                                    {/* 左欄：文件清單 */}
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
                                        
                                        {currentItem.forms && currentItem.forms.length > 0 && (
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

                                    {/* 右欄：辦理步驟及標準 SOP */}
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

                                        {currentItem.links && currentItem.links.length > 0 && (
                                            <div className="mt-6">
                                                <h4 className="font-black text-slate-800 flex items-center gap-1.5 mb-2 border-b border-slate-100 pb-2 text-base">
                                                    <LinkIcon size={16} className="text-purple-500" /> 實用官方連結 / 網上辦理位置
                                                </h4>
                                                <div className="space-y-1.5">
                                                    {currentItem.links.map((link, idx) => (
                                                        <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 px-3 py-2 rounded-lg border border-purple-100 transition-colors">
                                                            <span className="line-clamp-1">{link.name}</span> <ExternalLink size={12} className="flex-none" />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
