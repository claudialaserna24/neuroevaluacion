import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { getPaymentStatus } from "@/lib/payments.functions";

export const Route = createFileRoute("/checkout/return")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Verificando tu pago — NEUROPLAN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) =>
    z
      .object({
        paymentId: z.string().uuid(),
        id: z.string().optional(),
        env: z.string().optional(),
      })
      .parse(s),
  component: CheckoutReturnPage,
});

type UiState =
  | { kind: "verifying" }
  | { kind: "approved"; patientId: string }
  | { kind: "rejected"; patientId?: string }
  | { kind: "pending_verification"; patientId?: string };

function CheckoutReturnPage() {
  const { paymentId } = Route.useSearch();
  const fetchStatus = useServerFn(getPaymentStatus);
  const [state, setState] = useState<UiState>({ kind: "verifying" });

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20; // ~40s

    const tick = async () => {
      if (cancelled) return;
      attempts++;
      try {
        const res = await fetchStatus({ data: { paymentId } });
        if (cancelled) return;
        if (res?.status === "paid" || res?.planStatus === "unlocked") {
          setState({ kind: "approved", patientId: res.patientId });
          return;
        }
        if (res?.status === "rejected") {
          setState({ kind: "rejected", patientId: res.patientId });
          return;
        }
        if (attempts >= maxAttempts) {
          setState({ kind: "pending_verification", patientId: res?.patientId });
          return;
        }
        setTimeout(tick, 2000);
      } catch {
        if (attempts >= maxAttempts) {
          setState({ kind: "pending_verification" });
          return;
        }
        setTimeout(tick, 2000);
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [paymentId, fetchStatus]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4 py-10">
      <div className="w-full rounded-3xl bg-card p-8 text-center shadow-sm ring-1 ring-border/50">
        {state.kind === "verifying" && <Verifying />}
        {state.kind === "approved" && <Approved patientId={state.patientId} />}
        {state.kind === "rejected" && <Rejected patientId={state.patientId} />}
        {state.kind === "pending_verification" && (
          <PendingVerification patientId={state.patientId} />
        )}
      </div>
    </div>
  );
}

function Verifying() {
  return (
    <>
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
      <h1 className="mt-4 font-serif text-2xl text-foreground">
        Estamos verificando tu pago
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Esto puede tardar unos segundos.
      </p>
    </>
  );
}

function Approved({ patientId }: { patientId: string }) {
  const navigate = useNavigate();
  return (
    <>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle2 className="h-8 w-8 text-primary" />
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-primary">
        Plan Interactivo desbloqueado
      </p>
      <h1 className="mt-2 font-serif text-2xl leading-tight text-foreground">
        ¡Pago realizado con éxito!
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tu Plan Interactivo ya está disponible y puedes comenzar inmediatamente.
      </p>
      <button
        type="button"
        onClick={() =>
          navigate({ to: "/app/plan/$patientId", params: { patientId } })
        }
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
      >
        Ir a mi Plan Interactivo <ArrowRight className="h-4 w-4" />
      </button>
    </>
  );
}

function Rejected({ patientId }: { patientId?: string }) {
  return (
    <>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <XCircle className="h-8 w-8 text-destructive" />
      </div>
      <h1 className="mt-4 font-serif text-2xl leading-tight text-foreground">
        No fue posible completar el pago.
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Puedes intentarlo nuevamente cuando quieras.
      </p>
      {patientId ? (
        <Link
          to="/checkout"
          search={{ patient: patientId }}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          Intentar nuevamente
        </Link>
      ) : (
        <Link
          to="/app"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Volver a la app
        </Link>
      )}
    </>
  );
}

function PendingVerification({ patientId }: { patientId?: string }) {
  return (
    <>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
      <h1 className="mt-4 font-serif text-2xl leading-tight text-foreground">
        Estamos confirmando tu pago con el banco.
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Puede tardar unos minutos. Te avisaremos en tu panel apenas se
        acredite. Si ya recibiste el cargo, no vuelvas a pagar.
      </p>
      {patientId ? (
        <Link
          to="/app/informe"
          search={{ patient: patientId }}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Volver a la Hoja de Ruta
        </Link>
      ) : (
        <Link
          to="/app"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Volver a la app
        </Link>
      )}
    </>
  );
}