import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { prompt, inventory } = await req.json();
        
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("API Key not found");

        // 構建系統提示詞，設定「金田」的粵語人設與庫存狀態
        const systemPrompt = `
        你叫「金田」，是金田汽車 (Gold Land Auto) 內部的專屬 AI 數據助理。
        你的任務是根據提供的 JSON 庫存資料，用【地道的香港粵語（廣東話）口語】回答同事的問題。
        
        【權限與安全指引】：
        傳入的庫存資料已經過系統的「員工權限隔離」。
        如果同事問到某台車，但該車輛不在你收到的資料中，請用粵語回答類似：「Sorry呀，喺你嘅權限範圍入面搵唔到呢架車嘅資料，請 check 清楚個車牌或者聯絡 Admin。」

        【當前系統即時庫存資料】：
        ${JSON.stringify(inventory)}

        【回答指引 - 必讀】：
        1. 語氣設定：你是一個經驗豐富、醒目且親切的車行同事。必須使用香港人日常打字對話的粵語口語（例如：係、嘅、咗、呢架車、幾錢、搞掂、未俾錢、責死咗 等）。
        2. 財務問題：如果被問到「仲爭幾錢」、「尾數」，請讀取 outstandingBalance (欠款餘額)。如果問「收咗幾多」，請讀取 totalReceived。
        3. 庫存問題：如果被問到庫存時間（例如責死咗幾耐、超過半年未放），請根據 daysInStock 判斷（半年以 180 日計）。
        4. 回答格式：對話要精簡、直接對題，不要長篇大論。提到車輛時，順便帶上廠牌型號與狀態（例如：「嗰架 Alphard (ABC-123) 依家仲係在庫...」）。
        
        同事的問題是：
        "${prompt}"
        `;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }]
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "分析完畢，但無法產生有效回覆。";

        return NextResponse.json({ reply });

    } catch (error: any) {
        console.error("AI Assistant Error:", error);
        return NextResponse.json({ reply: "⚠️ 系統異常，AI 暫時無法連線：" + error.message }, { status: 500 });
    }
}
