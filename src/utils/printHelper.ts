// src/utils/printHelper.ts

/**
 * 終極全域列印引擎 (雙軌制)
 * 1. 桌面版：同頁 DOM 置換 (In-Place DOM)，解決排版走位與殘留，並深度覆寫 Title 確保檔名。
 * 2. iPhone 版：Blob 新視窗，頂部按鈕防遮擋，並避開 CSS 誤殺。
 */
const executePrint = (htmlContent: string, title: string, isCard: boolean) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

    const customCSS = isCard 
        ? `img { max-width: 100% !important; height: auto !important; object-fit: cover !important; }
           .aspect-\\[4\\/3\\] { aspect-ratio: 4/3 !important; }
           .aspect-\\[16\\/7\\] { aspect-ratio: 16/7 !important; }`
        : `img { max-width: 100% !important; height: auto !important; object-fit: contain !important; }`;

    // =========================================================================
    // 【模式 A】: iOS PWA 或 WeChat (Blob 新視窗 + 頂部安全按鈕)
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
                    body { background: #f1f5f9 !important; }
                    .print-container { 
                        width: 100% !important; max-width: 800px; margin: 0 auto; 
                        background: white !important; color: black !important; 
                        padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); 
                        margin-top: 10px;
                    }
                    /* ★ 核心修復：只隱藏容器內的系統按鈕，不干擾外部UI ★ */
                    .print-container button, .print-container .print\\:hidden { display: none !important; }
                    * { box-shadow: none !important; text-shadow: none !important; flex-shrink: 0 !important; }
                    
                    @media print {
                        .no-print { display: none !important; }
                        body { background: white !important; }
                        .print-container { padding: 0; box-shadow: none !important; margin-top: 0 !important; }
                    }
                    ${customCSS}
                </style>
            </head>
            <body>
                <!-- ★ 頂部操作列 (.no-print 確保印出來時不會出現) ★ -->
                <div class="no-print" style="background: white; padding: 20px; border-bottom: 1px solid #e2e8f0; text-align: center; position: sticky; top: 0; z-index: 9999; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 18px; font-weight: 900;">📄 文件已準備完成</h3>
                    <p style="margin: 0 0 16px 0; color: #64748b; font-size: 13px;">請點擊下方按鈕，並於選單選擇「列印」或「儲存到檔案」</p>
                    
                    <!-- ★ 核心修復：改用 div 模擬按鈕，避免被 CSS button 隱藏 ★ -->
                    <div onclick="window.print()" style="display: inline-block; width: 100%; max-width: 350px; background: #2563eb; color: white; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 900; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
                        🖨️ 喚起列印 / 輸出 PDF
                    </div>
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
    // 【模式 B】: 桌面版 或 標準行動版 Safari
    // 回歸同頁 DOM 置換，保證排版不走位。並強力覆寫 <title> 確保檔名。
    // =========================================================================
    document.getElementById('gla-print-style')?.remove();
    document.getElementById('gla-print-zone')?.remove();

    // ★ 核心修復：深度攔截並暫存網頁標題，對抗 Next.js 路由覆寫 ★
    const originalTitle = document.title;
    document.title = title;
    const titleTag = document.querySelector('head > title');
    const originalTitleHtml = titleTag ? titleTag.innerHTML : '';
    if (titleTag) titleTag.innerHTML = title;

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
            
            /* ★ 只隱藏區域內的按鈕，不干擾外部 ★ */
            #gla-print-zone button, .print\\:hidden { display: none !important; }
            
            .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
            ${customCSS}
        }
    `;
    document.head.appendChild(style);

    const printZone = document.createElement('div');
    printZone.id = 'gla-print-zone';
    printZone.innerHTML = htmlContent;
    document.body.appendChild(printZone);

    window.getComputedStyle(printZone).display;

    // 給予瀏覽器時間抓取新的 title，再喚起列印
    setTimeout(() => {
        try {
            window.print();
        } catch (e) {
            console.error("Print failed", e);
        } finally {
            setTimeout(() => {
                // 清理 DOM
                document.getElementById('gla-print-style')?.remove();
                document.getElementById('gla-print-zone')?.remove();
                // 完美還原標題
                document.title = originalTitle;
                if (titleTag) titleTag.innerHTML = originalTitleHtml;
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
