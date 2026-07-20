import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TrendingUp } from "lucide-react";
import { getFamilyDashboard } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/app/seguimiento")({
  head: () => ({
    meta: [
      { title: "Seguimiento — NEUROPLAN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SeguimientoPage,
});

function SeguimientoPage() {
  const fetchDashboard = useServerFn(getFamilyDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["family-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  if (isLoading || !data) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando…</p>;
  }

  const week = data.plan.weekNumber;
  const total = data.plan.totalWeeks;
  const percent = week && total ? Math.round((week / total) * 100) : 0;

  const nextEvalDate = data.assessments.lastCompletedAt
    ? new Date(new Date(data.assessments.lastCompletedAt).getTime() + 90 * 86400000)
    : null;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Seguimiento
        </p>
        <h1 className="mt-1 font-serif text-2xl leading-tight text-foreground">
          Progreso del programa
        </h1>
      </header>

      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Semana actual
            </p>
            <p className="mt-1 font-serif text-3xl text-foreground">
              {week && total ? `${week} de ${total}` : "—"}
            </p>
          </div>
          <TrendingUp className="h-8 w-8 text-primary" />
        </div>

        {week && total ? (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            El seguimiento se activa al desbloquear tu Plan Interactivo.
          </p>
        )}

        {nextEvalDate ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Fecha sugerida para reevaluación:{" "}
            <strong className="text-foreground">
              {nextEvalDate.toLocaleDateString("es-CO", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </strong>
          </p>
        ) : null}

        <button
          type="button"
          disabled
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/40 px-5 py-2.5 text-sm font-semibold text-primary opacity-70"
          title="Próximamente"
        >
          Registrar avance
        </button>
      </section>

      <p className="text-xs text-muted-foreground">
        Próximamente podrás registrar avances semanales y recibir recordatorios.{" "}
        <Link to="/app" className="underline">Volver al inicio</Link>.
      </p>
    </div>
  );
}