import { LucideLineChart } from 'lucide-react';

import { FinancialCalculator } from '@/components/calculator/FinancialCalculator';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24 bg-background">
      <div className="w-full max-w-[1600px]">
        <FinancialCalculator />
      </div>
    </main>
  );
}
