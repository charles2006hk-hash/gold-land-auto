/**
 * 專為海外訂車、報價單與文件設計的高相容性列印引擎 
 * (隱藏 Iframe 模式：極淨化隔離、解決白屏、強化資源回收)
 */
export const triggerDocumentPrint = (elementId: string, title: string = 'Document') => {
  const contentElement = document.getElementById(elementId);
  if (!contentElement) {
    alert('找不到指定的列印內容區塊！');
    return;
  }

  // 1. 建立隱藏的 Iframe (置於畫面外)
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

  // 2. 寫入純淨 HTML 內容 (刻意不複製父層的 <style>，避免干擾)
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="zh-HK">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <!-- 依賴獨立的 CDN 重新渲染，保證環境最乾淨 -->
      <script src="https://cdn.tailwindcss.com"></script>
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

        /* 核心修復：強制所有元素可見並解除滾動鎖定，破解所有的白屏陷阱 */
        * {
          visibility: visible !important;
          overflow: visible !important;
        }

        /* 強制將 Flex 佈局改為 Block，避免跨頁計算崩潰 */
        .flex-col {
          display: block !important;
        }

        /* 防止區塊在換頁時被硬生生切半 */
        .break-inside-avoid {
          break-inside: avoid;
          page-break-inside: avoid;
          margin-bottom: 24px;
        }

        /* 隱藏不想印出的元素 */
        .print\\:hidden, .no-print, button {
          display: none !important;
        }
      </style>
    </head>
    <body>
      <!-- 使用 outerHTML 保持原有 ID 與 HTML 結構 -->
      ${contentElement.outerHTML}
    </body>
    </html>
  `);
  iframeDoc.close();

  // 3. 等待資源載入與執行列印
  const executePrint = () => {
    // 給予 Tailwind CDN 1200ms 的編譯緩衝時間，確保樣式 100% 套用
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    }, 1200);
  };

  iframe.onload = () => {
    const images = Array.from(iframeDoc.images);
    if (images.length === 0) {
      executePrint();
    } else {
      // 確保圖片載入完畢
      Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(res => { img.onload = res; img.onerror = res; });
      })).then(executePrint);
    }
  };

  // 4. 清理機制 (Garbage Collection)
  const cleanup = () => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  };

  // 原生列印結束事件 (部分瀏覽器點擊「取消」不會觸發)
  if (iframe.contentWindow) {
    iframe.contentWindow.onafterprint = cleanup;
  }
  
  // 終極防呆：無論使用者印完還是按了取消，3分鐘後強制將 iframe 拔除，絕不留痕跡
  setTimeout(cleanup, 180000); 
};
