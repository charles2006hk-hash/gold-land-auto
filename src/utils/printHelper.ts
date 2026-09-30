// src/utils/printHelper.ts

/**
 * 終極全域列印引擎 (In-Place DOM Injection + 極速觸發機制)
 * 徹底解決 iOS 靜默攔截、桌面版視窗殘留，並智能引導 PWA 限制。
 */
const executeInPlacePrint = (htmlContent: string, title: string, isCard: boolean) => {
    // ==========================================
    // 1. 智能偵測 PWA (加到主畫面) 或 In-App 瀏覽器
    // ==========================================
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
    const isIOSPWA = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    if (isIOSPWA || isWeChat) {
        alert('⚠️ 系統偵測到您目前處於「加到主畫面」或「App內建」模式。\n\nApple 系統底層在此模式下不支援列印功能。\n\n👉 解決方案：請點擊右上角選單，選擇【在 Safari 中開啟】，即可正常列印與輸出完美 PDF！');
        return;
    }

    // ==========================================
    // 2. DOM 注入與樣式準備
    // ==========================================
    document.getElementById('gla-print-style')?.remove();
    document.getElementById('gla-print-zone')?.remove();

    const originalTitle = document.title;
    document.title = title; // 暫時修改標題，讓輸出的 PDF 檔名正確

    const customCSS = isCard 
        ? `img { max-width: 100% !important; height: auto !important; object-fit: cover !important; }
           .aspect-\\[4\\/3\\] { aspect-ratio: 4/3 !important; }
           .aspect-\\[16\\/7\\] { aspect-ratio: 16/7 !important; }`
        : `img { max-width: 100% !important; height: auto !important; object-fit: contain !important; }`;

    const style = document.createElement('style');
    style.id = 'gla-print-style';
    style.innerHTML = `
        @media screen {
            #gla-print-zone { display: none !important; }
        }
        @media print {
            body > *:not(#gla-print-zone):not(#gla-print-style):not(script) {
                display: none !important;
            }
            html, body { 
                width: 100% !important; margin: 0 !important; padding: 0 !important; 
                background: white !important; 
                -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; 
            }
            #gla-print-zone {
                display: block !important; width: 100% !important; max-width: 800px; 
                margin: 0 auto !important; background: white !important; color: black !important;
            }
            @page { size: A4 portrait; margin: 8mm !important; }
            * { box-shadow: none !important; text-shadow: none !important; flex-shrink: 0 !important; }
            .print\\:hidden, button { display: none !important; }
            .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
            ${customCSS}
        }
    `;
    document.head.appendChild(style);

    const printZone = document.createElement('div');
    printZone.id = 'gla-print-zone';
    printZone.innerHTML = htmlContent;
    document.body.appendChild(printZone);

    // 強制瀏覽器立即計算佈局
    window.getComputedStyle(printZone).display;

    // ==========================================
    // 3. 極速觸發列印 (破解 iOS 非同步攔截)
    // ==========================================
    // 不再使用 Promise 等待圖片，直接在 50ms 後執行，確保落在 iOS 的「信任操作」時間窗內
    setTimeout(() => {
        try {
            window.print();
        } catch (e) {
            console.error("Print failed", e);
        } finally {
            // 列印選單關閉後 (或取消後)，延遲清理 DOM，完美還原主系統畫面
            setTimeout(() => {
                document.getElementById('gla-print-style')?.remove();
                document.getElementById('gla-print-zone')?.remove();
                document.title = originalTitle;
            }, 1000);
        }
    }, 50);
};

// ==========================================
// 匯出功能
// ==========================================

export const triggerCardPrint = async (htmlContent: string, title: string = 'Document') => {
    executeInPlacePrint(htmlContent, title, true);
};

export const triggerSmartPrint = async (htmlContent: string, title: string = 'Document') => {
    executeInPlacePrint(htmlContent, title, false);
};
