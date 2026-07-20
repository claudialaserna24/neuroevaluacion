import { z } from "zod";

// Schema plano y strict-compatible para Output.object en OpenAI.
// Sin .min()/.max()/format/enum grande. Los límites se declaran en el prompt.

const instructionCard = z.object({
  name: z.string(),
  priority_level: z.string(),
  purpose: z.string(),
  description: z.string(),
  frequency: z.string(),
  repetitions: z.string(),
  progression: z.string(),
  materials: z.string(),
  sources: z.array(z.string()),
});

const weekBlock = z.object({
  week: z.number(),
  focus: z.string(),
  activities: z.string(),
  adjustments: z.string(),
});

const trackingRow = z.object({
  week: z.number(),
  observations_prompt: z.string(),
  achievements_prompt: z.string(),
  difficulties_prompt: z.string(),
});

export const PlanContentSchema = z.object({
  context: z.object({
    child_name: z.string(),
    age: z.string(),
    diagnosis: z.string(),
    reason: z.string(),
    duration_weeks: z.number(),
    intro: z.string(),
  }),
  findings: z.object({
    body: z.string(),
    sources: z.array(z.string()),
  }),
  objectives: z.object({
    intro: z.string(),
    items: z.array(z.string()),
  }),
  instruction_cards: z.object({
    intro: z.string(),
    cards: z.array(instructionCard),
  }),
  routine_12_weeks: z.object({
    intro: z.string(),
    weeks: z.array(weekBlock),
  }),
  weekly_tracking: z.object({
    intro: z.string(),
    rows: z.array(trackingRow),
  }),
  family_recommendations: z.object({
    intro: z.string(),
    items: z.array(z.string()),
    sources: z.array(z.string()),
  }),
  closing: z.object({
    body: z.string(),
  }),
  legal_notice: z.object({
    body: z.string(),
  }),
});

export type PlanContent = z.infer<typeof PlanContentSchema>;
export const MANUAL_REMINDER_TEXT =
  "La ejecución correcta de este ejercicio puede consultarse en el Manual Oficial de Ejercicios NEUROPLAN disponible para descarga.";
export const LEGAL_NOTICE_TEXT =
  "Este Plan Interactivo NEUROPLAN es una herramienta educativa y orientadora basada en la información suministrada durante la evaluación. No constituye un diagnóstico clínico ni reemplaza la valoración, el tratamiento o el criterio profesional de un especialista en salud.";
