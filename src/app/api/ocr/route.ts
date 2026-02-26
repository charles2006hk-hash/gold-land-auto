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

    // =================================================================================
    // ★★★ 修改重點：根據 docType 切換 Prompt (提示詞) ★★★
    // =================================================================================
    let prompt = "";

    if (docType === '四證八面') {
        // --- A. 針對「四證八面」的專屬指令 ---
        prompt = `
          你是一個專業的證件識別系統。這張圖片可能包含以下一種或多種證件：
          1. 香港永久性居民身份證 (HKID)
          2. 港澳居民來往內地通行證 (回鄉證 / Home Return Permit)
          3. 香港駕駛執照 (HK Driving Licence)
          4. 中華人民共和國機動車駕駛證 (China Driving License)

          請盡可能識別圖片中的資訊，並提取以下欄位。
          請直接回傳純 JSON 格式，不要有 Markdown 標記，若找不到該欄位請回傳空字串 ""。

          目標欄位與對應內容：
          
          // 1. 香港身份證
          - hkid_name: 姓名 (英文或中文，優先取英文)
          - hkid_code: 電碼/符號 (例如 ***AZ)
          - hkid_dob: 出生日期
          - hkid_issueDate: 簽發日期 (例如 22-07-22)
          - idNumber: 身份證號碼 (例如 A123456(7))

          // 2. 回鄉證
          - hrp_nameCN: 姓名 (簡體中文)
          - hrp_expiry: 有效期限 (例如 2033.01.25)
          - hrp_num: 證件號碼 (例如 H03256342)

          // 3. 香港駕照
          - hkdl_num: 執照號碼 (通常同身份證)
          - hkdl_validTo: 有效期至 (例如 17/07/2034)
          - hkdl_ref: 檔號 (Ref No., 例如 A68-0106...)

          // 4. 中國駕照 (含正頁與副頁)
          - cndl_num: 證號
          - cndl_address: 住址
          - cndl_firstIssue: 初次領證日期
          - cndl_validPeriod: 有效期限 (請提取完整的起止日期，例如 "2025-05-19 至 2031-05-19")
          - cndl_issueLoc: 簽發地 (通常在紅色印章上，例如 "廣東省深圳市...")
          - cndl_fileNum: 檔案編號 (位於駕駛證副頁，例如 4403100...)
          
          - name: 為了系統兼容，請將識別到的任一主要姓名填入此欄
        `;
    } else {
        // --- B. 原有的 VRD 抓取邏輯 (完全保留不變) ---
        prompt = `
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
    }

    // =================================================================================

    // ★★★ 修正：使用您列表中存在的 gemini-2.5-flash ★★★
    // 注意：gemini-2.5-flash 尚未正式發布到穩定版 URL，如果報錯 404，請改回 gemini-1.5-flash
    // 這裡我們暫時保留您原始代碼的寫法
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`; // 建議改用 2.0-flash 或 1.5-flash 比較穩定
    
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
