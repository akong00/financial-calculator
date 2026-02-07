import * as React from "react";
import { CalculatorState, Milestone } from "@/types/scenario-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STYLES, COLOR_VARIANTS, ColorVariant } from "./FormComponents";
import { cn } from "@/lib/utils";
import { ChevronDown, Flag, X } from "lucide-react";

interface AgeMilestoneInputProps {
    label: string;
    value: number | string | undefined;
    onChange: (value: number | string | undefined) => void;
    milestones: Milestone[];
    color?: ColorVariant;
    className?: string;
}

export function AgeMilestoneInput({ label, value, onChange, milestones = [], color = 'default', className }: AgeMilestoneInputProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const isMilestone = typeof value === 'string';
    const selectedMilestone = isMilestone ? milestones?.find(m => m.id === value) : null;
    const styles = COLOR_VARIANTS[color];

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const displayValue = isMilestone ? (selectedMilestone?.name || 'Invalid Milestone') : (value?.toString() || '');

    return (
        <div className={cn("space-y-0.5 text-left relative", className)} ref={containerRef}>
            <Label className={cn(STYLES.label, styles.label)}>
                {label}
            </Label>
            <div className="relative group">
                <Input
                    type="text"
                    className={cn(
                        STYLES.input,
                        STYLES.inputSm,
                        styles.input,
                        isMilestone && "bg-purple-500/10 border-purple-500/40 text-purple-600 font-bold pr-16"
                    )}
                    value={displayValue}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                            onChange(undefined);
                            return;
                        }
                        const num = parseFloat(val);
                        if (!isNaN(num)) {
                            onChange(num);
                        }
                    }}
                    placeholder="Enter age..."
                    readOnly={isMilestone}
                />

                <div className="absolute right-0 top-0 bottom-0 flex">
                    {isMilestone && (
                        <button
                            onClick={() => onChange(undefined)}
                            className="bg-purple-100 hover:bg-purple-200 text-purple-600 px-1.5 flex items-center border-l border-purple-200 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={cn(
                            "px-2 flex items-center bg-muted/30 hover:bg-muted/50 rounded-r-md transition-colors",
                            isMilestone ? "border-l border-purple-200" : "border-l border-primary/40"
                        )}
                    >
                        {isMilestone ? <Flag className="w-3 h-3 text-purple-600" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                    </button>
                </div>

                {isOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-auto rounded-lg border border-primary/20 bg-card/98 backdrop-blur-md p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-1 px-2 text-[10px] uppercase font-black tracking-widest text-primary/40 border-b border-primary/5 mb-1">
                            Pick a Milestone
                        </div>
                        {milestones.length === 0 && (
                            <div className="p-3 text-center text-[11px] text-muted-foreground italic">
                                No milestones defined yet.
                            </div>
                        )}
                        {milestones.map((m) => (
                            <div
                                key={m.id}
                                className={cn(
                                    "flex w-full cursor-pointer select-none items-center rounded-md px-3 py-1.5 text-[11px] outline-none transition-all duration-150 mb-0.5 last:mb-0",
                                    m.id === value
                                        ? "bg-purple-500/20 text-purple-700 font-black"
                                        : "hover:bg-purple-500/10 hover:translate-x-1"
                                )}
                                onClick={() => {
                                    onChange(m.id);
                                    setIsOpen(false);
                                }}
                            >
                                <Flag className="w-3 h-3 mr-2 opacity-70" />
                                <span className="flex-1 truncate">{m.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
