import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Endpoint interno para disparar la Skill "Generador del Plan Interactivo".
// Se llama desde el webhook de Wompi (y como fallback desde getPaymentStatus)
// para que la Skill viva en su propia invocación de Worker, con su propio
// presupuesto de CPU, y no dependa del ciclo de vida del handler que la
// dispara. La autorización se hace con HMAC-SHA256 del cuerpo firmado con
// WOMPI_EVENTS_KEY (reutilizamos ese secreto para no añadir uno nuevo).

function verifySignature(body: string, signature: string): boolean {
  const key = process.env.WOMPI_EVENTS_KEY;
  if (!key || !signature) return false;
  const expected = createHmac("sha256", key).update(body).digest("hex");
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function signInternalPayload(payload: string): string {
  const key = process.env.WOMPI_EVENTS_KEY;
  if (!key) throw new Error("WOMPI_EVENTS_KEY missing");
  return createHmac("sha256", key).update(payload).digest("hex");
}

export const Route = createFileRoute("/api/public/plan-generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature = request.headers.get("x-internal-signature") ?? "";
        if (!verifySignature(body, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }
        let parsed: { patientId?: string };
        try {
          parsed = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const patientId = parsed.patientId;
        if (!patientId || typeof patientId !== "string") {
          return new Response("Missing patientId", { status: 400 });
        }
        console.info("[plan-generate] triggered", { patientId });
        try {
          const { generateInteractivePlan } = await import(
            "@/lib/plan/skill/generator"
          );
          const result = await generateInteractivePlan(patientId);
          console.info("[plan-generate] result", result);
          return Response.json(result);
        } catch (err) {
          console.error("[plan-generate] failed", err);
          return new Response("Generation failed", { status: 500 });
        }
      },
    },
  },
});