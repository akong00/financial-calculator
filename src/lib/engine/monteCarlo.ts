import { runSimulation, SimulationParams, AnnualResult } from './simulation';
import { getHistoricalData } from '../data/historicalReturns';
import { ROLLING_REAL_RETURNS } from '../data/rollingReturns';
import { MonteCarloDistributionType } from '@/types/scenario-types';

export interface MonteCarloParams {
    simulationParams: Omit<SimulationParams, 'marketReturns'>;
    iterations: number;
    marketAssumptions: {
        stockMean: number;
        stockStdDev: number;
        bondMean: number;
        bondStdDev: number;
        cashMean: number;
        cashStdDev: number;
        inflationMean: number;
        inflationStdDev: number;
    };
    mcDistributionType?: MonteCarloDistributionType;
    preGeneratedPaths?: { stockReturn: number, bondReturn: number, cashReturn: number, inflation: number, propertyReturn: number }[][];
}

export interface MonteCarloResult {
    successRate: number;
    medianEndingWealth: number;
    medianEndingWealthNominal: number;
    tenthPercentileWealth: number;
    ninetiethPercentileWealth: number;
    medianTotalSpent: number;
    medianTotalSpentNominal: number;
    medianAnnualSpending: number;
    medianAnnualSpendingNominal: number;
    percentiles: {
        p50: { year: number, netWorth: number, inflationAdjustmentFactor: number }[];
        p20: { year: number, netWorth: number, inflationAdjustmentFactor: number }[];
        p5: { year: number, netWorth: number, inflationAdjustmentFactor: number }[];
    };
    marketPaths: {
        p50: { val: number, inflationFactor: number }[];
        p20: { val: number, inflationFactor: number }[];
        p5: { val: number, inflationFactor: number }[];
    };
    percentileBands: {
        year: number;
        p5: number;
        p25: number;
        p50: number;
        p75: number;
        p95: number;
        avgInflationFactor: number;
    }[];
    milestoneStats?: Record<string, {
        name: string,
        score99: number, // Best Case (Top 1% outcome = Earliest)
        score95: number,
        score75: number,
        score50: number,
        score25: number,
        score5: number,
        score1: number   // Worst Case (Bottom 1% outcome = Latest)
    }>;
    sampleSimulations?: {
        percentile: number;  // 5, 25, 50, 75, 95
        results: AnnualResult[];
        marketPath: { stockReturn: number, bondReturn: number, cashReturn: number, inflation: number, propertyReturn: number }[];
        isExhausted: boolean;
        failureYear?: number;
        failureAge?: number;
    }[];
}

export function randn_bm() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function generateMarketPath(years: number, assumptions: MonteCarloParams['marketAssumptions']) {
    const path = [];
    for (let i = 0; i < years; i++) {
        path.push({
            stockReturn: assumptions.stockMean + assumptions.stockStdDev * randn_bm(),
            bondReturn: assumptions.bondMean + assumptions.bondStdDev * randn_bm(),
            cashReturn: assumptions.cashMean + assumptions.cashStdDev * randn_bm(),
            inflation: assumptions.inflationMean + assumptions.inflationStdDev * randn_bm(),
            propertyReturn: assumptions.inflationMean + 0.01 + (assumptions.inflationStdDev * randn_bm()) // Property = Inflation + 1% + volatility
        });
    }
    return path;
}

export function generateHistoricalMarketPath(years: number, assumptions: MonteCarloParams['marketAssumptions']) {
    const historicalYearly = getHistoricalData();
    const path = [];
    for (let i = 0; i < years; i++) {
        // 1. Simulate inflation for this year based on user assumptions
        const simulatedInflation = assumptions.inflationMean + assumptions.inflationStdDev * randn_bm();

        // 2. Sample a historical real return from the 1800+ monthly rolling returns
        const randomIdx = Math.floor(Math.random() * ROLLING_REAL_RETURNS.length);
        const realStockReturn = ROLLING_REAL_RETURNS[randomIdx];

        // 3. Calculate nominal stock return: (1 + Real) * (1 + Inflation) - 1
        const stockReturnNominal = (1 + realStockReturn) * (1 + simulatedInflation) - 1;

        // 4. Sample real bond/cash returns from yearly historical data and adjust to current inflation
        const histIdx = Math.floor(Math.random() * historicalYearly.length);
        const histYear = historicalYearly[histIdx];

        const histBondNominal = histYear.bondReturn ?? histYear.treasuryYield;
        const realBondReturn = (1 + histBondNominal) / (1 + histYear.inflation) - 1;
        const bondReturnNominal = (1 + realBondReturn) * (1 + simulatedInflation) - 1;

        const histCashNominal = histYear.treasuryYield * 0.8;
        const realCashReturn = (1 + histCashNominal) / (1 + histYear.inflation) - 1;
        const cashReturnNominal = (1 + realCashReturn) * (1 + simulatedInflation) - 1;

        path.push({
            stockReturn: stockReturnNominal,
            bondReturn: bondReturnNominal,
            cashReturn: cashReturnNominal,
            inflation: simulatedInflation,
            propertyReturn: simulatedInflation + 0.01 // Proxy
        });
    }
    return path;
}

