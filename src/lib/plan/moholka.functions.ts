import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const patientInput = z.object({ patientId: z.string().uuid() });

async function ensureAccess(
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
    .select("id, plan_status")
    .eq("patient_id", patientId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!roadmap || roadmap.plan_status !== "unlocked") {
    throw new Error("Plan no desbloqueado");
  }
  return { roadmapId: roadmap.id as string };
}

async function ensureConversation(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
  patientId: string,
  roadmapId: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("moholka_conversations")
    .select("id")
    .eq("patient_id", patientId)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabase
    .from("moholka_conversations")
    .insert({ user_id: userId, patient_id: patientId, roadmap_id: roadmapId })
    .select("id")
    .single();
  if (error || !created) throw new Error("No se pudo iniciar la conversación");
  return created.id as string;
}

export const getMoholkaHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patientId: string }) => patientInput.parse(d))
  .handler(async ({ data, context }) => {
    throw new Error("Función desactivada: NEUROPLAN solo recopila formularios");
    const { supabase, userId } = context;
    const { roadmapId } = await ensureAccess(supabase, userId, data.patientId);
    const conversationId = await ensureConversation(
      supabase,
      userId,
      data.patientId,
      roadmapId,
    );

    const { data: rows } = await supabase
      .from("moholka_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(40);

    return {
      conversationId,
      messages:
        (rows ?? []).map((r) => ({
          id: r.id as string,
          role: r.role as "user" | "assistant",
          content: r.content as string,
          createdAt: r.created_at as string,
        })) ?? [],
    };
  });