'use client';

import React from 'react';
import { Check } from 'lucide-react';

const formatCurrency = (amount: number) => new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', maximumFractionDigits: 0 }).format(amount || 0);

export const CompanyStamp = ({ nameEn, nameCh }: { nameEn: string, nameCh: string }) => (
    <div className="w-[45mm] h-[28mm] flex items-center justify-center relative select-none mix-blend-multiply transform -rotate-6 opacity-90" style={{ color: '#1e3a8a' }}>
        <div className="absolute w-full h-full rounded-[50%] border-[3px] border-[#1e3a8a]"></div>
        <div className="absolute w-[92%] h-[88%] rounded-[50%] border-[1px] border-[#1e3a8a]"></div>
        <div className="absolute w-full h-full flex flex-col items-center justify-center z-10">
            <div className="text-[9px] font-black tracking-widest absolute top-5 uppercase text-center w-[85%] leading-none break-words">{nameEn}</div>
            <div className="text-[14px] font-black tracking-[0.3em] leading-none">{nameCh}</div>
            <div className="text-[5px] font-bold tracking-widest absolute bottom-5 uppercase leading-none">AUTHORIZED SIGNATURE</div>
        </div>
    </div>
);

export const SignatureImg = () => (
    // ★ 加寬到 55mm，完美容納這個長型藝術簽名
    <div className="w-[55mm] relative">
        {/* 自動吃 text-blue-950 墨水色，並與底色完美融合 */}
        <svg viewBox="0 0 464 288" className="w-full h-auto opacity-90 mix-blend-multiply text-blue-950" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="
                M311.466125,289.000000 
                C318.797180,275.860626 329.094818,264.750458 339.687012,253.908585 
                C351.097931,242.228668 362.747192,230.782440 374.896088,219.865463 
                C382.664429,212.884842 386.775238,203.489944 391.769775,194.700729 
                C399.255524,181.527573 406.237701,168.086853 411.606628,153.876038 
                C411.940247,152.993011 412.707397,152.149673 411.937225,150.703018 
                C408.558441,151.328217 405.723755,153.290298 402.890961,155.168625 
                C392.760071,161.886002 382.706299,168.720291 372.544586,175.390305 
                C367.997162,178.375198 365.752045,177.836670 362.947845,173.055862 
                C361.416901,170.445816 359.442871,171.062241 357.344025,171.589706 
                C348.127258,173.906021 338.843323,175.578323 329.267578,175.177292 
                C326.736053,175.071243 324.350220,174.573242 322.123688,173.534088 
                C319.545654,175.767380 319.092957,178.922989 317.489044,181.412338 
                C312.429535,189.265076 306.538361,189.193954 301.639313,180.237213 
                C298.331512,183.983414 295.168549,187.467560 292.114929,191.045013 
                C286.361847,197.784973 280.140076,204.012665 272.736481,208.949921 
                C270.345184,210.544617 267.715546,212.121246 264.899933,210.117920 
                C262.231781,208.219543 263.171112,205.325714 263.575226,202.733887 
                C264.571503,196.344513 267.605652,190.542877 268.580200,183.873718 
                C265.179565,187.650406 261.819214,191.464401 258.368774,195.195023 
                C253.269180,200.708710 247.869400,205.883560 241.303665,209.678314 
                C239.351181,210.806778 237.319458,211.632263 235.207489,210.243729 
                C233.065002,208.835144 233.080032,206.576324 233.447998,204.397186 
                C234.928391,195.630157 238.240692,187.450073 241.682861,179.323318 
                C242.707809,176.903519 243.993713,174.584930 244.208237,171.265747 
                C231.342545,173.297791 218.805267,177.562439 205.636185,173.720993 
                C203.834656,176.850906 202.123444,180.055649 200.190125,183.120285 
                C198.086624,186.454651 194.895660,187.830124 191.145462,186.618515 
                C187.329224,185.385574 186.787582,182.112015 186.836380,178.505356 
                C186.901672,173.681229 189.403900,169.938492 191.991531,166.293808 
                C193.566345,164.075714 195.881821,163.740631 197.906326,166.018707 
                C201.472336,161.076889 202.763474,161.115723 205.012222,165.900314 
                C207.201248,170.557877 211.792252,170.888214 215.644440,170.440811 
                C225.018112,169.352112 234.402374,168.121216 243.647751,165.983109 
                C247.035980,165.199524 248.764740,163.516342 250.115753,160.587814 
                C259.184204,140.930862 269.108795,121.699455 279.227295,102.568115 
                C286.307343,89.181648 293.060516,75.614594 301.069275,62.735939 
                C301.579590,61.915344 301.920258,60.989250 302.515106,59.745892 
                C296.657318,56.321167 290.333313,54.842052 284.123444,53.308079 
                C267.566711,49.218208 250.590424,48.154430 233.645569,47.351192 
                C227.386963,47.054520 221.059967,48.342903 214.756210,48.798344 
                C211.498428,49.033714 209.912567,50.644276 208.790649,53.751598 
                C200.539948,76.603348 191.768524,99.249290 180.654129,120.904160 
                C179.702393,122.758469 179.045853,124.982201 176.486191,125.500908 
                C173.794830,123.627632 174.891937,121.280800 175.868561,119.269226 
                C186.052124,98.293800 193.999390,76.408768 202.295700,54.664726 
                C202.758835,53.450882 203.616791,52.291195 202.649780,50.890518 
                C200.579224,50.411739 200.077393,52.147373 199.523712,53.367809 
                C185.501053,84.277710 172.043289,115.433144 159.083405,146.803360 
                C149.048630,171.093201 139.130096,195.429550 130.106522,220.118942 
                C125.374130,233.067245 120.751617,246.052383 117.488731,259.472351 
                C117.049835,261.277496 116.868317,263.114624 117.478462,264.895538 
                C117.958038,266.295319 119.066414,267.803741 117.040474,268.720337 
                C114.977722,269.653595 112.982674,269.075745 111.789612,267.173828 
                C110.165703,264.585114 109.485535,261.837524 110.244781,258.615021 
                C112.771339,247.891357 117.186310,237.826080 120.733749,227.459671 
                C128.869934,203.683945 138.240280,180.367310 147.420486,156.995392 
                C158.973206,127.583336 171.355957,98.496483 184.418213,69.710098 
                C186.850739,64.349319 189.141052,58.924011 191.845703,52.729927 
                C182.918686,53.290855 175.432175,55.451046 167.948151,57.455975 
                C141.045898,64.662910 115.083534,74.460587 90.108627,86.744896 
                C81.174042,91.139511 72.374763,95.922119 64.236084,101.776268 
                C62.475452,103.042686 60.307808,105.529655 58.360821,102.519630 
                C56.712551,99.971420 59.080029,98.281174 60.961124,96.856964 
                C72.166252,88.373360 84.567581,81.913315 97.113541,75.740448 
                C122.273605,63.361164 148.659134,54.335896 175.823776,47.549770 
                C180.642487,46.345985 185.599823,45.644520 190.525864,44.939754 
                C194.443542,44.379257 197.220245,42.735523 199.028763,39.001942 
                C202.144928,32.568748 205.262314,26.088861 209.790878,20.471682 
                C211.099350,18.848654 212.360031,16.496048 214.959122,17.367733 
                C217.586838,18.249004 216.945221,20.825336 217.113586,22.938236 
                C217.603256,29.083847 214.636612,34.589081 213.759567,41.007664 
                C224.364304,41.007664 234.813416,40.583736 245.215942,41.099380 
                C264.537048,42.057114 283.501770,45.289154 301.629028,52.332321 
                C305.107147,53.683708 307.488556,53.624615 309.696625,50.294228 
                C311.809601,47.107296 314.419098,44.223663 317.638824,42.071075 
                C319.672363,40.711533 322.019012,40.162766 324.162567,41.828552 
                C326.093842,43.329357 326.419220,45.355957 325.491547,47.663136 
                C324.627472,49.812088 324.078430,52.092999 323.147614,54.208889 
                C319.616150,62.236626 319.579285,62.220413 326.818604,68.482483 
                C330.479401,64.859474 332.248566,59.887535 335.452271,55.964966 
                C338.397552,52.358818 341.057068,48.514782 344.080322,44.978920 
                C345.338135,43.507893 347.093964,42.329586 348.839722,41.445518 
                C350.662842,40.522289 352.782104,40.371017 354.446655,41.972515 
                C356.001740,43.468651 356.378296,45.261204 355.739532,47.452225 
                C352.794678,57.552959 346.816223,66.035652 341.089783,74.583511 
                C332.658234,87.169342 323.522308,99.258507 313.389771,110.550636 
                C309.080536,115.353035 306.590942,121.242554 303.831665,126.879036 
                C292.492554,150.041748 280.829956,173.071625 272.054443,197.396820 
                C271.379395,199.267960 270.596893,201.042068 271.260559,204.126312 
                C276.224457,199.399185 280.957458,195.305252 285.203308,190.756561 
                C292.471710,182.969696 299.840485,175.238495 305.974304,166.477631 
                C308.478088,162.901505 311.117645,162.491226 313.973846,165.985260 
                C317.602692,160.905731 318.227325,161.112976 321.230286,166.423660 
                C323.603455,170.620651 328.132690,170.947647 332.183777,170.446503 
                C342.054840,169.225372 351.908905,167.781769 361.628082,165.536713 
                C364.303986,164.918564 366.015076,163.717941 367.310028,161.280670 
                C369.259399,157.611649 371.494354,154.078583 373.826569,150.635834 
                C374.900208,149.050919 376.361481,147.010620 378.684418,148.349426 
                C381.154541,149.773056 379.759674,151.818222 378.828064,153.562683 
                C375.792633,159.246689 372.310974,164.708725 369.715698,171.716522 
                C377.585602,167.670822 383.575958,162.449677 390.065399,157.997940 
                C396.921539,153.294601 403.661102,148.419464 410.917053,144.322708 
                C413.405365,142.917816 415.953491,142.155243 418.364136,144.127167 
                C420.766296,146.092102 420.493347,148.757584 419.727539,151.483017 
                C415.455078,166.688019 407.837830,180.329758 400.012787,193.878845 
                C399.184937,195.312256 398.410187,196.776337 398.174377,198.871902 
                C403.782166,194.663132 409.281342,190.299332 415.021118,186.279022 
                C425.792267,178.734634 436.539246,171.103287 448.952515,166.348434 
                C452.008820,165.177734 456.507416,163.063614 457.811493,166.540909 
                C459.032654,169.797226 453.908813,169.948883 451.378296,170.910873 
                C438.952637,175.634613 427.943726,182.816025 417.333832,190.591461 
                C408.610992,196.984009 400.348663,204.001083 391.755066,210.575134 
                C385.228302,215.568069 381.506683,222.755371 376.787567,229.142517 
                C361.323273,250.072952 344.437134,269.773926 326.140625,288.700745 
                C321.310760,289.000000 316.621490,289.000000 311.466125,289.000000 
                M306.207764,81.650169 
                C304.122589,84.444588 301.947510,87.176994 299.968567,90.044724 
                C293.357086,99.625504 284.322906,107.443924 278.735046,117.672295 
                C266.375427,140.296158 255.521774,163.681305 245.744507,187.534729 
                C243.722763,192.467194 240.935638,197.425491 240.963058,203.826889 
                C246.730911,200.084534 250.607834,195.704849 254.529236,191.455307 
                C264.327515,180.837112 275.201630,170.873062 281.443909,157.617950 
                C293.777832,131.427719 307.733978,106.082733 320.774109,80.264015 
                C323.082947,75.692642 321.343628,70.293114 316.154816,67.276299 
                C312.992340,71.843636 309.802521,76.450447 306.207764,81.650169 
                M337.531830,263.029938 
                C331.086121,269.705017 325.282715,276.904388 320.007263,284.550903 
                C332.793335,271.536041 345.555298,258.513977 356.827637,244.132812 
                C349.835449,249.547745 344.160187,256.267090 337.531830,263.029938 
                M329.578888,78.402832 
                C329.298340,79.116943 328.489380,79.720505 329.394562,81.088463 
                C336.569702,71.014984 344.040527,61.415676 348.660187,49.987999 
                C341.394470,58.613056 335.793030,68.346581 329.578888,78.402832 
                M306.819580,66.504654 
                C304.075806,71.106323 301.332031,75.707993 298.588257,80.309669 
                C304.542572,75.335587 310.174805,66.471489 310.242401,63.026985 
                C308.391327,63.136547 308.064667,64.847450 306.819580,66.504654 
                M316.455353,169.648941 
                C315.293945,168.222366 314.374420,168.977036 313.828064,170.126251 
                C312.101685,173.757416 310.374573,177.416687 310.675995,182.429581 
                C314.241821,178.546448 316.519348,174.943893 316.455353,169.648941 
                M199.877029,174.385864 
                C200.498032,172.594467 201.703613,170.781799 199.329498,168.657654 
                C195.711563,172.384720 194.907669,176.869308 194.453461,182.516006 
                C197.366516,180.074097 198.508392,177.583206 199.877029,174.385864 
                M317.073212,54.559021 
                C317.519714,53.024784 319.103577,51.900333 318.751404,50.014519 
                C315.413574,52.583450 315.081116,53.122334 314.270538,57.248173 
                C314.585785,57.182335 315.007080,57.221775 315.196503,57.031010 
                C315.774475,56.449081 316.263153,55.778461 317.073212,54.559021 
                z" 
            />
        </svg>
    </div>
);

