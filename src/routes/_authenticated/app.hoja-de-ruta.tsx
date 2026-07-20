import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Compass, ArrowRight } from "lucide-react";
import { getFamilyDashboard } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/app/hoja-de-ruta")({
  head: () => ({
    meta: [
      { title: "Hoja de Ruta — NEUROPLAN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HojaDeRutaResumen,
});

function HojaDeRutaResumen() {
  const fetchDashboard = useServerFn(getFamilyDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["family-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  if (isLoading || !data) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando…</p>;
  }

  const r = data.roadmap;
  const p = data.patient;

  if (!r || !p) {
    return (
      <div className="rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-border/50">
        <p className="text-sm text-muted-foreground">
          Completa la evaluación para generar tu Hoja de Ruta.
        </p>
        {p ? (
          <Link
            to="/app/evaluacion"
            search={{ patient: p.id }}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Ir a la evaluación <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Hoja de Ruta
        </p>
        <h1 className="mt-1 font-serif text-2xl leading-tight text-foreground">
          Resumen de tu Hoja de Ruta
        </h1>
      </header>

      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Nivel general
            </p>
            <p className="mt-1 font-serif text-xl text-foreground">
              {r.cognitiveLevel ?? "—"}
            </p>
          </div>
          <Compass className="h-8 w-8 text-primary" />
        </div>

        {r.topFunctional.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Áreas prioritarias
            </p>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {r.topFunctional.map((f) => (
                <li key={f} className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {r.topReflexes.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reflejos priorizados
            </p>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {r.topReflexes.map((f) => (
                <li key={f} className="rounded-full bg-muted px-3 py-1 text-foreground">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Link
          to="/app/informe"
          search={{ patient: p.id }}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Ver Hoja de Ruta completa <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}