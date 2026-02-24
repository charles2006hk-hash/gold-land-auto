// src/app/api/send-push/route.ts
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// 1. 初始化 Firebase Admin (防止重複初始化)
if (!admin.apps.length) {
    // ★★★ 請將您剛剛下載的 JSON 內容填入這裡 ★★★
    // 注意：在正式生產環境，建議使用 process.env 環境變數，這裡為了方便您測試先直接填入
    const serviceAccount = {
        projectId: "gold-land-auto", 
        clientEmail: "firebase-adminsdk-xxxxx@gold-land-auto.iam.gserviceaccount.com", // 填入 JSON 中的 client_email
        privateKey: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n'), // 填入 JSON 中的 private_key
    };

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

export async function POST(request: Request) {
    try {
        const { title, body } = await request.json();

        // 2. 從資料庫讀取所有已註冊的手機 Token
        const db = admin.firestore();
        const tokensSnap = await db.collection('artifacts').doc('gold-land-auto') // 請確認您的 App ID
            .collection('staff').doc('CHARLES_data')
            .collection('system_tokens').get(); // 這是我們剛剛第一步建立的集合

        const tokens: string[] = [];
        tokensSnap.forEach(doc => {
            const data = doc.data();
            if (data.token) tokens.push(data.token);
        });

        if (tokens.length === 0) {
            return NextResponse.json({ message: 'No devices registered' });
        }

        // 3. 發送廣播通知
        // 為了避免某個 token 失效導致全部失敗，我們使用 sendEachForMulticast (或迴圈發送)
        // 這裡示範簡單的 multicast
        const message = {
            notification: {
                title: title || '系統通知',
                body: body || '有新的更新',
            },
            tokens: tokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        
        console.log('Push success:', response.successCount);
        
        // 自動清理無效的 Token (選做)
        if (response.failureCount > 0) {
            const failedTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });
            // 這裡可以寫邏輯去資料庫刪除失效 token
            console.log('Failed tokens:', failedTokens);
        }

        return NextResponse.json({ success: true, count: response.successCount });

    } catch (error: any) {
        console.error('Push Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
