import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Schema for the structured output                                   */
/* ------------------------------------------------------------------ */

const GradingResultSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Nota 0-100 según los criterios. 0 = irrelevante, 100 = excelente."
    ),
  feedback: z
    .string()
    .describe(
      "Feedback breve para el alumno (2-4 frases) explicando la nota. En español, tono constructivo y profesional."
    ),
  strengths: z
    .array(z.string())
    .describe("Puntos positivos concretos. 1-3 bullets."),
  improvements: z
    .array(z.string())
    .describe(
      "Aspectos a mejorar o conceptos que ha fallado. 1-3 bullets. Vacío si la respuesta es excelente."
    ),
});

export type GradingResult = z.infer<typeof GradingResultSchema>;

/* ------------------------------------------------------------------ */
/*  System prompt — fijo                                               */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `Eres un evaluador experto de respuestas de examen para Secret Ads Academy, una academia especializada en publicidad digital, Meta Ads, Google Ads y marketing performance.

Tu trabajo es corregir la respuesta de un alumno comparándola con una respuesta modelo y, opcionalmente, una rúbrica adicional definida por la academia.

CRITERIOS DE PUNTUACIÓN:
- 90-100: respuesta excelente — completa, precisa y demuestra dominio del tema
- 70-89: buena respuesta — cubre los puntos clave aunque con alguna imprecisión menor o falta de profundidad
- 50-69: respuesta aceptable — parcialmente correcta o incompleta
- 30-49: respuesta deficiente — errores conceptuales claros o muy incompleta
- 0-29: respuesta incorrecta o irrelevante

REGLAS:
1. Sé justo y constructivo — el objetivo es ayudar al alumno a aprender.
2. No penalices por estilo o redacción. Si el alumno expresa la idea correcta con palabras distintas a la respuesta modelo, califícala como correcta.
3. Sí penalizas: errores conceptuales, omisiones de puntos clave de la rúbrica, contenido irrelevante.
4. Si la respuesta está vacía o tiene <15 caracteres significativos, asigna 0.
5. Responde SIEMPRE en español. Tono profesional, directo, sin emojis.
6. El feedback debe ser breve (2-4 frases). No repitas la respuesta modelo entera; menciona solo los puntos clave que faltaron o los aciertos.
7. La sección "improvements" puede quedar vacía si la respuesta es excelente.`;

/* ------------------------------------------------------------------ */
/*  Single-shot grader                                                 */
/* ------------------------------------------------------------------ */

export type GradeWrittenInput = {
  question: string;
  referenceAnswer: string;
  rubric?: string | null;
  studentAnswer: string;
};

export async function gradeWrittenAnswer(
  input: GradeWrittenInput
): Promise<GradingResult> {
  const client = new Anthropic();

  const userPrompt = [
    "## Pregunta",
    input.question,
    "",
    "## Respuesta modelo (fuente de verdad)",
    input.referenceAnswer,
    "",
    input.rubric
      ? ["## Rúbrica adicional", input.rubric, ""].join("\n")
      : "",
    "## Respuesta del alumno",
    input.studentAnswer.trim() || "(vacía)",
    "",
    "Evalúa la respuesta del alumno siguiendo los criterios.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.parse({
    model: "claude-opus-4-7",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    thinking: { type: "adaptive" },
    output_config: {
      format: zodOutputFormat(GradingResultSchema),
      effort: "high",
    },
    messages: [{ role: "user", content: userPrompt }],
  });

  if (!response.parsed_output) {
    throw new Error("AI grader returned no parsed output");
  }

  // Defensive clamp — schema should already enforce, but belt-and-braces
  return {
    ...response.parsed_output,
    score: Math.max(0, Math.min(100, response.parsed_output.score)),
  };
}

/* ------------------------------------------------------------------ */
/*  Batch grader — runs all written answers in parallel                */
/*  with per-call error isolation so one failure doesn't kill the rest */
/* ------------------------------------------------------------------ */

export type BatchGradeInput = {
  answerId: string;
  input: GradeWrittenInput;
};

export type BatchGradeResult =
  | { answerId: string; ok: true; result: GradingResult }
  | { answerId: string; ok: false; error: string };

export async function gradeWrittenAnswersBatch(
  items: BatchGradeInput[]
): Promise<BatchGradeResult[]> {
  return Promise.all(
    items.map(async ({ answerId, input }) => {
      try {
        const result = await gradeWrittenAnswer(input);
        return { answerId, ok: true as const, result };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown grading error";
        console.error(`AI grading failed for answer ${answerId}:`, err);
        return { answerId, ok: false as const, error: message };
      }
    })
  );
}
