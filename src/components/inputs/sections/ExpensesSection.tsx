
import * as React from "react";
import { InputSectionProps, ExpenseItem, ExpenseType, ExpenseStrategy } from "@/types/scenario-types";
import { CompactInput, STYLES, UnitInput } from "@/components/inputs/shared/FormComponents";
import { AgeMilestoneInput } from "@/components/inputs/shared/AgeMilestoneInput";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Trash2, ShoppingCart, HeartPulse, Plane, GraduationCap, HelpCircle } from "lucide-react";

const EXPENSE_TYPES: { value: ExpenseType, label: string, icon: any }[] = [
    { value: 'living', label: 'Core Living', icon: ShoppingCart },
    { value: 'healthcare', label: 'Healthcare', icon: HeartPulse },
    { value: 'travel', label: 'Travel & Leisure', icon: Plane },
    { value: 'educational', label: 'Education / Gifting', icon: GraduationCap },
    { value: 'other', label: 'Other', icon: ShoppingCart },
];

const STRATEGIES: { value: ExpenseStrategy, label: string }[] = [
    { value: 'inflation_adjusted', label: 'Keep Pace with Inflation' },
    { value: 'percentage', label: 'Fixed % Growth (matches Inflation default)' },
    { value: 'retirement_smile', label: 'Retirement Smile (U-Curve)' },
];

