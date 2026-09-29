// src/utils/printHelper.ts

/**
 * 核心：iOS 專屬 PDF 產生引擎 (防 OOM 崩潰與防變形)
 */
const generateIOSPDF = async (htmlContent: string, title: string, isCard: boolean) => {
    // 1. 建立最高層級 Loading 提示 (不使用 alert 避免中斷線程)
    const toast = document.createElement('div');
    toast.innerHTML = `正在產生高畫質 PDF...<br><span style="font-size:12px; color:#ccc;">(${isCard ? '圖片較多' : '報表生成中'}，約需 3-5 秒)</span>`;
    Object.assign(toast.style, {
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'rgba(15, 23, 42, 0.95)', color: 'white', padding: '20px 24px',
        borderRadius: '16px', zIndex: '999999', fontSize: '15px', fontWeight: 'bold',
        textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
    });
    document.body.appendChild(toast);

    // 2. 建立實體渲染容器 (防變形)
    // 必須使用 opacity: 0.01 騙過 iOS，若用 0 或 display: none 會被優化掉導致白紙
    const printWrapper = document.createElement('div');
    Object.assign(printWrapper.style, {
        position: 'absolute', top: '0', left: '0', 
        width: '800px', minWidth: '800px', 
        zIndex: '-1000', opacity: '0.01', pointerEvents: 'none', 
        background: 'white', transformOrigin: 'top left',
        transform: `scale(${window.innerWidth / 800})` // 在手機上視覺縮小以防撐破版面
    });

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(el => el.outerHTML).join('\n');

    // 針對推介單 (Card) 與 常規單據 (Smart) 注入不同的防變形 CSS
    const customCSS = isCard 
        ? `img { max-width: 100% !important; height: 100% !important; object-fit: cover !important; }
           .aspect-\\[4\\/3\\] { aspect-ratio: 4/3 !important; height: auto !important; }
           .aspect-\\[16\\/7\\] { aspect-ratio: 16/7 !important; height: auto !important; }`
        : `img { max-width: 100% !important; height: auto !important; object-fit: contain !important; }`;

    printWrapper.innerHTML = `
        <div id="pdf-render-target" style="width: 800px !important; min-width: 800px !important; background: white; padding: 20px; box-sizing: border-box;">
            ${styles}
            <style>
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; flex-shrink: 0 !important; box-shadow: none !important; }
                .print\\:hidden, button { display: none !important; }
                .grid { display: grid !important; }
                .flex { display: flex !important; }
                ${customCSS}
            </style>
            ${htmlContent}
        </div>
    `;
    document.body.appendChild(printWrapper);

    try {
        // 3. 動態載入 html2pdf 套件
        if (!(window as any).html2pdf) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const targetElement = printWrapper.querySelector('#pdf-render-target') as HTMLElement;

        // ★ 核心防禦：強制等待所有圖片載入完畢，否則 Firebase 高清圖會讓 iOS 瞬間卡死崩潰
        const images = Array.from(targetElement.querySelectorAll('img'));
        await Promise.all(images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(res => { img.onload = res; img.onerror = res; });
        }));
        
        // 給予瀏覽器 0.5 秒重新繪製 DOM
        await new Promise(r => setTimeout(r, 500));

        // ★ 降載防崩潰：scale 設為 1 (iOS 安全極限)，圖片壓縮至 0.8
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `${title}.pdf`,
            image: { type: 'jpeg', quality: 0.8 },
            html2canvas: { scale: 1, useCORS: true, logging: false, windowWidth: 800, width: 800, scrollX: 0, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const pdfBlob = await (window as any).html2pdf().set(opt).from(targetElement).output('blob');
        
        // 使用 window.File 避免與 lucide-react 的 File 圖標衝突
        const file = new window.File([pdfBlob], `${title}.pdf`, { type: 'application/pdf' });
        
        // 觸發原生分享選單
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: title });
        } else {
            const blobUrl = URL.createObjectURL(pdfBlob);
            window.location.href = blobUrl;
        }
    } catch (error) {
        console.error("PDF 產生失敗:", error);
        alert('PDF 產生失敗，請確認網路連線或稍後再試。');
    } finally {
        // ★ 強制清理：無論成功失敗，必須拔除節點，保證系統不卡死
        if (document.body.contains(printWrapper)) document.body.removeChild(printWrapper);
        if (document.body.contains(toast)) document.body.removeChild(toast);
    }
};

/**
 * 核心：桌面版 / Android 版 隱藏 Iframe 列印引擎
 */
const generateIframePrint = (htmlContent: string, title: string) => {
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(el => el.outerHTML).join('\n');
    const baseTag = `<base href="${window.location.origin}/">`;

    const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            ${baseTag}
            ${styles}
            <style>
                @page { size: A4 portrait; margin: 5mm !important; }
                @media print {
                    html, body { width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .print-container { width: 100% !important; margin: 0 auto !important; padding: 0 5mm !important; box-sizing: border-box !important; zoom: 0.97 !important; }
                    #print-root { box-shadow: none !important; border: none !important; border-radius: 0 !important; }
                    .w-screen, .w-\\[100vw\\] { width: 100% !important; max-width: 100% !important; }
                    .min-h-screen, .h-screen, .h-\\[100dvh\\] { min-height: 0 !important; height: auto !important; }
                    body * { visibility: visible !important; }
                    script { display: none !important; }
                }
            </style>
        </head>
        <body onload="setTimeout(() => window.print(), 800)" onafterprint="window.close()">
            <div class="print-container">
                ${htmlContent}
            </div>
        </body>
        </html>
    `;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
};

// ==========================================
// 匯出功能
// ==========================================

export const triggerCardPrint = async (htmlContent: string, title: string = 'Document') => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
        await generateIOSPDF(htmlContent, title, true);
    } else {
        generateIframePrint(htmlContent, title);
    }
};

export const triggerSmartPrint = async (htmlContent: string, title: string = 'Document') => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
        await generateIOSPDF(htmlContent, title, false);
    } else {
        generateIframePrint(htmlContent, title);
    }
};
