import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const patientInput = z.object({ patientId: z.string().uuid() });

// Reintento manual (admin) del Plan Interactivo. El disparo automático
// post-pago vive en el webhook de Wompi.
export const regenerateInteractivePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patientId: string }) => patientInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "administrador",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { generateInteractivePlan } = await import("./generator");
    return generateInteractivePlan(data.patientId, { force: true });
  });
