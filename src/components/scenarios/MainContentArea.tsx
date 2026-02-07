'use client'

import * as React from "react";
import { useScenarios } from "@/contexts/ScenarioContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PlayCircle, RefreshCw } from "lucide-react";
import { InputsTab } from "@/components/inputs/InputsTab";
import { OutputsTab } from "@/components/outputs/OutputsTab";

export function MainContentArea() {
    const {
        scenarios,
        activeScenarioId,
        activeTab,
        setActiveTab,
        isSimulating,
        progress,
        runSimulationForScenario
    } = useScenarios();

    const activeScenario = scenarios.find(s => s.id === activeScenarioId);

    if (!activeScenario) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>No scenario selected</p>
            </div>
        );
    }

    const handleRunSimulation = () => {
        runSimulationForScenario(activeScenarioId);
    };

    // Check if inputs have changed since last run
    const hasResults = !!activeScenario.results;
    const isDirty = hasResults && activeScenario.results?.lastRunInputState &&
        JSON.stringify(activeScenario.inputState) !== JSON.stringify(activeScenario.results.lastRunInputState);

    return (
        <div className="flex flex-col h-full">
            {/* Header with tabs and run button */}
            <div className="flex items-center justify-between gap-4 p-4 border-b border-primary/10 bg-muted/30">
                <Tabs
                    value={activeTab}
                    onValueChange={(val) => setActiveTab(val as 'inputs' | 'outputs')}
                    className="flex-1"
                >
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="inputs">Inputs</TabsTrigger>
                        <TabsTrigger value="outputs">Outputs</TabsTrigger>
                    </TabsList>
                </Tabs>

                <Button
                    onClick={handleRunSimulation}
                    disabled={isSimulating}
                    size="lg"
                    className="shrink-0"
                >
                    {isSimulating ? (
                        <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Running...
                        </>
                    ) : (
                        <>
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Run Simulation
                        </>
                    )}
                </Button>
            </div>

            {/* Progress bar */}
            {isSimulating && (
                <div className="px-4 pt-3 pb-2 space-y-2 animate-in fade-in slide-in-from-top-4 duration-300 bg-muted/20">
                    <div className="flex justify-between text-xs font-bold text-primary/70 uppercase tracking-widest">
                        <span>Running Multi-Scenario Projections...</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                </div>
            )}

            {/* Dirty state warning */}
            {isDirty && !isSimulating && (
                <div className="mx-4 mt-3 bg-amber-100 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-2">
                    <span className="text-lg">⚠</span>
                    Inputs have changed. Run simulation again to see updated results.
                </div>
            )}

            {/* Main content area */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'inputs' ? (
                    <InputsTab />
                ) : (
                    <OutputsTab />
                )}
            </div>
        </div>
    );
}
