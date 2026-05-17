// src/utils/LoanCalculator.ts

// 這是根據您提供的 OCBC New Vehicle HP (2026) 表格建立的佣金對照表 (節錄部分示範)
// Key: Flat Interest Rate, Values: [24個月, 36個月, 48個月, 60個月] 的佣金百分比
const OCBC_HP_NEW_COMMISSION_TABLE: Record<string, number[]> = {
    "2.75": [3.5, 3.5, 3.5, 3.0],
    "3.00": [11.0, 11.0, 10.5, 10.0],
    "3.25": [17.5, 17.5, 17.0, 16.0],
    "3.50": [23.0, 22.5, 22.0, 21.0],
    "3.75": [27.5, 27.5, 26.5, 25.5],
    "4.00": [32.0, 31.5, 30.5, 29.5],
    // ... 可以根據圖片把剩下的數字補齊
};

// 取得對應的佣金百分比
const getCommissionRate = (rate: number, months: number, isDigitalAIP: boolean = true) => {
    const rateStr = rate.toFixed(2);
    const tableRow = OCBC_HP_NEW_COMMISSION_TABLE[rateStr];
    
    if (!tableRow) return 0; // 找不到對應利率

    let monthIndex = 0;
    if (months === 36) monthIndex = 1;
    if (months === 48) monthIndex = 2;
    if (months === 60) monthIndex = 3;

    let baseCommission = tableRow[monthIndex];

    // 表格下方規則：Individual Application through Digital Channel (AIP) +2% commission (Max: 45%)
    if (isDigitalAIP) {
        baseCommission = Math.min(baseCommission + 2, 45.0);
    }

    return baseCommission;
};

// ★★★ 核心計數引擎 ★★★
export const calculateAutoLoan = (
    carPrice: number, 
    downPayment: number, 
    months: number, 
    flatInterestRate: number,
    isDigitalAIP: boolean = true
) => {
    // 1. 貸款額 (Loan Amount) - 規定最少要 $80,000
    const loanAmount = carPrice - downPayment;
    if (loanAmount < 80000) {
        return { error: "Minimum loan amount should not be less than HK$80,000" };
    }

    // 2. 總利息 (Total Interest) = 貸款額 × 平息 × 年期
    const years = months / 12;
    const totalInterest = loanAmount * (flatInterestRate / 100) * years;

    // 3. 總還款額 與 每月供款
    const totalRepayment = loanAmount + totalInterest;
    const monthlyInstallment = totalRepayment / months;

    // 4. 車行佣金回贈 (Dealer Commission) = 總利息 × 佣金百分比
    const commissionRate = getCommissionRate(flatInterestRate, months, isDigitalAIP);
    const dealerCommission = totalInterest * (commissionRate / 100);

    return {
        loanAmount: Math.round(loanAmount),
        totalInterest: Math.round(totalInterest),
        monthlyInstallment: Math.round(monthlyInstallment),
        commissionRate: commissionRate,
        dealerCommission: Math.round(dealerCommission)
    };
};
