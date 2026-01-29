import { LucideLineChart } from 'lucide-react';

import { FinancialCalculator } from '@/components/calculator/FinancialCalculator';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24 bg-background">
      <div className="z-10 max-w-[1600px] w-full items-center justify-between font-mono text-sm lg:flex mb-8">
        <div className="flex items-center gap-4">
          <p className="flex justify-center border bg-card text-card-foreground p-4 rounded-xl shadow-sm">
            Actually Good Retirement Calculator
          </p>
          <ThemeToggle />
        </div>
      </div>

      <div className="w-full max-w-[1600px]">
        <FinancialCalculator />
      </div>
    </main>
  );
}
