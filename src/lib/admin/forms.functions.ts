import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getAdminForms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId?: string } | undefined) => z.object({ userId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const { data: allowed, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "administrador" });
    if (error || !allowed) throw new Error("Acceso restringido a la administradora");
    const { loadAdminForms } = await import("./forms.server");
    return loadAdminForms(context.supabase, data.userId);
  });