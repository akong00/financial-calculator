
import { runSimulation, SimulationParams, AnnualResult } from './simulation';

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
    preGeneratedPaths?: { stockReturn: number, bondReturn: number, cashReturn: number, inflation: number }[][];
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
    const resultsData: {
        netWorth: number,
        results: AnnualResult[],
        marketPath: { stockReturn: number, bondReturn: number, cashReturn: number, inflation: number }[]
    }[] = [];

    const BATCH_SIZE = 500;

    for (let i = 0; i < iterations; i++) {
        const marketPath = preGeneratedPaths ? preGeneratedPaths[i] : generateMarketPath(duration, marketAssumptions);

        const runParams: SimulationParams = {
            ...simulationParams,
            marketReturns: marketPath
        };

        const result = runSimulation(runParams);
        const finalNetWorth = result[result.length - 1].netWorth;

        if (finalNetWorth > 0) {
            successCount++;
        }

        resultsData.push({
            netWorth: finalNetWorth,
            results: result,
            marketPath
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
        const realAnnualSpends = d.results.map(r => r.cashFlow.expenses / r.inflationAdjustmentFactor);
        const nominalAnnualSpends = d.results.map(r => r.cashFlow.expenses);

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
        const failYearA = a.results.findIndex(r => r.netWorth <= 0);
        const failYearB = b.results.findIndex(r => r.netWorth <= 0);

        const durationA = failYearA === -1 ? Infinity : failYearA;
        const durationB = failYearB === -1 ? Infinity : failYearB;

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
        percentileBands
    };
}
