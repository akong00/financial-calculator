import * as React from "react";
import {
    InputSectionProps,
    Milestone,
    MilestoneCondition,
    MilestoneTrigger,
    MilestoneOperator
} from "@/types/scenario-types";
import { CompactInput, UnitInput, STYLES } from "@/components/inputs/shared/FormComponents";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Flag, Link, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";

const OPERATOR_OPTIONS: { value: MilestoneOperator; label: string }[] = [
    { value: '>', label: '>' },
    { value: '<', label: '<' },
    { value: '>=', label: '≥' },
    { value: '<=', label: '≤' },
    { value: '==', label: '==' },
];

const OPERAND_OPTIONS = [
    { value: 'age', label: 'Age' },
    { value: 'portfolio_value', label: 'Portfolio Value' },
    { value: 'portfolio_percent', label: '% of Portfolio' },
];

export function MilestonesSection({ state, onChange }: InputSectionProps) {
    const addMilestone = () => {
        const newItem: Milestone = {
            id: crypto.randomUUID(),
            name: 'New Milestone',
            condition: {
                type: 'composite',
                logic: 'all',
                triggers: [
                    {
                        id: crypto.randomUUID(),
                        leftType: 'age',
                        operator: '>=',
                        rightValue: 65
                    }
                ]
            }
        };
        onChange({ ...state, milestones: [...state.milestones, newItem] });
    };

    const updateMilestone = (id: string, updates: Partial<Milestone>) => {
        onChange({
            ...state,
            milestones: state.milestones.map(item => item.id === id ? { ...item, ...updates } : item)
        });
    };

    const setConditionType = (id: string, newType: MilestoneCondition['type']) => {
        const milestone = state.milestones.find(m => m.id === id);
        if (!milestone || milestone.condition.type === newType) return;

        let newCondition: MilestoneCondition;
        if (newType === 'composite') {
            newCondition = {
                type: 'composite',
                logic: 'all',
                triggers: [{
                    id: crypto.randomUUID(),
                    leftType: 'age',
                    operator: '>=',
                    rightValue: 65
                }]
            };
        } else if (newType === 'offset_from_milestone') {
            const baseMilestone = state.milestones.find(m => m.id !== id);
            newCondition = {
                type: 'offset_from_milestone',
                baseMilestoneId: baseMilestone?.id || '',
                offsetYears: 5
            };
        } else {
            // Legacy support
            newCondition = {
                type: 'portfolio_percent_greater_than_value',
                portfolioPercent: 4,
                targetValue: 100000
            };
        }
        updateMilestone(id, { condition: newCondition });
    };

    const updateCompositeLogic = (id: string, logic: 'all' | 'any') => {
        const milestone = state.milestones.find(m => m.id === id);
        if (milestone && milestone.condition.type === 'composite') {
            updateMilestone(id, {
                condition: { ...milestone.condition, logic }
            });
        }
    };

    const addTrigger = (id: string) => {
        const milestone = state.milestones.find(m => m.id === id);
        if (milestone && milestone.condition.type === 'composite') {
            const newTrigger: MilestoneTrigger = {
                id: crypto.randomUUID(),
                leftType: 'portfolio_value',
                operator: '>',
                rightValue: 1000000
            };
            updateMilestone(id, {
                condition: {
                    ...milestone.condition,
                    triggers: [...milestone.condition.triggers, newTrigger]
                }
            });
        }
    };

    const removeTrigger = (milestoneId: string, triggerId: string) => {
        const milestone = state.milestones.find(m => m.id === milestoneId);
        if (milestone && milestone.condition.type === 'composite') {
            if (milestone.condition.triggers.length <= 1) return; // Keep at least one
            updateMilestone(milestoneId, {
                condition: {
                    ...milestone.condition,
                    triggers: milestone.condition.triggers.filter(t => t.id !== triggerId)
                }
            });
        }
    };

    const updateTrigger = (milestoneId: string, triggerId: string, updates: Partial<MilestoneTrigger>) => {
        const milestone = state.milestones.find(m => m.id === milestoneId);
        if (milestone && milestone.condition.type === 'composite') {
            updateMilestone(milestoneId, {
                condition: {
                    ...milestone.condition,
                    triggers: milestone.condition.triggers.map(t => t.id === triggerId ? { ...t, ...updates } : t)
                }
            });
        }
    };

    const updateOffsetCondition = (id: string, updates: { baseMilestoneId?: string; offsetYears?: number }) => {
        const milestone = state.milestones.find(m => m.id === id);
        if (milestone && milestone.condition.type === 'offset_from_milestone') {
            updateMilestone(id, {
                condition: { ...milestone.condition, ...updates }
            });
        }
    };

    const removeMilestone = (id: string) => {
        onChange({
            ...state,
            milestones: state.milestones.filter(item => item.id !== id)
        });
    };

    const getAvailableBaseMilestones = (currentId: string) => {
        return state.milestones.filter(m => m.id !== currentId);
    };

    return (
        <div className="space-y-4 p-1">
            <div className="flex justify-between items-center px-2">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Dynamic Milestones</h3>
                    <p className="text-xs text-muted-foreground">Conditions that trigger a date/age in your plan.</p>
                </div>
                <Button onClick={addMilestone} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Add Milestone
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {state.milestones?.map((item) => {
                    const condition = item.condition;
                    const isComposite = condition.type === 'composite';
                    const isOffset = condition.type === 'offset_from_milestone';

                    return (
                        <Card key={item.id} className="relative border-purple-500/10 hover:border-purple-500/30 transition-colors">
                            <div className={cn(
                                "absolute left-0 top-0 bottom-0 w-1 rounded-l-md",
                                isComposite ? "bg-orange-500" : (isOffset ? "bg-blue-500" : "bg-purple-600")
                            )} />
                            <CardHeader className="p-3 pb-0 pl-4">
                                <div className="flex justify-between items-center gap-2">
                                    <div className="flex-1 flex gap-2 items-center">
                                        {isComposite ? <Settings2 className="w-4 h-4 text-orange-500" /> : isOffset ? <Link className="w-4 h-4 text-blue-500" /> : <Flag className="w-4 h-4 text-purple-600" />}
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => updateMilestone(item.id, { name: e.target.value })}
                                            className="font-bold bg-transparent border-none focus:ring-0 p-0 text-sm w-full"
                                            placeholder="Milestone Name"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeMilestone(item.id)}
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive flex items-center justify-center rounded-md"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 pl-4 grid gap-3">
                                {/* Condition Type Selector */}
                                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                                    <button
                                        onClick={() => setConditionType(item.id, 'composite')}
                                        className={cn(
                                            "flex-1 text-[10px] py-1 px-2 rounded-md font-medium transition-colors whitespace-nowrap",
                                            isComposite
                                                ? "bg-orange-500/20 text-orange-700 border border-orange-500/30"
                                                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        Rules
                                    </button>
                                    <button
                                        onClick={() => setConditionType(item.id, 'offset_from_milestone')}
                                        className={cn(
                                            "flex-1 text-[10px] py-1 px-2 rounded-md font-medium transition-colors whitespace-nowrap",
                                            isOffset
                                                ? "bg-blue-500/20 text-blue-700 border border-blue-500/30"
                                                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        Offset
                                    </button>
                                </div>

                                {isComposite && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between border-b border-muted/30 pb-1">
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => updateCompositeLogic(item.id, 'all')}
                                                    className={cn(
                                                        "text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded",
                                                        condition.logic === 'all' ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/50"
                                                    )}
                                                >
                                                    All
                                                </button>
                                                <button
                                                    onClick={() => updateCompositeLogic(item.id, 'any')}
                                                    className={cn(
                                                        "text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded",
                                                        condition.logic === 'any' ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/50"
                                                    )}
                                                >
                                                    Any
                                                </button>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-primary flex items-center gap-1"
                                                onClick={() => addTrigger(item.id)}
                                            >
                                                <Plus className="w-2.5 h-2.5" /> Rule
                                            </Button>
                                        </div>

                                        <div className="space-y-3">
                                            {condition.triggers.map((trigger, idx) => {
                                                const isAge = trigger.leftType === 'age';
                                                const unit = isAge ? 'yrs' : '$';
                                                return (
                                                    <div key={trigger.id} className="relative bg-muted/20 p-2 rounded-md border border-muted/30 group">
                                                        <button
                                                            onClick={() => removeTrigger(item.id, trigger.id)}
                                                            className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-background border border-muted rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                            disabled={condition.triggers.length <= 1}
                                                        >
                                                            <Plus className="w-2.5 h-2.5 rotate-45" />
                                                        </button>

                                                        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                                                            {/* Left Operand */}
                                                            <div className="space-y-1">
                                                                <Select
                                                                    size="sm"
                                                                    value={trigger.leftType}
                                                                    options={OPERAND_OPTIONS}
                                                                    onChange={(val) => updateTrigger(item.id, trigger.id, {
                                                                        leftType: val as any,
                                                                        leftRate: val === 'portfolio_percent' ? 4 : undefined
                                                                    })}
                                                                    className="w-full text-[10px]"
                                                                />
                                                                {trigger.leftType === 'portfolio_percent' && (
                                                                    <div className="flex items-center gap-1">
                                                                        <input
                                                                            type="number"
                                                                            value={trigger.leftRate ?? 4}
                                                                            onChange={(e) => updateTrigger(item.id, trigger.id, {
                                                                                leftRate: parseFloat(e.target.value) || 0
                                                                            })}
                                                                            className="w-12 text-[10px] p-1 rounded border border-muted bg-background h-6 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                            step={0.1}
                                                                        />
                                                                        <span className="text-[10px] text-muted-foreground">% of portfolio</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Operator */}
                                                            <Select
                                                                size="sm"
                                                                value={trigger.operator}
                                                                options={OPERATOR_OPTIONS}
                                                                onChange={(val) => updateTrigger(item.id, trigger.id, { operator: val as any })}
                                                                className="w-[45px] text-[10px]"
                                                            />

                                                            {/* Right Value */}
                                                            <div className="space-y-1">
                                                                <UnitInput
                                                                    value={trigger.rightValue}
                                                                    onChange={(e) => updateTrigger(item.id, trigger.id, { rightValue: parseFloat(e.target.value) || 0 })}
                                                                    unit={unit}
                                                                    color={isAge ? "blue" : "green"}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {isOffset && (
                                    <div className="space-y-3">
                                        <div className="text-xs font-medium text-muted-foreground border-b border-muted/30 pb-1">
                                            Target offset:
                                        </div>
                                        <div className="space-y-2">
                                            <Select
                                                value={condition.baseMilestoneId}
                                                onChange={(val) => updateOffsetCondition(item.id, { baseMilestoneId: val })}
                                                options={getAvailableBaseMilestones(item.id).map(m => ({
                                                    value: m.id,
                                                    label: m.name
                                                }))}
                                                placeholder="Select a milestone..."
                                                size="sm"
                                                className="w-full"
                                            />
                                            <CompactInput
                                                label="Years from base"
                                                value={condition.offsetYears}
                                                onChange={(e) => updateOffsetCondition(item.id, { offsetYears: parseFloat(e.target.value) || 0 })}
                                                unit="yrs"
                                                step={1}
                                                color="blue"
                                            />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}

                {state.milestones.length === 0 && (
                    <div className="text-center p-8 border-2 border-dashed rounded-xl text-muted-foreground col-span-full">
                        <p className="mb-2">No dynamic milestones defined.</p>
                        <Button variant="link" onClick={addMilestone}>Create your first milestone (e.g. FIRE)</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
