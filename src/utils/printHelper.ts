// src/utils/printHelper.ts

export const triggerDocumentPrint = async (elementId: string, title: string = 'Document') => {
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
    // [iOS 終極方案]：動態生成 PDF + 觸發原生分享選單 (破解 PWA 封鎖)
    // =====================================================================
    
    // 顯示友善的加載提示 (Toast)
    const toast = document.createElement('div');
    toast.innerHTML = '正在為您產生高畫質 PDF，請稍候...<br><span style="font-size:12px; color:#aaa;">(完成後請於選單選擇「列印」或「儲存」)</span>';
    Object.assign(toast.style, {
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      background: 'rgba(15, 23, 42, 0.95)', color: 'white', padding: '20px 24px',
      borderRadius: '16px', zIndex: '999999', fontSize: '15px', fontWeight: 'bold',
      textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
    });
    document.body.appendChild(toast);

    try {
      // 1. 動態載入 html2pdf.js (避免增加 Next.js 初始 bundle size)
      if (!(window as any).html2pdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // 2. 複製一份 DOM 來進行 PDF 渲染，避免破壞現有 UI
      const printClone = contentElement.cloneNode(true) as HTMLElement;
      printClone.style.background = '#ffffff';
      printClone.style.padding = '15px';
      
      // 移除不想印出的按鈕 (根據 Tailwind class)
      const hiddenElements = printClone.querySelectorAll('.print\\:hidden, button');
      hiddenElements.forEach(el => (el as HTMLElement).style.display = 'none');

      // 3. 設定 PDF 輸出參數
      const opt = {
        margin:       [5, 5, 5, 5],
        filename:     `${title}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false }, // useCORS 確保 Firebase 圖片能正常渲染
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // 4. 產生 PDF Blob 檔案
      const pdfBlob = await (window as any).html2pdf().set(opt).from(printClone).output('blob');
      const file = new File([pdfBlob], `${title}.pdf`, { type: 'application/pdf' });

      // 5. 呼叫 iOS 原生分享/列印選單 (Web Share API)
      document.body.removeChild(toast); // 移除提示
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title,
          text: '系統報價單已產生'
        });
      } else {
        // 備用方案：如果瀏覽器連 Share API 都阻擋，則直接開啓 PDF
        const blobUrl = URL.createObjectURL(pdfBlob);
        window.location.href = blobUrl;
      }
    } catch (error) {
      console.error("PDF 產生失敗:", error);
      if (document.body.contains(toast)) document.body.removeChild(toast);
      alert('PDF 產生失敗，請確認網路連線或稍後再試。');
    }
    
    return; // iOS 執行完畢，不進入下方邏輯
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
