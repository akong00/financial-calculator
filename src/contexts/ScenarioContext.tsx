'use client'

import * as React from "react";
import { Scenario, CalculatorState, ScenarioResults, DEFAULT_CALCULATOR_STATE } from "@/types/scenario-types";
import { runFullScenario } from "@/lib/engine/orchestrator";

interface ScenarioContextType {
    scenarios: Scenario[];
    activeScenarioId: string;
    activeTab: 'inputs' | 'outputs';
    isSimulating: boolean;
    progress: number;
    addScenario: () => void;
    deleteScenario: (id: string) => void;
    setActiveScenario: (id: string) => void;
    setActiveTab: (tab: 'inputs' | 'outputs') => void;
    updateScenarioInputs: (id: string, state: CalculatorState) => void;
    renameScenario: (id: string, name: string) => void;
    runSimulationForScenario: (id: string) => Promise<void>;
}

const ScenarioContext = React.createContext<ScenarioContextType | undefined>(undefined);

const STORAGE_KEY = 'financial_calculator_scenarios';

export function ScenarioProvider({ children }: { children: React.ReactNode }) {
    const [scenarios, setScenarios] = React.useState<Scenario[]>([]);
    const [activeScenarioId, setActiveScenarioId] = React.useState<string>('');
    const [activeTab, setActiveTab] = React.useState<'inputs' | 'outputs'>('inputs');
    const [isSimulating, setIsSimulating] = React.useState(false);
    const [progress, setProgress] = React.useState(0);

    // Load scenarios from localStorage on mount
    React.useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        let loaded = false;

        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Validate structure: must have assets array
                const isValid = parsed.scenarios?.every((s: any) =>
                    s.inputState && Array.isArray(s.inputState.assets)
                );

                if (isValid) {
                    setScenarios(parsed.scenarios || []);
                    setActiveScenarioId(parsed.activeScenarioId || '');
                    loaded = true;
                } else {
                    console.log('Stored scenarios have invalid or legacy format. Resetting to default.');
                }
            } catch (e) {
                console.error('Failed to parse stored scenarios:', e);
            }
        }

        // Create default scenario if none exist or load failed
        if (!loaded) {
            const defaultScenario: Scenario = {
                id: generateId(),
                name: 'Scenario 1',
                inputState: DEFAULT_CALCULATOR_STATE
            };
            setScenarios([defaultScenario]);
            setActiveScenarioId(defaultScenario.id);
        }
    }, []);

    // Save to localStorage whenever scenarios change
    React.useEffect(() => {
        if (scenarios.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                scenarios: scenarios.map(s => ({
                    ...s,
                    results: undefined // Don't persist results to save space
                })),
                activeScenarioId
            }));
        }
    }, [scenarios, activeScenarioId]);

    const generateId = () => `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const addScenario = React.useCallback(() => {
        const newScenario: Scenario = {
            id: generateId(),
            name: `Scenario ${scenarios.length + 1}`,
            inputState: { ...DEFAULT_CALCULATOR_STATE }
        };
        setScenarios(prev => [...prev, newScenario]);
        setActiveScenarioId(newScenario.id);
        setActiveTab('inputs');
    }, [scenarios.length]);

    const deleteScenario = React.useCallback((id: string) => {
        if (scenarios.length <= 1) {
            alert('Cannot delete the last scenario');
            return;
        }

        const confirmed = confirm('Are you sure you want to delete this scenario?');
        if (!confirmed) return;

        setScenarios(prev => {
            const filtered = prev.filter(s => s.id !== id);
            if (id === activeScenarioId) {
                setActiveScenarioId(filtered[0]?.id || '');
            }
            return filtered;
        });
    }, [scenarios.length, activeScenarioId]);

    const setActiveScenario = React.useCallback((id: string) => {
        setActiveScenarioId(id);
    }, []);

    const updateScenarioInputs = React.useCallback((id: string, state: CalculatorState) => {
        setScenarios(prev => prev.map(s =>
            s.id === id ? { ...s, inputState: state } : s
        ));
    }, []);

    const renameScenario = React.useCallback((id: string, name: string) => {
        setScenarios(prev => prev.map(s =>
            s.id === id ? { ...s, name } : s
        ));
    }, []);

    const runSimulationForScenario = React.useCallback(async (id: string) => {
        const scenario = scenarios.find(s => s.id === id);
        if (!scenario) return;

        // Clear existing results immediately to improve performance/responsiveness
        setScenarios(prev => prev.map(s =>
            s.id === id ? { ...s, results: undefined } : s
        ));

        setIsSimulating(true);
        // Progress handled by orchestrator starting at 0

        await new Promise(resolve => setTimeout(resolve, 50)); // UI yield

        try {
            const results = await runFullScenario(scenario.inputState, setProgress);

            setScenarios(prev => prev.map(s =>
                s.id === id ? { ...s, results: { ...results, lastRunInputState: scenario.inputState } } : s
            ));
        } catch (error) {
            console.error("Simulation failed:", error);
        } finally {
            // Small delay to show 100% completion
            setTimeout(() => {
                setIsSimulating(false);
                setProgress(0);
            }, 500);
        }
    }, [scenarios]);

    const value: ScenarioContextType = {
        scenarios,
        activeScenarioId,
        activeTab,
        isSimulating,
        progress,
        addScenario,
        deleteScenario,
        setActiveScenario,
        setActiveTab,
        updateScenarioInputs,
        renameScenario,
        runSimulationForScenario
    };

    return (
        <ScenarioContext.Provider value={value}>
            {children}
        </ScenarioContext.Provider>
    );
}

export function useScenarios() {
    const context = React.useContext(ScenarioContext);
    if (!context) {
        throw new Error('useScenarios must be used within ScenarioProvider');
    }
    return context;
}
