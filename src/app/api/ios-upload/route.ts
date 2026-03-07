import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';

// 系統的 Firebase 設定 (與您 page.tsx 相同)
const firebaseConfig = {
  apiKey: "AIzaSyCHt7PNXd5NNh8AsdSMDzNfbvhyEsBG2YY",
  authDomain: "gold-land-auto.firebaseapp.com",
  projectId: "gold-land-auto",
  storageBucket: "gold-land-auto.firebasestorage.app",
  messagingSenderId: "817229766566",
  appId: "1:817229766566:web:73314925fe0a4d43917967"
};

// 初始化 Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export async function POST(request: Request) {
    try {
        // 接收來自 iPhone 捷徑的資料
        const body = await request.json();
        const { fileBase64, fileName, staffId } = body;

        if (!fileBase64) {
            return NextResponse.json({ error: "沒有收到圖片資料" }, { status: 400 });
        }

        // 1. 上傳圖片到 Firebase Storage
        const filePath = `media/gold-land-auto/ios_${Date.now()}_${fileName || 'image.jpg'}`;
        const storageRef = ref(storage, filePath);
        
        // 將 Base64 解碼並上傳
        await uploadString(storageRef, fileBase64, 'base64');
        
        // 取得下載網址
        const downloadURL = await getDownloadURL(storageRef);

        // 2. 寫入資料庫的「智能圖庫 (Media Library) 待處理區」
        await addDoc(collection(db, 'artifacts', 'gold-land-auto', 'staff', 'CHARLES_data', 'media_library'), {
            url: downloadURL,
            path: filePath,
            fileName: fileName || 'iOS_Upload.jpg',
            tags: ["Inbox", "iPhone 捷徑"],
            status: 'unassigned', // 標記為待處理區
            aiData: {},
            createdAt: serverTimestamp(),
            uploadedBy: staffId || 'BOSS'
        });

        return NextResponse.json({ success: true, message: "上傳成功" });

    } catch (error: any) {
        console.error("iOS Upload API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
