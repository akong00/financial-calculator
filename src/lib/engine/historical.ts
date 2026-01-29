
import { SimulationParams, runSimulation, PortfolioState } from './simulation';
import { getHistoricalData } from '../data/historicalReturns';

export interface HistoricalSimulationResult {
    startYear: number;
    yearRange: string;
    success: boolean;
    endingNetWorth: number; // Nominal
    lowestRealNetWorth: number;
    failureYear?: number;
    failureAge?: number;
}

export interface HistoricalAggregateResult {
    results: HistoricalSimulationResult[];
    successRate: number;
    worstYear: number;
    bestYear: number;
    medianEndingNetWorth: number;
}

export function runHistoricalSimulation(baseParams: Omit<SimulationParams, 'marketReturns'>): HistoricalAggregateResult {
    const historicalData = getHistoricalData();
    const results: HistoricalSimulationResult[] = [];
    const duration = baseParams.endYear - baseParams.startYear;

    // Only iterate through starting years that have enough subsequent historical data to cover the full duration.
    // This removes the "wrap-around" behavior.
    const maxStartIdx = historicalData.length - duration - 1;

    if (maxStartIdx < 0) {
        // If simulation duration is longer than all available historical data, we can't run it this way.
        // Return empty results or adjust? 
        // For now, let's return a safe object.
        return { results: [], successRate: 0, worstYear: 0, bestYear: 0, medianEndingNetWorth: 0 };
    }

    for (let startIdx = 0; startIdx <= maxStartIdx; startIdx++) {
        const startDataPoint = historicalData[startIdx];
        const simStartYear = startDataPoint.year;

        // Construct Market Returns for this sequence
        const marketReturns = [];

        for (let i = 0; i <= duration; i++) {
            const data = historicalData[startIdx + i];
            marketReturns.push({
                stockReturn: data.sp500,
                bondReturn: data.bondReturn ?? data.treasuryYield,
                cashReturn: data.treasuryYield * 0.8,
                inflation: data.inflation
            });
        }

        const params: SimulationParams = {
            ...baseParams,
            marketReturns
        };

        const annualResults = runSimulation(params);

        // Analyze Outcome
        const lastRes = annualResults[annualResults.length - 1];
        let success = true;
        let failureYear: number | undefined;
        let failureAge: number | undefined;
        let lowestRealNW = Infinity;

        for (const r of annualResults) {
            // Check for failure (Depletion)
            // Assuming failure is when liquid assets are 0? 
            // In simulation.ts, we don't explicitly fail, we just track values.
            // If total portfolio is 0, it's a failure.
            const totalPortfolio = r.portfolio.taxable + r.portfolio.preTax + r.portfolio.roth + r.portfolio.cash;
            if (totalPortfolio < 100) { // Epsilon
                if (success) { // Capture first failure
                    success = false;
                    failureYear = simStartYear + (r.year - params.startYear); // Historical Year of failure
                    failureAge = r.age;
                }
            }

            const realNW = r.netWorth / r.inflationAdjustmentFactor;
            if (realNW < lowestRealNW) lowestRealNW = realNW;
        }

        // If never failed, lowest might be end
        if (success && lowestRealNW === Infinity) lowestRealNW = lastRes.netWorth / lastRes.inflationAdjustmentFactor;

        results.push({
            startYear: simStartYear,
            yearRange: `${simStartYear}-${simStartYear + duration}`,
            success,
            endingNetWorth: lastRes.netWorth,
            lowestRealNetWorth: lowestRealNW,
            failureYear: failureYear ? failureYear : undefined,
            failureAge
        });
    }

    const successCount = results.filter(r => r.success).length;
    const sortedByNW = [...results].sort((a, b) => a.endingNetWorth - b.endingNetWorth);

    return {
        results,
        successRate: successCount / results.length,
        worstYear: sortedByNW[0].startYear,
        bestYear: sortedByNW[results.length - 1].startYear,
        medianEndingNetWorth: sortedByNW[Math.floor(results.length / 2)].endingNetWorth
    };
}
