"use server";

import { revalidatePath } from "next/cache";

import { createServiceClient } from "@/lib/supabase/server";
import { getStudentSession } from "@/lib/session";

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
  selectedOptionId: string | null;
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

    // Upsert by (attempt_id, question_id) — uniqueness is enforced in SQL
    const { error: upsertErr } = await supabase
      .from("answers")
      .upsert(
        {
          attempt_id: input.attemptId,
          question_id: input.questionId,
          selected_option_id: input.selectedOptionId,
          time_taken_ms: Math.max(0, Math.round(input.timeTakenMs)),
          // is_correct se calcula al finalizar para mantener un único punto de scoring
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

    // Fetch all questions for this attempt (we need correct_option_id)
    const questionIds = attempt.question_order;
    const { data: questions, error: qErr } = await supabase
      .from("questions")
      .select("id, correct_option_id")
      .in("id", questionIds);

    if (qErr || !questions) return { ok: false, error: "No se pudieron cargar las preguntas" };

    const correctById = new Map(questions.map((q) => [q.id, q.correct_option_id]));

    // Fetch existing answers
    const { data: answers, error: aErr } = await supabase
      .from("answers")
      .select("id, question_id, selected_option_id")
      .eq("attempt_id", input.attemptId);

    if (aErr) return { ok: false, error: "No se pudieron cargar las respuestas" };

    // Mark each answer is_correct + count
    let correctCount = 0;
    const updates: { id: string; is_correct: boolean }[] = [];

    for (const ans of answers ?? []) {
      const correct = correctById.get(ans.question_id);
      const isCorrect = !!correct && ans.selected_option_id === correct;
      if (isCorrect) correctCount++;
      updates.push({ id: ans.id, is_correct: isCorrect });
    }

    // Update is_correct in batch (one upsert per row — small N, fine)
    for (const u of updates) {
      await supabase.from("answers").update({ is_correct: u.is_correct }).eq("id", u.id);
    }

    // Settings: pass threshold + global publish flag
    const { data: settings } = await supabase
      .from("settings")
      .select("pass_threshold, publish_results_globally")
      .limit(1)
      .maybeSingle();

    const passThreshold = Number(settings?.pass_threshold ?? 70);
    const publishGlobally = settings?.publish_results_globally ?? false;

    const total = questionIds.length;
    const score = total > 0 ? (correctCount / total) * 100 : 0;
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
