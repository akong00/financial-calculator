
import { TAX_DATA_2025, calculateFederalTax, calculateIRMAA, FilingStatus, scaleTaxConstants, calculateStateTax } from './taxes';
import { calculateSocialSecurityBenefit, calculateTaxableSocialSecurity, SocialSecurityInput } from './socialSecurity';
import { calculateRMD } from './rmd';

// --- Types ---

export interface PortfolioState {
    taxable: number;
    taxableBasis: number;
    preTax: number;
    roth: number;
    cash: number;
    property: number; // Illiquid, tracks separately
}

export interface SimAsset {
    value: number;
    costBasis: number;
    returnRate: number; // Real or Nominal? detailed parameters typically assume Nominal stock return. 
    type: 'taxable' | 'preTax' | 'roth' | 'cash' | 'property';
}

export interface SimLiability {
    id: string;
    name: string;
    balance: number;
    interestRate: number;
    minPayment: number;
}

export interface SimIncomeStream {
    name: string;
    type: 'social_security' | 'ordinary' | 'capital_gains' | 'tax_free';
    amount: number;
    startAge: number;
    endAge?: number;
    growthRate: number;
    taxType: 'ordinary' | 'capital_gains' | 'tax_free';
    // For SS specifically:
    ssBirthYear?: number;
}

export interface SimExpenseStrategy {
    name: string;
    amount: number;
    strategy: 'inflation_adjusted' | 'percentage' | 'retirement_smile';
    startAge: number;
    endAge?: number;
    unexpectedAmount: number;
    unexpectedChance: number;
    floorAmount?: number;
    crashCutMultiple?: number;
    crashCutDuration?: number;
}

export interface SimulationParams {
    startYear: number;
    endYear: number;
    currentAge: number;

    // Initial State
    initialPortfolio: PortfolioState; // Aggregated starting buckets
    liabilities: SimLiability[];      // Detailed debt list

    // Market Data (One global inflation, but maybe asset-specific returns?)
    // For simplicity, we still use global market returns for LIQUID assets, 
    // but Property might use its own fixed rate from inputs.
    marketReturns: {
        stockReturn: number;
        bondReturn: number;
        cashReturn: number;
        inflation: number;
        propertyReturn: number; // Added
    }[];

    // Stream Definitions
    incomeStreams: SimIncomeStream[];
    expenseStreams: SimExpenseStrategy[];

    // Tax & Global Config
    tax: {
        filingStatus: FilingStatus;
        preTaxDiscount?: number;
        state?: string;
    };

    strategy: {
        rothConversion: {
            type: 'none' | 'fill_bracket' | 'fixed_amount';
            targetBracketRate?: number;
            fixedAmount?: number;
            startAge?: number;
            endAge?: number;
            stayIn0PercentZone?: boolean;
        };
        enableTaxGainHarvesting: boolean;
    };

    savingsAllocation: {
        trad401k: boolean;
        megaBackdoorRoth: boolean;
        roth: boolean;
        brokerage: boolean;
    };

    healthConfig: {
        medicarePeopleCount: number;
        includeBasePremium: boolean;
        enableMedicaid: boolean;
    };
}

export interface AnnualResult {
    year: number;
    age: number;
    portfolio: PortfolioState;
    netWorth: number;
    totalDebt: number;
    cashFlow: {
        totalExpenses: number;    // Target spending + Debt payments + Taxes
        spending: number;         // Actual living expenses
        debtPayments: number;
        taxes: number;

        income: {
            gross: number;
            ss: number;
            other: number;
        };

        withdrawals: {
            total: number;
            taxable: number;
            preTax: number;
            roth: number;
            cash: number;
        };

        rmd: number;
        rothConversion: number;
        taxGainHarvesting: number;
    };
    taxDetails: {
        agi: number;
        taxableIncome: number;
        federal: number;
        state: number;
        medicare: number;
        effectiveRate: number;
        marginalRate: number;
    };
    inflationAdjustmentFactor: number;
}

// --- Helpers ---

/**
 * Calculate 401k contribution limits based on age and year
 * Includes catch-up contributions and inflation adjustments
 */
