import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 由 Next.js 伺服器向入境處發送請求 (伺服器對伺服器不會有 CORS 問題)
    const res = await fetch('https://secure1.info.gov.hk/immd/mobileapps/2bb9ae17/data/CPQueueTimeR.json', {
      headers: {
        // 偽裝成瀏覽器，防止被對方防火牆攔截
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      next: { revalidate: 60 } // 設定緩存 60 秒，避免過度頻繁請求
    });

    if (!res.ok) {
      throw new Error(`Government API responded with status: ${res.status}`);
    }

    const data = await res.json();
    
    // 將數據回傳給前端
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Proxy fetch failed:', error);
    return NextResponse.json({ error: 'Failed to fetch traffic data' }, { status: 500 });
  }
}
