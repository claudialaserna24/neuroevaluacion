import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Sparkles } from "lucide-react";
import { getAssessmentState, getMyReport } from "@/lib/assessment.functions";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Inicio — NEUROPLAN" }, { name: "robots", content: "noindex" }] }),
  component: DashboardHome,
});

function DashboardHome() {
  const fetchState = useServerFn(getAssessmentState);
  const fetchReport = useServerFn(getMyReport);
  const state = useQuery({ queryKey: ["assessment-state"], queryFn: () => fetchState() });
  const report = useQuery({ queryKey: ["my-report"], queryFn: () => fetchReport() });

  const answered = state.data?.answered.length ?? 0;
  const totalQuestions = 367;
  const completed = state.data?.assessment.status === "completed";
  const progressPct = Math.min(100, Math.round((answered / totalQuestions) * 100));

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Tu proceso</p>
        <h1 className="mt-1 font-serif text-2xl leading-tight text-foreground">
          {completed
            ? "Tu Hoja de Ruta está lista"
            : answered === 0
              ? "Comienza tu Evaluación Inteligente"
              : "Continúa donde quedaste"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {completed
            ? "Revisa las principales necesidades identificadas y descubre el siguiente paso."
            : answered === 0
              ? "Son 3 módulos: Perfil Cognitivo, Evaluación Funcional y Reflejos Primitivos. Puedes pausar y retomar cuando quieras."
              : `Llevas ${answered} de ${totalQuestions} preguntas respondidas.`}
        </p>

        {!completed && (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        <Link
          to={completed ? "/app/informe" : "/app/evaluacion"}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {completed ? "Ver mi Hoja de Ruta" : answered === 0 ? "Comenzar" : "Continuar"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {completed && report.data ? (
        <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Próximo paso
          </p>
          <h2 className="mt-1 font-serif text-lg text-foreground">
            Da el siguiente paso en el acompañamiento de tu hijo
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            El Plan Interactivo Personalizado organiza qué hacer, en qué orden y
            cómo, con acompañamiento de Moholka las primeras semanas.
          </p>
          <Link
            to="/app/informe"
            className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
          >
            Ver detalle en la Hoja de Ruta →
          </Link>
        </section>
      ) : null}
    </div>
  );
}