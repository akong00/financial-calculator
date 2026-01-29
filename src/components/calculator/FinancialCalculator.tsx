
'use client'

import * as React from "react"
import { CalculatorInput, CalculatorState } from "./CalculatorInput"
import { CalculatorResults } from "./CalculatorResults"
import { runSimulation, SimulationParams, AnnualResult } from "@/lib/engine/simulation"
import { runMonteCarlo, MonteCarloResult } from "@/lib/engine/monteCarlo"
import { findBestRothStrategy, RothStrategyResult } from "@/lib/engine/optimizer"
import { runHistoricalSimulation, HistoricalAggregateResult } from "@/lib/engine/historical"
import { MC_ITERATIONS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Calculator, PlayCircle, RefreshCw } from "lucide-react"

export function FinancialCalculator() {
    const [state, setState] = React.useState<CalculatorState>({
        currentAge: 55,
        simulationEndAge: 94,
        annualSpending: 200000,
        portfolioTaxable: 3200000,
        portfolioTaxableBasis: 40,
        portfolioPreTax: 400000,
        portfolioRoth: 400000,
        ssMonthlyBenefit: 2000,
        ssClaimAge: 70,
        allocationStock: 100,
        allocationBond: 0,
        filingStatus: 'married_joint',
        inflationRate: 3.0,
        stockReturn: 7.0,
        bondReturn: 3.0,
        withdrawalStrategy: 'constant_percentage',
        withdrawalRate: 5.0,
        withdrawalMin: 160000,
        withdrawalMinRate: 3.0,
        rothStrategy: 'none',
        rothTargetBracket: 12,
        rothFixedAmount: 0,
        isRothAutoOptimized: true,
        preTaxDiscount: 20,
        medicarePeopleCount: 2,
        includeBaseMedicare: true,
        enableMedicaidSafetyNet: true,
        additionalIncome: 0,
        additionalIncomeEndAge: 70,
        enableTaxGainHarvesting: true,
        taxState: 'none'
    })

    const [results, setResults] = React.useState<AnnualResult[]>([])
    const [mcResults, setMcResults] = React.useState<MonteCarloResult | undefined>(undefined)
    const [historicalResults, setHistoricalResults] = React.useState<HistoricalAggregateResult | undefined>(undefined)
    const [strategyComparison, setStrategyComparison] = React.useState<RothStrategyResult[] | undefined>(undefined)
    const [isSimulating, setIsSimulating] = React.useState(false)
    const [progress, setProgress] = React.useState(0)
    const [lastRunState, setLastRunState] = React.useState<CalculatorState | undefined>(undefined)

    const isDirty = results.length > 0 && lastRunState && JSON.stringify(state) !== JSON.stringify(lastRunState);

    // Run simulation when state changes or on button click?
    // Responsive is nice, but heavy calculation might lag. Button is safer for MC.

    const handleRun = React.useCallback(async () => {
        setIsSimulating(true)
        // Note: Don't clear lastRunState yet so we can keep showing results until new ones arrive
        setResults([])
        setMcResults(undefined)
        setHistoricalResults(undefined)
        setStrategyComparison(undefined)
        setProgress(0)

        // Yield to UI to show loading state
        await new Promise(resolve => setTimeout(resolve, 50));

        // Map State to Params
        const duration = state.simulationEndAge - state.currentAge;
        const startYear = new Date().getFullYear();

        const marketReturns = Array(duration + 1).fill({
            stockReturn: state.stockReturn / 100,
            bondReturn: state.bondReturn / 100,
            cashReturn: 0.02,
            inflation: state.inflationRate / 100
        });

        const totalPortfolioValue = state.portfolioTaxable + state.portfolioPreTax + state.portfolioRoth;

        // Calculate Proration Factor for Current Year (Year 0)
        const now = new Date();
        const currentMonth = now.getMonth(); // 0-11
        const currentDay = now.getDate(); // 1-31
        // Fraction remaining: (12 - (month + day/30)) / 12 approximately
        // E.g., Jan 15 = (12 - 0.5) / 12 = 0.958
        // Dec 31 = (12 - 11.99) / 12 ~ 0
        const monthsPassed = currentMonth + (currentDay / 30);
        const fractionOfYearRemaining = Math.max(0, (12 - monthsPassed) / 12);

        const params: SimulationParams = {
            startYear,
            endYear: startYear + duration,
            currentAge: state.currentAge,
            fractionOfYearRemaining,
            initialPortfolio: {
                taxable: state.portfolioTaxable,
                taxableBasis: 0, // Will be initialized from balance * basisFactor in engine
                preTax: state.portfolioPreTax,
                roth: state.portfolioRoth,
                cash: 0 // Cash is now handled via the specific buckets
            },
            marketReturns,
            assetAllocation: {
                stock: state.allocationStock / 100,
                bond: state.allocationBond / 100
            },
            expenses: {
                annualResting: state.annualSpending,
                inflationAdjusted: true
            },
            income: {
                ssInput: {
                    pia: state.ssMonthlyBenefit,
                    claimingAge: state.ssClaimAge,
                    currentAge: state.currentAge,
                    birthYear: new Date().getFullYear() - state.currentAge
                },
                additionalIncome: {
                    amount: state.additionalIncome,
                    endAge: state.additionalIncomeEndAge
                }
            },
            tax: {
                filingStatus: state.filingStatus,
                taxableBasisFactor: state.portfolioTaxableBasis / 100,
                preTaxDiscount: state.preTaxDiscount / 100,
                state: state.taxState
            },
            healthConfig: {
                medicarePeopleCount: state.medicarePeopleCount,
                includeBasePremium: state.includeBaseMedicare,
                enableMedicaid: state.enableMedicaidSafetyNet
            },
            strategy: {
                withdrawal: {
                    strategy: state.withdrawalStrategy,
                    initialPortfolioValue: totalPortfolioValue,
                    currentPortfolioValue: totalPortfolioValue,
                    initialWithdrawalRate: state.withdrawalRate / 100,
                    inflationRate: state.inflationRate / 100,
                    minDollarAmount: state.withdrawalMin,
                    floorRate: state.withdrawalMinRate / 100
                },
                rothConversion: {
                    type: state.isRothAutoOptimized ? state.rothStrategy : 'none',
                    targetBracketRate: state.rothTargetBracket / 100,
                    fixedAmount: state.rothFixedAmount
                },
                enableTaxGainHarvesting: state.enableTaxGainHarvesting
            }
        };

        const marketAssumptions = {
            stockMean: state.stockReturn / 100,
            stockStdDev: 0.15,
            bondMean: state.bondReturn / 100,
            bondStdDev: 0.05,
            cashMean: 0.02,
            cashStdDev: 0.01,
            inflationMean: state.inflationRate / 100,
            inflationStdDev: 0.01
        };

        // Stage 1: Optimization (if enabled)
        setProgress(5);
        if (state.isRothAutoOptimized) {
            const { marketReturns: _ign, ...baseParams } = params;
            const outcome = await findBestRothStrategy(baseParams, marketAssumptions, (p) => {
                setProgress(5 + (p * 0.4)); // Optimization takes up 40% of the bar (5% to 45%)
            });

            params.strategy.rothConversion = outcome.best.config;
            setStrategyComparison(outcome.all);
        } else {
            setStrategyComparison(undefined);
            setProgress(45);
        }
        await new Promise(resolve => setTimeout(resolve, 0));

        // Stage 2: Single Run Simulation
        const res = runSimulation(params);
        setResults(res);
        setProgress(50);
        await new Promise(resolve => setTimeout(resolve, 0));

        // Stage 3: Monte Carlo
        const { marketReturns: _ignore, ...mcParams } = params;
        const mcRes = await runMonteCarlo({
            simulationParams: mcParams,
            iterations: MC_ITERATIONS,
            marketAssumptions
        }, (p) => {
            setProgress(50 + (p * 0.4)); // Monte Carlo takes up 40% of the bar (50% to 90%)
        });
        setMcResults(mcRes);
        await new Promise(resolve => setTimeout(resolve, 0));

        // Stage 4: Historical Simulation
        setProgress(95);
        const histRes = runHistoricalSimulation(mcParams);
        setHistoricalResults(histRes);
        setProgress(100);

        // Clear progress after a delay
        setTimeout(() => {
            setLastRunState(state); // Store the state that generated these results
            setIsSimulating(false);
            setProgress(0);
        }, 500);
    }, [state]);

    // Format header
    return (
        <div className="flex flex-col gap-6">
            {isDirty && (
                <div className="bg-amber-100 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-2">
                    <span className="text-lg">⚠</span>
                    Inputs have changed. Run simulation again to see updated results.
                </div>
            )}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Retirement Calculator</h2>
                    <p className="text-muted-foreground">Retirement projection with Monte Carlo simulation.</p>
                </div>
                <Button onClick={handleRun} disabled={isSimulating} size="lg">
                    {isSimulating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                    Run Simulation
                </Button>
            </div>

            {isSimulating && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between text-xs font-bold text-primary/70 uppercase tracking-widest">
                        <span>Running Multi-Scenario Projections...</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <CalculatorInput state={state} onChange={setState} />
                </div>
                <div className="lg:col-span-9 space-y-6">
                    <CalculatorResults
                        singleRunResults={results}
                        monteCarloResults={mcResults}
                        historicalResults={historicalResults}
                        strategyComparison={strategyComparison}
                        preTaxDiscount={state.preTaxDiscount}
                    />
                </div>
            </div>
        </div>
    )
}
