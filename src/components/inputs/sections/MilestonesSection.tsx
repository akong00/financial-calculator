import * as React from "react";
import { InputSectionProps, Milestone, MilestoneCondition } from "@/types/scenario-types";
import { CompactInput, STYLES } from "@/components/inputs/shared/FormComponents";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Flag } from "lucide-react";

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

    const updateCondition = (id: string, updates: Partial<MilestoneCondition>) => {
        const milestone = state.milestones.find(m => m.id === id);
        if (milestone) {
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
                {state.milestones?.map((item) => (
                    <Card key={item.id} className="relative border-purple-500/10 hover:border-purple-500/30 transition-colors">
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md bg-purple-600" />
                        <CardHeader className="p-3 pb-0 pl-4">
                            <div className="flex justify-between items-center gap-2">
                                <div className="flex-1 flex gap-2 items-center">
                                    <Flag className="w-4 h-4 text-purple-600" />
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
                            <div className="text-xs font-medium text-muted-foreground">
                                Triggered when:
                            </div>
                            <div className={STYLES.grid2}>
                                <CompactInput
                                    label="Portfolio %"
                                    value={item.condition.portfolioPercent}
                                    onChange={(e) => updateCondition(item.id, { portfolioPercent: parseFloat(e.target.value) || 0 })}
                                    unit="%"
                                    step={0.1}
                                    color="orange"
                                />
                                <CompactInput
                                    label="Is > Constant $"
                                    value={item.condition.targetValue}
                                    onChange={(e) => updateCondition(item.id, { targetValue: parseFloat(e.target.value) || 0 })}
                                    unit="$"
                                    color="green"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">
                                e.g. When {item.condition.portfolioPercent}% of portfolio &gt; ${item.condition.targetValue.toLocaleString()} (inflation adj.)
                            </p>
                        </CardContent>
                    </Card>
                ))}

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
