import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid'; 

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
                // 您的真實 Bucket 名稱
                storageBucket: 'gold-land-auto.firebasestorage.app' 
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
// 2. 處理 Telegram Webhook POST 請求
// ============================================================================
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

        if (!TELEGRAM_BOT_TOKEN) {
            return NextResponse.json({ error: 'System config error' }, { status: 500 });
        }

        const message = body.message;
        if (!message) return NextResponse.json({ success: true });

        const chatId = message.chat.id;
        const caption = message.caption || ''; 

        // ====================================================
        // A. Telegram ID 對應內部系統帳號 (Staff ID)
        // ====================================================
        const STAFF_MAPPING: Record<string, string> = {
            '808508159': 'BOSS',    
            '987654321': 'CHARLES', 
            '112233445': 'EDWIN',
            '556677889': 'TOLLOY'
        };

        const uploaderId = STAFF_MAPPING[chatId.toString()] || 'UNKNOWN';

        let fileId = null;
        let fileExt = '';
        let contentType = '';
        let mediaType = 'vehicle'; 

        // ====================================================
        // B. 判斷傳入的是「圖片」還是「PDF檔案」
        // ====================================================
        if (message.photo) {
            const photoArray = message.photo;
            fileId = photoArray[photoArray.length - 1].file_id;
            fileExt = 'jpg';
            contentType = 'image/jpeg';
        } else if (message.document) {
            const doc = message.document;
            if (doc.mime_type === 'application/pdf') {
                fileId = doc.file_id;
                fileExt = 'pdf';
                contentType = 'application/pdf';
                mediaType = 'document'; 
            } else if (doc.mime_type?.startsWith('image/')) {
                fileId = doc.file_id;
                fileExt = 'jpg';
                contentType = 'image/jpeg';
            } else {
                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: `⚠️ 系統目前僅支援「相片」與「PDF 檔案」上傳喔！` })
                });
                return NextResponse.json({ success: true });
            }
        }

        // ====================================================
        // C. 執行下載、上傳與資料庫寫入邏輯
        // ====================================================
        if (fileId) {
            // ★ 修正重點：在這裡才初始化 Firebase Admin，取得 firebaseAdmin 物件
            const firebaseAdmin = initFirebaseAdmin();

            // 1. 取得檔案真實路徑
            const fileUrlRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
            const fileUrlData = await fileUrlRes.json();
            
            if (!fileUrlData.ok) throw new Error('Telegram API 回應錯誤');

            const filePath = fileUrlData.result.file_path;
            const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

            // 2. 下載檔案為 ArrayBuffer 並轉為 Node Buffer
            const fileRes = await fetch(downloadUrl);
            const arrayBuffer = await fileRes.arrayBuffer();
            const finalBuffer = Buffer.from(arrayBuffer);

            // 3. 生成專屬 Firebase 下載權杖
            const downloadToken = uuidv4();

            // 4. 上傳至 Firebase Storage
            const bucket = firebaseAdmin.storage().bucket();
            const fileName = `media/gold-land-auto/tg_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
            const file = bucket.file(fileName);

            await file.save(finalBuffer, {
                metadata: { 
                    contentType: contentType,
                    metadata: {
                        firebaseStorageDownloadTokens: downloadToken
                    }
                }
            });

            // 5. 組合帶有 Token 的正式公開網址
            const bucketName = bucket.name;
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(fileName)}?alt=media&token=${downloadToken}`;

            // 6. 寫入 Firestore 智能圖庫 (使用共用 CHARLES_data 節點)
            const db = firebaseAdmin.firestore();
            const docRef = db.collection('artifacts').doc('gold-land-auto').collection('staff').doc('CHARLES_data').collection('media_library').doc();

            const tags = ['TG極速傳圖'];
            if (caption) tags.push(caption);

            await docRef.set({
                id: docRef.id,
                url: publicUrl,
                path: fileName,
                fileName: `tg_upload_${Date.now()}.${fileExt}`,
                tags: tags,
                status: 'unassigned',
                createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
                // ★ 將上傳者精準設定為動態抓取到的員工 ID
                uploadedBy: uploaderId, 
                mediaType: mediaType 
            });

            // 7. 回傳成功訊息
            const typeText = mediaType === 'document' ? 'PDF 檔案' : '圖片';
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: `✅ ${typeText} 已成功存入 DMS 圖庫！\n(系統標籤: ${caption || '無'})`
                })
            });

            return NextResponse.json({ success: true });
        }

        // ====================================================
        // D. 處理純文字對話
        // ====================================================
        if (message.text) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: `👋 歡迎使用金田汽車 DMS 傳圖助手。\n\n📸 傳送「相片」：自動歸類為車輛圖庫。\n📄 傳送「檔案」：支援 PDF，自動歸類為文件資料庫。\n\n(發送前附上文字，會自動轉換為標籤喔 🏷️)`
                })
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
