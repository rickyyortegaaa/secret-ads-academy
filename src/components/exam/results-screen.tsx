"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Award,
  Download,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getAttemptResultsAction,
  type AttemptResultItem,
  type GetAttemptResultsResult,
} from "@/app/actions/exam";

type ResultsScreenProps = {
  attemptId: string;
  studentName: string;
  onLogout: () => void;
};

export function ResultsScreen({
  attemptId,
  studentName,
  onLogout,
}: ResultsScreenProps) {
  const [data, setData] = useState<GetAttemptResultsResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getAttemptResultsAction(attemptId);
      if (!cancelled) setData(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="brand-text-gradient size-10 animate-spin" />
        <p className="text-sm text-muted-foreground">
          Cargando resultados...
        </p>
      </div>
    );
  }

  if (!data.ok) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-destructive">{data.error}</p>
        <Button onClick={onLogout} variant="outline" className="mt-4">
          Cerrar sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-2 sm:px-0">
      {/* Score banner */}
      <ScoreBanner
        studentName={studentName}
        score={data.score}
        passed={data.passed}
        published={data.published}
        passThreshold={data.passThreshold}
      />

      {/* Per-question feedback */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Revisión pregunta a pregunta</h2>
        <p className="text-sm text-muted-foreground">
          Aquí tienes el detalle de cada pregunta con su corrección y, en las
          respuestas abiertas, el feedback de la IA.
        </p>
      </div>

      {data.items.map((item, i) => (
        <ResultCard key={item.questionId} index={i + 1} item={item} />
      ))}

      <div className="mt-4 flex justify-center">
        <Button onClick={onLogout} variant="outline" className="rounded-full">
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

function ScoreBanner({
  studentName,
  score,
  passed,
  published,
  passThreshold,
}: {
  studentName: string;
  score: number;
  passed: boolean | null;
  published: boolean;
  passThreshold: number;
}) {
  if (!published) {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-md">
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandLogo size={64} showWordmark={false} />
          <div>
            <h1 className="text-2xl font-bold">¡Examen enviado!</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gracias, {studentName}. Tus respuestas han quedado registradas.
              Recibirás tu nota cuando la academia publique los resultados.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border-2 p-6 shadow-lg ${
        passed
          ? "border-green-200 bg-green-50/40"
          : "border-rose-200 bg-rose-50/40"
      }`}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <BrandLogo size={56} showWordmark={false} />
        <h1 className="text-xl font-semibold sm:text-2xl">
          ¡Buen trabajo, {studentName}!
        </h1>
        <div className="brand-text-gradient text-6xl font-bold tabular-nums sm:text-7xl">
          {score.toFixed(0)}
          <span className="text-3xl">%</span>
        </div>
        {passed != null ? (
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wider ${
              passed
                ? "bg-green-600 text-white"
                : "bg-rose-600 text-white"
            }`}
          >
            {passed ? (
              <>
                <CheckCircle2 className="size-4" /> Aprobado
              </>
            ) : (
              <>
                <XCircle className="size-4" /> No aprobado
              </>
            )}
          </span>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Umbral de aprobado: {passThreshold}%
        </p>

        {passed === true ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border-2 border-green-300 bg-white p-4 shadow-sm">
            <Award className="size-8 text-green-700" />
            <p className="text-sm font-semibold text-foreground">
              Tu certificado oficial ya está listo
            </p>
            <a
              href="/exam/certificate"
              download
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green-600 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-green-700"
            >
              <Download className="size-4" />
              Descargar certificado PDF
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResultCard({
  index,
  item,
}: {
  index: number;
  item: AttemptResultItem;
}) {
  const isWritten = item.type === "written";
  const correct = item.isCorrect;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* Header */}
      <div
        className={`flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 ${
          correct === true
            ? "bg-green-50/50"
            : correct === false
              ? "bg-rose-50/50"
              : "bg-muted/30"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
              correct === true
                ? "bg-green-600"
                : correct === false
                  ? "bg-rose-600"
                  : "bg-zinc-500"
            }`}
          >
            {index}
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold leading-snug">{item.text}</p>
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
        {correct === true ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-3 py-1 text-xs font-bold uppercase text-white">
            <CheckCircle2 className="size-3" /> Correcta
          </span>
        ) : correct === false ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold uppercase text-white">
            <XCircle className="size-3" /> Incorrecta
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold uppercase text-white">
            <AlertTriangle className="size-3" /> Pendiente
          </span>
        )}
      </div>

      {/* Body */}
      <div className="space-y-4 px-4 py-4 sm:px-6">
        {isWritten ? (
          <WrittenResultBody item={item} />
        ) : (
          <MultipleChoiceResultBody item={item} />
        )}
      </div>
    </div>
  );
}

