import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { ExamRunner } from "@/components/exam/exam-runner";
import { type ExamQuestion } from "@/components/exam/question-screen";
import { type ReviewAnswer } from "@/components/exam/review-screen";
import { ensureAttemptForCurrentStudent } from "@/app/actions/exam";
import { clearStudentSession, getStudentSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

async function logoutAction() {
  "use server";
  await clearStudentSession();
  redirect("/");
}

export const dynamic = "force-dynamic";

export default async function ExamPage() {
  const studentId = await getStudentSession();
  if (!studentId) {
    redirect("/");
  }

  const supabase = createServiceClient();
  const { data: student } = await supabase
    .from("students")
    .select("first_name, last_name, email")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) {
    await clearStudentSession();
    redirect("/");
  }

  const attempt = await ensureAttemptForCurrentStudent();
  if (!attempt.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-xl border bg-card p-8 text-center shadow-md">
          <BrandLogo size={64} showWordmark={false} />
          <h1 className="mt-4 text-xl font-semibold">No se pudo iniciar el examen</h1>
          <p className="mt-2 text-sm text-muted-foreground">{attempt.error}</p>
        </div>
      </div>
    );
  }

  // Load questions for this attempt's order
  const { data: rawQuestions } = await supabase
    .from("questions")
    .select("id, type, text, image_url, time_seconds, options")
    .in("id", attempt.questionOrder);

  const byId = new Map(
    (rawQuestions ?? []).map((q) => [q.id, q as ExamQuestion])
  );
  const questions: ExamQuestion[] = attempt.questionOrder
    .map((id) => byId.get(id))
    .filter(Boolean) as ExamQuestion[];

  // Existing answers (for resume)
  const { data: existingAnswers } = await supabase
    .from("answers")
    .select("question_id, selected_option_id, text_answer")
    .eq("attempt_id", attempt.attemptId);

  const initialAnswers: Record<string, ReviewAnswer> = {};
  for (const a of existingAnswers ?? []) {
    initialAnswers[a.question_id] = {
      questionId: a.question_id,
      selectedOptionId: a.selected_option_id,
      textAnswer: a.text_answer,
    };
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 px-4 py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 size-[400px] rounded-full bg-pink-300/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 size-[400px] rounded-full bg-rose-300/30 blur-3xl"
      />

      {/* Header */}
      <header className="relative z-10 mx-auto mb-6 flex w-full max-w-4xl items-center justify-between gap-3">
        <BrandLogo size={40} showWordmark={false} className="shrink-0" />
        <div className="ml-3 min-w-0 flex-1 text-right text-xs text-muted-foreground sm:text-sm">
          <div className="truncate font-semibold text-foreground">
            {student.first_name} {student.last_name}
          </div>
          <div className="hidden truncate sm:block">{student.email}</div>
        </div>
      </header>

      <main className="relative z-10">
        <ExamRunner
          attemptId={attempt.attemptId}
          studentName={student.first_name}
          questions={questions}
          initialAnswers={initialAnswers}
          alreadyFinished={attempt.alreadyFinished}
          onLogoutAction={logoutAction}
        />
      </main>
    </div>
  );
}
