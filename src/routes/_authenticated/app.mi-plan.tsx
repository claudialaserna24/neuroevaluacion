import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, ArrowRight, Lock, Loader2 } from "lucide-react";
import { getFamilyDashboard } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/app/mi-plan")({
  head: () => ({
    meta: [
      { title: "Plan Interactivo — NEUROPLAN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MiPlanResumen,
});

function MiPlanResumen() {
  const fetchDashboard = useServerFn(getFamilyDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["family-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  if (isLoading || !data) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando…</p>;
  }

  const p = data.patient;
  const s = data.plan.status;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Plan Interactivo
        </p>
        <h1 className="mt-1 font-serif text-2xl leading-tight text-foreground">
          Tu Plan personalizado
        </h1>
      </header>

      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estado
            </p>
            <p className="mt-1 font-serif text-xl text-foreground">
              {s === "ready"
                ? "Activo"
                : s === "generating" || s === "paid_pending"
                  ? "Preparando…"
                  : s === "error"
                    ? "Error en generación"
                    : "No desbloqueado"}
            </p>
            {data.plan.generatedAt ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Generado{" "}
                {new Date(data.plan.generatedAt).toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            ) : null}
          </div>
          <FileText className="h-8 w-8 text-primary" />
        </div>

        {p ? (
          <div className="mt-5">
            {s === "ready" ? (
              <Link
                to="/app/plan/$patientId"
                params={{ patientId: p.id }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Abrir Plan <ArrowRight className="h-4 w-4" />
              </Link>
            ) : s === "generating" || s === "paid_pending" ? (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground opacity-70"
              >
                <Loader2 className="h-4 w-4 animate-spin" /> Estamos preparando tu Plan…
              </button>
            ) : (
              <Link
                to="/app/plan-interactivo"
                search={{ patient: p.id }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <Lock className="h-4 w-4" /> Desbloquear Plan
              </Link>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}