// src/app/api/send-push/route.ts
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// 1. 初始化 Firebase Admin (防止重複初始化)
if (!admin.apps.length) {
    // ★★★ 請將您剛剛下載的 JSON 內容填入這裡 ★★★
    // 注意：在正式生產環境，建議使用 process.env 環境變數，這裡為了方便您測試先直接填入
    const serviceAccount = {
        projectId: "gold-land-push", 
        clientEmail: "firebase-adminsdk-fbsvc@gold-land-push.iam.gserviceaccount.com", // 填入 JSON 中的 client_email
        privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDIXuhx9k8pSI/K\nXSWZzDnkiW0u/dqnroKrn0hky2VfJbqvcKR6ppZ+n2OS0J5pLS+7NseTv3sTiU2t\nOiPGx9ngJtw0ScJ16bx8Ask1qc8b8lFoaH33aeGUxnw5zfDc0SBPcXbt2vP5Q9tN\n3Pd6XxjG41WshPnUgfrJvAL6NAk78SZW4K3i7oQfviUnD+N22pALoZzeocoUcsfy\nJu5Cq8SzMrxvZ4x8kxa6R22KyrfDih5zOPOghFZXeo5rcWaDO620VRuYlJZWoiUE\npHcJOohP4m2wiobFzLH2/x5zdgu6Hyu7E9njPHvzZ+FE3c2hSZosgTGDLbgsD3Ga\nUdhd1lZBAgMBAAECggEADDVEIlVog1JpeGHufY1k5Zi970QGQ3stePludr2xwndR\nBYlubA6kUrixX2uYiz32j4iJ5mWfQRR3iBtnvJ/GlZKojgMEdxyzoDanPb7H4KMF\n9L+RFTb9SIxDW15B06JmPpDiNyHFBaXtwbO53FnY751ARg+gDSOSPSJYaBgti9pM\nvdXcRUzKGYJPyNssGihsdS7aL2kmfB8cncU7zHGoAiseF2+nQxxPqhqlfGjeX3cd\n1XcHKwy7+IUcNKo2spqu7auhVPWn3bzAeFeszJoAJx85Y0K8e2ueIr0ZrayyV9NK\nFGeEObkuHVxOEm7ip/r7z+zAvV0B5wwqjC7e5/vbAQKBgQD9uvso5NRrUyyLvo0J\ndGzPDK35xmzNp7JQnil8FVwo3b+5JolKCbScl7q7F4ZP/1ARrHaer8AdfXt2qgtD\njcqcDj6OsXfWzbBzRfn6TfuRUQcnePLBnDM5nB9imJ+wAp0Ra0knn0de10Tz9YKD\n3JnBLGzNrumJThpnILGBl4tgMQKBgQDKKbz+aSpbEmy3RhXtenom9aK0MhY4CB8c\nzyi/1mjnbu0AbZ7voYGHYSrS85ja4/66GTdcLiDMfFLG3DwvFm9eLRKTRrRSEfnz\nlPvWJnRSaWMH/0tdaz51k0cOUUrpwYiFJGnpIU+WHntPWrUKHQ59lQpIIBAryT6a\ng0fLVwJjEQKBgH/tjYKx1VQDjJssyQlyVQYTu4gK/oK2QZaaGAqC7oOAQpFEl8Xn\nnNOzQKfiFYsyDBnNHcWmkTONN/m9hI5b6ELEf9AMNILuFEAakQ4d0XAULYo+Vg8+\nBSnPyJc6opDo0G6e7DR4/1AXM6HZMCPxzufx0S3nOcJLyc4jUrwnP1ORAoGASxNo\n/knr0tpqyT0b049SYbmC7MxU+AX8F+TOyz9Cwf+twCT1iyQ9SBtLnf+c2l0lMdM/\nfdobkBTzYKpVJ197iEvQxCTTvk6ytkSzqXmqZRiCEGw8frre/SbukmCaI2kd2+QD\n+PHH7oXvYS7cYJ8dzIFWyiYuGzSnLRZnyRnM5yECgYEA2dKK1VrifWgYOqDcKBLG\ndI/5vru6aMhAqYciN8Ew2ebTSjBAm7cc0iJ7pt3FHh/NDzCKzxzVEVI1WioCK+6Z\nLF08XvnnVCX/K3hI3iqefTiDvGwptNRnWQJzgy14cqlwmdXhxX/nr5gsKKNCsaea\nYmyOLUzWu8kydPIytR89FKU=\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n'), // 填入 JSON 中的 private_key
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
