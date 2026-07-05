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

        // 2. 初始化 Firebase (確保連線正確)
        const app = getApps().length > 0 ? getApps()[0] : initializeApp({
            apiKey: "AIzaSyCHt7PNXd5NNh8AsdSMDzNfbvhyEsBG2YY",
            projectId: "gold-land-auto",
        });
        const db = getFirestore(app);
        const targetCollection = collection(db, 'artifacts', 'gold-land-auto', 'staff', 'CHARLES_data', '28car_market_data');

        // ★★★ 核心修復：Firebase Batch 最高限制 500 筆，我們自動切成每包 400 筆分批寫入 ★★★
        const chunks = [];
        for (let i = 0; i < carDataList.length; i += 400) {
            chunks.push(carDataList.slice(i, i + 400));
        }

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach((car: any) => {
                if (!car.id) return;
                const docRef = doc(targetCollection, String(car.id));
                batch.set(docRef, {
                    ...car,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            });
            await batch.commit(); // 分批提交
        }

        return NextResponse.json({ success: true, message: `成功同步 ${carDataList.length} 筆車盤資料至雲端資料庫` });

    } catch (error) {
        console.error('API 接收數據失敗:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
