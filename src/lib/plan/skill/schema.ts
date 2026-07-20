import { z } from "zod";

// Schema plano y strict-compatible para Output.object en OpenAI.
// Sin .min()/.max()/format/enum grande. Los límites se piden en el prompt
// y se clampan en código si hace falta.
const section = z.object({
  title: z.string(),
  body: z.string(),
  sources: z.array(z.string()),
});

const instructionCard = z.object({
  title: z.string(),
  target: z.string(), // prioridad o reflejo al que aplica
  body: z.string(),
  materials: z.string(),
  frequency: z.string(),
  sources: z.array(z.string()),
});

const weekBlock = z.object({
  week: z.number(),
  focus: z.string(),
  activities: z.string(),
  notes: z.string(),
});

export const PlanContentSchema = z.object({
  context: section,
  findings: section,
  objectives: section,
  instruction_cards: z.object({
    title: z.string(),
    body: z.string(),
    cards: z.array(instructionCard),
  }),
  routine_12_weeks: z.object({
    title: z.string(),
    body: z.string(),
    weeks: z.array(weekBlock),
  }),
  follow_up: section,
  family_recommendations: section,
  closing: section,
  legal_notice: section,
});

export type PlanContent = z.infer<typeof PlanContentSchema>;
