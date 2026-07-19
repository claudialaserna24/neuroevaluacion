import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { computeReport } from "./report-engine";

export const getAssessmentState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patientId: string }) =>
    z.object({ patientId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify the patient belongs to the user (RLS also enforces this)
    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("id", data.patientId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!patient) throw new Error("Paciente no encontrado");

    let { data: assessment } = await supabase
      .from("assessments")
      .select("*")
      .eq("patient_id", data.patientId)
      .maybeSingle();

    if (!assessment) {
      const { data: created, error } = await supabase
        .from("assessments")
        .insert({ user_id: userId, patient_id: data.patientId, status: "in_progress" })
        .select("*")
        .single();
      if (error) throw error;
      assessment = created;
    }

    const { data: answers } = await supabase
      .from("assessment_answers")
      .select("question_id, value")
      .eq("assessment_id", assessment.id);

    return { assessment, answered: answers ?? [] };
  });

export const saveAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { assessmentId: string; questionId: string; value: number }) =>
    z
      .object({
        assessmentId: z.string().uuid(),
        questionId: z.string().uuid(),
        value: z.number().int().min(0).max(10),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("assessment_answers").upsert(
      {
        assessment_id: data.assessmentId,
        question_id: data.questionId,
        value: data.value,
      },
      { onConflict: "assessment_id,question_id" },
    );
    if (error) throw error;
    await context.supabase
      .from("assessments")
      .update({ current_question_id: data.questionId })
      .eq("id", data.assessmentId);
    return { ok: true };
  });

export const completeAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { assessmentId: string }) =>
    z.object({ assessmentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: assessmentRow, error: aErr } = await supabase
      .from("assessments")
      .select("id, patient_id")
      .eq("id", data.assessmentId)
      .single();
    if (aErr || !assessmentRow) throw aErr ?? new Error("Evaluación no encontrada");

    const { data: questions } = await supabase
      .from("assessment_questions")
      .select("id, module, dimension, order_index, scale");
    const { data: answers } = await supabase
      .from("assessment_answers")
      .select("question_id, value")
      .eq("assessment_id", data.assessmentId);

    const report = computeReport(questions ?? [], answers ?? []);

    await supabase.from("neurodevelopment_roadmaps").upsert(
      {
        user_id: userId,
        patient_id: assessmentRow.patient_id,
        assessment_id: data.assessmentId,
        cognitive: report.cognitive,
        functional: report.functional,
        reflexes: report.reflexes,
        priorities: report.priorities,
      },
      { onConflict: "patient_id,assessment_id" },
    );
    await supabase
      .from("assessments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", data.assessmentId);
    return { ok: true };
  });

export const getRoadmap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patientId: string }) =>
    z.object({ patientId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data: input, context }) => {
    const { data, error } = await context.supabase
      .from("neurodevelopment_roadmaps")
      .select("*")
      .eq("patient_id", input.patientId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  });