/**
 * 專為海外訂車、報價單與文件設計的高相容性列印引擎
 * @param elementId 你要列印的內容容器 ID (例如：'print-area' 或 'quotation-content')
 * @param title 列印 PDF 的預設檔案名稱
 */
export const triggerDocumentPrint = (elementId: string, title: string = 'Document') => {
  const contentElement = document.getElementById(elementId);
  if (!contentElement) {
    alert('找不到指定的列印內容區塊！');
    return;
  }

  // 1. 抓取目前頁面所有應用的 CSS Style 與 Tailwind CSS 規則
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(el => el.outerHTML)
    .join('\n');

  // 2. 組裝純淨的 HTML 結構，強行覆蓋可能造成白屏的 CSS Layout 規則
  const fullHtml = `
    <!DOCTYPE html>
    <html lang="zh-HK">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      ${styles}
      <style>
        /* [核心修復] 強制重設頁面配置，禁止截斷 */
        @page {
          size: A4 portrait;
          margin: 10mm !important;
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

        /* 消除 Modal 的 absolute/fixed/overflow 屬性影響 */
        body * {
          box-sizing: border-box;
        }

        .print-container {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 auto !important;
          padding: 0 !important;
          background: #ffffff !important;
          overflow: visible !important;
          position: static !important;
          transform: none !important;
          box-shadow: none !important;
        }

        /* [關鍵] 解除 Tailwind 造成的滾動條限制與捲動死鎖 */
        .max-h-[90vh], .max-h-screen, .overflow-y-auto, .overflow-hidden {
          max-height: none !important;
          height: auto !important;
          overflow: visible !important;
        }

        /* 隱藏不想印出的介面元素 */
        .no-print, button {
          display: none !important;
        }

        /* 防止圖片或卡片在換頁時被被硬生生切開 */
        .break-inside-avoid {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      <div class="print-container">
        ${contentElement.innerHTML}
      </div>

      <script>
        // [核心修復] 等待所有圖片資源完整載入後，才開啟列印對話框
        window.addEventListener('DOMContentLoaded', () => {
          const images = Array.from(document.images);
          const imageLoadPromises = images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
              img.onload = resolve;
              img.onerror = resolve; // 即使破圖也不要卡死列印程序
            });
          });

          Promise.all(imageLoadPromises).then(() => {
            setTimeout(() => {
              window.focus();
              window.print();
            }, 300); // 緩衝渲染時間
          });
        });
      </script>
    </body>
    </html>
  `;

  // 3. 透過 Blob 建立獨立的 Context，不會受到外部 React 父節點的樣式影響
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  // 打開新視窗並執行列印
  const printWindow = window.open(url, '_blank');
  
  // 回收資源，防禦記憶體洩漏
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
