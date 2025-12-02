'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Car, 
  FileText, 
  LayoutDashboard, 
  Plus, 
  Printer, 
  Trash2,
  DollarSign,
  Menu, // 新增：手機選單圖示
  X,    // 新增：關閉圖示
  Building2 // 用於 Logo 佔位符
} from 'lucide-react';

// --- 公司資料配置 (Single Source of Truth) ---
const COMPANY_INFO = {
  name_en: "GOLD LAND AUTO",
  name_ch: "金田汽車",
  address_en: "Rm 11, 22/F, Blk B, New Trade Plaza, 6 On Ping St, Shek Mun, Shatin, N.T., HK",
  address_ch: "香港沙田石門安平街6號新貿中心B座22樓11室",
  phone: "+852 3490 6112",
  logo_url: "/logo.png" // 如果你有 logo 圖片，請放在 public 資料夾並改名，否則會顯示預設圖示
};

// --- 類型定義 (Types) ---

type Vehicle = {
  id: string;
  regMark: string;
  make: string;
  model: string;
  year: string;
  chassisNo: string;
  engineNo: string;
  price: number;
  status: 'In Stock' | 'Sold' | 'Reserved';
};

type Customer = {
  name: string;
  phone: string;
  hkid: string;
  address: string;
};

type DocType = 'sales_contract' | 'purchase_contract' | 'invoice' | 'receipt';

// --- 模擬資料 (Mock Data) ---

const INITIAL_INVENTORY: Vehicle[] = [
  { id: '1', regMark: 'KG8888', make: 'Toyota', model: 'Alphard 3.5', year: '2019', chassisNo: 'AGH30-1234567', engineNo: '2GR-987654', price: 388000, status: 'In Stock' },
  { id: '2', regMark: 'AB1234', make: 'Mercedes-Benz', model: 'E200 AMG', year: '2018', chassisNo: 'W213-5556666', engineNo: 'M274-111222', price: 238000, status: 'In Stock' },
  { id: '3', regMark: 'XY999', make: 'Tesla', model: 'Model 3 LR', year: '2021', chassisNo: '5YJ3-8888888', engineNo: '3D1-000000', price: 198000, status: 'Sold' },
];

// --- 工具函數 ---

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD' }).format(amount);
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }); // DD/MM/YYYY
};

// --- 主應用程式元件 ---

