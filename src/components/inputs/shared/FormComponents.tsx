import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectOption } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const STYLES = {
    // Layout Containers
    grid2: "grid grid-cols-2 gap-2",
    grid3: "grid grid-cols-3 gap-2",
    cardHighlight: "p-2 bg-primary/10 rounded-xl border border-primary/20 shadow-inner group transition-all hover:bg-primary/[0.12] space-y-0",

    // Typography
    sectionHeader: "text-[12px] font-black uppercase tracking-widest text-primary mt-4 mb-4 flex items-center gap-2",
    label: "text-[11px] font-medium text-primary/80 leading-none block mb-1",
    labelHeading: "text-[11px] font-black text-primary/80 leading-none block mb-1.5",
    labelSub: "text-[10px] font-medium leading-none mb-0.5 block",

    // Form Elements
    input: "w-full shadow-sm transition-all px-2 rounded-md border-primary/40 focus:border-primary/70 focus:ring-1 focus:ring-primary/20",
    inputSm: "h-6 text-xs font-bold",
    inputMd: "h-7 text-sm font-bold",
    inputMono: "font-mono font-bold text-xs bg-muted/30 border-transparent",

    select: "flex w-full rounded-md border border-primary/40 bg-background shadow-sm focus:ring-1 focus:ring-primary outline-none transition-all duration-300 cursor-pointer pr-10",
    selectSm: "h-6 px-2 py-0 text-[10px] font-medium",
    selectMd: "h-7 px-3 py-0 text-[11px] font-bold",

    // Special
    spendingInput: "h-8 text-xl font-black bg-transparent border-none focus-visible:ring-0 px-2 shadow-none",
} as const;

export const COLOR_VARIANTS = {
    default: {
        label: "",
        input: "",
        unit: "text-primary/70",
    },
    blue: {
        label: "text-blue-500",
        input: "text-blue-600 dark:text-blue-400 border-blue-500/40",
        unit: "text-blue-500/70",
    },
    orange: {
        label: "text-orange-500",
        input: "text-orange-600 dark:text-orange-400 border-orange-500/40",
        unit: "text-orange-500/70",
    },
    green: {
        label: "text-green-600 dark:text-green-400",
        input: "text-green-600 dark:text-green-400 border-green-500/40",
        unit: "text-green-600/70",
    },
    red: {
        label: "text-red-600",
        input: "text-red-600 bg-red-500/5 border-red-500/30",
        unit: "text-red-600/70",
    },
} as const;

export type ColorVariant = keyof typeof COLOR_VARIANTS;

export interface UnitInputProps extends Omit<React.ComponentProps<typeof Input>, 'color'> {
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

export function UnitInput({ className, unit, color = 'default', type = "text", value, onChange, ...props }: UnitInputProps) {
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
    }, [value, localValue]);

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

        setLocalValue(raw);

        if (onChange) {
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

export interface FieldProps extends React.ComponentProps<'div'> {
    label: string;
    subLabel?: boolean;
    color?: ColorVariant;
}

export function Field({ label, subLabel, color = 'default', children, className, ...props }: FieldProps) {
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

export function CompactInput({ label, color = 'default', subLabel = true, className, ...props }: UnitInputProps & { label: string, subLabel?: boolean }) {
    return (
        <Field label={label} color={color} subLabel={subLabel}>
            <UnitInput color={color} className={className} {...props} />
        </Field>
    )
}

export function SimpleSelect({ label, value, onChange, options, subLabel = true, className }: { label: string, value: string, onChange: (val: string) => void, options: SelectOption[], subLabel?: boolean, className?: string }) {
    return (
        <Field label={label} subLabel={subLabel}>
            <Select value={value} onChange={onChange} options={options} className={className} />
        </Field>
    );
}
