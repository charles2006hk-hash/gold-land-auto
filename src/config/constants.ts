// src/config/constants.ts
import { SystemSettings } from '@/types';

// --- 公司資料 ---
export const COMPANY_INFO = {
  name_en: "GOLD LAND AUTO",
  name_ch: "金田汽車",
  address_en: "Rm 11, 22/F, Blk B, New Trade Plaza, 6 On Ping St, Shek Mun, Shatin, N.T., HK",
  address_ch: "香港沙田石門安平街6號新貿中心B座22樓11室",
  phone: "+852 3996 9796",
  email: "marketing@goldlandhk.com",
  logo_url: "/GL_APPLOGO.png" 
};

// --- 預設系統設定 ---
export const DEFAULT_SETTINGS: SystemSettings = {
  makes: ['Toyota', 'Honda', 'Mercedes-Benz', 'BMW', 'Tesla', 'Porsche', 'Audi', 'Lexus', 'Mazda', 'Nissan'],
  models: {
    'Toyota': ['Alphard 2.5', 'Alphard 3.5', 'Vellfire 2.5', 'Vellfire 3.5', 'Noah', 'Sienta', 'Hiace', 'Camry'],
    'Honda': ['Stepwgn 1.5', 'Stepwgn 2.0', 'Freed', 'Jazz', 'Odyssey', 'Civic'],
    'Mercedes-Benz': ['A200', 'C200', 'E200', 'E300', 'S500', 'G63', 'GLC 300'],
    'BMW': ['320i', '520i', 'X3', 'X5', 'iX', 'i4'],
    'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X'],
    'Porsche': ['911', 'Cayenne', 'Macan', 'Taycan', 'Panamera'],
    'Audi': ['A3', 'A4', 'Q3', 'Q5', 'Q7']
  },
  codes: {
      'Alphard 2.5': ['AGH30', 'AYH30', 'AGH40'],
      'Vellfire 2.5': ['AGH30', 'TAHA40'],
      'Stepwgn 1.5': ['RP3', 'RP4', 'RP8']
  },
  colors: ['白 (White)', '黑 (Black)', '銀 (Silver)', '灰 (Grey)', '藍 (Blue)', '紅 (Red)', '金 (Gold)', '綠 (Green)'],
  interiorColors: ['黑 (Black)', '米 (Beige)', '灰 (Grey)', '紅 (Red)', '棕 (Brown)', '白 (White)'], 
  paymentTypes: ['訂金 (Deposit)', '大訂 (Part Payment)', '尾數 (Balance)', '全數 (Full Payment)', '服務費 (Service Fee)', '代支 (Advance)'],
  expenseTypes: [
      { name: '政府牌費', defaultCompany: '香港運輸署', defaultAmount: 5860, defaultDays: '0' },
      { name: '驗車費', defaultCompany: '指定驗車中心', defaultAmount: 800, defaultDays: '0' },
      { name: '車輛維修', defaultCompany: '金田維修部', defaultAmount: 0, defaultDays: '7' },
      { name: '保險', defaultCompany: '友邦保險', defaultAmount: 0, defaultDays: '3' },
      '噴油', '執車(Detailing)', '拖車費', '佣金', '中港牌批文費', '內地保險', '其他'
  ],
  expenseCompanies: ['金田維修部', 'ABC車房', '政府牌照局', '友邦保險', '自家', '中檢公司'], 
  partners: [],
  warrantyTypes: ['5年/10萬公里 (原廠全車)','8年/16萬公里 高壓電池 (原廠 EV)','3年/15萬公里 (寶馬原廠)','2年不限里程 (平治/保時捷原廠)','10年/25萬公里 高壓電池 (平治 EQE/EQS)','4年/8萬公里 (Tesla 原廠)','8年/19.2萬公里 高壓電池 (Tesla LR/Perf)','電池終身保養 (BYD 原廠)','不設保養 (No Warranty)'],
  serviceItems: ['代辦驗車', '代辦保險', '申請禁區紙', '批文延期', '更換司機', '代辦免檢', '海關年檢', '其他服務'],
  cbItems: [
      { name: '批文延期', defaultInst: '廣東省公安廳', defaultFee: 500, defaultDays: '10' },
      { name: '禁區紙續期', defaultInst: '香港運輸署', defaultFee: 540, defaultDays: '5' },
      { name: '內地驗車', defaultInst: '中國檢驗有限公司', defaultFee: 800, defaultDays: '1' },
      { name: '海關年檢', defaultInst: '梅林海關', defaultFee: 0, defaultDays: '1' },
      { name: '封關/解封', defaultInst: '深圳灣口岸', defaultFee: 0, defaultDays: '1' },
      { name: '換司機', defaultInst: '廣東省公安廳', defaultFee: 1000, defaultDays: '14' }
  ],
  cbInstitutions: ['廣東省公安廳', '香港運輸署', '中國檢驗有限公司', '梅林海關', '深圳灣口岸', '港珠澳大橋口岸'],
  dbCategories: ['一般客戶', '中港司機', '公司客戶', '車輛文件', '保險文件', '其他'],
  dbRoles: ['客戶', '員工', '司機', '代辦'],
  dbDocTypes: { 'Person': ['香港身份證', '回鄉證', '護照', '通行證', '地址證明', '香港電子認證', '香港駕照', '國內駕照', '海外駕照', '其他'], 'Company': ['商業登記(BR)', '註冊證書(CI)', 'NAR1', '週年申報表', '營業執照', '工商年報', '其他'], 'Vehicle': ['牌薄(VRD)', '香港保險', '澳門保險', '國內交強保', '國內商業險', '國內關稅險', '其他'], 'CrossBorder': ['批文卡', '新辦回執', '換車回執', '司機更換回執', '中檢資料', '其他'] },
  reminders: { isEnabled: true, daysBefore: 30, time: '10:00', categories: { license: true, insurance: true, crossBorder: true, installments: false } },
  backup: { frequency: 'monthly', lastBackupDate: '', autoCloud: true },
  pushConfig: { isEnabled: false, vapidKey: 'BIpAVoyM6C6CodEmmKnsykyuQkX0g0VBBXDUWikIRhKtnCVUVCuO86EqlEgf5zuxz8nGA3DCdbEr1yKynCXFJKA', events: { newCar: true, sold: true, expiry: true, workflow: true } }
};

