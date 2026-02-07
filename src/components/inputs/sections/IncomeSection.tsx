
import * as React from "react";
import { InputSectionProps, IncomeItem, IncomeType } from "@/types/scenario-types";
import { CompactInput, STYLES } from "@/components/inputs/shared/FormComponents";
import { AgeMilestoneInput } from "@/components/inputs/shared/AgeMilestoneInput";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Banknote } from "lucide-react";

const INCOME_TYPES: { value: IncomeType, label: string }[] = [
    { value: 'salary', label: 'Salary / Wages' },
    { value: 'social_security', label: 'Social Security' },
    { value: 'pension', label: 'Pension' },
    { value: 'rental', label: 'Rental Income' },
    { value: 'side_hustle', label: 'Side Hustle / Consulting' },
    { value: 'inheritance', label: 'One-time (Inheritance/Sale)' },
    { value: 'other', label: 'Other' },
];

export function IncomeSection({ state, onChange }: InputSectionProps) {
    const addIncome = () => {
        const newItem: IncomeItem = {
            id: crypto.randomUUID(),
            name: 'New Income',
            type: 'social_security',
            amount: 20000,
            startAge: 67,
            growthRate: 2.5,
            taxType: 'ordinary'
        };
        onChange({ ...state, income: [...state.income, newItem] });
    };

    const updateIncome = (id: string, updates: Partial<IncomeItem>) => {
        onChange({
            ...state,
            income: state.income.map(item => item.id === id ? { ...item, ...updates } : item)
        });
    };

    const removeIncome = (id: string) => {
        onChange({
            ...state,
            income: state.income.filter(item => item.id !== id)
        });
    };

    return (
        <div className="space-y-4 p-1">
            <div className="flex justify-between items-center px-2">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Annual Income Sources</h3>
                </div>
                <Button onClick={addIncome} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Add Income
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {state.income.map((item) => (
                    <Card key={item.id} className="relative border-green-500/10 hover:border-green-500/30 transition-colors">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${item.type === 'social_security' ? 'bg-green-600' : 'bg-green-400'}`} />
                        <CardHeader className="p-3 pb-0 pl-4">
                            <div className="flex justify-between items-center gap-2">
                                <div className="flex-1 flex gap-2 items-center">
                                    <Banknote className="w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => updateIncome(item.id, { name: e.target.value })}
                                        className="font-bold bg-transparent border-none focus:ring-0 p-0 text-sm w-full"
                                        placeholder="Income Name"
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeIncome(item.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 pl-4 grid gap-3">
                            <div className="flex gap-2 items-center">
                                <Select
                                    value={item.type}
                                    onChange={(val) => updateIncome(item.id, { type: val as IncomeType })}
                                    options={INCOME_TYPES.map(t => ({ value: t.value, label: t.label }))}
                                    size="sm"
                                />
                                <Select
                                    value={item.taxType}
                                    onChange={(val) => updateIncome(item.id, { taxType: val as any })}
                                    options={[
                                        { value: 'ordinary', label: 'Ordinary Tax' },
                                        { value: 'capital_gains', label: 'Cap Gains' },
                                        { value: 'tax_free', label: 'Tax Free' }
                                    ]}
                                    className="w-[140px]"
                                    size="sm"
                                />
                            </div>

                            <div className={STYLES.grid2}>
                                <CompactInput
                                    label="Annual Amount"
                                    value={item.amount}
                                    onChange={(e) => updateIncome(item.id, { amount: parseFloat(e.target.value) || 0 })}
                                    unit="$"
                                    color="green"
                                />
                                <CompactInput
                                    label="Growth Rate (COLA)"
                                    value={item.growthRate}
                                    onChange={(e) => updateIncome(item.id, { growthRate: parseFloat(e.target.value) || 0 })}
                                    unit="%"
                                    step={0.1}
                                />
                            </div>

                            <div className={STYLES.grid2}>
                                <AgeMilestoneInput
                                    label="Start Age"
                                    value={item.startAge ?? state.currentAge}
                                    onChange={(val) => updateIncome(item.id, { startAge: val })}
                                    milestones={state.milestones}
                                />
                                {item.type !== 'social_security' && item.type !== 'inheritance' && (
                                    <AgeMilestoneInput
                                        label="End Age"
                                        value={item.endAge ?? state.simulationEndAge}
                                        onChange={(val) => updateIncome(item.id, { endAge: val })}
                                        milestones={state.milestones}
                                    />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {state.income.length === 0 && (
                    <div className="text-center p-8 border-2 border-dashed rounded-xl text-muted-foreground">
                        <p>No income sources defined.</p>
                        <Button variant="link" onClick={addIncome}>Add Income (SS, Pension, etc)</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
