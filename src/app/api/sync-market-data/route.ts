// src/app/api/sync-market-data/route.ts
import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// ★ Vercel 免費版最高限制 10-15 秒
export const maxDuration = 10; 

// Firebase 初始化設定 (請確認與您其他檔案一致)
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

export async function GET(request: Request) {
    try {
        // 1. 呼叫香港政府「資料一線通」的 API (這是一個開放數據的範例端點)
        // 實際開發時，您可以在 data.gov.hk 搜尋 "首次登記車輛" 並獲取最新的 JSON/CSV API 連結
        // 這裡我們先用一個模擬的政府 API 結構來為您做處理邏輯示範
        const govApiUrl = "https://data.gov.hk/api/3/action/datastore_search?resource_id=YOUR_RESOURCE_ID"; // ★ 請替換為真實的 Resource ID
        
        // 假設我們抓到了當月的資料 (通常政府 API 會回傳一包 JSON)
        // const response = await fetch(govApiUrl);
        // const data = await response.json();
        
        // ==========================================
        // ★ 模擬數據清洗過程 (過濾出私家車 Private Car)
        // ==========================================
        // 假設清洗後的當月私家車首次登記量是 3,450 台，其中電動車 2,100 台
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1; // 1-12
        const documentId = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`; // 例如 "2026-05"

        const processedData = {
            yearMonth: documentId,
            vehicleClass: "Private Car", // 私家車
            totalFirstRegistration: 3450, // 總出牌量 (從政府 API 算出來的)
            evCount: 2100,                // 電動車出牌量 (如果政府數據有提供燃油/純電分類)
            petrolCount: 1350,            // 燃油車出牌量
            source: "DATA.GOV.HK 運輸署",
            updatedAt: serverTimestamp(),
        };

        // 2. 將清洗好的乾淨數據，寫入您的 Firebase 數據庫
        // 這裡我們建一個新的集合叫做 'market_statistics'
        await setDoc(doc(db, 'artifacts', 'gold-land-auto', 'market_statistics', documentId), processedData, { merge: true });

        return NextResponse.json({ 
            success: true, 
            message: `成功同步 ${documentId} 香港私家車出牌數據`,
            data: processedData 
        });

    } catch (error: any) {
        console.error("同步市場數據失敗:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
