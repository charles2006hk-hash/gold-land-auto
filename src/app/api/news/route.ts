import { NextResponse } from 'next/server';

// ★★★ 核心設定：讓這個 API 的結果快取 3600 秒 (1小時) ★★★
// 確保每小時只會去爬蟲與呼叫 Gemini 一次，極度節省 API 費用
export const revalidate = 0;

export async function GET() {
    try {
        // 取得當前香港時間
        const currentTime = new Date().toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong', hour: '2-digit', minute: '2-digit' });

        // ====================================================================
        // 第一步：抓取真實世界的新聞 (Data Fetching)
        // 使用 Google News RSS，鎖定我們定義的關鍵字
        // ====================================================================
        const keywordQuery = encodeURIComponent('港車北上 OR 粵Z OR 香港車市 OR 美聯儲 OR 恆生指數');
        const rssUrl = `https://news.google.com/rss/search?q=${keywordQuery}&hl=zh-HK&gl=HK&ceid=HK:zh-Hant`;
        
        const rssRes = await fetch(rssUrl);
        const rssText = await rssRes.text();
        
        // 用簡單的正則表達式提取前 15 條新聞標題 (當作生肉資料)
        const titles: string[] = [];
        const titleRegex = /<title>(.*?)<\/title>/g;
        let match;
        let count = 0;
        while ((match = titleRegex.exec(rssText)) !== null && count < 15) {
            // 略過 RSS 預設的總標題
            if (match[1] !== 'Google 新聞 - 搜尋' && !match[1].includes('Google News')) {
                // 清理掉來源名稱 (例如 " - 香港01")，讓 AI 更好讀
                const cleanTitle = match[1].split(' - ')[0];
                titles.push(`- ${cleanTitle}`);
                count++;
            }
        }
        
        const rawNewsData = titles.join('\n');

        // ====================================================================
        // 第二步：交給 Gemini 進行智能整理與格式化 (AI Processing)
        // 就像 OCR 處理圖片一樣，這裡讓 AI 處理雜亂的新聞標題
        // ====================================================================
        const prompt = `你是一個香港「金田汽車(Gold Land Auto)」的專屬AI新聞秘書。
        我剛剛從網路上抓取了最新的真實新聞標題如下：
        
        【今日真實新聞】
        ${rawNewsData}

        請你從上述新聞中，挑選出最重要、與車行業務最相關的 4 到 5 條新聞。
        然後將它們改寫成專業、精簡的跑馬燈快訊 (每條約 20-30 字)。
        
        現在時間是 ${currentTime}。
        請嚴格以下列 JSON 格式輸出：
        {
          "news": [
            { "tag": "🚗 中港政策", "text": "改寫後的快訊...", "time": "${currentTime}" },
            { "tag": "🌐 全球財經", "text": "改寫後的快訊...", "time": "${currentTime}" }
          ]
        }
        注意：請自行根據內容指派合適的 tag，例如 "🚗 中港政策", "🌐 全球財經", "📊 本地車市", "🛣️ 交通情報"。`;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('未設定 GEMINI_API_KEY 環境變數');
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'Gemini API 請求失敗');
        }

        const rawText = data.candidates[0].content.parts[0].text;
        const content = JSON.parse(rawText);
        
        return NextResponse.json(content.news);

    } catch (error: any) {
        console.error('Gemini News Fetch Error:', error);
        // ★ 將具體的錯誤訊息 (error.message) 顯示在跑馬燈上，方便我們一眼看出問題！
        return NextResponse.json([
            { tag: '⚠️ 系統除錯', text: `API 發生錯誤: ${error.message}`, time: '00:00' }
        ]);
    }
}
