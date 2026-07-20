import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getWompiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const environment = (process.env.WOMPI_ENVIRONMENT ?? "sandbox") as
      | "sandbox"
      | "production";
    const configured = Boolean(
      process.env.WOMPI_PUBLIC_KEY &&
        process.env.WOMPI_PRIVATE_KEY &&
        process.env.WOMPI_INTEGRITY_KEY &&
        process.env.WOMPI_EVENTS_KEY &&
        process.env.WOMPI_ENVIRONMENT,
    );
    return { configured, environment };
  });