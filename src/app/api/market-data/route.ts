import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const make = searchParams.get('make')?.toUpperCase().trim() || '';
    const model = searchParams.get('model')?.toUpperCase().trim() || '';
    const year = searchParams.get('year')?.trim() || '';

    const nasUrl = 'https://uncertain-eternal-antelope.ngrok-free.dev/api/cars';

    try {
        const res = await fetch(nasUrl, { next: { revalidate: 60 } });
        if (!res.ok) throw new Error('連線 NAS 失敗');
        
        const allMarketCars = await res.json();
        if (!Array.isArray(allMarketCars)) throw new Error('NAS 數據格式錯誤');

        // ★★★ 核心修復：智能大數據清洗與模糊比對 (升級版：破解 Check Desc 陷阱) ★★★
        const matchedCars = allMarketCars.filter((car: any) => {
            const carMake = (car.make || car.brand || '').toUpperCase().trim();
            const carModel = (car.model || '').toUpperCase().trim();
            const carTitle = (car.title || '').toUpperCase().trim(); // ★ 新增：把標題也抓出來
            const carYear = String(car.year || '').trim();

            // 1. 車廠比對 (Toyota vs 豐田 Toyota)
            // ★ 新增 carTitle.includes(make)，因為 title 裡面常包含 "豐田" 或 "平治"
            const makeMatch = make 
                ? (carMake.includes(make) || make.includes(carMake) || carTitle.includes(make)) 
                : true;
            
            // 2. 智能核心車型比對 (解決 Alphard SC vs Alphard 2.5 的問題)
            // 只取第一個英數單字來比對，例如 "ALPHARD SC" -> 只取 "ALPHARD"
            const myCoreModel = model.split(' ')[0].replace(/[^A-Z0-9]/g, '');
            
            // ★ 終極破解：既然 car.model 是 "CHECK DESC"，我們直接拿 myCoreModel 去撞 carTitle！
            const modelMatch = myCoreModel 
                ? (carTitle.includes(myCoreModel) || carModel.includes(myCoreModel)) 
                : true;

            // 3. 年份比對
            const yearMatch = year ? carYear === String(year) : true;

            return makeMatch && modelMatch && yearMatch;
        });
        if (matchedCars.length === 0) {
            return NextResponse.json({ success: true, count: 0, avgPrice: 0, minPrice: 0, maxPrice: 0, items: [] });
        }

        // ★ 清理價格並防禦假盤
        const prices = matchedCars
            .map((car: any) => {
                const cleanPrice = String(car.price).replace(/[^0-9]/g, ''); // 移除 "HK$" 等字眼
                return Number(cleanPrice);
            })
            .filter((p: number) => !isNaN(p) && p > 10000); // 排除異常低價 (例如亂標 $1 的釣魚盤)

        if (prices.length === 0) {
            return NextResponse.json({ success: true, count: matchedCars.length, avgPrice: 0, minPrice: 0, maxPrice: 0, items: matchedCars });
        }

        // ★ 切尾平均法 (Trimmed Mean)：排除最高與最低各 10% 的極端定價，算出最真實的市場均價
        prices.sort((a, b) => a - b);
        const trimCount = Math.floor(prices.length * 0.1);
        const validPrices = prices.slice(trimCount, prices.length - trimCount > 0 ? prices.length - trimCount : prices.length);
        
        const finalPrices = validPrices.length > 0 ? validPrices : prices;
        const minPrice = Math.min(...finalPrices);
        const maxPrice = Math.max(...finalPrices);
        const sumPrice = finalPrices.reduce((a, b) => a + b, 0);
        const avgPrice = Math.round(sumPrice / finalPrices.length);

        return NextResponse.json({
            success: true,
            count: matchedCars.length,
            avgPrice,
            minPrice,
            maxPrice,
            items: matchedCars.slice(0, 10)
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
