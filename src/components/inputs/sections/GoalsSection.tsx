
import * as React from "react";
import { InputSectionProps } from "@/types/scenario-types";
import { CompactInput, STYLES } from "@/components/inputs/shared/FormComponents";
import { AgeMilestoneInput } from "@/components/inputs/shared/AgeMilestoneInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATE_TAX_RATES, FilingStatus } from "@/lib/engine/taxes";
import { cn } from "@/lib/utils";

export function GoalsSection({ state, onChange }: InputSectionProps) {
    const handleChange = (field: string, value: any) => {
        onChange({ ...state, [field]: value });
    };

    return (
        <Card className="border-none shadow-none">
            <CardHeader className="px-1 py-2">
                <CardTitle className="text-sm uppercase font-black tracking-widest text-primary">Core Assumptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-1">
                <div className="max-w-md space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <AgeMilestoneInput
                            label="Current Age"
                            value={state.currentAge}
                            onChange={(val) => handleChange('currentAge', typeof val === 'number' ? val : state.currentAge)}
                            milestones={state.milestones}
                        />
                        <AgeMilestoneInput
                            label="End of Plan Age"
                            value={state.simulationEndAge}
                            onChange={(val) => handleChange('simulationEndAge', typeof val === 'number' ? val : state.simulationEndAge)}
                            milestones={state.milestones}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className={STYLES.label}>Filing Status</Label>
                        <Select
                            value={state.filingStatus}
                            onChange={(val) => handleChange('filingStatus', val as FilingStatus)}
                            options={[
                                { value: 'single', label: 'Single' },
                                { value: 'married_joint', label: 'Married Joint' },
                                { value: 'married_separate', label: 'Married Separate' },
                                { value: 'head_household', label: 'Head of Household' }
                            ]}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className={STYLES.label}>State for Income Tax</Label>
                        <Select
                            value={state.taxState}
                            onChange={(val) => handleChange('taxState', val)}
                            options={Object.entries(STATE_TAX_RATES).map(([code, data]) => ({
                                value: code,
                                label: code === 'none' ? 'No State Tax' : `${data.name} (Top: ${(data.rate * 100).toFixed(1)}%)`
                            }))}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