export async function runMonteCarlo(
    params: MonteCarloParams,
    onProgress?: (progress: number) => void
): Promise<MonteCarloResult> {
    const { simulationParams, iterations, marketAssumptions, preGeneratedPaths } = params;
    const duration = simulationParams.endYear - simulationParams.startYear + 1;

    let successCount = 0;
    const milestoneAges: Record<string, number[]> = {};
    params.simulationParams.milestones?.forEach(m => {
        milestoneAges[m.id] = [];
    });

    const resultsData: {
        netWorth: number,
        results: AnnualResult[],
        marketPath: { stockReturn: number, bondReturn: number, cashReturn: number, inflation: number, propertyReturn: number }[],
        resolvedMilestones: Record<string, number>,
        isExhausted: boolean,
        failureYear?: number,
        failureAge?: number
    }[] = [];

    const BATCH_SIZE = 500;

    for (let i = 0; i < iterations; i++) {
        let marketPath;
        if (preGeneratedPaths) {
            marketPath = preGeneratedPaths[i];
        } else if (params.mcDistributionType === 'historical') {
            marketPath = generateHistoricalMarketPath(duration, marketAssumptions);
        } else {
            marketPath = generateMarketPath(duration, marketAssumptions);
        }

        const runParams: SimulationParams = {
            ...simulationParams,
            marketReturns: marketPath
        };

        const result = runSimulation(runParams);
        const finalNetWorth = result.results[result.results.length - 1].netWorth;

        if (!result.isExhausted && finalNetWorth > 0) {
            successCount++;
        }

        resultsData.push({
            netWorth: finalNetWorth,
            results: result.results,
            marketPath,
            resolvedMilestones: result.resolvedMilestones,
            isExhausted: result.isExhausted,
            failureYear: result.failureYear,
            failureAge: result.failureAge
        });

        // Track milestones
        params.simulationParams.milestones?.forEach(m => {
            const age = result.resolvedMilestones[m.id];
            milestoneAges[m.id].push(age !== undefined ? age : 999);
        });

        if (i % BATCH_SIZE === 0 && i > 0) {
            if (onProgress) onProgress((i / iterations) * 100);
            // Yield to event loop
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    if (onProgress) onProgress(100);

    // Calculate spending metrics for each simulation
    const simulationStats = resultsData.map(d => {
        const realAnnualSpends = d.results.map(r => r.cashFlow.spending / r.inflationAdjustmentFactor);
        const nominalAnnualSpends = d.results.map(r => r.cashFlow.spending);

        const totalSpentReal = realAnnualSpends.reduce((a, b) => a + b, 0);
        const totalSpentNominal = nominalAnnualSpends.reduce((a, b) => a + b, 0);

        const sortedReal = [...realAnnualSpends].sort((a, b) => a - b);
        const medianAnnualReal = sortedReal[Math.floor(sortedReal.length / 2)];

        const sortedNominal = [...nominalAnnualSpends].sort((a, b) => a - b);
        const medianAnnualNominal = sortedNominal[Math.floor(sortedNominal.length / 2)];

        return { totalSpentReal, totalSpentNominal, medianAnnualReal, medianAnnualNominal };
    });

    const medianTotalSpent = [...simulationStats].sort((a, b) => a.totalSpentReal - b.totalSpentReal)[Math.floor(iterations / 2)].totalSpentReal;
    const medianTotalSpentNominal = [...simulationStats].sort((a, b) => a.totalSpentNominal - b.totalSpentNominal)[Math.floor(iterations / 2)].totalSpentNominal;

    const medianAnnualSpending = [...simulationStats].sort((a, b) => a.medianAnnualReal - b.medianAnnualReal)[Math.floor(iterations / 2)].medianAnnualReal;
    const medianAnnualSpendingNominal = [...simulationStats].sort((a, b) => a.medianAnnualNominal - b.medianAnnualNominal)[Math.floor(iterations / 2)].medianAnnualNominal;

    // Sort by Duration (failure year), then by Final REAL Net Worth.
    resultsData.sort((a, b) => {
        // Find failure year: first year where portfolio was exhausted OR net worth <= 0
        const failYearA = a.results.findIndex((r, idx) => r.netWorth <= 0 || (a.isExhausted && idx === a.results.length - 1 && a.results.some(res => res.cashFlow.withdrawals.total < res.cashFlow.totalExpenses - res.cashFlow.income.gross)));
        // Wait, the simulation already handles exhaustion. If isExhausted is true, 
        // it means at some point they couldn't meet spending.

        // Let's find the FIRST year where withdrawal total < (expenses - income)
        const getFirstFailureYear = (data: typeof resultsData[0]) => {
            const idx = data.results.findIndex(r => {
                const spendingShortfall = r.cashFlow.totalExpenses - r.cashFlow.income.gross - r.cashFlow.withdrawals.total;
                return spendingShortfall > 0.1; // Small threshold for floating point
            });
            return idx === -1 ? Infinity : idx;
        };

        const durationA = getFirstFailureYear(a);
        const durationB = getFirstFailureYear(b);

        if (durationA !== durationB) {
            return durationA - durationB;
        }

        const lastA = a.results[a.results.length - 1];
        const lastB = b.results[b.results.length - 1];
        const realA = lastA.netWorth / lastA.inflationAdjustmentFactor;
        const realB = lastB.netWorth / lastB.inflationAdjustmentFactor;
        return realA - realB;
    });

    const p50Idx = Math.floor(resultsData.length * 0.50);
    const p20Idx = Math.floor(resultsData.length * 0.20);
    const p5Idx = Math.floor(resultsData.length * 0.05);
    const p10Idx = Math.floor(resultsData.length * 0.10);
    const p90Idx = Math.floor(resultsData.length * 0.90);

    const getLastReal = (idx: number) => {
        const r = resultsData[idx].results;
        const last = r[r.length - 1];
        return last.netWorth / last.inflationAdjustmentFactor;
    }

    const getLastNominal = (idx: number) => {
        const r = resultsData[idx].results;
        const last = r[r.length - 1];
        return last.netWorth;
    }

    const medianEndingWealth = getLastReal(p50Idx);
    const medianEndingWealthNominal = getLastNominal(p50Idx);
    const tenthPercentileWealth = getLastReal(p10Idx);
    const ninetiethPercentileWealth = getLastReal(p90Idx);

    const getTrajectory = (idx: number) => {
        const item = resultsData[idx];
        return item.results.map((r) => ({
            year: r.year,
            netWorth: r.netWorth,
            inflationAdjustmentFactor: r.inflationAdjustmentFactor
        }));
    };

    const getMarketIndex = (idx: number) => {
        const item = resultsData[idx];
        let cumulative = 1.0;
        let infAccumulator = 1.0;
        const index = [{ val: 1.0, inflationFactor: 1.0 }];
        item.marketPath.forEach(m => {
            cumulative *= (1 + m.stockReturn);
            infAccumulator *= (1 + m.inflation);
            index.push({ val: cumulative, inflationFactor: infAccumulator });
        });
        return index;
    };

    const percentileBands = [];
    const numYears = resultsData[0].results.length;

    for (let y = 0; y < numYears; y++) {
        const yearRealNetWorths = resultsData
            .map(d => d.results[y].netWorth / d.results[y].inflationAdjustmentFactor)
            .sort((a, b) => a - b);

        const avgInf = resultsData.reduce((acc, d) => acc + d.results[y].inflationAdjustmentFactor, 0) / resultsData.length;

        const getP = (p: number) => {
            const idx = Math.floor(yearRealNetWorths.length * p);
            return yearRealNetWorths[idx];
        };

        percentileBands.push({
            year: resultsData[0].results[y].year,
            p5: getP(0.05),
            p25: getP(0.25),
            p50: getP(0.50),
            p75: getP(0.75),
            p95: getP(0.95),
            avgInflationFactor: avgInf
        });
    }

    return {
        successRate: successCount / iterations,
        medianEndingWealth,
        medianEndingWealthNominal,
        tenthPercentileWealth,
        ninetiethPercentileWealth,
        medianTotalSpent,
        medianTotalSpentNominal,
        medianAnnualSpending,
        medianAnnualSpendingNominal,
        percentiles: {
            p50: getTrajectory(p50Idx),
            p20: getTrajectory(p20Idx),
            p5: getTrajectory(p5Idx)
        },
        marketPaths: {
            p50: getMarketIndex(p50Idx),
            p20: getMarketIndex(p20Idx),
            p5: getMarketIndex(p5Idx)
        },
        percentileBands,
        milestoneStats: Object.fromEntries(
            Object.entries(milestoneAges).map(([id, ages]) => {
                const sorted = [...ages].sort((a, b) => a - b);
                const milestone = params.simulationParams.milestones?.find(m => m.id === id);
                return [id, {
                    name: milestone?.name || 'Unnamed',
                    score99: sorted[Math.floor(iterations * 0.01)],
                    score95: sorted[Math.floor(iterations * 0.05)],
                    score75: sorted[Math.floor(iterations * 0.25)],
                    score50: sorted[Math.floor(iterations * 0.50)],
                    score25: sorted[Math.floor(iterations * 0.75)],
                    score5: sorted[Math.floor(iterations * 0.95)],
                    score1: sorted[Math.floor(iterations * 0.99)]
                }];
            })
        ),
        // Store sample simulations at key percentiles for the percentile explorer
        sampleSimulations: [1, 5, 10, 20, 30, 50, 75, 95].map(p => {
            const idx = Math.floor(resultsData.length * (p / 100));
            const data = resultsData[idx];
            return {
                percentile: p,
                results: data.results,
                marketPath: data.marketPath,
                isExhausted: data.isExhausted,
                failureYear: data.failureYear,
                failureAge: data.failureAge
            };
        })
    };
}
