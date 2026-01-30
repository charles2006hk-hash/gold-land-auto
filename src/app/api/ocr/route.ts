import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 1. 接收前端傳來的圖片
    const { image, docType } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // 2. 讀取我們在第二步設定的密鑰
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server API Key not configured' }, { status: 500 });
    }

    // 3. 處理圖片格式 (移除 base64 前綴)
    const base64Data = image.includes('base64,') ? image.split(',')[1] : image;

    // 4. 設定給 AI 的指令 (Prompt)
    const prompt = `
      你是一個專業的資料輸入員。請分析這張圖片（文件類型：${docType}），並提取以下欄位。
      
      請直接回傳純 JSON 格式，不要有 Markdown 標記 (\`\`\`json)，不要有其他解釋文字。
      如果找不到該欄位，請回傳空字串 ""。
      
      目標欄位說明 (請盡量識別)：
      - name: 姓名 或 公司名稱 (如果是牌薄，請抓取 Registered Owner)
      - idNumber: 身份證號 / 商業登記號 (BR) / 車牌號
      - phone: 電話號碼
      - address: 地址
      - expiryDate: 到期日 (格式 YYYY-MM-DD)
      - quotaNo: 指標號 (如果是中港文件)
      - plateNoHK: 香港車牌 (VRD常見)
      - chassisNo: 底盤號碼 (VRD常見)
      - engineNo: 引擎號碼 (VRD常見)
      - priceA1: 首次登記稅值 (VRD常見，純數字)
      - priceTax: 已繳付登記稅 (VRD常見，純數字)
      - make: 廠名 (VRD常見)
      - model: 型號 (VRD常見)
      - manufactureYear: 出廠年份
      - engineSize: 汽缸容量/容積
      - firstRegCondition: 首次登記狀況 (例如 BRAND NEW)
      - description: 其他重要備註摘要
    `;

    // 5. 呼叫 Google Gemini API (使用 latest 版本以確保可用性)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: base64Data } }
          ]
        }]
      })
    });

    const data = await response.json();

    // 6. 處理 AI 回傳的結果
    if (data.error) {
        throw new Error(data.error.message);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // 清理 JSON 字串 (防止 AI 回傳包含 markdown 符號)
    const cleanJson = text.replace(/```json|```/g, '').trim();
    const parsedData = JSON.parse(cleanJson);

    return NextResponse.json({ success: true, data: parsedData });

  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
