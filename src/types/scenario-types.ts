import { AnnualResult } from "@/lib/engine/simulation";
import { MonteCarloResult } from "@/lib/engine/monteCarlo";
import { HistoricalAggregateResult } from "@/lib/engine/historical";
import { RothStrategyResult } from "@/lib/engine/optimizer";
import { FilingStatus } from "@/lib/engine/taxes";
import { MC_ITERATIONS } from "@/lib/constants";

export type MonteCarloDistributionType = 'historical' | 'custom';

// --- New Itemized Types ---

export type AssetType = 'savings' | 'taxable' | 'traditional' | 'roth' | 'property' | 'other';

export interface MilestoneCondition {
    type: 'portfolio_percent_greater_than_value';
    portfolioPercent: number; // e.g. 4
    targetValue: number; // inflation adjusted
}

export interface Milestone {
    id: string;
    name: string;
    condition: MilestoneCondition;
}

export interface AssetItem {
    id: string;
    name: string;
    type: AssetType;
    value: number;
    returnRate: number; // annual %
    stockWeight?: number; // 0-100%
    // Taxable specific
    costBasis?: number;
    // Property specific
    mortgageBalance?: number;
    mortgageRate?: number;
    monthlyPayment?: number;
}

export type LiabilityType = 'credit_card' | 'student_loan' | 'car_loan' | 'medical' | 'personal' | 'other';

export interface LiabilityItem {
    id: string;
    name: string;
    type: LiabilityType;
    balance: number;
    interestRate: number;
    minPayment: number;
}

export type IncomeType = 'salary' | 'social_security' | 'pension' | 'rental' | 'side_hustle' | 'inheritance' | 'other';

export interface IncomeItem {
    id: string;
    name: string;
    type: IncomeType;
    amount: number; // annual
    startAge?: number | string; // number (age) or string (milestone id)
    endAge?: number | string; // if undefined, goes forever (or until death)
    growthRate: number;
    taxType: 'ordinary' | 'capital_gains' | 'tax_free';
}

export type ExpenseType = 'living' | 'healthcare' | 'travel' | 'educational' | 'other';
export type ExpenseStrategy = 'inflation_adjusted' | 'percentage' | 'retirement_smile';

export interface ExpenseItem {
    id: string;
    name: string;
    type: ExpenseType;
    amount: number; // initial annual amount
    strategy: ExpenseStrategy;
    startAge?: number | string;
    endAge?: number | string;
    // For unexpected costs
    unexpectedAmount?: number;
    unexpectedChance?: number; // 0-100%
    floorAmount?: number; // Minimum spending floor
    crashCutMultiple?: number; // Multiple of market drop to cut spending (e.g. 1.5x)
    crashCutDuration?: number; // Number of years the cut persists after a crash
    stockWeight?: number; // 0-100%
}

/**
 * Calculator input state - all the parameters needed for a simulation
 * Now updated to use item lists
 */
export interface CalculatorState {
    // Goals / Demographics
    currentAge: number;
    simulationEndAge: number;
    stockReturn: number;
    stockStdDev: number; // Added
    bondReturn: number;
    filingStatus: FilingStatus;

    // Lists
    assets: AssetItem[];
    liabilities: LiabilityItem[];
    income: IncomeItem[];
    expenses: ExpenseItem[];
    milestones: Milestone[];

    // Global economic assumptions (defaults)
    inflationRate: number;
    preTaxDiscount: number;

    // Optimization Settings
    isRothAutoOptimized: boolean;
    rothStrategy: 'none' | 'fill_bracket' | 'fixed_amount';
    rothTargetBracket: number;
    rothFixedAmount: number;
    rothStayIn0PercentZone: boolean;
    enableTaxGainHarvesting: boolean;
    taxState: string;

    // Savings Allocation
    savingsAllocation: {
        trad401k: boolean;
        megaBackdoorRoth: boolean;
        roth: boolean;
        brokerage: boolean;
    };
    employerMatch: number; // Annual employer 401k match amount

    // Healthcare
    medicarePeopleCount: number;
    includeBaseMedicare: boolean;
    enableMedicaidSafetyNet: boolean;

    // Monte Carlo Config
    mcDistributionType: MonteCarloDistributionType;
}

/**
 * Results from running a simulation
 */
export interface ScenarioResults {
    singleRunResults: AnnualResult[];
    monteCarloResults?: MonteCarloResult;
    historicalResults?: HistoricalAggregateResult;
    strategyComparison?: RothStrategyResult[];
    lastRunInputState?: CalculatorState;
    lastRunTimestamp?: number;
}

/**
 * A complete scenario with inputs and results
 */
export interface Scenario {
    id: string;
    name: string;
    inputState: CalculatorState;
    results?: ScenarioResults;
}

/**
 * Configuration for an input section in the registry
 */
export interface InputSectionConfig {
    id: string;
    label: string;
    component: React.ComponentType<InputSectionProps>;
    defaultCollapsed?: boolean;
}

/**
 * Props passed to each input section component
 */
export interface InputSectionProps {
    state: CalculatorState;
    onChange: (newState: CalculatorState) => void;
}

/**
 * Default initial state for a new scenario
 */
export const DEFAULT_CALCULATOR_STATE: CalculatorState = {
    currentAge: 55,
    simulationEndAge: 95,
    stockReturn: 7.0,
    stockStdDev: 15.0, // Default to 15%
    bondReturn: 3.5,
    filingStatus: 'married_joint',

    inflationRate: 3.0,
    preTaxDiscount: 20,

    assets: [
        { id: '1', name: 'Brokerage', type: 'taxable', value: 3200000, costBasis: 1280000, returnRate: 7.0, stockWeight: 100 },
        { id: '2', name: '401k', type: 'traditional', value: 400000, returnRate: 7.0, stockWeight: 100 },
        { id: '3', name: 'Roth IRA', type: 'roth', value: 400000, returnRate: 7.0, stockWeight: 100 }
    ],
    liabilities: [],
    income: [
        { id: '1', name: 'Social Security', type: 'social_security', amount: 24000, startAge: 70, growthRate: 3.0, taxType: 'ordinary' }
    ],
    expenses: [
        { id: '1', name: 'Core Living', type: 'living', amount: 160000, strategy: 'retirement_smile', startAge: 55, endAge: 95, floorAmount: 100000, crashCutMultiple: 1.0, crashCutDuration: 5 }
    ],
    milestones: [],

    isRothAutoOptimized: true,
    rothStrategy: 'none',
    rothTargetBracket: 12,
    rothFixedAmount: 0,
    rothStayIn0PercentZone: false,
    enableTaxGainHarvesting: true,
    taxState: 'none',

    savingsAllocation: {
        trad401k: false,
        megaBackdoorRoth: false,
        roth: false,
        brokerage: true
    },
    employerMatch: 0,

    medicarePeopleCount: 2,
    includeBaseMedicare: true,
    enableMedicaidSafetyNet: true,

    mcDistributionType: 'custom',
};
