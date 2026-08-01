/**
 * 專為海外訂車、報價單與文件設計的高相容性列印引擎 (解決 Blob URL 樣式遺失與空白頁問題)
 */
export const triggerDocumentPrint = (elementId: string, title: string = 'Document') => {
  const contentElement = document.getElementById(elementId);
  if (!contentElement) {
    alert('找不到指定的列印內容區塊！');
    return;
  }

  // 1. 抓取現有樣式，並強制將相對路徑轉為絕對路徑，防止 Blob 環境下 404
  const currentOrigin = window.location.origin;
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(el => {
        if (el.tagName.toLowerCase() === 'link') {
            const href = el.getAttribute('href');
            if (href && href.startsWith('/')) {
                return `<link rel="stylesheet" href="${currentOrigin}${href}">`;
            }
        }
        return el.outerHTML;
    })
    .join('\n');

  // 2. 注入 base 標籤確保所有靜態資源 (如圖片、字體) 能夠正確讀取
  const baseTag = `<base href="${currentOrigin}/">`;

  // 3. 組合 HTML
  const fullHtml = `
    <!DOCTYPE html>
    <html lang="zh-HK">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      ${baseTag}
      ${styles}
      <!-- 終極保險：注入 Tailwind CDN，確保即使 Next.js CSS chunk 遺失也能完美渲染 -->
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @page {
          size: A4 portrait;
          margin: 8mm !important; 
        }
        
        html, body {
          width: 100% !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* 核心修復：強制將 Flex 佈局改為 Block，避免瀏覽器列印引擎分頁計算崩潰導致空白頁 */
        .print-container {
          display: block !important;
          width: 100% !important;
          height: auto !important;
          overflow: visible !important;
          position: static !important;
          background: #ffffff !important;
        }
        
        .print-container .flex-col {
            display: block !important;
        }

        /* 防止區塊在換頁時被硬生生切半 */
        .break-inside-avoid {
          break-inside: avoid;
          page-break-inside: avoid;
          margin-bottom: 20px;
        }

        .no-print, button {
          display: none !important;
        }
      </style>
    </head>
    <body>
      <div class="print-container">
        ${contentElement.innerHTML}
      </div>

      <script>
        // 等待圖片與 Tailwind CDN 載入完畢後再觸發列印
        window.addEventListener('DOMContentLoaded', () => {
          const images = Array.from(document.images);
          const imageLoadPromises = images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
              img.onload = resolve;
              img.onerror = resolve; 
            });
          });

          Promise.all(imageLoadPromises).then(() => {
            // 給予 Tailwind CDN 800ms 的編譯緩衝時間，確保畫面 100% 準備就緒
            setTimeout(() => {
              window.focus();
              window.print();
            }, 800); 
          });
        });
      </script>
    </body>
    </html>
  `;

  // 4. 建立 Blob 並開啟新視窗
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  window.open(url, '_blank');
  
  // 回收記憶體
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
