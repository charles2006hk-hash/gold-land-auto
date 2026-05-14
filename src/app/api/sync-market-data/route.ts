// src/app/api/sync-market-data/route.ts
import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
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
    console.log("========== 開始抓取香港政府【車型細節】大數據 ==========");
    try {
        if (!auth.currentUser) await signInAnonymously(auth);

        // 1. 透過政府 CKAN API 動態尋找「最新月份」的車輛細節 CSV 網址
        const ckanUrl = 'https://data.gov.hk/api/3/action/package_show?id=hk-td-wcms_11-first-reg-vehicle';
        const pkgRes = await fetch(ckanUrl);
        const pkgData = await pkgRes.json();
        
        // 篩選出英文版的 CSV (格式最穩定)
        const resources = pkgData.result.resources.filter((r: any) => 
            r.format.toLowerCase() === 'csv' && r.name.toLowerCase().includes('english')
        );
        // 按發布日期排序，拿最新的一個月
        resources.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());
        
        const latestResource = resources[0];
        const csvUrl = latestResource.url;
        
        // 解析標題找出月份，例如 "Particulars of first registered vehicles(English) - Mar 2026"
        const titleMatch = latestResource.name.match(/- ([A-Za-z]+ \d{4})/);
        const reportMonth = titleMatch ? titleMatch[1] : "最新月份";
        const documentId = `market_models_${reportMonth.replace(' ', '_')}`;

        // 2. 檢查資料庫是否已抓過這個月
        const docRef = doc(db, 'artifacts', 'gold-land-auto', 'staff', 'CHARLES_data', 'database', documentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return NextResponse.json({ success: true, message: `資料庫已有 ${reportMonth} 數據`, data: docSnap.data() });
        }

        console.log(`[下載中] 正在抓取 ${reportMonth} 的明細數據...`);
        
        // 3. 下載並逐行解析數千筆的車輛明細 CSV
        const csvRes = await fetch(csvUrl);
        const csvText = await csvRes.text();
        const lines = csvText.split(/\r?\n/);
        
        // 自動定位欄位索引
        const headers = lines[0].toLowerCase().split(',').map(h => h.replace(/"/g, '').trim());
        const classIdx = headers.findIndex(h => h.includes('class'));
        const makeIdx = headers.findIndex(h => h.includes('make'));
        const modelIdx = headers.findIndex(h => h.includes('model'));
        const statusIdx = headers.findIndex(h => h.includes('status')); // 狀態 (A=新, C2=舊)
        const fuelIdx = headers.findIndex(h => h.includes('fuel'));

        const modelsData: Record<string, any> = {};
        let totalCount = 0;

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            // 安全分割 CSV
            const cols = [];
            let inQuotes = false;
            let current = "";
            for (let char of lines[i]) {
                if (char === '"') inQuotes = !inQuotes;
                else if (char === ',' && !inQuotes) { cols.push(current.trim().replace(/^"|"$/g, '')); current = ""; }
                else current += char;
            }
            cols.push(current.trim().replace(/^"|"$/g, ''));

            // ★ 只挑選「私家車 Private Car」
            if (cols[classIdx]?.toLowerCase() !== 'private car') continue;

            const make = cols[makeIdx]?.toUpperCase();
            const model = cols[modelIdx]?.toUpperCase();
            if (!make || !model) continue;

            // 清理車型名稱中的多餘空格
            const cleanModel = model.replace(/\s+/g, ' ');
            const key = `${make} ${cleanModel}`;
            const status = cols[statusIdx] || '';
            const fuel = cols[fuelIdx]?.toLowerCase() || '';

            if (!modelsData[key]) {
                modelsData[key] = { make, model: cleanModel, total: 0, new: 0, used: 0, ev: 0 };
            }

            modelsData[key].total++;
            totalCount++;

            // ★ 核心判斷：政府代碼 'A' 為全新車，其他代碼(C2, B 等)曾於外地登記，即為「二手水貨」
            if (status === 'A') modelsData[key].new++;
            else modelsData[key].used++;

            // 判斷電動車
            if (fuel.includes('electric')) modelsData[key].ev++;
        }

        // 將物件轉為陣列，並排序取前 100 名暢銷車型 (節省資料庫空間)
        const topModels = Object.values(modelsData)
            .sort((a: any, b: any) => b.total - a.total)
            .slice(0, 100);

        const processedData = {
            category: "Other",          
            docType: "市場大數據",       
            name: `${reportMonth} 香港車市型號排行 (新車/水貨分析)`, 
            topModels: topModels,
            analysis: { totalPrivateCars: totalCount },
            rawDataUrl: csvUrl, 
            source: "DATA.GOV.HK 首次登記車輛細節",
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            managedBy: "System_Auto_Bot"          
        };

        await setDoc(docRef, processedData, { merge: true });
        return NextResponse.json({ success: true, message: "型號大數據抓取成功！", data: processedData });

    } catch (error: any) {
        console.error("[發生錯誤]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
