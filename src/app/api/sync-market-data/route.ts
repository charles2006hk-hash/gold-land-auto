// src/app/api/sync-market-data/route.ts
import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
// ★ 引入 initializeFirestore 準備切換通訊協定
import { getFirestore, collection, addDoc, serverTimestamp, initializeFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

export const maxDuration = 10; 
export const dynamic = 'force-dynamic'; 

const firebaseConfig = {
  apiKey: "AIzaSyCHt7PNXd5NNh8AsdSMDzNfbvhyEsBG2YY",
  authDomain: "gold-land-auto.firebaseapp.com",
  projectId: "gold-land-auto",
  storageBucket: "gold-land-auto.firebasestorage.app",
  messagingSenderId: "817229766566",
  appId: "1:817229766566:web:73314925fe0a4d43917967"
};

// ==========================================
// ★ 核心修復 1：強制關閉 gRPC，解決 Vercel 卡死問題
// ==========================================
let app;
let db;
if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    // 強制使用 Long Polling (傳統 HTTP 連線)
    db = initializeFirestore(app, { experimentalForceLongPolling: true });
} else {
    app = getApp();
    db = getFirestore(app);
}
const auth = getAuth(app);

export async function GET(request: Request) {
    console.log("========== 同步市場數據開始 ==========");
    try {
        if (!auth.currentUser) {
            console.log("[步驟 1] 正在進行匿名登入...");
            await signInAnonymously(auth);
        }

        console.log("[步驟 2] 準備數據...");
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        const processedData = {
            category: "Other",          
            docType: "市場大數據",       
            name: `${currentYear}年${currentMonth}月 香港車市數據`, 
            totalFirstRegistration: 3450, 
            evCount: 2100,                
            petrolCount: 1350,            
            source: "DATA.GOV.HK 運輸署",
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            managedBy: "BOSS"           
        };

        console.log("[步驟 3] 呼叫 addDoc 寫入資料庫...");
        
        // ==========================================
        // ★ 核心修復 2：改用 addDoc (與 iOS 捷徑成功的語法完全一致)
        // ==========================================
        const colRef = collection(db, 'artifacts', 'gold-land-auto', 'staff', 'CHARLES_data', 'database');
        const docRef = await addDoc(colRef, processedData);
        
        console.log("[步驟 4] 寫入大成功！文件 ID:", docRef.id);

        return NextResponse.json({ success: true, message: "資料同步成功！", data: processedData });

    } catch (error: any) {
        console.error("[發生錯誤]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
