import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // ★ 呼叫香港運輸署「行車時間顯示器 (第二代)」實時數據 API
        const url = 'https://resource.data.one.gov.hk/td/jss/Journeytimev2.xml';
        
        // 設定每 60 秒向政府 API 拉取一次，避免頻繁請求被封鎖
        const res = await fetch(url, { next: { revalidate: 60 } }); 
        if (!res.ok) throw new Error('無法從 DATA.GOV.HK 獲取數據');
        
        const xml = await res.text();
        
        // 使用原生正則表達式高效解析 XML，無需安裝第三方套件
        const blockRegex = /<jtis_journey_time>([\s\S]*?)<\/jtis_journey_time>/g;
        const locRegex = /<LOCATION_ID>([^<]+)<\/LOCATION_ID>/;
        const destRegex = /<DESTINATION_ID>([^<]+)<\/DESTINATION_ID>/;
        const dataRegex = /<JOURNEY_DATA>([^<]+)<\/JOURNEY_DATA>/;

        let match;
        // 準備收集各隧道的實時數據
        const times = {
            CH: { toHK: [] as number[], toKln: [] as number[] }, // 紅隧
            EH: { toHK: [] as number[], toKln: [] as number[] }, // 東隧
            WH: { toHK: [] as number[], toKln: [] as number[] }, // 西隧
            LRT: { toKln: [] as number[], toNT: [] as number[] }, // 獅隧
            TCT: { toKln: [] as number[], toNT: [] as number[] }  // 大老山
        };

        // 循環讀取 XML 裡面的每一筆行車紀錄
        while ((match = blockRegex.exec(xml)) !== null) {
            const block = match[1];
            const loc = locRegex.exec(block)?.[1]?.trim();
            const dest = destRegex.exec(block)?.[1]?.trim();
            const dataStr = dataRegex.exec(block)?.[1]?.trim();
            
            if (!loc || !dest || !dataStr) continue;
            
            const time = parseInt(dataStr, 10);
            if (isNaN(time) || time <= 0) continue; // 略過錯誤或封閉狀態
            
            // ================= 過海隧道分類 =================
            if (dest === 'CH' || dest === 'EH' || dest === 'WH') {
                if (loc.startsWith('H')) {
                    // H 開頭代表感應器在港島 (Hong Kong) -> 駛往九龍
                    times[dest as 'CH'|'EH'|'WH'].toKln.push(time);
                } else if (loc.startsWith('K')) {
                    // K 開頭代表感應器在九龍 (Kowloon) -> 駛往港島
                    times[dest as 'CH'|'EH'|'WH'].toHK.push(time);
                }
            }
            
            // ================= 新界隧道分類 =================
            if (dest === 'LRT' || dest === 'TCT') {
                if (loc.startsWith('S')) { 
                    // S 開頭代表感應器在沙田/新界 (Sha Tin) -> 駛往九龍
                    times[dest as 'LRT'|'TCT'].toKln.push(time);
                } else if (loc.startsWith('K')) {
                    // K 開頭代表感應器在九龍 (Kowloon) -> 駛往新界
                    times[dest as 'LRT'|'TCT'].toNT.push(time);
                }
            }
        }

        // 小工具：計算該區所有感應器的平均行車時間 (如果某方向無數據則顯示 '--')
        const getAvg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : '--';

        // 整理出完美對接前端的格式
        const tunnels = {
            crossHarbour: [
                { name: '紅磡隧道', short: '舊隧', toHK: getAvg(times.CH.toHK), toKln: getAvg(times.CH.toKln) },
                { name: '東區海底', short: '東隧', toHK: getAvg(times.EH.toHK), toKln: getAvg(times.EH.toKln) },
                { name: '西區海底', short: '西隧', toHK: getAvg(times.WH.toHK), toKln: getAvg(times.WH.toKln) },
            ],
            newTerritories: [
                { name: '獅子山隧', short: '獅隧', toKln: getAvg(times.LRT.toKln), toNT: getAvg(times.LRT.toNT) },
                { name: '大老山隧', short: '大老山', toKln: getAvg(times.TCT.toKln), toNT: getAvg(times.TCT.toNT) },
            ]
        };

        return NextResponse.json({ success: true, data: tunnels });
        
    } catch (error: any) {
        console.error('獲取隧道數據失敗:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
