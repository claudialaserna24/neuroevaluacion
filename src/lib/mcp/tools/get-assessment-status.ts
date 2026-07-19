import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_assessment_status",
  title: "Consultar estado de la evaluación",
  description:
    "Devuelve el estado actual de la Evaluación Inteligente del usuario autenticado: total de preguntas respondidas, progreso por módulo (Perfil Cognitivo, Evaluación Funcional, Reflejos Primitivos) y si el proceso está en curso o completado.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    const { data: assessment, error: aErr } = await supabase
      .from("assessments")
      .select("id, status, created_at, completed_at, current_question_id, patient_id")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (aErr) return { content: [{ type: "text", text: aErr.message }], isError: true };

    if (!assessment) {
      return {
        content: [
          { type: "text", text: "El usuario aún no ha iniciado la evaluación." },
        ],
        structuredContent: { started: false },
      };
    }

    const { data: questions } = await supabase
      .from("assessment_questions")
      .select("id, module");
    const { data: answers } = await supabase
      .from("assessment_answers")
      .select("question_id")
      .eq("assessment_id", assessment.id);

    const answered = new Set((answers ?? []).map((a) => a.question_id));
    const modules = ["cognitive", "functional", "reflex"] as const;
    const perModule = modules.map((m) => {
      const qs = (questions ?? []).filter((q) => q.module === m);
      const done = qs.filter((q) => answered.has(q.id)).length;
      return { module: m, answered: done, total: qs.length };
    });
    const total = questions?.length ?? 0;
    const totalAnswered = answered.size;

    const summary =
      `Estado: ${assessment.status}. ` +
      `Progreso: ${totalAnswered}/${total} preguntas ` +
      `(${total ? Math.round((totalAnswered / total) * 100) : 0}%). ` +
      perModule
        .map((m) => `${m.module}: ${m.answered}/${m.total}`)
        .join(" · ");

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: {
        started: true,
        status: assessment.status,
        completed_at: assessment.completed_at,
        total,
        answered: totalAnswered,
        modules: perModule,
      },
    };
  },
});