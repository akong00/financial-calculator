
import { TAX_DATA_2025, calculateFederalTax, calculateIRMAA, FilingStatus, scaleTaxConstants, calculateStateTax } from './taxes';
import { calculateSocialSecurityBenefit, calculateTaxableSocialSecurity, SocialSecurityInput } from './socialSecurity';
import { calculateRMD } from './rmd';
import { calculateWithdrawalAmount, WithdrawalParams } from './withdrawal';

export interface PortfolioState {
    taxable: number;
    taxableBasis: number;
    preTax: number;
    roth: number;
    cash: number;
}

export interface SimulationParams {
    startYear: number;
    endYear: number;
    currentAge: number;
    fractionOfYearRemaining?: number;
    initialPortfolio: PortfolioState;
    marketReturns: {
        stockReturn: number;
        bondReturn: number;
        cashReturn: number;
        inflation: number;
    }[];
    assetAllocation: {
        stock: number;
        bond: number;
    };
    expenses: {
        annualResting: number;
        inflationAdjusted: boolean;
    };
    income: {
        ssInput: SocialSecurityInput;
        additionalIncome: {
            amount: number;
            endAge: number;
        };
    };
    tax: {
        filingStatus: FilingStatus;
        taxableBasisFactor?: number;
        preTaxDiscount?: number;
        state?: string;
    };
    strategy: {
        withdrawal: WithdrawalParams;
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
    cashFlow: {
        expenses: number;
        withdrawal: number;
        withdrawalBreakdown: {
            taxable: number;
            preTax: number;
            roth: number;
            cash: number;
        };
        rmd: number;
        ss: number;
        additionalIncome: number;
        taxes: number;
        rothConversion: number;
        taxGainHarvesting: number;
    };
    taxableBasis: number;
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

export function runSimulation(params: SimulationParams): AnnualResult[] {
    const results: AnnualResult[] = [];

    let currentPortfolio = { ...params.initialPortfolio };
    let currentYear = params.startYear;
    let currentAge = params.currentAge;
    let inflationAccumulator = 1.0;

    const preTaxDiscountFactor = 1 - (params.tax.preTaxDiscount || 0);
    const initialBasisFactor = params.tax.taxableBasisFactor ?? 1.0;

    // Initialize Basis in dollars
    currentPortfolio.taxableBasis = currentPortfolio.taxable * initialBasisFactor;

    // --- YEAR 0 (PARTIAL YEAR) LOGIC ---
    const prorationFactor = params.fractionOfYearRemaining ?? 1.0;
    const initialMarketData = params.marketReturns[0] || { stockReturn: 0.07, bondReturn: 0.03, cashReturn: 0.01, inflation: 0.03 };

    // Prorate Growth: (1 + r)^t - 1
    const proratedStockGrowth = Math.pow(1 + initialMarketData.stockReturn, prorationFactor) - 1;
    const proratedCashGrowth = Math.pow(1 + initialMarketData.cashReturn, prorationFactor) - 1;
    const proratedInflation = Math.pow(1 + initialMarketData.inflation, prorationFactor) - 1;

    // Prorate Flows
    const currentTotalPortfolio = currentPortfolio.taxable + currentPortfolio.preTax + currentPortfolio.roth + currentPortfolio.cash;

    // Calculate Spending for partial year (assuming constant rate)
    const strategyParams: WithdrawalParams = {
        ...params.strategy.withdrawal,
        currentPortfolioValue: currentTotalPortfolio,
        lastYearWithdrawalAmount: undefined,
        inflationRate: initialMarketData.inflation,
        floorRate: params.strategy.withdrawal.floorRate,
        minDollarAmount: params.strategy.withdrawal.minDollarAmount
    };
    const fullYearSpending = calculateWithdrawalAmount(strategyParams);
    const targetSpending = fullYearSpending * prorationFactor;

    // Income
    const ssResult = calculateSocialSecurityBenefit(params.income.ssInput);
    let socialSecurity = 0;
    if (params.startYear >= ssResult.startYear) {
        socialSecurity = ssResult.annualBenefit * prorationFactor;
    }

    let additionalIncome = 0;
    if (params.income.additionalIncome.amount > 0 &&
        (!params.income.additionalIncome.endAge || currentAge <= params.income.additionalIncome.endAge)) {
        additionalIncome = params.income.additionalIncome.amount * prorationFactor;
    }

    const rmd = calculateRMD(currentAge, currentPortfolio.preTax, params.income.ssInput.birthYear);

    // Cash Flow Logic
    currentPortfolio.preTax = Math.max(0, currentPortfolio.preTax - rmd);
    const cashAvailable = socialSecurity + rmd + additionalIncome;
    const withdrawalNeeded = Math.max(0, targetSpending - cashAvailable);

    let totalWithdrawnForSpending = 0;
    let remainingWithdrawal = withdrawalNeeded;
    const withdrawalBreakdown = { cash: 0, taxable: 0, preTax: 0, roth: 0 };

    if (currentPortfolio.cash >= remainingWithdrawal) {
        withdrawalBreakdown.cash = remainingWithdrawal;
        currentPortfolio.cash -= remainingWithdrawal;
        totalWithdrawnForSpending += remainingWithdrawal;
        remainingWithdrawal = 0;
    } else {
        withdrawalBreakdown.cash = currentPortfolio.cash;
        totalWithdrawnForSpending += currentPortfolio.cash;
        remainingWithdrawal -= currentPortfolio.cash;
        currentPortfolio.cash = 0;
    }
    if (remainingWithdrawal > 0 && currentPortfolio.taxable > 0) {
        const amount = Math.min(currentPortfolio.taxable, remainingWithdrawal);
        const ratio = currentPortfolio.taxable > 0 ? currentPortfolio.taxableBasis / currentPortfolio.taxable : 1;
        withdrawalBreakdown.taxable = amount;
        currentPortfolio.taxableBasis -= Math.min(currentPortfolio.taxableBasis, amount * ratio);
        currentPortfolio.taxable -= amount;
        totalWithdrawnForSpending += amount;
        remainingWithdrawal -= amount;
    }
    if (remainingWithdrawal > 0 && currentPortfolio.preTax > 0) {
        const amount = Math.min(currentPortfolio.preTax, remainingWithdrawal);
        withdrawalBreakdown.preTax = amount;
        currentPortfolio.preTax -= amount;
        totalWithdrawnForSpending += amount;
        remainingWithdrawal -= amount;
    }
    if (remainingWithdrawal > 0 && currentPortfolio.roth > 0) {
        const amount = Math.min(currentPortfolio.roth, remainingWithdrawal);
        withdrawalBreakdown.roth = amount;
        currentPortfolio.roth -= amount;
        totalWithdrawnForSpending += amount;
        remainingWithdrawal -= amount;
    }

    // Taxes (Year 0 Partial)
    const preTaxSources = rmd + withdrawalBreakdown.preTax + additionalIncome;
    const currentBasisFactorYear0 = currentPortfolio.taxable > 0 ? (currentPortfolio.taxableBasis / currentPortfolio.taxable) : initialBasisFactor;
    const taxableGain = withdrawalBreakdown.taxable * (1 - currentBasisFactorYear0);
    const taxableSS = calculateTaxableSocialSecurity(socialSecurity, preTaxSources + taxableGain, params.tax.filingStatus);

    const taxInput = {
        wages: 0,
        shortTermCapGains: 0,
        longTermCapGains: taxableGain,
        qualifiedDividends: 0,
        otherOrdinaryIncome: preTaxSources + taxableSS,
        preTaxContributions: 0,
        filingStatus: params.tax.filingStatus
    };
    const taxRes = calculateFederalTax(taxInput);
    const stateTax = calculateStateTax(taxRes.incomeSummary.agi, params.tax.state || 'none');
    const totalTaxLiability = taxRes.totalTax + stateTax;

    // Pay Tax
    let taxToPay = totalTaxLiability;
    if (currentPortfolio.cash >= taxToPay) { currentPortfolio.cash -= taxToPay; taxToPay = 0; }
    else {
        taxToPay -= currentPortfolio.cash; currentPortfolio.cash = 0;
        if (currentPortfolio.taxable >= taxToPay) {
            const ratio = currentPortfolio.taxable > 0 ? currentPortfolio.taxableBasis / currentPortfolio.taxable : 1;
            currentPortfolio.taxableBasis -= Math.min(currentPortfolio.taxableBasis, taxToPay * ratio);
            currentPortfolio.taxable -= taxToPay;
            taxToPay = 0;
        } else {
            taxToPay -= currentPortfolio.taxable; currentPortfolio.taxable = 0; currentPortfolio.taxableBasis = 0;
            if (currentPortfolio.preTax >= taxToPay) { currentPortfolio.preTax -= taxToPay; taxToPay = 0; }
            else { taxToPay -= currentPortfolio.preTax; currentPortfolio.preTax = 0; currentPortfolio.roth = Math.max(0, currentPortfolio.roth - taxToPay); }
        }
    }

    // Harvesting Yr 0
    let harvestingAmount = 0;
    if (params.strategy.enableTaxGainHarvesting && currentPortfolio.taxable > currentPortfolio.taxableBasis) {
        const ltcgBrackets = TAX_DATA_2025.longTermCapGains[params.tax.filingStatus];
        const limit0 = ltcgBrackets[0].limit;
        const deduction = TAX_DATA_2025.standardDeduction[params.tax.filingStatus];
        const taxableOrdinary = Math.max(0, taxRes.incomeSummary.ordinaryIncome - deduction);
        const deductionRemaining = Math.max(0, deduction - taxRes.incomeSummary.ordinaryIncome);
        const taxableRealizedGains = Math.max(0, taxRes.incomeSummary.preferentialIncome - deductionRemaining);
        const availableRoom = Math.max(0, limit0 - taxableOrdinary - taxableRealizedGains);
        const unrealizedGains = Math.max(0, currentPortfolio.taxable - currentPortfolio.taxableBasis);
        harvestingAmount = Math.min(availableRoom, unrealizedGains);
        currentPortfolio.taxableBasis += harvestingAmount;
        if (currentPortfolio.taxableBasis > currentPortfolio.taxable) currentPortfolio.taxableBasis = currentPortfolio.taxable;
    }
    if (currentPortfolio.taxable <= 0) currentPortfolio.taxableBasis = 0;

    // Apply Prorated Growth
    currentPortfolio.taxable = Math.max(0, currentPortfolio.taxable * (1 + proratedStockGrowth));
    currentPortfolio.preTax = Math.max(0, currentPortfolio.preTax * (1 + proratedStockGrowth));
    currentPortfolio.roth = Math.max(0, currentPortfolio.roth * (1 + proratedStockGrowth));
    currentPortfolio.cash = Math.max(0, currentPortfolio.cash * (1 + proratedCashGrowth));

    inflationAccumulator *= (1 + proratedInflation);

    results.push({
        year: params.startYear,
        age: params.currentAge,
        portfolio: { ...currentPortfolio },
        netWorth: currentPortfolio.taxable + (currentPortfolio.preTax * preTaxDiscountFactor) + currentPortfolio.roth + currentPortfolio.cash,
        cashFlow: {
            expenses: targetSpending,
            withdrawal: totalWithdrawnForSpending,
            withdrawalBreakdown,
            rmd,
            ss: socialSecurity,
            additionalIncome,
            taxes: totalTaxLiability,
            rothConversion: 0,
            taxGainHarvesting: harvestingAmount
        },
        taxableBasis: currentPortfolio.taxableBasis,
        taxDetails: {
            agi: taxRes.incomeSummary.agi,
            taxableIncome: taxRes.incomeSummary.taxableIncome,
            federal: taxRes.federalTax,
            state: stateTax,
            medicare: 0, // Assume no Medicare in starting part-year unless we add age check
            effectiveRate: taxRes.effectiveRate,
            marginalRate: taxRes.marginalRate
        },
        inflationAdjustmentFactor: inflationAccumulator
    });

    let lastWithdrawnAmount: number | undefined = fullYearSpending;

    for (let year = params.startYear + 1; year <= params.endYear; year++) {
        const marketIdx = year - params.startYear - 1;
        const annualData = params.marketReturns[marketIdx] || { stockReturn: 0.07, bondReturn: 0.03, cashReturn: 0.01, inflation: 0.03 };
        const stockGrowth = annualData.stockReturn;

        const currentTotalPortfolio = currentPortfolio.taxable + currentPortfolio.preTax + currentPortfolio.roth + currentPortfolio.cash;

        const strategyParams: WithdrawalParams = {
            ...params.strategy.withdrawal,
            currentPortfolioValue: currentTotalPortfolio,
            lastYearWithdrawalAmount: lastWithdrawnAmount,
            inflationRate: annualData.inflation,
            floorRate: params.strategy.withdrawal.floorRate,
            minDollarAmount: params.strategy.withdrawal.minDollarAmount
        };

        const targetSpending = calculateWithdrawalAmount(strategyParams);
        lastWithdrawnAmount = targetSpending;

        let socialSecurity = 0;
        if (year >= ssResult.startYear) {
            socialSecurity = ssResult.annualBenefit * inflationAccumulator;
        }

        let additionalIncome = 0;
        if (params.income.additionalIncome.amount > 0 &&
            (!params.income.additionalIncome.endAge || currentAge <= params.income.additionalIncome.endAge)) {
            additionalIncome = params.income.additionalIncome.amount * inflationAccumulator;
        }

        const rmd = calculateRMD(currentAge, currentPortfolio.preTax, params.income.ssInput.birthYear);
        currentPortfolio.preTax = Math.max(0, currentPortfolio.preTax - rmd);

        let cashAvailable = socialSecurity + rmd + additionalIncome;
        const withdrawalNeeded = Math.max(0, targetSpending - cashAvailable);

        let totalWithdrawnForSpending = 0;
        let remainingWithdrawal = withdrawalNeeded;
        const withdrawalBreakdown = { cash: 0, taxable: 0, preTax: 0, roth: 0 };

        if (currentPortfolio.cash >= remainingWithdrawal) {
            withdrawalBreakdown.cash = remainingWithdrawal;
            currentPortfolio.cash -= remainingWithdrawal;
            totalWithdrawnForSpending += remainingWithdrawal;
            remainingWithdrawal = 0;
        } else {
            withdrawalBreakdown.cash = currentPortfolio.cash;
            totalWithdrawnForSpending += currentPortfolio.cash;
            remainingWithdrawal -= currentPortfolio.cash;
            currentPortfolio.cash = 0;
        }
        if (remainingWithdrawal > 0 && currentPortfolio.taxable > 0) {
            const amount = Math.min(currentPortfolio.taxable, remainingWithdrawal);
            const ratio = currentPortfolio.taxable > 0 ? currentPortfolio.taxableBasis / currentPortfolio.taxable : 1;
            withdrawalBreakdown.taxable = amount;
            currentPortfolio.taxableBasis -= Math.min(currentPortfolio.taxableBasis, amount * ratio);
            currentPortfolio.taxable -= amount;
            totalWithdrawnForSpending += amount;
            remainingWithdrawal -= amount;
        }
        if (remainingWithdrawal > 0 && currentPortfolio.preTax > 0) {
            const amount = Math.min(currentPortfolio.preTax, remainingWithdrawal);
            withdrawalBreakdown.preTax = amount;
            currentPortfolio.preTax -= amount;
            totalWithdrawnForSpending += amount;
            remainingWithdrawal -= amount;
        }
        if (remainingWithdrawal > 0 && currentPortfolio.roth > 0) {
            const amount = Math.min(currentPortfolio.roth, remainingWithdrawal);
            withdrawalBreakdown.roth = amount;
            currentPortfolio.roth -= amount;
            totalWithdrawnForSpending += amount;
            remainingWithdrawal -= amount;
        }

        // --- INFLATED TAX DATA FOR THIS YEAR ---
        const currentTaxData = scaleTaxConstants(TAX_DATA_2025, inflationAccumulator);

        // Roth Conversion
        let rothConversionAmount = 0;
        const { rothConversion } = params.strategy;
        const canConvert = (
            currentPortfolio.preTax > 0 &&
            (!rothConversion.startAge || currentAge >= rothConversion.startAge) &&
            (!rothConversion.endAge || currentAge <= rothConversion.endAge)
        );

        if (canConvert && rothConversion.type !== 'none') {
            if (rothConversion.type === 'fixed_amount' && rothConversion.fixedAmount) {
                rothConversionAmount = Math.min(currentPortfolio.preTax, rothConversion.fixedAmount);
            } else if (rothConversion.type === 'fill_bracket' && (rothConversion.targetBracketRate !== undefined)) {
                const deduction = currentTaxData.standardDeduction[params.tax.filingStatus];
                const ltcgBrackets = currentTaxData.longTermCapGains[params.tax.filingStatus];
                const ltcg0Limit = ltcgBrackets[0]?.limit ?? 0;

                // Estimate other income that will be on the return
                const basisFactor = currentPortfolio.taxable > 0 ? (currentPortfolio.taxableBasis / currentPortfolio.taxable) : 1.0;
                const realizedGains = withdrawalBreakdown.taxable * (1 - basisFactor);
                const otherOrdinary = rmd + additionalIncome + withdrawalBreakdown.preTax;

                // Estimate SS taxable (rough estimate without conversion)
                const ssTaxableEst = calculateTaxableSocialSecurity(socialSecurity, otherOrdinary + realizedGains, params.tax.filingStatus);
                const curOrdinaryIncome = otherOrdinary + ssTaxableEst;
                const curAgi = curOrdinaryIncome + realizedGains;

                let targetRoom = 0;
                if (rothConversion.targetBracketRate === 0) {
                    const ordinaryRoom = Math.max(0, deduction - curOrdinaryIncome);

                    if (rothConversion.stayIn0PercentZone) {
                        // Conservative: Stay in 0% total tax zone (protect LTCG)
                        const gainsRoom = Math.max(0, (ltcg0Limit + deduction) - curAgi);
                        targetRoom = Math.min(ordinaryRoom, gainsRoom);
                    } else {
                        // Aggressive: Always fill Standard Deduction (ignore LTCG bump)
                        targetRoom = ordinaryRoom;
                    }
                } else {
                    const brackets = currentTaxData.brackets[params.tax.filingStatus];
                    const limit = (brackets.find(b => b.rate === rothConversion.targetBracketRate)?.limit
                        ?? brackets.find(b => b.rate > rothConversion.targetBracketRate!)?.limit
                        ?? Infinity);
                    targetRoom = Math.max(0, (limit + deduction) - curOrdinaryIncome);
                }

                rothConversionAmount = Math.min(currentPortfolio.preTax, targetRoom);
            }
        }

        currentPortfolio.preTax -= rothConversionAmount;
        currentPortfolio.roth += rothConversionAmount;

        // Final Tax Calculation
        const currentBasisFactor = currentPortfolio.taxable > 0 ? (currentPortfolio.taxableBasis / currentPortfolio.taxable) : 1.0;
        const taxableGainMain = withdrawalBreakdown.taxable * (1 - currentBasisFactor);
        const taxableSSMain = calculateTaxableSocialSecurity(socialSecurity, rmd + rothConversionAmount + withdrawalBreakdown.preTax + taxableGainMain, params.tax.filingStatus);

        const taxInputMain = {
            wages: 0,
            shortTermCapGains: 0,
            longTermCapGains: taxableGainMain,
            qualifiedDividends: 0,
            otherOrdinaryIncome: rmd + rothConversionAmount + withdrawalBreakdown.preTax + taxableSSMain,
            preTaxContributions: 0,
            filingStatus: params.tax.filingStatus
        };

        const taxResMain = calculateFederalTax(taxInputMain, currentTaxData);

        // Healthcare Costs
        let healthcareSurcharges = 0;
        const medicareCount = params.healthConfig.medicarePeopleCount;
        const currentNetWorth = currentPortfolio.taxable + (currentPortfolio.preTax * preTaxDiscountFactor) + currentPortfolio.roth + currentPortfolio.cash;

        const isMedicaidActive = params.healthConfig.enableMedicaid && currentNetWorth < 2000;

        if (!isMedicaidActive && currentAge >= 65) {
            if (params.healthConfig.includeBasePremium) {
                healthcareSurcharges += currentTaxData.medicare.basePremiumB * 12 * medicareCount;
            }
            const irmaaPerPerson = calculateIRMAA(taxResMain.incomeSummary.agi, params.tax.filingStatus, currentTaxData);
            healthcareSurcharges += (irmaaPerPerson * medicareCount);
        }

        const stateTaxMain = calculateStateTax(taxResMain.incomeSummary.agi, params.tax.state || 'none');
        const totalTaxLiabilityMain = taxResMain.totalTax + healthcareSurcharges + stateTaxMain;

        // Subtract taxes
        let taxToPayMain = totalTaxLiabilityMain;
        if (currentPortfolio.cash >= taxToPayMain) {
            currentPortfolio.cash -= taxToPayMain;
            taxToPayMain = 0;
        } else {
            taxToPayMain -= currentPortfolio.cash; currentPortfolio.cash = 0;
            if (currentPortfolio.taxable >= taxToPayMain) {
                const ratio = currentPortfolio.taxable > 0 ? (currentPortfolio.taxableBasis / currentPortfolio.taxable) : 1;
                currentPortfolio.taxableBasis -= Math.min(currentPortfolio.taxableBasis, taxToPayMain * ratio);
                currentPortfolio.taxable -= taxToPayMain;
                taxToPayMain = 0;
            } else {
                taxToPayMain -= currentPortfolio.taxable; currentPortfolio.taxable = 0; currentPortfolio.taxableBasis = 0;
                if (currentPortfolio.preTax >= taxToPayMain) {
                    currentPortfolio.preTax -= taxToPayMain;
                    taxToPayMain = 0;
                } else {
                    taxToPayMain -= currentPortfolio.preTax;
                    currentPortfolio.preTax = 0;
                    currentPortfolio.roth = Math.max(0, currentPortfolio.roth - taxToPayMain);
                }
            }
        }

        // Harvesting
        let harvestingAmountMain = 0;
        if (params.strategy.enableTaxGainHarvesting && currentPortfolio.taxable > currentPortfolio.taxableBasis) {
            const limit0Main = currentTaxData.longTermCapGains[params.tax.filingStatus][0].limit;
            const deductionMain = currentTaxData.standardDeduction[params.tax.filingStatus];
            const taxableOrdinaryMain = Math.max(0, taxResMain.incomeSummary.ordinaryIncome - deductionMain);
            const deductionRemainingMain = Math.max(0, deductionMain - taxResMain.incomeSummary.ordinaryIncome);
            const taxableRealizedGainsMain = Math.max(0, taxResMain.incomeSummary.preferentialIncome - deductionRemainingMain);
            const availableRoomMain = Math.max(0, limit0Main - taxableOrdinaryMain - taxableRealizedGainsMain);
            const unrealizedGainsMain = Math.max(0, currentPortfolio.taxable - currentPortfolio.taxableBasis);
            harvestingAmountMain = Math.min(availableRoomMain, unrealizedGainsMain);
            currentPortfolio.taxableBasis += harvestingAmountMain;
            if (currentPortfolio.taxableBasis > currentPortfolio.taxable) currentPortfolio.taxableBasis = currentPortfolio.taxable;
        }
        if (currentPortfolio.taxable <= 0) currentPortfolio.taxableBasis = 0;

        // Apply Growth
        currentPortfolio.taxable = Math.max(0, currentPortfolio.taxable * (1 + stockGrowth));
        currentPortfolio.preTax = Math.max(0, currentPortfolio.preTax * (1 + stockGrowth));
        currentPortfolio.roth = Math.max(0, currentPortfolio.roth * (1 + stockGrowth));
        currentPortfolio.cash = Math.max(0, currentPortfolio.cash * (1 + annualData.cashReturn));

        currentAge++;
        inflationAccumulator *= (1 + annualData.inflation);

        results.push({
            year,
            age: currentAge,
            portfolio: { ...currentPortfolio },
            netWorth: currentPortfolio.taxable + (currentPortfolio.preTax * preTaxDiscountFactor) + currentPortfolio.roth + currentPortfolio.cash,
            cashFlow: {
                expenses: targetSpending,
                withdrawal: totalWithdrawnForSpending,
                withdrawalBreakdown,
                rmd,
                ss: socialSecurity,
                additionalIncome,
                taxes: totalTaxLiabilityMain,
                rothConversion: rothConversionAmount,
                taxGainHarvesting: harvestingAmountMain
            },
            taxableBasis: currentPortfolio.taxableBasis,
            taxDetails: {
                agi: taxResMain.incomeSummary.agi,
                taxableIncome: taxResMain.incomeSummary.taxableIncome,
                federal: taxResMain.federalTax,
                state: stateTaxMain,
                medicare: healthcareSurcharges,
                effectiveRate: taxResMain.effectiveRate,
                marginalRate: taxResMain.marginalRate
            },
            inflationAdjustmentFactor: inflationAccumulator
        });
    }

    return results;
}
