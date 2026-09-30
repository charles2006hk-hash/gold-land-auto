// src/utils/printHelper.ts

/**
 * 核心：iOS 專屬 PDF 產生引擎 (預先降解圖片防 OOM + 拔除 GPU 殺手特效)
 */
const generateIOSPDF = async (htmlContent: string, title: string, isCard: boolean) => {
    let isResolved = false;

    // 1. 建立 Loading 提示
    const toast = document.createElement('div');
    toast.innerHTML = `正在優化圖片與產生 PDF...<br><span style="font-size:12px; color:#ccc;">(請保持螢幕開啟，約需 5-10 秒)</span>`;
    Object.assign(toast.style, {
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'rgba(15, 23, 42, 0.95)', color: 'white', padding: '20px 24px',
        borderRadius: '16px', zIndex: '999999', fontSize: '15px', fontWeight: 'bold',
        textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
    });
    document.body.appendChild(toast);

    // 2. 建立實體渲染容器
    const printWrapper = document.createElement('div');
    Object.assign(printWrapper.style, {
        position: 'absolute', top: '0', left: '0', 
        width: '800px', minWidth: '800px', maxWidth: '800px',
        zIndex: '-1000', opacity: '0.01', pointerEvents: 'none', 
        background: 'white', overflow: 'hidden'
    });

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(el => el.outerHTML).join('\n');

    const customCSS = isCard 
        ? `img { max-width: 100% !important; height: 100% !important; object-fit: cover !important; }
           .aspect-\\[4\\/3\\] { aspect-ratio: 4/3 !important; height: auto !important; }
           .aspect-\\[16\\/7\\] { aspect-ratio: 16/7 !important; height: auto !important; }`
        : `img { max-width: 100% !important; height: auto !important; object-fit: contain !important; }`;

    printWrapper.innerHTML = `
        <div id="pdf-render-target" style="width: 800px !important; min-width: 800px !important; background: white; padding: 20px; box-sizing: border-box;">
            ${styles}
            <style>
                /* ★ 核心防當機：徹底拔除所有會讓 iOS GPU 崩潰的特效 */
                * { 
                    -webkit-print-color-adjust: exact !important; 
                    print-color-adjust: exact !important; 
                    flex-shrink: 0 !important; 
                    box-shadow: none !important; 
                    text-shadow: none !important; 
                    backdrop-filter: none !important; 
                    -webkit-backdrop-filter: none !important; 
                }
                .print\\:hidden, button { display: none !important; }
                .grid { display: grid !important; }
                .flex { display: flex !important; }
                ${customCSS}
            </style>
            ${htmlContent}
        </div>
    `;
    document.body.appendChild(printWrapper);

    // ★ 看門狗機制：延長至 20 秒，確保網路極慢時仍有機會完成，否則解鎖 UI
    const watchdog = setTimeout(() => {
        if (!isResolved) {
            isResolved = true;
            if (document.body.contains(printWrapper)) document.body.removeChild(printWrapper);
            if (document.body.contains(toast)) document.body.removeChild(toast);
            alert('⚠️ 系統優化 PDF 超時 (可能由於網路不穩)，已自動解鎖，請重新嘗試。');
        }
    }, 20000);

    try {
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

        // ★ 核心防 OOM：在交給 PDF 引擎前，手動將所有高清圖片強制降維壓縮
        const images = Array.from(targetElement.querySelectorAll('img'));
        await Promise.all(images.map(async (img) => {
            if (!img.src || img.src.startsWith('data:')) return;
            try {
                const base64 = await new Promise<string>((resolve) => {
                    const tempImg = new Image();
                    tempImg.crossOrigin = 'anonymous';
                    tempImg.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 600; // iOS 安全寬度上限
                        let width = tempImg.width;
                        let height = tempImg.height;
                        
                        // 等比例縮小圖片
                        if (width > MAX_WIDTH) {
                            height = Math.round((height * MAX_WIDTH) / width);
                            width = MAX_WIDTH;
                        }
                        canvas.width = width || MAX_WIDTH;
                        canvas.height = height || Math.round(MAX_WIDTH * 0.75);
                        
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(tempImg, 0, 0, width, height);
                            // 將圖片壓縮成 60% 的輕量級 JPEG
                            resolve(canvas.toDataURL('image/jpeg', 0.6)); 
                        } else {
                            resolve(img.src);
                        }
                    };
                    tempImg.onerror = () => resolve(img.src); // 失敗則退回原網址
                    tempImg.src = img.src;
                });
                img.src = base64;
                img.srcset = ''; // 必須清除，防止瀏覽器繼續抓取高清原圖
            } catch (err) {
                console.warn('圖片降維失敗', err);
            }
        }));

        // 給予瀏覽器 0.8 秒重繪 DOM，確保圖片替換完成
        await new Promise(r => setTimeout(r, 800));
        if (isResolved) return;

        // 4. 產生 PDF (既然圖片已經全部微型化，scale 1.2 提供清晰文字也絕對安全)
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `${title}.pdf`,
            image: { type: 'jpeg', quality: 0.85 },
            html2canvas: { 
                scale: 1.2, 
                useCORS: true, 
                logging: false, 
                windowWidth: 800, width: 800, 
                scrollX: 0, scrollY: 0 
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const pdfBlob = await (window as any).html2pdf().set(opt).from(targetElement).output('blob');

        // ★ 核心防禦：強制在呼叫分享前先清理畫布與解鎖 UI
        isResolved = true;
        clearTimeout(watchdog);
        if (document.body.contains(printWrapper)) document.body.removeChild(printWrapper);
        if (document.body.contains(toast)) document.body.removeChild(toast);

        const file = new window.File([pdfBlob], `${title}.pdf`, { type: 'application/pdf' });

        // 5. 觸發分享或下載
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: title });
            } catch (shareErr) {
                console.log("使用者取消分享", shareErr);
            }
        } else {
            const blobUrl = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `${title}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        }
    } catch (error) {
        console.error("PDF 產生失敗:", error);
        if (!isResolved) {
            isResolved = true;
            clearTimeout(watchdog);
            if (document.body.contains(printWrapper)) document.body.removeChild(printWrapper);
            if (document.body.contains(toast)) document.body.removeChild(toast);
            alert('PDF 產生失敗，請確認網路連線或稍後再試。');
        }
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
