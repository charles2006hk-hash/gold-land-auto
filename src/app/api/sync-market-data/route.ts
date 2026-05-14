// src/app/api/sync-market-data/route.ts
import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
// ★ 引入 doc, getDoc, setDoc 來做精準比對和覆寫
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore/lite';
import { getAuth, signInAnonymously } from 'firebase/auth';

export const maxDuration = 15; 
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
    console.log("========== 開始抓取香港政府真實車市數據 (智慧比對版) ==========");
    try {
        if (!auth.currentUser) {
            await signInAnonymously(auth);
        }

        console.log("[步驟 1] 正在向 DATA.GOV.HK 請求最新 CSV 數據...");
        const govCsvUrl = "https://www.td.gov.hk/datagovhk_tis/mttd-csv/en/table41e_eng.csv";
        
        const response = await fetch(govCsvUrl);
        if (!response.ok) throw new Error("政府數據網站連線失敗");
        
        const csvText = await response.text();
        const lines = csvText.split('\n');

        console.log(`[步驟 2] 成功下載！共取得 ${lines.length} 行數據，開始解析...`);

        let evCount = 0;
        let petrolCount = 0;
        let totalCount = 0;
        let usedImportCount = 0; 

        for (let i = 5; i < lines.length; i++) {
            const row = lines[i].toLowerCase();
            if (!row || row.trim() === '') continue;

            if (row.includes('electric')) evCount++;
            if (row.includes('petrol')) petrolCount++;
            if (row.includes('used')) usedImportCount++; 
            totalCount++;
        }

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        
        // ★ 核心升級 1：綁定一個固定的檔案 ID (例如: market_stats_2026_05)
        const documentId = `market_stats_${currentYear}_${currentMonth.toString().padStart(2, '0')}`;
        const docRef = doc(db, 'artifacts', 'gold-land-auto', 'staff', 'CHARLES_data', 'database', documentId);

        console.log(`[步驟 3] 檢查資料庫是否已有相同數據 (${documentId})...`);
        const docSnap = await getDoc(docRef);

        // ★ 核心升級 2：智慧比對邏輯
        if (docSnap.exists()) {
            const existingData = docSnap.data();
            // 如果資料庫裡的「總車數」跟我們剛剛算出來的一模一樣，代表政府沒更新，我們也不用更新！
            if (existingData.analysis && existingData.analysis.totalRowsProcessed === totalCount) {
                console.log("👉 數據完全相同，跳過寫入，節省資源！");
                return NextResponse.json({ 
                    success: true, 
                    message: "資料庫已是最新狀態，無需重複寫入！", 
                    data: existingData 
                });
            }
        }

        console.log("[步驟 4] 發現新數據！準備寫入資料庫...");
        const processedData = {
            category: "Other",          
            docType: "市場大數據",       
            name: `${currentYear}年${currentMonth}月 香港私家車首次登記分析`, 
            analysis: {
                totalRowsProcessed: totalCount,
                electricVehicles: evCount,
                petrolVehicles: petrolCount,
                importedUsedCars: usedImportCount
            },
            rawDataUrl: govCsvUrl, 
            source: "DATA.GOV.HK 運輸署 表4.1e",
            updatedAt: serverTimestamp(),
            // 如果原本沒有這個檔案才押上創建時間
            ...(docSnap.exists() ? {} : { createdAt: serverTimestamp() }),
            managedBy: "System_Auto_Bot"          
        };

        // 用 setDoc (有就覆寫更新，沒有就建立) 取代 addDoc
        await setDoc(docRef, processedData, { merge: true });
        
        console.log("[步驟 5] 真實數據寫入/更新大成功！");

        return NextResponse.json({ 
            success: true, 
            message: docSnap.exists() ? "發現數據變動，已成功更新！" : "全新月份數據，已成功建立！", 
            data: processedData 
        });

    } catch (error: any) {
        console.error("[發生錯誤]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
