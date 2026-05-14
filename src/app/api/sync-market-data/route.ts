// src/app/api/sync-market-data/route.ts
import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore/lite';
import { getAuth, signInAnonymously } from 'firebase/auth';

export const maxDuration = 15; // 稍微拉長一點，給政府網站下載 CSV 的時間
export const dynamic = 'force-dynamic'; 

const firebaseConfig = {
  apiKey: "AIzaSyCHt7PNXd5NNh8AsdSMDzNfbvhyEsBG2YY",
  authDomain: "gold-land-auto.firebaseapp.com",
  projectId: "gold-land-auto",
  storageBucket: "gold-land-auto.firebasestorage.app",
  messagingSenderId: "817229766566",
  appId: "1:817229766566:web:73314925fe0a4d43917967"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export async function GET(request: Request) {
    console.log("========== 開始抓取香港政府真實車市數據 ==========");
    try {
        if (!auth.currentUser) {
            await signInAnonymously(auth);
        }

        console.log("[步驟 1] 正在向 DATA.GOV.HK 請求最新 CSV 數據...");
        
        // ★ 核心升級：直接對接運輸署《表4.1e: 私家車首次登記統計數字》的官方英文版 CSV
        // (使用英文版可以避免中文 Big5/UTF8 編碼亂碼的問題)
        const govCsvUrl = "https://www.td.gov.hk/datagovhk_tis/mttd-csv/en/table41e_eng.csv";
        
        const response = await fetch(govCsvUrl);
        if (!response.ok) throw new Error("政府數據網站連線失敗");
        
        const csvText = await response.text();
        const lines = csvText.split('\n');

        console.log(`[步驟 2] 成功下載！共取得 ${lines.length} 行數據，開始解析...`);

        // ==========================================
        // ★ 輕量級數據分析 (計算電動車、燃油車、總數)
        // ==========================================
        let evCount = 0;
        let petrolCount = 0;
        let totalCount = 0;
        let usedImportCount = 0; // 二手進口水貨車

        // 簡單遍歷 CSV 內容 (跳過標題列)
        for (let i = 5; i < lines.length; i++) {
            const row = lines[i].toLowerCase();
            if (!row || row.trim() === '') continue;

            // 如果該行包含數字，我們簡單做個關鍵字過濾統計
            // (實際欄位根據 TD CSV 格式可再做更精細的 split(',') 陣列切割)
            if (row.includes('electric')) evCount++;
            if (row.includes('petrol')) petrolCount++;
            if (row.includes('used')) usedImportCount++; // 首次登記時的狀態為 Used
            totalCount++;
        }

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        console.log("[步驟 3] 準備寫入資料庫...");
        const processedData = {
            category: "Other",          
            docType: "市場大數據",       
            name: `${currentYear}年${currentMonth}月 香港私家車首次登記分析`, 
            
            // 寫入真實解析出來的數據
            analysis: {
                totalRowsProcessed: totalCount,
                electricVehicles: evCount,
                petrolVehicles: petrolCount,
                importedUsedCars: usedImportCount // 對車行非常有用的水貨車指標
            },
            
            rawDataUrl: govCsvUrl, // 保留原始檔案網址，未來可以在網頁端直接下載
            source: "DATA.GOV.HK 運輸署 表4.1e",
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            managedBy: "System_Auto_Bot" // 標示為系統機器人自動抓取           
        };

        const colRef = collection(db, 'artifacts', 'gold-land-auto', 'staff', 'CHARLES_data', 'database');
        const docRef = await addDoc(colRef, processedData);
        
        console.log("[步驟 4] 真實數據寫入大成功！");

        return NextResponse.json({ 
            success: true, 
            message: "真實政府數據同步成功！", 
            data: processedData 
        });

    } catch (error: any) {
        console.error("[發生錯誤]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
