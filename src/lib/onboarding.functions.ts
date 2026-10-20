import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type OnboardingState = {
  hasConsent: boolean;
  activePatientId: string | null;
  onboardingCompleted: boolean;
  activeAssessmentId: string | null;
  hasCompletedAssessment: boolean;
};

export const getOnboardingState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OnboardingState> => {
    const { supabase, userId } = context;

    const [{ data: consent }, { data: profile }, { data: patients }] =
      await Promise.all([
        supabase
          .from("user_consents")
          .select("id")
          .eq("user_id", userId)
          .eq("policy_kind", "habeas_data")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("patients")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

    const activePatientId = patients?.[0]?.id ?? null;

    let activeAssessmentId: string | null = null;
    let hasCompletedAssessment = false;
    if (activePatientId) {
      const { data: assessments } = await supabase
        .from("assessments")
        .select("id, status")
        .eq("patient_id", activePatientId);
      for (const a of assessments ?? []) {
        if (a.status === "in_progress") activeAssessmentId = a.id;
        if (a.status === "completed") hasCompletedAssessment = true;
      }
    }

    return {
      hasConsent: !!consent,
      activePatientId,
      onboardingCompleted: !!profile?.onboarding_completed,
      activeAssessmentId,
      hasCompletedAssessment,
    };
  });

export const startEvaluationFromOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patientId: string }) =>
    z.object({ patientId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify ownership (RLS also enforces this)
    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("id", data.patientId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!patient) throw new Error("Paciente no encontrado");

    // Mark onboarding as completed
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", userId);

    // Find or create in-progress assessment for the patient
    let { data: assessment } = await supabase
      .from("assessments")
      .select("id, status")
      .eq("patient_id", data.patientId)
      .maybeSingle();

    if (!assessment) {
      const { data: created, error } = await supabase
        .from("assessments")
        .insert({
          user_id: userId,
          patient_id: data.patientId,
          status: "in_progress",
        })
        .select("id, status")
        .single();
      if (error) throw error;
      assessment = created;
    }

    if (!assessment) throw new Error("No se pudo iniciar el formulario");
    return { assessmentId: assessment.id };
  });