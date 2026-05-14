// src/app/api/sync-market-data/route.ts
import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore/lite';
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
    console.log("========== 開始抓取香港政府真實車市數據 (精準解析版) ==========");
    try {
        if (!auth.currentUser) await signInAnonymously(auth);

        const govCsvUrl = "https://www.td.gov.hk/datagovhk_tis/mttd-csv/en/table41e_eng.csv";
        const response = await fetch(govCsvUrl);
        if (!response.ok) throw new Error("政府數據網站連線失敗");
        
        const csvText = await response.text();
        const lines = csvText.split('\n');

        const brandData: { [key: string]: any } = {};
        let latestYearMonth = "";
        const validRows: any[] = [];

        // ==========================================
        // ★ 階段一：清洗雙引號，對齊欄位，找出「最新月份」
        // ==========================================
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // 清除所有的雙引號，然後用逗號分割
            const cols = line.split(',').map(c => c.replace(/['"]/g, '').trim());
            
            // 政府標準格式：[0]年月, [1]品牌, [2]新舊, [3]燃料, [4]車型, [5]數量
            if (cols.length < 6) continue;

            const yearMonth = cols[0]; 
            // 確保這是一行有效的數據 (例如 2026/04 或 202604)
            if (yearMonth.match(/^\d{4}\/?\d{2}$/)) {
                // 記錄 CSV 檔案中最新的一個月
                if (yearMonth > latestYearMonth) latestYearMonth = yearMonth;
                
                validRows.push({
                    yearMonth,
                    make: cols[1].toUpperCase(),
                    status: cols[2].toLowerCase(),
                    fuelType: cols[3].toLowerCase(),
                    count: parseInt(cols[5]) || 0 // 第 6 欄才是數量
                });
            }
        }

        // ==========================================
        // ★ 階段二：只過濾並加總「最新月份」的數據
        // ==========================================
        let evCount = 0, petrolCount = 0, totalCount = 0, usedImportCount = 0;

        validRows.forEach(row => {
            // 剔除舊月份與雜訊
            if (row.yearMonth !== latestYearMonth) return;
            if (!row.make || row.make === 'TOTAL' || row.make === 'MAKE') return;

            if (!brandData[row.make]) {
                brandData[row.make] = { total: 0, new: 0, used: 0, ev: 0 };
            }

            // 加總各項數據
            brandData[row.make].total += row.count;
            totalCount += row.count;

            if (row.status.includes('new')) brandData[row.make].new += row.count;
            if (row.status.includes('used')) {
                brandData[row.make].used += row.count;
                usedImportCount += row.count; // 計算水貨二手車
            }
            if (row.fuelType.includes('electric')) {
                brandData[row.make].ev += row.count;
                evCount += row.count;
            } else if (row.fuelType.includes('petrol') || row.fuelType.includes('diesel')) {
                petrolCount += row.count;
            }
        });

        // ==========================================
        // ★ 階段三：寫入資料庫覆蓋舊檔案
        // ==========================================
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const documentId = `market_stats_${currentYear}_${currentMonth.toString().padStart(2, '0')}`;
        const docRef = doc(db, 'artifacts', 'gold-land-auto', 'staff', 'CHARLES_data', 'database', documentId);

        const processedData = {
            category: "Other",          
            docType: "市場大數據",       
            name: `${latestYearMonth} 香港私家車首次登記分析 (政府出牌數據)`, 
            analysis: {
                totalRowsProcessed: totalCount,
                electricVehicles: evCount,
                petrolVehicles: petrolCount,
                importedUsedCars: usedImportCount
            },
            brands: brandData,
            rawDataUrl: govCsvUrl, 
            source: "DATA.GOV.HK 運輸署 表4.1e",
            updatedAt: serverTimestamp(),
            managedBy: "System_Auto_Bot"          
        };

        await setDoc(docRef, processedData, { merge: true });
        
        return NextResponse.json({ success: true, message: "解析成功", data: processedData });

    } catch (error: any) {
        console.error("[發生錯誤]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
