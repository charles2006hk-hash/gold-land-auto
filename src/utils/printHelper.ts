// src/utils/printHelper.ts

/**
 * 終極全域列印引擎 (In-Place DOM Injection)
 * 已移除 PWA/WeChat 的人工攔截，直接以最原生的方式在當前頁面注入並觸發列印。
 */
const executeInPlacePrint = (htmlContent: string, title: string, isCard: boolean) => {
    // 1. 清理可能殘留的舊列印節點
    document.getElementById('gla-print-style')?.remove();
    document.getElementById('gla-print-zone')?.remove();

    // 2. 暫存原有的網頁標題，並替換為單據名稱 (確保輸出的 PDF 檔名正確)
    const originalTitle = document.title;
    document.title = title;

    // 3. 針對卡片 (Card) 和單據 (Smart) 注入防變形 CSS
    const customCSS = isCard 
        ? `img { max-width: 100% !important; height: auto !important; object-fit: cover !important; }
           .aspect-\\[4\\/3\\] { aspect-ratio: 4/3 !important; }
           .aspect-\\[16\\/7\\] { aspect-ratio: 16/7 !important; }`
        : `img { max-width: 100% !important; height: auto !important; object-fit: contain !important; }`;

    // 4. 建立列印專用樣式表 (隱藏主系統，只顯示列印區)
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

    // 5. 建立列印容器並注入 HTML 內容
    const printZone = document.createElement('div');
    printZone.id = 'gla-print-zone';
    printZone.innerHTML = htmlContent;
    document.body.appendChild(printZone);

    // 強制瀏覽器立即計算佈局
    window.getComputedStyle(printZone).display;

    // 6. 極速觸發列印 (給予 150ms 緩衝讓 CSS 生效與圖片讀取快取，隨即喚起原生列印)
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
    }, 150);
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
