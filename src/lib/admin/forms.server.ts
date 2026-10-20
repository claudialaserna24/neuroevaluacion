import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { allFormsCompleted, answerLabel, formProgress, FORM_LABELS, FORM_MODULES } from "../form-progress";

async function readAll<T>(query: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 500) {
    const result = await query(start, start + 499);
    if (result.error) throw result.error;
    const batch = result.data ?? [];
    rows.push(...batch);
    if (batch.length < 500) return rows;
  }
}

export async function loadAdminForms(s: SupabaseClient<Database>, userId?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const users: { id: string; email: string; name: string; createdAt: string }[] = [];
  if (userId) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) throw error;
    users.push({ id: data.user.id, email: data.user.email ?? "", name: String(data.user.user_metadata.full_name ?? ""), createdAt: data.user.created_at });
  } else {
    for (let page = 1; ; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 500 });
      if (error) throw error;
      users.push(...data.users.map((u) => ({ id: u.id, email: u.email ?? "", name: String(u.user_metadata.full_name ?? ""), createdAt: u.created_at })));
      if (data.users.length < 500) break;
    }
  }
  const [profiles, patients, assessments, questions, answers] = await Promise.all([
    readAll((start, end) => { let q = s.from("profiles").select("*").order("id"); if (userId) q = q.eq("id", userId); return q.range(start, end); }),
    readAll((start, end) => { let q = s.from("patients").select("*").order("id"); if (userId) q = q.eq("user_id", userId); return q.range(start, end); }),
    readAll((start, end) => { let q = s.from("assessments").select("*").order("created_at", { ascending: false }).order("id"); if (userId) q = q.eq("user_id", userId); return q.range(start, end); }),
    readAll((start, end) => s.from("assessment_questions").select("*").order("module").order("order_index").order("id").range(start, end)),
    readAll((start, end) => { let q = s.from("assessment_answers").select("*, assessments!inner(user_id)").order("id"); if (userId) q = q.eq("assessments.user_id", userId); return q.range(start, end); }),
  ]);
  return users.map((user) => {
    const profile = profiles.find((p) => p.id === user.id);
    const userAssessments = assessments.filter((a) => a.user_id === user.id);
    const children = patients.filter((p) => p.user_id === user.id).map((patient) => {
      const histories = userAssessments.filter((a) => a.patient_id === patient.id).map((a) => {
        const saved = answers.filter((r) => r.assessment_id === a.id);
        const byId = new Map(saved.map((r) => [r.question_id, r]));
        return { id: a.id, createdAt: a.created_at, forms: formProgress(questions, byId.keys()), modules: FORM_MODULES.map((module) => ({ module, label: FORM_LABELS[module], responses: questions.filter((q) => q.module === module).map((q) => ({ id: q.id, question: q.title, description: q.description, dimension: q.dimension, response: answerLabel(q.scale, byId.get(q.id)?.value, byId.get(q.id)?.text_value) })) })) };
      });
      return { patient, histories, forms: histories[0]?.forms ?? formProgress(questions, []) };
    });
    const forms = FORM_MODULES.map((module) => {
      const childForms = children.map((c) => c.forms.find((f) => f.module === module));
      const status = childForms.length > 0 && childForms.every((f) => f?.status === "Completado") ? "Completado" : childForms.some((f) => (f?.done ?? 0) > 0) ? "En progreso" : "Sin iniciar";
      return { module, status };
    });
    return { ...user, name: profile?.full_name || user.name, profile: profile ?? null, children, forms, complete: allFormsCompleted(forms) };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}