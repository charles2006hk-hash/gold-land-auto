// src/utils/LoanCalculator.ts

// 根據 OCBC New Vehicle HP (2026) 完整佣金對照表
const OCBC_HP_NEW_COMMISSION_TABLE: Record<string, number[]> = {
    "2.75": [3.5,  3.5,  3.5,  3.0],
    "3.00": [11.0, 11.0, 10.5, 10.0],
    "3.25": [17.5, 17.5, 17.0, 16.0],
    "3.50": [23.0, 22.5, 22.0, 21.0],
    "3.75": [27.5, 27.5, 26.5, 25.5],
    "4.00": [32.0, 31.5, 30.5, 29.5],
    "4.25": [35.5, 35.0, 34.0, 33.0],
    "4.50": [39.0, 38.0, 37.0, 36.0],
    "4.75": [42.0, 41.0, 40.0, 39.0]
};

// 根據 OCBC Used Vehicle HP (2026) 完整佣金對照表
const OCBC_HP_USED_COMMISSION_TABLE: Record<string, number[]> = {
    "3.25": [6.5,  6.5,  6.0,  5.5],
    "3.50": [12.5, 12.5, 12.0, 11.5],
    "3.75": [18.0, 18.0, 17.0, 16.5],
    "4.00": [22.5, 22.5, 21.5, 20.5],
    "4.25": [27.0, 26.5, 25.5, 24.5],
    "4.50": [30.5, 30.0, 29.0, 28.0],
    "4.75": [34.0, 33.5, 32.0, 31.0],
    "5.00": [37.0, 36.0, 35.0, 34.0],
    "5.25": [39.5, 39.0, 37.5, 36.5],
    "5.50": [42.0, 41.0, 40.0, 38.5]
};

// 取得對應的佣金百分比
const getCommissionRate = (rate: number, months: number, isDigitalAIP: boolean = true, isUsedCar: boolean = false) => {
    // 強制保留兩位小數 (例如 4.5 -> "4.50") 以精準匹配 Key
    const rateStr = rate.toFixed(2);
    
    // 判斷要用新車表還是二手車表
    const activeTable = isUsedCar ? OCBC_HP_USED_COMMISSION_TABLE : OCBC_HP_NEW_COMMISSION_TABLE;
    const tableRow = activeTable[rateStr];
    
    if (!tableRow) return 0; // 找不到對應利率

    let monthIndex = 0; // 預設 24 個月
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
    isDigitalAIP: boolean = true,
    isUsedCar: boolean = false
) => {
    // 1. 貸款額 (Loan Amount) - 規定最少要 $80,000
    const loanAmount = carPrice - downPayment;
    if (loanAmount < 80000) {
        return { error: "銀行規定：最低貸款額不得少於 HK$80,000" };
    }

    // 2. 總利息 (Total Interest) = 貸款額 × 平息 × 年期
    const years = months / 12;
    const totalInterest = loanAmount * (flatInterestRate / 100) * years;

    // 3. 總還款額 與 每月供款
    const totalRepayment = loanAmount + totalInterest;
    const monthlyInstallment = totalRepayment / months;

    // 4. 車行佣金回贈 (Dealer Commission) = 總利息 × 佣金百分比
    const commissionRate = getCommissionRate(flatInterestRate, months, isDigitalAIP, isUsedCar);
    const dealerCommission = totalInterest * (commissionRate / 100);

    return {
        loanAmount: Math.round(loanAmount),
        totalInterest: Math.round(totalInterest),
        monthlyInstallment: Math.round(monthlyInstallment),
        commissionRate: commissionRate,
        dealerCommission: Math.round(dealerCommission)
    };
};
