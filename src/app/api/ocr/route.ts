import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { image, docType } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("API Key is MISSING");
        return NextResponse.json({ error: 'Server API Key not configured' }, { status: 500 });
    }

    const base64Data = image.includes('base64,') ? image.split(',')[1] : image;

    // 4. 設定 Prompt (已優化：強制合併中英文車主名稱)
    const prompt = `
      你是一個專業的資料輸入員。請分析這張圖片（文件類型：${docType}），並提取以下欄位。
      請直接回傳純 JSON 格式，不要有 Markdown 標記 (\`\`\`json)，不要有其他解釋文字。
      如果找不到該欄位，請回傳空字串 ""。
      
      特別注意：
      1. 對於牌薄 (VRD) 的車主名稱，通常會有中文和英文兩行 (例如第一行: 陳大文, 第二行: CHAN TAI MAN)。
      2. 請務必將這兩行合併為單一字串回傳 (例如: "陳大文 CHAN TAI MAN")。
      
      目標欄位：
      - name: 標題名稱 (如果是牌薄 VRD，請抓取 Registered Owner，務必合併中文與英文姓名)
      - registeredOwnerName: 登記車主名稱 (同上，請合併顯示，例如 "陳大文 CHAN TAI MAN")
      - idNumber: 身份證號 / 商業登記號 / 車牌號
      - registeredOwnerId: 登記車主身份證號
      - phone: 電話號碼
      - address: 地址
      - expiryDate: 到期日 (格式 YYYY-MM-DD)
      - quotaNo: 指標號
      - plateNoHK: 香港車牌
      - chassisNo: 底盤號碼
      - engineNo: 引擎號碼
      - prevOwners: 前任車主數目 (純數字，例如 0, 1)
      - priceA1: 首次登記稅值 (純數字)
      - priceTax: 已繳付登記稅 (純數字)
      - make: 廠名
      - model: 型號
      - manufactureYear: 出廠年份
      - vehicleColor: 車身顏色 (例如: BLACK, WHITE)
      - firstRegCondition: 首次登記狀況
      - engineSize: 汽缸容量 (純數字)
      - description: 其他重要備註摘要
    `;

    // ★★★ 修正：使用您列表中存在的 gemini-2.5-flash ★★★
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
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

    if (data.error) {
        console.error("Google API Error:", JSON.stringify(data.error, null, 2));
        throw new Error(`Google API Error: ${data.error.message}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("AI 沒有回傳任何文字結果");
    
    const cleanJson = text.replace(/```json|```/g, '').trim();
    const parsedData = JSON.parse(cleanJson);

    return NextResponse.json({ success: true, data: parsedData });

  } catch (error: any) {
    console.error('OCR Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
