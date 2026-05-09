"use server";

import { revalidatePath } from "next/cache";

import { createServiceClient } from "@/lib/supabase/server";
import {
  formatAIFeedback,
  gradeWrittenAnswersBatch,
  type BatchGradeInput,
} from "@/lib/ai-grader";

import { requireAdminEmail } from "./auth";

/* ------------------------------------------------------------------ */
/*  List attempts                                                      */
/* ------------------------------------------------------------------ */

export type AttemptListItem = {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  started_at: string;
  finished_at: string | null;
  score: number | null;
  passed: boolean | null;
  results_published: boolean;
  tab_switches: number;
};

export async function listAttemptsAction(): Promise<{
  ok: true;
  attempts: AttemptListItem[];
}> {
  await requireAdminEmail();
  const supabase = createServiceClient();

  const { data: attempts } = await supabase
    .from("attempts")
    .select(
      "id, student_id, started_at, finished_at, score, passed, results_published, tab_switches"
    )
    .order("started_at", { ascending: false })
    .limit(500);

  if (!attempts || attempts.length === 0) return { ok: true, attempts: [] };

  const studentIds = [...new Set(attempts.map((a) => a.student_id))];
  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name, email")
    .in("id", studentIds);

  const studentById = new Map((students ?? []).map((s) => [s.id, s]));

  const result: AttemptListItem[] = attempts.map((a) => {
    const s = studentById.get(a.student_id);
    return {
      id: a.id,
      student_id: a.student_id,
      student_name: s ? `${s.first_name} ${s.last_name}` : "Desconocido",
      student_email: s?.email ?? "",
      started_at: a.started_at,
      finished_at: a.finished_at,
      score: a.score == null ? null : Number(a.score),
      passed: a.passed,
      results_published: a.results_published,
      tab_switches: a.tab_switches,
    };
  });

  return { ok: true, attempts: result };
}

/* ------------------------------------------------------------------ */
/*  Detail of one attempt                                              */
/* ------------------------------------------------------------------ */

export type AttemptDetailAnswer = {
  /** answers row id (null if no answer was recorded for this question) */
  answerId: string | null;
  questionId: string;
  position: number;
  type: "multiple_choice" | "written";
  text: string;
  imageUrl: string | null;
  options: { id: string; text: string }[] | null;
  correctOptionId: string | null;
  referenceAnswer: string | null;
  gradingRubric: string | null;
  selectedOptionId: string | null;
  textAnswer: string | null;
  isCorrect: boolean | null;
  aiScore: number | null;
  aiFeedback: string | null;
};

export type AttemptDetail = {
  id: string;
  student_name: string;
  student_email: string;
  started_at: string;
  finished_at: string | null;
  score: number | null;
  passed: boolean | null;
  results_published: boolean;
  tab_switches: number;
  answers: AttemptDetailAnswer[];
};

export async function getAttemptDetailAction(
  id: string
): Promise<
  | { ok: true; detail: AttemptDetail }
  | { ok: false; error: string }
