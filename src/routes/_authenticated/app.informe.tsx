import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Lock, ArrowRight, Download } from "lucide-react";
import { getMyReport } from "@/lib/assessment.functions";
import type {
  CognitiveResult,
  FunctionalArea,
  ReflexResult,
  Priorities,
} from "@/lib/report-engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/informe")({
  head: () => ({ meta: [{ title: "Hoja de Ruta — NEUROPLAN" }, { name: "robots", content: "noindex" }] }),
  component: InformePage,
});

type Report = {
  cognitive: CognitiveResult;
  functional: FunctionalArea[];
  reflexes: ReflexResult[];
  priorities: Priorities;
};

function InformePage() {
  const fetchReport = useServerFn(getMyReport);
  const { data, isLoading } = useQuery({
    queryKey: ["my-report"],
    queryFn: () => fetchReport(),
  });

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!data) {
    return (
      <div className="rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-border/50">
        <p className="text-sm text-muted-foreground">
          Aún no has completado tu evaluación.
        </p>
        <Link
          to="/app/evaluacion"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Continuar evaluación <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const report = data as unknown as Report;
  const { cognitive, functional, reflexes, priorities } = report;

  return (
    <article className="flex flex-col gap-6">
      <header className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Informe orientador · Gratuito
        </p>
        <h1 className="mt-1 font-serif text-2xl leading-tight text-foreground">
          Hoja de Ruta para el Neurodesarrollo
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este informe ofrece una <strong>orientación general</strong> a partir de tus
          respuestas. No es un diagnóstico ni reemplaza la valoración de un profesional.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <Download className="h-4 w-4" /> Descargar en PDF
        </button>
      </header>

      {/* 1. Contexto general */}
      <Section number={1} title="Panorama general">
        <p className="text-sm text-foreground">
          Nivel general del perfil cognitivo:{" "}
          <strong className="text-primary">{cognitive.level}</strong>. Dominancia
          hemisférica indicada: <strong>{cognitive.dominantHemisphere}</strong>.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="Hem. derecho" value={cognitive.rightScore} />
          <Stat label="Hem. izquierdo" value={cognitive.leftScore} />
          <Stat label="Total" value={cognitive.totalScore} />
        </div>
      </Section>

      {/* 2. Áreas funcionales */}
      <Section number={2} title="Áreas funcionales">
        <ul className="space-y-2">
          {functional.map((f) => (
            <li key={f.area} className="rounded-xl bg-muted/40 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{f.area}</span>
                <span className="text-xs text-muted-foreground">
                  {f.percent}% · {f.level}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    f.level === "Muy Alto" || f.level === "Alto" ? "bg-primary" : "bg-primary/50",
                  )}
                  style={{ width: `${f.percent}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* 3. Reflejos */}
      <Section number={3} title="Reflejos primitivos priorizados">
        <p className="mb-3 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
          Las respuestas obtenidas sugieren, cuando aparecen puntajes altos, una
          mayor probabilidad de persistencia de ese reflejo. No representan un
          diagnóstico clínico.
        </p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {reflexes.map((r) => (
            <li
              key={r.reflex}
              className="rounded-xl border border-border/60 bg-background p-3"
            >
              <p className="text-sm font-medium text-foreground">{r.reflex}</p>
              <p className="text-xs text-muted-foreground">
                Intensidad: {r.level} ({r.score}/{r.max})
              </p>
            </li>
          ))}
        </ul>
      </Section>

      {/* 4. Prioridades */}
      <Section number={4} title="Prioridades detectadas">
        <p className="text-sm text-foreground">
          Áreas funcionales a acompañar primero:{" "}
          <strong>{priorities.functionalPriorities.join(", ") || "—"}</strong>.
        </p>
        <p className="mt-2 text-sm text-foreground">
          Reflejos con mayor intensidad: {" "}
          <strong>{priorities.reflexPriorities.join(", ") || "—"}</strong>.
        </p>
      </Section>

      {/* 5. Recomendaciones generales */}
      <Section number={5} title="Recomendaciones generales">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground marker:text-primary">
          <li>Establecer rutinas predecibles con anticipación visual.</li>
          <li>Priorizar juegos sensoriomotores diarios de 15–20 minutos.</li>
          <li>
            Buscar valoración profesional para las áreas prioritarias identificadas.
          </li>
        </ul>
      </Section>

      {/* 6. Cautela clínica */}
      <Section number={6} title="Aviso importante">
        <p className="text-sm text-muted-foreground">
          Esta Hoja de Ruta es <strong>informativa y orientadora</strong>. No
          constituye diagnóstico ni sustituye la valoración de un neuropsicólogo u
          otro profesional de la salud.
        </p>
      </Section>

      {/* 7. CTA Plan Interactivo */}
      <section className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 shadow-sm ring-1 ring-primary/20">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Siguiente paso
        </p>
        <h2 className="mt-1 font-serif text-2xl leading-tight text-foreground">
          Continúa con tu Plan Interactivo Personalizado
        </h2>
        <p className="mt-3 text-sm text-foreground">
          Recibe un plan diseñado para las necesidades específicas de tu hijo/a,
          con actividades semanales organizadas por prioridad y con el
          acompañamiento de <strong>Moholka</strong>, el asistente especializado
          de inteligencia artificial en neurodesarrollo, durante las primeras
          semanas.
        </p>

        <ul className="mt-4 space-y-2 text-sm text-foreground">
          <li>✔️ Actividades personalizadas y priorizadas</li>
          <li>✔️ Acompañamiento de Moholka durante 30 días</li>
          <li>✔️ Seguimiento semanal del avance</li>
          <li>✔️ Recursos y materiales descargables</li>
        </ul>

        <p className="mt-4 rounded-2xl bg-background/70 p-3 text-xs text-muted-foreground ring-1 ring-border/60">
          El Plan Interactivo es una herramienta educativa y orientadora. No
          reemplaza la valoración clínica de un profesional.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => alert("Próximamente: pago y desbloqueo del Plan Interactivo.")}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Lock className="h-4 w-4" />
            Desbloquear mi Plan Interactivo
          </button>
          <button
            type="button"
            onClick={() => alert("Próximamente: detalle completo del plan.")}
            className="inline-flex items-center justify-center rounded-full border border-primary/40 px-5 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
          >
            Conocer todo lo que incluye
          </button>
        </div>
      </section>
    </article>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/50">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {number}
        </span>
        <h2 className="font-serif text-lg text-foreground">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <p className="text-lg font-semibold text-primary">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}