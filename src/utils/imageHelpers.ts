// 檔案位置: src/utils/imageHelpers.ts

/**
 * 圖片壓縮工具函數
 * @param file 原始 File 物件
 * @param targetSizeKB 目標大小 (KB)，預設 130KB
 * @returns Promise<string> 回傳壓縮後的 DataURL (Base64)
 */
export const compressImage = (file: File, targetSizeKB: number = 130): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // 1. 尺寸縮放 (Resize)
                // 限制最大寬度為 1600px (保留夠清晰的細節，適合圖庫查看)
                // 如果是文件，文字依然清晰；如果是車圖，細節足夠
                const maxWidth = 1600; 
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Canvas context failed"));
                    return;
                }
                
                // 使用高品質平滑演算
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                // 2. 循環壓縮品質 (Compress Quality)
                // 起始品質 0.9，每次降低 0.05，直到檔案大小小於 targetSizeKB
                let quality = 0.9;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
                
                // 檢查 Base64 字串長度來估算大小 (byte ~= length * 0.75)
                while (dataUrl.length * 0.75 / 1024 > targetSizeKB && quality > 0.1) {
                    quality -= 0.05; // 稍微細膩一點的降階，保留更多畫質
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }
                
                // console.log(`壓縮完成: ${(dataUrl.length * 0.75 / 1024).toFixed(2)} KB, Quality: ${quality.toFixed(2)}`);
                resolve(dataUrl);
            };
            
            img.onerror = (err) => reject(err);
        };
        
        reader.onerror = (err) => reject(err);
    });
};
