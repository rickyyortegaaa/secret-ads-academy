"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ImagePlus,
  Loader2,
  Save,
  Trash2,
  X,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  createQuestionAction,
  updateQuestionAction,
  uploadQuestionImageAction,
  type AdminQuestion,
  type QuestionFormInput,
} from "@/app/actions/admin/questions";

type Mode = { kind: "create" } | { kind: "edit"; question: AdminQuestion };

type Props = {
  mode: Mode;
};

const DEFAULT_OPTIONS = [
  { id: "a", text: "" },
  { id: "b", text: "" },
  { id: "c", text: "" },
  { id: "d", text: "" },
];

export function QuestionForm({ mode }: Props) {
  const router = useRouter();
  const initial = mode.kind === "edit" ? mode.question : null;

  const [type, setType] = useState<"multiple_choice" | "written">(
    initial?.type ?? "multiple_choice"
  );
  const [position, setPosition] = useState<number>(initial?.position ?? 0);
  const [text, setText] = useState(initial?.text ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(
    initial?.image_url ?? null
  );
  const [timeSeconds, setTimeSeconds] = useState<number>(
    initial?.time_seconds ?? (initial?.type === "written" ? 180 : 30)
  );

  // Multiple choice
  const [options, setOptions] = useState<{ id: string; text: string }[]>(
    initial?.options ?? DEFAULT_OPTIONS
  );
  const [correctOptionId, setCorrectOptionId] = useState<string>(
    initial?.correct_option_id ?? "a"
  );

  // Written
  const [referenceAnswer, setReferenceAnswer] = useState(
    initial?.reference_answer ?? ""
  );
  const [gradingRubric, setGradingRubric] = useState(
    initial?.grading_rubric ?? ""
  );

  const [uploading, setUploading] = useState(false);
  const [saving, startSaving] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTypeChange = (next: "multiple_choice" | "written") => {
    setType(next);
    // Sensible time defaults when switching
    if (next === "written" && timeSeconds < 60) setTimeSeconds(180);
    if (next === "multiple_choice" && timeSeconds > 90) setTimeSeconds(30);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadQuestionImageAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setImageUrl(result.url);
      toast.success("Imagen subida");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    setFieldErrors({});

    const payload: QuestionFormInput =
      type === "multiple_choice"
        ? {
            type: "multiple_choice",
            position,
            text,
            image_url: imageUrl,
            time_seconds: timeSeconds,
            options,
            correct_option_id: correctOptionId,
          }
        : {
            type: "written",
            position,
            text,
            image_url: imageUrl,
            time_seconds: timeSeconds,
            reference_answer: referenceAnswer,
            grading_rubric: gradingRubric || null,
          };

    startSaving(async () => {
      const result =
        mode.kind === "create"
          ? await createQuestionAction(payload)
          : await updateQuestionAction(mode.question.id, payload);

      if (!result.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(
        mode.kind === "create"
          ? "Pregunta creada"
          : "Cambios guardados"
      );
      router.push("/admin/questions");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Type selector */}
      <FormSection
        title="Tipo de pregunta"
        description="Elige si es de tipo test (4 opciones) o respuesta abierta (corrección por IA)."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TypeCard
            active={type === "multiple_choice"}
            onClick={() => handleTypeChange("multiple_choice")}
            badge="Test"
            badgeClass="bg-pink-100 text-pink-700"
            title="Tipo test"
            description="4 opciones (A/B/C/D), una correcta. Click avanza."
          />
          <TypeCard
            active={type === "written"}
            onClick={() => handleTypeChange("written")}
            badge="Abierta"
            badgeClass="bg-violet-100 text-violet-700"
            title="Respuesta abierta"
            description="Textarea libre. Corregida por IA con tu respuesta modelo."
          />
        </div>
      </FormSection>

      {/* Common fields */}
      <FormSection title="Pregunta">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="text">Texto de la pregunta *</Label>
            <Textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="¿Qué métrica mide...?"
              className="text-base"
            />
            <FieldError name="text" errors={fieldErrors} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="position">Posición</Label>
            <Input
              id="position"
              type="number"
              min={0}
              value={position}
              onChange={(e) => setPosition(Number(e.target.value) || 0)}
              className="w-24 tabular-nums"
            />
            <p className="text-[10px] text-muted-foreground">
              Orden por defecto antes de randomizar.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="time">Tiempo (segundos)</Label>
            <Input
              id="time"
              type="number"
              min={5}
              max={600}
              value={timeSeconds}
              onChange={(e) => setTimeSeconds(Number(e.target.value) || 30)}
              className="w-24 tabular-nums"
            />
            <FieldError name="time_seconds" errors={fieldErrors} />
          </div>
        </div>
      </FormSection>

      {/* Image */}
      <FormSection
        title="Imagen"
        description="Opcional. Aparece encima de la pregunta. Máximo 5 MB."
      >
        {imageUrl ? (
          <div className="relative inline-block">
            <div className="relative h-48 w-80 max-w-full overflow-hidden rounded-lg border bg-muted">
              <Image
                src={imageUrl}
                alt=""
                fill
                sizes="320px"
                className="object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="absolute -top-2 -right-2 inline-flex size-7 items-center justify-center rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700"
              aria-label="Quitar imagen"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="group flex h-48 w-80 max-w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 transition-colors hover:border-pink-400 hover:bg-pink-50/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? (
              <>
                <Loader2 className="size-6 animate-spin text-pink-500" />
                <span className="text-sm text-muted-foreground">
                  Subiendo imagen...
                </span>
              </>
            ) : (
              <>
                <ImagePlus className="size-8 text-muted-foreground group-hover:text-pink-500" />
                <span className="text-sm font-medium">
                  Click para subir imagen
                </span>
                <span className="text-xs text-muted-foreground">
                  JPG, PNG, WebP — máx 5 MB
                </span>
              </>
            )}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImageUpload(file);
            e.target.value = "";
          }}
        />
      </FormSection>

      {/* Type-specific fields */}
      {type === "multiple_choice" ? (
        <FormSection
          title="Opciones de respuesta"
          description="Marca cuál es la correcta haciendo click en el círculo del lado izquierdo."
        >
          <div className="space-y-3">
            {options.map((opt, i) => {
              const letters = ["A", "B", "C", "D"];
              const isCorrect = correctOptionId === opt.id;
              return (
                <div
                  key={opt.id}
                  className={`flex items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
                    isCorrect
                      ? "border-green-300 bg-green-50/40"
                      : "border-muted"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setCorrectOptionId(opt.id)}
                    className={`mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      isCorrect
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-muted-foreground/40 hover:border-foreground"
                    }`}
                    aria-label={`Marcar opción ${letters[i]} como correcta`}
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <span className="text-xs font-bold">{letters[i]}</span>
                    )}
                  </button>
                  <div className="flex-1">
                    <Input
                      value={opt.text}
                      onChange={(e) =>
                        setOptions((prev) =>
                          prev.map((o, idx) =>
                            idx === i ? { ...o, text: e.target.value } : o
                          )
                        )
                      }
                      placeholder={`Opción ${letters[i]}`}
                      className={isCorrect ? "border-green-300" : ""}
                    />
                    <FieldError
                      name={`options.${i}.text`}
                      errors={fieldErrors}
                    />
                  </div>
                  {isCorrect ? (
                    <Badge className="mt-1 shrink-0 bg-green-600">
                      Correcta
                    </Badge>
                  ) : null}
                </div>
              );
            })}
          </div>
        </FormSection>
      ) : (
        <>
          <FormSection
            title="Respuesta modelo"
            description="La respuesta correcta tal y como la daría un alumno experto. La IA usa esto como fuente de verdad para puntuar."
          >
            <Textarea
              value={referenceAnswer}
              onChange={(e) => setReferenceAnswer(e.target.value)}
              rows={6}
              placeholder="Escribe aquí la respuesta correcta..."
              className="text-sm"
            />
            <FieldError name="reference_answer" errors={fieldErrors} />
            <p className="mt-1 text-xs text-muted-foreground">
              {referenceAnswer.length} caracteres · mínimo 20
            </p>
          </FormSection>
          <FormSection
            title="Rúbrica adicional (opcional)"
            description="Indica puntos clave que debe tocar el alumno o cosas que penalizar. La IA combina esto con la respuesta modelo."
          >
            <Textarea
              value={gradingRubric}
              onChange={(e) => setGradingRubric(e.target.value)}
              rows={4}
              placeholder="ej: Debe mencionar la fórmula. Bonus si pone un ejemplo numérico. Penalizar si confunde ROAS con ROI."
              className="text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {gradingRubric.length} / 2000 caracteres
            </p>
          </FormSection>
        </>
      )}

      {/* Save bar */}
      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t bg-card/95 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:-mx-6 sm:px-6">
        <div className="text-xs text-muted-foreground">
          {Object.keys(fieldErrors).length > 0 ? (
            <span className="font-semibold text-destructive">
              Revisa los campos marcados arriba
            </span>
          ) : (
            "Los cambios se guardan al pulsar el botón"
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/questions")}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving || uploading}
            className="brand-gradient text-white"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {mode.kind === "create" ? "Crear pregunta" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

function TypeCard({
  active,
  onClick,
  badge,
  badgeClass,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  badge: string;
  badgeClass: string;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-all",
        active
          ? "border-foreground bg-foreground/5 shadow-md"
          : "border-muted hover:border-pink-200 hover:bg-pink-50/30",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <Badge className={badgeClass}>{badge}</Badge>
        {active ? <CheckCircle2 className="size-5 text-foreground" /> : null}
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

function FieldError({
  name,
  errors,
}: {
  name: string;
  errors: Record<string, string>;
}) {
  if (!errors[name]) return null;
  return (
    <p className="mt-1 text-xs text-destructive">{errors[name]}</p>
  );
}

// (Trash2 imported but no longer used — keep for future bulk delete)
void Trash2;
