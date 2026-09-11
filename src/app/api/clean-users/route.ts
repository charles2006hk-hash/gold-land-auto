import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// 1. 初始化 Firebase Admin
function initFirebaseAdmin() {
    if (!admin.apps.length) {
        let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
        privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            })
        });
    }
    return admin;
}

// 2. 使用 GET 請求，方便你直接用瀏覽器觸發
export async function GET() {
    try {
        const firebaseAdmin = initFirebaseAdmin();
        const auth = firebaseAdmin.auth();
        
        let deletedCount = 0;
        let pageToken = undefined;

        // 迴圈分頁抓取與刪除
        do {
            const listUsersResult = await auth.listUsers(1000, pageToken);
            
            // 找出沒有綁定任何第三方/Email的匿名帳號
            const anonymousUsers = listUsersResult.users.filter(u => u.providerData.length === 0);
            const uidsToDelete = anonymousUsers.map(u => u.uid);

            if (uidsToDelete.length > 0) {
                const deleteResult = await auth.deleteUsers(uidsToDelete);
                deletedCount += deleteResult.successCount;
            }
            
            pageToken = listUsersResult.pageToken;
        } while (pageToken);

        return NextResponse.json({ 
            success: true, 
            message: `清理完成！總共刪除了 ${deletedCount} 個匿名帳號。` 
        });

    } catch (error: any) {
        console.error('清理失敗:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
