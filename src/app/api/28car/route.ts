import Database from 'better-sqlite3';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // ⚠️ 請將這裡的路徑換成您 NAS 上 28car.db 的實際絕對路徑
        // 例如: '/volume1/docker/28car_scraper/data/28car.db'
        const dbPath = process.env.DB_PATH_28CAR || './28car.db'; 
        
        const db = new Database(dbPath, { readonly: true });
        
        // 抓取最新的 1000 筆資料，避免前端一次載入過多卡頓
        const cars = db.prepare(`
            SELECT * FROM cars 
            ORDER BY last_updated DESC 
            LIMIT 1000
        `).all();

        return NextResponse.json({ success: true, data: cars });
    } catch (error) {
        console.error('讀取 28car 數據庫失敗:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
