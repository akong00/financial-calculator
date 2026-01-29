
export type WithdrawalStrategyType = 'constant_dollar' | 'constant_percentage';

export interface WithdrawalParams {
    strategy: WithdrawalStrategyType;
    initialPortfolioValue: number;
    currentPortfolioValue: number;
    initialWithdrawalRate: number;
    inflationRate: number;
    lastYearWithdrawalAmount?: number;
    floorRate?: number;
    minDollarAmount?: number;
}

export function calculateWithdrawalAmount(params: WithdrawalParams): number {
    const {
        strategy,
        initialPortfolioValue,
        currentPortfolioValue,
        initialWithdrawalRate,
        inflationRate,
        lastYearWithdrawalAmount,
        floorRate,
        minDollarAmount = 0
    } = params;

    let withdrawal = 0;

    switch (strategy) {
        case 'constant_dollar':
            if (lastYearWithdrawalAmount === undefined) {
                withdrawal = initialPortfolioValue * initialWithdrawalRate;
            } else {
                withdrawal = lastYearWithdrawalAmount * (1 + inflationRate);
            }
            break;

        case 'constant_percentage':
            withdrawal = currentPortfolioValue * initialWithdrawalRate;
            break;

        default:
            withdrawal = 0;
    }

    const dollarFloor = minDollarAmount;
    const rateFloor = floorRate ? currentPortfolioValue * floorRate : 0;

    return Math.max(withdrawal, dollarFloor, rateFloor);
}
