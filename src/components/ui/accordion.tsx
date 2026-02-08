
import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const Accordion = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("w-full", className)} {...props} />
))
Accordion.displayName = "Accordion"

const AccordionItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("border-b", className)} {...props} />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { isOpen?: boolean, onToggle?: () => void }
>(({ className, children, isOpen, onToggle, ...props }, ref) => (
    <div className="flex">
        <button
            ref={ref}
            type="button"
            onClick={onToggle}
            className={cn(
                "flex flex-1 items-center justify-between py-4 font-medium transition-all duration-300 cursor-pointer text-left",
                className
            )}
            {...props}
        >
            {children}
            <ChevronDown
                className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-300",
                    isOpen && "rotate-180"
                )}
            />
        </button>
    </div>
))
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { isOpen?: boolean }
>(({ className, children, isOpen, ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                "text-sm transition-all duration-300 ease-in-out",
                isOpen ? "max-h-[5000px] opacity-100 overflow-visible" : "max-h-0 opacity-0 overflow-hidden",
                className
            )}
            {...props}
        >
            <div className="pt-0">{children}</div>
        </div>
    )
})
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