function get401kLimits(age: number, currentYear: number): {
    employeeDeferral: number; // Traditional or Roth 401k limit
    total: number;            // Overall 401k limit (employee + employer + after-tax)
} {
    const baseYear = 2026;
    const inflation = 0.025; // Rough estimate for annual limit increases
    const yearsDiff = currentYear - baseYear;
    const adjustmentFactor = Math.pow(1 + inflation, yearsDiff);

    // Base limits for 2026
    let employeeDeferral = 24500 * adjustmentFactor;
    let total = 72000 * adjustmentFactor;

    // Catch-up contributions
    if (age >= 60 && age <= 63) {
        // Super catch-up for ages 60-63
        employeeDeferral += 11250 * adjustmentFactor;
        total += 11250 * adjustmentFactor;
    } else if (age >= 50) {
        // Regular catch-up for ages 50+
        employeeDeferral += 8000 * adjustmentFactor;
        total += 8000 * adjustmentFactor;
    }

    // Round to nearest $500 for employee deferral, $1000 for total
    return {
        employeeDeferral: Math.round(employeeDeferral / 500) * 500,
        total: Math.round(total / 1000) * 1000
    };
}

function calculateExpenseAmount(strategy: SimExpenseStrategy, currentAge: number, inflationFactor: number, portfolioValue: number, activeCutPercent: number): number {
    if (currentAge < strategy.startAge || (strategy.endAge && currentAge > strategy.endAge)) return 0;

    let base = 0;

    // 1. Base Amount Calculation
    switch (strategy.strategy) {
        case 'inflation_adjusted':
            base = strategy.amount * inflationFactor;
            break;
        case 'percentage':
            base = portfolioValue * (strategy.amount / 100);
            break;
        case 'retirement_smile':
            let cumulativeSmileFactor = 1.0;
            const startAge = strategy.startAge;

            for (let age = startAge + 1; age <= currentAge; age++) {
                let r = 0;
                if (age <= 75) {
                    const progress = (age - startAge) / (Math.max(1, 75 - startAge));
                    r = -0.02 * progress;
                } else if (age <= 90) {
                    const progress = (age - 75) / (90 - 75);
                    r = -0.02 * (1 - progress);
                } else {
                    r = 0;
                }
                cumulativeSmileFactor *= (1 + r);
            }
            base = strategy.amount * inflationFactor * cumulativeSmileFactor;
            break;
    }

    // 2. Apply Pre-calculated Cut (from Simulation Loop tracking)
    if (activeCutPercent > 0) {
        base = base * (1 - activeCutPercent);
    }

    // 3. Universal Floor
    if (strategy.floorAmount) {
        const dollarFloor = strategy.floorAmount * inflationFactor;
        base = Math.max(base, dollarFloor);
    }

    // 4. Unexpected Costs
    if (strategy.unexpectedAmount > 0 && strategy.unexpectedChance > 0) {
        if (Math.random() * 100 < strategy.unexpectedChance) {
            base += (strategy.unexpectedAmount * inflationFactor);
        }
    }

    return base;
}

