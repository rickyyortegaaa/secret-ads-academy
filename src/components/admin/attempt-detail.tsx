"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  toggleAttemptPublishedAction,
  deleteAttemptAction,
  type AttemptDetail,
  type AttemptDetailAnswer,
} from "@/app/actions/admin/attempts";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  detail: AttemptDetail;
};

export function AttemptDetailView({ detail }: Props) {
  const router = useRouter();
  const [published, setPublished] = useState(detail.results_published);
  const [updatingPublish, startUpdatingPublish] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDeleting] = useTransition();

  const handleTogglePublish = (next: boolean) => {
    const previous = published;
    setPublished(next);
    startUpdatingPublish(async () => {
      const result = await toggleAttemptPublishedAction(detail.id, next);
      if (!result.ok) {
        setPublished(previous);
        toast.error(result.error);
        return;
      }
      toast.success(
        next ? "Resultados publicados al alumno" : "Resultados ocultos al alumno"
      );
    });
  };

  const handleDelete = () => {
    startDeleting(async () => {
      const result = await deleteAttemptAction(detail.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Intento eliminado");
      router.push("/admin");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin">
            <ArrowLeft className="size-4" /> Volver al dashboard
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {detail.student_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {detail.student_email}
            </p>
          </div>
        </div>
      </div>

      {/* Stats card */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Iniciado"
          value={formatDate(detail.started_at)}
        />
        <StatTile
          label="Finalizado"
          value={
            detail.finished_at ? formatDate(detail.finished_at) : "En curso"
          }
        />
        <StatTile
          label="Nota"
          value={
            detail.score == null ? "—" : `${detail.score.toFixed(0)}%`
          }
          highlight={
            detail.passed === true
              ? "green"
              : detail.passed === false
                ? "rose"
                : undefined
          }
        />
        <StatTile
          label="Cambios de pestaña"
          value={detail.tab_switches.toString()}
          highlight={detail.tab_switches > 3 ? "rose" : undefined}
        />
      </div>

      {/* Publish + delete bar */}
      <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {published ? (
                <Eye className="size-4 text-green-600" />
              ) : (
                <EyeOff className="size-4 text-muted-foreground" />
              )}
              <span className="font-semibold">
                {published
                  ? "Resultados visibles al alumno"
                  : "Resultados ocultos al alumno"}
              </span>
            </div>
            <p className="max-w-xl text-xs text-muted-foreground">
              Cuando está activo, este alumno ve su nota y feedback. Si está
              desactivado, ve "examen enviado, esperando publicación".
            </p>
          </div>
          <Switch
            checked={published}
            onCheckedChange={handleTogglePublish}
            disabled={updatingPublish || !detail.finished_at}
          />
        </div>
      </div>

      {/* Per-question breakdown */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">
          Respuestas pregunta a pregunta
        </h2>
        <div className="space-y-3">
          {detail.answers.map((ans, i) => (
            <AnswerCard key={ans.questionId} index={i + 1} answer={ans} />
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border-2 border-rose-200 bg-rose-50/30 p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-rose-900">Eliminar intento</h3>
            <p className="text-xs text-rose-800/70">
              Borra el intento y todas las respuestas. El alumno podrá repetir
              el examen al volver a entrar.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
          >
            <Trash2 className="size-4" /> Eliminar intento
          </Button>
        </div>
      </div>

      <Dialog
        open={confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar el intento?</DialogTitle>
            <DialogDescription>
              Esta acción borra el intento de{" "}
              <strong>{detail.student_name}</strong> y todas sus respuestas.
              Cuando vuelva a iniciar sesión, podrá hacer el examen de nuevo
              desde cero.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Sí, eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "green" | "rose";
}) {
  const highlightClass =
    highlight === "green"
      ? "text-green-600"
      : highlight === "rose"
        ? "text-rose-600"
        : "";
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-semibold ${highlightClass}`}>{value}</div>
    </div>
  );
}

function AnswerCard({
  index,
  answer,
}: {
  index: number;
  answer: AttemptDetailAnswer;
}) {
  const isWritten = answer.type === "written";
  const correct = answer.isCorrect;

  const headerColorClass =
    correct === true
      ? "bg-green-50/50"
      : correct === false
        ? "bg-rose-50/50"
        : "bg-muted/30";

  const indexBg =
    correct === true
      ? "bg-green-600"
      : correct === false
        ? "bg-rose-600"
        : "bg-zinc-500";

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div
        className={`flex items-start justify-between gap-3 border-b px-4 py-3 ${headerColorClass} sm:px-6`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${indexBg}`}
          >
            {index}
          </span>
          <div>
            <p className="text-sm font-semibold leading-snug">{answer.text}</p>
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
        <div className="shrink-0">
          {correct === true ? (
            <Badge className="bg-green-600">
              <CheckCircle2 className="size-3" /> Correcta
            </Badge>
          ) : correct === false ? (
            <Badge className="bg-rose-600">
              <XCircle className="size-3" /> Incorrecta
            </Badge>
          ) : (
            <Badge className="bg-amber-500">
              <AlertTriangle className="size-3" /> Pendiente / sin responder
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-6">
        {answer.imageUrl ? (
          <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg bg-muted">
            <Image
              src={answer.imageUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover"
            />
          </div>
        ) : null}

        {isWritten ? (
          <WrittenAnswerView answer={answer} />
        ) : (
          <MultipleChoiceAnswerView answer={answer} />
        )}
      </div>
    </div>
  );
}

function MultipleChoiceAnswerView({
  answer,
}: {
  answer: AttemptDetailAnswer;
}) {
  const options = answer.options ?? [];
  return (
    <div className="space-y-1.5">
      {options.map((opt) => {
        const isSelected = answer.selectedOptionId === opt.id;
        const isCorrect = answer.correctOptionId === opt.id;
        let className =
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm";
        if (isCorrect) {
          className += " border-green-300 bg-green-50";
        } else if (isSelected && !isCorrect) {
          className += " border-rose-300 bg-rose-50";
        } else {
          className += " border-muted";
        }
        return (
          <div key={opt.id} className={className}>
            {isCorrect ? (
              <CheckCircle2 className="size-4 shrink-0 text-green-600" />
            ) : isSelected ? (
              <XCircle className="size-4 shrink-0 text-rose-600" />
            ) : (
              <span className="size-4 shrink-0 rounded-full border-2 border-muted" />
            )}
            <span className="flex-1">{opt.text}</span>
            {isSelected ? (
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                Seleccionada
              </span>
            ) : null}
            {isCorrect && !isSelected ? (
              <span className="text-[10px] font-bold uppercase text-green-700">
                Correcta
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function WrittenAnswerView({ answer }: { answer: AttemptDetailAnswer }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Respuesta del alumno
        </p>
        <div className="mt-1 rounded-lg border border-violet-200 bg-violet-50/30 p-3 text-sm leading-relaxed">
          {answer.textAnswer ? (
            <p className="whitespace-pre-wrap">{answer.textAnswer}</p>
          ) : (
            <p className="italic text-muted-foreground">(Sin respuesta)</p>
          )}
        </div>
      </div>

      {answer.aiScore != null ? (
        <div className="flex items-baseline gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Nota IA
          </p>
          <span
            className={`text-2xl font-bold tabular-nums ${
              answer.aiScore >= 70
                ? "text-green-600"
                : answer.aiScore >= 40
                  ? "text-amber-600"
                  : "text-rose-600"
            }`}
          >
            {answer.aiScore.toFixed(0)} / 100
          </span>
        </div>
      ) : null}

      {answer.aiFeedback ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Feedback IA
          </p>
          <div className="mt-1 whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 text-sm leading-relaxed">
            {answer.aiFeedback}
          </div>
        </div>
      ) : null}

      <Separator />

      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
          Ver respuesta modelo y rúbrica
        </summary>
        <div className="mt-2 space-y-3">
          {answer.referenceAnswer ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-green-700">
                Respuesta modelo
              </p>
              <div className="mt-1 whitespace-pre-wrap rounded-lg border border-green-200 bg-green-50/40 p-3 text-sm leading-relaxed">
                {answer.referenceAnswer}
              </div>
            </div>
          ) : null}
          {answer.gradingRubric ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-pink-700">
                Rúbrica
              </p>
              <div className="mt-1 whitespace-pre-wrap rounded-lg border border-pink-200 bg-pink-50/30 p-3 text-sm leading-relaxed">
                {answer.gradingRubric}
              </div>
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}
