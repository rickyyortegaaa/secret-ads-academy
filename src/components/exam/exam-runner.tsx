"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, ShieldAlert } from "lucide-react";

import {
  finishAttemptAction,
  submitAnswerAction,
} from "@/app/actions/exam";

import { QuestionScreen, type ExamQuestion } from "./question-screen";
import { ReviewScreen, type ReviewAnswer } from "./review-screen";
import { ResultsScreen } from "./results-screen";
import { ExamCompleted } from "./exam-completed";

type ExamRunnerProps = {
  attemptId: string;
  studentName: string;
  questions: ExamQuestion[];
  /** Pre-existing answers (used to resume after refresh). */
  initialAnswers: Record<string, ReviewAnswer>;
  /** True if attempt was already finished (returning user). */
  alreadyFinished: boolean;
  onLogoutAction: () => Promise<void>;
};

const FEEDBACK_DELAY_MS = 600;

type Phase = "running" | "review" | "submitting" | "submitted";

export function ExamRunner({
  attemptId,
  studentName,
  questions,
  initialAnswers,
  alreadyFinished,
  onLogoutAction,
}: ExamRunnerProps) {
  /* ----------------------------------------------------------------- */
  /*  Initial phase + index calculation (resume support)               */
  /* ----------------------------------------------------------------- */
  const computeStartIndex = () => {
    // First question without a "complete" answer
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const a = initialAnswers[q.id];
      if (!a) return i;
      if (q.type === "multiple_choice" && !a.selectedOptionId) return i;
      if (q.type === "written" && !(a.textAnswer && a.textAnswer.trim().length >= 20))
        return i;
    }
    return questions.length;
  };

  const [phase, setPhase] = useState<Phase>(() => {
    if (alreadyFinished) return "submitted";
    return computeStartIndex() >= questions.length ? "review" : "running";
  });
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(computeStartIndex(), questions.length - 1)
  );

  /** Map of questionId → current answer (selected option or text). */
  const [answers, setAnswers] = useState<Record<string, ReviewAnswer>>(
    () => initialAnswers
  );

  /** Working copy for text input on the current written question. */
  const [draftText, setDraftText] = useState<string>("");

  const [locked, setLocked] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    const q = questions[Math.min(computeStartIndex(), questions.length - 1)];
    return q ? q.time_seconds * 1000 : 0;
  });
  const [tabSwitches, setTabSwitches] = useState(0);
  const [, startTransition] = useTransition();

  const questionStartedAtRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advancingRef = useRef(false);

  const currentQuestion = questions[currentIndex];

  /* ----------------------------------------------------------------- */
  /*  Anti-cheat detectors                                              */
  /*  - visibilitychange (tab switch / minimize / mobile home)          */
  /*  - window blur     (alt-tab on desktop without hiding)             */
  /*  - contextmenu     (block right-click — friction, not security)    */
  /* ----------------------------------------------------------------- */
  useEffect(() => {
    if (phase !== "running") return;

    let lastBumpAt = 0;
    const bump = (reason: string) => {
      // Debounce: visibilitychange + blur often fire together for the same
      // user action — count it once.
      const now = Date.now();
      if (now - lastBumpAt < 800) return;
      lastBumpAt = now;

      setTabSwitches((v) => {
        const next = v + 1;
        if (next === 1) {
          toast.warning(
            "Has salido del examen — esto queda registrado",
            { description: "Vuelve a la pestaña del examen para continuar." }
          );
        } else if (next < 3) {
          toast.warning(
            `Has salido ${next} veces del examen`,
            { description: "Cada salida queda registrada en tu intento." }
          );
        } else if (next === 3) {
          toast.error(
            "Aviso: 3ª salida del examen",
            {
              description:
                "Si sigues saliendo, tu intento puede ser invalidado por la academia.",
              duration: 8000,
            }
          );
        } else {
          toast.error(`${next}ª salida del examen registrada`, {
            description: "Tu intento podría ser revisado manualmente.",
          });
        }
        // reason kept in scope so React DevTools / console show why bumped
        void reason;
        return next;
      });
    };

    const visHandler = () => {
      if (document.hidden) bump("visibilitychange");
    };
    const blurHandler = () => bump("window-blur");
    const contextMenuHandler = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("visibilitychange", visHandler);
    window.addEventListener("blur", blurHandler);
    document.addEventListener("contextmenu", contextMenuHandler);

    return () => {
      document.removeEventListener("visibilitychange", visHandler);
      window.removeEventListener("blur", blurHandler);
      document.removeEventListener("contextmenu", contextMenuHandler);
    };
  }, [phase]);

  /* ----------------------------------------------------------------- */
  /*  Reset state when current question changes (during running phase) */
  /* ----------------------------------------------------------------- */
  useEffect(() => {
    if (phase !== "running" || !currentQuestion) return;
    setRemainingMs(currentQuestion.time_seconds * 1000);
    setLocked(false);
    advancingRef.current = false;
    questionStartedAtRef.current = Date.now();

    // Pre-fill draft text with whatever the alumno already wrote (if any)
    if (currentQuestion.type === "written") {
      setDraftText(answers[currentQuestion.id]?.textAnswer ?? "");
    } else {
      setDraftText("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentQuestion?.id, phase]);

  /* ----------------------------------------------------------------- */
  /*  Timer tick (only during running)                                 */
  /* ----------------------------------------------------------------- */
  useEffect(() => {
    if (phase !== "running" || !currentQuestion || locked) return;
    intervalRef.current = setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - 100;
        return next < 0 ? 0 : next;
      });
    }, 100);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, currentQuestion, locked]);

  /* ----------------------------------------------------------------- */
  /*  Submit a single answer (during running phase)                    */
  /* ----------------------------------------------------------------- */
  const advanceFromCurrent = useCallback(
    async (payload: { selectedOptionId?: string | null; textAnswer?: string | null }) => {
      if (advancingRef.current || !currentQuestion) return;
      advancingRef.current = true;
      setLocked(true);

      const timeTakenMs = Date.now() - questionStartedAtRef.current;

      const res = await submitAnswerAction({
        attemptId,
        questionId: currentQuestion.id,
        selectedOptionId: payload.selectedOptionId ?? null,
        textAnswer: payload.textAnswer ?? null,
        timeTakenMs,
      });

      if (!res.ok) {
        toast.error(res.error);
        setLocked(false);
        advancingRef.current = false;
        return;
      }

      // Update local state
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: {
          questionId: currentQuestion.id,
          selectedOptionId: payload.selectedOptionId ?? null,
          textAnswer: payload.textAnswer ?? null,
        },
      }));

      // Brief lock animation, then advance
      setTimeout(() => {
        const next = currentIndex + 1;
        if (next >= questions.length) {
          // All answered → go to review (DO NOT auto-submit)
          setPhase("review");
        } else {
          setCurrentIndex(next);
        }
      }, FEEDBACK_DELAY_MS);
    },
    [attemptId, currentIndex, currentQuestion, questions.length]
  );

  /* ----------------------------------------------------------------- */
  /*  Auto-submit on timer expiry                                      */
  /* ----------------------------------------------------------------- */
  useEffect(() => {
    if (phase !== "running" || locked) return;
    if (remainingMs > 0) return;
    if (!currentQuestion) return;

    if (currentQuestion.type === "multiple_choice") {
      void advanceFromCurrent({ selectedOptionId: null, textAnswer: null });
    } else {
      // Written: submit whatever they have so far (may be empty)
      void advanceFromCurrent({
        selectedOptionId: null,
        textAnswer: draftText,
      });
    }
  }, [remainingMs, locked, phase, currentQuestion, draftText, advanceFromCurrent]);

  /* ----------------------------------------------------------------- */
  /*  Review phase: edit any answer (re-saves to DB on every change)   */
  /* ----------------------------------------------------------------- */
  const handleReviewUpdate = useCallback(
    async (
      questionId: string,
      patch: { selectedOptionId?: string | null; textAnswer?: string | null }
    ) => {
      // Optimistic local update
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          questionId,
          selectedOptionId:
            patch.selectedOptionId ?? prev[questionId]?.selectedOptionId ?? null,
          textAnswer:
            patch.textAnswer ?? prev[questionId]?.textAnswer ?? null,
        },
      }));

      const res = await submitAnswerAction({
        attemptId,
        questionId,
        selectedOptionId: patch.selectedOptionId,
        textAnswer: patch.textAnswer,
        timeTakenMs: 0,
      });
      if (!res.ok) {
        toast.error(res.error);
      }
    },
    [attemptId]
  );

  /* ----------------------------------------------------------------- */
  /*  Final confirmation: AI-grade and finalize                        */
  /* ----------------------------------------------------------------- */
  const handleConfirmSubmit = useCallback(async () => {
    setPhase("submitting");
    const result = await finishAttemptAction({
      attemptId,
      tabSwitches,
    });
    if (!result.ok) {
      toast.error(result.error);
      setPhase("review");
      return;
    }
    setPhase("submitted");
  }, [attemptId, tabSwitches]);

  /* ----------------------------------------------------------------- */
  /*  Render                                                            */
  /* ----------------------------------------------------------------- */
  if (phase === "submitted") {
    return (
      <ResultsScreen
        attemptId={attemptId}
        studentName={studentName}
        onLogout={() => {
          startTransition(() => {
            void onLogoutAction();
          });
        }}
      />
    );
  }

  if (phase === "submitting") {
    return (
      <ExamCompleted
        studentName={studentName}
        state="submitting"
        onLogout={() => {}}
      />
    );
  }

  if (phase === "review") {
    return (
      <ReviewScreen
        studentName={studentName}
        questions={questions}
        answers={answers}
        onUpdateAnswer={handleReviewUpdate}
        onConfirmSubmit={handleConfirmSubmit}
        submitting={false}
      />
    );
  }

  // phase === "running"
  if (!currentQuestion) {
    return null;
  }

  const currentAnswer = answers[currentQuestion.id];
  return (
    <>
      {tabSwitches > 0 ? <TabSwitchBanner count={tabSwitches} /> : null}
      <QuestionScreen
        question={currentQuestion}
        questionIndex={currentIndex}
        totalQuestions={questions.length}
        remainingMs={remainingMs}
        selectedOptionId={currentAnswer?.selectedOptionId ?? null}
        textAnswer={draftText}
        locked={locked}
        onSelectOption={(optionId) => {
          if (locked) return;
          void advanceFromCurrent({ selectedOptionId: optionId });
        }}
        onChangeTextAnswer={(value) => {
          if (locked) return;
          setDraftText(value);
        }}
        onSubmitWritten={() => {
          if (locked) return;
          void advanceFromCurrent({ textAnswer: draftText });
        }}
      />
    </>
  );
}

function TabSwitchBanner({ count }: { count: number }) {
  const severe = count >= 3;
  return (
    <div
      className={[
        "mx-auto mb-4 max-w-4xl rounded-xl border-2 px-4 py-3 shadow-sm",
        severe
          ? "border-rose-300 bg-rose-50/80"
          : "border-amber-300 bg-amber-50/80",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        {severe ? (
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-rose-600" />
        ) : (
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
        )}
        <div className="flex-1 text-sm">
          <p className={severe ? "font-bold text-rose-900" : "font-semibold text-amber-900"}>
            {severe ? "Aviso de integridad del examen" : "Has salido del examen"}
            <span className="ml-1 tabular-nums">
              ({count} {count === 1 ? "vez" : "veces"})
            </span>
          </p>
          <p className={`mt-0.5 text-xs ${severe ? "text-rose-800/80" : "text-amber-800/80"}`}>
            {severe
              ? "Si continúas saliendo del examen, tu intento podría ser invalidado por la academia. Toda actividad sospechosa queda registrada."
              : "Cada vez que sales del examen queda registrado. Si necesitas algo, vuelve a esta pestaña antes de seguir."}
          </p>
        </div>
      </div>
    </div>
  );
}
