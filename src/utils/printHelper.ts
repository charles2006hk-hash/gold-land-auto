/**
 * 專為海外訂車、報價單與文件設計的高相容性列印引擎 
 * (混合模式：iOS 使用當前頁面覆蓋，Desktop/Android 使用獨立 Iframe)
 */
export const triggerDocumentPrint = (elementId: string, title: string = 'Document') => {
  const contentElement = document.getElementById(elementId);
  if (!contentElement) {
    alert('找不到指定的列印內容區塊！');
    return;
  }

  // 1. 檢測是否為 iOS 裝置 (iPhone, iPad, iPod)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    // =====================================================================
    // [iOS 專用模式]：在當前頁面覆蓋列印層 (避免非同步延遲與 Iframe 阻擋)
    // =====================================================================
    const originalTitle = document.title;
    document.title = title;

    const printContainer = document.createElement('div');
    const containerId = `ios-print-container-${Date.now()}`;
    printContainer.id = containerId;
    
    // 抓取當前頁面已經載入好的樣式 (不需要等 CDN)
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(s => s.outerHTML)
      .join('\n');

    printContainer.innerHTML = `
      ${styles}
      <style>
        /* 列印時的專屬樣式 */
        @media print {
          /* 隱藏原本的應用程式，只顯示列印容器 */
          body > *:not(#${containerId}) { display: none !important; }
          #${containerId} { display: block !important; position: static; width: 100%; height: auto; z-index: 999999; background: white; }
          
          @page { size: A4 portrait; margin: 10mm !important; }
          * { visibility: visible !important; overflow: visible !important; }
          .flex-col { display: block !important; }
          .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; margin-bottom: 24px; }
          .print\\:hidden, .no-print, button { display: none !important; }
        }
        /* 螢幕預覽時的蓋版樣式 (純白背景蓋住主程式) */
        @media screen {
          #${containerId} { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: white; z-index: 999999; overflow-y: auto; }
        }
      </style>
      ${contentElement.outerHTML}
    `;

    document.body.appendChild(printContainer);

    // iOS 必須在極短時間內觸發列印以符合手勢安全限制 (不等待圖片或 CDN)
    setTimeout(() => {
      window.print();
      
      // 列印結束或取消後，清理現場並還原
      setTimeout(() => {
        if (document.body.contains(printContainer)) {
          document.body.removeChild(printContainer);
        }
        document.title = originalTitle;
      }, 1000);
    }, 300);

    return; // 結束執行，不進入下方 Iframe 邏輯
  }

  // =====================================================================
  // [Desktop / Android 模式]：原汁原味的隱藏 Iframe 極淨化隔離模式
  // =====================================================================
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

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="zh-HK">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @page { size: A4 portrait; margin: 10mm !important; }
        html, body {
          width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: #ffffff !important;
          -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
        }
        * { visibility: visible !important; overflow: visible !important; }
        .flex-col { display: block !important; }
        .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; margin-bottom: 24px; }
        .print\\:hidden, .no-print, button { display: none !important; }
      </style>
    </head>
    <body>
      ${contentElement.outerHTML}
    </body>
    </html>
  `);
  iframeDoc.close();

  const executePrint = () => {
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
      Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(res => { img.onload = res; img.onerror = res; });
      })).then(executePrint);
    }
  };

  const cleanup = () => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  };

  if (iframe.contentWindow) {
    iframe.contentWindow.onafterprint = cleanup;
  }
  
  // 終極防呆：3 分鐘後強制拔除
  setTimeout(cleanup, 180000); 
};
