import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const make = searchParams.get('make')?.toUpperCase().trim();     // 車廠 (如 TOYOTA)
    const model = searchParams.get('model')?.toUpperCase().trim();   // 型號 (如 ALPHARD)
    const year = searchParams.get('year');                           // 年份 (如 2018)

    const nasUrl = 'https://uncertain-eternal-antelope.ngrok-free.dev/api/cars';

    try {
        // 呼叫您的 NAS 數據，設定 1 分鐘快取
        const res = await fetch(nasUrl, { next: { revalidate: 60 } });
        if (!res.ok) throw new Error('無法連線至內部 NAS 服務');

        const allMarketCars = await res.json(); // 預期收到 28car 全量 JSON 陣列

        if (!Array.isArray(allMarketCars)) {
            return NextResponse.json({ success: false, error: 'NAS 數據格式不正確' }, { status: 500 });
        }

        // ★ 核心智能過濾：匹配車型、型號、年份
        const matchedCars = allMarketCars.filter((car: any) => {
            const carMake = (car.make || car.brand || '').toUpperCase().trim();
            const carModel = (car.model || '').toUpperCase().trim();
            const carYear = String(car.year || '');

            // 精準匹配車廠與年份，型號採用模糊包含匹配 (例如 ALPHARD SC 包含 ALPHARD)
            const makeMatch = make ? carMake.includes(make) || make.includes(carMake) : true;
            const modelMatch = model ? carModel.includes(model) || model.includes(carModel) : true;
            const yearMatch = year ? carYear === String(year) : true;

            return makeMatch && modelMatch && yearMatch;
        });

        if (matchedCars.length === 0) {
            return NextResponse.json({ success: true, count: 0, avgPrice: 0, minPrice: 0, maxPrice: 0, items: [] });
        }

        // ★ 提取並清理價格數據 (排除非數字或異常數據)
        const prices = matchedCars
            .map((car: any) => Number(car.price))
            .filter((p: number) => !isNaN(p) && p > 0);

        if (prices.length === 0) {
            return NextResponse.json({ success: true, count: matchedCars.length, avgPrice: 0, minPrice: 0, maxPrice: 0, items: matchedCars });
        }

        // ★ 統計大數據指標
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const sumPrice = prices.reduce((a, b) => a + b, 0);
        const avgPrice = Math.round(sumPrice / prices.length);

        return NextResponse.json({
            success: true,
            count: matchedCars.length, // 市場現有盤量
            avgPrice,                  // 28car 平均叫價
            minPrice,                  // 28car 最低叫價
            maxPrice,                  // 28car 最高叫價
            items: matchedCars.slice(0, 10) // 丟回前 10 筆明細供畫面對比參考
        });

    } catch (error: any) {
        console.error('NAS 大數據整合 API 錯誤:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
