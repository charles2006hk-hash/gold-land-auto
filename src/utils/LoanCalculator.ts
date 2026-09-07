// src/utils/LoanCalculator.ts

// 將預設矩陣匯出，讓系統設定模組可以讀取作為初始值
export const DEFAULT_FINANCE_MATRICES = {
    newHp: {
        "2.75": [3.5,  3.5,  3.5,  3.0], "3.00": [11.0, 11.0, 10.5, 10.0],
        "3.25": [17.5, 17.5, 17.0, 16.0], "3.50": [23.0, 22.5, 22.0, 21.0],
        "3.75": [27.5, 27.5, 26.5, 25.5], "4.00": [32.0, 31.5, 30.5, 29.5],
        "4.25": [35.5, 35.0, 34.0, 33.0], "4.50": [39.0, 38.0, 37.0, 36.0],
        "4.75": [42.0, 41.0, 40.0, 39.0]
    },
    newLease: {
        "2.75": [4.0,  4.0,  4.0,  3.5], "3.00": [11.5, 11.5, 11.0, 10.5],
        "3.25": [18.0, 18.0, 17.5, 16.5], "3.50": [23.5, 23.0, 22.5, 21.5],
        "3.75": [28.0, 28.0, 27.0, 26.0], "4.00": [32.5, 32.0, 31.0, 30.0],
        "4.25": [36.0, 35.5, 34.5, 33.5], "4.50": [39.5, 38.5, 37.5, 36.5],
        "4.75": [42.5, 41.5, 40.5, 39.5]
    },
    usedHp: {
        "3.25": [6.5,  6.5,  6.0,  5.5], "3.50": [12.5, 12.5, 12.0, 11.5],
        "3.75": [18.0, 18.0, 17.0, 16.5], "4.00": [22.5, 22.5, 21.5, 20.5],
        "4.25": [27.0, 26.5, 25.5, 24.5], "4.50": [30.5, 30.0, 29.0, 28.0],
        "4.75": [34.0, 33.5, 32.0, 31.0], "5.00": [37.0, 36.0, 35.0, 34.0],
        "5.25": [39.5, 39.0, 37.5, 36.5], "5.50": [42.0, 41.0, 40.0, 38.5]
    },
    usedLease: {
        "3.25": [7.0,  7.0,  6.5,  6.0], "3.50": [13.0, 13.0, 12.5, 12.0],
        "3.75": [18.5, 18.5, 17.5, 17.0], "4.00": [23.0, 23.0, 22.0, 21.0],
        "4.25": [27.5, 27.0, 26.0, 25.0], "4.50": [31.0, 30.5, 29.5, 28.5],
        "4.75": [34.5, 34.0, 32.5, 31.5], "5.00": [37.5, 36.5, 35.5, 34.5],
        "5.25": [40.0, 39.5, 38.0, 37.0], "5.50": [42.5, 41.5, 40.5, 39.0]
    },
    aipBonus: 2.0,
    maxCommission: 45.0
};

export const calculateAutoLoan = (
    carPrice: number, 
    downPayment: number, 
    months: number, 
    flatInterestRate: number,
    isDigitalAIP: boolean = true,
    isUsedCar: boolean = false,
    financeType: 'HP' | 'Lease' = 'HP',
    settingsMatrices?: any, // ★ 新增：接收來自系統設定的矩陣
    manualCommissionRate?: number // ★ 新增：允許業務手動覆蓋回佣率
) => {
    const loanAmount = carPrice - downPayment;
    if (loanAmount < 80000) {
        return { error: "銀行規定：最低貸款額不得少於 HK$80,000" };
    }

    const years = months / 12;
    const totalInterest = loanAmount * (flatInterestRate / 100) * years;
    const totalRepayment = loanAmount + totalInterest;
    const monthlyInstallment = totalRepayment / months;

    // ★ 智能載入矩陣 (如果有設定就用設定，否則用預設)
    const matrices = settingsMatrices || DEFAULT_FINANCE_MATRICES;
    
    let activeTable = matrices.newHp;
    if (!isUsedCar && financeType === 'HP') activeTable = matrices.newHp;
    else if (!isUsedCar && financeType === 'Lease') activeTable = matrices.newLease;
    else if (isUsedCar && financeType === 'HP') activeTable = matrices.usedHp;
    else if (isUsedCar && financeType === 'Lease') activeTable = matrices.usedLease;

    const rateStr = flatInterestRate.toFixed(2);
    const tableRow = activeTable ? activeTable[rateStr] : null;
    
    let commissionRate = 0;
    
    // ★ 優先權：手動覆寫 > 矩陣計算
    if (manualCommissionRate !== undefined && manualCommissionRate !== null && manualCommissionRate >= 0) {
        commissionRate = manualCommissionRate;
    } else {
        if (tableRow) {
            let monthIndex = 0;
            if (months === 36) monthIndex = 1;
            if (months === 48) monthIndex = 2;
            if (months >= 60) monthIndex = 3;
            
            commissionRate = tableRow[monthIndex] || 0;
            
            // 加上 AIP Bonus 並限制最高上限
            const aipBonus = matrices.aipBonus !== undefined ? matrices.aipBonus : 2.0;
            const maxComm = matrices.maxCommission !== undefined ? matrices.maxCommission : 45.0;
            
            if (isDigitalAIP) {
                commissionRate = Math.min(commissionRate + aipBonus, maxComm); 
            }
        }
    }

    const dealerCommission = totalInterest * (commissionRate / 100);

    return {
        loanAmount: Math.round(loanAmount),
        totalInterest: Math.round(totalInterest),
        monthlyInstallment: Math.round(monthlyInstallment),
        commissionRate: Number(commissionRate.toFixed(2)),
        dealerCommission: Math.round(dealerCommission)
    };
};
