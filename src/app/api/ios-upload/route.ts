import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth'; 

// ★ 修正：如果您是 Vercel 免費版 (Hobby)，最高只能設 10。設 60 伺服器會直接報錯拒絕工作！
export const maxDuration = 10;

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
const auth = getAuth(app); 

// ==================================================================
// ★★★ 新增：API 連線測試通道 ★★★
// ==================================================================
export async function GET() {
    return NextResponse.json({ 
        success: true, 
        message: "🟢 綠燈！API 運作完全正常！Vercel 伺服器隨時準備好接收 iPhone 捷徑的請求。" 
    });
}

export async function POST(request: Request) {
    try {
        if (!auth.currentUser) {
            await signInAnonymously(auth);
        }

        const body = await request.json();
        const { fileBase64, fileName, staffId } = body;

        if (!fileBase64) {
            return NextResponse.json({ error: "沒有收到圖片資料" }, { status: 400 });
        }

        const safeFileName = fileName ? fileName.replace(/[^a-zA-Z0-9.\-_]/g, '') : 'image.jpg';
        
        const filePath = `media/gold-land-auto/ios_${Date.now()}_${safeFileName}`;
        const storageRef = ref(storage, filePath);
        
        await uploadString(storageRef, fileBase64, 'base64');
        const downloadURL = await getDownloadURL(storageRef);

        await addDoc(collection(db, 'artifacts', 'gold-land-auto', 'staff', 'CHARLES_data', 'media_library'), {
            url: downloadURL,
            path: filePath,
            fileName: fileName || 'iOS_Upload.jpg',
            tags: ["Inbox", "iPhone 捷徑"],
            status: 'unassigned',
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
