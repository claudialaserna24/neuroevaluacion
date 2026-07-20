import { generateText, NoObjectGeneratedError, Output } from "ai";
import type { Json } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { PlanContentSchema, type PlanContent } from "./schema";
import { SYSTEM_PROMPT, USER_PROMPT_INSTRUCTIONS } from "./prompts";
import {
  formatCerebroForPrompt,
  queryCerebro,
  type QueryFilter,
} from "./cerebro-query";
import { buildPlanInput, type PlanInput } from "./context-builder";

export type GenerateResult =
  | { ok: true; roadmapId: string }
  | { ok: false; reason: string };

const FUNCTIONAL_MODULE = "Áreas Funcionales";
const REFLEX_MODULE = "Reflejos";
const RECOMMENDATIONS_MODULE = "Recomendaciones";

async function collectCerebroBriefing(
  supabase: SupabaseClient,
  input: PlanInput,
): Promise<string> {
  const parts: string[] = [];
  const priorities = input.roadmap.priorities;
  const funcPriorities = priorities.functionalPriorities ?? [];
  const reflexPriorities = priorities.reflexPriorities ?? [];
  const hemisphere = priorities.context?.hemisphere ?? null;

  for (const area of funcPriorities) {
    const filter: QueryFilter = {
      module: FUNCTIONAL_MODULE,
      subcategory: area,
      severity_level: priorities.context?.generalLevel ?? null,
      behavioral_condition: hemisphere,
    };
    const hit = await queryCerebro(supabase, filter);
    parts.push(formatCerebroForPrompt(`Área funcional: ${area}`, hit));
  }

  for (const reflex of reflexPriorities) {
    const filter: QueryFilter = {
      module: REFLEX_MODULE,
      subcategory: reflex,
      severity_level: null,
      behavioral_condition: null,
    };
    const hit = await queryCerebro(supabase, filter);
    parts.push(formatCerebroForPrompt(`Reflejo: ${reflex}`, hit));
  }

  const recs = await queryCerebro(supabase, { module: RECOMMENDATIONS_MODULE });
  parts.push(formatCerebroForPrompt("Recomendaciones generales", recs));

  return parts.join("\n\n");
}

function buildUserPrompt(input: PlanInput, cerebroBriefing: string): string {
  const p = input.patient;
  const r = input.roadmap;
  const priorities = r.priorities;
  const equipment = input.equipment.length
    ? input.equipment.join(", ")
    : "No se registró equipamiento específico; usar solo materiales cotidianos y seguros descritos en CEREBRO.";

  return [
    USER_PROMPT_INSTRUCTIONS,
    "",
    "## Paciente",
    `- Nombre: ${p.first_name} ${p.last_name}`,
    `- Edad: ${p.ageYears ?? "No disponible"}`,
    `- Ciudad: ${p.city ?? "No registrada"}`,
    `- Acudiente: ${p.parent_name ?? "No registrado"}`,
    `- Diagnóstico previo: ${p.diagnosis ?? "No registrado"}`,
    `- Motivo de consulta / historia: ${p.developmental_history ?? "No registrado"}`,
    `- Intervenciones actuales: ${p.interventions ?? "No registradas"}`,
    "",
    "## Hoja de Ruta (YA CALCULADA — no recalcular)",
    `- Nivel general: ${priorities.context?.generalLevel ?? "No disponible"}`,
    `- Hemisferio dominante: ${priorities.context?.hemisphere ?? "No disponible"}`,
    `- Prioridades funcionales (orden): ${(priorities.functionalPriorities ?? []).join(" > ") || "—"}`,
    `- Prioridades de reflejos (orden): ${(priorities.reflexPriorities ?? []).join(" > ") || "—"}`,
    "",
    "### Resumen bruto (referencia, no reinterpretar puntajes):",
    `cognitive=${JSON.stringify(r.cognitive)}`,
    `functional=${JSON.stringify(r.functional)}`,
    `reflexes=${JSON.stringify(r.reflexes)}`,
    "",
    "## Equipamiento disponible en casa",
    equipment,
    "",
    "## Duración",
    `${input.durationWeeks} semanas.`,
    "",
    "## Base documental CEREBRO (única fuente permitida)",
    cerebroBriefing,
  ].join("\n");
}

async function tryLock(
  supabaseAdmin: SupabaseClient,
  roadmapId: string,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("neurodevelopment_roadmaps")
    .update({ plan_generation_status: "generating" })
    .eq("id", roadmapId)
    .in("plan_generation_status", ["pending", "failed"])
    .select("id");
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

export async function generateInteractivePlan(
  patientId: string,
  opts: { force?: boolean } = {},
): Promise<GenerateResult> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { ok: false, reason: "missing_lovable_api_key" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const built = await buildPlanInput(supabaseAdmin, patientId);
  if (!built.ok) return { ok: false, reason: built.reason };
  const { input, roadmapId } = built;

  if (opts.force) {
    await supabaseAdmin
      .from("neurodevelopment_roadmaps")
      .update({ plan_generation_status: "pending" })
      .eq("id", roadmapId)
      .eq("plan_status", "unlocked");
  }

  const locked = await tryLock(supabaseAdmin, roadmapId);
  if (!locked) return { ok: false, reason: "already_in_progress_or_ready" };

  try {
    const cerebroBriefing = await collectCerebroBriefing(supabaseAdmin, input);
    const userPrompt = buildUserPrompt(input, cerebroBriefing);

    const gateway = createLovableAiGatewayProvider(key, undefined, {
      structuredOutputs: true,
    });
    const model = gateway("openai/gpt-5.5");

    let planContent: PlanContent | null = null;
    try {
      const { output } = await generateText({
        model,
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        output: Output.object({ schema: PlanContentSchema }),
      });
      planContent = output as PlanContent;
    } catch (error: unknown) {
      if (NoObjectGeneratedError.isInstance(error)) {
        try {
          const parsed = JSON.parse((error as { text?: string }).text ?? "{}");
          const safe = PlanContentSchema.safeParse(parsed);
          if (safe.success) planContent = safe.data;
        } catch {
          // ignore
        }
      }
      if (!planContent) throw error;
    }

    const { data: fresh } = await supabaseAdmin
      .from("neurodevelopment_roadmaps")
      .select("plan_status")
      .eq("id", roadmapId)
      .maybeSingle();
    if (!fresh || fresh.plan_status !== "unlocked") {
      await supabaseAdmin
        .from("neurodevelopment_roadmaps")
        .update({ plan_generation_status: "failed" })
        .eq("id", roadmapId);
      return { ok: false, reason: "no_longer_unlocked" };
    }

    await supabaseAdmin
      .from("neurodevelopment_roadmaps")
      .update({
        plan_content: planContent as unknown as Json,
        plan_generation_status: "ready",
        plan_generated_at: new Date().toISOString(),
      })
      .eq("id", roadmapId);

    return { ok: true, roadmapId };
  } catch (err) {
    console.error("[plan-skill] generation failed", err);
    await supabaseAdmin
      .from("neurodevelopment_roadmaps")
      .update({ plan_generation_status: "failed" })
      .eq("id", roadmapId);
    return { ok: false, reason: "generation_failed" };
  }
}