> {
  await requireAdminEmail();
  const supabase = createServiceClient();

  const { data: attempt } = await supabase
    .from("attempts")
    .select(
      "id, student_id, started_at, finished_at, score, passed, results_published, tab_switches, question_order"
    )
    .eq("id", id)
    .maybeSingle();

  if (!attempt) return { ok: false, error: "Intento no encontrado" };

  const { data: student } = await supabase
    .from("students")
    .select("first_name, last_name, email")
    .eq("id", attempt.student_id)
    .maybeSingle();

  const { data: questions } = await supabase
    .from("questions")
    .select(
      "id, position, type, text, image_url, options, correct_option_id, reference_answer, grading_rubric"
    )
    .in("id", attempt.question_order);

  const { data: answers } = await supabase
    .from("answers")
    .select(
      "id, question_id, selected_option_id, text_answer, is_correct, ai_score, ai_feedback"
    )
    .eq("attempt_id", id);

  const qById = new Map((questions ?? []).map((q) => [q.id, q]));
  const aByQId = new Map((answers ?? []).map((a) => [a.question_id, a]));

  const answersList: AttemptDetailAnswer[] = attempt.question_order
    .map((qid: string) => {
      const q = qById.get(qid);
      if (!q) return null;
      const a = aByQId.get(qid);
      return {
        answerId: a?.id ?? null,
        questionId: q.id,
        position: q.position,
        type: q.type,
        text: q.text,
        imageUrl: q.image_url,
        options: q.options,
        correctOptionId: q.correct_option_id,
        referenceAnswer: q.reference_answer,
        gradingRubric: q.grading_rubric,
        selectedOptionId: a?.selected_option_id ?? null,
        textAnswer: a?.text_answer ?? null,
        isCorrect: a?.is_correct ?? null,
        aiScore: a?.ai_score != null ? Number(a.ai_score) : null,
        aiFeedback: a?.ai_feedback ?? null,
      };
    })
    .filter((x): x is AttemptDetailAnswer => x !== null);

  return {
    ok: true,
    detail: {
      id: attempt.id,
      student_name: student
        ? `${student.first_name} ${student.last_name}`
        : "Desconocido",
      student_email: student?.email ?? "",
      started_at: attempt.started_at,
      finished_at: attempt.finished_at,
      score: attempt.score == null ? null : Number(attempt.score),
      passed: attempt.passed,
      results_published: attempt.results_published,
      tab_switches: attempt.tab_switches,
      answers: answersList,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Toggle published per attempt                                       */
/* ------------------------------------------------------------------ */

export async function toggleAttemptPublishedAction(
  id: string,
  value: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminEmail();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("attempts")
    .update({ results_published: value })
    .eq("id", id);

  if (error) {
    console.error("toggleAttemptPublished error", error);
    return { ok: false, error: "No se pudo actualizar" };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/attempts/${id}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Delete attempt (lets the student retry)                            */
/* ------------------------------------------------------------------ */

export async function deleteAttemptAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminEmail();
  const supabase = createServiceClient();

  // answers cascade-delete via FK constraint
  const { error } = await supabase.from("attempts").delete().eq("id", id);
  if (error) {
    console.error("deleteAttempt error", error);
    return { ok: false, error: "No se pudo eliminar el intento" };
  }
  revalidatePath("/admin");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Re-grade pending written answers via AI                            */
/*  Use cases: API key out of credits, transient errors, manual retry. */
/*  - If `answerIds` empty → regrades ALL written answers without      */
/*    ai_score in this attempt.                                        */
/*  - If `answerIds` provided → forces re-grading of those (even if    */
/*    they already had a score; useful for "redo this one").           */
/*  Recalculates the attempt's overall score after grading.            */
/* ------------------------------------------------------------------ */

export type RegradeResult =
  | { ok: true; regraded: number; failed: number; firstError?: string }
  | { ok: false; error: string };

export async function regradeAttemptAction(input: {
  attemptId: string;
  answerIds?: string[];
}): Promise<RegradeResult> {
  await requireAdminEmail();
  const supabase = createServiceClient();

  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, question_order, finished_at")
    .eq("id", input.attemptId)
    .maybeSingle();

  if (!attempt) return { ok: false, error: "Intento no encontrado" };
  if (!attempt.finished_at)
    return {
      ok: false,
      error: "El examen no ha sido enviado todavía, no hay nada que corregir",
    };

  // Pick answers
  let query = supabase
    .from("answers")
    .select("id, question_id, text_answer, is_correct")
    .eq("attempt_id", input.attemptId);

  if (input.answerIds && input.answerIds.length > 0) {
    query = query.in("id", input.answerIds);
  }

  const { data: answers } = await query;
  if (!answers || answers.length === 0) {
    return { ok: false, error: "No hay respuestas en este intento" };
  }

  // Fetch question metadata
  const questionIds = [...new Set(answers.map((a) => a.question_id))];
  const { data: questions } = await supabase
    .from("questions")
    .select("id, type, text, reference_answer, grading_rubric")
    .in("id", questionIds);

  const qById = new Map((questions ?? []).map((q) => [q.id, q]));

  // Build the batch
  const toGrade: BatchGradeInput[] = [];
  for (const a of answers) {
    const q = qById.get(a.question_id);
    if (!q || q.type !== "written") continue;
    if (!q.reference_answer) continue;
    // If no specific IDs, only regrade pending ones (is_correct == null)
    if (
      (!input.answerIds || input.answerIds.length === 0) &&
      a.is_correct !== null
    )
      continue;

    toGrade.push({
      answerId: a.id,
      input: {
        question: q.text,
        referenceAnswer: q.reference_answer,
        rubric: q.grading_rubric,
        studentAnswer: a.text_answer ?? "",
      },
    });
  }

  if (toGrade.length === 0) {
    return { ok: false, error: "No hay respuestas pendientes que corregir" };
  }

  const aiResults = await gradeWrittenAnswersBatch(toGrade);
  let regraded = 0;
  let failed = 0;
  let firstError: string | undefined;

  for (const r of aiResults) {
    if (r.ok) {
      regraded++;
      await supabase
        .from("answers")
        .update({
          is_correct: r.result.is_correct,
          ai_score: null,
          ai_feedback: formatAIFeedback(r.result),
        })
        .eq("id", r.answerId);
    } else {
      failed++;
      if (!firstError) firstError = r.error;
      await supabase
        .from("answers")
        .update({
          is_correct: null,
          ai_score: null,
          ai_feedback: `Pendiente de revisión manual (${r.error}).`,
        })
        .eq("id", r.answerId);
    }
  }

  // Recalculate overall score using the same logic as finishAttemptAction
  await recalculateAttemptScore(input.attemptId);

  revalidatePath("/admin");
  revalidatePath(`/admin/attempts/${input.attemptId}`);

  return { ok: true, regraded, failed, firstError };
}

async function recalculateAttemptScore(attemptId: string) {
  const supabase = createServiceClient();

  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, question_order")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) return;

  const { data: questions } = await supabase
    .from("questions")
    .select("id, type, correct_option_id")
    .in("id", attempt.question_order);

  const { data: answers } = await supabase
    .from("answers")
    .select("question_id, selected_option_id, is_correct, ai_score")
    .eq("attempt_id", attemptId);

  const qById = new Map((questions ?? []).map((q) => [q.id, q]));

  // Score uniforme: cada pregunta vale 100 si correcta, 0 si incorrecta.
  // Las pendientes (is_correct == null) se excluyen para no penalizar.
  let correctCount = 0;
  let gradableTotal = 0;

  for (const a of answers ?? []) {
    const q = qById.get(a.question_id);
    if (!q) continue;
    if (a.is_correct === null) continue; // pending → excluir
    gradableTotal++;
    if (a.is_correct) correctCount++;
  }

  const { data: settings } = await supabase
    .from("settings")
    .select("pass_threshold")
    .limit(1)
    .maybeSingle();

  const passThreshold = Number(settings?.pass_threshold ?? 70);
  const score = gradableTotal > 0 ? (correctCount * 100) / gradableTotal : 0;
  const passed = score >= passThreshold;

  await supabase
    .from("attempts")
    .update({
      score: Number(score.toFixed(2)),
      passed,
    })
    .eq("id", attemptId);
}
