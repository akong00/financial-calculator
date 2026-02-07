'use client'

import * as React from "react";
import { useScenarios } from "@/contexts/ScenarioContext";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { INPUT_SECTIONS } from "./sectionRegistry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Check, X } from "lucide-react";

export function InputsTab() {
    const { scenarios, activeScenarioId, updateScenarioInputs, renameScenario } = useScenarios();
    const activeScenario = scenarios.find(s => s.id === activeScenarioId);

    const [isEditingName, setIsEditingName] = React.useState(false);
    const [tempName, setTempName] = React.useState("");

    React.useEffect(() => {
        if (activeScenario) {
            setTempName(activeScenario.name);
        }
    }, [activeScenario?.id, activeScenario?.name]);

    const [openSections, setOpenSections] = React.useState<string[]>(
        INPUT_SECTIONS.filter(s => !s.defaultCollapsed).map(s => s.id)
    );

    if (!activeScenario) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>No scenario selected</p>
            </div>
        );
    }

    const toggleSection = (sectionId: string) => {
        setOpenSections(prev =>
            prev.includes(sectionId)
                ? prev.filter(s => s !== sectionId)
                : [...prev, sectionId]
        );
    };

    const handleInputChange = (newState: any) => {
        updateScenarioInputs(activeScenarioId, newState);
    };

    const handleSaveName = () => {
        if (tempName.trim()) {
            renameScenario(activeScenarioId, tempName.trim());
            setIsEditingName(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Scenario Name Header */}
            <div className="flex items-center justify-between pb-2 border-b border-primary/10">
                <div className="flex-1 mr-4">
                    {isEditingName ? (
                        <div className="flex items-center gap-2">
                            <Input
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                className="h-9 font-bold text-lg"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveName();
                                    if (e.key === 'Escape') {
                                        setTempName(activeScenario.name);
                                        setIsEditingName(false);
                                    }
                                }}
                            />
                            <Button size="icon" variant="ghost" className="h-9 w-9 text-green-600" onClick={handleSaveName}>
                                <Check className="h-5 w-5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-9 w-9 text-red-600" onClick={() => {
                                setTempName(activeScenario.name);
                                setIsEditingName(false);
                            }}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 group">
                            <h2 className="text-2xl font-black tracking-tight text-foreground">
                                {activeScenario.name}
                            </h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setIsEditingName(true)}
                            >
                                <Edit2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <Accordion className="w-full space-y-3">
                {INPUT_SECTIONS.map((section) => {
                    const Icon = section.icon as any;
                    const SectionComponent = section.component;
                    const isOpen = openSections.includes(section.id);

                    return (
                        <Card
                            key={section.id}
                            className="border-primary/20 shadow-md transition-shadow hover:shadow-lg"
                        >
                            <AccordionItem className="border-none">
                                <AccordionTrigger
                                    isOpen={isOpen}
                                    onToggle={() => toggleSection(section.id)}
                                    className="px-4 py-3 hover:bg-muted/30 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        {Icon && <Icon className="h-4 w-4 text-primary" />}
                                        <span className="text-sm font-bold uppercase tracking-wider text-primary">
                                            {section.label}
                                        </span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent isOpen={isOpen} className="pt-0 pb-0">
                                    <div className="border-t border-primary/10">
                                        <SectionComponent
                                            state={activeScenario.inputState}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Card>
                    );
                })}
            </Accordion>
        </div>
    );
}
