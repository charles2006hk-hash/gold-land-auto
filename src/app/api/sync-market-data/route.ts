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
    console.log("========== 開始抓取香港政府真實車市數據 (防彈解析版) ==========");
    try {
        if (!auth.currentUser) await signInAnonymously(auth);

        const govCsvUrl = "https://www.td.gov.hk/datagovhk_tis/mttd-csv/en/table41e_eng.csv";
        const response = await fetch(govCsvUrl);
        if (!response.ok) throw new Error("政府數據網站連線失敗");
        
        const csvText = await response.text();
        const lines = csvText.split(/\r?\n/);

        const brandData: { [key: string]: any } = {};
        let latestYearMonth = "";
        const validRows: any[] = [];

        // ==========================================
        // ★ 核心修復 1：防彈級 CSV 分割與動態欄位定位
        // ==========================================
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // 1. 完美分割 CSV (忽略雙引號內的逗號)
            let cols = [];
            let inQuotes = false;
            let current = "";
            for (let char of line) {
                if (char === '"') inQuotes = !inQuotes;
                else if (char === ',' && !inQuotes) { cols.push(current.trim()); current = ""; }
                else current += char;
            }
            cols.push(current.trim());
            // 移除外層引號
            cols = cols.map(c => c.replace(/^"|"$/g, '').trim());

            // 2. 動態尋找「年月」的欄位 (例如: 202605 或 2026/05)
            const ymIdx = cols.findIndex(c => /^\d{4}[\/\-]?\d{2}$/.test(c));
            
            // 如果找到了年月，且後面還有足夠的欄位 (廠牌, 狀態, 燃料, 數量)
            if (ymIdx !== -1 && cols.length > ymIdx + 3) {
                const yearMonth = cols[ymIdx].replace(/[\/\-]/g, ''); // 統一格式 202605
                if (yearMonth > latestYearMonth) latestYearMonth = yearMonth;

                // 3. 從最後面倒找「數量」欄位 (因為車型可能有幾個字)
                let count = 0;
                for (let j = cols.length - 1; j > ymIdx + 3; j--) {
                    if (/^\d+$/.test(cols[j])) {
                        count = parseInt(cols[j], 10);
                        break;
                    }
                }

                validRows.push({
                    yearMonth,
                    make: cols[ymIdx + 1].toUpperCase(),
                    status: cols[ymIdx + 2].toLowerCase(),
                    fuelType: cols[ymIdx + 3].toLowerCase(),
                    count: count
                });
            }
        }

        // ==========================================
        // ★ 核心修復 2：只處理最新月份
        // ==========================================
        let evCount = 0, petrolCount = 0, totalCount = 0, usedImportCount = 0;

        validRows.forEach(row => {
            if (row.yearMonth !== latestYearMonth) return;
            if (!row.make || row.make === 'TOTAL' || row.make === 'MAKE') return;

            if (!brandData[row.make]) {
                brandData[row.make] = { total: 0, new: 0, used: 0, ev: 0 };
            }

            brandData[row.make].total += row.count;
            totalCount += row.count;

            if (row.status.includes('new')) brandData[row.make].new += row.count;
            if (row.status.includes('used') || row.status.includes('unregistered')) {
                brandData[row.make].used += row.count;
                usedImportCount += row.count; 
            }
            if (row.fuelType.includes('electric')) {
                brandData[row.make].ev += row.count;
                evCount += row.count;
            } else {
                petrolCount += row.count;
            }
        });

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
