"use client";

import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

import { TimerBar } from "./timer-bar";
import { ProgressIndicator } from "./progress-indicator";

export type ExamQuestion = {
  id: string;
  text: string;
  image_url: string | null;
  time_seconds: number;
  options: { id: string; text: string }[];
};

type QuestionScreenProps = {
  question: ExamQuestion;
  questionIndex: number;
  totalQuestions: number;
  remainingMs: number;
  selectedOptionId: string | null;
  locked: boolean;
  onSelectOption: (optionId: string) => void;
};

const OPTION_BADGES = [
  {
    badge: "A",
    badgeClass: "bg-pink-500 text-white",
    cardClass:
      "border-pink-200 hover:border-pink-500 hover:bg-pink-50/70",
  },
  {
    badge: "B",
    badgeClass: "bg-violet-500 text-white",
    cardClass:
      "border-violet-200 hover:border-violet-500 hover:bg-violet-50/70",
  },
  {
    badge: "C",
    badgeClass: "bg-amber-500 text-white",
    cardClass:
      "border-amber-200 hover:border-amber-500 hover:bg-amber-50/70",
  },
  {
    badge: "D",
    badgeClass: "bg-teal-500 text-white",
    cardClass:
      "border-teal-200 hover:border-teal-500 hover:bg-teal-50/70",
  },
] as const;

export function QuestionScreen({
  question,
  questionIndex,
  totalQuestions,
  remainingMs,
  selectedOptionId,
  locked,
  onSelectOption,
}: QuestionScreenProps) {
  const totalMs = question.time_seconds * 1000;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* Top: progress + timer */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ProgressIndicator
          current={questionIndex + 1}
          total={totalQuestions}
        />
      </div>
      <TimerBar totalMs={totalMs} remainingMs={remainingMs} />

      {/* Image + text */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-md shadow-pink-100/40">
        {question.image_url ? (
          <div className="relative aspect-video w-full bg-muted">
            <Image
              src={question.image_url}
              alt=""
              fill
              priority
              sizes="(max-width: 768px) 100vw, 800px"
              className="object-cover"
            />
          </div>
        ) : null}
        <div className="px-6 py-5 sm:px-8 sm:py-6">
          <h2 className="text-balance text-xl font-semibold leading-snug sm:text-2xl">
            {question.text}
          </h2>
        </div>
      </div>

      {/* 4 option boxes */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {question.options.map((opt, i) => {
          const meta = OPTION_BADGES[i] ?? OPTION_BADGES[0];
          const isSelected = selectedOptionId === opt.id;
          const dimmed = locked && !isSelected;

          return (
            <button
              key={opt.id}
              type="button"
              disabled={locked}
              onClick={() => onSelectOption(opt.id)}
              className={[
                "group flex w-full items-center gap-4 rounded-xl border-2 bg-card px-4 py-4 text-left shadow-sm transition-all",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400",
                isSelected
                  ? "border-foreground bg-foreground/5 shadow-md"
                  : meta.cardClass,
                dimmed ? "opacity-50" : "",
                locked && isSelected ? "scale-[0.99]" : "",
                !locked ? "active:scale-[0.99] hover:shadow-md" : "",
                "disabled:cursor-not-allowed",
              ].join(" ")}
            >
              <span
                className={[
                  "flex size-10 shrink-0 items-center justify-center rounded-lg text-base font-bold",
                  meta.badgeClass,
                ].join(" ")}
              >
                {meta.badge}
              </span>
              <span className="flex-1 text-base font-medium leading-snug sm:text-lg">
                {opt.text}
              </span>
              {isSelected ? (
                <CheckCircle2 className="size-6 shrink-0 text-foreground" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
