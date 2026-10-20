import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getConsentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_consents")
      .select("policy_version, accepted_at")
      .eq("user_id", context.userId)
      .eq("policy_kind", "habeas_data")
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

export const acceptHabeasData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { version: string; userAgent?: string }) =>
    z
      .object({ version: z.string().min(1), userAgent: z.string().optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("user_consents").insert({
      user_id: context.userId,
      policy_kind: "habeas_data",
      policy_version: data.version,
      user_agent: data.userAgent ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const revokeMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Elimina respuestas, informes y evaluación del usuario. Mantiene profile/roles.
    const uid = context.userId;
    await context.supabase.from("neurodevelopment_roadmaps").delete().eq("user_id", uid);
    await context.supabase.from("assessments").delete().eq("user_id", uid);
    await context.supabase.from("patients").delete().eq("user_id", uid);
    return { ok: true };
  });