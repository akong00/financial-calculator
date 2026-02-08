
import { runSimulation, SimulationParams } from '../src/lib/engine/simulation';

const params: SimulationParams = {
    startYear: 2026,
    endYear: 2027,
    currentAge: 65,
    initialPortfolio: {
        taxable: 1000000,
        taxableBasis: 800000,
        preTax: 1000000,
        roth: 0,
        cash: 0,
        property: 0
    },
    liabilities: [],
    milestones: [],
    marketReturns: [
        { stockReturn: 0.05, bondReturn: 0.02, cashReturn: 0.01, inflation: 0.02, propertyReturn: 0.02 },
        { stockReturn: 0.05, bondReturn: 0.02, cashReturn: 0.01, inflation: 0.02, propertyReturn: 0.02 }
    ],
    incomeStreams: [],
    expenseStreams: [{
        name: 'Basic Living',
        amount: 50000,
        strategy: 'inflation_adjusted',
        startAge: 65,
        endAge: 100,
        unexpectedAmount: 0,
        unexpectedChance: 0
    }],
    tax: {
        filingStatus: 'single',
        state: 'CA'
    },
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
        medicarePeopleCount: 1,
        includeBasePremium: true,
        enableMedicaid: false
    },
    liquidAllocations: {
        taxable: { stocks: 1, bonds: 0, cash: 0 },
        preTax: { stocks: 1, bonds: 0, cash: 0 },
        roth: { stocks: 1, bonds: 0, cash: 0 },
        cash: { stocks: 0, bonds: 0, cash: 1 }
    }
};

const { results } = runSimulation(params);
let r = results[0];

console.log('--- Test 1: Retirement Withdrawal Verification ---');
console.log('Age:', r.age);
console.log('Spending Needed:', r.cashFlow.spending);
console.log('Reported Taxes:', r.cashFlow.taxes);
console.log('Withdrawals Total:', r.cashFlow.withdrawals.total);
console.log('Withdrawals Detail:', r.cashFlow.withdrawals);

const totalCost1 = r.cashFlow.spending + r.cashFlow.taxes;
const withdrawalDiff1 = Math.abs(r.cashFlow.withdrawals.total - totalCost1);
if (withdrawalDiff1 < 1) {
    console.log('SUCCESS: Withdrawals matches spending + taxes.');
} else {
    console.log('FAILURE: Withdrawals misaligned with spending + taxes.');
    process.exit(1);
}

console.log('\n--- Test 2: Salary Surplus Verification ---');
const params2: SimulationParams = {
    ...params,
    currentAge: 40,
    incomeStreams: [{
        name: 'Salary',
        type: 'salary',
        amount: 150000,
        startAge: 40,
        endAge: 60,
        growthRate: 0,
        taxType: 'ordinary'
    }],
    expenseStreams: [{
        name: 'Living',
        amount: 80000,
        strategy: 'inflation_adjusted',
        startAge: 40,
        endAge: 100,
        unexpectedAmount: 0,
        unexpectedChance: 0
    }]
};

const results2 = runSimulation(params2).results;
r = results2[0];

console.log('Age:', r.age);
console.log('Salary:', r.cashFlow.income.gross);
console.log('Spending:', r.cashFlow.spending);
console.log('Taxes:', r.cashFlow.taxes);
console.log('Withdrawals Total:', r.cashFlow.withdrawals.total);
console.log('Savings Detail:', r.cashFlow.savingsDetails);

if (r.cashFlow.withdrawals.total < 1) {
    console.log('SUCCESS: Salary covered expenses and taxes, zero withdrawals.');
} else {
    console.log('FAILURE: Unexpected withdrawals found even with salary surplus.');
    process.exit(1);
}

const federal = r.taxDetails.federal;
const state = r.taxDetails.state;
const medicare = r.taxDetails.medicare;
const aggregatedTax = federal + state + medicare;

console.log('\n--- Final Aggregation Check ---');
console.log('Aggregated Tax from Details:', aggregatedTax);
if (Math.abs(r.cashFlow.taxes - aggregatedTax) < 0.1) {
    console.log('SUCCESS: All taxes correctly aggregated in cashFlow.taxes.');
} else {
    console.log('FAILURE: cashFlow.taxes does not match sum of details.');
    process.exit(1);
}
