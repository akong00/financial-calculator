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
    className?: string;
}

export function PercentileExplorer({ sampleSimulations, isReal, className = "" }: PercentileExplorerProps) {
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
        const startYear = selectedSample.results[0]?.year || 0;
        const startAge = selectedSample.results[0]?.age || 0;
        const data = [{ year: startYear, age: startAge, index: 1.0 }];

        selectedSample.marketPath.forEach((m, i) => {
            cumulative *= (1 + m.stockReturn);
            infAccumulator *= (1 + m.inflation);
            data.push({
                year: startYear + i + 1,
                age: startAge + i + 1,
                index: isReal ? cumulative / infAccumulator : cumulative
            });
        });
        return data;
    }, [selectedSample, isReal]);

    // Calculate common domain for X-axis to ensure alignment
    const xDomain = React.useMemo(() => {
        if (!selectedSample) return [0, 100];
        const startAge = Math.min(
            marketIndexData[0]?.age || 0,
            transformedResults[0]?.age || 0
        );
        const endAge = Math.max(
            marketIndexData[marketIndexData.length - 1]?.age || 100,
            transformedResults[transformedResults.length - 1]?.age || 100
        );
        return [startAge, endAge];
    }, [selectedSample, marketIndexData, transformedResults]);

    const ChartTooltip = ({ active, payload, label, titleFormatter = (val: any) => `Age ${val}` }: any) => {
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
                                        ? (item.name === 'Stock Index' ? `${item.value.toFixed(2)}x` : formatCurrency(item.value))
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
        <Card className={`w-full bg-gradient-to-br from-background to-muted/20 ${className}`}>
            <CardHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <span className="p-1.5 bg-indigo-500/10 text-indigo-600 rounded-lg">🔍</span>
                            Percentile Simulation Explorer
                        </CardTitle>
                        <CardDescription>
                            Detailed analysis of the {selectedSample.percentile}th percentile outcome
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
                {/* Controls & Summary */}
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap mr-2">Select Percentile:</span>
                            <div className="flex gap-1">
                                {availablePercentiles.map(p => {
                                    const sample = sampleSimulations.find(s => s.percentile === p);
                                    const isSuccess = (sample?.results[sample.results.length - 1]?.netWorth || 0) > 0;
                                    const isSelected = selectedSample.percentile === p;

                                    let variantClass = "";
                                    if (isSelected) {
                                        variantClass = isSuccess
                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                                            : "bg-red-600 hover:bg-red-700 text-white border-red-600";
                                    } else {
                                        variantClass = isSuccess
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800"
                                            : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800";
                                    }

                                    return (
                                        <Button
                                            key={p}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedPercentile(p)}
                                            className={`min-w-[40px] h-8 transition-colors ${variantClass}`}
                                        >
                                            {p}%
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-muted/40 rounded-xl border border-border/50">
                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Scenario</div>
                            <div className="text-2xl font-black text-indigo-600 tracking-tight">{selectedSample.percentile}th <span className="text-base font-normal text-muted-foreground">percentile</span></div>
                        </div>
                        <div className="p-4 bg-muted/40 rounded-xl border border-border/50">
                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Ending Net Worth</div>
                            <div className={`text-2xl font-black tracking-tight ${failed ? 'text-red-500' : 'text-emerald-600'}`}>
                                {formatCurrency(endingNetWorth)}
                            </div>
                        </div>
                        <div className="p-4 bg-muted/40 rounded-xl border border-border/50">
                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Final Age</div>
                            <div className="text-2xl font-black text-foreground tracking-tight">{lastResult?.age}</div>
                        </div>
                        <div className="p-4 bg-muted/40 rounded-xl border border-border/50">
                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Outcome</div>
                            <div className={`text-2xl font-black tracking-tight ${failed ? 'text-red-500' : 'text-emerald-600'}`}>
                                {failed ? 'Failed' : 'Success'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Stock/Market Growth Chart */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-4 w-1 bg-indigo-500 rounded-full" />
                            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Market Growth ({isReal ? 'Real' : 'Nominal'})</h3>
                        </div>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={marketIndexData}
                                    syncId="percentileExplorer"
                                    margin={{ top: 5, right: 30, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                    <XAxis
                                        dataKey="age"
                                        type="number"
                                        domain={xDomain}
                                        padding={{ left: 10, right: 10 }}
                                        allowDataOverflow
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                                        tickCount={Math.min(10, xDomain[1] - xDomain[0])}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                                        tickFormatter={(value) => `${value.toFixed(1)}x`}
                                        width={45}
                                    />
                                    <Tooltip
                                        cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        content={<ChartTooltip titleFormatter={(l: any) => `Age ${l}`} />}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="index"
                                        name="Stock Index"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4, strokeWidth: 0 }}
                                    />
                                    <ReferenceLine y={1} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.5} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Cash Flow Chart */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-4 w-1 bg-emerald-500 rounded-full" />
                            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Cash Flow ({isReal ? 'Real' : 'Nominal'})</h3>
                        </div>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={transformedResults}
                                    syncId="percentileExplorer"
                                    margin={{ top: 5, right: 30, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                    <XAxis
                                        dataKey="age"
                                        type="number"
                                        domain={xDomain}
                                        padding={{ left: 10, right: 10 }}
                                        allowDataOverflow
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                                        tickCount={Math.min(10, xDomain[1] - xDomain[0])}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                                        tickFormatter={(val) => `$${val / 1000}k`}
                                        width={45}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                                        content={<ChartTooltip />}
                                    />
                                    {transformedResults.some(r => r.cashFlow.ss > 0) && <Bar dataKey="cashFlow.ss" name="Social Security" stackId="a" fill="#4ade80" radius={[0, 0, 0, 0]} />}
                                    {transformedResults.some(r => r.cashFlow.other > 0) && <Bar dataKey="cashFlow.other" name="Additional Income" stackId="a" fill="#bef264" radius={[0, 0, 0, 0]} />}
                                    {transformedResults.some(r => r.cashFlow.rmd > 0) && <Bar dataKey="cashFlow.rmd" name="RMD" stackId="a" fill="#fbbf24" radius={[0, 0, 0, 0]} />}
                                    {transformedResults.some(r => r.cashFlow.taxableWithdrawal > 0) && <Bar dataKey="cashFlow.taxableWithdrawal" name="Taxable Withdrawal" stackId="a" fill="#8884d8" radius={[0, 0, 0, 0]} />}
                                    {transformedResults.some(r => r.cashFlow.preTaxWithdrawal > 0) && <Bar dataKey="cashFlow.preTaxWithdrawal" name="Pre-Tax Withdrawal" stackId="a" fill="#f87171" radius={[0, 0, 0, 0]} />}
                                    {transformedResults.some(r => r.cashFlow.rothWithdrawal > 0) && <Bar dataKey="cashFlow.rothWithdrawal" name="Roth Withdrawal" stackId="a" fill="#22d3ee" radius={[0, 0, 0, 0]} />}
                                    {transformedResults.some(r => r.cashFlow.rothConversion > 0) && <Bar dataKey="cashFlow.rothConversion" name="Roth Conversion" stackId="a" fill="#a78bfa" radius={[0, 0, 0, 0]} />}
                                    <Bar dataKey="cashFlow.taxes" name="Taxes Paid" stackId="a" fill="#64748b" radius={[2, 2, 0, 0]} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Asset Breakdown Chart */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-4 w-1 bg-cyan-500 rounded-full" />
                            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Net Worth ({isReal ? 'Real' : 'Nominal'})</h3>
                        </div>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={transformedResults}
                                    stackOffset="sign"
                                    syncId="percentileExplorer"
                                    margin={{ top: 5, right: 30, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                    <XAxis
                                        dataKey="age"
                                        type="number"
                                        domain={xDomain}
                                        padding={{ left: 10, right: 10 }}
                                        allowDataOverflow
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                                        tickCount={Math.min(10, xDomain[1] - xDomain[0])}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                                        tickFormatter={(val) => `$${val / 1000000}M`}
                                        width={45}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                                        content={<ChartTooltip />}
                                    />
                                    <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeOpacity={0.2} />
                                    <Bar dataKey="assets.roth" name="Roth" stackId="a" fill="#22d3ee" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="assets.brokerage" name="Brokerage" stackId="a" fill="#8884d8" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="assets.trad" name="Trad" stackId="a" fill="#f87171" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="assets.property" name="Property" stackId="a" fill="#fbbf24" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="assets.other" name="Other Assets" stackId="a" fill="#4ade80" radius={[2, 2, 0, 0]} />
                                    <Bar dataKey="assets.loans" name="Loans" stackId="a" fill="#64748b" radius={[0, 0, 2, 2]} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
