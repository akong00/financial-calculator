import { CalculatorState, ScenarioResults } from "@/types/scenario-types";
import { runSimulation, SimulationParams, AnnualResult } from "@/lib/engine/simulation";
import { runMonteCarlo, MonteCarloResult } from "@/lib/engine/monteCarlo";
import { findBestRothStrategy, RothStrategyResult } from "@/lib/engine/optimizer";
import { runHistoricalSimulation, HistoricalAggregateResult } from "@/lib/engine/historical";
import { MC_ITERATIONS } from "@/lib/constants";
import { mapStateToParams } from "@/lib/engine/parameterMapping";

export async function runFullScenario(
    state: CalculatorState,
    onProgress: (p: number) => void
): Promise<ScenarioResults> {
    onProgress(0);

    // Yield to UI to show start
    await new Promise(resolve => setTimeout(resolve, 50));

    // 1. Adapter Layer
    const params: SimulationParams = mapStateToParams(state);

    // 2. Market Assumptions (Vol estimation)
    const blendedReturn = params.marketReturns[0].stockReturn;
    const minReturn = 0.03;
    const maxReturn = 0.08;
    const equityWeight = Math.max(0, Math.min(1, (blendedReturn - minReturn) / (maxReturn - minReturn)));
    const blendedStdDev = (equityWeight * 0.15) + ((1 - equityWeight) * 0.05);

    const marketAssumptions = {
        stockMean: blendedReturn,
        stockStdDev: state.stockStdDev / 100, // Use user input
        bondMean: 0.03,
        bondStdDev: 0.03,
        cashMean: 0.01,
        cashStdDev: 0.01,
        inflationMean: state.inflationRate / 100,
        inflationStdDev: 0.01
    };

    // 3. Optimization (Roth)
    onProgress(5);
    let strategyComparison: RothStrategyResult[] | undefined;
    if (state.isRothAutoOptimized) {
        const { marketReturns: _ign, ...baseParams } = params;
        const outcome = await findBestRothStrategy(baseParams, marketAssumptions, (p) => {
            onProgress(5 + (p * 0.4));
        });
        params.strategy.rothConversion = outcome.best.config;
        strategyComparison = outcome.all;
    } else {
        onProgress(45);
    }
    await new Promise(resolve => setTimeout(resolve, 0));

    // 4. Single Run
    const { results: singleRunResults } = runSimulation(params);
    onProgress(50);
    await new Promise(resolve => setTimeout(resolve, 0));

    // 5. Monte Carlo
    const { marketReturns: _ignore, ...mcParams } = params;
    const monteCarloResults = await runMonteCarlo({
        simulationParams: mcParams,
        iterations: MC_ITERATIONS,
        marketAssumptions,
        mcDistributionType: state.mcDistributionType
    }, (p) => {
        onProgress(50 + (p * 0.4));
    });
    await new Promise(resolve => setTimeout(resolve, 0));

    // 6. Historical
    onProgress(95);
    const historicalResults = runHistoricalSimulation(mcParams);
    onProgress(100);

    return {
        singleRunResults,
        monteCarloResults,
        historicalResults,
        strategyComparison,
        lastRunTimestamp: Date.now()
    };
}
