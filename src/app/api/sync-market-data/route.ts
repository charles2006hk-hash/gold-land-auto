// src/app/api/sync-market-data/route.ts
import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

export const maxDuration = 10; 
// ★ 破案關鍵：強制 Next.js 每次都真實執行，絕對不要用快取！
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
    console.log("========== 測試開始 ==========");
    try {
        console.log("[步驟 1] API 已觸發");

        console.log("[步驟 2] 檢查登入狀態...");
        if (!auth.currentUser) {
            console.log("[步驟 2a] 正在進行匿名登入...");
            await signInAnonymously(auth);
            console.log("[步驟 2b] 匿名登入成功！");
        } else {
            console.log("[步驟 2c] 之前已登入");
        }

        console.log("[步驟 3] 準備寫入資料庫...");
        const documentId = `test-${Date.now()}`;
        const processedData = {
            yearMonth: documentId,
            test: "This is a test",
            updatedAt: serverTimestamp(),
        };

        console.log("[步驟 4] 開始呼叫 Firebase setDoc...");
        const docRef = doc(db, 'artifacts', 'gold-land-auto', 'staff', 'CHARLES_data', 'market_statistics', documentId);
        await setDoc(docRef, processedData, { merge: true });
        
        console.log("[步驟 5] Firebase 寫入大成功！");

        return NextResponse.json({ success: true, message: "測試成功！沒有超時！" });

    } catch (error: any) {
        console.error("[發生錯誤]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
