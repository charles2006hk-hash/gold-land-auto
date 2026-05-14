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

// src/app/api/sync-market-data/route.ts (部分關鍵代碼)
// ...前面初始化代碼保持不變...

export async function GET(request: Request) {
    try {
        if (!auth.currentUser) await signInAnonymously(auth);

        const govCsvUrl = "https://www.td.gov.hk/datagovhk_tis/mttd-csv/en/table41e_eng.csv";
        const response = await fetch(govCsvUrl);
        const csvText = await response.text();
        const lines = csvText.split('\n');

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const brandData: { [key: string]: any } = {};

        // 解析 CSV (從數據列開始)
        for (let i = 6; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length < 5) continue;

            const make = cols[0].trim().toUpperCase(); // 品牌名
            const fuelType = cols[2].trim();          // 燃料
            const status = cols[3].trim();            // New/Used
            const count = parseInt(cols[4]) || 0;     // 數量

            if (!make || make === 'TOTAL') continue;

            if (!brandData[make]) {
                brandData[make] = { total: 0, new: 0, used: 0, ev: 0 };
            }

            brandData[make].total += count;
            if (status.toLowerCase() === 'new') brandData[make].new += count;
            if (status.toLowerCase() === 'used') brandData[make].used += count;
            if (fuelType.toLowerCase().includes('electric')) brandData[make].ev += count;
        }

        const documentId = `market_stats_${currentYear}_${currentMonth.toString().padStart(2, '0')}`;
        const docRef = doc(db, 'artifacts', 'gold-land-auto', 'staff', 'CHARLES_data', 'database', documentId);

        const processedData = {
            category: "Other", docType: "市場大數據",
            name: `${currentYear}年${currentMonth}月 香港車市品牌分析`,
            brands: brandData, // ★ 這裡存入了各品牌的詳細數據
            updatedAt: serverTimestamp(),
            managedBy: "System_Auto_Bot"
        };

        await setDoc(docRef, processedData, { merge: true });
        return NextResponse.json({ success: true, documentId });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
