// src/utils/LoanCalculator.ts

// 1. 新車 HP 佣金表
const OCBC_NEW_HP: Record<string, number[]> = {
    "2.75": [3.5,  3.5,  3.5,  3.0], "3.00": [11.0, 11.0, 10.5, 10.0],
    "3.25": [17.5, 17.5, 17.0, 16.0], "3.50": [23.0, 22.5, 22.0, 21.0],
    "3.75": [27.5, 27.5, 26.5, 25.5], "4.00": [32.0, 31.5, 30.5, 29.5],
    "4.25": [35.5, 35.0, 34.0, 33.0], "4.50": [39.0, 38.0, 37.0, 36.0],
    "4.75": [42.0, 41.0, 40.0, 39.0]
};

// 2. 新車 Lease 佣金表 (依據 Lease 圖片精準錄入)
const OCBC_NEW_LEASE: Record<string, number[]> = {
    "2.75": [4.0,  4.0,  4.0,  3.5], "3.00": [11.5, 11.5, 11.0, 10.5],
    "3.25": [18.0, 18.0, 17.5, 16.5], "3.50": [23.5, 23.0, 22.5, 21.5],
    "3.75": [28.0, 28.0, 27.0, 26.0], "4.00": [32.5, 32.0, 31.0, 30.0],
    "4.25": [36.0, 35.5, 34.5, 33.5], "4.50": [39.5, 38.5, 37.5, 36.5],
    "4.75": [42.5, 41.5, 40.5, 39.5]
};

// 3. 二手車 HP 佣金表
const OCBC_USED_HP: Record<string, number[]> = {
    "3.25": [6.5,  6.5,  6.0,  5.5], "3.50": [12.5, 12.5, 12.0, 11.5],
    "3.75": [18.0, 18.0, 17.0, 16.5], "4.00": [22.5, 22.5, 21.5, 20.5],
    "4.25": [27.0, 26.5, 25.5, 24.5], "4.50": [30.5, 30.0, 29.0, 28.0],
    "4.75": [34.0, 33.5, 32.0, 31.0], "5.00": [37.0, 36.0, 35.0, 34.0],
    "5.25": [39.5, 39.0, 37.5, 36.5], "5.50": [42.0, 41.0, 40.0, 38.5]
};

// 4. 二手車 Lease 佣金表 (推算矩陣)
const OCBC_USED_LEASE: Record<string, number[]> = {
    "3.25": [7.0,  7.0,  6.5,  6.0], "3.50": [13.0, 13.0, 12.5, 12.0],
    "3.75": [18.5, 18.5, 17.5, 17.0], "4.00": [23.0, 23.0, 22.0, 21.0],
    "4.25": [27.5, 27.0, 26.0, 25.0], "4.50": [31.0, 30.5, 29.5, 28.5],
    "4.75": [34.5, 34.0, 32.5, 31.5], "5.00": [37.5, 36.5, 35.5, 34.5],
    "5.25": [40.0, 39.5, 38.0, 37.0], "5.50": [42.5, 41.5, 40.5, 39.0]
};

export const calculateAutoLoan = (
    carPrice: number, 
    downPayment: number, 
    months: number, 
    flatInterestRate: number,
    isDigitalAIP: boolean = true,
    isUsedCar: boolean = false,
    financeType: 'HP' | 'Lease' = 'HP' // ★★★ 新增：區分 HP 或 Lease
) => {
    const loanAmount = carPrice - downPayment;
    if (loanAmount < 80000) {
        return { error: "銀行規定：最低貸款額不得少於 HK$80,000" };
    }

    const years = months / 12;
    const totalInterest = loanAmount * (flatInterestRate / 100) * years;
    const totalRepayment = loanAmount + totalInterest;
    const monthlyInstallment = totalRepayment / months;

    // 根據 (新/舊) 與 (HP/Lease) 選擇對應的數據表
    let activeTable = OCBC_NEW_HP;
    if (!isUsedCar && financeType === 'HP') activeTable = OCBC_NEW_HP;
    else if (!isUsedCar && financeType === 'Lease') activeTable = OCBC_NEW_LEASE;
    else if (isUsedCar && financeType === 'HP') activeTable = OCBC_USED_HP;
    else if (isUsedCar && financeType === 'Lease') activeTable = OCBC_USED_LEASE;

    const rateStr = flatInterestRate.toFixed(2);
    const tableRow = activeTable[rateStr];
    
    let commissionRate = 0;
    if (tableRow) {
        let monthIndex = 0;
        if (months === 36) monthIndex = 1;
        if (months === 48) monthIndex = 2;
        if (months === 60) monthIndex = 3;
        commissionRate = tableRow[monthIndex];
        if (isDigitalAIP) commissionRate = Math.min(commissionRate + 2, 45.0); // AIP 規則 +2%
    }

    const dealerCommission = totalInterest * (commissionRate / 100);

    return {
        loanAmount: Math.round(loanAmount),
        totalInterest: Math.round(totalInterest),
        monthlyInstallment: Math.round(monthlyInstallment),
        commissionRate: commissionRate,
        dealerCommission: Math.round(dealerCommission)
    };
};