export default function DocumentTemplate({ previewDoc, selectedVehicle, docType, COMPANY_INFO }: any) {
    const activeVehicle = previewDoc?.vehicle || selectedVehicle;
    const activeType = previewDoc?.type || docType;
    if (!activeVehicle) return null;

    const itemsToRender = (activeVehicle as any).selectedItems || [];
    const depositItems = (activeVehicle as any).depositItems || []; 
    const showTerms = (activeVehicle as any).showTerms !== false;
    const showAttachments = (activeVehicle as any).showAttachments !== false;
    const checklist = (activeVehicle as any).checklist || { vrd: false, keys: false, tools: false, manual: false, other: '' };
    const displayId = (activeVehicle.id || 'DRAFT').slice(0, 6).toUpperCase();
    
    const docDateVal = (activeVehicle as any).docDate || (activeVehicle as any).formData?.docDate;
    let today = new Date().toLocaleDateString('en-GB');
    if (docDateVal) {
        const d = new Date(docDateVal);
        today = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
    
    const companyEn = COMPANY_INFO?.name_en || 'GOLD LAND AUTO';
    const companyCh = COMPANY_INFO?.name_ch || '金田汽車';
    const curCustomer = { name: activeVehicle.customerName || '', phone: activeVehicle.customerPhone || '', hkid: activeVehicle.customerID || '', address: activeVehicle.customerAddress || '' };

    const price = Number(activeVehicle.price) || 0;
    const ovFee = Number((activeVehicle as any).overseasTotalFee) || 0;
    const hkFee = Number((activeVehicle as any).localTotalFee) || 0;
    const orderFeesTotal = ((activeVehicle as any).orderType === 'Overseas') ? (ovFee + hkFee) : 0;
    
    const basePrice = ((activeVehicle as any).orderType === 'Overseas') ? orderFeesTotal : price;
    const extrasTotal = itemsToRender.filter((i:any) => !i.isFree).reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
    const totalPaid = depositItems.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
    
    const balance = (basePrice + extrasTotal) - totalPaid;
    
    const showStampAndSig = (activeVehicle as any).showStampAndSig !== false;
    const soldDate = (activeVehicle as any).soldDate || '___________'; 
    const handoverTime = (activeVehicle as any).handoverTime || '_______';

    const carPhotos = (activeVehicle.photos || []).slice(0, 5);

    let docTitleEn = "VEHICLE SALES AGREEMENT"; let docTitleCh = "汽車買賣合約"; let isPurchase = false; let isConsignment = false; let isQuotation = false;
    if (activeType === 'purchase_contract') { docTitleEn = "VEHICLE PURCHASE AGREEMENT"; docTitleCh = "汽車收購合約"; isPurchase = true; } 
    else if (activeType === 'consignment_contract') { docTitleEn = "VEHICLE CONSIGNMENT AGREEMENT"; docTitleCh = "汽車寄賣合約"; isConsignment = true; } 
    else if (activeType === 'quotation') { docTitleEn = "QUOTATION"; docTitleCh = "報價單"; isQuotation = true; } 
    else if (activeType === 'invoice') { docTitleEn = "INVOICE"; docTitleCh = "發票"; } 
    else if (activeType === 'receipt') { docTitleEn = "OFFICIAL RECEIPT"; docTitleCh = "正式收據"; }

    // ★ 終極列印樣式解鎖：徹底打破 iOS Safari 的外層限制
    const PrintStyle = () => (
        <style dangerouslySetInnerHTML={{ __html: `
            @media print {
                @page { margin: 0; size: A4 portrait; }
                html, body, #__next, main { 
                    height: auto !important; 
                    min-height: 100% !important;
                    overflow: visible !important; 
                    position: static !important; 
                    background: white !important;
                }
                body * { visibility: hidden; }
                #print-root, #print-root * { visibility: visible; }
                #print-root { 
                    position: absolute !important; 
                    top: 0 !important; 
                    left: 0 !important; 
                    width: 794px !important; 
                    min-height: 1123px !important;
                    margin: 0 auto !important; 
                    padding: 0 !important; 
                    overflow: hidden !important; 
                    background: white !important;
                    box-shadow: none !important; 
                    border: none !important;
                }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
            .no-break { break-inside: avoid; page-break-inside: avoid; }
        `}} />
    );

    // ★ 加入 min-w-0 與 truncate 防止標題撐破，字體稍微調細以適應 A4
    const HeaderSection = () => (
        <div className="flex justify-between items-start mb-4 border-b-2 border-slate-800 pb-2 gap-4 overflow-hidden">
            <div className="flex items-center gap-3 shrink-0 min-w-0">
                <img src={COMPANY_INFO?.logo_url || ''} alt="Logo" className="w-14 h-14 object-contain flex-shrink-0" onError={(e) => { e.currentTarget.style.display='none'; }} />
                <div className="min-w-0">
                    <h1 className="text-lg font-black text-slate-900 tracking-wide uppercase leading-none truncate">{companyEn}</h1>
                    <h2 className="text-base font-bold text-slate-700 tracking-widest leading-tight mt-1 truncate">{companyCh}</h2>
                    <div className="text-[9px] text-slate-500 mt-1 leading-tight font-serif truncate"><p>{COMPANY_INFO?.address_ch || ''}</p><p>Tel: {COMPANY_INFO?.phone || ''} | Email: {COMPANY_INFO?.email || ''}</p></div>
                </div>
            </div>
            <div className="text-right flex-shrink-0 pl-2">
                <div className="text-sm font-black text-slate-800 uppercase tracking-normal border-b-2 border-slate-800 inline-block mb-1">{docTitleEn}</div>
                <div className="text-[11px] font-bold text-slate-600 tracking-widest text-center">{docTitleCh}</div>
                <div className="mt-1 text-[10px] font-mono">NO: {activeType.slice(0,3).toUpperCase()}-{today.replace(/\//g,'')}-{displayId}</div>
                <div className="text-[10px] font-mono font-bold text-blue-800 uppercase">DATE: {today}</div>
            </div>
        </div>
    );

    const AttachmentsSection = () => (
        <div className="mb-3 border border-slate-300 p-2 text-[10px] bg-slate-50">
            <div className="font-bold mb-1 uppercase border-b border-slate-300 pb-1">Attachments (隨車附件):</div>
            <div className="flex flex-wrap gap-4 mt-1">
                <div className="flex items-center"><div className="w-3 h-3 border border-black mr-1 flex items-center justify-center">{checklist.vrd && <Check size={10}/>}</div> VRD (牌薄)</div>
                <div className="flex items-center"><div className="w-3 h-3 border border-black mr-1 flex items-center justify-center">{checklist.keys && <Check size={10}/>}</div> Spare Key (後備匙)</div>
                <div className="flex items-center"><div className="w-3 h-3 border border-black mr-1 flex items-center justify-center">{checklist.tools && <Check size={10}/>}</div> Tools (工具)</div>
                <div className="flex items-center"><div className="w-3 h-3 border border-black mr-1 flex items-center justify-center">{checklist.manual && <Check size={10}/>}</div> Manual (說明書)</div>
                {checklist.other && <div className="flex items-center font-bold border-b border-black px-2">Other: {checklist.other}</div>}
            </div>
        </div>
    );

    const SignatureSection = ({ labelLeft, labelRight }: any) => (
        <div className="grid grid-cols-2 gap-12 w-full">
            <div className="relative pt-1 border-t border-slate-800 text-center">
                {showStampAndSig && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 translate-y-3 flex items-center justify-center">
                        <div className="relative">
                            <div className="opacity-90"><CompanyStamp nameEn={companyEn} nameCh={companyCh} /></div>
                            {/* ★ 這裡就是魔法：絕對定位在印章的 65% 處，並旋轉 -5 度 */}
                            <div className="absolute top-1/2 left-[65%] transform -translate-y-[60%] -rotate-[5deg] z-20 pointer-events-none">
                                <SignatureImg />
                            </div>
                        </div>
                    </div>
                )}
                <p className="font-bold text-[10px] uppercase mt-1 leading-none">{labelLeft}</p>
            </div>
        </div>
    );

    if (activeType.includes('contract') || isQuotation) {
        const hasOrderDetails = (isQuotation || activeType === 'sales_contract') && (activeVehicle as any).orderType && (activeVehicle as any).orderType !== 'None';
        const partPaymentLabel = hasOrderDetails ? 'Part D: Payment Details' : 'Part C: Payment Details';
        const etaDisplay = (activeVehicle as any).etaFormat === 'days' ? `${(activeVehicle as any).etaDays || '___'} Days (天)` : ((activeVehicle as any).etaDate || 'TBC (待定)');

        return (
            // ★ 外殼：絕對鎖定 794x1123
            <div id="print-root" className="w-[794px] h-[1123px] mx-auto bg-white text-slate-900 font-sans relative shadow-lg box-border overflow-hidden">
                <PrintStyle />
                
                {/* ★ 內層：加大底端內距 (pb-45mm) 防擠壓 */}
                <div className="p-8 print:p-0 pb-[45mm] print:pb-[45mm] h-full box-border">
                    <HeaderSection />
                    
                    <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="col-span-1">
                            <div className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 uppercase mb-0.5">Part A: Customer</div>
                            <div className="border border-slate-300 p-2 text-[10px] min-h-[64px] flex flex-col justify-center space-y-1">
                                <p className="truncate"><span className="text-slate-500 font-bold">NAME:</span> <span className="font-bold">{curCustomer.name}</span></p>
                                <p className="truncate"><span className="text-slate-500 font-bold">TEL:</span> {curCustomer.phone}</p>
                                <p className="truncate"><span className="text-slate-500 font-bold">ID NO:</span> {curCustomer.hkid}</p>
                            </div>
                        </div>
                        <div className="col-span-2">
                            <div className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 uppercase mb-0.5">Part B: Vehicle Details</div>
                            <table className="w-full text-[10px] border-collapse border border-slate-300 min-h-[64px]">
                                <tbody>
                                    <tr>
                                        <td className="border p-1.5 bg-slate-50 font-bold w-[16%]">Reg. No.</td><td className="border p-1.5 font-mono font-bold w-[34%] text-[11px]">{activeVehicle.regMark || 'TBC'}</td>
                                        <td className="border p-1.5 bg-slate-50 font-bold w-[16%]">Make/Model</td><td className="border p-1.5 w-[34%] text-[11px] font-bold">{activeVehicle.make} {activeVehicle.model}</td>
                                    </tr>
                                    <tr>
                                        <td className="border p-1.5 bg-slate-50 font-bold">Chassis No.</td><td className="border p-1.5 font-mono">{activeVehicle.chassisNo || 'TBC'}</td>
                                        <td className="border p-1.5 bg-slate-50 font-bold">Engine No.</td><td className="border p-1.5 font-mono">{activeVehicle.engineNo || 'TBC'}</td>
                                    </tr>
                                    <tr>
                                        <td className="border p-1.5 bg-slate-50 font-bold">Year</td><td className="border p-1.5">{activeVehicle.year}</td>
                                        <td className="border p-1.5 bg-slate-50 font-bold">Color (Ext/Int)</td><td className="border p-1.5">{(activeVehicle as any).color || (activeVehicle as any).colorExt || '-'} / {(activeVehicle as any).colorInterior || (activeVehicle as any).colorInt || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="border p-1.5 bg-slate-50 font-bold">Mileage</td><td className="border p-1.5">{activeVehicle.mileage ? `${Number(activeVehicle.mileage).toLocaleString()} km` : '-'}</td>
                                        <td className="border p-1.5 bg-slate-50 font-bold">Engine Cap.</td><td className="border p-1.5">{activeVehicle.engineSize ? `${activeVehicle.engineSize} ${activeVehicle.fuelType === 'Electric' ? 'Kw' : 'cc'}` : '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="border p-1.5 bg-slate-50 font-bold">Transmission</td><td className="border p-1.5">{activeVehicle.transmission === 'Manual' ? 'Manual (手波)' : (activeVehicle.transmission === 'Automatic' ? 'Auto (自動波)' : '-')}</td>
                                        <td className="border p-1.5 bg-slate-50 font-bold">Seat / Prev.</td><td className="border p-1.5">{activeVehicle.seat || activeVehicle.seating || '-'} 座 / {activeVehicle.previousOwners || '0'} 手</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {carPhotos.length > 0 && (
                        <div className="mb-3">
                            <div className="bg-slate-100 border border-slate-200 rounded p-1.5 flex gap-1.5 justify-center items-center">
                                {carPhotos.map((url: string, idx: number) => (
                                    <div key={idx} className="w-[36mm] h-[24mm] rounded overflow-hidden border border-slate-300 bg-white flex-shrink-0"><img src={url} className="w-full h-full object-cover" /></div>
                                ))}
                            </div>
                        </div>
                    )}

                    {hasOrderDetails && (
                        <div className="mb-3">
                            <div className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 uppercase mb-0.5">Part C: Order & Shipping Details (訂購與運輸明細)</div>
                            <table className="w-full text-[10px] border-collapse border border-slate-300">
                                <tbody>
                                    <tr><td className="border p-1.5 bg-slate-50 font-bold w-[20%]">Order Type (類別)</td><td className="border p-1.5 w-[30%]">{(activeVehicle as any).orderType === 'Overseas' ? `Overseas 境外訂購 (${(activeVehicle as any).overseasCountry})` : 'Local 本地訂購'}</td><td className="border p-1.5 bg-slate-50 font-bold w-[20%] text-blue-800">Est. Arrival (ETA)</td><td className="border p-1.5 font-bold text-blue-700">{etaDisplay}</td></tr>
                                    {(activeVehicle as any).orderType === 'Overseas' && (
                                        <>
                                            <tr><td colSpan={4} className="border p-1.5 bg-slate-100 font-bold text-center">Estimated Overseas Charges (預估當地費用)</td></tr>
                                            <tr><td colSpan={3} className="border p-1.5 text-slate-600"><span className="font-bold text-slate-800">Included:</span> {[{k:'chk_ov_price', l:'車價'}, {k:'chk_ov_local', l:'當地人費用'}, {k:'chk_ov_auction', l:'拍賣手續'}, {k:'chk_ov_shipping', l:'運輸'}, {k:'chk_ov_ins', l:'保險'}, {k:'chk_ov_tax', l:'稅金'}, {k:'chk_ov_doc', l:'文件費'}, {k:'chk_ov_misc', l:'雜費'}].filter(opt => (activeVehicle as any)[opt.k]).map(opt => opt.l).join(', ') || 'N/A'}</td><td className="border p-1.5 font-mono text-right font-bold">{formatCurrency(ovFee)}</td></tr>
                                            <tr><td colSpan={4} className="border p-1.5 bg-slate-100 font-bold text-center">Estimated Local Charges (預估到港本地費用)</td></tr>
                                            <tr><td colSpan={3} className="border p-1.5 text-slate-600"><span className="font-bold text-slate-800">Included:</span> {[{k:'chk_hk_tax', l:'政府稅金'}, {k:'chk_hk_emissions', l:'環保'}, {k:'chk_hk_insp', l:'驗車'}, {k:'chk_hk_reg', l:'出牌文件'}, {k:'chk_hk_ins', l:'保險'}, {k:'chk_hk_misc', l:'雜費'}].filter(opt => (activeVehicle as any)[opt.k]).map(opt => opt.l).join(', ') || 'N/A'}</td><td className="border p-1.5 font-mono text-right font-bold">{formatCurrency(hkFee)}</td></tr>
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="mb-3">
                        <div className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 uppercase mb-0.5">{partPaymentLabel}</div>
                        <table className="w-full text-[10px] border-collapse border border-slate-300">
                            <tbody>
                                <tr><td className="border p-1.5 font-bold w-1/2">{((activeVehicle as any).orderType === 'Overseas') ? 'Overseas & Local Charges (海外與本地總費用)' : 'Vehicle Price (車價)'}</td><td className="border p-1.5 text-right font-mono font-bold text-[11px]">{formatCurrency(basePrice)}</td></tr>
                                {itemsToRender.map((item: any, idx: number) => (<tr key={`add-${idx}`} className="text-slate-600"><td className="border p-1.5 pl-4">+ {item.desc} {item.isFree ? '(F.O.C.)' : ''}</td><td className="border p-1.5 text-right font-mono">{item.isFree ? '0' : formatCurrency(item.amount)}</td></tr>))}
                                {depositItems.map((item: any, idx: number) => (<tr key={`dep-${idx}`} className="text-blue-700 bg-blue-50/30"><td className="border p-1.5 font-bold pl-4">Less: {item.label}</td><td className="border p-1.5 text-right font-mono font-bold text-[11px]">{formatCurrency(item.amount)}</td></tr>))}
                                <tr className="bg-red-50/50 font-black"><td className="border p-1.5 uppercase text-[11px]">Balance Due (總結餘/尾數)</td><td className="border p-1.5 text-right font-mono text-[14px] text-red-600">{formatCurrency(balance)}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    {!isQuotation && showAttachments && <AttachmentsSection />}
                    
                    {showTerms && (
                        <div className="mb-3 p-2 border-2 border-slate-800 bg-gray-50 text-[9px] leading-relaxed text-justify font-serif">
                            {isQuotation ? (
                                <p>VALIDITY: This quotation is valid for 14 days. Prices and ETA are subject to change without prior notice. 本報價單有效期為發出日起計 14 天。預計費用及到港時間 (ETA) 或會作適度調整。</p>
                            ) : (
                                <>
                                    <p>I, <b>{curCustomer.name || '___________'}</b>, agree to <b>{isPurchase ? 'sell' : isConsignment ? 'consign' : 'purchase'}</b> the vehicle {isPurchase || isConsignment ? 'to' : 'from'} <b>{companyEn}</b> at HKD <b>{formatCurrency(balance + totalPaid)}</b> (Total) on <b>{soldDate}</b> at <b>{handoverTime}</b>. Responsibilities for traffic contraventions transfer at this time.<br/>
                                    本人 <b>{curCustomer.name || '___________'}</b> 同意以總價金 <b>{formatCurrency(balance + totalPaid)}</b> {isPurchase ? '將上述車輛售予' : isConsignment ? '將上述車輛委託寄賣予' : '向'} <b>{companyCh}</b> {isPurchase || isConsignment ? '' : '購買上述車輛'}，交車時間為 <b>{soldDate} {handoverTime}</b>。此時間點前後之交通違例及法律責任概由相應方負責。</p>
                                    
                                    {/* ★ 收車專屬保障條款 */}
                                    {activeType === 'purchase_contract' && (activeVehicle as any).showPurchaseGuarantees !== false && (
                                        <div className="mt-2 pt-2 border-t border-slate-300">
                                            <p className="font-bold mb-1 text-slate-800">Seller's Warranties and Guarantees 賣方保證條款：</p>
                                            <ol className="list-decimal pl-4 space-y-1 text-[8.5px]">
                                                <li><b>Clear Title & No Encumbrances:</b> The Seller warrants that the Vehicle is free from any outstanding finance, loans, debts, or third-party encumbrances. <br/><span className="text-slate-700"><b>無債務及順利過戶：</b>賣方保證上述車輛並無任何未清繳之財務、貸款或第三方權利負擔，且可合法順利轉讓予買方。</span></li>
                                                <li><b>Vehicle Condition:</b> The Seller guarantees that the Vehicle has never been involved in any major accidents resulting in structural damage, nor has it ever been damaged by flooding. <br/><span className="text-slate-700"><b>車輛狀況：</b>賣方保證上述車輛從未涉及任何導致結構受損之重大意外，亦從未受過水浸損壞。</span></li>
                                                <li><b>Cross-Border Quota Clearance (If Applicable):</b> For vehicles with prior cross-border registration, the Seller warrants that all associated quotas have been completely detached. <br/><span className="text-slate-700"><b>中港指標退清 (如適用)：</b>若為跨境車輛，賣方保證已徹底註銷及退清該車輛與之前所有中港車牌指標之關聯。</span></li>
                                            </ol>
                                        </div>
                                    )}

                                    {/* ★ 賣車與訂車終極免責/殺訂條款 */}
                                    {activeType === 'sales_contract' && (activeVehicle as any).showSalesGuarantees !== false && (
                                        <div className="mt-2 pt-2 border-t border-slate-300">
                                            <p className="font-bold mb-1 text-slate-800">Purchaser's Acknowledgements and Terms 買方確認及合約條款：</p>
                                            <ol className="list-decimal pl-4 space-y-1 text-[8px] leading-tight">
                                                <li><b>"As-Is" Condition:</b> The Buyer acknowledges having inspected the Vehicle (or waived such right) and agrees to purchase it strictly "As-Is". <br/><span className="text-slate-700"><b>現狀買賣：</b>買方確認已檢驗上述車輛（或自願放棄驗車權利），並同意以「現狀」(As-Is) 購入。賣方對車輛之性能或質量不作任何保證。</span></li>
                                                <li><b>Odometer Disclaimer:</b> As a pre-owned vehicle, the odometer reading is indicative only. The Seller cannot warrant the vehicle's history or dashboard alterations. <br/><span className="text-slate-700"><b>里數免責：</b>此為二手車輛，儀錶板里數僅供參考。賣方無法保證該儀錶板未曾被前任車主干擾或更換。</span></li>
                                                <li><b>Post-Delivery Liability:</b> Upon vehicle handover, all risks, liabilities, and subsequent repair costs pass entirely to the Buyer. <br/><span className="text-slate-700"><b>交車後免責：</b>自交車之時起，所有風險、法律責任及日後維修費用均由買方承擔，賣方概不負責。</span></li>
                                                <li><b>Non-Refundable Deposit & Forfeiture:</b> All deposits paid are strictly non-refundable. Should the Buyer fail to complete the purchase or take delivery within the agreed timeframe, the Seller reserves the absolute right to terminate this Agreement, forfeit the entire deposit as liquidated damages, and resell the vehicle. <br/><span className="text-slate-700 font-bold text-red-800"><b>訂金沒收 (殺訂) 條款：買方所付之訂金概不退還。若買方未能按時支付尾數或完成交易，賣方保留絕對權利單方面終止合約，並全數沒收訂金作為預定違約金，且有權將車輛自由轉售。</b></span></li>
                                                {((activeVehicle as any).orderType === 'Overseas' || (activeVehicle as any).orderType === 'Local') && (
                                                    <li><b>Vehicle Order & ETA:</b> For ordered vehicles, the Estimated Time of Arrival (ETA) is indicative. Delays caused by shipping, customs, or factors beyond the Seller's control shall not entitle the Buyer to cancel the order or demand a refund. <br/><span className="text-slate-700"><b>訂購車輛特別條款：</b>針對非現貨之訂購車輛，預計到港時間 (ETA) 僅供參考。因船期、海關或非賣方所能控制之因素導致的延誤，買方無權藉此要求取消訂單或退還訂金。</span></li>
                                                )}
                                            </ol>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {activeVehicle.remarks && (
                        <div className="mb-3 border border-dashed border-slate-300 p-2 text-[10px] font-mono leading-relaxed bg-slate-50">
                            <span className="font-bold text-slate-500">Remarks / Bank Info:</span><p className="mt-1 whitespace-pre-wrap">{activeVehicle.remarks}</p>
                        </div>
                    )}
                </div>
                
                {/* ★ 印章防切斷：位置提升至 bottom-10 / print:bottom-12，並強制套用 z-50 避免被遮擋 */}
                <div className="absolute bottom-10 left-10 right-10 print:bottom-12 print:left-10 print:right-10 bg-transparent pointer-events-none z-50">
                    <SignatureSection labelLeft={`For and on behalf of ${companyEn}`} labelRight={isQuotation ? "Customer Confirmation" : ((isPurchase||isConsignment) ? "Vendor Signature" : "Purchaser Signature")} />
                </div>
            </div>
        );
    }

    return (
        // ★ 外殼：絕對鎖定 794x1123
        <div id="print-root" className="w-[794px] h-[1123px] mx-auto bg-white text-slate-900 font-sans relative shadow-lg box-border overflow-hidden">
            <PrintStyle />
            
            {/* ★ 內層：加大底端內距 (pb-45mm) 防擠壓 */}
            <div className="p-8 print:p-0 pb-[45mm] print:pb-[45mm] h-full box-border">
                <HeaderSection />
                <div className="flex justify-between mb-6 border p-3 rounded bg-slate-50">
                    <div className="text-[10px]"><p className="text-slate-500 font-bold uppercase mb-1">Bill To:</p><p className="text-sm font-bold">{curCustomer.name}</p><p>{curCustomer.address}</p><p className="font-mono">{curCustomer.phone}</p></div>
                    <div className="text-[10px] text-right"><p>Reg No: <span className="font-bold text-sm ml-1">{activeVehicle.regMark}</span></p><p>{activeVehicle.make} {activeVehicle.model}</p></div>
                </div>

                <table className="w-full text-[10px] border-collapse mb-6">
                    <thead><tr className="bg-slate-800 text-white"><th className="p-2 text-left">Description</th><th className="p-2 text-right">Amount</th></tr></thead>
                    <tbody>
                        <tr className="border-b"><td className="p-2 font-bold">{((activeVehicle as any).orderType === 'Overseas') ? 'Overseas & Local Charges (海外與本地總費用)' : `Vehicle Price (${activeVehicle.make} ${activeVehicle.model})`}</td><td className="p-2 text-right font-mono font-bold text-[12px]">{formatCurrency(basePrice)}</td></tr>
                        {itemsToRender.map((item: any, i: number) => (<tr key={`addon-${i}`} className="border-b text-slate-600"><td className="p-2 font-medium pl-4">+ {item.desc} {item.isFree ? <span className="font-bold text-slate-400">(F.O.C.)</span> : ''}</td><td className="p-2 text-right font-mono">{item.isFree ? '0' : formatCurrency(item.amount)}</td></tr>))}
                        {depositItems.map((item: any, idx: number) => (<tr key={`dep-${idx}`} className="border-b text-blue-700 bg-blue-50/30"><td className="p-2 font-bold pl-4">Less: {item.label}</td><td className="p-2 text-right font-mono font-bold text-[12px]">{formatCurrency(item.amount)}</td></tr>))}
                    </tbody>
                    <tfoot><tr className="bg-red-50/50 font-bold text-xs border-t-2 border-slate-800"><td className="p-2 text-right uppercase tracking-widest text-[11px]">Balance Due (餘額)</td><td className="p-2 text-right font-mono text-[14px] text-red-600">{formatCurrency(balance)}</td></tr></tfoot>
                </table>

                {activeType === 'receipt' && (activeVehicle as any).paymentMethod && (<div className="mb-6 p-2 border border-slate-300 bg-slate-50 rounded"><p className="text-[10px] font-bold">Payment Method (收款方式): <span className="text-sm font-mono ml-2">{(activeVehicle as any).paymentMethod}</span></p></div>)}
                {activeVehicle.remarks && (<div className="mb-6 border-t border-slate-200 pt-2"><p className="text-[9px] font-bold text-slate-500 mb-1">Remarks:</p><p className="text-[10px] whitespace-pre-wrap font-mono leading-relaxed">{activeVehicle.remarks}</p></div>)}
                
                <div className="text-[9px] text-slate-500 mt-6"><p className="font-bold">Terms:</p><p>1. Cheques should be crossed and made payable to "{companyEn}".</p><p>2. Official receipt will only be issued upon clearance of cheque.</p></div>
            </div>

            {/* ★ 印章防切斷：位置提升至 bottom-10 / print:bottom-12，並強制套用 z-50 避免被遮擋 */}
            <div className="absolute bottom-10 left-10 right-10 print:bottom-12 print:left-10 print:right-10 bg-transparent pointer-events-none z-50">
                <SignatureSection labelLeft={`For and on behalf of ${companyEn}`} labelRight="Received By" />
            </div>
        </div>
    );
}
