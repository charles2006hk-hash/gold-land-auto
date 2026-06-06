import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import * as admin from 'firebase-admin';

// ★ 初始化 Firebase Admin (如果尚未初始化)
if (!admin.apps.length) {
    admin.initializeApp({
        // 注意：為了讓這段在 Vercel 順利運行，您需要在 Vercel 的 Environment Variables 中加入這兩個變數
        credential: admin.credential.cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // 處理 Vercel 環境變數中的換行符號
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET // 例如 "gold-land-auto.appspot.com"
    });
}

const adminDb = admin.firestore();
const adminStorage = admin.storage();

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const imageFile = formData.get('image') as File;
        
        if (!imageFile) {
            return NextResponse.redirect(new URL('/?toast=no-image', request.url), 303);
        }

        // 1. 將圖片轉為伺服器可處理的 Buffer
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 2. 準備存入 Firebase Storage
        const fileName = `inbox/whatsapp_shared_${Date.now()}_${uuidv4()}.jpg`;
        const fileRef = adminStorage.bucket().file(fileName);
        
        await fileRef.save(buffer, {
            metadata: { contentType: imageFile.type || 'image/jpeg' }
        });
        
        // 設定圖片為公開可讀取
        await fileRef.makePublic();
        const publicUrl = `https://storage.googleapis.com/${adminStorage.bucket().name}/${fileName}`;

        // 3. 寫入 Firestore 的 Media Library (Inbox)
        await adminDb.collection('artifacts').doc('GL_AUTO_SYSTEM_v1')
            .collection('staff').doc('CHARLES_data')
            .collection('media_library').add({
                url: publicUrl,
                type: 'Image',
                name: 'WhatsApp 快速分享',
                size: imageFile.size,
                status: 'inbox',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                isPrimary: false
            });

        // 4. 成功後，自動重新導向回系統首頁，並帶上成功提示
        return NextResponse.redirect(new URL('/?share_success=true', request.url), 303);

    } catch (error) {
        console.error("處理分享圖片失敗:", error);
        return NextResponse.redirect(new URL('/?toast=share-failed', request.url), 303);
    }
}
