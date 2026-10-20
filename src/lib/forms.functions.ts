import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { formProgress } from "./form-progress";

export const getFamilyForms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    const [patients, assessments, questions, profile, consent] = await Promise.all([
      s.from("patients").select("*").eq("user_id", context.userId).order("created_at"),
      s.from("assessments").select("id, patient_id, current_question_id, status").eq("user_id", context.userId).order("created_at", { ascending: false }),
      s.from("assessment_questions").select("id, module").order("module").order("order_index"),
      s.from("profiles").select("full_name").eq("id", context.userId).maybeSingle(),
      s.from("user_consents").select("id").eq("user_id", context.userId).eq("policy_kind", "habeas_data").limit(1),
    ]);
    for (const r of [patients, assessments, questions, profile, consent]) if (r.error) throw r.error;
    const children = await Promise.all((patients.data ?? []).map(async (p) => {
      const a = assessments.data?.find((a) => a.patient_id === p.id);
      const answers = a ? await s.from("assessment_answers").select("question_id").eq("assessment_id", a.id) : { data: [], error: null };
      if (answers.error) throw answers.error;
      return { patient: p, forms: formProgress(questions.data ?? [], (answers.data ?? []).map((a) => a.question_id)) };
    }));
    return { name: profile.data?.full_name ?? "", hasConsent: Boolean(consent.data?.length), children };
  });