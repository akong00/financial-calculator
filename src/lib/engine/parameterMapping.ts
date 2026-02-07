
import { CalculatorState, AssetItem, LiabilityItem, IncomeItem, ExpenseItem } from "@/types/scenario-types";
import { SimulationParams, PortfolioState, SimLiability, SimIncomeStream, SimExpenseStrategy } from "./simulation";
import { FilingStatus } from "./taxes";

export function mapStateToParams(state: CalculatorState): SimulationParams {
    const startYear = new Date().getFullYear();
    const endYear = startYear + (state.simulationEndAge - state.currentAge);

    // 1. Portfolio Aggregated State & Allocations
    const initialPortfolio: PortfolioState = {
        taxable: 0,
        taxableBasis: 0,
        preTax: 0,
        roth: 0,
        cash: 0,
        property: 0
    };

    const liquidAllocations = {
        taxable: { stocks: 0, bonds: 0, cash: 0 },
        preTax: { stocks: 0, bonds: 0, cash: 0 },
        roth: { stocks: 0, bonds: 0, cash: 0 },
        cash: { stocks: 0, bonds: 0, cash: 0 }
    };

    const bucketSums = { taxable: 0, preTax: 0, roth: 0, cash: 0 };

    state.assets.forEach(asset => {
        const val = asset.value;
        const s = asset.stockWeight ?? 100;

        if (asset.type === 'taxable') {
            initialPortfolio.taxable += val;
            initialPortfolio.taxableBasis += (asset.costBasis ?? val);
            bucketSums.taxable += val;
            liquidAllocations.taxable.stocks += (val * s);
            liquidAllocations.taxable.bonds += (val * (100 - s));
        } else if (asset.type === 'traditional') {
            initialPortfolio.preTax += val;
            bucketSums.preTax += val;
            liquidAllocations.preTax.stocks += (val * s);
            liquidAllocations.preTax.bonds += (val * (100 - s));
        } else if (asset.type === 'roth') {
            initialPortfolio.roth += val;
            bucketSums.roth += val;
            liquidAllocations.roth.stocks += (val * s);
            liquidAllocations.roth.bonds += (val * (100 - s));
        } else if (asset.type === 'savings') {
            initialPortfolio.cash += val;
            bucketSums.cash += val;
            liquidAllocations.cash.stocks += (val * s);
            liquidAllocations.cash.cash += (val * (100 - s));
        } else if (asset.type === 'property') {
            initialPortfolio.property += val;
        }
    });

    // Normalize weighted averages
    const normalize = (bucket: keyof typeof liquidAllocations) => {
        const total = bucketSums[bucket];
        if (total > 0) {
            liquidAllocations[bucket].stocks /= total;
            liquidAllocations[bucket].bonds /= total;
            liquidAllocations[bucket].cash /= total;
        } else {
            // Default to 100% stocks for investment buckets, 100% cash for cash bucket if empty
            if (bucket === 'cash') liquidAllocations[bucket].cash = 100;
            else liquidAllocations[bucket].stocks = 100;
        }
    };
    normalize('taxable');
    normalize('preTax');
    normalize('roth');
    normalize('cash');

    const totalLiquidValue = bucketSums.taxable + bucketSums.preTax + bucketSums.roth + bucketSums.cash;
    const weightedReturnSum = (bucketSums.taxable * (liquidAllocations.taxable.stocks / 100 * state.stockReturn + liquidAllocations.taxable.bonds / 100 * state.bondReturn)) +
        (bucketSums.preTax * (liquidAllocations.preTax.stocks / 100 * state.stockReturn + liquidAllocations.preTax.bonds / 100 * state.bondReturn)) +
        (bucketSums.roth * (liquidAllocations.roth.stocks / 100 * state.stockReturn + liquidAllocations.roth.bonds / 100 * state.bondReturn)) +
        (bucketSums.cash * (liquidAllocations.cash.stocks / 100 * state.stockReturn + liquidAllocations.cash.cash / 100 * state.bondReturn));

    const blendedReturn = totalLiquidValue > 0 ? (weightedReturnSum / totalLiquidValue) / 100 : 0.05;

    // 2. Liabilities
    const liabilities: SimLiability[] = state.liabilities.map(l => ({
        id: l.id,
        name: l.name,
        balance: l.balance,
        interestRate: l.interestRate, // %
        minPayment: l.minPayment * 12 // annualize
    }));

    // 3. Income Streams
    const incomeStreams: SimIncomeStream[] = state.income.map(inc => ({
        name: inc.name,
        type: inc.type as any, // Cast to match sim type
        amount: inc.amount,
        startAge: Number(inc.startAge) || state.currentAge,
        endAge: inc.endAge ? Number(inc.endAge) : undefined,
        growthRate: inc.growthRate,
        taxType: inc.taxType,
        ssBirthYear: new Date().getFullYear() - state.currentAge + (Number(inc.startAge) || 67) // Approximation
    }));

    // 4. Expense Streams
    const expenseStreams: SimExpenseStrategy[] = state.expenses.map(exp => ({
        name: exp.name,
        amount: exp.amount,
        strategy: exp.strategy,
        startAge: Number(exp.startAge) || state.currentAge,
        endAge: exp.endAge ? Number(exp.endAge) : undefined,
        unexpectedAmount: exp.unexpectedAmount || 0,
        unexpectedChance: exp.unexpectedChance || 0,
        floorAmount: exp.floorAmount,
        crashCutMultiple: exp.crashCutMultiple,
        crashCutDuration: exp.crashCutDuration
    }));

    // 5. Market Returns (Constant for Single Run)
    const duration = endYear - startYear + 1;
    const marketReturns = Array(duration).fill(0).map(() => ({
        stockReturn: blendedReturn, // Still used as default if not itemized, or for MC volatility
        bondReturn: state.bondReturn / 100,
        cashReturn: 0.01,
        inflation: state.inflationRate / 100,
        propertyReturn: 0.03
    }));

    // Calculate average property return if exists
    const properties = state.assets.filter(a => a.type === 'property');
    if (properties.length > 0) {
        const totalProp = properties.reduce((acc, p) => acc + p.value, 0);
        const wProp = properties.reduce((acc, p) => acc + (p.value * p.returnRate), 0);
        const avgProp = wProp / totalProp;
        marketReturns.forEach(m => m.propertyReturn = avgProp / 100);
    }

    return {
        startYear,
        endYear,
        currentAge: state.currentAge,
        initialPortfolio,
        liabilities,
        marketReturns,
        incomeStreams,
        expenseStreams,
        tax: {
            filingStatus: state.filingStatus,
            preTaxDiscount: state.preTaxDiscount / 100,
            state: state.taxState
        },
        strategy: {
            rothConversion: {
                type: state.rothStrategy,
                targetBracketRate: state.rothTargetBracket / 100,
                fixedAmount: state.rothFixedAmount,
                stayIn0PercentZone: state.rothStayIn0PercentZone
            },
            enableTaxGainHarvesting: state.enableTaxGainHarvesting
        },
        savingsAllocation: {
            ...state.savingsAllocation,
            employerMatch: state.employerMatch
        } as any,
        healthConfig: {
            medicarePeopleCount: state.medicarePeopleCount,
            includeBasePremium: state.includeBaseMedicare,
            enableMedicaid: state.enableMedicaidSafetyNet
        },
        liquidAllocations
    };
}
