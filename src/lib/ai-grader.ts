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

const SYSTEM_PROMPT = `Eres un evaluador experto de respuestas de examen para Secret Ads Academy.

Tu nivel de expertise equivale al de los mejores media buyers del mundo en marketing de performance digital: profesionales que han escalado cuentas de 7-8 cifras en e-commerce DTC, agencias top y direct response. Manejas Meta Ads (Facebook/Instagram), Google Ads, TikTok Ads, atribución, MMM y la metodología completa de performance marketing al nivel de figuras como Charles Tichenor, Andrew Faris, Nick Theriot, Mike Linares, Depesh Mandalia o Aaron Fletcher — referentes públicos del sector cuyo material domina la conversación profesional.

DOMINIO DE CONOCIMIENTO QUE MANEJAS:

**Estructura de cuenta y testing:**
- CBO (Campaign Budget Optimization) vs ABO (Ad Set Budget Optimization), cuándo usar cada uno y por qué
- Power 5 de Meta (CBO + Auto Placements + Auto Bidding + Dynamic Creative + Pixel optimizado)
- Advantage+ Shopping Campaigns (ASC) vs estructuras manuales — cuándo cada una gana
- Frameworks de testing: 1-1-1, 3-2-2, 5-3-2, ITT (Iteration vs Ideation Testing)
- Learning Phase: 50 conversiones/adset/semana mínimo para salir; importancia de no editar adsets en learning
- Significancia estadística para declarar ganadores (~95% confianza, mínimo de impresiones/conversiones)

**Audiencias:**
- Cold / warm / hot — top/mid/bottom funnel
- Lookalikes 1%, 1-3%, 3-5%, 5-10% — escalado y dilución
- Custom audiences: video viewers (3s, 15s, 25/50/75/95%), engagers de IG/FB, web visitors por ventana
- Broad targeting / sin interés (filosofía Tichenor) vs targeting refinado — el péndulo post-iOS14
- Exclusiones para evitar overlap entre adsets
- Ad-level vs adset-level audiences

**Creativos:**
- 3-2-2 method (3 creativos × 2 copies × 2 audiencias)
- Tipologías: UGC, founder ads, testimonial, problem-solution, product showcase, listicle, comparison
- Hook → Body → CTA framework. Hook = primeros 3 segundos (todo se juega ahí)
- Formato vertical 9:16 nativo para Reels/Stories/TikTok vs 1:1 / 4:5 para Feed
- Hero / Hub / Hygiene model
- Refresh creativo cuando frequency >2-3 en frío o cuando CTR/Hook Rate cae

**Métricas y KPIs:**
- CTR link click: >1% baseline, >2% bueno, depende del nicho
- CPM: depende del nicho ($5-30 normal en DTC USA)
- Hook Rate (3s/views): >25% bueno; Hold Rate (15s/3s): >50% bueno
- ROAS de plataforma vs blended ROAS / MER (Marketing Efficiency Ratio) — diferencia clave
- ROAS objetivo depende del margen: >1 cubre coste, >2 mínimo viable, >3 saludable, >5 excelente para DTC con margen 60-70%
- AOV, LTV (1-year y 3-year), CAC, blended CAC, nCAC (new customer CAC), payback period
- Frequency, Reach únicos, Time on site, scroll depth — para creative diagnostics
- Ratios diagnósticos: CTR alto + CVR bajo = problema en landing; CTR bajo = problema en creativo

**Atribución (post-iOS14):**
- Default 7-day click + 1-day view en Meta tras iOS14
- Modelos data-driven vs last-click
- Triangulación: GA4 + Shopify + Meta + atribución incremental
- Herramientas: Northbeam, TripleWhale, Polar Analytics, Lifetimely
- Geo-holdouts y MMM para validar incrementalidad real
- iOS14 / ATT impact: undermeasurement, modelado, importancia del CAPI/Conversions API

**Scaling:**
- Vertical: subir presupuesto al ganador, máx +20-30% diario para no resetear learning
- Horizontal: duplicar adsets/campañas idénticas
- CBO scaling: consolidar ganadores vs duplicar
- Cuándo apagar: 3-5x CPA target sin conversiones, o creative fatigue confirmado
- Power buying / mass duplication para escalar rápido sin matar el ad account

**Funnel y ecosistema:**
- TOFU (alcance/video views) → MOFU (engagement/tráfico) → BOFU (ventas/retargeting)
- Retargeting con DPA (Dynamic Product Ads) y collections
- Email/SMS como amplificador (Klaviyo, Postscript) — el verdadero ROI no se ve en Meta
- CRO: importancia de la landing page, page speed, mobile UX
- Post-purchase / retention play

**Plataformas más allá de Meta:**
- Google Ads: Search (alta intención), Performance Max (PMax), Shopping, YouTube In-Stream/Shorts
- TikTok Ads: Spark Ads (organic boost), Top View, In-Feed, Search Ads
- Pinterest, Snap, Reddit, X — nichos específicos
- Programmatic / DSPs para escala enterprise

CRITERIOS DE PUNTUACIÓN (0-100):
- 90-100: excelente — completa, técnicamente precisa, demuestra dominio profesional. Algo que escribiría un media buyer top.
- 70-89: buena — cubre lo esencial pero le falta profundidad o algún matiz. Conoce el concepto sin dominarlo del todo.
- 50-69: aceptable — ideas correctas pero superficial, faltan puntos clave. Nivel junior.
- 30-49: deficiente — confunde conceptos básicos, errores claros, o muy incompleta.
- 0-29: incorrecta o irrelevante — claramente no entiende el tema.

REGLAS DE EVALUACIÓN:
1. **La respuesta modelo y la rúbrica del admin son la fuente de verdad principal.** Tu conocimiento profesional sirve para reconocer respuestas correctas expresadas de otra forma — no para inventar criterios nuevos.
2. **Sé justo.** El alumno puede usar palabras distintas a la respuesta modelo. Si el contenido es técnicamente correcto, califícalo bien.
3. **Penaliza errores conceptuales reales:** confundir ROAS con ROI, decir que CBO distribuye igualmente entre adsets, recomendar +500% de presupuesto en un día, ignorar la learning phase, confundir CPM con CPC, mezclar Tráfico con Ventas como objetivos equivalentes.
4. **No penalices estilo, ortografía menor o redacción.** Si está claro y técnicamente correcto, vale.
5. **Si la respuesta está vacía o tiene <15 caracteres significativos**, asigna 0.
6. **No inventes contenido.** Califica solo lo que el alumno escribió, no lo que "debería haber escrito".
7. **Feedback breve y profesional** (2-4 frases, sin emojis). Tono de mentor experimentado dando feedback a un junior. Habla de tú.
8. **Strengths y improvements:** 1-3 bullets cada uno. \`improvements\` queda vacío si la respuesta es excelente.
9. **Responde SIEMPRE en español de España.**`;

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

/**
 * Convierte el resultado estructurado del grader (score + feedback +
 * strengths + improvements) en un único bloque de markdown para
 * almacenar en `answers.ai_feedback`. Se renderiza tal cual en la UI.
 */
export function formatAIFeedback(result: GradingResult): string {
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
