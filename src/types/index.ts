// src/types/index.ts

export type DatabaseAttachment = {
    name: string; // 檔案名稱 (e.g. 身份證正面.jpg)
    data: string; // Base64 string
};

export type DatabaseEntry = {
    id: string;
    managedBy?: string; 
    category: 'Person' | 'Company' | 'Vehicle' | 'CrossBorder'; 
    relatedPlateNo?: string;
    make?: string;              
    model?: string;             
    manufactureYear?: string;   
    vehicleColor?: string;      
    chassisNo?: string;         
    engineNo?: string;          
    engineSize?: number;        
    firstRegCondition?: string; 
    priceA1?: number;           
    priceTax?: number;          
    prevOwners?: number;        
    seating?: number;           
    registeredOwnerName?: string; 
    registeredOwnerId?: string;   
    registeredOwnerDate?: string;
    roles?: string[]; 
    name: string; 
    phone?: string; 
    address?: string; 
    idNumber?: string; 
    plateNoHK?: string; 
    plateNoCN?: string; 
    quotaNo?: string; 
    receiptNo?: string; 
    docType?: string; 
    description: string; 
    attachments: DatabaseAttachment[]; 
    tags: string[]; 
    hkid_name?: string;       
    hkid_code?: string;       
    hkid_dob?: string;        
    hkid_issueDate?: string;  
    hrp_nameCN?: string;      
    hrp_expiry?: string;      
    hrp_num?: string;         
    hkdl_num?: string;        
    hkdl_validTo?: string;    
    hkdl_ref?: string;        
    cndl_num?: string;        
    cndl_address?: string;    
    cndl_firstIssue?: string; 
    cndl_validPeriod?: string;
    cndl_issueLoc?: string;   
    cndl_fileNum?: string;    
    createdAt: any;
    updatedAt?: any;
    reminderEnabled?: boolean;      
    expiryDate?: string;            
    renewalCount?: number;          
    renewalDuration?: number;       
    renewalUnit?: 'year' | 'month'; 
    customReminders?: any[];
    extractedData?: any;
    isPublic?: boolean;
};

export type MediaLibraryItem = {
    id: string;
    url: string;        
    path: string;       
    fileName: string;
    tags: string[];     
    status: 'unassigned' | 'linked'; 
    relatedVehicleId?: string;
    createdAt: any;
    isPrimary?: boolean;
    uploadedBy?: string;
    aiData?: {
        make?: string;
        model?: string;
        year?: string;
        color?: string;
        type?: string;
    };
    mediaType?: 'vehicle' | 'document';
};

export type Expense = {
  id: string;
  type: string; 
  company: string; 
  amount: number;
  description: string;
  status: 'Paid' | 'Unpaid';
  paymentMethod: 'Cash' | 'Cheque' | 'Offset' | 'Transfer';
  date: string;
  invoiceNo?: string;
};

export type Payment = {
  id: string;
  date: string;
  type: 'Deposit' | 'Part Payment' | 'Balance' | 'Full Payment' | 'Service Fee'; 
  amount: number;
  method: 'Cash' | 'Cheque' | 'Transfer';
  note?: string; 
  relatedTaskId?: string; 
  isCbFee?: boolean; 
};

export type CrossBorderTask = {
    id: string;
    date: string; 
    item: string; 
    institution: string; 
    handler: string; 
    days: string; 
    fee: number; 
    currency: 'HKD' | 'RMB'; 
    note: string; 
    isPaid: boolean; 
};

export type DocCustodyLog = {
    id: string;
    docName: string;      
    action: 'CheckIn' | 'CheckOut'; 
    direction: string;    
    handler: string;      
    timestamp: string;    
    photoUrl?: string;    
    note?: string;        
};

