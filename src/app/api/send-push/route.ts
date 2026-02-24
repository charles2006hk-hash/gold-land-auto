// src/app/api/send-push/route.ts
import { NextResponse } from 'next/server';

// ★★★ 暫時註釋掉 firebase-admin 以解決 Build 錯誤 ★★★
// import * as admin from 'firebase-admin';

export async function POST(request: Request) {
    // 這裡直接回傳成功，不做任何發送動作
    console.log("Push notification is currently disabled.");
    
    return NextResponse.json({ 
        success: true, 
        message: "Push function is temporarily disabled to fix build errors." 
    });
}
