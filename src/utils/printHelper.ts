// src/utils/printHelper.ts

/**
 * 終極全域列印引擎
 * 1. 桌面版：同頁 DOM 置換，強制寬度 1024px 破解 Tailwind 手機版走位，並強制攔截 Next.js 標題。
 * 2. iOS 版：純淨 Blob 預覽，依賴原生分享選單，無走位按鈕。
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

    // =========================================================================
    // 【模式 A】: iOS PWA 或 WeChat (乾淨 Blob 預覽)
    // 移除所有按鈕，還原乾淨畫面，引導使用者使用系統分享
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
                    <p style="margin: 0; color: #3b82f6; font-size: 13px; font-weight: bold;">👉 點擊下方「分享圖示」，選擇「列印」或「儲存到檔案」即可輸出 PDF</p>
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
    // 【模式 B】: 桌面版 (強力 DOM 置換 + 鎖定檔名 + 強制桌面寬度)
    // =========================================================================
    document.getElementById('gla-print-style')?.remove();
    document.getElementById('gla-print-zone')?.remove();

    // ★ 1. 暴力修改檔名：暫存並替換所有 <title>，移除 Next.js 控制屬性
    const originalDocTitle = document.title;
    document.title = title;
    
    const titleTags = document.querySelectorAll('title');
    const originalTitles: string[] = [];
    titleTags.forEach(t => {
        originalTitles.push(t.innerText);
        t.innerText = title;
        t.removeAttribute('data-rh'); // 解除 React-Helmet / Next.js 的綁定
    });

    // ★ 2. 強制注入桌面版寬度 (1024px)：讓 Tailwind 乖乖排版不走位
    const style = document.createElement('style');
    style.id = 'gla-print-style';
    style.innerHTML = `
        @media screen {
            #gla-print-zone { display: none !important; }
        }
        @media print {
            body > *:not(#gla-print-zone):not(#gla-print-style):not(script) { display: none !important; }
            /* 強制設定為桌面寬度，瀏覽器會自動縮放適應 A4 紙張 */
            html, body { width: 1024px !important; min-width: 1024px !important; margin: 0 !important; padding: 0 !important; background: white !important; }
            #gla-print-zone { display: block !important; width: 1024px !important; max-width: 1024px !important; margin: 0 auto !important; background: white !important; color: black !important; }
            @page { size: A4 portrait; margin: 8mm !important; }
            * { box-shadow: none !important; text-shadow: none !important; flex-shrink: 0 !important; }
            #gla-print-zone button, .print\\:hidden, .no-print { display: none !important; }
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

    // 確保圖片載入
    const images = Array.from(printZone.getElementsByTagName('img'));
    const promises = images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
    });

    Promise.race([
        Promise.all(promises),
        new Promise(res => setTimeout(res, 1500))
    ]).then(() => {
        // ★ 3. 延長緩衝時間至 500ms：確保瀏覽器 OS 層有足夠時間讀取新檔名
        setTimeout(() => {
            try {
                window.print();
            } catch (e) {
                console.error("Print failed", e);
            } finally {
                // 列印完畢後，安全還原 DOM 與標題
                document.getElementById('gla-print-style')?.remove();
                document.getElementById('gla-print-zone')?.remove();
                
                document.title = originalDocTitle;
                titleTags.forEach((t, i) => {
                    t.innerText = originalTitles[i];
                    t.setAttribute('data-rh', 'true'); // 還原 Next.js 屬性
                });
            }
        }, 500);
    });
};

export const triggerCardPrint = async (htmlContent: string, title: string = 'Document') => {
    executePrint(htmlContent, title, true);
};

export const triggerSmartPrint = async (htmlContent: string, title: string = 'Document') => {
    executePrint(htmlContent, title, false);
};
