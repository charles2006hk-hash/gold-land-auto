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
// 2. 處理 Telegram Webhook POST 請求 (高穩定原生直傳版)
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
        // 1. Telegram ID 對應內部系統帳號 (Staff ID)
        // ====================================================
        const STAFF_MAPPING: Record<string, string> = {
            // 請將左側的數字替換為你們真實的 Telegram ID
            '808508159': 'BOSS',    
            '987654321': 'CHARLES', 
            '112233445': 'EDWIN',
            '556677889': 'TOLLOY'
        };

        // 根據對應表找出上傳者，找不到則標記為 UNKNOWN 以防錯誤覆蓋
        const uploaderId = STAFF_MAPPING[chatId.toString()] || 'UNKNOWN';

        // ... (中間下載、轉 Buffer、上傳 Storage 與產生 Token 的代碼保持不變) ...

        // ====================================================
        // 2. 寫入共用圖庫 (CHARLES_data)
        // ====================================================
        const db = firebaseAdmin.firestore();
        // 保持全公司寫入同一個中央圖庫節點
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
            // ★ 動態寫入真正的上傳者 ID
            uploadedBy: uploaderId, 
            mediaType: mediaType 
        });
        
        let fileId = null;
        let fileExt = '';
        let contentType = '';
        let mediaType = 'vehicle'; 

        // ----------------------------------------------------
        // A. 判斷傳入的是「圖片」還是「PDF檔案」
        // ----------------------------------------------------
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

        // ----------------------------------------------------
        // B. 執行下載與穩定上傳邏輯 (拔除 sharp，防止 Buffer 損壞)
        // ----------------------------------------------------
        if (fileId) {
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
            // ★ 修正為系統正確的 Storage 路徑
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

            // 6. 寫入 Firestore 智能圖庫
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
                uploadedBy: 'TelegramBot',
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

        // ----------------------------------------------------
        // C. 處理純文字對話
        // ----------------------------------------------------
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
