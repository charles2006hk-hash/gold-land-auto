// src/utils/printHelper.ts

/**
 * 終極原生列印引擎 (Native Print Engine)
 * 完全放棄容易導致 iOS 崩潰的 html2canvas，改用新視窗 + 原生 window.print()
 * 讓使用者透過 iOS Safari 內建的分享選單自行決定「列印」或「儲存為 PDF」
 */
const executeNativePrint = (htmlContent: string, title: string, isCard: boolean) => {
    // 1. 同步開啟新視窗 (必須是第一步，防止 iOS 彈出視窗攔截)
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
        alert('列印視窗被瀏覽器阻擋！\n如果您使用的是微信/WhatsApp內建瀏覽器，請點擊右上角「在 Safari 中開啟」後再試。');
        return;
    }

    // 2. 擷取主程式目前的 Tailwind 樣式與全局 CSS
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(el => el.outerHTML).join('\n');
    const baseTag = `<base href="${window.location.origin}/">`;

    // 3. 針對卡片 (Card) 和單據 (Smart) 注入防變形 CSS
    const customCSS = isCard 
        ? `img { max-width: 100% !important; height: auto !important; object-fit: cover !important; }
           .aspect-\\[4\\/3\\] { aspect-ratio: 4/3 !important; }
           .aspect-\\[16\\/7\\] { aspect-ratio: 16/7 !important; }`
        : `img { max-width: 100% !important; height: auto !important; object-fit: contain !important; }`;

    // 4. 構建純淨無干擾的 HTML 網頁
    const fullHtml = `
        <!DOCTYPE html>
        <html lang="zh-HK">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
            <title>${title}</title>
            ${baseTag}
            ${styles}
            <style>
                /* 設定 A4 尺寸與安全邊距 */
                @page { size: A4 portrait; margin: 8mm !important; }
                
                /* 強制底色為白，確保 PDF 不會黑屏或透明 */
                html, body { 
                    width: 100% !important; 
                    margin: 0 !important; 
                    padding: 0 !important; 
                    background: white !important; 
                    -webkit-print-color-adjust: exact !important; 
                    print-color-adjust: exact !important; 
                }
                
                /* 拔除可能影響列印排版的陰影特效 */
                * { box-shadow: none !important; text-shadow: none !important; }
                
                /* 隱藏不想印出來的按鈕 */
                .print\\:hidden, button { display: none !important; }
                
                /* 列印主容器設定 */
                .print-container { 
                    width: 100% !important; 
                    max-width: 800px; 
                    margin: 0 auto !important; 
                    background: white !important; 
                }
                
                /* 防止分頁切斷重要區塊 */
                .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
                
                ${customCSS}
            </style>
        </head>
        <body>
            <div class="print-container">
                ${htmlContent}
            </div>
            
            <script>
                // 網頁載入後，確保所有圖片都已就緒才呼叫列印，避免印出空白圖片
                window.onload = function() {
                    const images = Array.from(document.images);
                    
                    if (images.length === 0) {
                        setTimeout(() => window.print(), 500);
                        return;
                    }

                    const promises = images.map(img => {
                        if (img.complete) return Promise.resolve();
                        return new Promise(resolve => {
                            img.onload = resolve;
                            img.onerror = resolve; // 容錯：就算單張圖片失敗也放行
                        });
                    });
                    
                    Promise.all(promises).then(() => {
                        // 給予瀏覽器 0.5 秒繪製緩衝
                        setTimeout(() => {
                            window.print();
                        }, 500);
                    });
                    
                    // 兜底機制：最多等待 3 秒，時間一到強制喚起列印，絕不卡死
                    setTimeout(() => {
                        window.print();
                    }, 3000);
                };
            </script>
        </body>
        </html>
    `;

    // 5. 寫入新視窗並觸發
    printWindow.document.open();
    printWindow.document.write(fullHtml);
    printWindow.document.close();
};

// ==========================================
// 匯出功能
// ==========================================

export const triggerCardPrint = async (htmlContent: string, title: string = 'Document') => {
    executeNativePrint(htmlContent, title, true);
};

export const triggerSmartPrint = async (htmlContent: string, title: string = 'Document') => {
    executeNativePrint(htmlContent, title, false);
};
