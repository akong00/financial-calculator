import * as React from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ROLLING_REAL_RETURNS } from "@/lib/data/rollingReturns";

export function HistoricalDistributionChart() {
    // Kernel Density Estimation (KDE) Implementation
    const kernelGaussian = (u: number) => (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * u * u);

    // Bandwidth (Smoothing Parameter)
    // With ~1800 points, we need a smaller bandwidth than with 100 points
    const h = 0.03;
    const returns = ROLLING_REAL_RETURNS;
    const n = returns.length;

    // Generate points for the curve
    const data = [];
    const minRange = -0.6;
    const maxRange = 0.6;
    const steps = 60; // Smoothness of the line

    for (let i = 0; i <= steps; i++) {
        const x = minRange + (i / steps) * (maxRange - minRange);

        // KDE sum: (1/nh) * sum(K((x - xi)/h))
        let density = 0;
        returns.forEach(xi => {
            density += kernelGaussian((x - xi) / h);
        });
        density = density / (n * h);

        data.push({
            x: x,
            percentage: (x * 100).toFixed(0) + "%",
            density: density
        });
    }

    return (
        <div className="h-24 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorDensity" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                            <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.8} />
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="density"
                        stroke="#3b82f6"
                        fill="url(#colorDensity)"
                        fillOpacity={0.4}
                        strokeWidth={1.5}
                        isAnimationActive={false}
                    />
                    <XAxis
                        dataKey="percentage"
                        hide
                    />
                    <YAxis hide domain={[0, 'auto']} />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const val = (payload[0].payload.x * 100).toFixed(0);
                                return (
                                    <div className="bg-background/90 border border-primary/20 p-1 rounded-md shadow-sm text-[8px] font-bold">
                                        Return: {val}%
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-between px-1 text-[8px] font-black text-muted-foreground uppercase tracking-tighter">
                <span>Losses</span>
                <span>Gains</span>
            </div>
        </div>
    );
}
