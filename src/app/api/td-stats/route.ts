// src/app/api/td-stats/route.ts
import { NextResponse } from 'next/server';

// 假設我們需要抓取的政府資料 API (這裡使用 DATA.GOV.HK 的 CKAN API 架構作為範例)
// 真實應用中，您可以在 data.gov.hk 搜尋「按車輛特徵劃分的首次登記機動車輛」取得真實 CSV/JSON 連結
const HK_DATA_GOV_URL = 'https://data.gov.hk/tc-data/dataset/hk-td-pub_1-vehicleregistration';

// 簡單的記憶體快取，避免每次載入首頁都去 Call 政府 API
let cachedData: any = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 快取 24 小時

export async function GET() {
    try {
        const now = Date.now();
        
        // 1. 檢查快取是否有效
        if (cachedData && (now - lastFetchTime < CACHE_DURATION)) {
            return NextResponse.json(cachedData);
        }

        /* * ========================================================
         * 實戰接接指南：
         * 這裡未來可以換成 fetch() 真實的政府 API 網址並解析 CSV/JSON。
         * const response = await fetch('政府真實API_URL');
         * const rawData = await response.json();
         * ========================================================
         */

        // 2. 模擬政府數據處理邏輯 (香港運輸署數據通常延遲 1-2 個月)
        const targetMonth = new Date().getMonth() === 0 ? 12 : new Date().getMonth(); 
        
        // 在這裡，我們模擬解析出來的當月「私家車首次登記」數據
        // (近年月香港 EV 佔比高達 6-7 成以上，這裡給出一組非常貼近現實的數據)
        const parsedStats = {
            month: targetMonth,
            evCount: '2,845',
            petrolCount: '912',
            total: '3,757',
            lastUpdated: new Date().toISOString()
        };

        // 3. 更新快取
        cachedData = parsedStats;
        lastFetchTime = now;

        // 4. 回傳乾淨的 JSON 給前端
        return NextResponse.json(parsedStats);

    } catch (error: any) {
        console.error('TD Stats API Error:', error);
        // 如果抓取失敗，回傳友善的錯誤格式，前端不會崩潰
        return NextResponse.json(
            { error: 'Failed to fetch transport department statistics', month: '-', evCount: 'N/A', petrolCount: 'N/A', total: 'N/A' },
            { status: 500 }
        );
    }
}
