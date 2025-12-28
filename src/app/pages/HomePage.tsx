import { TimerSection } from "../components/TimerSection";

export function HomePage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-28">
        <TimerSection />
      </div>
    </div>
  );
}
