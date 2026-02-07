import * as React from "react";
import { InputSectionProps, CalculatorState } from "@/types/scenario-types";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Checkbox } from "../../ui/checkbox";  // Changed to relative import
import { Field, CompactInput, STYLES } from "@/components/inputs/shared/FormComponents";
import { cn } from "@/lib/utils";

export function OptimizationsSection({ state, onChange }: InputSectionProps) {
    const handleChange = (field: string, value: string | number | boolean) => {
        const newState = { ...state } as any;

        if (typeof state[field as keyof typeof state] === 'number') {
            let numVal = typeof value === 'boolean' ? (value ? 1 : 0) : parseFloat(String(value));
            numVal = isNaN(numVal) ? 0 : numVal;
            newState[field] = numVal;
        } else {
            newState[field] = value;
        }

        onChange(newState);
    };

    return (
        <div className="p-2">
            <div className="space-y-4 max-w-md">
                <div>
                    <label className={STYLES.labelHeading}>Assumptions</label>
                    <div className="space-y-2 mt-2">
                        <div className="p-2 bg-primary/5 rounded-lg border border-primary/10 shadow-sm space-y-3">
                            <CompactInput
                                label="Inflation Estimate / COLA"
                                value={state.inflationRate}
                                onChange={(e) => handleChange('inflationRate', e.target.value)}
                                unit="%"
                                step={0.1}
                            />
                            <CompactInput
                                label="Pre-Tax Future Tax Discount"
                                value={state.preTaxDiscount}
                                onChange={(e) => handleChange('preTaxDiscount', e.target.value)}
                                unit="%"
                                step={1}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className={STYLES.labelHeading}>Tax Optimization</label>
                    <div className="space-y-2 mt-2">
                        {/* Roth Optimization */}
                        <div className="space-y-2 bg-primary/5 rounded-lg border border-primary/10 p-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-[11px] font-medium text-primary">Roth Optimization</Label>
                                    <p className="text-[9px] font-medium text-muted-foreground">Auto-determine best conversion strategy</p>
                                </div>
                                <Switch
                                    className="scale-[0.7]"
                                    checked={state.isRothAutoOptimized}
                                    onCheckedChange={(c) => onChange({ ...state, isRothAutoOptimized: c })}
                                />
                            </div>

                            {!state.isRothAutoOptimized && (
                                <div className="pt-2 border-t border-primary/10 grid gap-2">
                                    <Label className={STYLES.labelSub}>Manual Strategy</Label>
                                    <Select
                                        value={state.rothStrategy}
                                        onChange={(val) => handleChange('rothStrategy', val)}
                                        options={[
                                            { value: 'none', label: 'None' },
                                            { value: 'fill_bracket', label: 'Fill Tax Bracket' },
                                            { value: 'fixed_amount', label: 'Fixed Amount' }
                                        ]}
                                        size="sm"
                                    />

                                    {state.rothStrategy === 'fill_bracket' && (
                                        <>
                                            <CompactInput
                                                label="Target Bracket"
                                                value={state.rothTargetBracket}
                                                onChange={(e) => handleChange('rothTargetBracket', e.target.value)}
                                                unit="%"
                                                step={1}
                                            />
                                            <div className="flex items-center justify-between mt-1 px-1">
                                                <Label className="text-[10px] text-muted-foreground">Stay in 0% LTCG Zone</Label>
                                                <Switch
                                                    className="scale-[0.6]"
                                                    checked={state.rothStayIn0PercentZone}
                                                    onCheckedChange={(c) => handleChange('rothStayIn0PercentZone', c)}
                                                />
                                            </div>
                                        </>
                                    )}
                                    {state.rothStrategy === 'fixed_amount' && (
                                        <CompactInput
                                            label="Annual Amount"
                                            value={state.rothFixedAmount}
                                            onChange={(e) => handleChange('rothFixedAmount', e.target.value)}
                                            unit="$"
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Tax Gain Harvesting */}
                        <div className="flex items-center justify-between p-1.5 bg-primary/5 rounded-lg border border-primary/10 shadow-sm">
                            <div>
                                <Label className="text-[11px] font-medium text-primary">Tax Gain Harvesting</Label>
                                <p className="text-[9px] font-medium text-muted-foreground">Reset basis in lower brackets</p>
                            </div>
                            <Switch
                                className="scale-[0.7]"
                                checked={state.enableTaxGainHarvesting}
                                onCheckedChange={(c) => onChange({ ...state, enableTaxGainHarvesting: c })}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className={STYLES.labelHeading}>Savings Allocation</label>
                    <div className="space-y-3 p-4 bg-muted/20 rounded-lg border border-muted mt-2">
                        <p className="text-xs text-muted-foreground">
                            When income exceeds expenses, allocate the surplus to these account types (in priority order):
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="alloc-trad401k"
                                    checked={state.savingsAllocation.trad401k}
                                    onCheckedChange={(checked) => onChange({
                                        ...state,
                                        savingsAllocation: {
                                            ...state.savingsAllocation,
                                            trad401k: checked as boolean
                                        }
                                    })}
                                />
                                <label htmlFor="alloc-trad401k" className="text-sm cursor-pointer">
                                    Traditional 401k
                                </label>
                            </div>

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="alloc-mega"
                                    checked={state.savingsAllocation.megaBackdoorRoth}
                                    onCheckedChange={(checked) => onChange({
                                        ...state,
                                        savingsAllocation: {
                                            ...state.savingsAllocation,
                                            megaBackdoorRoth: checked as boolean
                                        }
                                    })}
                                />
                                <label htmlFor="alloc-mega" className="text-sm cursor-pointer">
                                    Mega Backdoor Roth
                                </label>
                            </div>

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="alloc-roth"
                                    checked={state.savingsAllocation.roth}
                                    onCheckedChange={(checked) => onChange({
                                        ...state,
                                        savingsAllocation: {
                                            ...state.savingsAllocation,
                                            roth: checked as boolean
                                        }
                                    })}
                                />
                                <label htmlFor="alloc-roth" className="text-sm cursor-pointer">
                                    Roth IRA/401k
                                </label>
                            </div>

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="alloc-brokerage"
                                    checked={state.savingsAllocation.brokerage}
                                    onCheckedChange={(checked) => onChange({
                                        ...state,
                                        savingsAllocation: {
                                            ...state.savingsAllocation,
                                            brokerage: checked as boolean
                                        }
                                    })}
                                />
                                <label htmlFor="alloc-brokerage" className="text-sm cursor-pointer">
                                    Taxable Brokerage
                                </label>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground italic pt-2 border-t border-muted">
                            <strong>Priority:</strong> Trad 401k → Mega Backdoor Roth → Roth → Brokerage (catch-all)
                        </p>
                    </div>
                </div>

                <div>
                    <label className={STYLES.labelHeading}>Healthcare & Safety Net</label>
                    <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between group">
                            <Label className="text-[10px] font-medium text-primary">Medicare Part B</Label>
                            <Switch className="scale-[0.6] origin-right" checked={state.includeBaseMedicare} onCheckedChange={(val) => handleChange('includeBaseMedicare', val)} />
                        </div>

                        <div className="flex items-center justify-between group">
                            <Label className="text-[10px] font-medium text-primary">Medicaid Safety Net</Label>
                            <Switch className="scale-[0.6] origin-right" checked={state.enableMedicaidSafetyNet} onCheckedChange={(val) => handleChange('enableMedicaidSafetyNet', val)} />
                        </div>

                        <div className="pt-1">
                            <Label className={STYLES.labelSub}>Coverage</Label>
                            <div className="flex gap-3">
                                {[1, 2].map(num => (
                                    <label key={num} className="flex items-center gap-1 cursor-pointer group">
                                        <input
                                            type="radio"
                                            className="w-2.5 h-2.5 accent-primary opacity-70"
                                            checked={state.medicarePeopleCount === num}
                                            onChange={() => handleChange('medicarePeopleCount', num)}
                                        />
                                        <span className="text-[10px] font-medium text-primary/70 group-hover:text-primary transition-all leading-none">
                                            {num === 1 ? 'Individual' : 'Couple'}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
