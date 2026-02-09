'use client'

import * as React from "react";
import { useScenarios } from "@/contexts/ScenarioContext";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "../theme-toggle";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";

export function ScenarioSidebar({ isExpanded, onToggle }: { isExpanded: boolean, onToggle: () => void }) {
    const { scenarios, activeScenarioId, setActiveScenario, addScenario, deleteScenario, duplicateScenario } = useScenarios();

    return (
        <div className="flex flex-col h-full bg-card">
            {/* App Header in Sidebar */}
            <div className="p-4 border-b border-primary/10 bg-muted/30">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        {isExpanded && (
                            <h1 className="font-mono text-base font-black leading-tight tracking-tighter text-primary uppercase =flex-1">
                                Actually Good Financial Calculator
                            </h1>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary"
                            onClick={onToggle}
                        >
                            {isExpanded ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </div>
                    {isExpanded && (
                        <div className="flex items-center justify-between animate-in fade-in duration-300">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Theme</span>
                            <ThemeToggle />
                        </div>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="p-3 border-b border-primary/10 bg-muted/10 animate-in fade-in duration-300">
                    <h2 className="text-xs font-black uppercase tracking-wider text-primary/70">Scenarios</h2>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {scenarios.map((scenario) => (
                    <div
                        key={scenario.id}
                        className={cn(
                            "group relative flex items-center gap-2 rounded-lg cursor-pointer transition-all",
                            isExpanded ? "px-3 py-2" : "p-2 justify-center",
                            activeScenarioId === scenario.id
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "hover:bg-muted/50"
                        )}
                        onClick={() => setActiveScenario(scenario.id)}
                        title={!isExpanded ? scenario.name : undefined}
                    >
                        {isExpanded ? (
                            <span className="flex-1 text-sm font-medium truncate">
                                {scenario.name}
                            </span>
                        ) : (
                            <span className="text-xs font-bold uppercase">
                                {scenario.name.substring(0, 2)}
                            </span>
                        )}

                        {isExpanded && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    className={cn(
                                        "p-1 rounded hover:bg-primary/20",
                                        activeScenarioId === scenario.id && "text-primary-foreground hover:bg-primary/30"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        duplicateScenario(scenario.id);
                                    }}
                                    title="Duplicate scenario"
                                >
                                    <Copy className="h-3 w-3" />
                                </button>
                                {scenarios.length > 1 && (
                                    <button
                                        className={cn(
                                            "p-1 rounded hover:bg-destructive/20",
                                            activeScenarioId === scenario.id && "text-primary-foreground hover:bg-destructive/30"
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteScenario(scenario.id);
                                        }}
                                        title="Delete scenario"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                <div className={cn("pt-2", !isExpanded && "flex justify-center")}>
                    <Button
                        onClick={addScenario}
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "text-primary/70 hover:text-primary hover:bg-primary/10",
                            isExpanded ? "w-full justify-start px-3" : "h-9 w-9 p-0"
                        )}
                    >
                        <Plus className="h-4 w-4" />
                        {isExpanded && <span className="ml-2">Add Scenario</span>}
                    </Button>
                </div>
            </div>
        </div>
    );
}
