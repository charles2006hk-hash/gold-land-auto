import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase'; // 確保呢個路徑指啱您內部系統嘅 firebase.ts
import { collection, getDocs } from 'firebase/firestore';

// 設定 CORS，允許外部官網讀取
const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // 允許任何網站 (您嘅官網) 讀取
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 處理預檢請求 (Preflight)
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
    try {
        const querySnapshot = await getDocs(collection(db, 'inventory'));
        
        // 1. 攞晒所有車出嚟
        const allCars = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

        // 2. 嚴格過濾：只顯示有打勾「isPublic (公開)」並且未正式賣斷嘅車
        const publicCars = allCars
            .filter(car => car.isPublic === true && ['Available', 'Incoming', 'Reserved'].includes(car.status))
            .map(car => {
                // 3. 重新包裝，絕對唔傳送任何成本、利潤、底價等敏感資料！
                return {
                    id: car.id,
                    title: `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim(),
                    price: car.price || 0, // 官網前台自己 format HK$
                    year: car.year || '未填',
                    type: car.type || 'hyper', 
                    mileage: car.mileage || '0',
                    engine: car.engineSize ? `${car.engineSize}cc` : '',
                    transmission: car.transmission === 'Manual' ? 'MT' : 'Auto',
                    status: car.status === 'Available' ? 'in-stock' : (car.status === 'Incoming' ? 'incoming' : 'reserved'),
                    image: (car.photos && car.photos.length > 0) ? car.photos[0] : null, // 只俾第一張相做封面
                    tags: car.tags || []
                };
            });

        return NextResponse.json(publicCars, { headers: corsHeaders });

    } catch (error) {
        console.error("Public API 讀取失敗:", error);
        return NextResponse.json({ error: '無法讀取庫存' }, { status: 500, headers: corsHeaders });
    }
}
