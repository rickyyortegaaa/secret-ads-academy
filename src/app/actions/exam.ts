"use server";

import { revalidatePath } from "next/cache";

import { createServiceClient } from "@/lib/supabase/server";
import { getStudentSession } from "@/lib/session";
import {
  gradeWrittenAnswersBatch,
  type GradingResult,
} from "@/lib/ai-grader";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function shuffle<T>(array: readonly T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function requireStudent() {
  const studentId = await getStudentSession();
  if (!studentId) throw new Error("UNAUTHORIZED");
  return studentId;
}

/**
 * Convierte el resultado estructurado del grader (score + feedback +
 * strengths + improvements) en un único bloque de markdown para
 * almacenar en `answers.ai_feedback`. Se renderiza tal cual en la UI.
 */
function formatAIFeedback(result: GradingResult): string {
  const parts: string[] = [];
  parts.push(result.feedback);

  if (result.strengths.length > 0) {
    parts.push("\n**Aciertos:**");
    for (const s of result.strengths) parts.push(`- ${s}`);
  }
  if (result.improvements.length > 0) {
    parts.push("\n**A mejorar:**");
    for (const i of result.improvements) parts.push(`- ${i}`);
  }
  return parts.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SubmitAnswerResult =
  | { ok: true }
  | { ok: false; error: string };

export type FinishAttemptResult =
  | { ok: true; score: number; passed: boolean | null; published: boolean }
  | { ok: false; error: string };

/* ------------------------------------------------------------------ */
/*  Submit a single answer                                             */
/* ------------------------------------------------------------------ */

export async function submitAnswerAction(input: {
  attemptId: string;
  questionId: string;
  selectedOptionId?: string | null;
  textAnswer?: string | null;
  timeTakenMs: number;
}): Promise<SubmitAnswerResult> {
  try {
    const studentId = await requireStudent();
    const supabase = createServiceClient();

    // Verify the attempt belongs to this student and is still open
    const { data: attempt, error: attemptErr } = await supabase
      .from("attempts")
      .select("id, student_id, finished_at")
      .eq("id", input.attemptId)
      .maybeSingle();

    if (attemptErr || !attempt) return { ok: false, error: "Intento no válido" };
    if (attempt.student_id !== studentId)
      return { ok: false, error: "No autorizado" };
    if (attempt.finished_at)
      return { ok: false, error: "El examen ya finalizó" };

    // Upsert by (attempt_id, question_id) — uniqueness is enforced in SQL.
    // is_correct / ai_score se calculan al finalizar.
    const { error: upsertErr } = await supabase
      .from("answers")
      .upsert(
        {
          attempt_id: input.attemptId,
          question_id: input.questionId,
          selected_option_id: input.selectedOptionId ?? null,
          text_answer: input.textAnswer?.trim() || null,
          time_taken_ms: Math.max(0, Math.round(input.timeTakenMs)),
        },
        { onConflict: "attempt_id,question_id" }
      );

    if (upsertErr) {
      console.error("submitAnswer error", upsertErr);
      return { ok: false, error: "No se pudo guardar la respuesta" };
    }

    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Error del servidor" };
  }
}

/* ------------------------------------------------------------------ */
/*  Finish attempt — score it                                          */
/* ------------------------------------------------------------------ */

export async function finishAttemptAction(input: {
  attemptId: string;
  tabSwitches: number;
}): Promise<FinishAttemptResult> {
  try {
    const studentId = await requireStudent();
    const supabase = createServiceClient();

    // Get attempt + verify ownership
    const { data: attempt, error: attemptErr } = await supabase
      .from("attempts")
      .select("id, student_id, finished_at, question_order")
      .eq("id", input.attemptId)
      .maybeSingle();

    if (attemptErr || !attempt) return { ok: false, error: "Intento no válido" };
    if (attempt.student_id !== studentId)
      return { ok: false, error: "No autorizado" };

    // Idempotency: if already finished, return current score
    if (attempt.finished_at) {
      const { data: existing } = await supabase
        .from("attempts")
        .select("score, passed, results_published")
        .eq("id", input.attemptId)
        .maybeSingle();
      return {
        ok: true,
        score: Number(existing?.score ?? 0),
        passed: existing?.passed ?? null,
        published: existing?.results_published ?? false,
      };
    }

    // Fetch all questions for this attempt (need type + correct + reference)
    const questionIds = attempt.question_order;
    const { data: questions, error: qErr } = await supabase
      .from("questions")
      .select(
        "id, type, text, correct_option_id, reference_answer, grading_rubric"
      )
      .in("id", questionIds);

    if (qErr || !questions)
      return { ok: false, error: "No se pudieron cargar las preguntas" };

    const questionById = new Map(questions.map((q) => [q.id, q]));

    // Fetch existing answers
    const { data: answers, error: aErr } = await supabase
      .from("answers")
      .select("id, question_id, selected_option_id, text_answer")
      .eq("attempt_id", input.attemptId);

    if (aErr) return { ok: false, error: "No se pudieron cargar las respuestas" };

    // 1) Score multiple-choice answers (deterministic).
    // 2) Score written answers via AI in parallel (best-effort).
    type Update = {
      id: string;
      is_correct?: boolean | null;
      ai_score?: number | null;
      ai_feedback?: string | null;
    };
    const updates: Update[] = [];
    const writtenToGrade: {
      answerId: string;
      input: {
        question: string;
        referenceAnswer: string;
        rubric?: string | null;
        studentAnswer: string;
      };
    }[] = [];

    let correctCount = 0; // multiple_choice
    let mcTotal = 0;
    let writtenTotalScore = 0; // sum of ai_score / 100 for written
    let writtenCount = 0;
    let writtenAvailable = 0;

    for (const ans of answers ?? []) {
      const q = questionById.get(ans.question_id);
      if (!q) continue;

      if (q.type === "multiple_choice") {
        mcTotal++;
        const isCorrect =
          !!q.correct_option_id &&
          ans.selected_option_id === q.correct_option_id;
        if (isCorrect) correctCount++;
        updates.push({ id: ans.id, is_correct: isCorrect });
      } else if (q.type === "written") {
        writtenCount++;
        if (q.reference_answer) {
          writtenToGrade.push({
            answerId: ans.id,
            input: {
              question: q.text,
              referenceAnswer: q.reference_answer,
              rubric: q.grading_rubric,
              studentAnswer: ans.text_answer ?? "",
            },
          });
        } else {
          // Sin respuesta modelo no podemos puntuar → marcar pendiente
          updates.push({
            id: ans.id,
            ai_score: null,
            ai_feedback: "Pendiente de revisión manual.",
          });
        }
      }
    }

    // Run AI grading in parallel
    const aiResults = await gradeWrittenAnswersBatch(writtenToGrade);
    for (const r of aiResults) {
      if (r.ok) {
        writtenTotalScore += r.result.score;
        writtenAvailable++;
        const formattedFeedback = formatAIFeedback(r.result);
        updates.push({
          id: r.answerId,
          is_correct: r.result.score >= 70,
          ai_score: r.result.score,
          ai_feedback: formattedFeedback,
        });
      } else {
        // Fallback: marcar pendiente revisión manual
        updates.push({
          id: r.answerId,
          ai_score: null,
          ai_feedback: `Pendiente de revisión manual (${r.error}).`,
        });
      }
    }

    // Apply updates (small N, individual updates are fine)
    for (const u of updates) {
      await supabase.from("answers").update(u).eq("id", u.id);
    }

    // Settings: pass threshold + global publish flag
    const { data: settings } = await supabase
      .from("settings")
      .select("pass_threshold, publish_results_globally")
      .limit(1)
      .maybeSingle();

    const passThreshold = Number(settings?.pass_threshold ?? 70);
    const publishGlobally = settings?.publish_results_globally ?? false;

    // Combined score: each MC question worth 100 (correct/incorrect),
    // each written question worth its ai_score (0-100). Average across all
    // gradable questions. Written answers without a graded score are excluded
    // from the average (so the alumno isn't penalised for an AI failure).
    const gradableTotal = mcTotal + writtenAvailable;
    const totalEarned = correctCount * 100 + writtenTotalScore;
    const score = gradableTotal > 0 ? totalEarned / gradableTotal : 0;
    const passed = score >= passThreshold;

    // Mark attempt finished
    const { error: updateErr } = await supabase
      .from("attempts")
      .update({
        finished_at: new Date().toISOString(),
        score: Number(score.toFixed(2)),
        passed,
        results_published: publishGlobally,
        tab_switches: Math.max(0, Math.round(input.tabSwitches)),
      })
      .eq("id", input.attemptId);

    if (updateErr) {
      console.error("finishAttempt error", updateErr);
      return { ok: false, error: "No se pudo finalizar el intento" };
    }

    revalidatePath("/exam");

    return {
      ok: true,
      score: Number(score.toFixed(2)),
      passed,
      published: publishGlobally,
    };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Error del servidor" };
  }
}

/* ------------------------------------------------------------------ */
/*  (Re)create attempt for current student — idempotent in spirit:     */
/*  if there's an open attempt, returns it; otherwise creates a new    */
/*  one with shuffled question order.                                  */
/* ------------------------------------------------------------------ */

export async function ensureAttemptForCurrentStudent(): Promise<
  | { ok: true; attemptId: string; questionOrder: string[]; alreadyFinished: boolean }
  | { ok: false; error: string }
> {
  try {
    const studentId = await requireStudent();
    const supabase = createServiceClient();

    // Look for the student's most recent attempt
    const { data: existing } = await supabase
      .from("attempts")
      .select("id, finished_at, question_order")
      .eq("student_id", studentId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return {
        ok: true,
        attemptId: existing.id,
        questionOrder: existing.question_order,
        alreadyFinished: !!existing.finished_at,
      };
    }

    // No attempt → create one
    const { data: questions, error: qErr } = await supabase
      .from("questions")
      .select("id")
      .order("position", { ascending: true });

    if (qErr || !questions || questions.length === 0)
      return { ok: false, error: "No hay preguntas disponibles" };

    const questionOrder = shuffle(questions.map((q) => q.id));

    const { data: created, error: insertErr } = await supabase
      .from("attempts")
      .insert({
        student_id: studentId,
        question_order: questionOrder,
      })
      .select("id")
      .single();

    if (insertErr || !created)
      return { ok: false, error: "No se pudo crear el intento" };

    return {
      ok: true,
      attemptId: created.id,
      questionOrder,
      alreadyFinished: false,
    };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Error del servidor" };
  }
}

/* ------------------------------------------------------------------ */
/*  Per-question results — used by the post-submit ResultsScreen.      */
/*  Returns one entry per question (in attempt's randomized order)     */
/*  with the alumno's answer, correctness flag, and AI feedback for    */
/*  written questions.                                                 */
/* ------------------------------------------------------------------ */

export type AttemptResultItem = {
  questionId: string;
  position: number;
  type: "multiple_choice" | "written";
  text: string;
  imageUrl: string | null;
  options: { id: string; text: string }[] | null;
  correctOptionId: string | null;
  referenceAnswer: string | null;
  selectedOptionId: string | null;
  textAnswer: string | null;
  isCorrect: boolean | null;
  aiScore: number | null;
  aiFeedback: string | null;
};

export type GetAttemptResultsResult =
  | {
      ok: true;
      score: number;
      passed: boolean | null;
      published: boolean;
      passThreshold: number;
      items: AttemptResultItem[];
    }
  | { ok: false; error: string };

export async function getAttemptResultsAction(
  attemptId: string
): Promise<GetAttemptResultsResult> {
  try {
    const studentId = await requireStudent();
    const supabase = createServiceClient();

    const { data: attempt } = await supabase
      .from("attempts")
      .select(
        "id, student_id, finished_at, score, passed, results_published, question_order"
      )
      .eq("id", attemptId)
      .maybeSingle();

    if (!attempt) return { ok: false, error: "Intento no encontrado" };
    if (attempt.student_id !== studentId)
      return { ok: false, error: "No autorizado" };
    if (!attempt.finished_at)
      return { ok: false, error: "El examen aún no ha finalizado" };

    const { data: questions } = await supabase
      .from("questions")
      .select(
        "id, position, type, text, image_url, options, correct_option_id, reference_answer"
      )
      .in("id", attempt.question_order);

    const { data: answers } = await supabase
      .from("answers")
      .select(
        "question_id, selected_option_id, text_answer, is_correct, ai_score, ai_feedback"
      )
      .eq("attempt_id", attemptId);

    const qById = new Map((questions ?? []).map((q) => [q.id, q]));
    const aByQId = new Map(
      (answers ?? []).map((a) => [a.question_id, a])
    );

    const items: AttemptResultItem[] = [];
    for (const qid of attempt.question_order) {
      const q = qById.get(qid);
      if (!q) continue;
      const a = aByQId.get(qid);
      items.push({
        questionId: q.id,
        position: q.position,
        type: q.type,
        text: q.text,
        imageUrl: q.image_url,
        options: q.options,
        correctOptionId: q.correct_option_id,
        referenceAnswer: q.reference_answer,
        selectedOptionId: a?.selected_option_id ?? null,
        textAnswer: a?.text_answer ?? null,
        isCorrect: a?.is_correct ?? null,
        aiScore: a?.ai_score != null ? Number(a.ai_score) : null,
        aiFeedback: a?.ai_feedback ?? null,
      });
    }

    const { data: settings } = await supabase
      .from("settings")
      .select("pass_threshold")
      .limit(1)
      .maybeSingle();

    return {
      ok: true,
      score: Number(attempt.score ?? 0),
      passed: attempt.passed,
      published: attempt.results_published ?? false,
      passThreshold: Number(settings?.pass_threshold ?? 70),
      items,
    };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Error del servidor" };
  }
}
