"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";

import { requireAdminEmail } from "./auth";

/* ------------------------------------------------------------------ */
/*  Schemas                                                            */
/* ------------------------------------------------------------------ */

const optionSchema = z.object({
  id: z.string().min(1).max(8),
  text: z.string().trim().min(1, "Cada opción tiene que tener texto").max(280),
});

const baseQuestionSchema = z.object({
  position: z.coerce.number().int().min(0).max(9999),
  text: z
    .string()
    .trim()
    .min(5, "La pregunta tiene que tener al menos 5 caracteres")
    .max(1000),
  image_url: z
    .string()
    .url("URL no válida")
    .max(500)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  time_seconds: z.coerce
    .number()
    .int()
    .min(5, "Mínimo 5 segundos")
    .max(600, "Máximo 600 segundos"),
});

const multipleChoiceSchema = baseQuestionSchema.extend({
  type: z.literal("multiple_choice"),
  options: z.array(optionSchema).length(4, "Tienen que ser 4 opciones"),
  correct_option_id: z.string().min(1, "Marca cuál es la correcta"),
  reference_answer: z.null().optional(),
  grading_rubric: z.null().optional(),
});

const writtenSchema = baseQuestionSchema.extend({
  type: z.literal("written"),
  options: z.null().optional(),
  correct_option_id: z.null().optional(),
  reference_answer: z
    .string()
    .trim()
    .min(20, "La respuesta modelo debe tener al menos 20 caracteres")
    .max(4000),
  grading_rubric: z.string().trim().max(2000).optional().nullable(),
});

const questionFormSchema = z.discriminatedUnion("type", [
  multipleChoiceSchema,
  writtenSchema,
]);

export type QuestionFormInput = z.infer<typeof questionFormSchema>;

/* ------------------------------------------------------------------ */
/*  List + Get                                                         */
/* ------------------------------------------------------------------ */

export type AdminQuestion = {
  id: string;
  position: number;
  type: "multiple_choice" | "written";
  text: string;
  image_url: string | null;
  time_seconds: number;
  options: { id: string; text: string }[] | null;
  correct_option_id: string | null;
  reference_answer: string | null;
  grading_rubric: string | null;
};

export async function listQuestionsAction(): Promise<{
  ok: true;
  questions: AdminQuestion[];
}> {
  await requireAdminEmail();
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("questions")
    .select(
      "id, position, type, text, image_url, time_seconds, options, correct_option_id, reference_answer, grading_rubric"
    )
    .order("position", { ascending: true });

  return { ok: true, questions: data ?? [] };
}

export async function getQuestionAction(
  id: string
): Promise<{ ok: true; question: AdminQuestion } | { ok: false; error: string }> {
  await requireAdminEmail();
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, position, type, text, image_url, time_seconds, options, correct_option_id, reference_answer, grading_rubric"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Pregunta no encontrada" };
  return { ok: true, question: data };
}

/* ------------------------------------------------------------------ */
/*  Create / Update / Delete                                           */
/* ------------------------------------------------------------------ */

export type SaveQuestionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createQuestionAction(
  input: unknown
): Promise<SaveQuestionResult> {
  await requireAdminEmail();

  const parsed = questionFormSchema.safeParse(input);
  if (!parsed.success) {
    return parseToFieldErrors(parsed.error);
  }

  const data = parsed.data;
  const validated = validateLogic(data);
  if (!validated.ok) return validated;

  const supabase = createServiceClient();
  const { data: created, error } = await supabase
    .from("questions")
    .insert(toDbRow(data))
    .select("id")
    .single();

  if (error || !created) {
    console.error("createQuestion error", error);
    return { ok: false, error: "No se pudo crear la pregunta" };
  }

  revalidatePath("/admin/questions");
  return { ok: true, id: created.id };
}

export async function updateQuestionAction(
  id: string,
  input: unknown
): Promise<SaveQuestionResult> {
  await requireAdminEmail();

  const parsed = questionFormSchema.safeParse(input);
  if (!parsed.success) {
    return parseToFieldErrors(parsed.error);
  }

  const data = parsed.data;
  const validated = validateLogic(data);
  if (!validated.ok) return validated;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("questions")
    .update({ ...toDbRow(data), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("updateQuestion error", error);
    return { ok: false, error: "No se pudo actualizar la pregunta" };
  }

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}`);
  return { ok: true, id };
}

export async function deleteQuestionAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminEmail();
  const supabase = createServiceClient();

  // Check if any attempt has used this question — block delete to preserve history
  const { count } = await supabase
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("question_id", id);

  if (count && count > 0) {
    return {
      ok: false,
      error:
        "No puedes borrar una pregunta que ya tiene respuestas guardadas. Edítala o crea una nueva.",
    };
  }

  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) {
    console.error("deleteQuestion error", error);
    return { ok: false, error: "No se pudo borrar la pregunta" };
  }

  revalidatePath("/admin/questions");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Image upload to Supabase Storage                                   */
/* ------------------------------------------------------------------ */

export async function uploadQuestionImageAction(
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireAdminEmail();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No se recibió archivo" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Imagen demasiado grande (máx 5 MB)" };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Solo se permiten imágenes" };
  }

  const supabase = createServiceClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `questions/${crypto.randomUUID()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("question-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadErr) {
    console.error("uploadQuestionImage error", uploadErr);
    return { ok: false, error: "No se pudo subir la imagen" };
  }

  const { data } = supabase.storage.from("question-images").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

/* ------------------------------------------------------------------ */
/*  Internals                                                          */
/* ------------------------------------------------------------------ */

function parseToFieldErrors(error: z.ZodError): SaveQuestionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    fieldErrors[path] = issue.message;
  }
  return {
    ok: false,
    error: error.issues[0]?.message ?? "Datos inválidos",
    fieldErrors,
  };
}

function validateLogic(data: QuestionFormInput): SaveQuestionResult {
  if (data.type === "multiple_choice") {
    const ids = new Set(data.options.map((o) => o.id));
    if (ids.size !== data.options.length) {
      return { ok: false, error: "Las opciones tienen IDs duplicados" };
    }
    if (!ids.has(data.correct_option_id)) {
      return {
        ok: false,
        error: "La opción correcta no coincide con ninguna de las opciones",
      };
    }
  }
  return { ok: true, id: "" };
}

function toDbRow(data: QuestionFormInput) {
  return {
    position: data.position,
    type: data.type,
    text: data.text,
    image_url: data.image_url || null,
    time_seconds: data.time_seconds,
    options: data.type === "multiple_choice" ? data.options : null,
    correct_option_id:
      data.type === "multiple_choice" ? data.correct_option_id : null,
    reference_answer: data.type === "written" ? data.reference_answer : null,
    grading_rubric:
      data.type === "written" ? data.grading_rubric || null : null,
  };
}