export function runSimulation(params: SimulationParams): AnnualResult[] {
    const results: AnnualResult[] = [];

    // Working State
    let currentPortfolio = { ...params.initialPortfolio };
    const currentLiabilities = params.liabilities.map(l => ({ ...l }));

    // Persistent Cut Tracking
    const crashStates = params.expenseStreams.map(() => ({
        activeCutPercent: 0,
        yearsRemaining: 0
    }));

    let portfolioExhausted = false;

    // Tracking
    let currentAge = params.currentAge;
    let inflationAccumulator = 1.0;
    const preTaxDiscountFactor = 1 - (params.tax.preTaxDiscount || 0);

    for (let year = params.startYear; year <= params.endYear; year++) {
        let safeYearIdx = Math.max(0, year - params.startYear);
        const market = params.marketReturns[safeYearIdx] || { stockReturn: 0.07, bondReturn: 0.03, cashReturn: 0.01, inflation: 0.03, propertyReturn: 0.03 };

        const liquidPortfolioValue = currentPortfolio.taxable + currentPortfolio.preTax + currentPortfolio.roth + currentPortfolio.cash;

        // 1. Update Crash States & Calculate Expenses
        let spendingNeeded = 0;
        params.expenseStreams.forEach((exp, idx) => {
            const state = crashStates[idx];

            // Trigger new crash cut if market is down
            if (market.stockReturn < 0 && exp.crashCutMultiple) {
                const potentialCut = Math.abs(market.stockReturn) * exp.crashCutMultiple;
                // If this crash is worse than the current one being mitigated, or no cut is active
                if (potentialCut > state.activeCutPercent || state.yearsRemaining <= 0) {
                    state.activeCutPercent = potentialCut;
                    state.yearsRemaining = exp.crashCutDuration || 5;
                }
            }

            spendingNeeded += calculateExpenseAmount(exp, currentAge, inflationAccumulator, liquidPortfolioValue, state.activeCutPercent);

            // Step duration
            if (state.yearsRemaining > 0) {
                state.yearsRemaining--;
                if (state.yearsRemaining === 0) {
                    state.activeCutPercent = 0;
                }
            }
        });

        // 2. Calculate Debt Payments
        let debtPayments = 0;
        currentLiabilities.forEach(l => {
            if (l.balance > 0) {
                const payment = Math.min(l.balance, l.minPayment); // Simplify: pay min or balance
                // Wait, minPayment is usually monthly * 12? Assuming annual inputs.
                debtPayments += payment;
            }
        });

        // 3. Calculate Income
        let grossOrdinary = 0;
        let grossCapital = 0;
        let grossTaxFree = 0;
        let ssAmount = 0;

        params.incomeStreams.forEach(inc => {
            if (currentAge >= inc.startAge && (!inc.endAge || currentAge <= inc.endAge)) {
                // Growth Model: Nominal Amount = Initial Amount * (1 + GrowthRate/100)^YearsSinceStart
                // This ensures that if GrowthRate == InflationRate, the Real value (Nominal / InflationAccumulator)
                // remains constant at the initial amount.
                const yearsSinceStart = currentAge - params.currentAge;
                const amt = inc.amount * Math.pow(1 + inc.growthRate / 100, yearsSinceStart);

                if (inc.type === 'social_security') {
                    ssAmount += amt; // Track separately for SS taxation
                } else {
                    if (inc.taxType === 'ordinary') grossOrdinary += amt;
                    else if (inc.taxType === 'capital_gains') grossCapital += amt;
                    else grossTaxFree += amt;
                }
            }
        });

        // 4. RMD (Required Minimum Distribution)
        const rmd = calculateRMD(currentAge, currentPortfolio.preTax, new Date().getFullYear() - params.currentAge);
        grossOrdinary += rmd; // RMD is ordinary income
        currentPortfolio.preTax = Math.max(0, currentPortfolio.preTax - rmd); // Remove RMD from account

        // Save original values for reporting (before traditional 401k reduces them)
        const originalGrossOrdinary = grossOrdinary;
        const originalGrossCapital = grossCapital;
        const originalGrossTaxFree = grossTaxFree;
        const originalSsAmount = ssAmount;

        // 5. Calculate initial cash flow (before any 401k contributions)
        const grossIncome = grossOrdinary + grossCapital + grossTaxFree + ssAmount;
        const totalOutflow = spendingNeeded + debtPayments;
        const initialGap = totalOutflow - grossIncome;

        // Get contribution limits for this year
        const limits = get401kLimits(currentAge, year);
        const employerMatchAmount = params.savingsAllocation.trad401k ?
            (params as any).employerMatch || 0 : 0; // TODO: Add employerMatch to params properly

        // 6. PRE-TAX Traditional 401k Contribution (happens BEFORE tax calculation)
        let trad401kContribution = 0;
        if (params.savingsAllocation.trad401k && initialGap < 0) {
            // We have surplus, allocate to traditional 401k (reduces taxable income)
            const availableSurplus = -initialGap;
            const maxContribution = Math.min(
                limits.employeeDeferral,
                availableSurplus
            );
            trad401kContribution = maxContribution;
            currentPortfolio.preTax += trad401kContribution;
            grossOrdinary -= trad401kContribution; // CRITICAL: Reduce taxable income
        }

        // 7. Simplified tax estimation (for pre-tax contribution decision)
        // Note: Full final tax calculation happens after Roth conversions below
        const estimatedTaxRate = 0.22; // Rough middle-class estimate for quick calculation
        const estimatedTax = Math.max(0, (grossIncome - trad401kContribution) * estimatedTaxRate);

        // 8. Calculate after-tax cash flow
        const afterTaxIncome = grossIncome - trad401kContribution - estimatedTax;
        const postTaxGap = totalOutflow - afterTaxIncome;

        // 9. Handle POST-TAX surplus or deficit
        const withdrawals = { taxable: 0, preTax: 0, roth: 0, cash: 0, total: 0 };
        let megaBackdoorContribution = 0;
        let rothContribution = 0;
        let brokerageContribution = 0;

        if (postTaxGap > 0) {
            // DEFICIT: Need to withdraw
            let remaining = postTaxGap;

            // Withdrawal Order: Brokerage -> Cash -> Pre-Tax -> Roth
            // 1. Brokerage first (usually most tax-efficient)
            if (remaining > 0 && currentPortfolio.taxable > 0) {
                const take = Math.min(currentPortfolio.taxable, remaining);
                const basisFrac = currentPortfolio.taxableBasis / currentPortfolio.taxable;
                withdrawals.taxable += take;
                currentPortfolio.taxable -= take;
                currentPortfolio.taxableBasis -= (take * basisFrac);
                remaining -= take;
            }

            // 2. Cash
            if (remaining > 0 && currentPortfolio.cash > 0) {
                const take = Math.min(currentPortfolio.cash, remaining);
                currentPortfolio.cash -= take;
                withdrawals.cash += take;
                remaining -= take;
            }

            // 3. Pre-Tax
            if (remaining > 0 && currentPortfolio.preTax > 0) {
                const take = Math.min(currentPortfolio.preTax, remaining);
                withdrawals.preTax += take;
                currentPortfolio.preTax -= take;
                remaining -= take;
            }

            // 4. Roth (last resort)
            if (remaining > 0 && currentPortfolio.roth > 0) {
                const take = Math.min(currentPortfolio.roth, remaining);
                withdrawals.roth += take;
                currentPortfolio.roth -= take;
                remaining -= take;
            }

            withdrawals.total = (postTaxGap - remaining);
            if (remaining > 0.01) {
                portfolioExhausted = true;
            }
        } else if (!portfolioExhausted) {
            // SURPLUS: Allocate to POST-TAX accounts
            let surplus = -postTaxGap;

            // Calculate room for mega backdoor
            const totalRoomUsed = trad401kContribution + employerMatchAmount;
            const megaBackdoorRoom = Math.max(0, limits.total - totalRoomUsed);

            // Calculate room for regular Roth (shares employee deferral limit with trad 401k)
            const rothRoom = Math.max(0, limits.employeeDeferral - trad401kContribution);

            // Mega Backdoor Roth (after-tax contribution within overall 401k limit)
            if (params.savingsAllocation.megaBackdoorRoth && surplus > 0) {
                megaBackdoorContribution = Math.min(megaBackdoorRoom, surplus);
                currentPortfolio.roth += megaBackdoorContribution;
                surplus -= megaBackdoorContribution;
            }

            // Regular Roth (if not maxed on employee deferral)
            if (params.savingsAllocation.roth && surplus > 0) {
                rothContribution = Math.min(rothRoom, surplus);
                currentPortfolio.roth += rothContribution;
                surplus -= rothContribution;
            }

            // Brokerage (catch-all for remaining surplus)
            if (surplus > 0) {
                brokerageContribution = surplus;
                currentPortfolio.taxable += brokerageContribution;
                currentPortfolio.taxableBasis += brokerageContribution; // Full basis for new contributions
            }
        }

        // Calculate derived values needed for Roth conversion and tax gain harvesting
        const taxableGain = withdrawals.taxable > 0 && currentPortfolio.taxable > 0
            ? withdrawals.taxable * (1 - (currentPortfolio.taxableBasis / currentPortfolio.taxable))
            : 0;

        // Calculate taxable Social Security
        const provisionalIncome = grossOrdinary + (grossCapital * 0.5) + (ssAmount * 0.5);
        let taxableSS = 0;
        if (params.tax.filingStatus === 'single') {
            if (provisionalIncome > 34000) taxableSS = Math.min(ssAmount * 0.85, ssAmount);
            else if (provisionalIncome > 25000) taxableSS = Math.min(ssAmount * 0.50, ssAmount);
        } else {
            if (provisionalIncome > 44000) taxableSS = Math.min(ssAmount * 0.85, ssAmount);
            else if (provisionalIncome > 32000) taxableSS = Math.min(ssAmount * 0.50, ssAmount);
        }

        const preliminaryOrdinaryIncome = grossOrdinary + withdrawals.preTax + taxableSS;
        const yearData = scaleTaxConstants(TAX_DATA_2025, inflationAccumulator);
        const deduction = yearData.standardDeduction[params.tax.filingStatus];
        const initialTaxableOrdinary = Math.max(0, preliminaryOrdinaryIncome - deduction);

        // --- Roth Conversion and Tax Gain Harvesting (Optional Strategies) ---
        let rothConversionAmount = 0;
        let taxGainHarvestingAmount = 0;

        const rothConfig = params.strategy.rothConversion;
        if (rothConfig.type !== 'none' && currentPortfolio.preTax > 0) {
            const startAge = rothConfig.startAge || 0;
            const endAge = rothConfig.endAge || 999;

            if (currentAge >= startAge && currentAge <= endAge) {
                let room = 0;
                if (rothConfig.type === 'fill_bracket') {
                    const targetRate = rothConfig.targetBracketRate ?? 0;
                    if (targetRate < 0.01) {
                        // Target: Standard Deduction boundary (0% taxable ordinary)
                        room = Math.max(0, deduction - preliminaryOrdinaryIncome);
                    } else {
                        const brackets = yearData.brackets[params.tax.filingStatus];
                        const targetBracket = brackets.find(b => b.rate <= targetRate + 0.001 && (brackets[brackets.indexOf(b) + 1]?.rate > targetRate + 0.001 || !brackets[brackets.indexOf(b) + 1])) || brackets[0];
                        room = Math.max(0, targetBracket.limit - initialTaxableOrdinary);
                    }

                    if (rothConfig.stayIn0PercentZone) {
                        const ltcgLimit = yearData.longTermCapGains[params.tax.filingStatus][0].limit;
                        const prelimLTCG = taxableGain + grossCapital;
                        const roomToLTCGLimit = Math.max(0, ltcgLimit - initialTaxableOrdinary - prelimLTCG);
                        room = Math.min(room, roomToLTCGLimit);
                    }
                } else if (rothConfig.type === 'fixed_amount') {
                    room = (rothConfig.fixedAmount || 0) * inflationAccumulator;
                }

                rothConversionAmount = Math.min(currentPortfolio.preTax, room);
                if (rothConversionAmount > 0) {
                    currentPortfolio.preTax -= rothConversionAmount;
                    currentPortfolio.roth += rothConversionAmount;
                }
            }
        }

        // Tax Gain Harvesting
        if (params.strategy.enableTaxGainHarvesting && currentPortfolio.taxable > 0) {
            const ltcgLimit = yearData.longTermCapGains[params.tax.filingStatus][0].limit;
            const currentTaxableOrdinary = Math.max(0, preliminaryOrdinaryIncome + rothConversionAmount - deduction);
            const currentLTCG = taxableGain + grossCapital;

            // Stack: Ordinary -> LTCG. Harvesting fills remaining room in 0% bracket.
            const harvestingRoom = Math.max(0, ltcgLimit - currentTaxableOrdinary - currentLTCG);
            const unrealizedGain = Math.max(0, currentPortfolio.taxable - currentPortfolio.taxableBasis);

            taxGainHarvestingAmount = Math.min(unrealizedGain, harvestingRoom);
            if (taxGainHarvestingAmount > 0) {
                currentPortfolio.taxableBasis += taxGainHarvestingAmount;
            }
        }

        // 7. Final Tax Calculation
        const finalTaxInput: any = {
            wages: 0,
            shortTermCapGains: 0,
            longTermCapGains: taxableGain + grossCapital + taxGainHarvestingAmount,
            qualifiedDividends: 0,
            otherOrdinaryIncome: preliminaryOrdinaryIncome + rothConversionAmount,
            preTaxContributions: 0,
            filingStatus: params.tax.filingStatus
        };

        const taxRes = calculateFederalTax(finalTaxInput, yearData);
        const stateTax = calculateStateTax(taxRes.incomeSummary.agi, params.tax.state || 'none');

        let healthcareSurcharges = 0;
        if (params.healthConfig.includeBasePremium && currentAge >= 65 && !params.healthConfig.enableMedicaid) {
            healthcareSurcharges = 2000 * params.healthConfig.medicarePeopleCount;
        }

        const totalTax = taxRes.totalTax + stateTax + healthcareSurcharges;

        // 8. Pay Taxes
        let taxRemaining = totalTax;
        if (currentPortfolio.cash >= taxRemaining) {
            currentPortfolio.cash -= taxRemaining;
            taxRemaining = 0;
        } else {
            taxRemaining -= currentPortfolio.cash; currentPortfolio.cash = 0;
            if (currentPortfolio.taxable >= taxRemaining) {
                const take = taxRemaining;
                const basisFrac = currentPortfolio.taxableBasis / currentPortfolio.taxable;
                currentPortfolio.taxable -= take;
                currentPortfolio.taxableBasis -= (take * basisFrac);
                taxRemaining = 0;
            } else {
                taxRemaining -= currentPortfolio.taxable; currentPortfolio.taxable = 0; currentPortfolio.taxableBasis = 0;
                if (currentPortfolio.preTax >= taxRemaining) {
                    currentPortfolio.preTax -= taxRemaining; taxRemaining = 0;
                } else {
                    taxRemaining -= currentPortfolio.preTax; currentPortfolio.preTax = 0;
                    currentPortfolio.roth = Math.max(0, currentPortfolio.roth - taxRemaining);
                }
            }
        }

        // 9. Update Debts
        let totalDebt = 0;
        currentLiabilities.forEach(l => {
            l.balance = Math.max(0, l.balance - l.minPayment);
            l.balance *= (1 + l.interestRate / 100);
            totalDebt += l.balance;
        });

        // 10. Market Growth (End of Year)
        currentPortfolio.taxable *= (1 + market.stockReturn);
        currentPortfolio.preTax *= (1 + market.stockReturn);
        currentPortfolio.roth *= (1 + market.stockReturn);
        currentPortfolio.cash *= (1 + market.cashReturn);

        // Property Growth
        currentPortfolio.property *= (1 + market.propertyReturn);

        // 11. Inflation Step
        inflationAccumulator *= (1 + market.inflation);
        currentAge++;

        // Result Record
        results.push({
            year,
            age: currentAge,
            portfolio: { ...currentPortfolio },
            netWorth: currentPortfolio.taxable + (currentPortfolio.preTax * preTaxDiscountFactor) + currentPortfolio.roth + currentPortfolio.cash + currentPortfolio.property - totalDebt,
            totalDebt,
            cashFlow: {
                totalExpenses: totalOutflow + taxRes.totalTax,
                spending: spendingNeeded,
                debtPayments,
                taxes: taxRes.totalTax,
                income: {
                    gross: originalGrossOrdinary + originalGrossCapital + originalGrossTaxFree + originalSsAmount + rothConversionAmount,
                    ss: originalSsAmount,
                    other: Math.max(0, (originalGrossOrdinary - rmd) + originalGrossCapital + originalGrossTaxFree)
                    // Using original values before trad401k reduced them
                },
                withdrawals,
                rmd,
                rothConversion: rothConversionAmount,
                taxGainHarvesting: taxGainHarvestingAmount
            },
            taxDetails: {
                agi: taxRes.incomeSummary.agi,
                taxableIncome: taxRes.incomeSummary.taxableIncome,
                federal: taxRes.federalTax,
                state: stateTax,
                medicare: healthcareSurcharges,
                effectiveRate: taxRes.effectiveRate,
                marginalRate: taxRes.marginalRate
            },
            inflationAdjustmentFactor: inflationAccumulator
        });
    }

    return results;
}
