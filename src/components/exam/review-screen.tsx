"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, AlertCircle, Pencil, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { ExamQuestion } from "./question-screen";

const OPTION_BADGES = [
  { badge: "A", color: "bg-pink-500" },
  { badge: "B", color: "bg-violet-500" },
  { badge: "C", color: "bg-amber-500" },
  { badge: "D", color: "bg-teal-500" },
] as const;

const MAX_WRITTEN_CHARS = 1500;
const MIN_WRITTEN_CHARS = 20;

export type ReviewAnswer = {
  questionId: string;
  selectedOptionId: string | null;
  textAnswer: string | null;
};

type ReviewScreenProps = {
  studentName: string;
  questions: ExamQuestion[];
  answers: Record<string, ReviewAnswer>;
  /** When user picks a new option / saves a new text. */
  onUpdateAnswer: (
    questionId: string,
    next: { selectedOptionId?: string | null; textAnswer?: string | null }
  ) => Promise<void> | void;
  /** Final submission. */
  onConfirmSubmit: () => Promise<void> | void;
  submitting: boolean;
};

export function ReviewScreen({
  studentName,
  questions,
  answers,
  onUpdateAnswer,
  onConfirmSubmit,
  submitting,
}: ReviewScreenProps) {
  const totalAnswered = questions.filter((q) => {
    const a = answers[q.id];
    if (!a) return false;
    if (q.type === "multiple_choice") return !!a.selectedOptionId;
    return !!a.textAnswer && a.textAnswer.trim().length >= MIN_WRITTEN_CHARS;
  }).length;
  const allAnswered = totalAnswered === questions.length;

  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-2 text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight">
          Revisa tus respuestas, {studentName}
        </h1>
        <p className="text-muted-foreground">
          Puedes cambiar cualquier respuesta antes de enviar el examen.
          Una vez enviado, no podrás editarlas.
        </p>
        <div className="mt-2 inline-flex items-center justify-center gap-2 self-center rounded-full bg-pink-50 px-4 py-1.5 text-sm font-medium text-pink-700 sm:self-start">
          <CheckCircle2 className="size-4" />
          {totalAnswered} de {questions.length} respondidas
        </div>
      </div>

      {/* Question cards */}
      <div className="space-y-4">
        {questions.map((q, i) => (
          <ReviewCard
            key={q.id}
            index={i + 1}
            question={q}
            answer={answers[q.id]}
            onUpdate={(patch) => onUpdateAnswer(q.id, patch)}
          />
        ))}
      </div>

      {/* Submit bar */}
      <div className="sticky bottom-4 z-20 mx-auto w-full max-w-4xl rounded-2xl border-2 border-pink-200 bg-card/95 p-4 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            {allAnswered ? (
              <span className="font-semibold text-green-700">
                ✓ Todas las preguntas están respondidas.
              </span>
            ) : (
              <span className="text-amber-700">
                ⚠ Te quedan {questions.length - totalAnswered} preguntas por
                contestar (puedes enviar igual, pero contarán como falladas).
              </span>
            )}
          </div>
          <Button
            size="lg"
            disabled={submitting}
            onClick={() => setConfirmOpen(true)}
            className="brand-gradient rounded-full px-6 text-base font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Enviando...
              </>
            ) : (
              "Confirmar y enviar examen"
            )}
          </Button>
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Enviar examen?</DialogTitle>
            <DialogDescription>
              Una vez enviado, ya no podrás cambiar tus respuestas. La
              corrección de las preguntas abiertas tarda unos segundos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
            >
              Seguir revisando
            </Button>
            <Button
              className="brand-gradient text-white"
              disabled={submitting}
              onClick={async () => {
                setConfirmOpen(false);
                await onConfirmSubmit();
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Enviando...
                </>
              ) : (
                "Sí, enviar examen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReviewCard({
  index,
  question,
  answer,
  onUpdate,
}: {
  index: number;
  question: ExamQuestion;
  answer: ReviewAnswer | undefined;
  onUpdate: (patch: {
    selectedOptionId?: string | null;
    textAnswer?: string | null;
  }) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const isWritten = question.type === "written";
  const hasAnswer = isWritten
    ? !!answer?.textAnswer && answer.textAnswer.trim().length >= MIN_WRITTEN_CHARS
    : !!answer?.selectedOptionId;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="brand-gradient flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
            {index}
          </span>
          <div>
            <p className="text-sm font-semibold leading-snug">
              {question.text}
            </p>
            <span
              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isWritten
                  ? "bg-violet-100 text-violet-700"
                  : "bg-pink-100 text-pink-700"
              }`}
            >
              {isWritten ? "Respuesta abierta" : "Test"}
            </span>
          </div>
        </div>
        {!hasAnswer ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
            <AlertCircle className="size-3" /> Sin responder
          </span>
        ) : null}
      </div>

      <div className="px-4 py-4 sm:px-6">
        {isWritten ? (
          <WrittenReview
            value={answer?.textAnswer ?? ""}
            editing={editing}
            onStartEdit={() => setEditing(true)}
            onSave={async (text) => {
              await onUpdate({ textAnswer: text });
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <MultipleChoiceReview
            options={question.options ?? []}
            selectedOptionId={answer?.selectedOptionId ?? null}
            onChange={(id) => onUpdate({ selectedOptionId: id })}
          />
        )}
      </div>

      {question.image_url ? (
        <div className="border-t bg-muted/20 p-4 sm:p-6">
          <div className="relative mx-auto aspect-video w-full max-w-md overflow-hidden rounded-lg bg-muted">
            <Image
              src={question.image_url}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 400px"
              className="object-cover"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MultipleChoiceReview({
  options,
  selectedOptionId,
  onChange,
}: {
  options: { id: string; text: string }[];
  selectedOptionId: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((opt, i) => {
        const meta = OPTION_BADGES[i] ?? OPTION_BADGES[0];
        const isSelected = selectedOptionId === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={[
              "flex items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left text-sm transition-all",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400",
              isSelected
                ? "border-foreground bg-foreground/5 shadow-sm"
                : "border-muted hover:border-pink-200 hover:bg-pink-50/50",
            ].join(" ")}
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white ${meta.color}`}
            >
              {meta.badge}
            </span>
            <span className="flex-1 leading-snug">{opt.text}</span>
            {isSelected ? (
              <CheckCircle2 className="size-4 shrink-0 text-foreground" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function WrittenReview({
  value,
  editing,
  onStartEdit,
  onSave,
  onCancel,
}: {
  value: string;
  editing: boolean;
  onStartEdit: () => void;
  onSave: (text: string) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  if (editing) {
    const remaining = MAX_WRITTEN_CHARS - draft.length;
    const tooShort = draft.trim().length < MIN_WRITTEN_CHARS;
    return (
      <div className="flex flex-col gap-2">
        <Textarea
          value={draft}
          onChange={(e) => {
            if (e.target.value.length <= MAX_WRITTEN_CHARS)
              setDraft(e.target.value);
          }}
          rows={6}
          className="min-h-[140px] resize-y border-violet-200 bg-background text-sm leading-relaxed focus-visible:border-violet-400 focus-visible:ring-violet-200"
          autoFocus
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={`text-xs ${
              remaining < 100
                ? "text-destructive font-semibold"
                : "text-muted-foreground"
            }`}
          >
            {draft.length} / {MAX_WRITTEN_CHARS} caracteres
            {tooShort
              ? ` · mínimo ${MIN_WRITTEN_CHARS} para guardar`
              : null}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={() => {
                setDraft(value);
                onCancel();
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={saving || tooShort}
              className="brand-gradient text-white"
              onClick={async () => {
                setSaving(true);
                try {
                  await onSave(draft);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg border border-violet-200 bg-violet-50/30 p-3 text-sm leading-relaxed text-foreground/90">
        {value ? (
          <p className="whitespace-pre-wrap">{value}</p>
        ) : (
          <p className="italic text-muted-foreground">
            (No has escrito ninguna respuesta)
          </p>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          setDraft(value);
          onStartEdit();
        }}
        className="self-start"
      >
        <Pencil className="size-3.5" />
        Editar respuesta
      </Button>
    </div>
  );
}
