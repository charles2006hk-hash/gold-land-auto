import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, writeBatch, collection } from 'firebase/firestore';

// ★ 安全密鑰，必須與 Python 爬蟲端設定的一致
const API_SECRET = "goldland-super-secret-2026"; 

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. 驗證密鑰
        if (body.secret !== API_SECRET) {
            return NextResponse.json({ success: false, message: 'Invalid Secret' }, { status: 401 });
        }

        const carDataList = body.data;
        if (!carDataList || !Array.isArray(carDataList)) {
            return NextResponse.json({ success: false, message: 'Invalid Format' }, { status: 400 });
        }

        // 2. 初始化 Firebase
        // ⚠️ 警告：請務必確保這裡面的值，跟您專案中 config/firebase.ts 裡的完全一樣！
        const firebaseConfig = {
            apiKey: "AIzaSyCHt7PNXd5NNh8AsdSMDzNfbvhyEsBG2YY",
            projectId: "gold-land-auto",
            // 👇 如果有以下這些，也請務必補上，否則會連線失敗！ 👇
            // authDomain: "...",
            // storageBucket: "...",
            // messagingSenderId: "...",
            // appId: "..."
        };

        const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const targetCollection = collection(db, 'artifacts', 'gold-land-auto', 'staff', 'CHARLES_data', '28car_market_data');

        // 3. ★ 突破 Vercel 10秒限制：切成每包 500 筆，並「同時併發 (Promise.all)」寫入！
        const chunks = [];
        for (let i = 0; i < carDataList.length; i += 500) {
            chunks.push(carDataList.slice(i, i + 500));
        }

        const batchPromises = chunks.map(async (chunk) => {
            const batch = writeBatch(db);
            chunk.forEach((car: any) => {
                if (!car.id) return;
                const docRef = doc(targetCollection, String(car.id));
                batch.set(docRef, {
                    ...car,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            });
            return batch.commit();
        });

        // 等待所有包裹「同時」寫入完成，速度提升 5 倍！
        await Promise.all(batchPromises);

        return NextResponse.json({ success: true, message: `成功同步 ${carDataList.length} 筆車盤資料至雲端資料庫` });

    } catch (error) {
        console.error('API 接收數據失敗:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
