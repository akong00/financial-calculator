
import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Switch } from "@/components/ui/switch"
import { FilingStatus } from "@/lib/engine/taxes"
import { STATE_TAX_RATES } from "@/lib/engine/taxes"
import { cn } from "@/lib/utils"

export interface CalculatorState {
    currentAge: number;
    simulationEndAge: number;
    annualSpending: number;

    portfolioTaxable: number;
    portfolioTaxableBasis: number;
    portfolioPreTax: number;
    portfolioRoth: number;

    ssMonthlyBenefit: number;
    ssClaimAge: number;

    allocationStock: number;
    allocationBond: number;

    filingStatus: FilingStatus;

    inflationRate: number;
    stockReturn: number;
    bondReturn: number;

    withdrawalStrategy: 'constant_dollar' | 'constant_percentage';
    withdrawalRate: number;
    withdrawalMin: number;
    withdrawalMinRate: number;

    rothStrategy: 'none' | 'fill_bracket' | 'fixed_amount';
    rothTargetBracket: number;
    rothFixedAmount: number;

    isRothAutoOptimized: boolean;
    preTaxDiscount: number;
    medicarePeopleCount: number;
    includeBaseMedicare: boolean;
    enableMedicaidSafetyNet: boolean;
    additionalIncome: number;
    additionalIncomeEndAge: number;
    enableTaxGainHarvesting: boolean;
    taxState: string;
}

interface CalculatorInputProps {
    state: CalculatorState;
    onChange: (newState: CalculatorState) => void;
}

const STYLES = {
    // Layout Containers
    grid2: "grid grid-cols-2 gap-2",
    grid3: "grid grid-cols-3 gap-2",
    cardHighlight: "p-2 bg-primary/10 rounded-xl border border-primary/20 shadow-inner group transition-all hover:bg-primary/[0.12] space-y-0",

    // Typography
    sectionHeader: "text-[12px] font-black uppercase tracking-widest text-primary mt-4 mb-4 flex items-center gap-2",
    label: "text-[11px] font-medium text-primary/80 leading-none block mb-1",
    labelHeading: "text-[11px] font-black text-primary/80 leading-none block mb-1.5",
    labelSub: "text-[10px] font-medium leading-none mb-0.5 block", // Add color via className

    // Form Elements
    input: "w-full shadow-sm transition-all px-2 rounded-md border-primary/20 focus:border-primary/50",
    inputSm: "h-6 text-xs font-bold",
    inputMd: "h-7 text-sm font-bold",
    inputMono: "font-mono font-bold text-xs bg-muted/30 border-transparent",

    select: "flex w-full rounded-md border border-primary/20 bg-background shadow-sm focus:ring-1 focus:ring-primary outline-none transition-all duration-300 cursor-pointer",
    selectSm: "h-6 px-1.5 py-0 text-[10px] font-medium",
    selectMd: "h-7 px-1.5 py-0 text-[11px] font-bold",

    // Special
    spendingInput: "h-8 text-xl font-black bg-transparent border-none focus-visible:ring-0 px-2 shadow-none",
}

const COLOR_VARIANTS = {
    default: {
        label: "",
        input: "",
        unit: "text-primary/70",
    },
    blue: {
        label: "text-blue-500",
        input: "text-blue-600 dark:text-blue-400 border-blue-500/20",
        unit: "text-blue-500/70",
    },
    orange: {
        label: "text-orange-500",
        input: "text-orange-600 dark:text-orange-400 border-orange-500/20",
        unit: "text-orange-500/70",
    },
    green: {
        label: "text-green-600 dark:text-green-400",
        input: "text-green-600 dark:text-green-400 border-green-500/20",
        unit: "text-green-600/70",
    },
    red: {
        label: "text-red-600",
        input: "text-red-600 bg-red-500/5 border-red-500/10",
        unit: "text-red-600/70",
    },
} as const;

