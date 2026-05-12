import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth'; 

// ★ Vercel 免費版最高限制 10-15 秒，這個設定能確保它撐到極限不隨便斷線
export const maxDuration = 10; 

const firebaseConfig = {
  apiKey: "AIzaSyCHt7PNXd5NNh8AsdSMDzNfbvhyEsBG2YY",
  authDomain: "gold-land-auto.firebaseapp.com",
  projectId: "gold-land-auto",
  storageBucket: "gold-land-auto.firebasestorage.app",
  messagingSenderId: "817229766566",
  appId: "1:817229766566:web:73314925fe0a4d43917967"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app); 

export async function POST(request: Request) {
    try {
        // ★ 複用登入狀態，省下每次重新登入的 2 秒鐘，減少逾時機率
        if (!auth.currentUser) {
            await signInAnonymously(auth);
        }

        const body = await request.json();
        const { fileBase64, fileName, staffId } = body;

        if (!fileBase64) {
            return NextResponse.json({ error: "沒有收到圖片資料" }, { status: 400 });
        }

        // ==========================================
        // ★ 升級防呆：確保檔名乾淨，並且強制加上 .jpg 副檔名
        // ==========================================
        let safeFileName = fileName ? fileName.replace(/[^a-zA-Z0-9.\-_]/g, '') : `image_${Date.now()}`;
        if (!safeFileName.toLowerCase().endsWith('.jpg') && !safeFileName.toLowerCase().endsWith('.jpeg') && !safeFileName.toLowerCase().endsWith('.png')) {
            safeFileName += '.jpg';
        }

        const filePath = `media/gold-land-auto/ios_${Date.now()}_${safeFileName}`;
        const storageRef = ref(storage, filePath);
        
        // ==========================================
        // ★★★ 破案關鍵：強制告訴 Firebase 這是一張圖片！ ★★★
        // ==========================================
        const metadata = {
            contentType: 'image/jpeg',
        };
        
        // ★ 帶上 metadata 一起上傳，解決 application/octet-stream 問題
        await uploadString(storageRef, fileBase64, 'base64', metadata);
        const downloadURL = await getDownloadURL(storageRef);

        await addDoc(collection(db, 'artifacts', 'gold-land-auto', 'staff', 'CHARLES_data', 'media_library'), {
            url: downloadURL,
            path: filePath,
            fileName: fileName || 'iOS_Upload.jpg',
            tags: ["Inbox", "iPhone 捷徑"],
            status: 'unassigned',
            
            // ★★★ 破案關鍵：加上這個標籤，系統的「導入選單」才看得見它！ ★★★
            mediaType: 'vehicle', 
            
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
