type ProgressIndicatorProps = {
  current: number;
  total: number;
};

export function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">
        Pregunta{" "}
        <span className="text-foreground font-semibold">{current}</span> /{" "}
        {total}
      </span>
      <div className="hidden gap-1 sm:flex">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-6 rounded-full transition-colors ${
              i < current - 1
                ? "bg-foreground/80"
                : i === current - 1
                  ? "brand-gradient"
                  : "bg-muted"
            }`}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
