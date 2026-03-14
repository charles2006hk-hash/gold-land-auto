import { NextResponse } from 'next/server';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from "firebase/app";

// Firebase 基礎設定 (與您 page.tsx 相同)
const firebaseConfig = {
    apiKey: "AIzaSyCHt7PNXd5NNh8AsdSMDzNfbvhyEsBG2YY",
    projectId: "gold-land-auto",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// CORS 設定：允許任何網站讀取
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
        const querySnapshot = await getDocs(collection(db, 'artifacts', 'gold-land-auto', 'staff', 'CHARLES_data', 'inventory'));
        
        const allCars = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

        // 只挑選有打勾 isPublic 且未賣斷嘅車
        const publicCars = allCars
            .filter(car => car.isPublic === true && ['In Stock', 'Reserved'].includes(car.status))
            .map(car => {
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
                    image: (car.photos && car.photos.length > 0) ? (typeof car.photos[0] === 'string' ? car.photos[0] : car.photos[0].url) : "https://via.placeholder.com/800x600?text=No+Image",
                    tags: car.tags || []
                };
            });

        return NextResponse.json(publicCars, { headers: corsHeaders });

    } catch (error) {
        console.error("Public API Error:", error);
        return NextResponse.json({ error: '無法讀取庫存' }, { status: 500, headers: corsHeaders });
    }
}
