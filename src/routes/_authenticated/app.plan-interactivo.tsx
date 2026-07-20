import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import {
  Sparkles,
  Lock,
  CheckCircle2,
  XCircle,
  Target,
  ListChecks,
  CalendarDays,
  FileDown,
  Bot,
  MessagesSquare,
  Users,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/plan-interactivo")({
  head: () => ({
    meta: [
      { title: "Plan Interactivo — NEUROPLAN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ patient: z.string().uuid() }).parse(s),
  component: PlanInteractivoPage,
});

const includes = [
  {
    icon: Target,
    title: "Plan personalizado por prioridades",
    desc: "Un recorrido organizado según las áreas que más necesita tu hijo/a acompañar primero.",
  },
  {
    icon: ListChecks,
    title: "Actividades paso a paso",
    desc: "Instrucciones claras y sencillas para aplicar en casa, sin necesidad de experiencia clínica.",
  },
  {
    icon: CalendarDays,
    title: "Frecuencia semanal recomendada",
    desc: "Sabrás qué hacer, cuántas veces y con qué duración para lograr avances sostenidos.",
  },
  {
    icon: FileDown,
    title: "Recursos descargables",
    desc: "Materiales visuales, guías imprimibles y apoyos para tus rutinas familiares.",
  },
  {
    icon: Bot,
    title: "Acompañamiento de Moholka 30 días",
    desc: "Nuestro asistente especializado en neurodesarrollo te guía durante el primer mes.",
  },
  {
    icon: MessagesSquare,
    title: "Respuestas a tus preguntas",
    desc: "Consulta dudas sobre el plan y recibe orientación contextualizada de inmediato.",
  },
  {
    icon: Users,
    title: "Membresía grupal con la neuropsicóloga",
    desc: "Espacios en vivo con profesional para resolver inquietudes junto a otras familias.",
  },
  {
    icon: RefreshCw,
    title: "Actualizaciones del plan",
    desc: "Tu plan evoluciona con los avances de tu hijo/a: se ajusta cuando es necesario.",
  },
];

function PlanInteractivoPage() {
  const { patient } = Route.useSearch();
  return (
    <article className="flex flex-col gap-6">
      {/* Hero */}
      <header className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 shadow-sm ring-1 ring-primary/20">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Plan Interactivo NEUROPLAN
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-foreground">
          Ya conoces las prioridades. Ahora descubre cómo acompañar a tu hijo paso a paso.
        </h1>
        <p className="mt-3 text-sm text-foreground">
          Convertimos las prioridades identificadas en tu Hoja de Ruta en un plan
          concreto, semana a semana, con actividades y el acompañamiento de{" "}
          <strong>Moholka</strong>.
        </p>
        <Link
          to="/checkout"
          search={{ patient }}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Lock className="h-4 w-4" />
          Desbloquear mi Plan Interactivo
        </Link>
      </header>

      {/* Comparativa */}
      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Comparativa
        </p>
        <h2 className="mt-1 font-serif text-2xl text-foreground">
          Hoja de Ruta vs Plan Interactivo
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Una te muestra dónde acompañar. El otro te muestra cómo hacerlo.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-background p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Hoja de Ruta · Gratis
            </p>
            <h3 className="mt-1 font-serif text-lg text-foreground">Orientación general</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <Row ok>Panorama del perfil cognitivo</Row>
              <Row ok>Áreas funcionales priorizadas</Row>
              <Row ok>Reflejos primitivos destacados</Row>
              <Row ok>Recomendaciones generales</Row>
              <Row>Actividades paso a paso</Row>
              <Row>Frecuencia semanal recomendada</Row>
              <Row>Recursos descargables</Row>
              <Row>Acompañamiento de Moholka</Row>
              <Row>Membresía grupal con la neuropsicóloga</Row>
            </ul>
          </div>

          <div className="rounded-2xl border-2 border-primary bg-primary/5 p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              Plan Interactivo · Completo
            </p>
            <h3 className="mt-1 font-serif text-lg text-foreground">
              Acompañamiento paso a paso
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <Row ok>Panorama del perfil cognitivo</Row>
              <Row ok>Áreas funcionales priorizadas</Row>
              <Row ok>Reflejos primitivos destacados</Row>
              <Row ok>Recomendaciones generales</Row>
              <Row ok highlight>
                Actividades paso a paso
              </Row>
              <Row ok highlight>
                Frecuencia semanal recomendada
              </Row>
              <Row ok highlight>
                Recursos descargables
              </Row>
              <Row ok highlight>
                Acompañamiento de Moholka 30 días
              </Row>
              <Row ok highlight>
                Membresía grupal con la neuropsicóloga
              </Row>
            </ul>
          </div>
        </div>
      </section>

      {/* Recorrido visual */}
      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Qué recibirás
        </p>
        <h2 className="mt-1 font-serif text-2xl text-foreground">
          Un acompañamiento diseñado para tu familia
        </h2>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {includes.map((it) => (
            <li
              key={it.title}
              className="flex gap-3 rounded-2xl border border-border/60 bg-background p-4"
            >
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <it.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="font-medium text-foreground">{it.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{it.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Aviso */}
      <p className="rounded-2xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">
        El Plan Interactivo es una herramienta educativa y orientadora. No reemplaza
        la valoración clínica de un profesional.
      </p>

      {/* CTA final */}
      <section className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 text-center shadow-sm ring-1 ring-primary/20">
        <h2 className="font-serif text-2xl leading-tight text-foreground">
          Comienza hoy el plan de tu hijo/a
        </h2>
        <p className="mt-2 text-sm text-foreground">
          Un solo pago para desbloquear todo el acompañamiento.
        </p>
        <Link
          to="/checkout"
          search={{ patient }}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Lock className="h-4 w-4" />
          Desbloquear mi Plan Interactivo
        </Link>
      </section>
    </article>
  );
}

function Row({
  children,
  ok,
  highlight,
}: {
  children: React.ReactNode;
  ok?: boolean;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2
          className={
            highlight
              ? "mt-0.5 h-4 w-4 shrink-0 text-primary"
              : "mt-0.5 h-4 w-4 shrink-0 text-primary/70"
          }
        />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
      )}
      <span
        className={
          ok
            ? highlight
              ? "font-medium text-foreground"
              : "text-foreground"
            : "text-muted-foreground/70 line-through"
        }
      >
        {children}
      </span>
    </li>
  );
}