function MultipleChoiceResultBody({ item }: { item: AttemptResultItem }) {
  const options = item.options ?? [];
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Opciones
      </p>
      <ul className="space-y-1.5">
        {options.map((opt) => {
          const isSelected = item.selectedOptionId === opt.id;
          const isCorrect = item.correctOptionId === opt.id;
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
            <li key={opt.id} className={className}>
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
                  Tu respuesta
                </span>
              ) : null}
              {isCorrect && !isSelected ? (
                <span className="text-[10px] font-bold uppercase text-green-700">
                  Correcta
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WrittenResultBody({ item }: { item: AttemptResultItem }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tu respuesta
        </p>
        <div className="mt-1 rounded-lg border border-violet-200 bg-violet-50/30 p-3 text-sm leading-relaxed">
          {item.textAnswer ? (
            <p className="whitespace-pre-wrap">{item.textAnswer}</p>
          ) : (
            <p className="italic text-muted-foreground">(Sin respuesta)</p>
          )}
        </div>
      </div>

      {item.aiScore != null ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Nota IA
          </p>
          <div className="mt-1 inline-flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold tabular-nums ${
                item.aiScore >= 70
                  ? "text-green-600"
                  : item.aiScore >= 40
                    ? "text-amber-600"
                    : "text-rose-600"
              }`}
            >
              {item.aiScore.toFixed(0)}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
        </div>
      ) : null}

      {item.aiFeedback ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Feedback de la corrección
          </p>
          <FeedbackMarkdown text={item.aiFeedback} />
        </div>
      ) : null}

      {item.referenceAnswer ? (
        <div>
          <Separator className="my-2" />
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
              Ver respuesta modelo
            </summary>
            <div className="mt-2 rounded-lg border border-green-200 bg-green-50/40 p-3 text-sm leading-relaxed">
              <p className="whitespace-pre-wrap">{item.referenceAnswer}</p>
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Renderizado mínimo de markdown — solo soporta los patrones que produce
 * nuestro grader: párrafos, **negrita** en líneas concretas, y listas
 * con guión "- ". Sin dependencias.
 */
function FeedbackMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  type Block =
    | { type: "p"; content: string }
    | { type: "strong"; content: string }
    | { type: "ul"; items: string[] };
  const blocks: Block[] = [];
  let currentList: string[] | null = null;

  const flushList = () => {
    if (currentList && currentList.length > 0) {
      blocks.push({ type: "ul", items: currentList });
    }
    currentList = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith("- ")) {
      if (!currentList) currentList = [];
      currentList.push(line.slice(2));
      continue;
    }
    flushList();
    const strongMatch = line.match(/^\*\*(.+):\*\*$/);
    if (strongMatch) {
      blocks.push({ type: "strong", content: strongMatch[1] });
    } else {
      blocks.push({ type: "p", content: line });
    }
  }
  flushList();

  return (
    <div className="mt-1 space-y-2 rounded-lg border bg-muted/20 p-3 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        if (b.type === "p")
          return (
            <p key={i} className="text-foreground/90">
              {b.content}
            </p>
          );
        if (b.type === "strong")
          return (
            <p
              key={i}
              className="text-xs font-semibold uppercase tracking-wider text-foreground"
            >
              {b.content}:
            </p>
          );
        return (
          <ul key={i} className="ml-4 list-disc space-y-1 text-foreground/90">
            {b.items.map((it, j) => (
              <li key={j}>{it}</li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
