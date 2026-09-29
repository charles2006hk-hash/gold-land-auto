/**
 * 專為海外訂車、報價單與文件設計的高相容性列印引擎 
 * (混合模式：iOS 使用彈出新視窗破解限制，Desktop/Android 使用獨立 Iframe)
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
    // [iOS 專用模式]：彈出新視窗 (破解 WeChat/WhatsApp 內建瀏覽器與 PWA 限制)
    // =====================================================================
    const printWindow = window.open('', '_blank');
    
    // 如果瀏覽器阻擋了彈出視窗，提示使用者切換到原生 Safari
    if (!printWindow) {
        alert('系統阻擋了列印視窗！\n請點擊右上角「在 Safari 中開啟 (Open in Safari)」後再試。');
        return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(s => s.outerHTML)
      .join('\n');

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="zh-HK">
      <head>
        <title>${title}</title>
        ${styles}
        <style>
          @page { size: A4 portrait; margin: 10mm !important; }
          html, body { width: 100% !important; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          * { visibility: visible !important; overflow: visible !important; }
          .flex-col { display: block !important; }
          .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; margin-bottom: 24px; }
          .print\\:hidden, .no-print, button { display: none !important; }
        </style>
      </head>
      <body>
        ${contentElement.outerHTML}
        
        <script>
          // 等待新視窗的資源(圖片)載入完畢後，自動呼叫列印
          window.onload = function() {
            setTimeout(function() {
              window.print();
              // iOS 列印完畢或取消後，自動關閉這個暫存分頁
              setTimeout(function() { window.close(); }, 500);
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    
    return; // iOS 執行完畢，不進入下方的 Iframe 邏輯
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
  
  setTimeout(cleanup, 180000); 
};