export type CrossBorderData = {
    isEnabled: boolean; 
    mainlandPlate?: string; 
    driver1?: string; 
    driver2?: string; 
    driver3?: string; 
    insuranceAgent?: string; 
    quotaNumber?: string; 
    ports?: string[]; 
    hkCompany?: string;       
    mainlandCompany?: string; 
    dateHkInsurance?: string; 
    dateReservedPlate?: string; 
    dateBr?: string; 
    dateLicenseFee?: string; 
    dateMainlandJqx?: string; 
    dateMainlandSyx?: string; 
    dateClosedRoad?: string; 
    dateApproval?: string; 
    dateMainlandLicense?: string; 
    dateHkInspection?: string; 
    cb_remind_HkInsurance?: boolean;
    cb_remind_ReservedPlate?: boolean;
    cb_remind_Br?: boolean;
    cb_remind_LicenseFee?: boolean;
    cb_remind_MainlandJqx?: boolean;
    cb_remind_MainlandSyx?: boolean;
    cb_remind_ClosedRoad?: boolean;
    cb_remind_Approval?: boolean;
    cb_remind_MainlandLicense?: boolean;
    cb_remind_HkInspection?: boolean;
    documentLogs?: DocCustodyLog[]; 
    tasks?: CrossBorderTask[];
};

export type Vehicle = {
  id: string;
  managedBy?: string; 
  isPublic?: boolean;
  sourceType?: 'own' | 'consignment' | 'partner';
  partnerName?: string;
  regMark: string;
  make: string;
  model: string;
  year: string;
  chassisNo: string;
  engineNo: string;
  purchaseType: 'Used' | 'New' | 'Consignment'; 
  colorExt: string; 
  colorInt: string; 
  licenseExpiry: string;
  registeredOwnerDate?: string;
  transmission?: 'Automatic' | 'Manual';
  photos?: string[];
  previousOwners?: string; 
  mileage?: number;      
  remarks?: string;
  seating?: number; 
  priceA1?: number; 
  priceTax?: number; 
  priceRegistered?: number; 
  fuelType?: 'Petrol' | 'Diesel' | 'Electric';
  engineSize?: number; 
  licenseFee?: number; 
  price: number; 
  costPrice?: number; 
  status: 'In Stock' | 'Sold' | 'Reserved' | 'Withdrawn';
  stockInDate?: string; 
  stockOutDate?: string; 
  expenses: Expense[]; 
  customerName?: string;
  customerPhone?: string;
  customerID?: string; 
  customerAddress?: string;
  payments?: Payment[]; 
  salesAddons?: any[];
  soldDate?: any;
  soldPrice?: number;
  deposit?: number;
  warrantyType?: string;           
  insuranceExpiry?: string;        
  insuranceReminderEnabled?: boolean; 
  maintenanceRecords?: any[];      
  crossBorder?: CrossBorderData;
  acquisition?: any;
  createdAt?: any;
  updatedAt?: any;
  activeWorkflow?: {
      type: string;        
      currentStep: number; 
      startDate: string;   
      logs: {              
          id: string;
          action: string;
          stage: string;
          details: string;
          timestamp: string;
          attachments: string[];
          user: string;
      }[];
  };
};

export type SystemSettings = {
  makes: string[];
  models: Record<string, string[]>; 
  codes?: Record<string, string[]>; 
  interiorColors?: string[];
  expenseTypes: (string | { name: string; defaultCompany: string; defaultAmount: number; defaultDays: string })[];
  expenseCompanies: string[];
  paymentTypes: string[]; 
  colors: string[];
  warrantyTypes?: string[];
  serviceItems?: string[];
  partners?: string[];
  cbItems: (string | { name: string; defaultInst: string; defaultFee: number; defaultDays: string })[];
  cbInstitutions: string[];
  dbCategories: string[];
  dbRoles: string[]; 
  dbDocTypes: Record<string, string[]>;
  reminders?: {
      isEnabled: boolean;          
      daysBefore: number;          
      time: string;                
      categories: { license: boolean; insurance: boolean; crossBorder: boolean; installments: boolean; };
  };
  backup?: { frequency: 'manual' | 'daily' | 'weekly' | 'monthly'; lastBackupDate: string; autoCloud: boolean; };
  pushConfig?: { isEnabled: boolean; vapidKey: string; events: { newCar: boolean; sold: boolean; expiry: boolean; workflow: boolean; }; };
};

export type Customer = {
  name: string;
  phone: string;
  hkid: string;
  address: string;
};

export type DocType = 'sales_contract' | 'purchase_contract' | 'consignment_contract' | 'quotation' | 'invoice' | 'receipt';
