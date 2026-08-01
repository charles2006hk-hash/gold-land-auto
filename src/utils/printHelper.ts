/**
 * 專為海外訂車、報價單與文件設計的高相容性列印引擎 
 * (隱藏 Iframe 模式：不彈出新視窗、解決白屏、自動回收資源)
 */
export const triggerDocumentPrint = (elementId: string, title: string = 'Document') => {
  const contentElement = document.getElementById(elementId);
  if (!contentElement) {
    alert('找不到指定的列印內容區塊！');
    return;
  }

  // 1. 建立隱藏的 Iframe (切勿使用 display: none，否則瀏覽器會拒絕列印)
  const iframe = document.createElement('iframe');
  iframe.id = `print-iframe-${Date.now()}`;
  iframe.style.position = 'fixed';
  iframe.style.right = '-10000px';
  iframe.style.bottom = '-10000px';
  iframe.style.width = '100vw';
  iframe.style.height = '100vh';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-1';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) return;

  // 2. 獲取當前頁面所有的樣式 (因為同網域，路徑完全不需要修改)
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(el => el.outerHTML)
    .join('\n');

  // 3. 寫入純淨 HTML 內容與列印專屬 CSS 覆蓋
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="zh-HK">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      ${styles}
      <style>
        /* 列印頁面設定 */
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
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* 核心修復：強制將 Flex 佈局改為 Block，避免分頁計算崩潰導致白紙 */
        .print-container {
          display: block !important;
          width: 100% !important;
          height: auto !important;
          overflow: visible !important;
          position: static !important;
          background: #ffffff !important;
        }
        
        /* 強制展開所有可能被 Tailwind 截斷的容器 */
        .print-container * {
          overflow: visible !important;
        }

        .print-container .flex-col {
          display: block !important;
        }

        /* 防止區塊在換頁時被硬生生切半 */
        .break-inside-avoid {
          break-inside: avoid;
          page-break-inside: avoid;
          margin-bottom: 24px;
        }

        /* 隱藏不想印出的元素 */
        .no-print, button {
          display: none !important;
        }
      </style>
    </head>
    <body>
      <div class="print-container">
        ${contentElement.innerHTML}
      </div>
    </body>
    </html>
  `);
  iframeDoc.close();

  // 4. 等待 Iframe 內的資源 (圖片、字體、CSS) 載入完畢
  iframe.onload = () => {
    // 給予額外 800ms 緩衝，確保 Tailwind 樣式渲染及圖片繪製完成
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    }, 800);
  };

  // 5. 自動清理機制：監聽列印結束或取消
  if (iframe.contentWindow) {
    iframe.contentWindow.onafterprint = () => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    };
  }

  // 終極防呆：以防部分舊版瀏覽器不支援 onafterprint，3分鐘後強制回收記憶體
  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }, 180000);
};