export function ExpensesSection({ state, onChange }: InputSectionProps) {
    const addExpense = () => {
        const newItem: ExpenseItem = {
            id: crypto.randomUUID(),
            name: 'New Expense',
            type: 'living',
            amount: 50000,
            strategy: 'inflation_adjusted',
            startAge: state.currentAge,
            endAge: state.simulationEndAge
        };
        onChange({ ...state, expenses: [...state.expenses, newItem] });
    };

    const updateExpense = (id: string, updates: Partial<ExpenseItem>) => {
        onChange({
            ...state,
            expenses: state.expenses.map(item => item.id === id ? { ...item, ...updates } : item)
        });
    };

    const removeExpense = (id: string) => {
        onChange({
            ...state,
            expenses: state.expenses.filter(item => item.id !== id)
        });
    };

    const totalBaseExepnse = state.expenses.reduce((sum, item) =>
        sum + (item.strategy === 'percentage' ? 0 : item.amount), 0);

    return (
        <div className="space-y-4 p-1">
            <div className="flex justify-between items-center px-2">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Annual Expenses</h3>
                    <p className="text-sm text-muted-foreground">Base Total: <span className="font-bold text-foreground">${totalBaseExepnse.toLocaleString()}</span></p>
                </div>
                <Button onClick={addExpense} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Add Expense
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {state.expenses.map((item) => {
                    const TypeIcon = EXPENSE_TYPES.find(t => t.value === item.type)?.icon || ShoppingCart;

                    return (
                        <Card key={item.id} className="relative border-orange-500/10 hover:border-orange-500/30 transition-colors">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400 rounded-l-md" />
                            <CardHeader className="p-3 pb-0 pl-4">
                                <div className="flex justify-between items-center gap-2">
                                    <div className="flex-1 flex gap-2 items-center">
                                        <TypeIcon className="w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => updateExpense(item.id, { name: e.target.value })}
                                            className="font-bold bg-transparent border-none focus:ring-0 p-0 text-sm w-full"
                                            placeholder="Expense Name"
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeExpense(item.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 pl-4 grid gap-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <Select
                                        value={item.type}
                                        onChange={(val) => updateExpense(item.id, { type: val as ExpenseType })}
                                        options={EXPENSE_TYPES.map(t => ({ value: t.value, label: t.label }))}
                                        size="sm"
                                    />
                                    <Select
                                        value={item.strategy}
                                        onChange={(val) => updateExpense(item.id, { strategy: val as ExpenseStrategy })}
                                        options={STRATEGIES.map(t => ({ value: t.value, label: t.label }))}
                                        size="sm"
                                    />
                                </div>

                                <div className={STYLES.grid2}>
                                    <CompactInput
                                        label={item.strategy === 'percentage' ? "Withdrawal Rate" : "Annual Amount"}
                                        value={item.amount}
                                        onChange={(e) => updateExpense(item.id, { amount: parseFloat(e.target.value) || 0 })}
                                        unit={item.strategy === 'percentage' ? "%" : "$"}
                                    />
                                    <CompactInput
                                        label="Min Floor ($)"
                                        value={item.floorAmount || 0}
                                        onChange={(e) => updateExpense(item.id, { floorAmount: parseFloat(e.target.value) || 0 })}
                                        unit="$"
                                        color="red"
                                    />
                                    <div className="space-y-0.5 text-left">
                                        <Label className={cn(STYLES.labelSub, "text-red-600 flex items-center justify-between w-full")}>
                                            <span>Market Crash Cut</span>
                                            <div className="group relative cursor-default">
                                                <HelpCircle className="w-2.5 h-2.5 text-muted-foreground/60 transition-colors" />
                                                <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl z-50 leading-tight pointer-events-none font-medium">
                                                    If the market drops 10% and multiple is 1.5x, spending is cut by 15% for the duration.
                                                </div>
                                            </div>
                                        </Label>
                                        <UnitInput
                                            value={item.crashCutMultiple ?? 1.0}
                                            onChange={(e) => updateExpense(item.id, { crashCutMultiple: parseFloat(e.target.value) || 0 })}
                                            unit="x"
                                            color="red"
                                            step={0.1}
                                        />
                                    </div>
                                    <CompactInput
                                        label="Cut Duration"
                                        value={item.crashCutDuration ?? 5}
                                        onChange={(e) => updateExpense(item.id, { crashCutDuration: parseFloat(e.target.value) || 0 })}
                                        unit="yrs"
                                        color="red"
                                        step={1}
                                    />
                                </div>

                                <div className={STYLES.grid2}>
                                    <AgeMilestoneInput
                                        label="Start Age"
                                        value={item.startAge ?? state.currentAge}
                                        onChange={(val) => updateExpense(item.id, { startAge: val })}
                                        milestones={state.milestones}
                                    />
                                    <AgeMilestoneInput
                                        label="End Age"
                                        value={item.endAge ?? state.simulationEndAge}
                                        onChange={(val) => updateExpense(item.id, { endAge: val })}
                                        milestones={state.milestones}
                                    />
                                </div>

                                {/* Unexpected Cost Configuration */}
                                <div className="border-t border-dashed pt-2 mt-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <input
                                            type="checkbox"
                                            id={`unexpected-${item.id}`}
                                            checked={!!item.unexpectedAmount}
                                            onChange={(e) => updateExpense(item.id, {
                                                unexpectedAmount: e.target.checked ? 10000 : undefined,
                                                unexpectedChance: e.target.checked ? 5 : undefined
                                            })}
                                            className="h-3 w-3"
                                        />
                                        <label htmlFor={`unexpected-${item.id}`} className="text-xs font-semibold text-muted-foreground cursor-pointer">
                                            Add One-time / Unexpected Risk?
                                        </label>
                                    </div>
                                    {item.unexpectedAmount !== undefined && (
                                        <div className={STYLES.grid2}>
                                            <CompactInput
                                                label="Shock Amount"
                                                value={item.unexpectedAmount}
                                                onChange={(e) => updateExpense(item.id, { unexpectedAmount: parseFloat(e.target.value) || 0 })}
                                                unit="$"
                                                color="red"
                                            />
                                            <CompactInput
                                                label="Prob % / Year"
                                                value={item.unexpectedChance ?? 0}
                                                onChange={(e) => updateExpense(item.id, { unexpectedChance: parseFloat(e.target.value) || 0 })}
                                                unit="%"
                                            />
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {state.expenses.length === 0 && (
                    <div className="text-center p-8 border-2 border-dashed rounded-xl text-muted-foreground">
                        <p>No expenses defined.</p>
                        <Button variant="link" onClick={addExpense}>Add Living Expenses</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
