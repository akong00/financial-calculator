'use client'

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AnnualResult } from "@/lib/engine/simulation"
import {
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    CartesianGrid,
    LineChart,
    Line,
    BarChart,
    Bar,
    Legend,
    ReferenceLine,
} from "recharts"

interface SampleSimulation {
    percentile: number;
    results: AnnualResult[];
    marketPath: { stockReturn: number, bondReturn: number, cashReturn: number, inflation: number, propertyReturn: number }[];
}

interface PercentileExplorerProps {
    sampleSimulations: SampleSimulation[];
    isReal: boolean;
}

export function PercentileExplorer({ sampleSimulations, isReal }: PercentileExplorerProps) {
    const [selectedPercentile, setSelectedPercentile] = React.useState(50);

    // Find the closest available sample simulation to the selected percentile
    const selectedSample = React.useMemo(() => {
        if (!sampleSimulations || sampleSimulations.length === 0) return null;

        // Find the closest percentile
        let closest = sampleSimulations[0];
        let minDiff = Math.abs(sampleSimulations[0].percentile - selectedPercentile);

        for (const sample of sampleSimulations) {
            const diff = Math.abs(sample.percentile - selectedPercentile);
            if (diff < minDiff) {
                minDiff = diff;
                closest = sample;
            }
        }
        return closest;
    }, [sampleSimulations, selectedPercentile]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    };

    const getValue = (val: number, inflationFactor: number = 1.0) => {
        return isReal ? val / (inflationFactor || 1) : val;
    };

    // Transform results for display
    const transformedResults = React.useMemo(() => {
        if (!selectedSample) return [];
        return selectedSample.results.map((r) => {
            const inf = r.inflationAdjustmentFactor;
            return {
                year: r.year,
                age: r.age,
                netWorth: getValue(r.netWorth, inf),
                assets: {
                    roth: getValue(r.portfolio.roth, inf),
                    brokerage: getValue(r.portfolio.taxable, inf),
                    trad: getValue(r.portfolio.preTax, inf),
                    property: getValue(r.portfolio.property, inf),
                    other: getValue(r.portfolio.cash, inf),
                    loans: -getValue(r.totalDebt, inf)
                },
                cashFlow: {
                    ss: getValue(r.cashFlow.income.ss, inf),
                    other: getValue(r.cashFlow.income.other, inf),
                    rmd: getValue(r.cashFlow.rmd, inf),
                    taxableWithdrawal: getValue(r.cashFlow.withdrawals.taxable, inf),
                    preTaxWithdrawal: getValue(r.cashFlow.withdrawals.preTax, inf),
                    rothWithdrawal: getValue(r.cashFlow.withdrawals.roth, inf),
                    taxes: getValue(r.cashFlow.taxes, inf),
                    rothConversion: getValue(r.cashFlow.rothConversion, inf),
                },
                inflationAdjustmentFactor: inf
            };
        });
    }, [selectedSample, isReal]);

    // Transform market path for stock growth chart
    const marketIndexData = React.useMemo(() => {
        if (!selectedSample) return [];
        let cumulative = 1.0;
        let infAccumulator = 1.0;
        const data = [{ year: 0, index: 1.0 }];

        selectedSample.marketPath.forEach((m, i) => {
            cumulative *= (1 + m.stockReturn);
            infAccumulator *= (1 + m.inflation);
            data.push({
                year: i + 1,
                index: isReal ? cumulative / infAccumulator : cumulative
            });
        });
        return data;
    }, [selectedSample, isReal]);

    // Custom tooltip
    const ChartTooltip = ({ active, payload, label, titleFormatter = (val: any) => `Year ${val}` }: any) => {
        if (active && payload && payload.length) {
            const items = [...payload].filter(p => p.name && !p.name.includes('range'));
            return (
                <div className="bg-background opacity-100 border-2 border-primary/20 rounded-xl p-3 shadow-2xl z-50">
                    <p className="font-black text-xs mb-2 text-foreground uppercase tracking-widest border-b border-primary/10 pb-1.5 leading-none">
                        {titleFormatter(label)}
                    </p>
                    <div className="space-y-2">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-6 text-[11px]">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: item.color }} />
                                    <span className="text-muted-foreground font-bold whitespace-nowrap">
                                        {item.name}:
                                    </span>
                                </div>
                                <span className="font-black text-foreground font-mono">
                                    {typeof item.value === 'number'
                                        ? (item.name === 'index' ? `${item.value.toFixed(2)}x` : formatCurrency(item.value))
                                        : item.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    if (!selectedSample) {
        return (
            <Card className="w-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                    No simulation data available
                </CardContent>
            </Card>
        );
    }

    const availablePercentiles = sampleSimulations.map(s => s.percentile);
    const lastResult = transformedResults[transformedResults.length - 1];
    const endingNetWorth = lastResult?.netWorth || 0;
    const failed = endingNetWorth <= 0;

    return (
        <div className="space-y-4">
            {/* Percentile Selector */}
            <Card className="bg-gradient-to-r from-indigo-500/5 to-purple-500/10 border-indigo-500/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <span className="p-1.5 bg-indigo-500/10 rounded-lg">🔍</span>
                        Percentile Simulation Explorer
                    </CardTitle>
                    <CardDescription>
                        Explore individual simulation outcomes at different percentile levels
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <Label className="font-bold min-w-fit">Select Percentile:</Label>
                            <Input
                                type="number"
                                value={selectedPercentile}
                                onChange={(e) => setSelectedPercentile(Math.max(1, Math.min(99, parseInt(e.target.value) || 50)))}
                                min={1}
                                max={99}
                                className="w-20 text-center font-mono font-bold"
                            />
                            <span className="font-mono font-bold text-lg min-w-[3rem] text-right">{selectedPercentile}%</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {availablePercentiles.map(p => (
                                <Button
                                    key={p}
                                    variant={selectedSample.percentile === p ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedPercentile(p)}
                                    className={selectedSample.percentile === p ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                                >
                                    {p}%
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                        <div className="p-3 bg-background/50 rounded-lg border">
                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Showing</div>
                            <div className="text-lg font-black text-indigo-600">{selectedSample.percentile}th Percentile</div>
                        </div>
                        <div className="p-3 bg-background/50 rounded-lg border">
                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Ending Net Worth</div>
                            <div className={`text-lg font-black ${failed ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(endingNetWorth)}
                            </div>
                        </div>
                        <div className="p-3 bg-background/50 rounded-lg border">
                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Final Age</div>
                            <div className="text-lg font-black">{lastResult?.age}</div>
                        </div>
                        <div className="p-3 bg-background/50 rounded-lg border">
                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Outcome</div>
                            <div className={`text-lg font-black ${failed ? 'text-red-600' : 'text-green-600'}`}>
                                {failed ? '❌ Failed' : '✅ Success'}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stock/Market Growth Chart */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm uppercase font-black tracking-tight">Stock Market Growth ({isReal ? 'Real' : 'Nominal'})</CardTitle>
                    <CardDescription className="text-xs">Cumulative market index growth for this simulation</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={marketIndexData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" tickFormatter={(val) => `Yr ${val}`} />
                            <YAxis tickFormatter={(value) => `${value.toFixed(1)}x`} />
                            <Tooltip wrapperStyle={{ zIndex: 100 }} content={<ChartTooltip titleFormatter={(l: any) => `Year ${l}`} />} />
                            <Line dataKey="index" name="Stock Index" stroke="#6366f1" strokeWidth={2} dot={false} />
                            <ReferenceLine y={1} stroke="#888" strokeDasharray="5 5" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Cash Flow Chart */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm uppercase font-black tracking-tight">Annual Cash Flow ({isReal ? 'Real' : 'Nominal'})</CardTitle>
                    <CardDescription className="text-xs">Sources of income and tax costs for this simulation</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={transformedResults} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis tickFormatter={(val) => `$${val / 1000}k`} />
                            <Tooltip wrapperStyle={{ zIndex: 100 }} content={<ChartTooltip />} />
                            {transformedResults.some(r => r.cashFlow.ss > 0) && <Bar dataKey="cashFlow.ss" name="Social Security" stackId="a" fill="#4ade80" />}
                            {transformedResults.some(r => r.cashFlow.other > 0) && <Bar dataKey="cashFlow.other" name="Additional Income" stackId="a" fill="#bef264" />}
                            {transformedResults.some(r => r.cashFlow.rmd > 0) && <Bar dataKey="cashFlow.rmd" name="RMD" stackId="a" fill="#fbbf24" />}
                            {transformedResults.some(r => r.cashFlow.taxableWithdrawal > 0) && <Bar dataKey="cashFlow.taxableWithdrawal" name="Taxable Withdrawal" stackId="a" fill="#8884d8" />}
                            {transformedResults.some(r => r.cashFlow.preTaxWithdrawal > 0) && <Bar dataKey="cashFlow.preTaxWithdrawal" name="Pre-Tax Withdrawal" stackId="a" fill="#f87171" />}
                            {transformedResults.some(r => r.cashFlow.rothWithdrawal > 0) && <Bar dataKey="cashFlow.rothWithdrawal" name="Roth Withdrawal" stackId="a" fill="#22d3ee" />}
                            {transformedResults.some(r => r.cashFlow.rothConversion > 0) && <Bar dataKey="cashFlow.rothConversion" name="Roth Conversion" stackId="a" fill="#a78bfa" />}
                            <Bar dataKey="cashFlow.taxes" name="Taxes Paid" stackId="a" fill="#64748b" />
                            <Legend />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Asset Breakdown Chart */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm uppercase font-black tracking-tight">Assets & Liabilities Over Time ({isReal ? 'Real' : 'Nominal'})</CardTitle>
                    <CardDescription className="text-xs">Growth of assets by category for this simulation</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={transformedResults} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} stackOffset="sign">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis tickFormatter={(val) => `$${val / 1000000}M`} />
                            <Tooltip wrapperStyle={{ zIndex: 100 }} content={<ChartTooltip />} />
                            <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeOpacity={0.8} />
                            <Bar dataKey="assets.roth" name="Roth" stackId="a" fill="#22d3ee" />
                            <Bar dataKey="assets.brokerage" name="Brokerage" stackId="a" fill="#8884d8" />
                            <Bar dataKey="assets.trad" name="Trad" stackId="a" fill="#f87171" />
                            <Bar dataKey="assets.property" name="Property" stackId="a" fill="#fbbf24" />
                            <Bar dataKey="assets.other" name="Other Assets" stackId="a" fill="#4ade80" />
                            <Bar dataKey="assets.loans" name="Loans" stackId="a" fill="#64748b" />
                            <Legend />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
