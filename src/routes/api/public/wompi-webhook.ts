import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const eventSchema = z.object({
  event: z.string(),
  data: z
    .object({
      transaction: z.object({
        id: z.string(),
        reference: z.string(),
        status: z.string(),
        amount_in_cents: z.number(),
        currency: z.string(),
      }),
    })
    .passthrough(),
  signature: z.object({
    properties: z.array(z.string()),
    checksum: z.string(),
  }),
  timestamp: z.union([z.number(), z.string()]),
  sent_at: z.string().optional(),
  environment: z.string().optional(),
});

// Recorre "transaction.id" -> data.transaction.id
function readByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export const Route = createFileRoute("/api/public/wompi-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        let json: unknown;
        try {
          json = JSON.parse(raw);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parsed = eventSchema.safeParse(json);
        if (!parsed.success) {
          return new Response("Invalid payload", { status: 400 });
        }
        const evt = parsed.data;

        // Verifica firma
        const { verifyEventSignature, getWompiApiBaseUrl, getWompiConfig } =
          await import("@/lib/wompi.server");
        const values = evt.signature.properties.map((p) =>
          String(readByPath(evt, `data.${p}`) ?? ""),
        );
        const ok = verifyEventSignature({
          properties: evt.signature.properties,
          values,
          timestamp: evt.timestamp,
          checksum: evt.signature.checksum,
        });
        if (!ok) {
          console.warn("[wompi-webhook] Invalid signature");
          return new Response("Invalid signature", { status: 401 });
        }

        if (evt.event !== "transaction.updated") {
          return new Response("ok");
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // Consulta el estado real a la API de Wompi (fuente de verdad)
        let realStatus = evt.data.transaction.status;
        try {
          const { privateKey } = getWompiConfig();
          const res = await fetch(
            `${getWompiApiBaseUrl()}/transactions/${evt.data.transaction.id}`,
            { headers: { Authorization: `Bearer ${privateKey}` } },
          );
          if (res.ok) {
            const body = (await res.json()) as { data?: { status?: string } };
            if (body?.data?.status) realStatus = body.data.status;
          }
        } catch (err) {
          console.warn("[wompi-webhook] verify GET failed", err);
        }

        const reference = evt.data.transaction.reference;
        const { data: payment, error: pErr } = await supabaseAdmin
          .from("payments")
          .select("id, patient_id, assessment_id, status")
          .eq("wompi_reference", reference)
          .maybeSingle();
        if (pErr || !payment) {
          console.warn("[wompi-webhook] payment not found", reference);
          return new Response("ok");
        }

        const upper = realStatus.toUpperCase();
        if (upper === "APPROVED") {
          await supabaseAdmin
            .from("payments")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              wompi_transaction_id: evt.data.transaction.id,
            })
            .eq("id", payment.id);

          if (payment.assessment_id) {
            await supabaseAdmin
              .from("neurodevelopment_roadmaps")
              .update({
                plan_status: "unlocked",
                unlocked_at: new Date().toISOString(),
                plan_activated_at: new Date().toISOString(),
                plan_generation_status: "pending",
              })
              .eq("patient_id", payment.patient_id)
              .eq("assessment_id", payment.assessment_id);

            // Dispara la Skill "Generador del Plan Interactivo" en background.
            // No bloqueamos la respuesta al webhook.
            void (async () => {
              try {
                const { generateInteractivePlan } = await import(
                  "@/lib/plan/skill/generator"
                );
                await generateInteractivePlan(payment.patient_id);
              } catch (err) {
                console.error("[wompi-webhook] plan skill trigger failed", err);
              }
            })();
          }
        } else if (["DECLINED", "VOIDED", "ERROR"].includes(upper)) {
          await supabaseAdmin
            .from("payments")
            .update({
              status: "rejected",
              wompi_transaction_id: evt.data.transaction.id,
            })
            .eq("id", payment.id);
        }

        return new Response("ok");
      },
    },
  },
});