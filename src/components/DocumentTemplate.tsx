'use client';

import React from 'react';
import { Check } from 'lucide-react';

// 輔助格式化函數
const formatCurrency = (amount: number) => new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', maximumFractionDigits: 0 }).format(amount || 0);

// 1. 橢圓形公司印章
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

// 2. 簽名SVG
export const SignatureImg = () => (
    <div className="w-[30mm] h-[15mm] relative">
        <svg viewBox="0 0 150 80" className="w-full h-full text-black opacity-80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10,50 C30,30 60,70 90,40 S130,20 140,50" />
            <path d="M30,60 C50,50 80,50 110,45" strokeWidth="1.5" />
        </svg>
    </div>
);

// ------------------------------------------------------------------
// ★★★ 全域列印模板引擎 (v8.0: 完美 1/3-2/3 排版與全數據顯示) ★★★
// ------------------------------------------------------------------
export default function DocumentTemplate({ previewDoc, selectedVehicle, docType, COMPANY_INFO }: any) {
    const activeVehicle = previewDoc?.vehicle || selectedVehicle;
    const activeType = previewDoc?.type || docType;

    if (!activeVehicle) return null;

    const itemsToRender = (activeVehicle as any).selectedItems || [];
    const depositItems = (activeVehicle as any).depositItems || []; 
    const showTerms = (activeVehicle as any).showTerms !== false;   
    const checklist = (activeVehicle as any).checklist || { vrd: false, keys: false, tools: false, manual: false, other: '' };
    const displayId = (activeVehicle.id || 'DRAFT').slice(0, 6).toUpperCase();
    
    // 日期處理
    const docDateVal = (activeVehicle as any).docDate || (activeVehicle as any).formData?.docDate;
    
    let today = new Date().toLocaleDateString('en-GB');
    if (docDateVal) {
        const d = new Date(docDateVal);
        today = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
    
    const companyEn = COMPANY_INFO?.name_en || 'GOLD LAND AUTO';
    const companyCh = COMPANY_INFO?.name_ch || '金田汽車';

    const curCustomer = {
        name: activeVehicle.customerName || '',
        phone: activeVehicle.customerPhone || '',
        hkid: activeVehicle.customerID || '',
        address: activeVehicle.customerAddress || ''
    };

    // 金額計算
    const price = Number(activeVehicle.price) || 0;
    const ovFee = Number((activeVehicle as any).overseasTotalFee) || 0;
    const hkFee = Number((activeVehicle as any).localTotalFee) || 0;
    const orderFeesTotal = ((activeVehicle as any).orderType === 'Overseas') ? (ovFee + hkFee) : 0;
    
    const basePrice = ((activeVehicle as any).orderType === 'Overseas') ? orderFeesTotal : price;
    const extrasTotal = itemsToRender.filter((i:any) => !i.isFree).reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    const totalPaid = depositItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    
    const balance = basePrice + extrasTotal - totalPaid;
    
    const showStampAndSig = (activeVehicle as any).showStampAndSig !== false;
    const soldDate = (activeVehicle as any).soldDate || '___________'; 
    const handoverTime = (activeVehicle as any).handoverTime || '_______';

    // 圖片處理：最多取 5 張
    const carPhotos = (activeVehicle.photos || []).slice(0, 5);

    // 單據標題判定
    let docTitleEn = "VEHICLE SALES AGREEMENT"; 
    let docTitleCh = "汽車買賣合約";
    let isPurchase = false;
    let isConsignment = false;
    let isQuotation = false;

    if (activeType === 'purchase_contract') {
        docTitleEn = "VEHICLE PURCHASE AGREEMENT"; docTitleCh = "汽車收購合約"; isPurchase = true;
    } else if (activeType === 'consignment_contract') {
        docTitleEn = "VEHICLE CONSIGNMENT AGREEMENT"; docTitleCh = "汽車寄賣合約"; isConsignment = true;
    } else if (activeType === 'quotation') {
        docTitleEn = "QUOTATION"; docTitleCh = "報價單"; isQuotation = true; 
    } else if (activeType === 'invoice') {
        docTitleEn = "INVOICE"; docTitleCh = "發票";
    } else if (activeType === 'receipt') {
        docTitleEn = "OFFICIAL RECEIPT"; docTitleCh = "正式收據";
    }

    const PrintStyle = () => (
        <style>{`
            @media print {
                @page { margin: 10mm; size: A4; }
                body { margin: 0; padding: 0; background: white; }
                body * { visibility: hidden; }
                #print-root, #print-root * { visibility: visible; }
                #print-root { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
            .no-break { break-inside: avoid; page-break-inside: avoid; }
        `}</style>
    );

    const HeaderSection = () => (
        <div className="flex justify-between items-start mb-4 border-b-2 border-slate-800 pb-2">
            <div className="flex items-center gap-3">
                <img src={COMPANY_INFO?.logo_url || ''} alt="Logo" className="w-12 h-12 object-contain" onError={(e) => { e.currentTarget.style.display='none'; }} />
                <div>
                    <h1 className="text-lg font-black text-slate-900 tracking-wide uppercase leading-none">{companyEn}</h1>
                    <h2 className="text-md font-bold text-slate-700 tracking-widest leading-tight mt-1">{companyCh}</h2>
                    <div className="text-[8px] text-slate-500 mt-1 leading-tight font-serif">
                        <p>{COMPANY_INFO?.address_ch || ''}</p>
                        <p>Tel: {COMPANY_INFO?.phone || ''} | Email: {COMPANY_INFO?.email || ''}</p>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div className="text-md font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 inline-block mb-1">{docTitleEn}</div>
                <div className="text-[10px] font-bold text-slate-600 tracking-[0.3em] text-center">{docTitleCh}</div>
                <div className="mt-1 text-[9px] font-mono">NO: {activeType.slice(0,3).toUpperCase()}-{today.replace(/\//g,'')}-{displayId}</div>
                <div className="text-[9px] font-mono font-bold text-blue-800 uppercase">DATE: {today}</div>
            </div>
        </div>
    );

    const AttachmentsSection = () => (
        <div className="mb-3 border border-slate-300 p-2 text-[10px] bg-slate-50 no-break">
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
        <div className="mt-8 grid grid-cols-2 gap-12 no-break">
            <div className="relative pt-12 border-t border-slate-800 text-center">
                {showStampAndSig && (
                    <>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-90"><CompanyStamp nameEn={companyEn} nameCh={companyCh} /></div>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2"><SignatureImg /></div>
                    </>
                )}
                <p className="font-bold text-[10px] uppercase mt-6">{labelLeft}</p>
            </div>
            <div className="pt-12 border-t border-slate-800 text-center">
                <p className="font-bold text-[10px] uppercase mt-6">{labelRight}</p>
                <p className="text-[9px] text-gray-500 mt-1">ID: {curCustomer.hkid}</p>
            </div>
        </div>
    );

    // ==========================================
    // 1. 合約與報價單類 (Contract & Quotation)
    // ==========================================
    if (activeType.includes('contract') || isQuotation) {
        
        const hasOrderDetails = (isQuotation || activeType === 'sales_contract') && (activeVehicle as any).orderType && (activeVehicle as any).orderType !== 'None';
        const partPaymentLabel = hasOrderDetails ? 'Part D: Payment Details' : 'Part C: Payment Details';
        const etaDisplay = (activeVehicle as any).etaFormat === 'days' 
            ? `${(activeVehicle as any).etaDays || '___'} Days (天)` 
            : ((activeVehicle as any).etaDate || 'TBC (待定)');

        return (
            <div id="print-root" className="max-w-[210mm] mx-auto bg-white p-6 min-h-[297mm] text-slate-900 font-sans relative shadow-lg print:shadow-none print:w-full print:p-0 flex flex-col justify-between">
                <div>
                    <PrintStyle />
                    <HeaderSection />
                    
                    {/* ★★★ 修復排版變形：改為 3 等分網格，客戶佔1，車輛佔2 ★★★ */}
                    <div className="grid grid-cols-3 gap-4 mb-3">
                        {/* 左邊 1/3 客戶資料 */}
                        <div className="no-break col-span-1">
                            <div className="bg-slate-800 text-white text-[9px] font-bold px-2 py-0.5 uppercase mb-1">
                                Part A: {(isPurchase||isConsignment) ? 'Vendor (賣方)' : 'Purchaser (買方)'}
                            </div>
                            <div className="border border-slate-300 p-2 text-[9px] h-[64px] flex flex-col justify-center space-y-1">
                                <p className="truncate"><span className="text-slate-500 font-bold">NAME:</span> <span className="font-bold">{curCustomer.name}</span></p>
                                <p className="truncate"><span className="text-slate-500 font-bold">TEL:</span> {curCustomer.phone}</p>
                                <p className="truncate"><span className="text-slate-500 font-bold">ID NO:</span> {curCustomer.hkid}</p>
                            </div>
                        </div>
                        
                        {/* 右邊 2/3 車輛資料 */}
                        <div className="no-break col-span-2">
                            <div className="bg-slate-800 text-white text-[9px] font-bold px-2 py-0.5 uppercase mb-1">
                                Part B: Vehicle Details
                            </div>
                            {/* ★★★ 精確控制 td 寬度，防止內容撐破 ★★★ */}
                            <table className="w-full text-[9px] border-collapse border border-slate-300 h-[64px]">
                                <tbody>
                                    <tr>
                                        <td className="border p-1 bg-slate-50 font-bold w-[16%]">Reg. No.</td>
                                        <td className="border p-1 font-mono font-bold w-[34%] text-[10px]">{activeVehicle.regMark || 'TBC'}</td>
                                        <td className="border p-1 bg-slate-50 font-bold w-[16%]">Make/Model</td>
                                        <td className="border p-1 w-[34%] text-[10px] font-bold">{activeVehicle.make} {activeVehicle.model}</td>
                                    </tr>
                                    <tr>
                                        <td className="border p-1 bg-slate-50 font-bold">Chassis No.</td>
                                        <td className="border p-1 font-mono">{activeVehicle.chassisNo || 'TBC'}</td>
                                        <td className="border p-1 bg-slate-50 font-bold">Engine No.</td>
                                        <td className="border p-1 font-mono">{activeVehicle.engineNo || 'TBC'}</td>
                                    </tr>
                                    <tr>
                                        <td className="border p-1 bg-slate-50 font-bold">Year</td>
                                        <td className="border p-1">{activeVehicle.year}</td>
                                        <td className="border p-1 bg-slate-50 font-bold">Color (Ext/Int)</td>
                                        <td className="border p-1">{(activeVehicle as any).color || (activeVehicle as any).colorExt || '-'} / {(activeVehicle as any).colorInterior || (activeVehicle as any).colorInt || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="border p-1 bg-slate-50 font-bold">Mileage</td>
                                        <td className="border p-1">{activeVehicle.mileage ? `${Number(activeVehicle.mileage).toLocaleString()} km` : '-'}</td>
                                        <td className="border p-1 bg-slate-50 font-bold">Engine Cap.</td>
                                        <td className="border p-1">{activeVehicle.engineSize ? `${activeVehicle.engineSize} ${activeVehicle.fuelType === 'Electric' ? 'Kw' : 'cc'}` : '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="border p-1 bg-slate-50 font-bold">Transmission</td>
                                        <td className="border p-1">{activeVehicle.transmission === 'Manual' ? 'Manual (手)' : (activeVehicle.transmission === 'Automatic' ? 'Auto (自)' : '-')}</td>
                                        <td className="border p-1 bg-slate-50 font-bold">Seat / Prev.</td>
                                        <td className="border p-1">{activeVehicle.seat || activeVehicle.seating || '-'} 座 / {activeVehicle.previousOwners || '0'} 手</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ★★★ 車輛縮圖區 (最多5張) ★★★ */}
                    {carPhotos.length > 0 && (
                        <div className="mb-3 no-break">
                            <div className="bg-slate-100 border border-slate-200 rounded-lg p-1.5 flex gap-2 justify-center items-center">
                                {carPhotos.map((url: string, idx: number) => (
                                    <div key={idx} className="w-[36mm] h-[25mm] rounded-md overflow-hidden border border-slate-300 bg-white shadow-sm flex-shrink-0">
                                        <img src={url} className="w-full h-full object-cover" alt="car-thumb" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Part C: 海外訂購與運輸明細 */}
                    {hasOrderDetails && (
                        <div className="mb-3 no-break">
                            <div className="bg-slate-800 text-white text-[9px] font-bold px-2 py-0.5 uppercase mb-1">
                                Part C: Order & Shipping Details (訂購與運輸明細)
                            </div>
                            <table className="w-full text-[9px] border-collapse border border-slate-300">
                                <tbody>
                                    <tr>
                                        <td className="border p-1 bg-slate-50 font-bold w-[20%]">Order Type (類別)</td>
                                        <td className="border p-1 w-[30%]">
                                            {(activeVehicle as any).orderType === 'Overseas' ? `Overseas 境外訂購 (${(activeVehicle as any).overseasCountry})` : 'Local 本地訂購'}
                                        </td>
                                        <td className="border p-1 bg-slate-50 font-bold w-[20%] text-blue-800">Est. Arrival (ETA)</td>
                                        <td className="border p-1 font-bold text-blue-700">{etaDisplay}</td>
                                    </tr>
                                    
                                    {(activeVehicle as any).orderType === 'Overseas' && (
                                        <>
                                            <tr>
                                                <td colSpan={4} className="border p-1 bg-slate-100 font-bold text-center">
                                                    Estimated Overseas Charges (預估當地費用)
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colSpan={3} className="border p-1 text-slate-600">
                                                    <span className="font-bold text-slate-800">Included (包含項目):</span> {' '}
                                                    {[
                                                        {k:'chk_ov_local', l:'當地人費用'}, {k:'chk_ov_auction', l:'拍賣手續'}, 
                                                        {k:'chk_ov_shipping', l:'運輸'}, {k:'chk_ov_ins', l:'保險'}, 
                                                        {k:'chk_ov_tax', l:'稅金'}, {k:'chk_ov_doc', l:'文件費'}, {k:'chk_ov_misc', l:'雜費'}
                                                    ].filter(opt => (activeVehicle as any)[opt.k]).map(opt => opt.l).join(', ') || 'N/A'}
                                                </td>
                                                <td className="border p-1 font-mono text-right font-bold">{formatCurrency(ovFee)}</td>
                                            </tr>
                                            <tr>
                                                <td colSpan={4} className="border p-1 bg-slate-100 font-bold text-center">
                                                    Estimated Local Charges (預估到港本地費用)
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colSpan={3} className="border p-1 text-slate-600">
                                                    <span className="font-bold text-slate-800">Included (包含項目):</span> {' '}
                                                    {[
                                                        {k:'chk_hk_tax', l:'政府稅金'}, {k:'chk_hk_emissions', l:'環保'}, 
                                                        {k:'chk_hk_insp', l:'驗車'}, {k:'chk_hk_reg', l:'出牌文件'}, 
                                                        {k:'chk_hk_ins', l:'保險'}, {k:'chk_hk_misc', l:'雜費'}
                                                    ].filter(opt => (activeVehicle as any)[opt.k]).map(opt => opt.l).join(', ') || 'N/A'}
                                                </td>
                                                <td className="border p-1 font-mono text-right font-bold">{formatCurrency(hkFee)}</td>
                                            </tr>
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Part C/D: 財務結算明細 */}
                    <div className="mb-3 no-break">
                        <div className="bg-slate-800 text-white text-[9px] font-bold px-2 py-0.5 uppercase mb-1">
                            {partPaymentLabel}
                        </div>
                        <table className="w-full text-[10px] border-collapse border border-slate-300">
                            <tbody>
                                <tr>
                                    <td className="border p-1.5 font-bold w-1/2">
                                        {((activeVehicle as any).orderType === 'Overseas') ? 'Overseas & Local Charges (海外與本地總費用)' : 'Vehicle Price (車價)'}
                                    </td>
                                    <td className="border p-1.5 text-right font-mono font-bold text-[11px]">{formatCurrency(basePrice)}</td>
                                </tr>
                                
                                {/* 附加費 */}
                                {itemsToRender.map((item: any, idx: number) => (
                                    <tr key={`add-${idx}`} className="text-slate-600">
                                        <td className="border p-1.5 pl-4">
                                            + {item.desc} {item.isFree ? '(F.O.C.)' : ''}
                                        </td>
                                        <td className="border p-1.5 text-right font-mono">
                                            {item.isFree ? '0' : formatCurrency(item.amount)}
                                        </td>
                                    </tr>
                                ))}

                                {/* 訂金與扣減 */}
                                {depositItems.map((item: any, idx: number) => (
                                    <tr key={`dep-${idx}`} className="text-blue-700 bg-blue-50/30">
                                        <td className="border p-1.5 font-bold pl-4">
                                            Less: {item.label}
                                        </td>
                                        <td className="border p-1.5 text-right font-mono font-bold text-[11px]">
                                            {formatCurrency(item.amount)}
                                        </td>
                                    </tr>
                                ))}

                                {/* 結餘 */}
                                <tr className="bg-red-50/50 font-black">
                                    <td className="border p-1.5 uppercase text-[11px]">Balance Due (總結餘/尾數)</td>
                                    <td className="border p-1.5 text-right font-mono text-[13px] text-red-600">{formatCurrency(balance)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* 隨車附件 */}
                    {!isQuotation && <AttachmentsSection />}
                    
                    {/* 條款聲明 */}
                    {showTerms && (
                        <div className="mb-3 p-2 border-2 border-slate-800 bg-gray-50 text-[8px] leading-relaxed text-justify font-serif no-break">
                            {isQuotation ? (
                                <>
                                    <p className="mb-1"><span className="font-bold">VALIDITY:</span> This quotation is valid for 14 days from the date of issue. Prices and ETA are subject to change without prior notice due to exchange rate fluctuations and overseas shipping schedules.</p>
                                    <p><span className="font-bold">注意事項：</span> 本報價單有效期為發出日起計 14 天。因海外匯率波動及船期變更，報價內之預計費用及到港時間 (ETA) 或會於未經事先通知下作適度調整。</p>
                                </>
                            ) : (
                                <>
                                    <p className="mb-1">I, <span className="font-bold underline uppercase">{curCustomer.name || '___________'}</span>, {(isPurchase||isConsignment) ? 'the registered owner,' : ''} agree to {(isPurchase||isConsignment)?(isConsignment?'consign':'sell'):'purchase'} the vehicle to/from <span className="font-bold uppercase">{companyEn}</span> at HKD <span className="font-bold underline">{formatCurrency(balance + totalPaid)}</span> (Total) on <span className="font-bold underline mx-1">{soldDate}</span> at <span className="font-bold underline mx-1">{handoverTime}</span>. Responsibilities for traffic contraventions/liabilities transfer at this time.</p>
                                    <p>本人 <span className="font-bold underline uppercase">{curCustomer.name || '___________'}</span> 同意{(isPurchase||isConsignment)?(isConsignment?'寄賣':'出售'):'購買'}該車輛，日期 <span className="font-bold underline mx-1">{soldDate}</span> 時間 <span className="font-bold underline mx-1">{handoverTime}</span>。成交總價港幣 <span className="font-bold underline">{formatCurrency(balance + totalPaid)}</span>。此時間點前後之交通違例及法律責任由相應方負責。</p>
                                </>
                            )}
                        </div>
                    )}

                    {/* 備註欄 */}
                    {activeVehicle.remarks && (
                        <div className="mb-3 border border-dashed border-slate-300 p-2 text-[9px] font-mono leading-tight bg-slate-50 no-break">
                            <span className="font-bold text-slate-500">Remarks / Bank Info:</span>
                            <p className="mt-0.5 whitespace-pre-wrap">{activeVehicle.remarks}</p>
                        </div>
                    )}
                </div>
                
                {/* 簽名區 (固定在最底部) */}
                <div className="mt-auto no-break">
                    <SignatureSection 
                        labelLeft={`For and on behalf of ${companyEn}`} 
                        labelRight={isQuotation ? "Customer Confirmation" : ((isPurchase||isConsignment) ? "Vendor Signature" : "Purchaser Signature")} 
                    />
                </div>
            </div>
        );
    }

    // ==========================================
    // 2. 發票 / 收據 (Invoice / Receipt)
    // ==========================================
    return (
        <div id="print-root" className="max-w-[210mm] mx-auto bg-white p-10 min-h-[297mm] text-slate-900 font-sans relative shadow-lg print:shadow-none print:w-full print:p-0 flex flex-col justify-between">
            <div>
                <PrintStyle />
                <HeaderSection />
                
                {/* Bill To 區塊 */}
                <div className="flex justify-between mb-6 border p-3 rounded bg-slate-50">
                    <div className="text-[10px]">
                        <p className="text-slate-500 font-bold uppercase mb-1">Bill To:</p>
                        <p className="text-xs font-bold">{curCustomer.name}</p>
                        <p>{curCustomer.address}</p>
                        <p className="mt-1 font-mono">{curCustomer.phone}</p>
                    </div>
                    <div className="text-[10px] text-right">
                        <p>Reg No: <span className="font-bold text-xs ml-1">{activeVehicle.regMark}</span></p>
                        <p>{activeVehicle.make} {activeVehicle.model}</p>
                    </div>
                </div>

                {/* 收費明細 */}
                <table className="w-full text-[10px] border-collapse mb-6">
                    <thead>
                        <tr className="bg-slate-800 text-white">
                            <th className="p-2 text-left">Description</th>
                            <th className="p-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* 車價 (智能判斷是否為海外訂單) */}
                        <tr className="border-b">
                            <td className="p-2 font-bold">
                                {((activeVehicle as any).orderType === 'Overseas') ? 'Overseas & Local Charges (海外與本地總費用)' : `Vehicle Price (${activeVehicle.make} ${activeVehicle.model})`}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-[11px]">
                                {formatCurrency(basePrice)}
                            </td>
                        </tr>

                        {/* 附加費 */}
                        {itemsToRender.map((item: any, i: number) => (
                            <tr key={`addon-${i}`} className="border-b text-slate-600">
                                <td className="p-2 font-medium pl-4">
                                    + {item.desc} {item.isFree ? <span className="font-bold text-slate-400">(F.O.C.)</span> : ''}
                                </td>
                                <td className="p-2 text-right font-mono">
                                    {item.isFree ? '0' : formatCurrency(item.amount)}
                                </td>
                            </tr>
                        ))}

                        {/* 已付訂金 */}
                        {depositItems.map((item: any, idx: number) => (
                            <tr key={`dep-${idx}`} className="border-b text-blue-700 bg-blue-50/30">
                                <td className="p-2 font-bold pl-4">Less: {item.label}</td>
                                <td className="p-2 text-right font-mono font-bold text-[11px]">{formatCurrency(item.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-red-50/50 font-bold text-xs border-t-2 border-slate-800">
                            <td className="p-2 text-right uppercase tracking-widest text-[11px]">Balance Due (餘額)</td>
                            <td className="p-2 text-right font-mono text-[13px] text-red-600">
                                {formatCurrency(balance)}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {/* 收款方式 */}
                {activeType === 'receipt' && (activeVehicle as any).paymentMethod && (
                    <div className="mb-6 p-2 border border-slate-300 bg-slate-50 rounded no-break">
                        <p className="text-[10px] font-bold">
                            Payment Method (收款方式): <span className="text-sm font-mono ml-2">{(activeVehicle as any).paymentMethod}</span>
                        </p>
                    </div>
                )}

                {/* 備註 */}
                {activeVehicle.remarks && (
                    <div className="mb-6 border-t border-slate-200 pt-2 no-break">
                        <p className="text-[9px] font-bold text-slate-500 mb-1">Remarks:</p>
                        <p className="text-[10px] whitespace-pre-wrap font-mono leading-tight">{activeVehicle.remarks}</p>
                    </div>
                )}
            </div>

            {/* 底部條款與簽名 (固定在頁面下方) */}
            <div className="mt-auto no-break">
                <div className="text-[9px] text-slate-500 mb-6">
                    <p className="font-bold">Terms:</p>
                    <p>1. Cheques should be crossed and made payable to "{companyEn}".</p>
                    <p>2. Official receipt will only be issued upon clearance of cheque.</p>
                </div>
                <SignatureSection labelLeft={`For and on behalf of ${companyEn}`} labelRight="Received By" />
            </div>
        </div>
    );
}
