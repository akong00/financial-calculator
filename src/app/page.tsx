import { ScenarioManager } from '@/components/scenarios/ScenarioManager';

export default function Home() {
  return (
    <main className="flex min-h-screen bg-background overflow-hidden">
      <div className="w-full h-screen">
        <ScenarioManager />
      </div>
    </main>
  );
}
