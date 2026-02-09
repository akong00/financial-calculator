
import { runSimulation, SimulationParams } from '../simulation';

const params: SimulationParams = {
    startYear: 2026,
    endYear: 2030,
    currentAge: 60,
    initialPortfolio: {
        taxable: 1000,
        taxableBasis: 1000,
        preTax: 0,
        roth: 0,
        cash: 1000,
        property: 500000 // Large property value
    },
    liabilities: [],
    milestones: [],
    marketReturns: Array(5).fill({
        stockReturn: 0.05,
        bondReturn: 0.02,
        cashReturn: 0.01,
        inflation: 0.02,
        propertyReturn: 0.03
    }),
    incomeStreams: [],
    expenseStreams: [{
        name: 'Living',
        amount: 10000, // Higher than liquid assets
        strategy: 'inflation_adjusted',
        startAge: 60,
        endAge: 70,
        unexpectedAmount: 0,
        unexpectedChance: 0
    }],
    tax: { filingStatus: 'single' },
    strategy: {
        rothConversion: { type: 'none' },
        enableTaxGainHarvesting: false
    },
    savingsAllocation: {
        trad401k: false,
        megaBackdoorRoth: false,
        roth: false,
        brokerage: false
    },
    healthConfig: {
        medicarePeopleCount: 0,
        includeBasePremium: false,
        enableMedicaid: false
    },
    liquidAllocations: {
        taxable: { stocks: 1, bonds: 0, cash: 0 },
        preTax: { stocks: 1, bonds: 0, cash: 0 },
        roth: { stocks: 1, bonds: 0, cash: 0 },
        cash: { stocks: 0, bonds: 0, cash: 1 }
    }
};

const result = runSimulation(params);

console.log('Result Net Worth (End):', result.results[result.results.length - 1].netWorth);
console.log('Is Exhausted:', result.isExhausted);
console.log('Failure Year:', result.failureYear);
console.log('Failure Age:', result.failureAge);

if (result.results[result.results.length - 1].netWorth > 0 && result.isExhausted && result.failureYear === 2026 && result.failureAge === 60) {
    console.log('SUCCESS: Correctly identified failure timing despite positive net worth.');
} else {
    console.log('FAILURE: Did not catch exhaustion or timing correctly.');
}
