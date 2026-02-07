
import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
    ({ value, onChange, options, placeholder = "Select...", className, size = 'md' }, ref) => {
        const [isOpen, setIsOpen] = React.useState(false);
        const containerRef = React.useRef<HTMLDivElement>(null);

        const selectedOption = options.find(opt => opt.value === value);

        React.useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        const sizes = {
            sm: "h-6 text-[10px] font-bold px-1.5",
            md: "h-7 text-[11px] font-bold px-2",
            lg: "h-9 text-xs font-bold px-3",
        };

        return (
            <div className={cn("relative w-full", className)} ref={containerRef}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "flex w-full items-center justify-between rounded-md border border-primary/40 bg-background shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary hover:bg-muted/50 cursor-pointer",
                        sizes[size as keyof typeof sizes]
                    )}
                >
                    <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform duration-200", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                    <div className="absolute z-50 mt-1 max-h-60 min-w-full w-max overflow-auto rounded-lg border border-primary/20 bg-card/98 backdrop-blur-md p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {options.map((option) => (
                            <div
                                key={option.value}
                                className={cn(
                                    "flex w-full cursor-pointer select-none items-center rounded-md px-3 py-1.5 text-[11px] outline-none transition-all duration-150 mb-0.5 last:mb-0",
                                    option.value === value
                                        ? "bg-primary/20 text-primary font-black"
                                        : "hover:bg-primary/10 hover:translate-x-1"
                                )}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                            >
                                <span className="flex-1 truncate">{option.label}</span>
                                {option.value === value && (
                                    <div className="flex h-4 w-4 items-center justify-center animate-in zoom-in duration-300">
                                        <Check className="h-3.5 w-3.5" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }
)
Select.displayName = "Select"

export { Select }
