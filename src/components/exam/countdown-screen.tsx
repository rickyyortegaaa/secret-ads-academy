"use client";

import { useEffect, useState } from "react";

type CountdownScreenProps = {
  onComplete: () => void;
};

const SEQUENCE: Array<{ value: string; sub?: string }> = [
  { value: "3" },
  { value: "2" },
  { value: "1" },
  { value: "¡YA!", sub: "Empieza el examen" },
];

const STEP_MS = 1000;

export function CountdownScreen({ onComplete }: CountdownScreenProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= SEQUENCE.length) {
      // After "¡YA!" hold ~700ms then transition.
      const id = setTimeout(onComplete, 700);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setStep((v) => v + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [step, onComplete]);

  const current = SEQUENCE[Math.min(step, SEQUENCE.length - 1)];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Brand gradient backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #EC4899 0%, #BE185D 50%, #831843 100%)",
        }}
      />

      {/* Soft animated rings */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          aria-hidden
          className="size-[400px] animate-ping rounded-full bg-white/20 sm:size-[600px]"
        />
      </div>

      {/* Number / final text */}
      <div
        key={step}
        className="relative z-10 flex flex-col items-center text-center text-white"
        style={{
          animation:
            "countdown-pop 1s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        }}
      >
        <span
          className={`tabular-nums font-bold drop-shadow-2xl ${
            current.value.length > 2
              ? "text-6xl sm:text-8xl"
              : "text-[160px] leading-none sm:text-[240px]"
          }`}
          style={{
            fontFamily:
              "var(--font-sans), system-ui, -apple-system, sans-serif",
          }}
        >
          {current.value}
        </span>
        {current.sub ? (
          <span className="mt-4 text-sm font-medium uppercase tracking-[0.4em] sm:text-base">
            {current.sub}
          </span>
        ) : (
          <span className="mt-4 text-sm font-medium uppercase tracking-[0.4em] opacity-80">
            Preparado
          </span>
        )}
      </div>

      <style jsx>{`
        @keyframes countdown-pop {
          0% {
            transform: scale(0.4);
            opacity: 0;
          }
          25% {
            transform: scale(1.1);
            opacity: 1;
          }
          70% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(0.92);
            opacity: 0.85;
          }
        }
      `}</style>
    </div>
  );
}
