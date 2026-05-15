// src/utils/InsurancePdfEngine.ts
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// === 大新保險 座標表 ===
const DAH_SING_COORDS = {
    proposerName: { x: 145, y: 648, size: 10 },
    hkid_br:      { x: 145, y: 618, size: 10 },
    phone:        { x: 145, y: 565, size: 10 },
    address:      { x: 145, y: 535, size: 9 },
    regMark:      { x: 80,  y: 475, size: 11 },
    makeModel:    { x: 190, y: 475, size: 10 },
    year:         { x: 480, y: 475, size: 10 },
    cc:           { x: 80,  y: 450, size: 10 },
    chassisNo:    { x: 300, y: 450, size: 10 },
    engineNo:     { x: 450, y: 450, size: 10 },
    seat:         { x: 80,  y: 425, size: 10 },
};

// === 蘇黎世保險 座標表 (依據您上傳的 v9 PDF 估算) ===
const ZURICH_COORDS = {
    proposerName: { x: 120, y: 645, size: 10 },
    hkid_br:      { x: 120, y: 615, size: 10 },
    phone:        { x: 120, y: 585, size: 10 },
    email:        { x: 350, y: 585, size: 10 },
    address:      { x: 120, y: 555, size: 9 },
    regMark:      { x: 60,  y: 430, size: 11 },
    makeModel:    { x: 180, y: 430, size: 10 },
    year:         { x: 350, y: 430, size: 10 },
    cc:           { x: 60,  y: 400, size: 10 },
    chassisNo:    { x: 350, y: 400, size: 10 },
    engineNo:     { x: 180, y: 400, size: 10 },
    seat:         { x: 450, y: 430, size: 10 },
};

export const generateInsuranceForm = async (vehicle: any, company: 'DahSing' | 'Zurich') => {
    try {
        // 1. 決定要讀取的模板與座標
        const isDahSing = company === 'DahSing';
        const url = isDahSing ? '/templates/Dah_Sing_Proposal_Form.pdf' : '/templates/Zurich_Proposal_v9.pdf';
        const coords = isDahSing ? DAH_SING_COORDS : ZURICH_COORDS;

        // 2. 載入 PDF 與字體 (支援中文必須)
        const [pdfBytes, fontBytes] = await Promise.all([
            fetch(url).then(res => res.arrayBuffer()),
            fetch('/fonts/NotoSansTC-Regular.ttf').then(res => res.arrayBuffer()) // 請確保有這個檔案
        ]);

        const pdfDoc = await PDFDocument.load(pdfBytes);
        pdfDoc.registerFontkit(fontkit);
        const customFont = await pdfDoc.embedFont(fontBytes);
        const firstPage = pdfDoc.getPages()[0]; // 只填寫第一/二頁

        // 3. 填表函數
        const draw = (text: string | number, coord: {x: number, y: number, size: number}, targetPage = firstPage) => {
            if (!text) return;
            targetPage.drawText(String(text), {
                x: coord.x,
                y: coord.y,
                size: coord.size,
                font: customFont,
                color: rgb(0, 0, 0),
            });
        };

        // 4. 寫入車主與車輛資料
        const ownerName = vehicle.registeredOwnerName || vehicle.customerName || '';
        const ownerId = vehicle.registeredOwnerId || vehicle.customerID || '';
        const address = vehicle.customerAddress || '';
        const phone = vehicle.customerPhone || '';
        const email = vehicle.customerEmail || ''; // 如果您的 vehicle 有這個欄位
        
        draw(ownerName, coords.proposerName);
        draw(ownerId, coords.hkid_br);
        draw(phone, coords.phone);
        draw(address, coords.address);
        if ((coords as any).email) draw(email, (coords as any).email);
        
        // 車輛資料
        draw(vehicle.regMark || '未出牌', coords.regMark);
        draw(`${vehicle.make} ${vehicle.model}`, coords.makeModel);
        draw(vehicle.year, coords.year);
        draw(vehicle.engineSize ? `${vehicle.engineSize}cc` : '', coords.cc);
        draw(vehicle.chassisNo, coords.chassisNo);
        draw(vehicle.engineNo, coords.engineNo);
        draw(vehicle.seating || '', coords.seat);

        // 5. 導出並觸發下載
        const finalPdfBytes = await pdfDoc.save();
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const downloadUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        const prefix = isDahSing ? '大新保險' : '蘇黎世保險';
        link.download = `${prefix}_投保書_${vehicle.regMark || 'Draft'}.pdf`;
        link.click();
        
        URL.revokeObjectURL(downloadUrl);
        return true;
    } catch (err) {
        console.error("PDF Generate Error:", err);
        alert("PDF 生成失敗，請確認 /public/templates/ 內有正確的 PDF 與字體檔。");
        return false;
    }
};
