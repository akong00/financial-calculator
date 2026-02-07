'use client'

import * as React from "react";
import { useScenarios } from "@/contexts/ScenarioContext";
import { CalculatorResults } from "@/components/calculator/CalculatorResults";

export function OutputsTab() {
    const { scenarios, activeScenarioId } = useScenarios();
    const activeScenario = scenarios.find(s => s.id === activeScenarioId);

    if (!activeScenario) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>No scenario selected</p>
            </div>
        );
    }

    const results = activeScenario.results;

    if (!results || !results.singleRunResults || results.singleRunResults.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 p-8">
                <div className="text-6xl">📊</div>
                <h3 className="text-lg font-semibold">No Results Yet</h3>
                <p className="text-sm text-center max-w-md">
                    Click the "Run Simulation" button to generate projections for this scenario.
                </p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <CalculatorResults
                singleRunResults={results.singleRunResults}
                monteCarloResults={results.monteCarloResults}
                historicalResults={results.historicalResults}
                strategyComparison={results.strategyComparison}
                preTaxDiscount={activeScenario.inputState.preTaxDiscount}
            />
        </div>
    );
}
