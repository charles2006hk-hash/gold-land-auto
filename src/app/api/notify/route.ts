import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// 1. 初始化 Firebase Admin (確保只初始化一次)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // 處理私鑰中的換行符號 (Vercel 讀取時需要轉換)
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase Admin 初始化失敗:', error);
  }
}

export async function POST(request: Request) {
  try {
    const { tokens, title, body } = await request.json();

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ success: false, message: '沒有提供 Token' }, { status: 400 });
    }

    // 2. 設定推送訊息內容
    const message = {
      notification: {
        title: title,
        body: body,
      },
      tokens: tokens, // 支援一次過發送俾多部手機 (群發)
    };

    // 3. 發送！
    const response = await admin.messaging().sendEachForMulticast(message);
    
    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    console.error('發送通知失敗:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
