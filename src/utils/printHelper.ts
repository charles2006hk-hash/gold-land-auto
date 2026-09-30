// src/utils/printHelper.ts

/**
 * 終極全域列印引擎 (雙軌制：In-Place DOM + PWA Safari 橋接)
 * 加入底部原生操作列 (Bottom Action Bar)，提供明確的「列印」與「輸出 PDF」按鈕。
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
    // 【模式 A】: iOS PWA 或 內建瀏覽器
    // 注入底部操作列 (Bottom Action Bar)，讓使用者可以明確點擊
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
                    html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; background: #f8fafc !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    
                    /* 確保底部按鈕不會遮擋內容 */
                    @media screen {
                        body { padding-bottom: 120px !important; }
                        .print-container { margin-top: 10px !important; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                    }

                    .print-container { width: 100% !important; max-width: 800px; margin: 0 auto !important; background: white !important; color: black !important; padding: 15px; }
                    * { box-shadow: none !important; text-shadow: none !important; flex-shrink: 0 !important; }
                    .print\\:hidden { display: none !important; }
                    .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
                    ${customCSS}

                    /* --- 注入的底部操作列樣式 --- */
                    .bottom-action-bar {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        width: 100%;
                        background: rgba(255, 255, 255, 0.95);
                        backdrop-filter: blur(10px);
                        -webkit-backdrop-filter: blur(10px);
                        border-top: 1px solid #e2e8f0;
                        padding: 16px 20px;
                        padding-bottom: calc(16px + env(safe-area-inset-bottom));
                        display: flex;
                        gap: 12px;
                        z-index: 99999;
                        box-shadow: 0 -10px 15px -3px rgba(0,0,0,0.05);
                    }
                    .action-btn {
                        flex: 1;
                        padding: 16px 0;
                        border-radius: 14px;
                        font-size: 16px;
                        font-weight: 900;
                        border: none;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        transition: transform 0.1s;
                    }
                    .action-btn:active { transform: scale(0.95); }
                    .btn-print { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
                    .btn-pdf { background: #2563eb; color: white; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); }
                    
                    /* 列印時強制隱藏按鈕區塊 */
                    @media print {
                        .bottom-action-bar { display: none !important; }
                        body { padding-bottom: 0 !important; background: white !important; }
                        .print-container { box-shadow: none !important; margin-top: 0 !important; }
                    }
                </style>
            </head>
            <body>
                <div class="print-container">
                    ${htmlContent}
                </div>

                <!-- 注入的底部操作列 -->
                <div class="bottom-action-bar print:hidden">
                    <button class="action-btn btn-print" onclick="window.print()">🖨️ 列印</button>
                    <button class="action-btn btn-pdf" onclick="handlePDF()">📄 輸出 PDF</button>
                </div>

                <script>
                    // 處理輸出 PDF 的提示與觸發
                    function handlePDF() {
                        // 在 iOS 上，呼叫列印就是儲存 PDF 的入口，給予友善提示
                        alert('💡 iOS 系統提示：\\n\\n請在接下來彈出的畫面中，選擇【儲存到檔案 (Save to Files)】，即可完美匯出 PDF！');
                        setTimeout(() => {
                            window.print();
                        }, 300);
                    }

                    // 確保圖片就緒
                    window.onload = function() {
                        // 此處僅確保圖片載入，不需要自動彈出，等待用戶點擊按鈕
                    };
                </script>
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
    // 維持原本極速的同頁 DOM 注入 (In-Place DOM Injection)
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

    window.getComputedStyle(printZone).display;

    setTimeout(() => {
        try {
            window.print();
        } catch (e) {
            console.error("Print failed", e);
        } finally {
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
