import { NextResponse } from 'next/server';

// 將後端強制快取縮短為 10 分鐘 (600秒)，作為防刷保護。
// 真正的「3小時/當天首次更新」邏輯將交由前端精準控制。
export const revalidate = 600;

export async function GET() {
    try {
        const currentTime = new Date().toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong', hour: '2-digit', minute: '2-digit' });

        // 1. 擴大爬蟲範圍 (抓取前 50 條新聞當作龐大的生肉 Buffer)
        const keywordQuery = encodeURIComponent('廣東省公安廳 OR 港車北上 OR 粵Z OR 香港汽車 OR 國際要聞 OR 恆生指數 OR 聯儲局');
        const rssUrl = `https://news.google.com/rss/search?q=${keywordQuery}&hl=zh-HK&gl=HK&ceid=HK:zh-Hant`;
        
        const rssRes = await fetch(rssUrl);
        const rssText = await rssRes.text();
        
        const titles: string[] = [];
        const titleRegex = /<title>(.*?)<\/title>/g;
        let match;
        let count = 0;
        while ((match = titleRegex.exec(rssText)) !== null && count < 50) {
            if (match[1] !== 'Google 新聞 - 搜尋' && !match[1].includes('Google News')) {
                const cleanTitle = match[1].split(' - ')[0];
                titles.push(`- ${cleanTitle}`);
                count++;
            }
        }
        
        const rawNewsData = titles.join('\n');

        // 2. 要求 Gemini 產出 20~25 條新聞
        const prompt = `你是一個香港「金田汽車」的專屬AI新聞秘書。
        這是我剛剛抓取的 50 條真實新聞標題：
        
        ${rawNewsData}

        請從中挑選出最重要、且與「四大主題」相關的 20 到 25 條新聞（若數量不足請盡量提供最多相關的）。
        然後將它們改寫成專業、精簡的跑馬燈快訊 (每條約 20-30 字)。
        
        四大主題 Tag：
        1. "🚗 中港政策" (廣東省公安廳/中港牌/跨境)
        2. "🚙 香港車市" (香港本地車輛/交通)
        3. "🌍 國際要聞" (重大國際新聞)
        4. "📈 財經指數" (金融指數/聯儲局)
        
        現在時間是 ${currentTime}。
        請嚴格以下列 JSON 格式輸出：
        {
          "news": [
            { "tag": "🚗 中港政策", "text": "...", "time": "${currentTime}" },
            ... (總共產出 20 到 25 個物件)
          ]
        }`;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('未設定 GEMINI_API_KEY');

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Gemini API 請求失敗');

        const rawText = data.candidates[0].content.parts[0].text;
        const content = JSON.parse(rawText);
        
        return NextResponse.json(content.news);

    } catch (error: any) {
        console.error("AI 快訊 Error:", error);
        
        const errorMsg = error.message || String(error);
        
        // ★ 攔截 Google 伺服器塞車嘅錯誤
        if (errorMsg.includes('high demand') || errorMsg.includes('503') || errorMsg.includes('overloaded')) {
            return NextResponse.json({ 
                reply: "📡 金田 AI 伺服器目前大塞車，請稍等幾分鐘後再試啦..." 
            });
        }
        
        // ★ 攔截 Quota 爆咗嘅錯誤 (429 Too Many Requests)
        if (errorMsg.includes('429') || errorMsg.includes('quota')) {
            return NextResponse.json({ 
                reply: "⚠️ 金田 AI 已經用盡咗今日/今分鐘嘅免費額度，請稍後再試。" 
            });
        }

        // 其他未知錯誤
        return NextResponse.json({ 
            reply: "⚠️ AI 暫時無法連線，請稍後再試。" 
        }, { status: 500 });
    }
}
