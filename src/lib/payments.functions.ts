import { disabledFeature } from "@/lib/disabled-feature";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { PLAN_PRICE_USD, PLAN_CURRENCY, PLAN_PRICE_COP, WOMPI_CURRENCY } from "./plan-pricing";

export const createPendingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patientId: string; assessmentId?: string | null }) =>
    z
      .object({
        patientId: z.string().uuid(),
        assessmentId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await disabledFeature();
    const { supabase, userId } = context;

    // Verifica que el paciente pertenezca al usuario (RLS también lo refuerza).
    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("id", data.patientId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!patient) throw new Error("Paciente no encontrado");

    // Pre-generamos el id para poder insertar la referencia Wompi en una sola
    // operación. Antes hacíamos INSERT + UPDATE, pero la tabla payments no tiene
    // policy de UPDATE para el owner (por diseño: solo el service role muta el
    // estado del pago), así que el UPDATE quedaba silenciosamente bloqueado por
    // RLS y wompi_reference terminaba NULL — con lo cual el webhook nunca
    // encontraba el pago post-aprobación.
    const paymentId = crypto.randomUUID();
    const reference = `NP-${paymentId.slice(0, 8).toUpperCase()}`;

    const { data: inserted, error } = await supabase
      .from("payments")
      .insert({
        id: paymentId,
        user_id: userId,
        patient_id: data.patientId,
        assessment_id: data.assessmentId ?? null,
        amount: PLAN_PRICE_USD,
        currency: PLAN_CURRENCY,
        status: "pending",
        wompi_reference: reference,
      })
      .select("id")
      .single();
    if (error) throw error;
    console.info("[createPendingPayment] inserted", {
      paymentId: inserted.id,
      reference,
    });

    // Construye la URL del Web Checkout de Wompi con firma de integridad.
    const { generateIntegritySignature, getWompiConfig } = await import(
      "./wompi.server"
    );
    const { publicKey, environment } = getWompiConfig();
    const amountInCents = PLAN_PRICE_COP * 100;
    const signature = generateIntegritySignature({
      reference,
      amountInCents,
      currency: WOMPI_CURRENCY,
    });

    // Origin del request para armar redirect-url absoluto.
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const origin =
      req?.headers.get("origin") ??
      (req ? new URL(req.url).origin : "https://neuroevaluacion.lovable.app");
    const redirectUrl = `${origin}/checkout/return?paymentId=${inserted.id}`;

    const params = new URLSearchParams({
      "public-key": publicKey,
      currency: WOMPI_CURRENCY,
      "amount-in-cents": String(amountInCents),
      reference,
      "signature:integrity": signature,
      "redirect-url": redirectUrl,
    });
    const checkoutUrl = `https://checkout.wompi.co/p/?${params.toString()}`;

    return {
      paymentId: inserted.id,
      reference,
      checkoutUrl,
      environment,
    };
  });

export const getPaymentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { paymentId: string }) =>
    z.object({ paymentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await disabledFeature();
    const { supabase, userId } = context;
    const { data: payment, error } = await supabase
      .from("payments")
      .select(
        "id, status, wompi_transaction_id, paid_at, patient_id, assessment_id",
      )
      .eq("id", data.paymentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!payment) return null;

    type RoadmapInfo = { plan_status: string; unlocked_at: string | null };
    let roadmap: RoadmapInfo | null = null;
    let planGenerationStatus: string | null = null;
    if (payment.assessment_id) {
      const { data: rm } = await supabase
        .from("neurodevelopment_roadmaps")
        .select("plan_status, unlocked_at, plan_generation_status")
        .eq("patient_id", payment.patient_id)
        .eq("assessment_id", payment.assessment_id)
        .maybeSingle();
      roadmap = rm ? { plan_status: rm.plan_status, unlocked_at: rm.unlocked_at } : null;
      planGenerationStatus =
        (rm as { plan_generation_status?: string } | null)?.plan_generation_status ?? null;
    }

    // Nota: la generación del Plan se dispara desde /app/plan/{patientId}
    // mediante startPlanGeneration, no desde aquí. Un fetch fire-and-forget
    // desde este handler moriría con el response en Cloudflare Workers.

    return {
      paymentId: payment.id,
      status: payment.status,
      transactionId: payment.wompi_transaction_id,
      paidAt: payment.paid_at,
      patientId: payment.patient_id,
      planStatus: roadmap?.plan_status ?? "locked",
      unlockedAt: roadmap?.unlocked_at ?? null,
      planGenerationStatus,
    };
  });

export const getPlanStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patientId: string }) =>
    z.object({ patientId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await disabledFeature();
    const { data: roadmap } = await context.supabase
      .from("neurodevelopment_roadmaps")
      .select("plan_status, unlocked_at, assessment_id")
      .eq("patient_id", data.patientId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return roadmap ?? null;
  });