// src/utils/printHelper.ts

/**
 * 終極全域列印引擎 (雙軌制)
 * 1. 桌面版：同頁 DOM 置換 (In-Place DOM)，保證 Tailwind 桌面排版 100% 正確，並強制鎖定檔名。
 * 2. iOS PWA 版：還原為純淨的 Blob 新視窗預覽，依賴系統原生分享選單輸出 PDF。
 */
const executePrint = (htmlContent: string, title: string, isCard: boolean) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(el => el.outerHTML).join('\n');
    const baseTag = `<base href="${window.location.origin}/">`;

    const customCSS = isCard 
        ? `img { max-width: 100% !important; height: auto !important; object-fit: cover !important; }
           .aspect-\\[4\\/3\\] { aspect-ratio: 4/3 !important; }
           .aspect-\\[16\\/7\\] { aspect-ratio: 16/7 !important; }`
        : `img { max-width: 100% !important; height: auto !important; object-fit: contain !important; }`;

    const printBaseStyles = `
        @page { size: A4 portrait; margin: 8mm !important; }
        html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .print-container { width: 100% !important; max-width: 800px; margin: 0 auto !important; background: white !important; color: black !important; }
        * { box-shadow: none !important; text-shadow: none !important; flex-shrink: 0 !important; }
        .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        /* 隱藏不想列印的元素 */
        .print-container button, .print-container .print\\:hidden, .no-print { display: none !important; }
        ${customCSS}
    `;

    // =========================================================================
    // 【模式 A】: iOS PWA 或 WeChat (還原純淨 Blob 預覽)
    // 移除了導致拉伸變形的自訂按鈕，僅保留上方簡單的文字提示。
    // =========================================================================
    if (isIOS && (isStandalone || isWeChat)) {
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
                    ${printBaseStyles}
                    body { background: #f1f5f9 !important; }
                    .print-container { 
                        padding: 15px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); 
                        margin: 15px auto !important; 
                    }
                    @media print {
                        body { background: white !important; }
                        .print-container { padding: 0 !important; box-shadow: none !important; margin: 0 auto !important; border-radius: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="no-print" style="background: white; padding: 16px; border-bottom: 1px solid #e2e8f0; text-align: center; position: sticky; top: 0; z-index: 9999; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <h3 style="margin: 0 0 4px 0; color: #1e293b; font-size: 16px; font-weight: 900;">📄 文件已準備完成</h3>
                    <p style="margin: 0; color: #3b82f6; font-size: 13px; font-weight: bold;">👉 點擊下方分享圖示，選擇「列印」或「儲存到檔案」即可輸出 PDF</p>
                </div>
                <div class="print-container">
                    ${htmlContent}
                </div>
            </body>
            </html>
        `;

        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
        return;
    }

    // =========================================================================
    // 【模式 B】: 桌面版 (同頁 DOM 置換 + 同步阻塞改名)
    // =========================================================================
    document.getElementById('gla-print-style')?.remove();
    document.getElementById('gla-print-zone')?.remove();

    // 1. 強力攔截並修改所有可能影響檔名的 Title 標籤
    const originalDocTitle = document.title;
    document.title = title;
    
    const titleTags = document.querySelectorAll('title');
    const originalTitles: string[] = [];
    titleTags.forEach(t => {
        originalTitles.push(t.innerText);
        t.innerText = title;
    });

    // 2. 注入列印樣式 (利用 @media print 隱藏主系統)
    const style = document.createElement('style');
    style.id = 'gla-print-style';
    style.innerHTML = `
        @media screen {
            #gla-print-zone { display: none !important; }
        }
        @media print {
            body > *:not(#gla-print-zone):not(#gla-print-style):not(script) { display: none !important; }
            html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; background: white !important; }
            #gla-print-zone { display: block !important; width: 100% !important; max-width: 800px; margin: 0 auto !important; background: white !important; color: black !important; }
            ${printBaseStyles}
        }
    `;
    document.head.appendChild(style);

    // 3. 注入列印內容
    const printZone = document.createElement('div');
    printZone.id = 'gla-print-zone';
    printZone.innerHTML = htmlContent;
    document.body.appendChild(printZone);

    // 4. 強制重繪
    window.getComputedStyle(printZone).display;

    // 5. 確保圖片載入，然後喚起列印
    const images = Array.from(printZone.getElementsByTagName('img'));
    const promises = images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve; 
        });
    });

    Promise.race([
        Promise.all(promises),
        new Promise(res => setTimeout(res, 1500))
    ]).then(() => {
        // 給予瀏覽器極短的時間套用新標題與樣式
        setTimeout(() => {
            try {
                // 桌面版瀏覽器執行 window.print() 時會「暫停」進程，直到使用者關閉列印視窗
                window.print();
            } catch (e) {
                console.error("Print failed", e);
            } finally {
                // 列印對話框關閉後，立刻還原所有 DOM 與標題，保證下次點擊正常且無殘留
                document.getElementById('gla-print-style')?.remove();
                document.getElementById('gla-print-zone')?.remove();
                
                document.title = originalDocTitle;
                titleTags.forEach((t, i) => {
                    t.innerText = originalTitles[i];
                });
            }
        }, 150);
    });
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
