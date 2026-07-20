import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { getPatient } from "@/lib/patients.functions";
import { getRoadmap } from "@/lib/assessment.functions";
import { createPendingPayment } from "@/lib/payments.functions";
import {
  PLAN_PRICE_USD,
  PLAN_CURRENCY,
  formatPlanPrice,
  formatPlanPriceCOP,
} from "@/lib/plan-pricing";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — NEUROPLAN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ patient: z.string().uuid() }).parse(s),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { patient } = Route.useSearch();
  const fetchPatient = useServerFn(getPatient);
  const fetchRoadmap = useServerFn(getRoadmap);
  const createPayment = useServerFn(createPendingPayment);

  const patientQ = useQuery({
    queryKey: ["checkout-patient", patient],
    queryFn: () => fetchPatient({ data: { patientId: patient } }),
  });
  const roadmapQ = useQuery({
    queryKey: ["checkout-roadmap", patient],
    queryFn: () => fetchRoadmap({ data: { patientId: patient } }),
  });

  const payMut = useMutation({
    mutationFn: () =>
      createPayment({
        data: {
          patientId: patient,
          assessmentId:
            (roadmapQ.data as { assessment_id?: string } | null)?.assessment_id ?? null,
        },
      }),
    onSuccess: (res) => {
      // Redirige al Web Checkout oficial de Wompi.
      window.location.href = res.checkoutUrl;
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "No pudimos iniciar el pago.");
    },
  });

  const childName =
    patientQ.data
      ? `${patientQ.data.first_name ?? ""} ${patientQ.data.last_name ?? ""}`.trim()
      : "";

  return (
    <article className="flex flex-col gap-6">
      <header className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Checkout · NEUROPLAN
        </p>
        <h1 className="mt-1 font-serif text-2xl leading-tight text-foreground">
          Desbloquea el Plan Interactivo
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Revisa el resumen de tu compra antes de continuar con el pago seguro.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        {/* Resumen */}
        <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
          <h2 className="font-serif text-lg text-foreground">Resumen de compra</h2>

          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Niño/a" value={childName || "—"} />
            <Row label="Producto" value="Plan Interactivo NEUROPLAN" />
            <Row label="Moneda" value={PLAN_CURRENCY} />
            <Row label="Precio" value={formatPlanPrice()} />
            <Row label="Equivalente en COP" value={formatPlanPriceCOP()} />
          </dl>

          <div className="mt-5 flex items-center justify-between rounded-2xl bg-primary/5 p-4 ring-1 ring-primary/20">
            <span className="text-sm font-medium text-foreground">Total</span>
            <span className="font-serif text-xl text-primary">
              USD ${PLAN_PRICE_USD.toFixed(2)}
            </span>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Pago único. Acceso inmediato al Plan Interactivo tras la confirmación
            del pago.
          </p>
        </div>

        {/* Acción */}
        <div className="flex flex-col gap-3 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 shadow-sm ring-1 ring-primary/20">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Pago seguro
          </p>
          <p className="text-sm text-foreground">
            Serás redirigido a Wompi para completar el pago con tu método
            preferido (tarjeta, PSE, Nequi).
          </p>

          <button
            type="button"
            disabled={payMut.isPending || !patientQ.data}
            onClick={() => payMut.mutate()}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            <Lock className="h-4 w-4" />
            {payMut.isPending
              ? "Estamos preparando tu pago de forma segura…"
              : "Pagar con Wompi"}
          </button>

          <Link
            to="/app/informe"
            search={{ patient }}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a la Hoja de Ruta
          </Link>
        </div>
      </section>

      <p className="rounded-2xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">
        El Plan Interactivo es una herramienta educativa y orientadora. No
        reemplaza la valoración clínica de un profesional.
      </p>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}