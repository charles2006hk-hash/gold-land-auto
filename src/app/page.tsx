'use client';

import React, { useState, useRef } from 'react';
import { 
  Car, 
  FileText, 
  Users, 
  LayoutDashboard, 
  Plus, 
  Search, 
  Printer, 
  Save, 
  Trash2,
  CheckCircle,
  DollarSign
} from 'lucide-react';

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
  return date.toLocaleDateString('zh-HK', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// --- 主應用程式元件 ---

export default function GoldLandAutoDMS() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'create_doc'>('dashboard');
  const [inventory, setInventory] = useState<Vehicle[]>(INITIAL_INVENTORY);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
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
    alert('車輛已入庫');
  };

  const deleteVehicle = (id: string) => {
    if(confirm('確定要刪除此車輛資料？')) {
      setInventory(inventory.filter(v => v.id !== id));
    }
  };

  // --- 打印邏輯 ---
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  // --- 介面組件 ---

  const Sidebar = () => (
    <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col print:hidden">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-yellow-500">Gold Land Auto</h1>
        <p className="text-xs text-slate-400 mt-1">金田汽車管理系統</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <button onClick={() => setActiveTab('dashboard')} className={`flex items-center w-full p-3 rounded transition ${activeTab === 'dashboard' ? 'bg-yellow-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
          <LayoutDashboard size={20} className="mr-3" /> 儀表板
        </button>
        <button onClick={() => setActiveTab('inventory')} className={`flex items-center w-full p-3 rounded transition ${activeTab === 'inventory' ? 'bg-yellow-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
          <Car size={20} className="mr-3" /> 車輛庫存
        </button>
        <button onClick={() => setActiveTab('create_doc')} className={`flex items-center w-full p-3 rounded transition ${activeTab === 'create_doc' ? 'bg-yellow-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
          <FileText size={20} className="mr-3" /> 開單系統
        </button>
      </nav>
      <div className="p-4 text-xs text-slate-500 text-center">
        v1.0.0 | Developed for Gold Land
      </div>
    </div>
  );

  // --- 文件預覽/打印模版 (核心功能) ---
  const DocumentTemplate = () => {
    if (!selectedVehicle) return null;

    const today = formatDate(new Date());
    const balance = selectedVehicle.price - deposit;

    // 共用頁頭
    const Header = ({ title }: { title: string }) => (
      <div className="text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-3xl font-bold mb-2">金田汽車貿易公司</h1>
        <h2 className="text-xl">GOLD LAND AUTO TRADING CO.</h2>
        <p className="text-sm mt-2">地址：香港新界元朗金田路88號地下 | 電話：+852 1234 5678</p>
        <div className="mt-4 inline-block px-6 py-2 border-2 border-black font-bold text-xl">
          {title}
        </div>
      </div>
    );

    // 共用車輛表格
    const VehicleTable = () => (
      <table className="w-full border-collapse border border-black mb-6 text-sm">
        <tbody>
          <tr>
            <td className="border border-black p-2 bg-gray-100 font-bold w-1/4">車牌號碼 (Reg. Mark)</td>
            <td className="border border-black p-2 w-1/4">{selectedVehicle.regMark}</td>
            <td className="border border-black p-2 bg-gray-100 font-bold w-1/4">首次登記年份 (Year)</td>
            <td className="border border-black p-2 w-1/4">{selectedVehicle.year}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 bg-gray-100 font-bold">廠名 (Make)</td>
            <td className="border border-black p-2">{selectedVehicle.make}</td>
            <td className="border border-black p-2 bg-gray-100 font-bold">型號 (Model)</td>
            <td className="border border-black p-2">{selectedVehicle.model}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 bg-gray-100 font-bold">底盤號碼 (Chassis No.)</td>
            <td className="border border-black p-2" colSpan={3}>{selectedVehicle.chassisNo}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 bg-gray-100 font-bold">引擎號碼 (Engine No.)</td>
            <td className="border border-black p-2" colSpan={3}>{selectedVehicle.engineNo}</td>
          </tr>
        </tbody>
      </table>
    );

    // 1. 買賣合約
    if (docType === 'sales_contract') {
      return (
        <div className="max-w-[210mm] mx-auto bg-white p-10 min-h-[297mm] text-black">
          <Header title="汽車買賣合約 (SALES AGREEMENT)" />
          
          <div className="flex justify-between mb-4 text-sm">
            <span>合約編號: SLA-{today.replace(/\//g,'')}-{selectedVehicle.id}</span>
            <span>日期: {today}</span>
          </div>

          <div className="mb-6">
            <h3 className="font-bold border-b border-black mb-2">甲、買方資料 (Purchaser Details)</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p>姓名: {customer.name}</p>
              <p>電話: {customer.phone}</p>
              <p>身份證號碼: {customer.hkid}</p>
              <p>地址: {customer.address}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-bold border-b border-black mb-2">乙、車輛資料 (Vehicle Details)</h3>
            <VehicleTable />
          </div>

          <div className="mb-6">
            <h3 className="font-bold border-b border-black mb-2">丙、交易款項 (Payment Details)</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between border-b border-dotted pb-1">
                <span>成交價 (Vehicle Price):</span>
                <span className="font-bold">{formatCurrency(selectedVehicle.price)}</span>
              </div>
              <div className="flex justify-between border-b border-dotted pb-1">
                <span>已付訂金 (Deposit Paid):</span>
                <span>{formatCurrency(deposit)}</span>
              </div>
              <div className="flex justify-between border-b border-dotted pb-1 font-bold text-lg mt-2">
                <span>尚餘尾數 (Balance Due):</span>
                <span>{formatCurrency(balance)}</span>
              </div>
            </div>
          </div>

          <div className="mb-8 text-xs text-justify leading-relaxed">
            <h3 className="font-bold mb-1">條款及細則 (Terms & Conditions):</h3>
            <ol className="list-decimal pl-4 space-y-1">
              <li>買方已親自驗收上述車輛，並確認車輛之機件性能及外觀狀況良好，同意以「現狀」成交。</li>
              <li>本合約簽署後，如買方悔約或未能於約定日期前付清尾數，賣方有權沒收所有訂金，並有權將車輛轉售予第三者。</li>
              <li>賣方保證上述車輛並無涉及任何未清之財務按揭、罰款或法律訴訟。如有發現，賣方願負全責。</li>
              <li>車輛過戶手續費及保險費由買方負責 (除非另有註明)。</li>
              <li>交車時間：________________________。</li>
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-20 mt-16 text-center">
            <div className="border-t border-black pt-2">
              <p>賣方簽署及公司蓋印</p>
              <p className="text-xs text-gray-500">(For and on behalf of Gold Land Auto)</p>
            </div>
            <div className="border-t border-black pt-2">
              <p>買方簽署</p>
              <p className="text-xs text-gray-500">(Purchaser Signature)</p>
            </div>
          </div>
        </div>
      );
    }

    // 2. 發票
    if (docType === 'invoice') {
      return (
        <div className="max-w-[210mm] mx-auto bg-white p-10 min-h-[297mm] text-black">
          <Header title="發票 (INVOICE)" />
          
          <div className="flex justify-between mb-8 border p-4">
            <div>
              <p className="text-gray-500 text-xs">致 (To):</p>
              <p className="font-bold text-lg">{customer.name}</p>
              <p>{customer.address}</p>
            </div>
            <div className="text-right">
              <p>發票編號: INV-{today.replace(/\//g,'')}-{selectedVehicle.id}</p>
              <p>日期: {today}</p>
            </div>
          </div>

          <VehicleTable />

          <table className="w-full mt-8 border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="text-left p-3">項目說明 (Description)</th>
                <th className="text-right p-3">金額 (Amount)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="p-3">車價 (Vehicle Price) - {selectedVehicle.make} {selectedVehicle.model}</td>
                <td className="p-3 text-right">{formatCurrency(selectedVehicle.price)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-3">政府牌費 (License Fee)</td>
                <td className="p-3 text-right">-</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-3">保險 (Insurance)</td>
                <td className="p-3 text-right">-</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="font-bold text-xl">
                <td className="p-3 text-right">總數 (Total):</td>
                <td className="p-3 text-right border-t-2 border-black">{formatCurrency(selectedVehicle.price)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-16 text-center w-1/2 float-right">
            <div className="border-t border-black pt-2">
              <p>金田汽車貿易公司</p>
              <p className="text-xs">Gold Land Auto Trading Co.</p>
            </div>
          </div>
        </div>
      );
    }

    // 3. 收據
    if (docType === 'receipt') {
      return (
        <div className="max-w-[210mm] mx-auto bg-white p-10 min-h-[148mm] border-b-2 border-dashed text-black">
          <Header title="正式收據 (OFFICIAL RECEIPT)" />
          
          <div className="mb-6 text-sm">
            <p className="mb-2">日期: {today}</p>
            <p className="mb-2">收據編號: RCP-{Date.now().toString().slice(-6)}</p>
            <div className="border-b border-black pb-2 mb-4"></div>
            
            <p className="leading-8 text-lg">
              茲收到 <u>&nbsp; {customer.name} &nbsp;</u> 先生/女士/公司<br/>
              款項港幣 <u>&nbsp; {formatCurrency(deposit)} &nbsp;</u><br/>
              作為購買車輛 <u>&nbsp; {selectedVehicle.regMark} ({selectedVehicle.make}) &nbsp;</u> 之訂金/尾數。<br/>
              付款方式: 現金 / 支票 / 轉數快
            </p>
          </div>

          <div className="mt-12 flex justify-between items-end">
            <div className="text-2xl font-bold border-2 border-black p-2 px-6">
              HK{formatCurrency(deposit)}
            </div>
            <div className="text-center w-64">
              <div className="border-b border-black mb-1"></div>
              <p>收款人簽署 (Receiver Signature)</p>
            </div>
          </div>
        </div>
      );
    }

    // 4. 收車合約
    return (
        <div className="max-w-[210mm] mx-auto bg-white p-10 min-h-[297mm] text-black">
          <Header title="買入車輛合約 (PURCHASE AGREEMENT)" />
          
          <div className="mb-6 bg-gray-50 p-4 border border-gray-300">
             <h3 className="font-bold mb-2">賣方 (前車主) 資料:</h3>
             <p>姓名: {customer.name}</p>
             <p>身份證: {customer.hkid}</p>
             <p>電話: {customer.phone}</p>
          </div>

          <VehicleTable />

          <div className="mb-6">
            <h3 className="font-bold mb-2">交易詳情:</h3>
            <p>本公司 (金田汽車) 同意以港幣 <strong>{formatCurrency(selectedVehicle.price)}</strong> 收購上述車輛。</p>
            <p className="mt-2">交收日期: {today}</p>
          </div>

          <div className="mb-8 text-xs space-y-2">
             <p><strong>賣方聲明：</strong></p>
             <ol className="list-decimal pl-4">
               <li>賣方保證擁有上述車輛之絕對處置權，並無任何隱瞞之財務借貸或按揭。</li>
               <li>賣方保證上述車輛之行車哩數為真實，並無任何非法改裝、積木接駁或嚴重事故紀錄。</li>
               <li>成交日前之所有交通違例罰款及民事責任概由賣方負責。</li>
               <li>賣方需於指定時間內提供所需的過戶文件 (如牌簿、驗車紙)。</li>
             </ol>
          </div>

          <div className="grid grid-cols-2 gap-20 mt-16 text-center">
            <div className="border-t border-black pt-2">
              <p>金田汽車 (買方)</p>
            </div>
            <div className="border-t border-black pt-2">
              <p>前車主 (賣方) 簽署</p>
            </div>
          </div>
        </div>
    );
  };

  // --- 主要渲染邏輯 ---

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 font-sans">
      <Sidebar />

      <main className="flex-1 ml-0 md:ml-64 p-8 print:m-0 print:p-0">
        
        {/* 預覽模式時顯示的控制列 */}
        {isPreviewMode && (
          <div className="fixed top-0 left-0 right-0 bg-slate-800 text-white p-4 flex justify-between items-center z-50 print:hidden">
            <div className="font-bold flex items-center">
              <FileText className="mr-2" /> 
              預覽模式 - {docType === 'sales_contract' ? '買賣合約' : docType === 'invoice' ? '發票' : docType === 'receipt' ? '收據' : '收車合約'}
            </div>
            <div className="space-x-4">
              <button 
                onClick={() => setIsPreviewMode(false)} 
                className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
              >
                返回編輯
              </button>
              <button 
                onClick={handlePrint} 
                className="px-4 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400 flex items-center inline-flex"
              >
                <Printer size={18} className="mr-2" /> 
                立即列印 / 儲存 PDF
              </button>
            </div>
          </div>
        )}

        {/* 預覽區塊 (只在預覽模式或列印時顯示) */}
        <div className={`${isPreviewMode ? 'block mt-16' : 'hidden'} print:block`}>
          <div ref={printAreaRef}>
            <DocumentTemplate />
          </div>
        </div>

        {/* 編輯介面 (列印時隱藏) */}
        <div className={`${isPreviewMode ? 'hidden' : 'block'} print:hidden`}>
          
          {/* 儀表板 Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">業務概況</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500">在庫車輛</p>
                      <p className="text-3xl font-bold">{inventory.filter(v => v.status === 'In Stock').length}</p>
                    </div>
                    <Car className="text-yellow-500 opacity-20" size={40} />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                   <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500">本月銷售</p>
                      <p className="text-3xl font-bold">HK$ {inventory.filter(v => v.status === 'Sold').length * 28000}</p>
                    </div>
                    <DollarSign className="text-green-500 opacity-20" size={40} />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
                   <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500">待辦合約</p>
                      <p className="text-3xl font-bold">2</p>
                    </div>
                    <FileText className="text-blue-500 opacity-20" size={40} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold mb-4">最新庫存</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-3">狀態</th>
                        <th className="pb-3">車牌</th>
                        <th className="pb-3">型號</th>
                        <th className="pb-3">價格</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.slice(0,5).map(car => (
                        <tr key={car.id} className="border-b last:border-0">
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${car.status === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {car.status}
                            </span>
                          </td>
                          <td className="py-3 font-medium">{car.regMark}</td>
                          <td className="py-3">{car.make} {car.model}</td>
                          <td className="py-3">{formatCurrency(car.price)}</td>
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
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">車輛庫存管理</h2>
              </div>
              
              {/* 新增車輛表單 */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold mb-4 flex items-center"><Plus size={18} className="mr-2"/> 新增車輛入庫</h3>
                <form onSubmit={handleAddVehicle} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <input name="regMark" placeholder="車牌 (Reg Mark)" required className="border p-2 rounded" />
                  <input name="make" placeholder="廠名 (e.g. Toyota)" required className="border p-2 rounded" />
                  <input name="model" placeholder="型號 (e.g. Alphard)" required className="border p-2 rounded" />
                  <input name="year" placeholder="年份 (Year)" required className="border p-2 rounded" />
                  <input name="chassisNo" placeholder="底盤號碼 (VIN)" required className="border p-2 rounded" />
                  <input name="engineNo" placeholder="引擎號碼" required className="border p-2 rounded" />
                  <input name="price" type="number" placeholder="定價 (HKD)" required className="border p-2 rounded" />
                  <button type="submit" className="bg-slate-900 text-white p-2 rounded hover:bg-slate-700">確認入庫</button>
                </form>
              </div>

              {/* 庫存列表 */}
              <div className="grid grid-cols-1 gap-4">
                {inventory.map((car) => (
                  <div key={car.id} className="bg-white p-4 rounded-lg shadow-sm flex flex-col md:flex-row justify-between items-center">
                     <div className="flex items-center space-x-4 mb-4 md:mb-0">
                        <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <Car size={24} className="text-gray-500"/>
                        </div>
                        <div>
                          <p className="font-bold text-lg">{car.regMark} <span className="text-sm font-normal text-gray-500">({car.year})</span></p>
                          <p className="text-gray-600">{car.make} {car.model}</p>
                          <p className="text-xs text-gray-400">VIN: {car.chassisNo}</p>
                        </div>
                     </div>
                     <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <p className="font-bold text-xl text-yellow-600">{formatCurrency(car.price)}</p>
                          <span className={`text-xs px-2 py-1 rounded ${car.status === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{car.status}</span>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => {
                              setSelectedVehicle(car);
                              setActiveTab('create_doc');
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="開單"
                          >
                            <FileText size={20} />
                          </button>
                          <button onClick={() => deleteVehicle(car.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="刪除">
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
            <div className="max-w-4xl mx-auto space-y-8">
              <h2 className="text-2xl font-bold mb-6">開立新合約 / 文件</h2>
              
              {/* 步驟 1: 選擇車輛 */}
              <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
                <h3 className="font-bold text-lg mb-4 flex items-center">
                  <span className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm">1</span>
                  選擇交易車輛
                </h3>
                {selectedVehicle ? (
                  <div className="bg-gray-50 p-4 rounded border flex justify-between items-center">
                    <div>
                      <p className="font-bold">{selectedVehicle.regMark} - {selectedVehicle.make} {selectedVehicle.model}</p>
                      <p className="text-sm text-gray-500">HK{formatCurrency(selectedVehicle.price)}</p>
                    </div>
                    <button onClick={() => setSelectedVehicle(null)} className="text-red-500 text-sm hover:underline">重新選擇</button>
                  </div>
                ) : (
                  <div className="text-center p-8 border-2 border-dashed rounded text-gray-500">
                    <p>請先到「車輛庫存」頁面選擇一輛車</p>
                    <button onClick={() => setActiveTab('inventory')} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded">前往選擇</button>
                  </div>
                )}
              </div>

              {/* 步驟 2: 客戶資料 */}
              {selectedVehicle && (
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
                  <h3 className="font-bold text-lg mb-4 flex items-center">
                    <span className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm">2</span>
                    客戶 / 買方資料
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">客戶姓名 (Name)</label>
                      <input 
                        value={customer.name} 
                        onChange={e => setCustomer({...customer, name: e.target.value})}
                        className="mt-1 block w-full border rounded-md shadow-sm p-2"
                        placeholder="陳大文 / ABC Company"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">電話 (Phone)</label>
                      <input 
                         value={customer.phone} 
                         onChange={e => setCustomer({...customer, phone: e.target.value})}
                         className="mt-1 block w-full border rounded-md shadow-sm p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">身份證 / BR 號碼</label>
                      <input 
                         value={customer.hkid} 
                         onChange={e => setCustomer({...customer, hkid: e.target.value})}
                         className="mt-1 block w-full border rounded-md shadow-sm p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">地址 (Address)</label>
                      <input 
                         value={customer.address} 
                         onChange={e => setCustomer({...customer, address: e.target.value})}
                         className="mt-1 block w-full border rounded-md shadow-sm p-2"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 步驟 3: 文件類型與金額 */}
              {selectedVehicle && (
                 <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
                  <h3 className="font-bold text-lg mb-4 flex items-center">
                    <span className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm">3</span>
                    文件詳情
                  </h3>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">選擇文件類型</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <button 
                        onClick={() => setDocType('sales_contract')}
                        className={`p-3 text-sm rounded border ${docType === 'sales_contract' ? 'bg-slate-800 text-white border-slate-800' : 'hover:bg-gray-50'}`}
                      >
                        買賣合約
                      </button>
                      <button 
                        onClick={() => setDocType('purchase_contract')}
                        className={`p-3 text-sm rounded border ${docType === 'purchase_contract' ? 'bg-slate-800 text-white border-slate-800' : 'hover:bg-gray-50'}`}
                      >
                        收車合約
                      </button>
                      <button 
                        onClick={() => setDocType('invoice')}
                        className={`p-3 text-sm rounded border ${docType === 'invoice' ? 'bg-slate-800 text-white border-slate-800' : 'hover:bg-gray-50'}`}
                      >
                        發票 (Invoice)
                      </button>
                      <button 
                        onClick={() => setDocType('receipt')}
                        className={`p-3 text-sm rounded border ${docType === 'receipt' ? 'bg-slate-800 text-white border-slate-800' : 'hover:bg-gray-50'}`}
                      >
                        收據 (Receipt)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">已收訂金 / 款項 (Deposit)</label>
                    <div className="relative mt-1 rounded-md shadow-sm w-1/2">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        value={deposit}
                        onChange={e => setDeposit(Number(e.target.value))}
                        className="block w-full rounded-md border-gray-300 pl-7 p-2 border"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      如果是「收據」，此為收據金額；如果是「合約」，此為已付訂金，系統會自動計算尾數。
                    </p>
                  </div>
                </div>
              )}

              {/* 產生按鈕 */}
              {selectedVehicle && (
                <div className="flex justify-end pt-4">
                  <button 
                    onClick={() => setIsPreviewMode(true)}
                    className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-3 rounded shadow-lg flex items-center font-bold transition transform hover:scale-105"
                  >
                    <FileText className="mr-2" /> 生成預覽 & 列印
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
}