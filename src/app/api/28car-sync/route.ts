import { NextResponse } from 'next/server';
// 這裡我們直接使用 firebase-admin 或是客戶端 SDK 來寫入資料
// 假設您已經有 firebase 的基礎設定
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch, collection } from 'firebase/firestore';

// ★ 安全密鑰，必須與 Python 爬蟲端設定的一致
const API_SECRET = "goldland-super-secret-2026"; 

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. 驗證密鑰
        if (body.secret !== API_SECRET) {
            return NextResponse.json({ success: false, message: '未經授權的訪問 (Invalid Secret)' }, { status: 401 });
        }

        const carDataList = body.data;
        if (!carDataList || !Array.isArray(carDataList)) {
            return NextResponse.json({ success: false, message: '數據格式錯誤' }, { status: 400 });
        }

        // 2. 初始化 Firebase (這裡沿用您專案的設定)
        const app = getApps().length > 0 ? getApps()[0] : initializeApp({
            apiKey: "AIzaSyCHt7PNXd5NNh8AsdSMDzNfbvhyEsBG2YY",
            projectId: "gold-land-auto",
            // ... 其他設定
        });
        const db = getFirestore(app);

        // 3. 批量寫入 Firestore 數據庫 (Batch Write)
        const batch = writeBatch(db);
        const targetCollection = collection(db, 'artifacts', 'gold-land-auto', 'staff', 'CHARLES_data', '28car_market_data');

        carDataList.forEach((car: any) => {
            if (!car.id) return;
            const docRef = doc(targetCollection, String(car.id));
            batch.set(docRef, {
                ...car,
                updatedAt: new Date().toISOString()
            }, { merge: true }); // 使用 merge 確保只更新變動的欄位
        });

        await batch.commit();

        return NextResponse.json({ success: true, message: `成功同步 ${carDataList.length} 筆車盤資料至雲端資料庫` });

    } catch (error) {
        console.error('API 接收數據失敗:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
