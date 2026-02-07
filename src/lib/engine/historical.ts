
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
    const maxStartIdx = historicalData.length - duration - 1;

    if (maxStartIdx < 0) {
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
                inflation: data.inflation,
                propertyReturn: data.inflation + 0.01 // Proxy
            });
        }

        const params: SimulationParams = {
            ...baseParams,
            marketReturns
        };

        const { results: annualResults } = runSimulation(params);

        // Analyze Outcome
        const lastRes = annualResults[annualResults.length - 1];
        let success = true;
        let failureYear: number | undefined;
        let failureAge: number | undefined;
        let lowestRealNW = Infinity;

        for (const r of annualResults) {
            // Failure check: Liquid assets near zero?
            // Note: netWorth includes Property, but Property is illiquid. 
            // We should check liquid portfolio.
            const liquidPortfolio = r.portfolio.taxable + r.portfolio.preTax + r.portfolio.roth + r.portfolio.cash;

            if (liquidPortfolio < 100) {
                if (success) {
                    success = false;
                    failureYear = simStartYear + (r.year - params.startYear);
                    failureAge = r.age;
                }
            }

            const realNW = r.netWorth / r.inflationAdjustmentFactor;
            if (realNW < lowestRealNW) lowestRealNW = realNW;
        }

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
        worstYear: sortedByNW[0] ? sortedByNW[0].startYear : 0,
        bestYear: sortedByNW[results.length - 1] ? sortedByNW[results.length - 1].startYear : 0,
        medianEndingNetWorth: sortedByNW[Math.floor(results.length / 2)] ? sortedByNW[Math.floor(results.length / 2)].endingNetWorth : 0
    };
}
