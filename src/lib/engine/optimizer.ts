
import { MonteCarloParams, runMonteCarlo, generateMarketPath } from "./monteCarlo";
import { type SimulationParams } from "./simulation"; // import type
import { MC_ITERATIONS } from "../constants";

export interface RothStrategyResult {
    strategyName: string;
    description: string;
    successRate: number;
    medianNetWorth: number;
    config: SimulationParams['strategy']['rothConversion'];
}

export async function findBestRothStrategy(
    baseParams: Omit<SimulationParams, 'marketReturns'>,
    marketAssumptions: MonteCarloParams['marketAssumptions'],
    onProgress?: (progress: number) => void
): Promise<{ best: RothStrategyResult, all: RothStrategyResult[] }> {

    const candidates: { name: string, desc: string, config: SimulationParams['strategy']['rothConversion'] }[] = [
        {
            name: "Fill Standard Deduction",
            desc: "Always fill the Standard Deduction with Roth conversions, regardless of impact on LTCG taxation.",
            config: { type: 'fill_bracket', targetBracketRate: 0, stayIn0PercentZone: false }
        },
        {
            name: "Fill 10% Bracket",
            desc: "Convert enough to fill the 10% tax bracket.",
            config: { type: 'fill_bracket', targetBracketRate: 0.10 }
        },
        {
            name: "Fill 12% Bracket",
            desc: "Convert enough to fill the 12% tax bracket.",
            config: { type: 'fill_bracket', targetBracketRate: 0.12 }
        },
        {
            name: "Fill 22% Bracket",
            desc: "Convert enough to fill the 22% tax bracket.",
            config: { type: 'fill_bracket', targetBracketRate: 0.22 }
        },
        {
            name: "Fill 24% Bracket",
            desc: "Convert enough to fill the 24% tax bracket.",
            config: { type: 'fill_bracket', targetBracketRate: 0.24 }
        }
    ];

    // Generate fair paths once for all candidates
    const duration = baseParams.endYear - baseParams.startYear + 1;
    const fairPaths = Array(MC_ITERATIONS).fill(0).map(() => generateMarketPath(duration, marketAssumptions));

    let bestResult: RothStrategyResult | null = null;
    const allResults: RothStrategyResult[] = [];

    for (let cIdx = 0; cIdx < candidates.length; cIdx++) {
        const candidate = candidates[cIdx];
        const strategyParams: MonteCarloParams = {
            simulationParams: {
                ...baseParams,
                strategy: {
                    ...baseParams.strategy,
                    rothConversion: candidate.config
                }
            },
            iterations: MC_ITERATIONS,
            marketAssumptions,
            preGeneratedPaths: fairPaths
        };

        const result = await runMonteCarlo(strategyParams, (subProgress) => {
            if (onProgress) {
                // Map subProgress within the overall optimization progress
                const overall = ((cIdx + (subProgress / 100)) / candidates.length) * 100;
                onProgress(overall);
            }
        });

        const scoredResult: RothStrategyResult = {
            strategyName: candidate.name,
            description: candidate.desc,
            successRate: result.successRate,
            medianNetWorth: result.medianEndingWealth,
            config: candidate.config
        };

        allResults.push(scoredResult);

        if (!bestResult) {
            bestResult = scoredResult;
        } else {
            // Updated scoring matching user's recent edit: successRate priority with 2% margin, then success-weighted median
            if (Math.abs(scoredResult.successRate - bestResult.successRate) > 0.02) {
                if (scoredResult.successRate > bestResult.successRate) {
                    bestResult = scoredResult;
                }
            } else {
                const currentScore = scoredResult.medianNetWorth * scoredResult.successRate;
                const bestScore = bestResult.medianNetWorth * bestResult.successRate;
                if (currentScore > bestScore) {
                    bestResult = scoredResult;
                }
            }
        }
    }

    return { best: bestResult!, all: allResults };
}
