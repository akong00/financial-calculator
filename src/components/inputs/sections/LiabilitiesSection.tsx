
import * as React from "react";
import { InputSectionProps, LiabilityItem } from "@/types/scenario-types";
import { CompactInput, STYLES } from "@/components/inputs/shared/FormComponents";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

export function LiabilitiesSection({ state, onChange }: InputSectionProps) {
    const addLiability = () => {
        const newItem: LiabilityItem = {
            id: crypto.randomUUID(),
            name: 'New Loan',
            type: 'personal',
            balance: 10000,
            interestRate: 5.0,
            minPayment: 200
        };
        onChange({ ...state, liabilities: [...state.liabilities, newItem] });
    };

    const updateLiability = (id: string, updates: Partial<LiabilityItem>) => {
        onChange({
            ...state,
            liabilities: state.liabilities.map(item => item.id === id ? { ...item, ...updates } : item)
        });
    };

    const removeLiability = (id: string) => {
        onChange({
            ...state,
            liabilities: state.liabilities.filter(item => item.id !== id)
        });
    };

    const totalDebt = state.liabilities.reduce((sum, item) => sum + item.balance, 0);

    return (
        <div className="space-y-4 p-1">
            <div className="flex justify-between items-center px-2">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Total Liabilities</h3>
                    <p className="text-2xl font-bold text-red-500">${totalDebt.toLocaleString()}</p>
                </div>
                <Button onClick={addLiability} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Add Liability
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {state.liabilities.map((item) => (
                    <Card key={item.id} className="relative border-red-500/10 hover:border-red-500/30 transition-colors">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-md" />
                        <CardHeader className="p-3 pb-0 pl-4">
                            <div className="flex justify-between items-center gap-2">
                                <div className="flex-1 flex gap-2 items-center">
                                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => updateLiability(item.id, { name: e.target.value })}
                                        className="font-bold bg-transparent border-none focus:ring-0 p-0 text-sm w-full"
                                        placeholder="Liability Name"
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeLiability(item.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 pl-4 grid gap-3">
                            <div className={STYLES.grid2}>
                                <CompactInput
                                    label="Principal Balance"
                                    value={item.balance}
                                    onChange={(e) => updateLiability(item.id, { balance: parseFloat(e.target.value) || 0 })}
                                    unit="$"
                                    color="red"
                                />
                                <CompactInput
                                    label="Interest Rate"
                                    value={item.interestRate}
                                    onChange={(e) => updateLiability(item.id, { interestRate: parseFloat(e.target.value) || 0 })}
                                    unit="%"
                                    step={0.125}
                                />
                            </div>
                            <div className={STYLES.grid2}>
                                <CompactInput
                                    label="Monthly Payment"
                                    value={item.minPayment}
                                    onChange={(e) => updateLiability(item.id, { minPayment: parseFloat(e.target.value) || 0 })}
                                    unit="$"
                                />
                                {/* Optional: End Date or Terms logic could go here */}
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {state.liabilities.length === 0 && (
                    <div className="text-center p-8 border-2 border-dashed rounded-xl text-muted-foreground">
                        <p>No outside liabilities configured.</p>
                        <p className="text-xs mt-1">(Mortgages associated with Property assets are managed in the Assets tab)</p>
                        <Button variant="link" onClick={addLiability} className="mt-2">Add a loan or debt</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
