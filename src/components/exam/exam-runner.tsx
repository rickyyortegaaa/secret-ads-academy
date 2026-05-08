"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  finishAttemptAction,
  submitAnswerAction,
} from "@/app/actions/exam";

import { ExamCompleted } from "./exam-completed";
import { QuestionScreen, type ExamQuestion } from "./question-screen";

type ExamRunnerProps = {
  attemptId: string;
  studentName: string;
  questions: ExamQuestion[];
  /** Number of questions already answered (used to resume after refresh). */
  startIndex: number;
  /** True if attempt was already finished (returning user). */
  alreadyFinished: boolean;
  /** Score/passed/published shown only when results are published. */
  finishedResult?: {
    score: number;
    passed: boolean | null;
    published: boolean;
  } | null;
  onLogoutAction: () => Promise<void>;
};

const FEEDBACK_DELAY_MS = 600;

export function ExamRunner({
  attemptId,
  studentName,
  questions,
  startIndex,
  alreadyFinished,
  finishedResult,
  onLogoutAction,
}: ExamRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(startIndex, questions.length)
  );
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    const q = questions[Math.min(startIndex, questions.length - 1)];
    return q ? q.time_seconds * 1000 : 0;
  });
  const [tabSwitches, setTabSwitches] = useState(0);
  const [phase, setPhase] = useState<
    "running" | "submitting" | "submitted"
  >(alreadyFinished ? "submitted" : "running");
  const [finalResult, setFinalResult] = useState<
    { score: number; passed: boolean | null; published: boolean } | null
  >(finishedResult ?? null);

  const [, startTransition] = useTransition();

  const questionStartedAtRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advancingRef = useRef(false);

  const currentQuestion = questions[currentIndex];

  /* -------------------------------------------------------------- */
  /*  Tab-switch detector (incremental — final number sent on finish) */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    if (phase !== "running") return;
    const handler = () => {
      if (document.hidden) {
        setTabSwitches((v) => v + 1);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [phase]);

  /* -------------------------------------------------------------- */
  /*  Reset timer when question changes                              */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    if (phase !== "running") return;
    if (!currentQuestion) return;
    setRemainingMs(currentQuestion.time_seconds * 1000);
    setSelectedOptionId(null);
    setLocked(false);
    advancingRef.current = false;
    questionStartedAtRef.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentQuestion?.id, phase]);

  /* -------------------------------------------------------------- */
  /*  Timer tick                                                     */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    if (phase !== "running") return;
    if (!currentQuestion) return;
    if (locked) return;

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

  /* -------------------------------------------------------------- */
  /*  Submission flow                                                */
  /* -------------------------------------------------------------- */
  const finishExam = useCallback(
    async (finalSwitches: number) => {
      setPhase("submitting");
      const result = await finishAttemptAction({
        attemptId,
        tabSwitches: finalSwitches,
      });
      if (!result.ok) {
        toast.error(result.error);
        setPhase("running");
        return;
      }
      setFinalResult({
        score: result.score,
        passed: result.passed,
        published: result.published,
      });
      setPhase("submitted");
    },
    [attemptId]
  );

  const submitCurrent = useCallback(
    async (optionId: string | null) => {
      if (advancingRef.current || !currentQuestion) return;
      advancingRef.current = true;
      setLocked(true);
      setSelectedOptionId(optionId);

      const timeTakenMs = Date.now() - questionStartedAtRef.current;

      const res = await submitAnswerAction({
        attemptId,
        questionId: currentQuestion.id,
        selectedOptionId: optionId,
        timeTakenMs,
      });

      if (!res.ok) {
        toast.error(res.error);
        setLocked(false);
        advancingRef.current = false;
        return;
      }

      // Small visual lock then advance
      setTimeout(() => {
        const next = currentIndex + 1;
        if (next >= questions.length) {
          startTransition(() => {
            void finishExam(tabSwitches);
          });
        } else {
          setCurrentIndex(next);
        }
      }, FEEDBACK_DELAY_MS);
    },
    [
      attemptId,
      currentIndex,
      currentQuestion,
      finishExam,
      questions.length,
      tabSwitches,
    ]
  );

  /* -------------------------------------------------------------- */
  /*  Auto-submit when timer reaches zero                            */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    if (phase !== "running") return;
    if (locked) return;
    if (remainingMs > 0) return;
    void submitCurrent(null);
  }, [remainingMs, locked, phase, submitCurrent]);

  /* -------------------------------------------------------------- */
  /*  Render                                                         */
  /* -------------------------------------------------------------- */
  if (phase === "submitted") {
    const state = finalResult?.published
      ? "submitted-published"
      : "submitted-hidden";
    return (
      <ExamCompleted
        studentName={studentName}
        state={state}
        result={
          finalResult?.published
            ? { score: finalResult.score, passed: finalResult.passed }
            : null
        }
        onLogout={() => {
          startTransition(() => {
            void onLogoutAction();
          });
        }}
      />
    );
  }

  if (phase === "submitting" || !currentQuestion) {
    return (
      <ExamCompleted
        studentName={studentName}
        state="submitting"
        onLogout={() => {}}
      />
    );
  }

  return (
    <QuestionScreen
      question={currentQuestion}
      questionIndex={currentIndex}
      totalQuestions={questions.length}
      remainingMs={remainingMs}
      selectedOptionId={selectedOptionId}
      locked={locked}
      onSelectOption={(optionId) => {
        if (locked) return;
        void submitCurrent(optionId);
      }}
    />
  );
}
