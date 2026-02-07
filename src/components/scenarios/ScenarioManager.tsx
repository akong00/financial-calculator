'use client'

import * as React from "react";
import { ScenarioProvider } from "@/contexts/ScenarioContext";
import { ScenarioSidebar } from "./ScenarioSidebar";
import { MainContentArea } from "./MainContentArea";
import { ThemeToggle } from "../theme-toggle";
import { cn } from "@/lib/utils";

export function ScenarioManager() {
    const [isSidebarExpanded, setIsSidebarExpanded] = React.useState(true);

    return (
        <ScenarioProvider>
            <div className="flex h-screen w-full overflow-hidden bg-background">
                {/* Main layout */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className={cn(
                        "flex-shrink-0 border-r border-primary/20 shadow-xl z-10 transition-all duration-300 ease-in-out bg-card",
                        isSidebarExpanded ? "w-64" : "w-16"
                    )}>
                        <ScenarioSidebar
                            isExpanded={isSidebarExpanded}
                            onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)}
                        />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 overflow-hidden bg-card">
                        <MainContentArea />
                    </div>
                </div>
            </div>
        </ScenarioProvider>
    );
}
