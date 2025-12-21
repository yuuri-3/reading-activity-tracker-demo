import { TimerSection } from '../components/TimerSection';

export function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-2">計測</h1>
        <p className="text-sm text-muted-foreground">
          すぐに計測を開始できます
        </p>
      </div>
      
      <TimerSection />
    </div>
  );
}
