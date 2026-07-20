import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { PLAN_PRICE_USD, PLAN_CURRENCY } from "./plan-pricing";

export const createPendingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patientId: string; assessmentId?: string | null }) =>
    z
      .object({
        patientId: z.string().uuid(),
        assessmentId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verifica que el paciente pertenezca al usuario (RLS también lo refuerza).
    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("id", data.patientId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!patient) throw new Error("Paciente no encontrado");

    const { data: inserted, error } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        patient_id: data.patientId,
        assessment_id: data.assessmentId ?? null,
        amount: PLAN_PRICE_USD,
        currency: PLAN_CURRENCY,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw error;

    const reference = `NP-${inserted.id.slice(0, 8).toUpperCase()}`;
    await supabase
      .from("payments")
      .update({ wompi_reference: reference })
      .eq("id", inserted.id);

    return { paymentId: inserted.id, reference };
  });

export const getPlanStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patientId: string }) =>
    z.object({ patientId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: roadmap } = await context.supabase
      .from("neurodevelopment_roadmaps")
      .select("plan_status, unlocked_at, assessment_id")
      .eq("patient_id", data.patientId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return roadmap ?? null;
  });