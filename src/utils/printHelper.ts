// src/utils/printHelper.ts

/**
 * 終極全域列印引擎 (雙軌制：In-Place DOM + PWA Safari 橋接)
 * 徹底解決 iOS PWA 靜默攔截、桌面版視窗殘留，並支援完美排版。
 */
const executePrint = (htmlContent: string, title: string, isCard: boolean) => {
    // 1. 偵測裝置與執行環境
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

    // 2. 共通的排版樣式處理
    const customCSS = isCard 
        ? `img { max-width: 100% !important; height: auto !important; object-fit: cover !important; }
           .aspect-\\[4\\/3\\] { aspect-ratio: 4/3 !important; }
           .aspect-\\[16\\/7\\] { aspect-ratio: 16/7 !important; }`
        : `img { max-width: 100% !important; height: auto !important; object-fit: contain !important; }`;

    // =========================================================================
    // 【模式 A】: iOS PWA 或 內建瀏覽器 (無法使用 window.print)
    // 策略: 將 HTML 打包成 Blob，透過 target="_blank" 強制喚起 SFSafariViewController
    // 用戶可以在這個原生預覽視窗中，使用底層分享選單來「列印」或「存為 PDF」。
    // =========================================================================
    if (isIOS && (isStandalone || isWeChat)) {
        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map(el => el.outerHTML).join('\n');
        const baseTag = `<base href="${window.location.origin}/">`;

        const fullHtml = `
            <!DOCTYPE html>
            <html lang="zh-HK">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <title>${title}</title>
                ${baseTag}
                ${styles}
                <style>
                    @page { size: A4 portrait; margin: 8mm !important; }
                    html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .print-container { width: 100% !important; max-width: 800px; margin: 0 auto !important; background: white !important; color: black !important; padding: 15px; }
                    * { box-shadow: none !important; text-shadow: none !important; flex-shrink: 0 !important; }
                    .print\\:hidden, button { display: none !important; }
                    .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
                    ${customCSS}
                </style>
            </head>
            <body>
                <!-- PWA 專屬友善引導列 (列印時會自動隱藏) -->
                <div class="print:hidden" style="background-color: #f8fafc; padding: 16px; border-bottom: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; position: sticky; top: 0; z-index: 50; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <p style="margin: 0; font-weight: bold; color: #1e293b; font-size: 15px;">📄 單據已準備完成</p>
                    <p style="margin: 6px 0 0 0; color: #3b82f6; font-size: 13px; font-weight: bold;">👉 請點擊下方（或右上角）的「分享圖示 📤」，選擇「列印」或「儲存為 PDF」</p>
                </div>
                <div class="print-container">
                    ${htmlContent}
                </div>
            </body>
            </html>
        `;

        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        
        // 創造隱藏的超連結並觸發點擊
        const a = document.createElement('a');
        a.href = blobUrl;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // 延遲釋放記憶體
        setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
        return;
    }

    // =========================================================================
    // 【模式 B】: 桌面版 或 標準行動版 Safari (完全支援原生 window.print)
    // 策略: 同頁 DOM 注入 (In-Place DOM Injection)
    // 最完美無殘留，印完或取消後立刻復原畫面，沒有彈窗煩惱。
    // =========================================================================
    document.getElementById('gla-print-style')?.remove();
    document.getElementById('gla-print-zone')?.remove();

    const originalTitle = document.title;
    document.title = title;

    const style = document.createElement('style');
    style.id = 'gla-print-style';
    style.innerHTML = `
        @media screen {
            #gla-print-zone { display: none !important; }
        }
        @media print {
            body > *:not(#gla-print-zone):not(#gla-print-style):not(script) { display: none !important; }
            html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            #gla-print-zone { display: block !important; width: 100% !important; max-width: 800px; margin: 0 auto !important; background: white !important; color: black !important; }
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

    // 強制計算佈局
    window.getComputedStyle(printZone).display;

    // 極速觸發列印對話框
    setTimeout(() => {
        try {
            window.print();
        } catch (e) {
            console.error("Print failed", e);
        } finally {
            // 列印選單關閉後 (或取消後)，自動清理 DOM 恢復原狀
            setTimeout(() => {
                document.getElementById('gla-print-style')?.remove();
                document.getElementById('gla-print-zone')?.remove();
                document.title = originalTitle;
            }, 1000);
        }
    }, 150);
};

// ==========================================
// 匯出功能
// ==========================================

export const triggerCardPrint = async (htmlContent: string, title: string = 'Document') => {
    executePrint(htmlContent, title, true);
};

export const triggerSmartPrint = async (htmlContent: string, title: string = 'Document') => {
    executePrint(htmlContent, title, false);
};
