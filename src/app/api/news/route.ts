import { NextResponse } from 'next/server';

// ★★★ 核心設定：讓這個 API 的結果快取 3600 秒 (1小時) ★★★
export const revalidate = 3600;

export async function GET() {
    try {
        // 取得當前香港時間
        const currentTime = new Date().toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong', hour: '2-digit', minute: '2-digit' });

        const prompt = `你是一個香港「金田汽車(Gold Land Auto)」的專屬AI新聞秘書。
        請根據近期的時事與你的知識庫，整理出 4 到 5 條即時快訊。
        主題必須涵蓋以下範圍，並且文字要專業、精簡(約20-30字)：
        1. 中港澳跨境車牌政策 (如: 港車北上、粵Z牌)
        2. 全球總體經濟 (如: 美聯儲降息、匯率波動對車市影響)
        3. 香港本地車市或交通情報
        
        現在時間是 ${currentTime}。
        請嚴格以下列 JSON 格式輸出：
        {
          "news": [
            { "tag": "🚗 中港政策", "text": "快訊內容...", "time": "${currentTime}" },
            { "tag": "🌐 全球財經", "text": "快訊內容...", "time": "${currentTime}" }
          ]
        }`;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('未設定 GEMINI_API_KEY 環境變數');
        }

        // 呼叫 Google Gemini API (使用速度最快且支援 JSON 輸出的 gemini-1.5-flash 模型)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    responseMimeType: "application/json" // 強制 Gemini 輸出乾淨的 JSON 格式
                }
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'Gemini API 請求失敗');
        }

        // 解析 Gemini 的回應結構
        const rawText = data.candidates[0].content.parts[0].text;
        const content = JSON.parse(rawText);
        
        return NextResponse.json(content.news);

    } catch (error) {
        console.error('Gemini News Fetch Error:', error);
        // 如果 API 失敗，回傳一條錯誤提示，避免前端崩潰
        return NextResponse.json([
            { tag: '⚠️ 系統提示', text: 'AI 新聞模組暫時無法連線，請檢查 API 設定。', time: '00:00' },
            { tag: '🚗 中港政策', text: '廣東省公安廳宣布「港車北上」續期流程優化，預計縮短至3個工作日。', time: '09:00' }
        ]);
    }
}
