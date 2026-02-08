import * as React from "react";
import { InputSectionProps, Milestone, MilestoneCondition } from "@/types/scenario-types";
import { CompactInput, STYLES } from "@/components/inputs/shared/FormComponents";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Flag, Link } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";

export function MilestonesSection({ state, onChange }: InputSectionProps) {
    const addMilestone = () => {
        const newItem: Milestone = {
            id: crypto.randomUUID(),
            name: 'Financial Independence',
            condition: {
                type: 'portfolio_percent_greater_than_value',
                portfolioPercent: 4,
                targetValue: 100000
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
        if (newType === 'portfolio_percent_greater_than_value') {
            newCondition = {
                type: 'portfolio_percent_greater_than_value',
                portfolioPercent: 4,
                targetValue: 100000
            };
        } else {
            // Find first available milestone (not self)
            const baseMilestone = state.milestones.find(m => m.id !== id);
            newCondition = {
                type: 'offset_from_milestone',
                baseMilestoneId: baseMilestone?.id || '',
                offsetYears: 5
            };
        }
        updateMilestone(id, { condition: newCondition });
    };

    const updatePortfolioCondition = (id: string, updates: { portfolioPercent?: number; targetValue?: number }) => {
        const milestone = state.milestones.find(m => m.id === id);
        if (milestone && milestone.condition.type === 'portfolio_percent_greater_than_value') {
            updateMilestone(id, {
                condition: { ...milestone.condition, ...updates }
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

    // Get milestones that can be used as a base (exclude self and offset milestones that reference this one)
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
                    const isOffsetType = condition.type === 'offset_from_milestone';
                    const baseMilestone = isOffsetType
                        ? state.milestones.find(m => m.id === condition.baseMilestoneId)
                        : null;

                    return (
                        <Card key={item.id} className="relative border-purple-500/10 hover:border-purple-500/30 transition-colors">
                            <div className={cn(
                                "absolute left-0 top-0 bottom-0 w-1 rounded-l-md",
                                isOffsetType ? "bg-blue-500" : "bg-purple-600"
                            )} />
                            <CardHeader className="p-3 pb-0 pl-4">
                                <div className="flex justify-between items-center gap-2">
                                    <div className="flex-1 flex gap-2 items-center">
                                        {isOffsetType ? (
                                            <Link className="w-4 h-4 text-blue-500" />
                                        ) : (
                                            <Flag className="w-4 h-4 text-purple-600" />
                                        )}
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => updateMilestone(item.id, { name: e.target.value })}
                                            className="font-bold bg-transparent border-none focus:ring-0 p-0 text-sm w-full"
                                            placeholder="Milestone Name"
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeMilestone(item.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 pl-4 grid gap-3">
                                {/* Condition Type Selector */}
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setConditionType(item.id, 'portfolio_percent_greater_than_value')}
                                        className={cn(
                                            "flex-1 text-[10px] py-1 px-2 rounded-md font-medium transition-colors",
                                            !isOffsetType
                                                ? "bg-purple-500/20 text-purple-700 border border-purple-500/30"
                                                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        Portfolio %
                                    </button>
                                    <button
                                        onClick={() => setConditionType(item.id, 'offset_from_milestone')}
                                        className={cn(
                                            "flex-1 text-[10px] py-1 px-2 rounded-md font-medium transition-colors",
                                            isOffsetType
                                                ? "bg-blue-500/20 text-blue-700 border border-blue-500/30"
                                                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        Offset from Milestone
                                    </button>
                                </div>

                                {/* Condition-specific Fields */}
                                {item.condition.type === 'portfolio_percent_greater_than_value' ? (
                                    <>
                                        <div className="text-xs font-medium text-muted-foreground">
                                            Triggered when:
                                        </div>
                                        <div className={STYLES.grid2}>
                                            <CompactInput
                                                label="Portfolio %"
                                                value={item.condition.portfolioPercent}
                                                onChange={(e) => updatePortfolioCondition(item.id, { portfolioPercent: parseFloat(e.target.value) || 0 })}
                                                unit="%"
                                                step={0.1}
                                                color="orange"
                                            />
                                            <CompactInput
                                                label="Is > Constant $"
                                                value={item.condition.targetValue}
                                                onChange={(e) => updatePortfolioCondition(item.id, { targetValue: parseFloat(e.target.value) || 0 })}
                                                unit="$"
                                                color="green"
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic">
                                            e.g. When {item.condition.portfolioPercent}% of portfolio &gt; ${item.condition.targetValue.toLocaleString()} (inflation adj.)
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-xs font-medium text-muted-foreground">
                                            Triggered relative to:
                                        </div>
                                        <div className="space-y-2">
                                            <Select
                                                value={condition.type === 'offset_from_milestone' ? condition.baseMilestoneId : ''}
                                                onChange={(val: string) => updateOffsetCondition(item.id, { baseMilestoneId: val })}
                                                options={getAvailableBaseMilestones(item.id).map(m => ({
                                                    value: m.id,
                                                    label: m.name
                                                }))}
                                                placeholder="Select a milestone..."
                                                size="sm"
                                                className="w-full"
                                            />
                                            <CompactInput
                                                label="Offset (years)"
                                                value={condition.type === 'offset_from_milestone' ? condition.offsetYears : 0}
                                                onChange={(e) => updateOffsetCondition(item.id, { offsetYears: parseFloat(e.target.value) || 0 })}
                                                unit="yrs"
                                                step={1}
                                                color="blue"
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic">
                                            {(condition.type === 'offset_from_milestone' && condition.offsetYears >= 0)
                                                ? `${condition.offsetYears} years after "${baseMilestone?.name || 'selected milestone'}"`
                                                : (condition.type === 'offset_from_milestone' ? `${Math.abs(condition.offsetYears)} years before "${baseMilestone?.name || 'selected milestone'}"` : '')
                                            }
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}

                {state.milestones.length === 0 && (
                    <div className="text-center p-8 border-2 border-dashed rounded-xl text-muted-foreground">
                        <p>No dynamic milestones defined.</p>
                        <Button variant="link" onClick={addMilestone}>Create your first milestone (e.g. FIRE)</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
