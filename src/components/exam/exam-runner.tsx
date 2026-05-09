"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

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
  /*  Tab-switch detector                                               */
  /* ----------------------------------------------------------------- */
  useEffect(() => {
    if (phase !== "running") return;
    const handler = () => {
      if (document.hidden) setTabSwitches((v) => v + 1);
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
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
  );
}
