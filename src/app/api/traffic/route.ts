import { NextResponse } from 'next/server';

export async function GET() {
  const targetUrl = 'https://secure1.info.gov.hk/immd/mobileapps/2bb9ae17/data/CPQueueTimeR.json';
  
  try {
    // 🌟 通道 1：嘗試直接請求入境處伺服器（完美偽裝成 iPhone Safari 設備）
    let res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json',
        'Accept-Language': 'zh-HK,zh-TW;q=0.9,zh;q=0.8',
        'Referer': 'https://www.immd.gov.hk/'
      },
      next: { revalidate: 60 } // 快取 60 秒，避免被當成惡意攻擊
    });

    // 🌟 智能防護：如果 Vercel IP 被政府防火牆封鎖 (非 200 狀態碼)
    if (!res.ok) {
      console.warn(`[口岸 API] 直接請求被攔截 (Status: ${res.status})，瞬間啟動備用代理通道...`);
      
      // 通道 2：透過開源代理 (AllOrigins) 繞過 IP 地區限制，把 JSON 抓回來
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      res = await fetch(proxyUrl, { next: { revalidate: 60 } });
      
      if (!res.ok) {
          throw new Error('備用通道也無法獲取數據');
      }
    }

    // 成功取得資料後回傳給前端
    const data = await res.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('口岸數據抓取嚴重失敗:', error);
    return NextResponse.json({ error: 'Failed to fetch traffic data' }, { status: 500 });
  }
}
