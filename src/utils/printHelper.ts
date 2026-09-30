// src/utils/printHelper.ts

/**
 * 終極全域列印引擎 (In-Place DOM Injection)
 * 徹底拋棄 popup 新視窗與 iframe，直接在當前頁面注入並利用 @media print 隱藏主程式。
 * 這是解決 iOS PWA 攔截新視窗、桌面版視窗殘留、以及避免 OOM 的最完美原生方案。
 */
const executeInPlacePrint = (htmlContent: string, title: string, isCard: boolean) => {
    // 1. 清理可能殘留的舊列印節點
    document.getElementById('gla-print-style')?.remove();
    document.getElementById('gla-print-zone')?.remove();

    // 2. 暫存原有的網頁標題，並替換為單據名稱 (這樣輸出 PDF 時才會是正確的檔名)
    const originalTitle = document.title;
    document.title = title;

    // 3. 準備卡片與單據不同的防變形樣式
    const customCSS = isCard 
        ? `img { max-width: 100% !important; height: auto !important; object-fit: cover !important; }
           .aspect-\\[4\\/3\\] { aspect-ratio: 4/3 !important; }
           .aspect-\\[16\\/7\\] { aspect-ratio: 16/7 !important; }`
        : `img { max-width: 100% !important; height: auto !important; object-fit: contain !important; }`;

    // 4. 建立列印專用樣式表
    const style = document.createElement('style');
    style.id = 'gla-print-style';
    style.innerHTML = `
        /* 螢幕顯示時隱藏列印區 */
        @media screen {
            #gla-print-zone { display: none !important; }
        }

        /* 列印時：隱藏原本的系統 UI，只顯示我們注入的列印區 */
        @media print {
            /* 隱藏 body 下的所有子元素，除了我們剛剛加入的列印區 */
            body > *:not(#gla-print-zone):not(#gla-print-style):not(script) {
                display: none !important;
            }

            html, body { 
                width: 100% !important; 
                margin: 0 !important; 
                padding: 0 !important; 
                background: white !important; 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
            }

            #gla-print-zone {
                display: block !important;
                width: 100% !important;
                max-width: 800px;
                margin: 0 auto !important;
                background: white !important;
                color: black !important;
            }

            @page { size: A4 portrait; margin: 8mm !important; }

            * { box-shadow: none !important; text-shadow: none !important; flex-shrink: 0 !important; }
            .print\\:hidden, button { display: none !important; }
            .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
            
            ${customCSS}
        }
    `;
    document.head.appendChild(style);

    // 5. 建立列印容器並注入 HTML 內容
    const printZone = document.createElement('div');
    printZone.id = 'gla-print-zone';
    printZone.innerHTML = htmlContent;
    document.body.appendChild(printZone);

    // 6. 確保圖片載入完成，避免印出空白圖 (最多等 2 秒，因多數圖片已有快取)
    const images = Array.from(printZone.getElementsByTagName('img'));
    const promises = images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve; // 即使破圖也放行，防死鎖
        });
    });

    Promise.race([
        Promise.all(promises),
        new Promise(res => setTimeout(res, 2000))
    ]).then(() => {
        // 給予瀏覽器 0.5 秒讓 CSS 完全覆蓋生效
        setTimeout(() => {
            // 觸發原生列印 (iOS 會在此時由下往上滑出原生的 Share/Print Sheet)
            window.print();

            // 恢復原來的網頁標題
            document.title = originalTitle;

            // iOS Safari 在列印選單關閉後會繼續執行 JS，設定延遲清理 DOM，把主系統還原
            setTimeout(() => {
                document.getElementById('gla-print-style')?.remove();
                document.getElementById('gla-print-zone')?.remove();
            }, 2000);
        }, 500);
    });
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
