import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardList, ArrowRight } from "lucide-react";
import { getFamilyDashboard } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/app/evaluaciones")({
  head: () => ({
    meta: [
      { title: "Evaluaciones — NEUROPLAN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EvaluacionesPage,
});

function EvaluacionesPage() {
  const fetchDashboard = useServerFn(getFamilyDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["family-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  if (isLoading || !data) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando…</p>;
  }
  const p = data.patient;
  const a = data.assessments;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Evaluaciones
        </p>
        <h1 className="mt-1 font-serif text-2xl leading-tight text-foreground">
          Historial de evaluaciones
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aquí verás cada evaluación realizada. Podrás iniciar futuras
          reevaluaciones cuando sea recomendable.
        </p>
      </header>

      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Evaluaciones realizadas
            </p>
            <p className="mt-1 font-serif text-3xl text-foreground">
              {a.count}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Estado actual:{" "}
              <strong className="text-foreground">
                {a.status === "completed"
                  ? "Completada"
                  : a.status === "in_progress"
                    ? "En progreso"
                    : "Sin iniciar"}
              </strong>
            </p>
            {a.lastCompletedAt ? (
              <p className="text-sm text-muted-foreground">
                Última:{" "}
                {new Date(a.lastCompletedAt).toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            ) : null}
          </div>
          <ClipboardList className="h-8 w-8 text-primary" />
        </div>

        {p ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {a.status !== "completed" ? (
              <Link
                to="/app/evaluacion"
                search={{ patient: p.id }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {a.status === "in_progress"
                  ? "Continuar evaluación"
                  : "Iniciar evaluación"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                to="/app/informe"
                search={{ patient: p.id }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Ver Hoja de Ruta <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}