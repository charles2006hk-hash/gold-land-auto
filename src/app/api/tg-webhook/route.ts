import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// 1. 建立安全的 Firebase 初始化函數 (對齊 Vercel 環境變數版)
// ============================================================================
// ============================================================================
// 1. 建立安全的 Firebase 初始化函數
// ============================================================================
function initFirebaseAdmin() {
    if (!admin.apps.length) {
        try {
            if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
                throw new Error('缺少 Firebase 環境變數');
            }

            let privateKey = process.env.FIREBASE_PRIVATE_KEY;
            privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
                // ★ 修正：Firebase 預設的 Bucket 後綴通常是 .appspot.com
                storageBucket: 'gold-land-auto.appspot.com' 
            });
            console.log('✅ Firebase Admin 初始化成功');
        } catch (error) {
            console.error('❌ Firebase Admin 初始化失敗:', error);
            throw error;
        }
    }
    return admin;
}

// ============================================================================
// 2. 處理 Telegram Webhook POST 請求 (支援圖片自動壓縮與 PDF)
// ============================================================================
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

        if (!TELEGRAM_BOT_TOKEN) {
            console.error('Missing TELEGRAM_BOT_TOKEN');
            return NextResponse.json({ error: 'System config error' }, { status: 500 });
        }

        const message = body.message;
        if (!message) return NextResponse.json({ success: true });

        const chatId = message.chat.id;
        const caption = message.caption || ''; 

        let fileId = null;
        let fileExt = '';
        let contentType = '';
        let mediaType = 'vehicle'; // 預設歸類為車輛照片
        let isImage = false;

        // ----------------------------------------------------
        // A. 判斷傳入的是「圖片」還是「PDF檔案」
        // ----------------------------------------------------
        if (message.photo) {
            // 處理一般發送的照片 (取最高畫質)
            const photoArray = message.photo;
            fileId = photoArray[photoArray.length - 1].file_id;
            fileExt = 'jpg';
            contentType = 'image/jpeg';
            isImage = true;
        } else if (message.document) {
            // 處理以「檔案」形式發送的物件 (PDF 或 原畫質圖片)
            const doc = message.document;
            if (doc.mime_type === 'application/pdf') {
                fileId = doc.file_id;
                fileExt = 'pdf';
                contentType = 'application/pdf';
                mediaType = 'document'; // 將其歸類為文件，方便智能圖庫分區
            } else if (doc.mime_type?.startsWith('image/')) {
                fileId = doc.file_id;
                fileExt = 'jpg';
                contentType = 'image/jpeg';
                isImage = true;
            } else {
                // 不支援的檔案格式，回覆提示
                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: `⚠️ 系統目前僅支援「相片」與「PDF 檔案」上傳喔！` })
                });
                return NextResponse.json({ success: true });
            }
        }

        // ----------------------------------------------------
        // B. 執行下載、壓縮與上傳邏輯
        // ----------------------------------------------------
        if (fileId) {
            const firebaseAdmin = initFirebaseAdmin();

            // 1. 取得檔案真實路徑
            const fileUrlRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
            const fileUrlData = await fileUrlRes.json();
            
            if (!fileUrlData.ok) throw new Error('Telegram API 回應錯誤');

            const filePath = fileUrlData.result.file_path;
            const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

            // 2. 下載檔案為 Buffer
            const fileRes = await fetch(downloadUrl);
            const arrayBuffer = await fileRes.arrayBuffer();
            // 顯式宣告為 any 或明確轉型，繞過 TS 嚴格的 ArrayBufferLike 檢查
            let finalBuffer: any = Buffer.from(arrayBuffer);

            // 3. ★ AI 智能壓縮引擎：如果是圖片，透過 sharp 進行極速壓縮
            if (isImage) {
                finalBuffer = (await sharp(finalBuffer)
                    .resize({ width: 1600, withoutEnlargement: true }) // 限制最大寬度，防止超大圖佔空間
                    .jpeg({ quality: 80, mozjpeg: true })              // 轉換為 JPEG 並以 80% 質量壓縮
                    .toBuffer()) as Buffer;
            }
            // 4. 上傳至 Firebase Storage 並注入授權 Token
            const bucket = firebaseAdmin.storage().bucket();
            const fileName = `media_library/tg_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
            const file = bucket.file(fileName);

            // ★ 核心修復：手動生成 Firebase Download Token
            const downloadToken = uuidv4();

            await file.save(finalBuffer, {
                metadata: { 
                    contentType: contentType,
                    metadata: {
                        firebaseStorageDownloadTokens: downloadToken // 注入 Token 繞過安全規則
                    }
                }
            });

            // ★ 將 Token 附加到網址尾端，完美模擬前端上傳網址格式
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media&token=${downloadToken}`;

            // 5. 寫入 Firestore 智能圖庫 (補回這兩行！)
            const db = firebaseAdmin.firestore();
            const docRef = db.collection('artifacts').doc('gold-land-auto').collection('staff').doc('CHARLES_data').collection('media_library').doc();

            const tags = ['TG極速傳遞'];
            if (caption) tags.push(caption);

            await docRef.set({
                id: docRef.id,
                url: publicUrl,
                path: fileName,
                fileName: `tg_upload_${Date.now()}.${fileExt}`,
                tags: tags,
                status: 'unassigned',
                createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
                uploadedBy: 'TelegramBot',
                mediaType: mediaType // 智能區分是 vehicle (照片) 還是 document (PDF)
            });

            // 6. 回傳成功訊息
            const typeText = isImage ? '圖片' : 'PDF 檔案';
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: `✅ ${typeText} 已成功壓縮並存入 DMS 圖庫！\n(系統標籤: ${caption || '無'})`
                })
            });

            return NextResponse.json({ success: true });
        }

        // ----------------------------------------------------
        // C. 處理純文字對話 (歡迎與提示語)
        // ----------------------------------------------------
        if (message.text) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: `👋 歡迎使用金田汽車 DMS 傳圖助手。\n\n📸 傳送「相片」：系統會自動為您壓縮並歸類為車輛圖庫。\n📄 傳送「檔案」：支援 PDF 格式，會自動歸類為文件資料庫。\n\n(發送前附上文字，系統會自動轉換為標籤喔 🏷️)`
                })
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
