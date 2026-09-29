// src/utils/printHelper.ts

/**
 * 核心：iOS 專屬 PDF 產生引擎 (防死鎖 + Base64 預處理 + 前置解鎖)
 */
const generateIOSPDF = async (htmlContent: string, title: string, isCard: boolean) => {
    let isResolved = false;

    // 1. 建立 Loading 提示
    const toast = document.createElement('div');
    toast.innerHTML = `正在產生高畫質 PDF...<br><span style="font-size:12px; color:#ccc;">(正在處理圖片，約需 3-5 秒)</span>`;
    Object.assign(toast.style, {
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'rgba(15, 23, 42, 0.95)', color: 'white', padding: '20px 24px',
        borderRadius: '16px', zIndex: '999999', fontSize: '15px', fontWeight: 'bold',
        textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
    });
    document.body.appendChild(toast);

    // 2. 建立實體渲染容器 (防變形，強制 800px 寬度)
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

    // ★ 看門狗機制：15秒內未完成強制解鎖 UI
    const watchdog = setTimeout(() => {
        if (!isResolved) {
            isResolved = true;
            if (document.body.contains(printWrapper)) document.body.removeChild(printWrapper);
            if (document.body.contains(toast)) document.body.removeChild(toast);
            alert('⚠️ 系統處理 PDF 超時 (可能由於網路不穩)，已自動解鎖。');
        }
    }, 15000);

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

        // ★ 核心防禦 1：預先將所有圖片轉換為 Base64
        // 這會讓 iOS 的 html2canvas 把圖片視為「本機記憶體」直接渲染，徹底解決 CORS 與死鎖問題！
        const images = Array.from(targetElement.querySelectorAll('img'));
        await Promise.all(images.map(async (img) => {
            try {
                if (img.src.startsWith('http')) {
                    const res = await fetch(img.src, { mode: 'cors' });
                    const blob = await res.blob();
                    const base64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(blob);
                    });
                    img.src = base64;
                    img.srcset = ''; // 清除 srcset 避免干擾
                }
            } catch (err) {
                console.warn('圖片轉 Base64 失敗，降級使用原屬性', err);
                img.crossOrigin = "anonymous";
            }
        }));

        // 給予瀏覽器 0.5 秒重繪 DOM
        await new Promise(r => setTimeout(r, 500));
        if (isResolved) return;

        // 4. 產生 PDF
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `${title}.pdf`,
            image: { type: 'jpeg', quality: 0.85 },
            html2canvas: { scale: 1, useCORS: true, logging: false, windowWidth: 800, width: 800, scrollX: 0, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const pdfBlob = await (window as any).html2pdf().set(opt).from(targetElement).output('blob');
        const file = new window.File([pdfBlob], `${title}.pdf`, { type: 'application/pdf' });

        // ★ 核心防禦 2：在觸發分享之前，強制先清理 UI 解鎖畫面！
        isResolved = true;
        clearTimeout(watchdog);
        if (document.body.contains(printWrapper)) document.body.removeChild(printWrapper);
        if (document.body.contains(toast)) document.body.removeChild(toast);

        // 5. 觸發分享或下載
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: title });
            } catch (shareErr) {
                console.log("使用者取消分享或分享失敗", shareErr);
            }
        } else {
            // ★ 核心防禦 3：如果是在 PWA 模式且不支援 share，使用隱藏 a 標籤強制觸發下載
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
