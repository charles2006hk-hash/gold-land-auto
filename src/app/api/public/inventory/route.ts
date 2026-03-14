import { NextResponse } from 'next/server';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from "firebase/app";

// Firebase 基礎設定
const firebaseConfig = {
    apiKey: "AIzaSyCHt7PNXd5NNh8AsdSMDzNfbvhyEsBG2YY",
    projectId: "gold-land-auto",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// CORS 設定：允許外部官網讀取
const corsHeaders = {
    'Access-Control-Allow-Origin': '*', 
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
    try {
        // 1. 獲取所有庫存車輛
        const inventorySnapshot = await getDocs(collection(db, 'artifacts', 'gold-land-auto', 'staff', 'CHARLES_data', 'inventory'));
        const allCars = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

        // 2. 🌟 關鍵升級：同步獲取「智能圖庫」中所有已連結的圖片
        const mediaSnapshot = await getDocs(query(
            collection(db, 'artifacts', 'gold-land-auto', 'staff', 'CHARLES_data', 'media_library'),
            where('status', '==', 'linked')
        ));
        
        // 建立圖片對照表 (優先提取打咗星星 isPrimary 嘅封面圖)
        const imageMap: Record<string, string> = {};
        mediaSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.relatedVehicleId && data.url) {
                // 如果仲未有圖，或者呢張圖係封面，就存入對照表
                if (!imageMap[data.relatedVehicleId] || data.isPrimary) {
                    imageMap[data.relatedVehicleId] = data.url;
                }
            }
        });

        // 3. 嚴格過濾並組合數據
        const publicCars = allCars
            .filter(car => car.isPublic === true && ['In Stock', 'Reserved'].includes(car.status))
            .map(car => {
                // 優先使用智能圖庫嘅封面圖，其次先用舊版 photos 陣列
                let finalImage = imageMap[car.id];
                if (!finalImage && car.photos && car.photos.length > 0) {
                    finalImage = typeof car.photos[0] === 'string' ? car.photos[0] : car.photos[0].url;
                }

                // 重新包裝，過濾敏感資料
                return {
                    id: car.id,
                    title: `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim(),
                    price: new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', maximumFractionDigits: 0 }).format(car.price || 0),
                    year: car.year || '未填',
                    type: car.type || 'hyper', 
                    mileage: car.mileage ? `${Number(car.mileage).toLocaleString()} km` : 'N/A',
                    engine: car.engineSize ? `${car.engineSize}cc` : '',
                    transmission: car.transmission === 'Manual' ? 'MT' : 'Auto',
                    status: car.status === 'In Stock' ? 'in-stock' : 'reserved',
                    image: finalImage || "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=1000", // 如果真係無圖，用靚靚跑車預設圖
                    tags: car.tags || []
                };
            });

        return NextResponse.json(publicCars, { headers: corsHeaders });

    } catch (error) {
        console.error("Public API Error:", error);
        return NextResponse.json({ error: '無法讀取庫存' }, { status: 500, headers: corsHeaders });
    }
}
