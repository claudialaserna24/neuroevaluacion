import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_initial_report",
  title: "Obtener Hoja de Ruta (informe inicial)",
  description:
    "Devuelve el Informe Inicial / Hoja de Ruta del usuario autenticado si ya completó la evaluación. Incluye los puntajes por dimensión de Perfil Cognitivo, Evaluación Funcional y Reflejos Primitivos, más las prioridades identificadas. No emite diagnósticos clínicos.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("neurodevelopment_roadmaps")
      .select("cognitive, functional, reflexes, priorities, generated_at, patient_id")
      .eq("user_id", ctx.getUserId())
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: "Aún no hay Hoja de Ruta: el usuario debe completar la evaluación primero.",
          },
        ],
        structuredContent: { available: false },
      };
    }
    return {
      content: [
        {
          type: "text",
          text:
            "Hoja de Ruta disponible (generada " +
            new Date(data.generated_at).toISOString() +
            "). Recuerda: es una orientación general, no un diagnóstico clínico.",
        },
      ],
      structuredContent: { available: true, ...data },
    };
  },
});