// src/utils/printHelper.ts

/**
 * 終極全域列印引擎 (雙軌制：Hidden Iframe + iOS Blob 頂部按鈕)
 * 1. 桌面版：使用隱形 Iframe，完美隔離 CSS 防走位，且 100% 保證 PDF 檔名正確。
 * 2. iOS 版：使用 Blob 開啟，操作按鈕置頂防遮擋。
 */
const executePrint = (htmlContent: string, title: string, isCard: boolean) => {
    // 1. 偵測環境
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

    // 2. 共通 CSS 處理
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
        .print\\:hidden, button { display: none !important; }
        .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        ${customCSS}
    `;

    // =========================================================================
    // 【模式 A】: iOS PWA 或 內建瀏覽器
    // 將操作按鈕放在 DOM 最頂端，保證絕對不會被 iOS 底部導航列遮擋
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
                    /* 手機版預覽時加入微調，讓上方按鈕區塊更好看 */
                    @media screen {
                        body { background: #f1f5f9 !important; }
                        .print-container { padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-top: 10px !important; }
                    }
                </style>
            </head>
            <body>
                <!-- ★ 頂部操作列：絕對不會被遮擋 ★ -->
                <div class="print:hidden" style="background: white; padding: 20px; border-bottom: 1px solid #e2e8f0; text-align: center; position: sticky; top: 0; z-index: 999; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 18px; font-weight: 900;">📄 文件已準備完成</h3>
                    <p style="margin: 0 0 16px 0; color: #64748b; font-size: 13px;">請點擊下方按鈕，並於選單選擇「列印」或「儲存到檔案 (PDF)」</p>
                    <button onclick="window.print()" style="width: 100%; max-width: 350px; background: #2563eb; color: white; border: none; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 900; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
                        🖨️ 喚起列印 / 輸出 PDF
                    </button>
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
    // 【模式 B】: 桌面版 或 一般瀏覽器
    // 使用隱形 Iframe：完美隔離 CSS 避免排版走位，且能獨立指定 <title> 確保檔名正確
    // =========================================================================
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="zh-HK">
        <head>
            <meta charset="utf-8">
            <!-- ★ 這裡寫入的 title 就是儲存 PDF 時的絕對檔名 ★ -->
            <title>${title}</title>
            ${baseTag}
            ${styles}
            <style>${printBaseStyles}</style>
        </head>
        <body>
            <div class="print-container">
                ${htmlContent}
            </div>
        </body>
        </html>
    `);
    iframeDoc.close();

    // 確保圖片載入完成，防白圖
    const images = Array.from(iframeDoc.images);
    const promises = images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve; // 容錯放行
        });
    });

    // 最多等 2 秒，超時強制印
    Promise.race([
        Promise.all(promises),
        new Promise(res => setTimeout(res, 2000))
    ]).then(() => {
        setTimeout(() => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (e) {
                console.error("Print failed", e);
            } finally {
                // 列印完畢後，安全移除 iframe 不留痕跡
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 1000);
            }
        }, 300);
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
