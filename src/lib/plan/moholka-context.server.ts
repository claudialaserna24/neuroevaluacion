// Constructor de contexto acotado para Moholka.
// Solo se importa desde código server (route API). Nunca desde componentes.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  queryCerebro,
  formatCerebroForPrompt,
} from "./skill/cerebro-query";

type Ficha = {
  name: string;
  priority_level?: string;
  purpose?: string;
  description?: string;
  frequency?: string;
  repetitions?: string;
  progression?: string;
  materials?: string;
};

type PlanContent = {
  context?: {
    child_name?: string;
    age?: string;
    diagnosis?: string;
    reason?: string;
    intro?: string;
  };
  findings?: { body?: string };
  objectives?: { intro?: string; items?: string[] };
  instruction_cards?: { intro?: string; cards?: Ficha[] };
  routine_12_weeks?: {
    intro?: string;
    weeks?: { week: number; focus?: string; activities?: string; adjustments?: string }[];
  };
  weekly_tracking?: {
    intro?: string;
    rows?: { week: number; observations_prompt?: string; achievements_prompt?: string; difficulties_prompt?: string }[];
  };
  family_recommendations?: { intro?: string; items?: string[] };
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function pickCards(plan: PlanContent, message: string): Ficha[] {
  const cards = plan.instruction_cards?.cards ?? [];
  if (!cards.length) return [];
  const nq = norm(message);
  const matched = cards.filter((c) => c.name && nq.includes(norm(c.name)));
  if (matched.length) return matched.slice(0, 2);
  return [];
}

function mentionsWeek(message: string): boolean {
  const n = norm(message);
  return /(semana|rutina|semanal|programa)/.test(n);
}
function mentionsFamily(message: string): boolean {
  const n = norm(message);
  return /(familia|casa|hermano|padre|madre|acudiente|rutina en casa)/.test(n);
}
function mentionsTracking(message: string): boolean {
  const n = norm(message);
  return /(seguimiento|registrar|observaci|logros|dificultades|avance)/.test(n);
}

export type MoholkaContext = {
  patientName: string;
  systemPrompt: string;
  cardNames: string[];
};

export async function buildMoholkaContext(args: {
  supabaseAdmin: SupabaseClient;
  patientId: string;
  userMessage: string;
}): Promise<MoholkaContext> {
  const { supabaseAdmin, patientId, userMessage } = args;

  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("first_name, last_name, date_of_birth, diagnosis, developmental_history")
    .eq("id", patientId)
    .maybeSingle();

  const { data: roadmap } = await supabaseAdmin
    .from("neurodevelopment_roadmaps")
    .select("plan_content, priorities")
    .eq("patient_id", patientId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const plan = (roadmap?.plan_content ?? {}) as PlanContent;
  const priorities = (roadmap?.priorities ?? {}) as {
    reflexPriorities?: string[];
    functionalPriorities?: string[];
    context?: { generalLevel?: string; hemisphere?: string };
  };

  const cards = plan.instruction_cards?.cards ?? [];
  const cardNames = cards.map((c) => c.name).filter(Boolean) as string[];
  const relevantCards = pickCards(plan, userMessage);

  const parts: string[] = [];

  // Identidad + reglas
  parts.push(`# Identidad
Eres Moholka, asistente especializado de inteligencia artificial en neurodesarrollo, integrado en NEUROPLAN. Acompañas a la familia en las primeras cuatro semanas de aplicación del Plan Interactivo NEUROPLAN.

Nunca te presentes como ChatGPT ni menciones proveedores de IA externos. Siempre responde como Moholka.

## Alcance
Solo puedes responder usando la información entregada abajo:
- Datos del paciente y del Plan Interactivo generado.
- Hoja de Ruta (prioridades y hemisferio).
- Fragmentos de la base documental CEREBRO (protocolos y actividades).
- Manual Oficial de Ejercicios NEUROPLAN (existe como PDF descargable; NO tienes su texto — cuando el usuario pregunte por la ejecución detallada de un ejercicio, invítalo a consultar el Manual Oficial).

No consultes internet. No uses conocimiento externo. No inventes protocolos, actividades, medicamentos ni diagnósticos.

## Restricciones
- Nunca realices diagnósticos ni interpretes exámenes médicos.
- Nunca recomiendes medicamentos.
- Nunca modifiques el Plan, la Hoja de Ruta ni las prioridades.
- Nunca crees ejercicios nuevos ni inventes actividades o protocolos.

## Preguntas fuera de alcance
Si la pregunta no está relacionada con el Plan Interactivo (por ejemplo: dudas médicas, medicamentos, otras terapias, temas ajenos), responde EXACTAMENTE con esta frase y nada más:
"Ese tema está fuera de mi alcance. Mi función es ayudarte a comprender y aplicar el Plan Interactivo NEUROPLAN."

## Estilo
Cálido, claro, breve. Español neutro. Usa markdown ligero (listas, negritas) cuando ayude.`);

  // Paciente
  parts.push(`# Paciente
Nombre: ${patient?.first_name ?? ""} ${patient?.last_name ?? ""}
Fecha de nacimiento: ${patient?.date_of_birth ?? "-"}
Diagnóstico/motivo: ${patient?.diagnosis ?? "-"}`);

  // Plan
  const planSections: string[] = [];
  if (plan.context?.intro) planSections.push(`Intro:\n${plan.context.intro}`);
  if (plan.findings?.body) planSections.push(`Hallazgos:\n${plan.findings.body}`);
  if (plan.objectives?.items?.length) {
    planSections.push(
      `Objetivos:\n- ${plan.objectives.items.slice(0, 6).join("\n- ")}`,
    );
  }
  if (relevantCards.length) {
    planSections.push(
      `Fichas relevantes a la pregunta:\n${relevantCards
        .map(
          (c) =>
            `• ${c.name} (${c.priority_level ?? "-"})\n  Propósito: ${c.purpose ?? "-"}\n  Descripción: ${c.description ?? "-"}\n  Frecuencia: ${c.frequency ?? "-"}\n  Repeticiones: ${c.repetitions ?? "-"}\n  Progresión: ${c.progression ?? "-"}\n  Materiales: ${c.materials ?? "-"}`,
        )
        .join("\n\n")}`,
    );
  } else if (cardNames.length) {
    planSections.push(
      `Fichas disponibles (para orientar al usuario si su pregunta es amplia):\n- ${cardNames.join("\n- ")}`,
    );
  }
  if (mentionsWeek(userMessage) && plan.routine_12_weeks?.weeks?.length) {
    const weeks = plan.routine_12_weeks.weeks.slice(0, 4);
    planSections.push(
      `Rutina (primeras semanas):\n${weeks
        .map(
          (w) =>
            `Semana ${w.week}: ${w.focus ?? ""} — ${w.activities ?? ""} — Ajustes: ${w.adjustments ?? ""}`,
        )
        .join("\n")}`,
    );
  }
  if (mentionsTracking(userMessage) && plan.weekly_tracking?.rows?.length) {
    planSections.push(
      `Formato de seguimiento (ejemplo):\n${plan.weekly_tracking.rows
        .slice(0, 2)
        .map(
          (r) =>
            `Semana ${r.week}: obs="${r.observations_prompt ?? ""}"; logros="${r.achievements_prompt ?? ""}"; dificultades="${r.difficulties_prompt ?? ""}"`,
        )
        .join("\n")}`,
    );
  }
  if (mentionsFamily(userMessage) && plan.family_recommendations?.items?.length) {
    planSections.push(
      `Recomendaciones para la familia:\n- ${plan.family_recommendations.items.slice(0, 6).join("\n- ")}`,
    );
  }
  if (planSections.length) {
    parts.push(`# Plan Interactivo (fragmento relevante)\n${planSections.join("\n\n")}`);
  }

  // Hoja de Ruta
  const hojaLines: string[] = [];
  if (priorities.context?.generalLevel) hojaLines.push(`Nivel general: ${priorities.context.generalLevel}`);
  if (priorities.context?.hemisphere) hojaLines.push(`Hemisferio: ${priorities.context.hemisphere}`);
  if (priorities.functionalPriorities?.length)
    hojaLines.push(`Prioridades funcionales: ${priorities.functionalPriorities.slice(0, 6).join(", ")}`);
  if (priorities.reflexPriorities?.length)
    hojaLines.push(`Prioridades de reflejos: ${priorities.reflexPriorities.slice(0, 6).join(", ")}`);
  if (hojaLines.length) parts.push(`# Hoja de Ruta\n${hojaLines.join("\n")}`);

  // CEREBRO: consulta contextual por módulo si aplica
  const modulesToQuery: { module: string; label: string; sub?: string | null }[] = [];
  const firstCard = relevantCards[0];
  if (firstCard) {
    modulesToQuery.push({
      module: "Reflejos Primitivos",
      label: `CEREBRO — ${firstCard.name}`,
      sub: firstCard.name,
    });
  } else if (priorities.reflexPriorities?.[0]) {
    modulesToQuery.push({
      module: "Reflejos Primitivos",
      label: `CEREBRO — ${priorities.reflexPriorities[0]}`,
      sub: priorities.reflexPriorities[0],
    });
  }
  if (mentionsFamily(userMessage)) {
    modulesToQuery.push({ module: "Recomendaciones Familia", label: "CEREBRO — Familia", sub: null });
  }
  for (const q of modulesToQuery.slice(0, 2)) {
    const hit = await queryCerebro(supabaseAdmin, {
      module: q.module,
      subcategory: q.sub ?? undefined,
    });
    if (hit.hits.length) {
      parts.push(formatCerebroForPrompt(q.label, hit));
    }
  }

  return {
    patientName: `${patient?.first_name ?? ""}`.trim(),
    systemPrompt: parts.join("\n\n"),
    cardNames,
  };
}

export function detectManualMention(reply: string, cardNames: string[]): boolean {
  if (!reply) return false;
  const nr = norm(reply);
  if (/(ejecutar|c[oó]mo se hace|paso a paso|manual oficial)/.test(nr)) return true;
  return cardNames.some((n) => n && nr.includes(norm(n)));
}