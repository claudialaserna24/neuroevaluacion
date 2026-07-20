import type { SupabaseClient } from "@supabase/supabase-js";

export type PlanInput = {
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    ageYears: number | null;
    diagnosis: string | null;
    developmental_history: string | null;
    interventions: string | null;
    city: string | null;
    parent_name: string | null;
  };
  roadmap: {
    id: string;
    assessment_id: string;
    generated_at: string;
    cognitive: unknown;
    functional: unknown;
    reflexes: unknown;
    priorities: {
      context?: { generalLevel?: string; hemisphere?: string };
      functionalPriorities?: string[];
      reflexPriorities?: string[];
    };
  };
  equipment: string[]; // marcado por la familia; vacío si no registrado
  durationWeeks: 12;
};

function computeAgeYears(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export async function buildPlanInput(
  supabaseAdmin: SupabaseClient,
  patientId: string,
): Promise<
  | { ok: true; input: PlanInput; userId: string; roadmapId: string }
  | { ok: false; reason: string }
> {
  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select(
      "id, user_id, first_name, last_name, date_of_birth, diagnosis, developmental_history, interventions, city, parent_name",
    )
    .eq("id", patientId)
    .maybeSingle();
  if (!patient) return { ok: false, reason: "no_patient" };

  const { data: roadmap } = await supabaseAdmin
    .from("neurodevelopment_roadmaps")
    .select(
      "id, assessment_id, generated_at, cognitive, functional, reflexes, priorities, plan_status, plan_generation_status",
    )
    .eq("patient_id", patientId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!roadmap) return { ok: false, reason: "no_roadmap" };
  if (roadmap.plan_status !== "unlocked") return { ok: false, reason: "not_unlocked" };

  const { data: assessment } = await supabaseAdmin
    .from("assessments")
    .select("id, status")
    .eq("id", roadmap.assessment_id)
    .maybeSingle();
  if (!assessment || assessment.status !== "completed") {
    return { ok: false, reason: "no_assessment" };
  }

  const priorities = (roadmap.priorities ?? {}) as PlanInput["roadmap"]["priorities"];

  const input: PlanInput = {
    patient: {
      id: patient.id,
      first_name: patient.first_name,
      last_name: patient.last_name,
      date_of_birth: patient.date_of_birth,
      ageYears: computeAgeYears(patient.date_of_birth),
      diagnosis: patient.diagnosis,
      developmental_history: patient.developmental_history,
      interventions: patient.interventions,
      city: patient.city,
      parent_name: patient.parent_name,
    },
    roadmap: {
      id: roadmap.id,
      assessment_id: roadmap.assessment_id,
      generated_at: roadmap.generated_at,
      cognitive: roadmap.cognitive,
      functional: roadmap.functional,
      reflexes: roadmap.reflexes,
      priorities,
    },
    equipment: [], // reservado para futuro registro por parte de la familia
    durationWeeks: 12,
  };

  return { ok: true, input, userId: patient.user_id, roadmapId: roadmap.id };
}