// --- 業務流程範本定義 (Workflow Templates) ---
export const WORKFLOW_TEMPLATES = {
    'HK_NORTH': { 
        name: '港車北上 (New Application)', 
        color: 'bg-blue-600',
        steps: [
            { name: '官網抽籤', url: 'https://www.hzmbqfs.gov.hk/', fields: ['regMark', 'chassisNo'] },
            { name: '預約驗車 (中檢)', url: 'https://www.cic.com.hk/', fields: ['regMark', 'chassisNo', 'engineNo'] },
            { name: '內地系統備案', url: 'https://gcbs.gdzwfw.gov.cn/', fields: ['regMark', 'driver1'] }, 
            { name: '購買內地保險', url: '', fields: [] },
            { name: '上傳驗車報告', url: 'https://gcbs.gdzwfw.gov.cn/', fields: [] },
            { name: '獲取電子牌證', url: '', fields: [] }
        ]
    },
    'Z_LICENSE_NEW': { 
        name: '粵Z新辦 (New License)', 
        color: 'bg-purple-600',
        steps: [
            { name: '省廳批文申請', url: 'http://gdga.gd.gov.cn/', fields: ['hkCompany', 'mainlandCompany'] },
            { name: '商務廳核准', url: '', fields: [] },
            { name: '海關備案', url: 'https://www.singlewindow.cn/', fields: ['chassisNo', 'colorExt'] },
            { name: '司機體檢', url: '', fields: ['driver1'] },
            { name: '驗車 (中檢)', url: 'https://www.cic.com.hk/', fields: ['regMark'] },
            { name: '領取行駛證', url: '', fields: [] }
        ]
    },
    'DRIVER_CHANGE': {
        name: '更換司機 (Change Driver)',
        color: 'bg-orange-500',
        steps: [
            { name: '省廳批文變更', url: 'http://gdga.gd.gov.cn/', fields: ['hkCompany', 'driver1'] },
            { name: '海關變更', url: 'https://www.singlewindow.cn/', fields: [] },
            { name: '預約禁區紙', url: 'https://www.td.gov.hk/', fields: ['regMark'] }
        ]
    }
};

// --- 口岸與分類定義 ---
export const PORTS_HK_GD = ['皇崗', '深圳灣', '蓮塘', '沙頭角', '文錦渡', '港珠澳大橋(港)'];
export const PORTS_MO_GD = ['港珠澳大橋(澳)', '關閘(拱北)', '橫琴', '青茂'];
export const ALL_CB_PORTS = [...PORTS_HK_GD, ...PORTS_MO_GD];
export const AVAILABLE_PORTS = ['皇崗', '深圳灣', '蓮塘', '沙頭角', '文錦渡', '大橋'];

export const DB_CATEGORIES = [
    { id: 'Person', label: '人員 / 身份資料 (Person)' },
    { id: 'Company', label: '公司資料 (Company)' },
    { id: 'Vehicle', label: '車輛文件 (Vehicle Doc)' },
    { id: 'CrossBorder', label: '中港指標文件 (Quota Doc)' }
];

export const DOCUMENT_FIELD_SCHEMA: Record<string, { key: string, label: string, type: string }[]> = {
    '香港保險': [
        { key: 'insuranceCompany', label: '保險公司', type: 'text' },
        { key: 'policyNumber', label: '保單/暫保單號碼', type: 'text' },
        { key: 'insuranceType', label: '保險類型', type: 'text' }, 
        { key: 'insuredPerson', label: '受保人', type: 'text' }
    ],
    '商業登記(BR)': [
        { key: 'brNumber', label: 'BR 號碼', type: 'text' },
        { key: 'brExpiryDate', label: '屆滿日期', type: 'date' }
    ],
};
