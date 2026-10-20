import { disabledFeature } from "@/lib/disabled-feature";
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
    await disabledFeature();
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
        "id, assessment_id, plan_status, plan_content, plan_generation_status, plan_generation_status_updated_at, plan_generation_error, plan_generated_at, plan_activated_at, plan_pdf_url, unlocked_at",
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
        plan_generation_status_updated_at:
          (roadmap as { plan_generation_status_updated_at?: string | null })
            .plan_generation_status_updated_at ?? null,
        plan_generation_error:
          (roadmap as { plan_generation_error?: string | null })
            .plan_generation_error ?? null,
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
    await disabledFeature();
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
    await disabledFeature();
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

// ─── Administración del Manual Oficial ────────────────────────────────────────

async function assertAdmin(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
) {
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "administrador",
  });
  if (!isAdmin) throw new Error("Acceso restringido");
}

export const getManualStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await disabledFeature();
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin.storage
      .from(MANUAL_BUCKET)
      .list("", { search: MANUAL_OBJECT_PATH, limit: 1 });
    if (error) return { available: false as const, path: MANUAL_OBJECT_PATH };
    const obj = data?.find((o) => o.name === MANUAL_OBJECT_PATH);
    if (!obj) return { available: false as const, path: MANUAL_OBJECT_PATH };
    return {
      available: true as const,
      path: MANUAL_OBJECT_PATH,
      updated_at: obj.updated_at ?? obj.created_at ?? null,
      size:
        (obj.metadata as { size?: number } | null | undefined)?.size ?? null,
    };
  });

// ─── Disparo de generación del Plan Interactivo ──────────────────────────────
//
// Estrategia: la generación se dispara desde la propia pantalla del Plan,
// no desde el webhook. En Cloudflare Workers un `fetch` fire-and-forget muere
// cuando el handler retorna, así que la generación debe vivir dentro de un
// request awaited desde el cliente. El lock atómico impide duplicados incluso
// con reintentos concurrentes del botón.

const GENERATING_STALE_MS = 3 * 60 * 1000; // 3 minutos

export const startPlanGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { patientId: string; force?: boolean }) =>
      z
        .object({
          patientId: z.string().uuid(),
          force: z.boolean().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await disabledFeature();
    const { supabase, userId } = context;

    // 1) Verifica propiedad del paciente (RLS + doble check).
    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("id", data.patientId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!patient) {
      return { status: "error" as const, reason: "no_patient" as const };
    }

    // 2) Debe existir un pago aprobado del usuario para este paciente.
    const { data: paidPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("user_id", userId)
      .eq("patient_id", data.patientId)
      .eq("status", "paid")
      .limit(1)
      .maybeSingle();
    if (!paidPayment) {
      return { status: "error" as const, reason: "not_paid" as const };
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // 3) Roadmap más reciente del paciente.
    const { data: roadmap } = await supabaseAdmin
      .from("neurodevelopment_roadmaps")
      .select(
        "id, plan_status, plan_generation_status, plan_generation_status_updated_at, plan_generation_error",
      )
      .eq("patient_id", data.patientId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!roadmap) {
      return { status: "error" as const, reason: "no_roadmap" as const };
    }
    if (roadmap.plan_status !== "unlocked") {
      return { status: "error" as const, reason: "not_unlocked" as const };
    }

    const genStatus = (roadmap.plan_generation_status ?? "pending") as
      | "pending"
      | "generating"
      | "ready"
      | "failed";
    const statusUpdatedAt = (
      roadmap as { plan_generation_status_updated_at?: string | null }
    ).plan_generation_status_updated_at;
    const staleGenerating =
      genStatus === "generating" &&
      (!statusUpdatedAt ||
        Date.now() - new Date(statusUpdatedAt).getTime() >= GENERATING_STALE_MS);

    if (genStatus === "ready") {
      return { status: "ready" as const };
    }
    if (genStatus === "generating" && !staleGenerating) {
      return { status: "generating" as const };
    }
    // force sólo aplica desde failed o generating vencido; nunca desde
    // ready ni desde un generating vivo (ya cortamos arriba).
    if (data.force && genStatus !== "failed" && !staleGenerating) {
      // pending + force: aceptamos, comportamiento idéntico al no-force.
    }

    // 4) Lock atómico condicional. Todo el estado admisible se decide en
    //    el WHERE: si otro request ganó el lock, este UPDATE devuelve 0 filas.
    const staleCutoff = new Date(
      Date.now() - GENERATING_STALE_MS,
    ).toISOString();
    const { data: lockedRows, error: lockErr } = await supabaseAdmin
      .from("neurodevelopment_roadmaps")
      .update({
        plan_generation_status: "generating",
        plan_generation_error: null,
      })
      .eq("id", roadmap.id)
      .eq("plan_status", "unlocked")
      .or(
        `plan_generation_status.in.(pending,failed),and(plan_generation_status.eq.generating,plan_generation_status_updated_at.lt.${staleCutoff})`,
      )
      .select("id");
    if (lockErr) {
      console.error("[startPlanGeneration] lock error", lockErr);
      return { status: "error" as const, reason: "lock_failed" as const };
    }
    if (!lockedRows || lockedRows.length === 0) {
      // Otro request ya lo tomó.
      return { status: "generating" as const };
    }

    console.info("[startPlanGeneration] lock acquired", {
      patientId: data.patientId,
      roadmapId: roadmap.id,
    });

    // 5) Ejecuta la Skill dentro de este mismo request awaited.
    try {
      const { generateInteractivePlan } = await import(
        "./skill/generator"
      );
      const result = await generateInteractivePlan(data.patientId, {
        skipLock: true,
      });
      if (result.ok) {
        return { status: "ready" as const };
      }
      return {
        status: "failed" as const,
        reason: result.reason,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[startPlanGeneration] fatal", err);
      await supabaseAdmin
        .from("neurodevelopment_roadmaps")
        .update({
          plan_generation_status: "failed",
          plan_generation_error: message.slice(0, 2000),
        })
        .eq("id", roadmap.id);
      return { status: "failed" as const, reason: message };
    }
  });