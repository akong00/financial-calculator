
import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { AnnualResult } from "@/lib/engine/simulation"
import { MonteCarloResult } from "@/lib/engine/monteCarlo"
import { HistoricalAggregateResult } from "@/lib/engine/historical"
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    LineChart,
    Line,
    Legend,
    BarChart,
    Bar,
    Cell,
    ReferenceLine,
    Sankey,
} from "recharts"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { RothStrategyResult } from "@/lib/engine/optimizer"
import { MC_ITERATIONS } from "@/lib/constants"
import { PercentileExplorer } from "@/components/outputs/PercentileExplorer"

interface CalculatorResultsProps {
    singleRunResults: AnnualResult[];
    monteCarloResults?: MonteCarloResult;
    historicalResults?: HistoricalAggregateResult;
    strategyComparison?: RothStrategyResult[];
    isSimulating?: boolean;
    preTaxDiscount?: number;
}

// --- Pure Utility Functions ---
const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
}

const formatPercent = (val: number) => {
    return `${(val * 100).toFixed(1)}%`;
}

const getAgnosticValue = (val: number, isReal: boolean, inflationFactor: number = 1.0) => {
    return isReal ? val / (inflationFactor || 1) : val;
}

// --- Stable Sub-Components ---

const LazyAccordionContent = React.memo(({ isOpen, children, className }: { isOpen: boolean, children: React.ReactNode, className?: string }) => {
    const [hasBeenOpened, setHasBeenOpened] = React.useState(isOpen);

    React.useEffect(() => {
        if (isOpen && !hasBeenOpened) {
            setHasBeenOpened(true);
        }
    }, [isOpen, hasBeenOpened]);

    return (
        <AccordionContent isOpen={isOpen} className={className}>
            {hasBeenOpened ? children : <div className="h-20" />}
        </AccordionContent>
    );
});
LazyAccordionContent.displayName = "LazyAccordionContent";

