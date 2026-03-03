import { NextResponse } from 'next/server';

// ★ 設定快取 300 秒 (5分鐘)
// 這樣既能保持「實時」感，又不會因為頻繁抓取而被財經網站封鎖 IP
export const revalidate = 300;

export async function GET() {
    try {
        // 定義要抓取的全球指數代碼 (Yahoo Finance 格式)
        const targets = [
            { sym: '^HSI', name: '恆生指數' },
            { sym: '^DJI', name: '道瓊指數' },
            { sym: '000001.SS', name: '上證指數' }
        ];

        const results = [];

        for (const target of targets) {
            // 呼叫 Yahoo Finance 的公開 API 獲取當日走勢
            const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${target.sym}?interval=1d&range=1d`, {
                headers: { 'User-Agent': 'Mozilla/5.0' } // 偽裝成瀏覽器避免被擋
            });
            
            if (res.ok) {
                const data = await res.json();
                const quote = data.chart?.result?.[0]?.meta;
                
                if (quote && quote.regularMarketPrice) {
                    const price = quote.regularMarketPrice.toFixed(0);
                    const prevClose = quote.chartPreviousClose || quote.regularMarketPrice;
                    const change = quote.regularMarketPrice - prevClose;
                    const percent = ((change / prevClose) * 100).toFixed(2);
                    
                    const isUp = change >= 0;
                    
                    // ★ 香港/內地股市習慣：紅升綠跌 (Red for Up, Green for Down)
                    const color = isUp ? 'text-red-400' : 'text-green-400';
                    const arrow = isUp ? '▲' : '▼';

                    results.push({
                        label: target.name,
                        value: `${price} ${arrow}${Math.abs(Number(percent))}%`,
                        color: color
                    });
                }
            }
        }

        return NextResponse.json(results);

    } catch (error) {
        console.error('Finance API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch indices' }, { status: 500 });
    }
}
