// src/app/api/passengers/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // 確保每次請求都抓取最新資料

export async function GET() {
    try {
        const response = await fetch('https://secure1.info.gov.hk/immd/mobileapps/2bb9ae17/data/CPQueueTimeR.json', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                // 偽裝成普通瀏覽器，避免被政府伺服器阻擋
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Government API responded with status: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Passenger API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
