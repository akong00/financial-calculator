import { InputSectionConfig } from "@/types/scenario-types";
import { GoalsSection } from "./sections/GoalsSection";
import { AssetsSection } from "./sections/AssetsSection";
import { LiabilitiesSection } from "./sections/LiabilitiesSection";
import { IncomeSection } from "./sections/IncomeSection";
import { ExpensesSection } from "./sections/ExpensesSection";
import { OptimizationsSection } from "./sections/OptimizationsSection";
import { Target, Wallet, CreditCard, DollarSign, TrendingDown, Settings, type LucideIcon } from "lucide-react";

/**
 * Registry of all input sections
 * To add a new section, simply add it to this array
 */
export const INPUT_SECTIONS: Array<InputSectionConfig & { icon?: LucideIcon }> = [
    {
        id: "goals",
        label: "Goals",
        icon: Target,
        component: GoalsSection,
        defaultCollapsed: false
    },
    {
        id: "assets",
        label: "Assets",
        icon: Wallet,
        component: AssetsSection,
        defaultCollapsed: false
    },
    {
        id: "liabilities",
        label: "Liabilities",
        icon: CreditCard,
        component: LiabilitiesSection,
        defaultCollapsed: false
    },
    {
        id: "income",
        label: "Income",
        icon: DollarSign,
        component: IncomeSection,
        defaultCollapsed: false
    },
    {
        id: "expenses",
        label: "Expenses",
        icon: TrendingDown,
        component: ExpensesSection,
        defaultCollapsed: false
    },
    {
        id: "optimizations",
        label: "Optimizations & Other",
        icon: Settings,
        component: OptimizationsSection,
        defaultCollapsed: true
    }
];
