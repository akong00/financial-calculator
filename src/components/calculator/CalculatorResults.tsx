
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

interface CalculatorResultsProps {
    singleRunResults: AnnualResult[];
    monteCarloResults?: MonteCarloResult;
    historicalResults?: HistoricalAggregateResult;
    strategyComparison?: RothStrategyResult[];
    isSimulating?: boolean;
    preTaxDiscount?: number;
}

export function CalculatorResults({
    singleRunResults,
    monteCarloResults,
    historicalResults,
    strategyComparison,
    isSimulating,
    preTaxDiscount = 0
}: CalculatorResultsProps) {
    const [isReal, setIsReal] = React.useState(true);
    const [openSections, setOpenSections] = React.useState<string[]>([]);

    const toggleSections = (section: string) => {
        setOpenSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    const getValue = (val: number, inflationFactor: number = 1.0) => {
        return isReal ? val / (inflationFactor || 1) : val;
    }

    const transformedResults = React.useMemo(() => {
        if (!singleRunResults) return [];
        return singleRunResults.map(r => {
            const inf = r.inflationAdjustmentFactor;
            return {
                ...r,
                netWorth: getValue(r.netWorth, inf),
                portfolio: {
                    ...r.portfolio,
                    taxable: getValue(r.portfolio.taxable, inf),
                    preTax: getValue(r.portfolio.preTax, inf),
                    roth: getValue(r.portfolio.roth, inf),
                    cash: getValue(r.portfolio.cash, inf),
                },
                cashFlow: {
                    ...r.cashFlow,
                    ss: getValue(r.cashFlow.ss, inf),
                    additionalIncome: getValue(r.cashFlow.additionalIncome, inf),
                    rmd: getValue(r.cashFlow.rmd, inf),
                    taxes: getValue(r.cashFlow.taxes, inf),
                    withdrawalBreakdown: {
                        ...r.cashFlow.withdrawalBreakdown,
                        taxable: getValue(r.cashFlow.withdrawalBreakdown.taxable, inf),
                        preTax: getValue(r.cashFlow.withdrawalBreakdown.preTax, inf),
                        roth: getValue(r.cashFlow.withdrawalBreakdown.roth, inf),
                        cash: getValue(r.cashFlow.withdrawalBreakdown.cash, inf),
                    }
                }
            };
        });
    }, [singleRunResults, isReal]);

    const transformedMC = React.useMemo(() => {
        if (!monteCarloResults) return undefined;

        const transformMarketPath = (path: { val: number, inflationFactor: number }[]) => path.map((pt, i) => ({
            year: i,
            val: getValue(pt.val, pt.inflationFactor)
        }));

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
            marketPaths: {
                p50: transformMarketPath(monteCarloResults.marketPaths.p50),
                p20: transformMarketPath(monteCarloResults.marketPaths.p20),
                p5: transformMarketPath(monteCarloResults.marketPaths.p5)
            }
        };
    }, [monteCarloResults, isReal]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    }

    const formatPercent = (val: number) => {
        return `${(val * 100).toFixed(1)}%`;
    }

    // Unified Theme-Consistent Tooltip
    const ChartTooltip = ({ active, payload, label, titleFormatter = (val: any) => `Year ${val}`, itemSorter }: any) => {
        if (active && payload && payload.length) {
            let items = [...payload].filter(p => p.name && !p.name.includes('range'));
            if (typeof itemSorter === 'function') {
                items = items.sort(itemSorter);
            }

            const dataPoint = payload[0].payload;
            const strategyName = dataPoint?.strategyName;

            return (
                <div className="bg-background border-2 border-primary/20 rounded-xl p-3 shadow-2xl backdrop-blur-md">
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
                        {/* Special case for Roth Strategy Comparison */}
                        {dataPoint?.medianNetWorth !== undefined && (
                            <div className="flex items-center justify-between gap-6 text-[11px] pt-1 mt-1 border-t border-primary/10">
                                <span className="text-muted-foreground font-bold">Median Net Worth:</span>
                                <span className="font-black text-foreground font-mono">
                                    {formatCurrency(getValue(dataPoint.medianNetWorth, 1))}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Ending Roth-eq Net Worth ({isReal ? 'Real' : 'Nominal'})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="min-w-fit">
                            <div className="text-xl sm:text-2xl font-bold text-primary">
                                {monteCarloResults ? formatCurrency(getValue(monteCarloResults.medianEndingWealth, isReal ? 1 : 0)) : '--'}
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
                        <CardTitle className="text-sm font-medium">Total Taxes Paid ({isReal ? 'Real' : 'Nominal'})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(singleRunResults.reduce((acc, curr) => acc + getValue(curr.cashFlow.taxes, curr.inflationAdjustmentFactor), 0))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Cumulative Lifetime Tax
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Market Scenarios */}
            {transformedMC && transformedMC.marketPaths && (
                <div className="px-1">
                    <Accordion className="border-none">
                        <AccordionItem className="border-none">
                            <AccordionTrigger
                                isOpen={openSections.includes('mc_samples')}
                                onToggle={() => toggleSections('mc_samples')}
                                className="flex items-center py-2 px-4 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-primary bg-muted/30 rounded-lg border shadow-sm transition-colors"
                            >
                                <span>Monte Carlo Stock Simulation Samples (Index Growth)</span>
                            </AccordionTrigger>
                            <AccordionContent isOpen={openSections.includes('mc_samples')}>
                                <Card className="mt-2 border-primary/10">
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-sm uppercase font-black tracking-tight">Monte Carlo Stock Simulation Samples ({isReal ? 'Real' : 'Nominal'})</CardTitle>
                                        <CardDescription className="text-xs">Visualizing cumulative index growth over the simulation period.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[300px] pb-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis
                                                    dataKey="year"
                                                    type="number"
                                                    allowDuplicatedCategory={false}
                                                    domain={[0, (transformedMC.marketPaths.p50.length - 1)]}
                                                    tickFormatter={(val) => `Yr ${val}`}
                                                />
                                                <YAxis tickFormatter={(value) => `${value.toFixed(1)}x`} />
                                                <Tooltip content={<ChartTooltip titleFormatter={(l: any) => `Simulation Sample: Year ${l}`} />} />
                                                <Line data={transformedMC.marketPaths.p50} dataKey="val" name="Median (50%)" stroke="#8884d8" dot={false} strokeWidth={2} />
                                                <Line data={transformedMC.marketPaths.p20} dataKey="val" name="Conservative (20%)" stroke="#ffc658" dot={false} strokeWidth={2} />
                                                <Line data={transformedMC.marketPaths.p5} dataKey="val" name="Worst (5%)" stroke="#ff0000" dot={false} strokeWidth={2} />
                                                <Legend formatter={(value) => value.replace(/^\d\. /, '')} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            )}

            {/* Monte Carlo Chart */}
            {transformedMC && (
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Monte Carlo Projections (Roth-eq Net Worth - {isReal ? 'Real' : 'Nominal'})</CardTitle>
                        <CardDescription>Range of outcomes ({isReal ? 'Inflation Adjusted' : 'Nominal Dollars'}) - {MC_ITERATIONS} simulations</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[450px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={transformedMC.unifiedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" type="number" domain={['dataMin', 'dataMax']} />
                                <YAxis tickFormatter={(value) => `$${value / 1000000}M`} />
                                <Tooltip
                                    content={
                                        <ChartTooltip
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

                                {/* Areas - Shaded background regions */}
                                <Area type="monotone" dataKey="range75_95" stroke="none" fill="#4ade80" fillOpacity={0.3} tooltipType="none" name="range_95" />
                                <Area type="monotone" dataKey="range25_75" stroke="none" fill="#22c55e" fillOpacity={0.25} tooltipType="none" name="range_75" />
                                <Area type="monotone" dataKey="range5_25" stroke="none" fill="#ef4444" fillOpacity={0.15} tooltipType="none" name="range_25" />

                                {/* Trend Lines - Descending order 95 to 5 */}
                                <Line dataKey="p95" stroke="#4ade80" strokeDasharray="5 5" dot={false} strokeOpacity={0.9} name="95%" />
                                <Line dataKey="p75" stroke="#22c55e" strokeDasharray="3 3" dot={false} strokeOpacity={0.9} name="75%" />
                                <Line dataKey="p50" stroke="#6366f1" strokeWidth={3} dot={false} name="Median (50%)" />
                                <Line dataKey="p25" stroke="#22c55e" strokeDasharray="3 3" dot={false} strokeOpacity={0.9} name="25%" />
                                <Line dataKey="p5" stroke="#ef4444" strokeDasharray="5 5" dot={false} strokeOpacity={0.9} name="5%" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Historical Simulation Analysis */}
            {historicalResults && (
                <div className="px-1">
                    <Accordion className="border-none">
                        <AccordionItem className="border-none">
                            <AccordionTrigger
                                isOpen={openSections.includes('historical')}
                                onToggle={() => toggleSections('historical')}
                                className="flex items-center py-2 px-4 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-primary bg-muted/30 rounded-lg border shadow-sm transition-colors"
                            >
                                <span>Historical Sequence Analysis (1928-2025)</span>
                                <div className="ml-auto flex gap-1 text-xs mr-4">
                                    <span className="text-muted-foreground">Success Rate:</span>
                                    <span className={`font-bold ${historicalResults.successRate > 0.9 ? 'text-green-500' : 'text-red-500'}`}>{(historicalResults.successRate * 100).toFixed(1)}%</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent isOpen={openSections.includes('historical')}>
                                <Card className="mt-2 border-primary/10">
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-sm uppercase font-black tracking-tight">Historical Failures & Worst Cases</CardTitle>
                                        <CardDescription className="text-xs">
                                            Based on actual market history. {historicalResults.results.length} total contiguous sequences simulated.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-0">
                                        {/* Failure List */}
                                        {historicalResults.results.filter(r => !r.success).length > 0 ? (
                                            <div>
                                                <h4 className="text-xs font-bold mb-2 pt-2">Failed Sequences (Money ran out)</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                    {historicalResults.results.filter(r => !r.success).map(r => (
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
                            </AccordionContent>
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
                                    className="flex items-center py-2 px-4 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-primary bg-muted/30 rounded-lg border shadow-sm transition-colors"
                                >
                                    <span>Roth Strategy Comparison</span>
                                    <div className="ml-auto flex items-center gap-1 text-xs mr-4">
                                        <span className="text-muted-foreground">Best:</span>
                                        <span className="font-bold text-green-500">{best.strategyName}</span>
                                        <span className="text-muted-foreground">({(best.successRate * 100).toFixed(1)}%)</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent isOpen={openSections.includes('roth_compare')}>
                                    <Card className="mt-2 border-primary/10">
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
                                                        <Tooltip content={<ChartTooltip titleFormatter={() => 'Strategy Comparison'} />} />
                                                        <Bar dataKey="successRate" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                                            {strategyComparison.map((entry, index) => (
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
                                                    <strong>Note on 0% Tax Conv & Harvesting:</strong> This strategy stays entirely within the 0% federal tax zone. It fills the Standard Deduction with Roth conversions first, then uses any remaining 0% LTCG bracket for "Basis Resets" (tax-gain harvesting). It limits conversions to ensure they do not push gains into the 15% bracket.
                                                </p>
                                                <p>
                                                    <strong>Note on Fill Standard Deduction:</strong> This strategy focuses on converting the maximum amount possible at 0% ordinary income tax (filling the Standard Deduction). It does <strong>not</strong> restrict conversions based on LTCG, meaning it may push some realized gains into the 15% LTCG tax bracket if the total income exceeds the 0% threshold.
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                );
            })()}

            {/* Cash Flow Chart */}
            <Card className="col-span-1">
                <CardHeader>
                    <CardTitle>Theoretical Annual Cash Flow</CardTitle>
                    <CardDescription>
                        Sources of income and tax costs ({isReal ? 'Real' : 'Nominal'}).
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
                            <Tooltip content={<ChartTooltip />} />
                            {transformedResults.some(r => r.cashFlow.ss > 0) && <Bar dataKey="cashFlow.ss" name="Social Security" stackId="a" fill="#4ade80" />}
                            {transformedResults.some(r => r.cashFlow.additionalIncome > 0) && <Bar dataKey="cashFlow.additionalIncome" name="Additional Income" stackId="a" fill="#bef264" />}
                            {transformedResults.some(r => r.cashFlow.rmd > 0) && <Bar dataKey="cashFlow.rmd" name="RMD" stackId="a" fill="#fbbf24" />}
                            {transformedResults.some(r => r.cashFlow.withdrawalBreakdown.taxable > 0) && <Bar dataKey="cashFlow.withdrawalBreakdown.taxable" name="Taxable Withdrawal" stackId="a" fill="#8884d8" />}
                            {transformedResults.some(r => r.cashFlow.withdrawalBreakdown.preTax > 0) && <Bar dataKey="cashFlow.withdrawalBreakdown.preTax" name="Pre-Tax Withdrawal" stackId="a" fill="#f87171" />}
                            {transformedResults.some(r => r.cashFlow.withdrawalBreakdown.roth > 0) && <Bar dataKey="cashFlow.withdrawalBreakdown.roth" name="Roth Withdrawal" stackId="a" fill="#22d3ee" />}
                            <Bar dataKey="cashFlow.taxes" name="Taxes Paid" stackId="a" fill="#64748b" />
                            <Legend />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Detailed Table */}
            <div className="px-1">
                <Accordion className="border-none">
                    <AccordionItem className="border-none">
                        <AccordionTrigger
                            isOpen={openSections.includes('detailed_table')}
                            onToggle={() => toggleSections('detailed_table')}
                            className="flex items-center py-2 px-4 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-primary bg-muted/30 rounded-lg border shadow-sm transition-colors"
                        >
                            <span>Theoretical Year-by-Year Detailed Breakdown</span>
                        </AccordionTrigger>
                        <AccordionContent isOpen={openSections.includes('detailed_table')}>
                            <Card className="mt-2 border-primary/10">
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
                                                {singleRunResults.map((row) => (
                                                    <TableRow key={row.year} className="hover:bg-muted/30 transition-colors">
                                                        <TableCell className="font-medium">{row.year} <span className="text-[10px] text-muted-foreground">({row.age})</span></TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="font-bold text-primary">{formatCurrency(getValue(row.netWorth, row.inflationAdjustmentFactor))}</div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div>{formatCurrency(getValue(row.portfolio.preTax, row.inflationAdjustmentFactor))}</div>
                                                            {row.cashFlow.withdrawalBreakdown.preTax > 0 && <div className="text-[10px] text-red-500 font-bold">-{formatCurrency(getValue(row.cashFlow.withdrawalBreakdown.preTax, row.inflationAdjustmentFactor))}</div>}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div>{formatCurrency(getValue(row.portfolio.roth, row.inflationAdjustmentFactor))}</div>
                                                            {row.cashFlow.withdrawalBreakdown.roth > 0 && <div className="text-[10px] text-red-500 font-bold">-{formatCurrency(getValue(row.cashFlow.withdrawalBreakdown.roth, row.inflationAdjustmentFactor))}</div>}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div>{formatCurrency(getValue(row.portfolio.taxable, row.inflationAdjustmentFactor))}</div>
                                                            <div className="text-[9px] text-muted-foreground uppercase font-black tracking-tight opacity-70">Basis: {formatCurrency(getValue(row.taxableBasis, row.inflationAdjustmentFactor))}</div>
                                                            {row.cashFlow.withdrawalBreakdown.taxable > 0 && <div className="text-[10px] text-red-500 font-bold">-{formatCurrency(getValue(row.cashFlow.withdrawalBreakdown.taxable, row.inflationAdjustmentFactor))}</div>}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">{formatCurrency(getValue(row.cashFlow.rmd, row.inflationAdjustmentFactor))}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="font-medium text-green-600 dark:text-green-400">{formatCurrency(getValue(row.cashFlow.ss, row.inflationAdjustmentFactor))}</div>
                                                            {row.cashFlow.additionalIncome > 0 && <div className="text-[10px] text-green-600 font-bold">(+{formatCurrency(getValue(row.cashFlow.additionalIncome, row.inflationAdjustmentFactor))})</div>}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">
                                                            {row.cashFlow.rothConversion > 0 ? formatCurrency(getValue(row.cashFlow.rothConversion, row.inflationAdjustmentFactor)) : <span className="opacity-20">—</span>}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {row.cashFlow.taxGainHarvesting > 0 ? (
                                                                <div className="text-blue-600 dark:text-blue-400 font-black">
                                                                    +{formatCurrency(getValue(row.cashFlow.taxGainHarvesting, row.inflationAdjustmentFactor))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground opacity-20">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="font-bold">{formatCurrency(getValue(row.cashFlow.taxes, row.inflationAdjustmentFactor))}</div>
                                                            <div className="text-[10px] text-muted-foreground font-black">({formatPercent(row.taxDetails.marginalRate)})</div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </div>
    )
}