export default function GoldLandAutoDMS() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'create_doc'>('dashboard');
  const [inventory, setInventory] = useState<Vehicle[]>(INITIAL_INVENTORY);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // 手機選單狀態
  
  // 開單表單狀態
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '', hkid: '', address: '' });
  const [deposit, setDeposit] = useState<number>(0);
  const [docType, setDocType] = useState<DocType>('sales_contract');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // --- 庫存管理邏輯 ---

  const handleAddVehicle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newVehicle: Vehicle = {
      id: Date.now().toString(),
      regMark: formData.get('regMark') as string,
      make: formData.get('make') as string,
      model: formData.get('model') as string,
      year: formData.get('year') as string,
      chassisNo: formData.get('chassisNo') as string,
      engineNo: formData.get('engineNo') as string,
      price: Number(formData.get('price')),
      status: 'In Stock',
    };
    setInventory([newVehicle, ...inventory]);
    e.currentTarget.reset();
    alert('車輛已入庫 / Vehicle Added');
  };

  const deleteVehicle = (id: string) => {
    if(confirm('確定要刪除此車輛資料？ / Delete this vehicle?')) {
      setInventory(inventory.filter(v => v.id !== id));
    }
  };

  // --- 打印邏輯 ---
  const printAreaRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => { window.print(); };

  // --- 數位印章組件 (CSS 繪製) ---
  const CompanyStamp = () => (
    <div className="absolute -top-10 left-4 w-36 h-36 border-4 border-red-600 rounded-full flex flex-col items-center justify-center transform -rotate-12 opacity-80 pointer-events-none select-none mix-blend-multiply z-10" style={{boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.3)'}}>
      <div className="w-[90%] h-[90%] border border-red-600 rounded-full flex flex-col items-center justify-center p-1">
        <div className="text-red-600 font-bold text-center leading-tight">
          <div className="text-[10px] scale-90 tracking-widest">GOLD LAND AUTO</div>
          <div className="text-[14px] my-1">金田汽車</div>
          <div className="text-[8px] mt-1 border-t border-red-600 pt-1 px-2">{formatDate(new Date())}</div>
        </div>
      </div>
    </div>
  );

  // --- 文件預覽/打印模版 (核心功能) ---
  const DocumentTemplate = () => {
    if (!selectedVehicle) return null;

    const today = formatDate(new Date());
    const balance = selectedVehicle.price - deposit;

    // 共用頁頭 (中英對照 + Logo)
    const Header = ({ titleEn, titleCh }: { titleEn: string, titleCh: string }) => (
      <div className="mb-8">
        <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-2">
          {/* Logo 區域 */}
          <div className="w-24 h-24 flex-shrink-0 mr-4 flex items-center justify-center border border-gray-200 bg-gray-50 rounded-lg overflow-hidden">
            {/* 這裡嘗試顯示圖片，如果沒有圖片則顯示圖示 */}
             <div className="flex flex-col items-center justify-center text-gray-400">
                <Building2 size={32} />
                <span className="text-[10px] mt-1">Logo</span>
             </div>
             {/* 如果你有真實 Logo，請取消下面這行的註解並確保路徑正確 */}
             {/* <img src={COMPANY_INFO.logo_url} alt="Logo" className="w-full h-full object-contain" /> */}
          </div>

          {/* 公司資料區域 */}
          <div className="flex-1 text-right">
            <h1 className="text-3xl font-bold tracking-wide text-black">{COMPANY_INFO.name_en}</h1>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{COMPANY_INFO.name_ch}</h2>
            <div className="text-xs text-gray-600 space-y-1">
              <p>{COMPANY_INFO.address_en}</p>
              <p>{COMPANY_INFO.address_ch}</p>
              <p className="font-bold">Tel: {COMPANY_INFO.phone}</p>
            </div>
          </div>
        </div>
        
        {/* 文件標題 */}
        <div className="text-center mt-6">
          <h2 className="text-xl font-bold uppercase underline decoration-2 underline-offset-4">{titleEn}</h2>
          <h3 className="text-lg font-bold mt-1">{titleCh}</h3>
        </div>
      </div>
    );

    // 共用車輛表格 (中英對照)
    const VehicleTable = () => (
      <table className="w-full border-collapse border border-black mb-6 text-sm">
        <tbody>
          <tr>
            <td className="border border-black p-2 bg-gray-100 font-bold w-1/4">
              車牌號碼<br/><span className="text-xs font-normal">Reg. Mark</span>
            </td>
            <td className="border border-black p-2 w-1/4 font-mono font-bold text-lg">{selectedVehicle.regMark}</td>
            <td className="border border-black p-2 bg-gray-100 font-bold w-1/4">
              製造年份<br/><span className="text-xs font-normal">Year of Manuf.</span>
            </td>
            <td className="border border-black p-2 w-1/4">{selectedVehicle.year}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 bg-gray-100 font-bold">
              廠名<br/><span className="text-xs font-normal">Make</span>
            </td>
            <td className="border border-black p-2">{selectedVehicle.make}</td>
            <td className="border border-black p-2 bg-gray-100 font-bold">
              型號<br/><span className="text-xs font-normal">Model</span>
            </td>
            <td className="border border-black p-2">{selectedVehicle.model}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 bg-gray-100 font-bold">
              底盤號碼<br/><span className="text-xs font-normal">Chassis No.</span>
            </td>
            <td className="border border-black p-2 font-mono" colSpan={3}>{selectedVehicle.chassisNo}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 bg-gray-100 font-bold">
              引擎號碼<br/><span className="text-xs font-normal">Engine No.</span>
            </td>
            <td className="border border-black p-2 font-mono" colSpan={3}>{selectedVehicle.engineNo}</td>
          </tr>
        </tbody>
      </table>
    );

    // 1. 買賣合約
    if (docType === 'sales_contract') {
      return (
        <div className="max-w-[210mm] mx-auto bg-white p-10 min-h-[297mm] text-black relative">
          <Header titleEn="Sales & Purchase Agreement" titleCh="汽車買賣合約" />
          
          <div className="flex justify-between mb-4 text-sm border-b pb-2">
            <span>合約編號 (No.): <span className="font-mono font-bold">SLA-{today.replace(/\//g,'')}-{selectedVehicle.id}</span></span>
            <span>日期 (Date): {today}</span>
          </div>

          <div className="mb-6">
            <h3 className="font-bold border-b-2 border-gray-800 mb-2 bg-gray-100 p-1">甲、買方資料 / Purchaser Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs">姓名 / Name</p>
                <p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{customer.name}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">電話 / Phone</p>
                <p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{customer.phone}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">身份證號碼 / HKID No.</p>
                <p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{customer.hkid}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 text-xs">地址 / Address</p>
                <p className="font-bold border-b border-gray-300 min-h-[1.5rem]">{customer.address}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-bold border-b-2 border-gray-800 mb-2 bg-gray-100 p-1">乙、車輛資料 / Vehicle Details</h3>
            <VehicleTable />
          </div>

          <div className="mb-6">
            <h3 className="font-bold border-b-2 border-gray-800 mb-2 bg-gray-100 p-1">丙、交易款項 / Payment Details</h3>
            <div className="text-sm space-y-3 px-2">
              <div className="flex justify-between items-end border-b border-dotted border-gray-400 pb-1">
                <span>成交價 (Vehicle Price):</span>
                <span className="font-bold text-lg">{formatCurrency(selectedVehicle.price)}</span>
              </div>
              <div className="flex justify-between items-end border-b border-dotted border-gray-400 pb-1">
                <span>已付訂金 (Deposit Paid):</span>
                <span className="text-lg">{formatCurrency(deposit)}</span>
              </div>
              <div className="flex justify-between items-end border-b-2 border-black pb-1 mt-2">
                <span className="font-bold">尚餘尾數 (Balance Due):</span>
                <span className="font-bold text-xl">{formatCurrency(balance)}</span>
              </div>
            </div>
          </div>

          <div className="mb-8 text-[11px] text-justify leading-relaxed text-gray-700">
            <h3 className="font-bold mb-1 text-sm text-black">條款及細則 / Terms & Conditions:</h3>
            <ol className="list-decimal pl-4 space-y-1">
              <li>
                買方已親自驗收上述車輛，並確認車輛之機件性能及外觀狀況良好，同意以「現狀」成交。<br/>
                <span className="italic text-gray-500">The Purchaser has inspected the vehicle and accepted its condition on an "as-is" basis.</span>
              </li>
              <li>
                本合約簽署後，如買方悔約或未能於約定日期前付清尾數，賣方有權沒收所有訂金，並有權將車輛轉售予第三者。<br/>
                <span className="italic text-gray-500">Deposit will be forfeited if the Purchaser fails to complete the payment by the due date.</span>
              </li>
              <li>
                賣方保證上述車輛並無涉及任何未清之財務按揭、罰款或法律訴訟。如有發現，賣方願負全責。<br/>
                <span className="italic text-gray-500">The Vendor guarantees the vehicle is free from any outstanding finance, fines, or legal encumbrances.</span>
              </li>
              <li>
                車輛過戶手續費及保險費由買方負責 (除非另有註明)。<br/>
                <span className="italic text-gray-500">Transfer fees and insurance are to be borne by the Purchaser unless stated otherwise.</span>
              </li>
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-16 mt-12">
            <div className="relative">
              <div className="border-t border-black pt-2 text-center">
                <p className="font-bold">賣方簽署及公司蓋印</p>
                <p className="text-xs text-gray-500">Authorized Signature & Chop</p>
                <p className="text-xs font-bold mt-1">For and on behalf of<br/>{COMPANY_INFO.name_en}</p>
              </div>
              {/* 自動蓋章 */}
              <CompanyStamp />
            </div>
            <div>
              <div className="border-t border-black pt-2 text-center">
                <p className="font-bold">買方簽署</p>
                <p className="text-xs text-gray-500">Purchaser Signature</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 2. 發票
    if (docType === 'invoice') {
      return (
        <div className="max-w-[210mm] mx-auto bg-white p-10 min-h-[297mm] text-black">
          <Header titleEn="INVOICE" titleCh="發票" />
          
          <div className="flex justify-between mb-8 border p-4 rounded-lg bg-gray-50">
            <div className="flex-1">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Bill To / 致:</p>
              <p className="font-bold text-lg mt-1">{customer.name}</p>
              <p className="text-sm whitespace-pre-wrap">{customer.address}</p>
              <p className="text-sm mt-1">Tel: {customer.phone}</p>
            </div>
            <div className="text-right border-l pl-8 ml-8">
              <div className="mb-2">
                <p className="text-gray-500 text-xs">Invoice No. / 發票編號</p>
                <p className="font-bold text-lg">INV-{today.replace(/\//g,'')}-{selectedVehicle.id}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Date / 日期</p>
                <p className="font-bold">{today}</p>
              </div>
            </div>
          </div>

          <VehicleTable />

          <table className="w-full mt-8 border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left p-3 w-3/4">項目說明 / Description</th>
                <th className="text-right p-3 w-1/4">金額 / Amount (HKD)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="p-4">
                  <p className="font-bold text-lg">{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</p>
                  <p className="text-sm text-gray-500 mt-1">Reg. Mark: {selectedVehicle.regMark}</p>
                  <p className="text-sm text-gray-500">Chassis No: {selectedVehicle.chassisNo}</p>
                </td>
                <td className="p-4 text-right align-top font-bold text-lg">{formatCurrency(selectedVehicle.price)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-4 text-sm text-gray-600">
                  政府牌費 / License Fee
                </td>
                <td className="p-4 text-right align-top">-</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-4 text-sm text-gray-600">
                  保險代支 / Insurance
                </td>
                <td className="p-4 text-right align-top">-</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td className="p-4 text-right font-bold text-xl uppercase">Total / 總數:</td>
                <td className="p-4 text-right font-bold text-xl border-b-4 border-double border-black bg-gray-50 text-black">
                  {formatCurrency(selectedVehicle.price)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-20 w-1/2 ml-auto relative">
            <div className="border-t border-black pt-4 text-center">
              <p className="font-bold">Gold Land Auto Trading Co.</p>
              <p className="text-xs text-gray-500">Authorized Signature & Company Chop</p>
            </div>
            <CompanyStamp />
          </div>
        </div>
      );
    }

    // 3. 收據
    if (docType === 'receipt') {
      return (
        <div className="max-w-[210mm] mx-auto bg-white p-10 min-h-[148mm] border-b-2 border-dashed border-gray-300 text-black relative">
          <Header titleEn="OFFICIAL RECEIPT" titleCh="正式收據" />
          
          <div className="mb-6 text-sm relative z-10">
            <div className="flex justify-between mb-6">
               <p>日期 / Date: <span className="font-bold">{today}</span></p>
               <p>編號 / No.: <span className="font-bold">RCP-{Date.now().toString().slice(-6)}</span></p>
            </div>
            
            <div className="border border-black p-6 bg-gray-50 leading-loose">
              <div className="flex mb-2">
                 <span className="w-32 flex-shrink-0">茲收到 / Received from:</span>
                 <span className="border-b border-black flex-1 font-bold px-2">{customer.name}</span>
              </div>
              <div className="flex mb-2">
                 <span className="w-32 flex-shrink-0">款項 / The sum of:</span>
                 <span className="border-b border-black flex-1 font-bold px-2 flex items-center">
                   HKD <span className="text-xl mx-2">{formatCurrency(deposit)}</span>
                 </span>
              </div>
              <div className="flex mb-2">
                 <span className="w-32 flex-shrink-0">用途 / Being payment of:</span>
                 <span className="border-b border-black flex-1 font-bold px-2">
                   訂金 / 尾數 (Deposit / Balance) for Vehicle: {selectedVehicle.regMark}
                 </span>
              </div>
              <div className="flex">
                 <span className="w-32 flex-shrink-0">付款方式 / Payment:</span>
                 <span className="border-b border-black flex-1 px-2">
                   現金 (Cash) / 支票 (Cheque) / 轉數快 (FPS)
                 </span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-between items-end">
            <div className="text-3xl font-bold border-4 border-black p-3 px-8 transform -rotate-2">
              HK{formatCurrency(deposit)}
            </div>
            <div className="text-center w-64 relative">
              <div className="border-b border-black mb-1 h-8"></div>
              <p>收款人簽署 & 蓋印</p>
              <p className="text-xs text-gray-500">Receiver Signature & Chop</p>
              <CompanyStamp />
            </div>
          </div>
        </div>
      );
    }

    // 4. 收車合約
    return (
        <div className="max-w-[210mm] mx-auto bg-white p-10 min-h-[297mm] text-black">
          <Header titleEn="PURCHASE AGREEMENT" titleCh="買入車輛合約" />
          
          <div className="mb-6 bg-gray-50 p-4 border border-gray-300 rounded">
             <h3 className="font-bold mb-2 border-b pb-1">賣方 (前車主) 資料 / Vendor Details:</h3>
             <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                <p>姓名 / Name: <span className="font-bold">{customer.name}</span></p>
                <p>電話 / Phone: <span className="font-bold">{customer.phone}</span></p>
                <p>身份證 / HKID: <span className="font-bold">{customer.hkid}</span></p>
             </div>
          </div>

          <VehicleTable />

          <div className="mb-6 p-4 border-2 border-slate-200 rounded">
            <h3 className="font-bold mb-2">交易詳情 / Transaction Details:</h3>
            <p className="mb-2">
              本公司 (金田汽車) 同意以港幣 <span className="font-bold text-xl underline">{formatCurrency(selectedVehicle.price)}</span> 收購上述車輛。<br/>
              <span className="text-xs text-gray-500">Gold Land Auto agrees to purchase the said vehicle at the price above.</span>
            </p>
            <p>交收日期 / Handover Date: <span className="font-bold">{today}</span></p>
          </div>

          <div className="mb-8 text-xs space-y-2 text-justify">
             <p className="font-bold text-sm underline">賣方聲明 / Vendor Declaration：</p>
             <ol className="list-decimal pl-4 space-y-1">
               <li>
                 賣方保證擁有上述車輛之絕對處置權，並無任何隱瞞之財務借貸或按揭。<br/>
                 <span className="text-gray-500">The Vendor guarantees absolute ownership and freedom from any financial encumbrances.</span>
               </li>
               <li>
                 賣方保證上述車輛之行車哩數為真實，並無任何非法改裝、積木接駁或嚴重事故紀錄。<br/>
                 <span className="text-gray-500">The Vendor warrants the mileage is genuine and the vehicle has no illegal modifications or major accident history.</span>
               </li>
               <li>
                 成交日前之所有交通違例罰款及民事責任概由賣方負責。<br/>
                 <span className="text-gray-500">The Vendor is liable for all traffic fines and civil liabilities incurred prior to the handover.</span>
               </li>
             </ol>
          </div>

          <div className="grid grid-cols-2 gap-20 mt-16 text-center">
            <div className="relative">
              <div className="border-t border-black pt-2">
                <p className="font-bold">金田汽車 (買方)</p>
                <p className="text-xs text-gray-500">Gold Land Auto (Purchaser)</p>
              </div>
              <CompanyStamp />
            </div>
            <div className="border-t border-black pt-2">
              <p>前車主 (賣方) 簽署</p>
              <p className="text-xs text-gray-500">Vendor Signature</p>
            </div>
          </div>
        </div>
    );
  };

  // --- 手機側邊欄 (Sidebar) ---
  const Sidebar = () => (
    <>
      {/* 手機版遮罩 (Overlay) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* 側邊欄本體 */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:h-screen flex flex-col print:hidden
      `}>
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-yellow-500 tracking-tighter">GOLD LAND</h1>
            <p className="text-xs text-slate-400 mt-1">金田汽車系統</p>
          </div>
          {/* 手機版關閉按鈕 */}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} 
            className={`flex items-center w-full p-3 rounded transition ${activeTab === 'dashboard' ? 'bg-yellow-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
          >
            <LayoutDashboard size={20} className="mr-3" /> 儀表板
          </button>
          <button 
            onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }} 
            className={`flex items-center w-full p-3 rounded transition ${activeTab === 'inventory' ? 'bg-yellow-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
          >
            <Car size={20} className="mr-3" /> 車輛庫存
          </button>
          <button 
            onClick={() => { setActiveTab('create_doc'); setIsMobileMenuOpen(false); }} 
            className={`flex items-center w-full p-3 rounded transition ${activeTab === 'create_doc' ? 'bg-yellow-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
          >
            <FileText size={20} className="mr-3" /> 開單系統
          </button>
        </nav>
        
        <div className="p-4 text-xs text-slate-500 text-center border-t border-slate-800">
          Mobile Ready v2.0
        </div>
      </div>
    </>
  );

  // --- 主要渲染邏輯 ---

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 font-sans">
      <Sidebar />

      <main className="flex-1 w-full min-w-0 md:ml-0 p-4 md:p-8 print:m-0 print:p-0 transition-all duration-300">
        
        {/* 手機版頂部導航列 (Mobile Header) */}
        <div className="md:hidden flex items-center justify-between mb-6 bg-white p-4 rounded-lg shadow-sm print:hidden">
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-700">
            <Menu size={28} />
          </button>
          <span className="font-bold text-lg text-slate-800">Gold Land Auto</span>
          <div className="w-7"></div> {/* 佔位用，保持標題置中 */}
        </div>

        {/* 預覽模式時顯示的控制列 */}
        {isPreviewMode && (
          <div className="fixed top-0 left-0 right-0 bg-slate-800 text-white p-3 md:p-4 flex flex-col md:flex-row justify-between items-center z-50 shadow-xl print:hidden gap-3">
            <div className="font-bold flex items-center text-sm md:text-base">
              <FileText className="mr-2" /> 
              預覽中: {docType === 'sales_contract' ? '買賣合約' : docType === 'invoice' ? '發票' : docType === 'receipt' ? '收據' : '收車合約'}
            </div>
            <div className="flex space-x-3 w-full md:w-auto">
              <button 
                onClick={() => setIsPreviewMode(false)} 
                className="flex-1 md:flex-none px-4 py-2 bg-gray-600 rounded hover:bg-gray-500 text-sm"
              >
                返回修改
              </button>
              <button 
                onClick={handlePrint} 
                className="flex-1 md:flex-none px-4 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400 flex items-center justify-center text-sm shadow-md"
              >
                <Printer size={18} className="mr-2" /> 
                列印 / PDF
              </button>
            </div>
          </div>
        )}

        {/* 預覽區塊 (只在預覽模式或列印時顯示) */}
        <div className={`${isPreviewMode ? 'block mt-24 md:mt-16' : 'hidden'} print:block print:mt-0`}>
          <div ref={printAreaRef} className="print:w-full">
            <DocumentTemplate />
          </div>
        </div>

        {/* 編輯介面 (列印時隱藏) */}
        <div className={`${isPreviewMode ? 'hidden' : 'block'} print:hidden space-y-6`}>
          
          {/* 儀表板 Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-slate-800">業務概況</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">在庫車輛</p>
                    <p className="text-3xl font-bold">{inventory.filter(v => v.status === 'In Stock').length}</p>
                  </div>
                  <Car className="text-yellow-500 opacity-20" size={40} />
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500 flex justify-between items-center">
                   <div>
                    <p className="text-sm text-gray-500">本月銷售額</p>
                    <p className="text-2xl font-bold text-green-700">HK$ {formatCurrency(inventory.filter(v => v.status === 'Sold').length * 28000).replace('HK$', '')}</p>
                  </div>
                  <DollarSign className="text-green-500 opacity-20" size={40} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 overflow-hidden">
                <h3 className="font-bold mb-4">最新庫存狀態</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="p-3">狀態</th>
                        <th className="p-3">車牌</th>
                        <th className="p-3">車型</th>
                        <th className="p-3">售價</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.slice(0,5).map(car => (
                        <tr key={car.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${car.status === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {car.status === 'In Stock' ? '在庫' : '已售'}
                            </span>
                          </td>
                          <td className="p-3 font-medium">{car.regMark}</td>
                          <td className="p-3">{car.make} {car.model}</td>
                          <td className="p-3">{formatCurrency(car.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 庫存管理 Tab */}
          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-slate-800">車輛庫存管理</h2>
              
              {/* 新增車輛表單 */}
              <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm">
                <h3 className="font-bold mb-4 flex items-center text-slate-700"><Plus size={18} className="mr-2"/> 快速入庫</h3>
                <form onSubmit={handleAddVehicle} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <input name="regMark" placeholder="車牌 (Reg Mark)" required className="border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none" />
                  <input name="make" placeholder="廠名 (e.g. Toyota)" required className="border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none" />
                  <input name="model" placeholder="型號 (e.g. Alphard)" required className="border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none" />
                  <input name="year" placeholder="年份 (Year)" required className="border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none" />
                  <input name="chassisNo" placeholder="底盤號碼 (VIN)" required className="border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none" />
                  <input name="engineNo" placeholder="引擎號碼" required className="border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none" />
                  <input name="price" type="number" placeholder="定價 (HKD)" required className="border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none" />
                  <button type="submit" className="bg-slate-900 text-white p-2 rounded hover:bg-slate-800 transition md:col-span-1 lg:col-span-1">確認入庫</button>
                </form>
              </div>

              {/* 庫存列表 */}
              <div className="grid grid-cols-1 gap-4">
                {inventory.map((car) => (
                  <div key={car.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 hover:shadow-md transition">
                     <div className="flex items-start space-x-4">
                        <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Car size={24} className="text-slate-500"/>
                        </div>
                        <div>
                          <p className="font-bold text-lg text-slate-800">{car.regMark} <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full ml-2">{car.year}</span></p>
                          <p className="text-gray-600 font-medium">{car.make} {car.model}</p>
                          <p className="text-xs text-gray-400 font-mono mt-1">VIN: {car.chassisNo}</p>
                        </div>
                     </div>
                     <div className="flex w-full md:w-auto justify-between md:justify-end items-center space-x-0 md:space-x-6">
                        <div className="text-left md:text-right">
                          <p className="font-bold text-xl text-yellow-600">{formatCurrency(car.price)}</p>
                          <span className={`text-[10px] px-2 py-1 rounded uppercase tracking-wider font-bold ${car.status === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{car.status}</span>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => {
                              setSelectedVehicle(car);
                              setActiveTab('create_doc');
                            }}
                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition" title="開單"
                          >
                            <FileText size={20} />
                          </button>
                          <button onClick={() => deleteVehicle(car.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition" title="刪除">
                            <Trash2 size={20} />
                          </button>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 開單系統 Tab */}
          {activeTab === 'create_doc' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">開立合約 / 文件</h2>
              
              {/* 步驟 1: 選擇車輛 */}
              <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border-l-4 border-yellow-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Car size={100} />
                </div>
                <h3 className="font-bold text-lg mb-4 flex items-center relative z-10">
                  <span className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm font-bold shadow-sm">1</span>
                  選擇交易車輛
                </h3>
                {selectedVehicle ? (
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
                    <div className="mb-2 md:mb-0">
                      <p className="font-bold text-lg text-slate-800">{selectedVehicle.regMark}</p>
                      <p className="text-slate-600">{selectedVehicle.make} {selectedVehicle.model}</p>
                    </div>
                    <div className="text-right w-full md:w-auto flex flex-row md:flex-col justify-between items-center">
                      <p className="text-yellow-600 font-bold text-xl mr-4 md:mr-0">{formatCurrency(selectedVehicle.price)}</p>
                      <button onClick={() => setSelectedVehicle(null)} className="text-red-500 text-sm hover:text-red-700 underline">重選</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 relative z-10">
                    <p className="text-gray-500 mb-4">請先從庫存列表中選擇一輛車</p>
                    <button onClick={() => setActiveTab('inventory')} className="px-6 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition shadow">前往選擇車輛</button>
                  </div>
                )}
              </div>

              {/* 步驟 2 & 3 包裹 */}
              {selectedVehicle && (
                <>
                  {/* 步驟 2: 客戶資料 */}
                  <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
                    <h3 className="font-bold text-lg mb-4 flex items-center">
                      <span className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm font-bold shadow-sm">2</span>
                      客戶 / 買方資料
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">客戶姓名 / Name</label>
                        <input 
                          value={customer.name} 
                          onChange={e => setCustomer({...customer, name: e.target.value})}
                          className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none transition"
                          placeholder="陳大文 / Chan Tai Man"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">電話 / Phone</label>
                        <input 
                           value={customer.phone} 
                           onChange={e => setCustomer({...customer, phone: e.target.value})}
                           className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none transition"
                           placeholder="9123 4567"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">身份證 / HKID</label>
                        <input 
                           value={customer.hkid} 
                           onChange={e => setCustomer({...customer, hkid: e.target.value})}
                           className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none transition"
                           placeholder="A123456(7)"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">地址 / Address</label>
                        <input 
                           value={customer.address} 
                           onChange={e => setCustomer({...customer, address: e.target.value})}
                           className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none transition"
                           placeholder="詳細地址 (將顯示於合約)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 步驟 3: 文件詳情 */}
                   <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
                    <h3 className="font-bold text-lg mb-4 flex items-center">
                      <span className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm font-bold shadow-sm">3</span>
                      文件設定
                    </h3>
                    
                    <div className="mb-6">
                      <label className="block text-sm font-bold text-gray-700 mb-3">選擇要生成的文件：</label>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <button 
                          onClick={() => setDocType('sales_contract')}
                          className={`p-3 text-sm rounded-lg border-2 transition-all font-medium ${docType === 'sales_contract' ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-slate-300'}`}
                        >
                          買賣合約
                        </button>
                        <button 
                          onClick={() => setDocType('purchase_contract')}
                          className={`p-3 text-sm rounded-lg border-2 transition-all font-medium ${docType === 'purchase_contract' ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-slate-300'}`}
                        >
                          收車合約
                        </button>
                        <button 
                          onClick={() => setDocType('invoice')}
                          className={`p-3 text-sm rounded-lg border-2 transition-all font-medium ${docType === 'invoice' ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-slate-300'}`}
                        >
                          發票 (Invoice)
                        </button>
                        <button 
                          onClick={() => setDocType('receipt')}
                          className={`p-3 text-sm rounded-lg border-2 transition-all font-medium ${docType === 'receipt' ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-slate-300'}`}
                        >
                          收據 (Receipt)
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        {docType === 'receipt' ? '是次收款金額 (Receipt Amount)' : '已付訂金 (Deposit Paid)'}
                      </label>
                      <div className="relative rounded-md shadow-sm max-w-xs">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-gray-500 font-bold">$</span>
                        </div>
                        <input
                          type="number"
                          value={deposit}
                          onChange={e => setDeposit(Number(e.target.value))}
                          className="block w-full rounded-md border-gray-300 pl-8 p-3 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-yellow-400 outline-none"
                          placeholder="0"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2 flex items-center">
                        <CheckCircle size={14} className="mr-1 text-green-500"/>
                        系統將自動計算尾數： <span className="font-bold ml-1 text-slate-700">{formatCurrency(selectedVehicle.price - deposit)}</span>
                      </p>
                    </div>
                  </div>

                  {/* 產生按鈕 */}
                  <div className="flex justify-end pt-4 sticky bottom-4 z-20">
                    <button 
                      onClick={() => setIsPreviewMode(true)}
                      className="w-full md:w-auto bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white text-lg px-8 py-4 rounded-xl shadow-lg flex items-center justify-center font-bold transition transform active:scale-95"
                    >
                      <FileText className="mr-2" /> 預覽文件並列印
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// 輔助圖示
function CheckCircle({size, className}: {size: number, className: string}) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}