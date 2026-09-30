// src/utils/printHelper.ts

/**
 * 終極全域列印引擎 (雙軌制)
 * 1. 桌面版：使用 1200px 寬度的隱形 Iframe (確保 Tailwind 桌面排版不走位 + 鎖定檔名)。
 * 2. iOS 版：Blob 新視窗，頂部 3 個實體按鈕 (繞過 CSP 阻擋)。
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
        /* 只隱藏容器內的系統按鈕，不干擾外部UI */
        .print-container button, .print-container .print\\:hidden { display: none !important; }
        .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        ${customCSS}
    `;

    // =========================================================================
    // 【模式 A】: iOS PWA 或 WeChat (Blob 新視窗 + 頂部 3 個操作按鈕)
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
                    body { background: #f1f5f9 !important; padding-top: 80px !important; }
                    .print-container { 
                        padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); 
                        margin: 0 auto 20px auto !important; 
                    }
                    
                    /* ★ 頂部 3 個按鈕的專屬區塊 ★ */
                    .top-action-bar {
                        position: fixed; top: 0; left: 0; width: 100%;
                        background: rgba(255, 255, 255, 0.95);
                        backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
                        border-bottom: 1px solid #e2e8f0;
                        padding: 12px 16px;
                        display: flex; gap: 8px; justify-content: space-between;
                        z-index: 99999; box-shadow: 0 4px 10px rgba(0,0,0,0.05);
                    }
                    .btn-action {
                        flex: 1; padding: 12px 4px; border-radius: 10px;
                        font-size: 13px; font-weight: 900; border: none; cursor: pointer;
                        display: flex; align-items: center; justify-content: center; gap: 4px;
                    }
                    .btn-print { background: #e0e7ff; color: #4338ca; }
                    .btn-pdf { background: #2563eb; color: white; }
                    .btn-cancel { background: #fee2e2; color: #b91c1c; }
                    
                    @media print {
                        .top-action-bar { display: none !important; }
                        body { background: white !important; padding-top: 0 !important; }
                        .print-container { padding: 0 !important; box-shadow: none !important; margin-top: 0 !important; border-radius: 0; }
                    }
                </style>
            </head>
            <body>
                <!-- 頂部 3 個按鈕 -->
                <div class="top-action-bar">
                    <button id="btnPrint" class="btn-action btn-print">🖨️ 列印</button>
                    <button id="btnPdf" class="btn-action btn-pdf">📄 輸出 PDF</button>
                    <button id="btnCancel" class="btn-action btn-cancel">❌ 取消</button>
                </div>

                <div class="print-container">
                    ${htmlContent}
                </div>

                <script>
                    // ★ 核心修復：使用 JavaScript 綁定事件，防止 iOS Blob 阻擋內聯 onClick ★
                    document.getElementById('btnPrint').addEventListener('click', function() {
                        window.print();
                    });

                    document.getElementById('btnPdf').addEventListener('click', function() {
                        alert('💡 iOS 輸出 PDF 技巧：\\n\\n1. 進入列印選單後\\n2. 點擊「分享/選項」按鈕\\n3. 選擇【儲存到檔案 (Save to Files)】\\n\\n(若畫面出現預覽圖，直接雙指放大預覽圖即可儲存為 PDF)');
                        setTimeout(() => window.print(), 500);
                    });

                    document.getElementById('btnCancel').addEventListener('click', function() {
                        window.close();
                    });
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
    // 【模式 B】: 桌面版
    // 使用 1200px 隱形 Iframe：破解 Tailwind 走位，並隔離 <title> 確保檔名。
    // =========================================================================
    const iframeId = 'gla-desktop-print-iframe';
    document.getElementById(iframeId)?.remove();

    const iframe = document.createElement('iframe');
    iframe.id = iframeId;
    // ★ 核心修復：寬度強制 1200px 觸發 Tailwind 桌面版排版，並藏在畫面外 ★
    Object.assign(iframe.style, {
        position: 'fixed', right: '-2000px', bottom: '0', 
        width: '1200px', height: '100vh', border: 'none', zIndex: '-1000'
    });
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="zh-HK">
        <head>
            <meta charset="utf-8">
            <!-- ★ 獨立的 title，完全不會被 Next.js 蓋掉 ★ -->
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
            img.onerror = resolve; 
        });
    });

    // 等待圖片載入（最多2秒）
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
                // 列印對話框彈出後，給予充分時間再移除 iframe
                setTimeout(() => {
                    document.getElementById(iframeId)?.remove();
                }, 5000);
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
