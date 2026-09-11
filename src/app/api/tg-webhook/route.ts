import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// ============================================================================
// 1. 初始化 Firebase Admin (Singleton 模式，防止 Vercel Serverless 重複連線)
// ============================================================================
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // 處理環境變數中換行符號被轉義的問題
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
        storageBucket: 'gold-land-auto.firebasestorage.app'
    });
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// ============================================================================
// 2. 處理 Telegram 傳來的 POST 請求
// ============================================================================
export async function POST(req: Request) {
    try {
        const body = await req.json();

        // 如果沒有 Token 設定，直接報錯
        if (!TELEGRAM_BOT_TOKEN) {
            console.error('Missing TELEGRAM_BOT_TOKEN');
            return NextResponse.json({ error: 'System config error' }, { status: 500 });
        }

        // 處理圖片上傳
        if (body.message && body.message.photo) {
            const chatId = body.message.chat.id;
            const caption = body.message.caption || ''; 

            // 取最後一張 (Telegram 會給多個尺寸，最後一張畫質最高)
            const photoArray = body.message.photo;
            const largestPhoto = photoArray[photoArray.length - 1];
            const fileId = largestPhoto.file_id;

            // 取得檔案真實路徑
            const fileUrlRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
            const fileUrlData = await fileUrlRes.json();
            
            if (!fileUrlData.ok) throw new Error('Telegram API 回應錯誤');

            const filePath = fileUrlData.result.file_path;
            const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

            // 下載圖片為 Buffer
            const imgRes = await fetch(downloadUrl);
            const imgArrayBuffer = await imgRes.arrayBuffer();
            const imgBuffer = Buffer.from(imgArrayBuffer);

            // 上傳至 Firebase Storage
            const bucket = admin.storage().bucket();
            const fileName = `media_library/tg_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
            const file = bucket.file(fileName);

            await file.save(imgBuffer, {
                metadata: { contentType: 'image/jpeg' }
            });

            // 組合永久公開下載網址
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/gold-land-auto.firebasestorage.app/o/${encodeURIComponent(fileName)}?alt=media`;

            // 寫入 Firestore 智能圖庫
            const db = admin.firestore();
            const docRef = db.collection('artifacts').doc('gold-land-auto').collection('staff').doc('CHARLES_data').collection('media_library').doc();

            const tags = ['TG極速傳圖'];
            if (caption) tags.push(caption);

            await docRef.set({
                id: docRef.id,
                url: publicUrl,
                path: fileName,
                fileName: `tg_upload_${Date.now()}.jpg`,
                tags: tags,
                status: 'unassigned', // 標記未分配
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                uploadedBy: 'TelegramBot',
                mediaType: 'vehicle'
            });

            // 回傳成功訊息給 Telegram 使用者
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: `✅ 圖片已成功存入 DMS 圖庫！\n(系統標籤: ${caption || '無'})`
                })
            });

            return NextResponse.json({ success: true });
        }

        // 處理純文字對話 (非圖片)
        if (body.message && body.message.text) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: body.message.chat.id,
                    text: `👋 歡迎使用金田汽車 DMS 傳圖助手。\n\n請在手機相簿選擇車輛照片，點擊「分享」➜「Telegram」發給我，照片就會瞬間同步到系統圖庫！\n(附上文字會自動變成標籤喔 🏷️)`
                })
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
