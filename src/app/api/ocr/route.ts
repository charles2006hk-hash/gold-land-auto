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
    // 1. 根據 docType 切換 Prompt
    // =================================================================================
    let prompt = "";

    if (docType === '四證八面') {
        // --- A. 針對「四證八面」的專屬指令 (已優化格式與日期) ---
        prompt = `
          你是一個專業的證件識別系統。這張圖片包含以下四種證件：
          1. 香港永久性居民身份證 (HKID)
          2. 港澳居民來往內地通行證 (回鄉證 / Home Return Permit)
          3. 香港駕駛執照 (HK Driving Licence)
          4. 中華人民共和國機動車駕駛證 (China Driving License)

          請盡可能識別圖片中的資訊，並提取以下欄位。
          請直接回傳純 JSON 格式，不要有 Markdown 標記，若找不到該欄位請回傳空字串 ""。

          【★★★ 重要日期格式規定 ★★★】
          所有日期欄位 (出生日期、簽發日、到期日等) 必須強制轉換為 "YYYY-MM-DD" 格式。
          例如：圖片上是 "22-04-1993" 或 "22/04/1993"，請轉換為 "1993-04-22"。
          圖片上如果是 "27-07-22" (2022年)，請轉換為 "2022-07-27"。
          回鄉證期限如為 "2023.01.26-2033.01.25"，到期日請填 "2033-01-25"。

          目標欄位與對應內容：
          
          // 1. 香港身份證
          - hkid_name: 姓名 (必須同時包含中文與英文，例如 "葉葳劼 YIP, Wai Kit")
          - hkid_code: 中文姓名電碼 (即中文名字下方的幾組數字，例如 "5509 5524 0512"。絕對不要抓取 ***AZ 等符號)
          - hkid_dob: 出生日期 (格式 YYYY-MM-DD)
          - hkid_issueDate: 簽發日期 (格式 YYYY-MM-DD，通常在括號下方)
          - idNumber: 身份證號碼 (例如 Y311858(2))

          // 2. 回鄉證
          - hrp_nameCN: 姓名 (簡體中文，例如 "叶葳劼")
          - hrp_expiry: 有效期限/到期日 (格式 YYYY-MM-DD，提取期限的最後一天)
          - hrp_num: 證件號碼 (例如 H03256342)

          // 3. 香港駕照
          - hkdl_num: 執照號碼 (通常同身份證)
          - hkdl_validTo: 有效期至 (格式 YYYY-MM-DD)
          - hkdl_ref: 檔號 (Ref No., 例如 A68-0106...)

          // 4. 中國駕照 (含正頁與副頁)
          - cndl_num: 證號
          - cndl_address: 住址
          - cndl_firstIssue: 初次領證日期 (格式 YYYY-MM-DD)
          - cndl_validPeriod: 有效期限 (保留文字描述，例如 "2025-05-19 至 2031-05-19")
          - cndl_issueLoc: 簽發地 (通常在紅色印章上)
          - cndl_fileNum: 檔案編號 (位於駕駛證副頁，例如 440310071350)
          
          - name: 為了系統兼容，請將識別到的主要姓名填入此欄 (例如 "葉葳劼")
        `;
    } else {
        prompt = `
          你是一個專業的資料輸入員。請分析這張圖片（文件類型：${docType}），並提取以下欄位。
          請直接回傳純 JSON 格式，不要有 Markdown 標記 (\`\`\`json)，不要有其他解釋文字。
          如果找不到該欄位，請回傳空字串 ""。
          
          特別注意：
          1. 對於牌薄 (VRD) 的車主名稱，通常會有中文和英文兩行。
          2. 請務必將這兩行合併為單一字串回傳 (例如: "陳大文 CHAN TAI MAN")。
          
          目標欄位：
          - name: 標題名稱 (如果是牌薄 VRD，請抓取 Registered Owner，務必合併中文與英文姓名)
          - registeredOwnerName: 登記車主名稱
          - idNumber: 身份證號 / 商業登記號 / 車牌號
          - registeredOwnerId: 登記車主身份證號
          - phone: 電話號碼
          - address: 地址
          - expiryDate: 到期日 (格式 YYYY-MM-DD)
          - quotaNo: 指標號
          - plateNoHK: 香港車牌
          - chassisNo: 底盤號碼
          - engineNo: 引擎號碼
          - prevOwners: 前任車主數目 (純數字)
          - priceA1: 首次登記稅值 (純數字)
          - priceTax: 已繳付登記稅 (純數字)
          - make: 廠名
          - model: 型號
          - manufactureYear: 出廠年份
          - vehicleColor: 車身顏色
          - firstRegCondition: 首次登記狀況
          - engineSize: 汽缸容量 (純數字)
          - description: 其他重要備註摘要
        `;
    }

    // =================================================================================
    // 2. 智能偵錯版 API 呼叫 (遇到 404 會自動列出可用模型)
    // =================================================================================
    const defaultModel = 'gemini-2.5-pro';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${defaultModel}:generateContent?key=${apiKey}`;
    
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

    // ★★★ 智能偵錯核心邏輯 ★★★
    if (data.error && data.error.code === 404) {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const listRes = await fetch(listUrl);
        const listData = await listRes.json();
        
        let availableModels = "無法取得模型列表，請檢查 API Key 是否正確啟用 Generative Language API";
        if (listData.models) {
            // 過濾出支援生成內容且支援圖片的模型
            availableModels = listData.models
                .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent') && !m.name.includes('vision'))
                .map((m: any) => m.name.replace('models/', ''))
                .join(', ');
        }
        
        throw new Error(`\n⚠️ 找不到模型。您這把金鑰實際支援的模型有：\n[ ${availableModels} ]\n請告訴我名單，我幫您選最適合的！`);
    }

    if (data.error) {
        throw new Error(`Google API Error: ${data.error.message}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("AI 沒有回傳任何文字結果");
    
    const cleanJson = text.replace(/\`\`\`json|\`\`\`/g, '').trim();
    const parsedData = JSON.parse(cleanJson);

    return NextResponse.json({ success: true, data: parsedData });

  } catch (error: any) {
    console.error('OCR Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
