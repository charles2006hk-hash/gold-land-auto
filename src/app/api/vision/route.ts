// src/app/api/vision/route.ts
import { NextResponse } from 'next/server';

// 這是後端 API 入口
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // --- 模擬 AI 分析過程 (在此處串接 Google Vision API 或 OpenAI) ---
    // 這裡我們模擬 AI "看懂了" 這張圖
    // 真實環境會呼叫: await openai.chat.completions.create({ ... })
    
    console.log("正在分析圖片:", imageUrl);
    
    // 模擬延遲，讓體驗更真實
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 模擬回傳的 AI 數據 (隨機生成，讓你測試 UI)
    const mockAnalysis = [
        {
            tags: ['Toyota', 'Alphard', 'White', 'Exterior', 'Front'],
            make: 'Toyota',
            model: 'Alphard',
            color: 'White'
        },
        {
            tags: ['Honda', 'Stepwgn', 'Black', 'Interior', 'Dashboard'],
            make: 'Honda',
            model: 'Stepwgn',
            color: 'Black'
        }
    ];
    
    // 隨機選一個結果回傳
    const result = mockAnalysis[Math.floor(Math.random() * mockAnalysis.length)];

    return NextResponse.json({ 
      success: true, 
      data: result 
    });

  } catch (error) {
    console.error('AI Vision Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
