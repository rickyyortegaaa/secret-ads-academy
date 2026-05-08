"use client";

type TimerBarProps = {
  totalMs: number;
  remainingMs: number;
};

export function TimerBar({ totalMs, remainingMs }: TimerBarProps) {
  const pct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const danger = pct < 25;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>Tiempo restante</span>
        <span
          className={
            danger
              ? "tabular-nums text-destructive font-bold"
              : "tabular-nums text-foreground"
          }
        >
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:
          {String(seconds % 60).padStart(2, "0")}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
            danger ? "bg-destructive" : "brand-gradient"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