type ColorVariant = keyof typeof COLOR_VARIANTS;

interface UnitInputProps extends Omit<React.ComponentProps<typeof Input>, 'color'> {
    unit?: React.ReactNode;
    color?: ColorVariant;
}

// Custom helper to handle comma formatting
function formatNumberWithCommas(value: number | string): string {
    if (value === '' || value === undefined || value === null) return '';
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    if (isNaN(num)) return String(value);
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function UnitInput({ className, unit, color = 'default', type = "text", value, onChange, ...props }: UnitInputProps) {
    const styles = COLOR_VARIANTS[color];
    const [localValue, setLocalValue] = React.useState(formatNumberWithCommas(value as number));
    const isPrefix = unit === '$';
    const inputRef = React.useRef<HTMLInputElement>(null);
    const selectionRef = React.useRef<number | null>(null);

    // Sync local value when prop changes (e.g. from calculation updates)
    React.useLayoutEffect(() => {
        const numericLocal = parseFloat(localValue.replace(/,/g, ''));
        const numericProp = Number(value);
        if (Math.abs(numericLocal - numericProp) > 0.001 || isNaN(numericLocal)) {
            const formatted = formatNumberWithCommas(numericProp);
            setLocalValue(formatted);
        }
    }, [value]);

    // Restore selection after localValue update
    React.useLayoutEffect(() => {
        if (inputRef.current && selectionRef.current !== null) {
            inputRef.current.setSelectionRange(selectionRef.current, selectionRef.current);
            selectionRef.current = null;
        }
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const numeric = raw.replace(/[^0-9.]/g, '');

        // Track selection before update
        const input = e.target;
        const selectionStart = input.selectionStart;
        const oldLength = localValue.length;

        setLocalValue(raw);

        if (onChange) {
            // Update selectionRef to account for commas if necessary
            // For now, just keep the raw position and adjust based on length change if simple
            selectionRef.current = selectionStart;

            e.target.value = numeric;
            onChange(e);
        }
    };

    const handleBlur = () => {
        const numeric = parseFloat(localValue.replace(/,/g, ''));
        if (!isNaN(numeric)) {
            setLocalValue(numeric.toLocaleString('en-US', { maximumFractionDigits: 2 }));
        }
    };

    return (
        <div className="relative">
            <Input
                ref={inputRef}
                type="text"
                className={cn(
                    STYLES.input,
                    STYLES.inputSm,
                    styles.input,
                    className,
                    unit && (isPrefix ? "pl-5" : "pr-5")
                )}
                value={localValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                {...props}
            />
            {unit && (
                <span className={cn(
                    "absolute top-1/2 -translate-y-1/2 text-[10px] font-bold pointer-events-none select-none",
                    isPrefix ? "left-1.5" : "right-1.5",
                    styles.unit
                )}>
                    {unit}
                </span>
            )}
        </div>
    )
}

interface FieldProps extends React.ComponentProps<'div'> {
    label: string;
    subLabel?: boolean;
    color?: ColorVariant;
}

function Field({ label, subLabel, color = 'default', children, className, ...props }: FieldProps) {
    const styles = COLOR_VARIANTS[color];

    return (
        <div className={cn("space-y-0.5 text-left", className)} {...props}>
            <Label className={cn(subLabel ? STYLES.labelSub : STYLES.label, styles.label)}>
                {label}
            </Label>
            {children}
        </div>
    )
}

function CompactInput({ label, color = 'default', subLabel = true, className, ...props }: UnitInputProps & { label: string, subLabel?: boolean }) {
    return (
        <Field label={label} color={color} subLabel={subLabel}>
            <UnitInput color={color} className={className} {...props} />
        </Field>
    )
}

export function CalculatorInput({ state, onChange }: CalculatorInputProps) {
    const [openSections, setOpenSections] = React.useState<string[]>([]);

    const toggleSection = (section: string) => {
        setOpenSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    }

    const handleChange = (field: keyof CalculatorState, value: string | number | boolean) => {
        const newState = { ...state } as any;

        if (typeof state[field] === 'number') {
            let numVal = typeof value === 'boolean' ? (value ? 1 : 0) : parseFloat(String(value));
            numVal = isNaN(numVal) ? 0 : numVal;
            newState[field] = numVal;

            const totalPortfolio = newState.portfolioTaxable + newState.portfolioPreTax + newState.portfolioRoth;
            if (totalPortfolio > 0) {
                if (field === 'annualSpending') {
                    newState.withdrawalRate = Number(((numVal / totalPortfolio) * 100).toFixed(2));
                } else if (field === 'withdrawalRate') {
                    newState.annualSpending = Math.round((numVal / 100) * totalPortfolio);
                } else if (['portfolioTaxable', 'portfolioPreTax', 'portfolioRoth'].includes(field as string)) {
                    newState.withdrawalRate = Number(((newState.annualSpending / totalPortfolio) * 100).toFixed(2));
                }
            }
        } else {
            newState[field] = value;
        }
        onChange(newState as CalculatorState);
    }

    return (
        <Card className="w-full border-primary/20 shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/50 border-b p-2 text-left">
                <CardTitle className="text-xl font-black text-primary">Input Parameters</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="p-2 space-y-2 bg-primary/[0.02]">
                    <div className={STYLES.grid3}>
                        <Field label="Current Age" className="col-span-1" subLabel={false}>
                            <Input className={cn(STYLES.input, STYLES.inputMd)} value={state.currentAge} onChange={(e) => handleChange('currentAge', e.target.value)} />
                        </Field>
                        <Field label="Filing Status" className="col-span-2" subLabel={false}>
                            <select className={cn(STYLES.select, STYLES.selectMd)} value={state.filingStatus} onChange={(e) => handleChange('filingStatus', e.target.value)}>
                                <option value="single">Single</option>
                                <option value="married_joint">Married Joint</option>
                                <option value="married_separate">Married Separate</option>
                                <option value="head_household">Head of House</option>
                            </select>
                        </Field>
                    </div>

                    <div className={STYLES.cardHighlight}>
                        <Label className={STYLES.labelHeading}>Goal Annual Spending</Label>
                        <UnitInput
                            className={STYLES.spendingInput}
                            value={state.annualSpending}
                            onChange={(e) => handleChange('annualSpending', e.target.value)}
                            unit="$"
                        />
                    </div>

                    <Label className={STYLES.labelHeading}>Current Portfolios</Label>
                    <div className="space-y-2">
                        <CompactInput
                            label="Taxable (Brokerage)"
                            className={STYLES.inputMono}
                            value={state.portfolioTaxable}
                            onChange={(e) => handleChange('portfolioTaxable', e.target.value)}
                            unit="$"
                        />
                        <div className={STYLES.grid2}>
                            <CompactInput
                                label="Pre-Tax"
                                className={STYLES.inputMono}
                                value={state.portfolioPreTax}
                                onChange={(e) => handleChange('portfolioPreTax', e.target.value)}
                                unit="$"
                            />
                            <CompactInput
                                label="Roth Balance"
                                className={STYLES.inputMono}
                                value={state.portfolioRoth}
                                onChange={(e) => handleChange('portfolioRoth', e.target.value)}
                                unit="$"
                            />
                        </div>
                    </div>
                </div>

                <Accordion className="w-full border-t border-primary/10">
                    <AccordionItem className="px-2 transition-colors hover:bg-muted/5">
                        <AccordionTrigger isOpen={openSections.includes('advanced')} onToggle={() => toggleSection('advanced')} className="py-1.5">
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Advanced Assumptions</span>
                        </AccordionTrigger>
                        <AccordionContent isOpen={openSections.includes('advanced')} className="pt-0 pb-4 space-y-4">
                            <div className="space-y-2">
                                <h4 className={STYLES.sectionHeader}>
                                    <span className="text-primary/50 text-xs">◈</span> Account Assumptions
                                </h4>
                                <div className="block text-left">
                                    <Field label="Plan Until Age" className="space-y-0.5">
                                        <Input className={cn(STYLES.input, STYLES.inputSm, "max-w-[60px]")} value={state.simulationEndAge} onChange={(e) => handleChange('simulationEndAge', e.target.value)} />
                                    </Field>
                                </div>

                                <div className="space-y-1 pt-0">
                                    <Label className={STYLES.label}>Asset Allocation</Label>
                                    <div className={STYLES.grid2}>
                                        <CompactInput
                                            label="Equity"
                                            color="blue"
                                            value={state.allocationStock}
                                            onChange={(e) => handleChange('allocationStock', e.target.value)}
                                            unit="%"
                                        />
                                        <CompactInput
                                            label="Bonds"
                                            color="orange"
                                            value={state.allocationBond}
                                            onChange={(e) => handleChange('allocationBond', e.target.value)}
                                            unit="%"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className={STYLES.grid2}>
                                        <CompactInput label="Stock Ret" color="blue" value={state.stockReturn} onChange={(e) => handleChange('stockReturn', e.target.value)} unit="%" />
                                        <CompactInput label="Bond Ret" color="orange" value={state.bondReturn} onChange={(e) => handleChange('bondReturn', e.target.value)} unit="%" />
                                    </div>
                                    <div className={STYLES.grid2}>
                                        <CompactInput label="Cost Basis" color="blue" value={state.portfolioTaxableBasis} onChange={(e) => handleChange('portfolioTaxableBasis', e.target.value)} unit="%" />
                                        <CompactInput label="Inflation" color="red" value={state.inflationRate} onChange={(e) => handleChange('inflationRate', e.target.value)} unit="%" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className={STYLES.grid2}>
                                        <CompactInput label="Pre-Tax Disc" color="green" value={state.preTaxDiscount} onChange={(e) => handleChange('preTaxDiscount', e.target.value)} unit="%" />
                                    </div>
                                    <p className="text-[9px] text-muted-foreground leading-tight italic px-1">
                                        Note: Above used for calculating Roth-eq net worth.
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <Field label="State" subLabel={false}>
                                        <select className={cn(STYLES.select, STYLES.selectSm)} value={state.taxState} onChange={(e) => handleChange('taxState', e.target.value)}>
                                            {Object.entries(STATE_TAX_RATES).map(([code, data]) => (
                                                <option key={code} value={code}>{data.name} ({(data.rate * 100).toFixed(1)}%)</option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className={STYLES.sectionHeader}>
                                    <span className="text-primary/50 text-xs">◈</span> Withdrawal Strategy
                                </h4>
                                <div className="text-left mb-1">
                                    <Field label="Methodology">
                                        <select className={cn(STYLES.select, STYLES.selectSm)} value={state.withdrawalStrategy} onChange={(e) => handleChange('withdrawalStrategy', e.target.value)}>
                                            <option value="constant_dollar">Inflation Fixed Dollar</option>
                                            <option value="constant_percentage">Percentage of Balance</option>
                                        </select>
                                    </Field>
                                </div>

                                <div className={STYLES.grid2}>
                                    <CompactInput label="Initial Rate" value={state.withdrawalRate} onChange={(e) => handleChange('withdrawalRate', e.target.value)} unit="%" subLabel={false} />
                                    <div></div>
                                </div>

                                <div className={cn(STYLES.grid2, "pt-1")}>
                                    <CompactInput label="Min Withdrawal" color="orange" value={state.withdrawalMin} onChange={(e) => handleChange('withdrawalMin', e.target.value)} unit="$" />
                                    <CompactInput label="Floor Rate" color="orange" step="0.1" value={state.withdrawalMinRate} onChange={(e) => handleChange('withdrawalMinRate', e.target.value)} unit="%" />
                                </div>
                                <div className={cn(STYLES.grid2, "pt-1")}>
                                    <CompactInput label="Add'l Income" color="green" value={state.additionalIncome} onChange={(e) => handleChange('additionalIncome', e.target.value)} unit="$" />
                                    <Field label="Stop Age" color="green" subLabel>
                                        <Input className={cn(STYLES.input, STYLES.inputSm, "text-green-600 border-green-500/20")} value={state.additionalIncomeEndAge} onChange={(e) => handleChange('additionalIncomeEndAge', e.target.value)} />
                                    </Field>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className={STYLES.sectionHeader}>
                                    <span className="text-primary/50 text-xs">◈</span> Optimization & Security
                                </h4>
                                <div className="flex items-center justify-between p-1.5 bg-primary/5 rounded-lg border border-primary/10 shadow-sm mb-1.5">
                                    <div>
                                        <Label className="text-[11px] font-medium text-primary">Roth Optimization</Label>
                                        <p className="text-[9px] font-medium text-muted-foreground">Auto-Simulate</p>
                                    </div>
                                    <Switch className="scale-[0.7]" checked={state.isRothAutoOptimized} onCheckedChange={(c) => onChange({ ...state, isRothAutoOptimized: c })} />
                                </div>

                                <div className="flex items-center justify-between p-1.5 bg-primary/5 rounded-lg border border-primary/10 shadow-sm mb-1.5">
                                    <div>
                                        <Label className="text-[11px] font-medium text-primary">Tax Harvesting</Label>
                                        <p className="text-[9px] font-medium text-muted-foreground">Basis Reset</p>
                                    </div>
                                    <Switch className="scale-[0.7]" checked={state.enableTaxGainHarvesting} onCheckedChange={(c) => onChange({ ...state, enableTaxGainHarvesting: c })} />
                                </div>

                                <div className="space-y-1">
                                    <div className={STYLES.grid2}>
                                        <CompactInput label="Monthly SS" color="green" value={state.ssMonthlyBenefit} onChange={(e) => handleChange('ssMonthlyBenefit', e.target.value)} unit="$" />
                                        <Field label="SS Start Age" color="green" subLabel>
                                            <Input className={cn(STYLES.input, STYLES.inputSm, "text-green-600 border-green-500/20")} value={state.ssClaimAge} onChange={(e) => handleChange('ssClaimAge', e.target.value)} />
                                        </Field>
                                    </div>
                                </div>

                                <div className="space-y-1.5 pt-0">
                                    <div className="flex items-center justify-between group">
                                        <Label className="text-[10px] font-medium text-primary">Medicaid Safety</Label>
                                        <Switch className="scale-[0.6] origin-right" checked={state.enableMedicaidSafetyNet} onCheckedChange={(val) => handleChange('enableMedicaidSafetyNet', val)} />
                                    </div>
                                    <div className="flex items-center justify-between group">
                                        <Label className="text-[10px] font-medium text-primary">Medicare Part B</Label>
                                        <Switch className="scale-[0.6] origin-right" checked={state.includeBaseMedicare} onCheckedChange={(val) => handleChange('includeBaseMedicare', val)} />
                                    </div>
                                    <div className="space-y-0 pt-0 text-left">
                                        <div className="flex gap-3">
                                            {[1, 2].map(num => (
                                                <label key={num} className="flex items-center gap-1 cursor-pointer group">
                                                    <input type="radio" className="w-2.5 h-2.5 accent-primary opacity-70" checked={state.medicarePeopleCount === num} onChange={() => handleChange('medicarePeopleCount', num)} />
                                                    <span className="text-[8px] font-medium text-primary/70 group-hover:text-primary transition-all leading-none">
                                                        {num === 1 ? 'Indiv' : 'Couple'}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card >
    )
}
