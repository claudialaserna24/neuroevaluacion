import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { MANUAL_BUCKET, MANUAL_OBJECT_PATH, SIGNED_URL_TTL } from "./constants";

async function manualObjectExists(): Promise<boolean> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data, error } = await supabaseAdmin.storage
    .from(MANUAL_BUCKET)
    .list("", { search: MANUAL_OBJECT_PATH, limit: 1 });
  if (error || !data) return false;
  return data.some((o) => o.name === MANUAL_OBJECT_PATH);
}

const patientInput = z.object({ patientId: z.string().uuid() });

type BlockedReason =
  | "no_patient"
  | "no_assessment"
  | "no_roadmap"
  | "not_unlocked";

export const getInteractivePlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patientId: string }) => patientInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: patient } = await supabase
      .from("patients")
      .select("id, first_name, last_name")
      .eq("id", data.patientId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!patient) {
      return { blocked: true as const, reason: "no_patient" as BlockedReason };
    }

    const { data: roadmap } = await supabase
      .from("neurodevelopment_roadmaps")
      .select(
        "id, assessment_id, plan_status, plan_content, plan_generation_status, plan_generated_at, plan_activated_at, plan_pdf_url, unlocked_at",
      )
      .eq("patient_id", data.patientId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!roadmap) {
      return { blocked: true as const, reason: "no_roadmap" as BlockedReason };
    }
    if (roadmap.plan_status !== "unlocked") {
      return { blocked: true as const, reason: "not_unlocked" as BlockedReason };
    }

    const manual_available = await manualObjectExists();
    return {
      blocked: false as const,
      patient,
      roadmap: {
        id: roadmap.id,
        assessment_id: roadmap.assessment_id,
        plan_status: roadmap.plan_status,
        plan_generation_status: roadmap.plan_generation_status,
        plan_content: roadmap.plan_content,
        plan_generated_at: roadmap.plan_generated_at,
        plan_activated_at: roadmap.plan_activated_at ?? roadmap.unlocked_at,
        plan_pdf_url: roadmap.plan_pdf_url,
      },
      manual_available,
    };
  });

async function assertUnlocked(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
  patientId: string,
) {
  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!patient) throw new Error("Paciente no encontrado");

  const { data: roadmap } = await supabase
    .from("neurodevelopment_roadmaps")
    .select("plan_status, plan_pdf_url")
    .eq("patient_id", patientId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!roadmap || roadmap.plan_status !== "unlocked") {
    throw new Error("Plan no desbloqueado");
  }
  return roadmap;
}

export const getManualDownloadUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patientId: string }) => patientInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertUnlocked(context.supabase, context.userId, data.patientId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: signed, error } = await supabaseAdmin.storage
      .from(MANUAL_BUCKET)
      .createSignedUrl(MANUAL_OBJECT_PATH, SIGNED_URL_TTL);
    if (error || !signed) return { available: false as const };
    return { available: true as const, url: signed.signedUrl };
  });

export const getPlanPdfDownloadUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patientId: string }) => patientInput.parse(d))
  .handler(async ({ data, context }) => {
    const roadmap = await assertUnlocked(
      context.supabase,
      context.userId,
      data.patientId,
    );
    if (!roadmap.plan_pdf_url) {
      return { available: false as const, reason: "preparing" as const };
    }
    // Si es un path relativo del bucket, firmar; si es URL absoluta, devolverla.
    if (/^https?:\/\//.test(roadmap.plan_pdf_url)) {
      return { available: true as const, url: roadmap.plan_pdf_url };
    }
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: signed, error } = await supabaseAdmin.storage
      .from(MANUAL_BUCKET)
      .createSignedUrl(roadmap.plan_pdf_url, SIGNED_URL_TTL);
    if (error || !signed) {
      return { available: false as const, reason: "preparing" as const };
    }
    return { available: true as const, url: signed.signedUrl };
  });