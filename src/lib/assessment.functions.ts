import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { allFormsCompleted, formProgress } from "./form-progress";

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

    let { data: assessment, error: stateError } = await supabase
      .from("assessments")
      .select("*")
      .eq("patient_id", data.patientId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (stateError) throw stateError;

    if (!assessment) {
      const { data: created, error } = await supabase
        .from("assessments")
        .insert({ user_id: userId, patient_id: data.patientId, status: "in_progress" })
        .select("*")
        .single();
      if (error) throw error;
      assessment = created;
    }

    const { data: answers, error: answerError } = await supabase
      .from("assessment_answers")
      .select("question_id, value")
      .eq("assessment_id", assessment.id);
    if (answerError) throw answerError;

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
    const owned = await context.supabase.from("assessments").select("id").eq("id", data.assessmentId).eq("user_id", context.userId).maybeSingle();
    if (owned.error || !owned.data) throw new Error("Formulario no encontrado");
    const { error } = await context.supabase.from("assessment_answers").upsert(
      {
        assessment_id: data.assessmentId,
        question_id: data.questionId,
        value: data.value,
      },
      { onConflict: "assessment_id,question_id" },
    );
    if (error) throw error;
    const cursor = await context.supabase.from("assessments").update({ current_question_id: data.questionId }).eq("id", data.assessmentId).eq("user_id", context.userId);
    if (cursor.error) throw cursor.error;
    return { ok: true };
  });

export const completeAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { assessmentId: string }) =>
    z.object({ assessmentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: assessment, error } = await supabase.from("assessments").select("id").eq("id", data.assessmentId).eq("user_id", userId).maybeSingle();
    if (error || !assessment) throw new Error("Formulario no encontrado");
    const [questions, answers] = await Promise.all([
      supabase.from("assessment_questions").select("id, module"),
      supabase.from("assessment_answers").select("question_id").eq("assessment_id", data.assessmentId),
    ]);
    if (questions.error || answers.error) throw new Error("No se pudo comprobar el guardado");
    const completed = allFormsCompleted(formProgress(questions.data ?? [], (answers.data ?? []).map((a) => a.question_id)));
    if (completed) {
      const update = await supabase.from("assessments").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", data.assessmentId).eq("user_id", userId);
      if (update.error) throw update.error;
    }
    return { ok: true, completed };
  });

export const getRoadmap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patientId: string }) =>
    z.object({ patientId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data: input, context }) => {
    throw new Error("Los resultados no están disponibles para las familias");
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