// Unified Theme-Consistent Tooltip
const ChartTooltip = ({ active, payload, label, titleFormatter = (val: any) => `Year ${val}`, itemSorter, isReal }: any) => {
    if (active && payload && payload.length) {
        let items = [...payload].filter(p => p.name && !p.name.includes('range'));
        if (typeof itemSorter === 'function') {
            items = items.sort(itemSorter);
        }

        const dataPoint = payload[0].payload;
        const strategyName = dataPoint?.strategyName;

        return (
            <div className="bg-background opacity-100 border-2 border-primary/20 rounded-xl p-3 shadow-2xl z-50">
                <p className="font-black text-xs mb-2 text-foreground uppercase tracking-widest border-b border-primary/10 pb-1.5 leading-none">
                    {strategyName || titleFormatter(label)}
                </p>
                <div className="space-y-2">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-6 text-[11px]">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: item.color }} />
                                <span className="text-muted-foreground font-bold whitespace-nowrap">
                                    {item.name === 'successRate' ? 'Success Rate' : item.name}:
                                </span>
                            </div>
                            <span className="font-black text-foreground font-mono">
                                {typeof item.value === 'number' && (item.name?.includes('Rate') || item.name === 'successRate')
                                    ? formatPercent(item.value)
                                    : typeof item.value === 'number'
                                        ? (titleFormatter('').includes('Simulation Sample')
                                            ? `${item.value.toFixed(2)}x`
                                            : formatCurrency(item.value))
                                        : item.value}
                            </span>
                        </div>
                    ))}
                    {/* Special case for Taxes Paid breakdown */}
                    {dataPoint?.cashFlow?.taxDetails && (
                        <div className="pt-2 mt-2 border-t border-primary/10 space-y-1">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Tax Breakdown</p>
                            <div className="flex justify-between gap-4 text-[10px]">
                                <span className="text-muted-foreground font-bold">Federal:</span>
                                <span className="font-mono text-foreground">{formatCurrency(dataPoint.cashFlow.taxDetails.federal)}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-[10px]">
                                <span className="text-muted-foreground font-bold">State:</span>
                                <span className="font-mono text-foreground">{formatCurrency(dataPoint.cashFlow.taxDetails.state)}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-[10px]">
                                <span className="text-muted-foreground font-bold">Medicare Premiums:</span>
                                <span className="font-mono text-foreground">{formatCurrency(dataPoint.cashFlow.taxDetails.medicare)}</span>
                            </div>
                        </div>
                    )}
                    {/* Special case for Roth Strategy Comparison */}
                    {dataPoint?.medianNetWorth !== undefined && (
                        <div className="flex items-center justify-between gap-6 text-[11px] pt-1 mt-1 border-t border-primary/10">
                            <span className="text-muted-foreground font-bold">Median Net Worth:</span>
                            <span className="font-black text-foreground font-mono">
                                {formatCurrency(getAgnosticValue(dataPoint.medianNetWorth, !!isReal, 1))}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

export function CalculatorResults({
    singleRunResults,
    monteCarloResults,
    historicalResults,
    strategyComparison,
    isSimulating,
    preTaxDiscount = 0
}: CalculatorResultsProps) {
    const [isReal, setIsReal] = React.useState(true);
    const [openSections, setOpenSections] = React.useState<string[]>(['metrics', 'mc_chart', 'cash_flow', 'sankey', 'assets', 'milestones']);

    const toggleSections = React.useCallback((section: string) => {
        setOpenSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    }, []);

    const getValue = React.useCallback((val: number, inflationFactor: number = 1.0) => {
        return getAgnosticValue(val, isReal, inflationFactor);
    }, [isReal]);

    const transformedResults = React.useMemo(() => {
        if (!singleRunResults) return [];
        return singleRunResults.map((r): any => { // Use any for brevity
            const inf = r.inflationAdjustmentFactor;
            return {
                ...r,
                netWorth: getValue(r.netWorth, inf),
                portfolio: {
                    ...r.portfolio,
                    taxable: getValue(r.portfolio.taxable, inf),
                    taxableBasis: getValue(r.portfolio.taxableBasis, inf),
                    preTax: getValue(r.portfolio.preTax, inf),
                    roth: getValue(r.portfolio.roth, inf),
                    cash: getValue(r.portfolio.cash, inf),
                    property: getValue(r.portfolio.property, inf),
                },
                totalDebt: getValue(r.totalDebt, inf),
                assets: {
                    roth: getValue(r.portfolio.roth, inf),
                    brokerage: getValue(r.portfolio.taxable, inf),
                    trad: getValue(r.portfolio.preTax, inf),
                    property: getValue(r.portfolio.property, inf),
                    other: getValue(r.portfolio.cash, inf),
                    loans: -getValue(r.totalDebt, inf)
                },
                cashFlow: {
                    ...r.cashFlow,
                    income: {
                        ss: getValue(r.cashFlow.income.ss, inf),
                        other: getValue(r.cashFlow.income.other, inf),
                        gross: getValue(r.cashFlow.income.gross, inf),
                    },
                    rmd: getValue(r.cashFlow.rmd, inf),
                    taxes: getValue(r.cashFlow.taxes, inf),
                    taxDetails: {
                        federal: getValue(r.taxDetails.federal, inf),
                        state: getValue(r.taxDetails.state, inf),
                        medicare: getValue(r.taxDetails.medicare, inf),
                    },
                    withdrawals: {
                        total: getValue(r.cashFlow.withdrawals.total, inf),
                        taxable: getValue(r.cashFlow.withdrawals.taxable, inf),
                        preTax: getValue(r.cashFlow.withdrawals.preTax, inf),
                        roth: getValue(r.cashFlow.withdrawals.roth, inf),
                        cash: getValue(r.cashFlow.withdrawals.cash, inf),
                    },
                    rothConversion: getValue(r.cashFlow.rothConversion, inf),
                    taxGainHarvesting: getValue(r.cashFlow.taxGainHarvesting, inf),
                    spending: getValue(r.cashFlow.spending, inf),
                    debtPayments: getValue(r.cashFlow.debtPayments, inf),
                    savingsDetails: r.cashFlow.savingsDetails ? {
                        taxable: getValue(r.cashFlow.savingsDetails.taxable, inf),
                        roth: getValue(r.cashFlow.savingsDetails.roth, inf),
                        preTax: getValue(r.cashFlow.savingsDetails.preTax, inf),
                        cash: getValue(r.cashFlow.savingsDetails.cash, inf),
                    } : undefined
                }
            };
        });
    }, [singleRunResults, isReal, getValue]);

    const transformedMC = React.useMemo(() => {
        if (!monteCarloResults) return undefined;

        // Create unified data array from percentile bands
        const unifiedData = monteCarloResults.percentileBands.map((s, i) => {
            const scale = isReal ? 1 : s.avgInflationFactor;

            return {
                year: s.year,
                p5: s.p5 * scale,
                p25: s.p25 * scale,
                p50: s.p50 * scale,
                p75: s.p75 * scale,
                p95: s.p95 * scale,
                // Disjoint ranges for non-overlapping shading
                range5_25: [s.p5 * scale, s.p25 * scale],
                range25_75: [s.p25 * scale, s.p75 * scale],
                range75_95: [s.p75 * scale, s.p95 * scale]
            };
        });

        return {
            ...monteCarloResults,
            unifiedData,
        };
    }, [monteCarloResults, isReal]);


    if (!singleRunResults || singleRunResults.length === 0) {
        return (
            <Card className="w-full h-full min-h-[400px] flex flex-col items-center justify-center space-y-4">
                <p className="text-muted-foreground font-medium">
                    {isSimulating ? "Running calculations..." : "Enter parameters to run simulation"}
                </p>
            </Card>
        )
    }

    const lastResult = singleRunResults[singleRunResults.length - 1];

    return (
        <div className="space-y-4">
            {/* Global Controls */}
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 border-primary/20 shadow-md">
                <div className="flex items-center justify-center space-x-4">
                    <Label htmlFor="view-mode" className="text-lg font-bold text-primary cursor-pointer">Show Real (Inflation-Adjusted)</Label>
                    <Switch id="view-mode" checked={isReal} onCheckedChange={setIsReal} className="scale-125" />
                </div>
            </Card>

            {/* Key Metrics */}
            <div className="px-1">
                <Accordion className="border-none">
                    <AccordionItem className="border-none">
                        <AccordionTrigger
                            isOpen={openSections.includes('metrics')}
                            onToggle={() => toggleSections('metrics')}
                            className={`flex items-center py-2 px-4 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-primary bg-muted/40 border border-primary/20 shadow-sm transition-colors ${openSections.includes('metrics') ? 'rounded-t-lg rounded-b-none border-b-0 mb-0' : 'rounded-lg'}`}
                        >
                            <span>📊 Key Simulation Metrics</span>
                        </AccordionTrigger>
                        <LazyAccordionContent isOpen={openSections.includes('metrics')}>
                            <KeyMetricsSection
                                monteCarloResults={monteCarloResults}
                                singleRunResults={singleRunResults}
                                historicalResults={historicalResults}
                                isReal={isReal}
                                lastResult={lastResult}
                                formatCurrency={formatCurrency}
                                getValue={getValue}
                            />
                        </LazyAccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            {/* Monte Carlo Chart */}
            {transformedMC && (
                <div className="px-1">
                    <Accordion className="border-none">
                        <AccordionItem className="border-none">
                            <AccordionTrigger
                                isOpen={openSections.includes('mc_chart')}
                                onToggle={() => toggleSections('mc_chart')}
                                className={`flex items-center py-2 px-4 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-primary bg-muted/40 border border-primary/20 shadow-sm transition-colors ${openSections.includes('mc_chart') ? 'rounded-t-lg rounded-b-none border-b-0 mb-0' : 'rounded-lg'}`}
                            >
                                <span>🔮 Monte Carlo Projections (Roth-eq Net Worth)</span>
                            </AccordionTrigger>
                            <LazyAccordionContent isOpen={openSections.includes('mc_chart')}>
                                <MonteCarloChartSection
                                    transformedMC={transformedMC}
                                    isReal={isReal}
                                    ChartTooltip={ChartTooltip}
                                />
                            </LazyAccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            )}

            {/* Percentile Simulation Explorer */}
            {transformedMC && monteCarloResults?.sampleSimulations && (
                <div className="px-1">
                    <Accordion className="border-none">
                        <AccordionItem className="border-none">
                            <AccordionTrigger
                                isOpen={openSections.includes('percentile_explorer')}
                                onToggle={() => toggleSections('percentile_explorer')}
                                className={`flex items-center py-2 px-4 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-primary bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 shadow-sm transition-colors ${openSections.includes('percentile_explorer') ? 'rounded-t-lg rounded-b-none border-b-0 mb-0' : 'rounded-lg'}`}
                            >
                                <span>🔍 Percentile Simulation Explorer</span>
                                <div className="ml-auto flex gap-1 text-xs mr-4">
                                    <span className="text-muted-foreground">Explore individual outcomes</span>
                                </div>
                            </AccordionTrigger>
                            <LazyAccordionContent isOpen={openSections.includes('percentile_explorer')}>
                                <PercentileExplorer
                                    sampleSimulations={monteCarloResults.sampleSimulations}
                                    isReal={isReal}
                                    className="rounded-t-none border-indigo-500/30 border-t-0 shadow-sm -mt-px"
                                />
                            </LazyAccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            )}

            {/* Milestone Percentiles Table */}
            {transformedMC && transformedMC.milestoneStats && Object.keys(transformedMC.milestoneStats).length > 0 && (
                <div className="px-1">
                    <Accordion className="border-none">
                        <AccordionItem className="border-none">
                            <AccordionTrigger
                                isOpen={openSections.includes('milestones')}
                                onToggle={() => toggleSections('milestones')}
                                className={`flex items-center py-2 px-4 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-primary bg-muted/40 border border-primary/20 shadow-sm transition-colors ${openSections.includes('milestones') ? 'rounded-t-lg rounded-b-none border-b-0 mb-0' : 'rounded-lg'}`}
                            >
                                <span>🚩 Milestone Projections</span>
                            </AccordionTrigger>
                            <LazyAccordionContent isOpen={openSections.includes('milestones')}>
                                <MilestoneProjectionsSection transformedMC={transformedMC} />
                            </LazyAccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            )}

            {/* Historical Simulation Analysis */}
            {historicalResults && (
                <div className="px-1">
                    <Accordion className="border-none">
                        <AccordionItem className="border-none">
                            <AccordionTrigger
                                isOpen={openSections.includes('historical')}
                                onToggle={() => toggleSections('historical')}
                                className={`flex items-center py-2 px-4 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-primary bg-muted/40 border border-primary/20 shadow-sm transition-colors ${openSections.includes('historical') ? 'rounded-t-lg rounded-b-none border-b-0 mb-0' : 'rounded-lg'}`}
                            >
                                <span>🏛️ Historical Sequence Analysis (1928-2025)</span>
                                <div className="ml-auto flex gap-1 text-xs mr-4">
                                    <span className="text-muted-foreground">Success Rate:</span>
                                    <span className={`font-bold ${historicalResults.successRate > 0.9 ? 'text-green-500' : 'text-red-500'}`}>{(historicalResults.successRate * 100).toFixed(1)}%</span>
                                </div>
                            </AccordionTrigger>
                            <LazyAccordionContent isOpen={openSections.includes('historical')}>
                                <HistoricalAnalysisSection historicalResults={historicalResults} />
                            </LazyAccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            )}

            {/* Roth Strategy Analysis */}
            {strategyComparison && (() => {
                const best = [...strategyComparison].sort((a, b) => {
                    if (Math.abs(b.successRate - a.successRate) > 0.02) {
                        return b.successRate - a.successRate;
                    }
                    return b.medianNetWorth * b.successRate - a.medianNetWorth * a.successRate;
                })[0];

                return (
                    <div className="px-1">
                        <Accordion className="border-none">
                            <AccordionItem className="border-none">
                                <AccordionTrigger
                                    isOpen={openSections.includes('roth_compare')}
                                    onToggle={() => toggleSections('roth_compare')}
                                    className={`flex items-center py-2 px-4 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-primary bg-muted/40 border border-primary/20 shadow-sm transition-colors ${openSections.includes('roth_compare') ? 'rounded-t-lg rounded-b-none border-b-0 mb-0' : 'rounded-lg'}`}
                                >
                                    <span>⚖️ Roth Strategy Comparison</span>
                                    <div className="ml-auto flex items-center gap-1 text-xs mr-4">
                                        <span className="text-muted-foreground">Best:</span>
                                        <span className="font-bold text-green-500">{best.strategyName}</span>
                                        <span className="text-muted-foreground">({(best.successRate * 100).toFixed(1)}%)</span>
                                    </div>
                                </AccordionTrigger>
                                <LazyAccordionContent isOpen={openSections.includes('roth_compare')}>
                                    <RothStrategySection
                                        strategyComparison={strategyComparison}
                                        best={best}
                                        ChartTooltip={ChartTooltip}
                                        formatCurrency={formatCurrency}
                                        getValue={getValue}
                                        isReal={isReal}
                                    />
                                </LazyAccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                );
            })()}

            {/* Cash Flow Chart */}
            <div className="px-1">
                <Accordion className="border-none">
                    <AccordionItem className="border-none">
                        <AccordionTrigger
                            isOpen={openSections.includes('cash_flow')}
                            onToggle={() => toggleSections('cash_flow')}
                            className={`flex items-center py-2 px-4 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-primary bg-muted/40 border border-primary/20 shadow-sm transition-colors ${openSections.includes('cash_flow') ? 'rounded-t-lg rounded-b-none border-b-0 mb-0' : 'rounded-lg'}`}
                        >
                            <span>💸 Theoretical Annual Cash Flow</span>
                        </AccordionTrigger>
                        <LazyAccordionContent isOpen={openSections.includes('cash_flow')}>
                            <CashFlowSection
                                transformedResults={transformedResults}
                                isReal={isReal}
                                ChartTooltip={ChartTooltip}
                            />
                        </LazyAccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            {/* Sankey Flow Chart */}
            <div className="px-1">
                <Accordion className="border-none">
                    <AccordionItem className="border-none">
                        <AccordionTrigger
                            isOpen={openSections.includes('sankey')}
                            onToggle={() => toggleSections('sankey')}
                            className={`flex items-center py-2 px-4 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-primary bg-muted/40 border border-primary/20 shadow-sm transition-colors ${openSections.includes('sankey') ? 'rounded-t-lg rounded-b-none border-b-0 mb-0' : 'rounded-lg'}`}
                        >
                            <span>🌊 Annual Cash Flow Breakdown (Sankey)</span>
                        </AccordionTrigger>
                        <LazyAccordionContent isOpen={openSections.includes('sankey')}>
                            <SankeyChartSection
                                transformedResults={transformedResults}
                                isReal={isReal}
                            />
                        </LazyAccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            {/* Assets Stacked Bar Chart */}
            <div className="px-1">
                <Accordion className="border-none">
                    <AccordionItem className="border-none">
                        <AccordionTrigger
                            isOpen={openSections.includes('assets')}
                            onToggle={() => toggleSections('assets')}
                            className={`flex items-center py-2 px-4 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-primary bg-muted/40 border border-primary/20 shadow-sm transition-colors ${openSections.includes('assets') ? 'rounded-t-lg rounded-b-none border-b-0 mb-0' : 'rounded-lg'}`}
                        >
                            <span>🏦 Theoretical Assets & Liabilities Over Time</span>
                        </AccordionTrigger>
                        <LazyAccordionContent isOpen={openSections.includes('assets')}>
                            <AssetsLiabilitySection
                                transformedResults={transformedResults}
                                isReal={isReal}
                                ChartTooltip={ChartTooltip}
                            />
                        </LazyAccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            {/* Detailed Table */}
            <div className="px-1">
                <Accordion className="border-none">
                    <AccordionItem className="border-none">
                        <AccordionTrigger
                            isOpen={openSections.includes('detailed_table')}
                            onToggle={() => toggleSections('detailed_table')}
                            className={`flex items-center py-2 px-4 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-primary bg-muted/40 border border-primary/20 shadow-sm transition-colors ${openSections.includes('detailed_table') ? 'rounded-t-lg rounded-b-none border-b-0 mb-0' : 'rounded-lg'}`}
                        >
                            <span>📋 Theoretical Year-by-Year Detailed Breakdown</span>
                        </AccordionTrigger>
                        <LazyAccordionContent isOpen={openSections.includes('detailed_table')}>
                            <DetailedBreakdownSection
                                transformedResults={transformedResults}
                                isReal={isReal}
                                formatCurrency={formatCurrency}
                                getValue={getValue}
                            />
                        </LazyAccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </div>
    );
}

// --- Memoized Section Components ---

const KeyMetricsSection = React.memo(({ monteCarloResults, singleRunResults, historicalResults, isReal, lastResult, formatCurrency, getValue }: any) => {
    return (
        <div className="border border-primary/20 border-t-0 p-4 rounded-b-lg bg-background/40 -mt-px">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Ending Roth-eq Net Worth ({isReal ? 'Real' : 'Nominal'})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="min-w-fit">
                            <div className="text-xl sm:text-2xl font-bold text-primary">
                                {monteCarloResults
                                    ? formatCurrency(isReal ? monteCarloResults.medianEndingWealth : monteCarloResults.medianEndingWealthNominal)
                                    : '--'}
                            </div>
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                Median (Monte Carlo)
                            </p>
                        </div>
                        <p className="pt-2 text-xs text-muted-foreground">
                            At age {lastResult.age} (Year {lastResult.year})
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Success Probability</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
                            <div className="min-w-fit">
                                <div className="text-xl sm:text-2xl font-bold">
                                    {monteCarloResults ? `${(monteCarloResults.successRate * 100).toFixed(1)}%` : '--'}
                                </div>
                                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                    Monte Carlo
                                </p>
                            </div>
                            <div className="h-6 sm:h-8 w-px bg-border mx-0.5 sm:mx-1" />
                            <div className="text-right min-w-fit">
                                <div className={`text-xl sm:text-2xl font-bold ${historicalResults ? (historicalResults.successRate === 1 ? 'text-green-600' : 'text-primary') : ''}`}>
                                    {historicalResults ? `${(historicalResults.successRate * 100).toFixed(1)}%` : '--'}
                                </div>
                                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                    Historical
                                </p>
                            </div>
                        </div>
                        <p className="pt-2 text-[10px] text-muted-foreground font-bold">
                            Chance of not running out of money
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Spending & Taxes ({isReal ? 'Real' : 'Nominal'})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="text-xl sm:text-2xl font-bold">
                                {monteCarloResults
                                    ? formatCurrency(isReal ? monteCarloResults.medianTotalSpent : monteCarloResults.medianTotalSpentNominal)
                                    : '--'}
                            </div>
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                Median Total Money Spent
                            </p>
                        </div>
                        <div className="flex justify-between items-end gap-2">
                            <div>
                                <div className="text-lg font-bold">
                                    {monteCarloResults
                                        ? formatCurrency(isReal ? monteCarloResults.medianAnnualSpending : monteCarloResults.medianAnnualSpendingNominal)
                                        : '--'}
                                </div>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                                    Median Annual Spending
                                </p>
                            </div>
                            <div className="text-right group relative">
                                <div className="text-lg font-bold">
                                    {formatCurrency(singleRunResults.reduce((acc: number, curr: any) => acc + getValue(curr.cashFlow.taxes, curr.inflationAdjustmentFactor), 0))}
                                </div>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                                    Total Taxes Paid
                                </p>
                                <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block bg-background border border-primary/20 rounded p-2 shadow-xl z-50 text-[10px] whitespace-nowrap">
                                    <div className="flex justify-between gap-4">
                                        <span>Federal:</span>
                                        <strong>{formatCurrency(singleRunResults.reduce((acc: number, curr: any) => acc + getValue(curr.taxDetails.federal, curr.inflationAdjustmentFactor), 0))}</strong>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <span>State:</span>
                                        <strong>{formatCurrency(singleRunResults.reduce((acc: number, curr: any) => acc + getValue(curr.taxDetails.state, curr.inflationAdjustmentFactor), 0))}</strong>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <span>Medicare:</span>
                                        <strong>{formatCurrency(singleRunResults.reduce((acc: number, curr: any) => acc + getValue(curr.taxDetails.medicare, curr.inflationAdjustmentFactor), 0))}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
});
KeyMetricsSection.displayName = "KeyMetricsSection";

const MonteCarloChartSection = React.memo(({ transformedMC, isReal, ChartTooltip }: any) => {
    return (
        <Card className="rounded-t-none border-primary/20 border-t-0 shadow-sm text-sm -mt-px">
            <CardHeader className="py-3">
                <CardTitle className="text-sm uppercase font-black tracking-tight">Monte Carlo Projections (Roth-eq Net Worth - {isReal ? 'Real' : 'Nominal'})</CardTitle>
                <CardDescription className="text-xs">Range of outcomes ({isReal ? 'Inflation Adjusted' : 'Nominal Dollars'}) - {MC_ITERATIONS} simulations</CardDescription>
            </CardHeader>
            <CardContent className="h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={transformedMC.unifiedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" type="number" domain={['dataMin', 'dataMax']} />
                        <YAxis tickFormatter={(value) => `$${value / 1000000}M`} />
                        <Tooltip
                            wrapperStyle={{ zIndex: 100 }}
                            content={
                                <ChartTooltip
                                    isReal={isReal}
                                    itemSorter={(a: any, b: any) => {
                                        const order: Record<string, number> = {
                                            "95%": 1,
                                            "75%": 2,
                                            "Median (50%)": 3,
                                            "25%": 4,
                                            "5%": 5
                                        };
                                        return (order[a.name] || 10) - (order[b.name] || 10);
                                    }}
                                />
                            }
                        />
                        <Area type="monotone" dataKey="range75_95" stroke="none" fill="#4ade80" fillOpacity={0.3} tooltipType="none" name="range_95" />
                        <Area type="monotone" dataKey="range25_75" stroke="none" fill="#22c55e" fillOpacity={0.25} tooltipType="none" name="range_75" />
                        <Area type="monotone" dataKey="range5_25" stroke="none" fill="#ef4444" fillOpacity={0.15} tooltipType="none" name="range_25" />
                        <Line dataKey="p95" stroke="#4ade80" strokeDasharray="5 5" dot={false} strokeOpacity={0.9} name="95%" />
                        <Line dataKey="p75" stroke="#22c55e" strokeDasharray="3 3" dot={false} strokeOpacity={0.9} name="75%" />
                        <Line dataKey="p50" stroke="#6366f1" strokeWidth={3} dot={false} name="Median (50%)" />
                        <Line dataKey="p25" stroke="#22c55e" strokeDasharray="3 3" dot={false} strokeOpacity={0.9} name="25%" />
                        <Line dataKey="p5" stroke="#ef4444" strokeDasharray="5 5" dot={false} strokeOpacity={0.9} name="5%" />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
});
MonteCarloChartSection.displayName = "MonteCarloChartSection";

const MilestoneProjectionsSection = React.memo(({ transformedMC }: any) => {
    return (
        <Card className="max-w-4xl rounded-t-none border-primary/20 border-t-0 shadow-sm -mt-px">
            <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <span className="p-1.5 bg-purple-500/10 rounded-lg">🚩</span>
                    Milestone Projections
                </CardTitle>
                <CardDescription>
                    Statistical estimates of the age when milestones are achieved across {MC_ITERATIONS} simulations.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="font-bold">Milestone</TableHead>
                            <TableHead className="text-right font-bold text-green-600">99%</TableHead>
                            <TableHead className="text-right font-bold text-green-600">95%</TableHead>
                            <TableHead className="text-right font-bold text-green-600">75%</TableHead>
                            <TableHead className="text-right font-bold">50%</TableHead>
                            <TableHead className="text-right font-bold text-red-600">25%</TableHead>
                            <TableHead className="text-right font-bold text-red-600">5%</TableHead>
                            <TableHead className="text-right font-bold text-red-600">1%</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.entries(transformedMC.milestoneStats).map(([id, stats]: [string, any]) => (
                            <TableRow key={id} className="hover:bg-muted/20">
                                <TableCell className="font-bold text-primary">{stats.name}</TableCell>
                                <TableCell className="text-right font-mono font-bold text-green-600">
                                    {stats.score99 >= 999 ? <span className="text-[10px] text-muted-foreground italic">Not Reached</span> : stats.score99}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-green-600">
                                    {stats.score95 >= 999 ? <span className="text-[10px] text-muted-foreground italic">Not Reached</span> : stats.score95}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-green-600">
                                    {stats.score75 >= 999 ? <span className="text-[10px] text-muted-foreground italic">Not Reached</span> : stats.score75}
                                </TableCell>
                                <TableCell className="text-right font-mono font-black text-lg">
                                    {stats.score50 >= 999 ? <span className="text-[10px] text-muted-foreground italic">Not Reached</span> : stats.score50}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-red-600">
                                    {stats.score25 >= 999 ? <span className="text-[10px] text-muted-foreground italic">Not Reached</span> : stats.score25}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-red-600">
                                    {stats.score5 >= 999 ? <span className="text-[10px] text-muted-foreground italic">Not Reached</span> : stats.score5}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-red-600">
                                    {stats.score1 >= 999 ? <span className="text-[10px] text-muted-foreground italic">Not Reached</span> : stats.score1}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="p-3 text-[10px] text-muted-foreground italic border-t bg-muted/10">
                    <strong>Note on Column Meanings:</strong> These percentiles represent your "Performance Score". A <strong>99% Score</strong> means you performed better than 99% of outcomes (achieving the milestone very early). A <strong>1% Score</strong> represents the worst outcome (achieving it very late or not at all).
                </div>
            </CardContent>
        </Card>
    );
});
MilestoneProjectionsSection.displayName = "MilestoneProjectionsSection";

const HistoricalAnalysisSection = React.memo(({ historicalResults }: any) => {
    return (
        <Card className="rounded-t-none border-primary/20 border-t-0 shadow-sm -mt-px">
            <CardHeader className="py-3">
                <CardTitle className="text-sm uppercase font-black tracking-tight">Historical Failures & Worst Cases</CardTitle>
                <CardDescription className="text-xs">
                    Based on actual market history. {historicalResults.results.length} total contiguous sequences simulated.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
                {historicalResults.results.filter((r: any) => !r.success).length > 0 ? (
                    <div>
                        <h4 className="text-xs font-bold mb-2 pt-2">Failed Sequences (Money ran out)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {historicalResults.results.filter((r: any) => !r.success).map((r: any) => (
                                <div key={r.startYear} className="p-2 bg-red-500/10 border border-red-500/20 rounded text-center">
                                    <div className="text-xs font-bold text-red-600">Start Year: {r.startYear}</div>
                                    <div className="text-[10px] text-muted-foreground">Failed at Age {r.failureAge}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded text-center text-green-700 font-bold text-sm mt-2">
                        No failures found in any historical starting year!
                    </div>
                )}
                <div>
                    <h4 className="text-xs font-bold mb-2">Worst 5 Starting Years (Lowest Ending Real Wealth)</h4>
                    <div className="space-y-1">
                        {[...historicalResults.results].sort((a, b) => a.lowestRealNetWorth - b.lowestRealNetWorth).slice(0, 5).map((r, i) => (
                            <div key={r.startYear} className="flex justify-between text-xs border-b border-muted last:border-0 py-1">
                                <span className="font-mono text-muted-foreground">{i + 1}. {r.startYear}</span>
                                <span className={r.lowestRealNetWorth <= 0 ? "text-red-600 font-bold" : ""}>
                                    Min Real NW: ${Math.round(r.lowestRealNetWorth).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});
HistoricalAnalysisSection.displayName = "HistoricalAnalysisSection";

const RothStrategySection = React.memo(({ strategyComparison, best, ChartTooltip, formatCurrency, getValue, isReal }: any) => {
    return (
        <Card className="rounded-t-none border-primary/20 border-t-0 shadow-sm -mt-px">
            <CardHeader className="py-3">
                <CardTitle className="text-sm uppercase font-black tracking-tight">Roth Strategy Comparison</CardTitle>
                <CardDescription className="text-xs">Success rate comparison across different Roth conversion strategies.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={strategyComparison}
                            layout="vertical"
                            margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" domain={[0, 1]} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
                            <YAxis type="category" dataKey="strategyName" width={100} style={{ fontSize: '12px' }} />
                            <Tooltip wrapperStyle={{ zIndex: 100 }} content={<ChartTooltip titleFormatter={() => 'Strategy Comparison'} getValue={getValue} isReal={isReal} />} />
                            <Bar dataKey="successRate" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                {strategyComparison.map((entry: any, index: number) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.strategyName === best?.strategyName ? '#22c55e' : '#8884d8'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg border text-[11px] text-muted-foreground italic leading-relaxed">
                    <p>
                        <strong>Note on Fill Standard Deduction:</strong> This strategy focuses on converting the maximum amount possible at 0% ordinary income tax (filling the Standard Deduction).
                    </p>
                </div>
            </CardContent>
        </Card>
    );
});
RothStrategySection.displayName = "RothStrategySection";

const CashFlowSection = React.memo(({ transformedResults, isReal, ChartTooltip }: any) => {
    return (
        <Card className="col-span-1 rounded-t-none border-primary/20 border-t-0 shadow-sm -mt-px">
            <CardHeader className="py-3">
                <CardTitle className="text-sm uppercase font-black tracking-tight">Theoretical Annual Cash Flow ({isReal ? 'Real' : 'Nominal'})</CardTitle>
                <CardDescription className="text-xs">
                    Sources of income and tax costs.
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={transformedResults}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis tickFormatter={(val) => `$${val / 1000}k`} />
                        <Tooltip wrapperStyle={{ zIndex: 100 }} content={<ChartTooltip isReal={isReal} />} />
                        {transformedResults.some((r: any) => r.cashFlow.income.ss > 0) && <Bar dataKey="cashFlow.income.ss" name="Social Security" stackId="a" fill="#4ade80" />}
                        {transformedResults.some((r: any) => r.cashFlow.income.other > 0) && <Bar dataKey="cashFlow.income.other" name="Additional Income" stackId="a" fill="#bef264" />}
                        {transformedResults.some((r: any) => r.cashFlow.rmd > 0) && <Bar dataKey="cashFlow.rmd" name="RMD" stackId="a" fill="#fbbf24" />}
                        {transformedResults.some((r: any) => r.cashFlow.withdrawals.taxable > 0) && <Bar dataKey="cashFlow.withdrawals.taxable" name="Taxable Withdrawal" stackId="a" fill="#8884d8" />}
                        {transformedResults.some((r: any) => r.cashFlow.withdrawals.preTax > 0) && <Bar dataKey="cashFlow.withdrawals.preTax" name="Pre-Tax Withdrawal" stackId="a" fill="#f87171" />}
                        {transformedResults.some((r: any) => r.cashFlow.withdrawals.roth > 0) && <Bar dataKey="cashFlow.withdrawals.roth" name="Roth Withdrawal" stackId="a" fill="#22d3ee" radius={[0, 0, 0, 0]} />}
                        <Bar dataKey="cashFlow.taxes" name="Taxes Paid" stackId="a" fill="#64748b" radius={[2, 2, 0, 0]} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
});
CashFlowSection.displayName = "CashFlowSection";

const SankeyChartSection = React.memo(({ transformedResults, isReal }: any) => {
    const minAge = transformedResults[0]?.age || 0;
    const maxAge = transformedResults[transformedResults.length - 1]?.age || 100;
    const [selectedAge, setSelectedAge] = React.useState(minAge);

    const dataForAge = React.useMemo(() => {
        return transformedResults.find((r: any) => r.age === selectedAge) || transformedResults[0];
    }, [transformedResults, selectedAge]);

    const sankeyData = React.useMemo(() => {
        if (!dataForAge) return { nodes: [], links: [] };

        const cf = dataForAge.cashFlow;
        const td = cf.taxDetails || {};
        const inf = dataForAge.inflationAdjustmentFactor || 1;

        // Stage 0: Sources
        const ss = cf.income.ss;
        const otherInc = cf.income.other;
        const wTaxable = cf.withdrawals.taxable;
        const wPreTax = cf.withdrawals.preTax;
        const wRoth = cf.withdrawals.roth;
        const wCash = cf.withdrawals.cash;
        const rmd = cf.rmd;

        // Stage 1: Income Types
        const earnedIncome = otherInc;
        const withdrawals = wTaxable + wPreTax + wRoth + wCash + rmd;
        const ssIncome = ss;

        // Stage 2: Flow Type
        const taxes = cf.taxes;
        const totalInflow = earnedIncome + withdrawals + ssIncome;
        const netInflow = Math.max(0, totalInflow - taxes);

        // Stage 3: Expense Types
        const livingExp = cf.spending;
        const debtPMT = cf.debtPayments;
        const savingsDetails = cf.savingsDetails || { taxable: 0, roth: 0, preTax: 0, cash: 0 };
        const savings = savingsDetails.taxable + savingsDetails.roth + savingsDetails.preTax + savingsDetails.cash;

        // Destinations (for taxes)
        const fedTax = td.federal || 0;
        const stateTax = td.state || 0;
        const medicare = td.medicare || 0;

        const allNodes = [
            // Sources (0-6)
            { name: "Social Security", color: "#4ade80" }, // 0
            { name: "Salary / Other", color: "#bef264" },     // 1
            { name: "Taxable WD", color: "#8884d8" },      // 2
            { name: "Pre-Tax WD", color: "#f87171" },      // 3
            { name: "Roth WD", color: "#22d3ee" },         // 4
            { name: "Cash WD", color: "#94a3b8" },         // 5
            { name: "RMD", color: "#fbbf24" },             // 6

            // Stage 1: Income Type (7-9)
            { name: "Other Income", color: "#4ade80" },    // 7
            { name: "Earned Income", color: "#bef264" },   // 8
            { name: "Withdrawals", color: "#f472b6" },     // 9

            // Stage 2: Flow Type (10-11)
            { name: "Net Inflow", color: "#4ade80" },      // 10
            { name: "Tax Withholding", color: "#64748b" }, // 11

            // Stage 3: Expense Type (12-15)
            { name: "Living Expenses", color: "#3b82f6" }, // 12
            { name: "Debt Payments", color: "#f43f5e" },   // 13
            { name: "Savings", color: "#10b981" },         // 14
            { name: "Taxes Cost", color: "#64748b" },      // 15

            // Destinations (16-24)
            { name: "Lifestyle", color: "#3b82f6" },       // 16
            { name: "Loan Repayments", color: "#f43f5e" }, // 17
            { name: "Brokerage", color: "#10b981" },       // 18
            { name: "Roth Accounts", color: "#22d3ee" },   // 19
            { name: "Traditional/401k", color: "#f87171" },// 20
            { name: "Cash Savings", color: "#94a3b8" },    // 21
            { name: "Federal Tax", color: "#64748b" },     // 22
            { name: "State Tax", color: "#64748b" },       // 23
            { name: "Medicare Premiums", color: "#64748b" },// 24
        ];

        const rawLinks: any[] = [];

        // Sources -> Stage 1
        if (ssIncome > 0) rawLinks.push({ source: 0, target: 7, value: ssIncome });
        if (earnedIncome > 0) rawLinks.push({ source: 1, target: 8, value: earnedIncome });
        if (wTaxable > 0) rawLinks.push({ source: 2, target: 9, value: wTaxable });
        if (wPreTax > 0) rawLinks.push({ source: 3, target: 9, value: wPreTax });
        if (wRoth > 0) rawLinks.push({ source: 4, target: 9, value: wRoth });
        if (wCash > 0) rawLinks.push({ source: 5, target: 9, value: wCash });
        if (rmd > 0) rawLinks.push({ source: 6, target: 9, value: rmd });

        // Stage 1 -> Stage 2 (Tax vs Net)
        const items = [
            { id: 7, val: ssIncome },
            { id: 8, val: earnedIncome },
            { id: 9, val: withdrawals }
        ].filter(i => i.val > 0.01);

        const totalForTax = items.reduce((sum, i) => sum + i.val, 0);
        if (totalForTax > 0) {
            items.forEach(i => {
                const taxPart = (i.val / totalForTax) * taxes;
                const netPart = i.val - taxPart;
                if (netPart > 0.01) rawLinks.push({ source: i.id, target: 10, value: netPart });
                if (taxPart > 0.01) rawLinks.push({ source: i.id, target: 11, value: taxPart });
            });
        }

        // Stage 2 -> Stage 3
        if (netInflow > 0.01) {
            if (livingExp > 0) rawLinks.push({ source: 10, target: 12, value: Math.min(netInflow, livingExp) });
            const remaining = Math.max(0, netInflow - livingExp);
            if (debtPMT > 0 && remaining > 0) rawLinks.push({ source: 10, target: 13, value: Math.min(remaining, debtPMT) });
            const finalSaved = Math.max(0, netInflow - livingExp - debtPMT);
            if (finalSaved > 0) rawLinks.push({ source: 10, target: 14, value: finalSaved });
        }
        if (taxes > 0.01) rawLinks.push({ source: 11, target: 15, value: taxes });

        // Stage 3 -> Destinations
        if (livingExp > 0.01) rawLinks.push({ source: 12, target: 16, value: livingExp });
        if (debtPMT > 0.01) rawLinks.push({ source: 13, target: 17, value: debtPMT });

        if (savingsDetails.taxable > 0.01) rawLinks.push({ source: 14, target: 18, value: savingsDetails.taxable });
        if (savingsDetails.roth > 0.01) rawLinks.push({ source: 14, target: 19, value: savingsDetails.roth });
        if (savingsDetails.preTax > 0.01) rawLinks.push({ source: 14, target: 20, value: savingsDetails.preTax });
        if (savingsDetails.cash > 0.01) rawLinks.push({ source: 14, target: 21, value: savingsDetails.cash });

        if (fedTax > 0.01) rawLinks.push({ source: 15, target: 22, value: fedTax });
        if (stateTax > 0.01) rawLinks.push({ source: 15, target: 23, value: stateTax });
        if (medicare > 0.01) rawLinks.push({ source: 15, target: 24, value: medicare });

        // Filter out very small links and empty nodes
        const filteredLinks = rawLinks.filter(l => l.value > 0.01);
        const usedNodeIndices = new Set<number>();
        filteredLinks.forEach(l => {
            usedNodeIndices.add(l.source);
            usedNodeIndices.add(l.target);
        });

        const finalNodes: any[] = [];
        const indexMap = new Map<number, number>();
        allNodes.forEach((node, idx) => {
            if (usedNodeIndices.has(idx)) {
                indexMap.set(idx, finalNodes.length);
                finalNodes.push(node);
            }
        });

        const finalLinks = filteredLinks.map(l => ({
            ...l,
            source: indexMap.get(l.source),
            target: indexMap.get(l.target)
        }));

        return { nodes: finalNodes, links: finalLinks };
    }, [dataForAge]);

    const CustomNode = ({ x, y, width, height, index, payload }: any) => {
        // Simple logic for label placement: first 2 layers on the right, rest on the left or vice versa
        // Better: just check if x is in the right half of the chart area. 
        // We'll use a fixed threshold or just check if it's the last layer (x > 600)
        const isRightHalf = x > 400;

        return (
            <g>
                <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={payload.color || "#8884d8"}
                    stroke="#fff"
                    strokeWidth={1}
                    fillOpacity={0.8}
                />
                <text
                    x={isRightHalf ? x - 6 : x + width + 6}
                    y={y + height / 2 - 4}
                    textAnchor={isRightHalf ? "end" : "start"}
                    dominantBaseline="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill="currentColor"
                    className="fill-foreground font-mono"
                >
                    {payload.name}
                </text>
                <text
                    x={isRightHalf ? x - 6 : x + width + 6}
                    y={y + height / 2 + 8}
                    textAnchor={isRightHalf ? "end" : "start"}
                    dominantBaseline="middle"
                    fontSize="9"
                    fontWeight="medium"
                    fill="currentColor"
                    className="fill-primary/80 font-mono"
                >
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(payload.value)}
                </text>
            </g>
        );
    };

    return (
        <Card className="rounded-t-none border-primary/20 border-t-0 shadow-sm -mt-px">
            <CardHeader className="py-3">
                <div className="flex flex-col gap-4">
                    <div>
                        <CardTitle className="text-sm uppercase font-black tracking-tight">Annual Cash Flow Breakdown ({isReal ? 'Real' : 'Nominal'})</CardTitle>
                        <CardDescription className="text-xs">Visualize how money flows from sources to destinations at age {selectedAge}.</CardDescription>
                    </div>
                    <div className="space-y-2 bg-muted/40 p-4 rounded-xl border border-primary/10 shadow-inner">
                        <div className="flex justify-between items-center px-1">
                            <Label htmlFor="age-slider" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Adjust Age Projection</Label>
                            <span className="text-xl font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">{selectedAge}</span>
                        </div>
                        <input
                            id="age-slider"
                            type="range"
                            min={minAge}
                            max={maxAge}
                            value={selectedAge}
                            onChange={(e) => setSelectedAge(parseInt(e.target.value))}
                            className="w-full h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="h-[500px] pt-4">
                {sankeyData.links.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <Sankey
                            data={sankeyData}
                            node={<CustomNode />}
                            link={{ stroke: 'currentColor', strokeOpacity: 0.1 }}
                            margin={{ top: 10, left: 10, bottom: 10, right: 10 }}
                            nodePadding={20}
                            sort={false}
                        >
                            <Tooltip content={<SankeyTooltip />} />
                        </Sankey>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        No flow data for this age.
                    </div>
                )}
            </CardContent>
        </Card>
    );
});
SankeyChartSection.displayName = "SankeyChartSection";

const SankeyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const formatVal = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

        if (data.source && data.target) {
            return (
                <div className="bg-background border-2 border-primary/20 rounded-xl p-2 shadow-2xl z-50 text-[11px]">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-muted-foreground">{data.source.name}</span>
                        <span className="text-primary opacity-50">→</span>
                        <span className="font-bold text-muted-foreground">{data.target.name}</span>
                    </div>
                    <div className="font-black text-foreground font-mono">{formatVal(data.value)}</div>
                </div>
            );
        }

        return (
            <div className="bg-background border-2 border-primary/20 rounded-xl p-2 shadow-2xl z-50 text-[11px]">
                <div className="font-bold text-muted-foreground mb-1">{data.name}</div>
                <div className="font-black text-foreground font-mono">{formatVal(data.value)}</div>
            </div>
        );
    }
    return null;
};

const AssetsLiabilitySection = React.memo(({ transformedResults, isReal, ChartTooltip }: any) => {
    return (
        <Card className="col-span-1 rounded-t-none border-primary/20 border-t-0 shadow-sm -mt-px">
            <CardHeader className="py-3">
                <CardTitle className="text-sm uppercase font-black tracking-tight">Theoretical Assets & Liabilities ({isReal ? 'Real' : 'Nominal'})</CardTitle>
                <CardDescription className="text-xs">
                    Growth of assets by category vs liabilities.
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={transformedResults}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        stackOffset="sign"
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis tickFormatter={(val) => `$${val / 1000000}M`} />
                        <Tooltip wrapperStyle={{ zIndex: 100 }} content={<ChartTooltip />} />
                        <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeOpacity={0.8} />
                        <Bar dataKey="assets.roth" name="Roth" stackId="a" fill="#22d3ee" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="assets.brokerage" name="Brokerage" stackId="a" fill="#8884d8" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="assets.trad" name="Trad" stackId="a" fill="#f87171" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="assets.property" name="Property" stackId="a" fill="#fbbf24" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="assets.other" name="Other Assets" stackId="a" fill="#4ade80" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="assets.loans" name="Loans" stackId="a" fill="#64748b" radius={[0, 0, 2, 2]} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
});
AssetsLiabilitySection.displayName = "AssetsLiabilitySection";

const DetailedBreakdownSection = React.memo(({ transformedResults, isReal, formatCurrency, getValue }: any) => {
    const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`;

    return (
        <Card className="rounded-t-none border-primary/20 border-t-0 shadow-sm -mt-px">
            <CardHeader className="py-3">
                <CardTitle className="text-sm uppercase font-black tracking-tight">Annual Simulation Data</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="max-h-[600px] overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="sticky top-0 z-10 bg-muted shadow-sm">Year (Age)</TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted shadow-sm text-right">Roth-eq Net Worth {isReal ? '(Real)' : '(Nom)'}</TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted shadow-sm text-right">Pre-Tax</TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted shadow-sm text-right">Roth</TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted shadow-sm text-right">Taxable</TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted shadow-sm text-right">RMD</TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted shadow-sm text-right">SS (Add'l)</TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted shadow-sm text-right">Roth Conv</TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted shadow-sm text-right text-blue-600 dark:text-blue-400">Basis Reset</TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted shadow-sm text-right">Taxes (Rate)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transformedResults.map((row: any) => (
                                <TableRow key={row.year} className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-medium">{row.year} <span className="text-[10px] text-muted-foreground">({row.age})</span></TableCell>
                                    <TableCell className="text-right">
                                        <div className="font-bold text-primary">{formatCurrency(row.netWorth)}</div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div>{formatCurrency(row.portfolio.preTax)}</div>
                                        {row.cashFlow.withdrawals.preTax > 0 && <div className="text-[10px] text-red-500 font-bold">-{formatCurrency(row.cashFlow.withdrawals.preTax)}</div>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div>{formatCurrency(row.portfolio.roth)}</div>
                                        {row.cashFlow.withdrawals.roth > 0 && <div className="text-[10px] text-red-500 font-bold">-{formatCurrency(row.cashFlow.withdrawals.roth)}</div>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div>{formatCurrency(row.portfolio.taxable)}</div>
                                        <div className="text-[9px] text-muted-foreground uppercase font-black tracking-tight opacity-70">Basis: {formatCurrency(row.portfolio.taxableBasis)}</div>
                                        {row.cashFlow.withdrawals.taxable > 0 && <div className="text-[10px] text-red-500 font-bold">-{formatCurrency(row.cashFlow.withdrawals.taxable)}</div>}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(row.cashFlow.rmd)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="font-medium text-green-600 dark:text-green-400">{formatCurrency(row.cashFlow.income.ss)}</div>
                                        {row.cashFlow.income.other > 0 && <div className="text-[10px] text-green-600 font-bold">(+{formatCurrency(row.cashFlow.income.other)})</div>}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">
                                        {row.cashFlow.rothConversion > 0 ? formatCurrency(row.cashFlow.rothConversion) : <span className="opacity-20">—</span>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {row.cashFlow.taxGainHarvesting > 0 ? (
                                            <div className="text-blue-600 dark:text-blue-400 font-black">
                                                +{formatCurrency(row.cashFlow.taxGainHarvesting)}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground opacity-20">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="font-bold">{formatCurrency(row.cashFlow.taxes)}</div>
                                        <div className="text-[9px] text-muted-foreground flex flex-col items-end opacity-80 leading-tight">
                                            <div>Fed: {formatCurrency(row.cashFlow.taxDetails.federal)}</div>
                                            <div>State: {formatCurrency(row.cashFlow.taxDetails.state)}</div>
                                            {row.cashFlow.taxDetails.medicare > 0 && <div className="text-blue-500 font-bold">Med: {formatCurrency(row.cashFlow.taxDetails.medicare)}</div>}
                                            <div className="font-black mt-0.5 opacity-100">Rate: {formatPercent(row.taxDetails.marginalRate)}</div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
});
DetailedBreakdownSection.displayName = "DetailedBreakdownSection";
