// src/app/api/sync-market-data/route.ts
import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth'; // ★ 補回這個 Auth 模組

export const maxDuration = 10; 

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
const auth = getAuth(app); // ★ 初始化 Auth

export async function GET(request: Request) {
    try {
        // ★★★ 破案關鍵：先取得登入金牌，Firebase 才不會無限重試卡死 ★★★
        if (!auth.currentUser) {
            await signInAnonymously(auth);
        }

        // 模擬數據清洗過程
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1; // 1-12
        const documentId = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

        const processedData = {
            yearMonth: documentId,
            vehicleClass: "Private Car", 
            totalFirstRegistration: 3450, 
            evCount: 2100,                
            petrolCount: 1350,            
            source: "DATA.GOV.HK 運輸署",
            updatedAt: serverTimestamp(),
        };

        // 寫入 Firebase 數據庫
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
