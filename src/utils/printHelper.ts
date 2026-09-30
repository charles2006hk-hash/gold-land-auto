// src/utils/printHelper.ts

/**
 * 終極全域列印引擎
 * 1. 桌面版：使用 Off-Screen 1024px Iframe，完美隔離 Next.js 標題干擾，並強制鎖定 Tailwind 桌面版排版防走位。
 * 2. iPhone 版：依照需求，回歸純淨的 Blob 預覽頁面，讓使用者自行透過系統選單分享/輸出 PDF。
 */
const executePrint = (htmlContent: string, title: string, isCard: boolean) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(el => el.outerHTML).join('\n');
    const baseTag = `<base href="${window.location.origin}/">`;

    // 針對圖片走位的強力修正
    const customCSS = isCard 
        ? `img { max-width: 100% !important; height: 100% !important; object-fit: cover !important; }
           .aspect-\\[4\\/3\\] { aspect-ratio: 4/3 !important; }
           .aspect-\\[16\\/7\\] { aspect-ratio: 16/7 !important; }`
        : `img { max-width: 100% !important; height: auto !important; object-fit: contain !important; }`;

    // =========================================================================
    // 【模式 A】: iPhone / iOS PWA / WeChat (純淨 Blob 預覽)
    // 移除會變形的按鈕，還原為最乾淨的預覽畫面，指引使用者用底層 Safari 分享功能
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
                    @page { size: A4 portrait; margin: 8mm !important; }
                    body { background: #f1f5f9 !important; }
                    .print-container { 
                        width: 100% !important; max-width: 800px; margin: 15px auto !important; 
                        background: white !important; color: black !important; 
                        padding: 15px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); 
                    }
                    .print\\:hidden, button, .no-print { display: none !important; }
                    * { box-shadow: none !important; text-shadow: none !important; flex-shrink: 0 !important; }
                    ${customCSS}
                </style>
            </head>
            <body>
                <div class="no-print" style="background: white; padding: 16px; border-bottom: 1px solid #e2e8f0; text-align: center; position: sticky; top: 0; z-index: 9999; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <h3 style="margin: 0 0 4px 0; color: #1e293b; font-size: 16px; font-weight: 900;">📄 文件已準備完成</h3>
                    <p style="margin: 0; color: #3b82f6; font-size: 13px; font-weight: bold;">👉 請點擊下方「分享圖示」，選擇「列印」或「儲存到檔案」即可輸出 PDF</p>
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
    // 【模式 B】: 桌面版 (Off-Screen Desktop Iframe)
    // 徹底解決檔名覆寫與 Tailwind 佈局擠壓問題
    // =========================================================================
    const iframeId = 'gla-print-iframe-v3';
    document.getElementById(iframeId)?.remove();

    const iframe = document.createElement('iframe');
    iframe.id = iframeId;
    
    // ★ 關鍵 1：強制 iframe 為 1024px 寬，並隱藏到螢幕外。這能騙過 Tailwind 渲染完美的桌面版排版。
    Object.assign(iframe.style, {
        position: 'fixed', right: '-3000px', bottom: '0', 
        width: '1024px', height: '100vh', border: 'none', zIndex: '-1000'
    });
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) return;

    // ★ 關鍵 2：在這個獨立的 iframe 中寫入 HTML，<title> 絕對不會被 Next.js 污染，確保 PDF 檔名正確。
    iframeDoc.open();
    iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="zh-HK">
        <head>
            <meta charset="utf-8">
            <title>${title}</title>
            ${baseTag}
            ${styles}
            <style>
                @page { size: auto; margin: 8mm; }
                /* 強制鎖死寬度，瀏覽器列印引擎會自動等比縮小放進 A4 紙 */
                html, body { 
                    width: 1024px !important; min-width: 1024px !important; 
                    margin: 0 !important; padding: 0 !important; 
                    background: white !important; 
                    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; 
                }
                .print-container { 
                    width: 1024px !important; max-width: 1024px !important; 
                    margin: 0 auto !important; padding: 20px !important; 
                    background: white !important; color: black !important; 
                }
                * { box-shadow: none !important; text-shadow: none !important; }
                .print\\:hidden, button, .no-print { display: none !important; }
                .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
                ${customCSS}
            </style>
        </head>
        <body>
            <div class="print-container">
                ${htmlContent}
            </div>
        </body>
        </html>
    `);
    iframeDoc.close();

    // 確保 Iframe 內的圖片全數載入，避免破圖
    const images = Array.from(iframeDoc.images);
    const promises = images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
    });

    Promise.race([
        Promise.all(promises),
        new Promise(res => setTimeout(res, 2000))
    ]).then(() => {
        // 給予瀏覽器 0.5 秒重新計算排版
        setTimeout(() => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (e) {
                console.error("Print failed", e);
            } finally {
                // 列印對話框關閉後安全清理
                setTimeout(() => {
                    document.getElementById(iframeId)?.remove();
                }, 2000);
            }
        }, 500);
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
