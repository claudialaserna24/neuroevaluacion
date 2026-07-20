import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import {
  Sparkles,
  Lock,
  Target,
  ListChecks,
  CalendarDays,
  FileDown,
  Bot,
  Users,
  History,
  Compass,
  ClipboardList,
  HeartHandshake,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/plan-interactivo")({
  head: () => ({
    meta: [
      { title: "Conoce tu Plan Interactivo — NEUROPLAN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ patient: z.string().uuid() }).parse(s),
  component: PlanInteractivoPage,
});

type Section = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

const sections: Section[] = [
  {
    icon: Target,
    title: "Tu Plan Personalizado",
    desc: "Se genera automáticamente a partir de la Hoja de Ruta y de los resultados obtenidos en la evaluación de tu hijo/a.",
  },
  {
    icon: ListChecks,
    title: "Actividades paso a paso",
    desc: "Ejercicios organizados por prioridad para favorecer la integración de reflejos y la integración sensorial, explicados de forma sencilla para aplicarlos en casa.",
  },
  {
    icon: CalendarDays,
    title: "Calendario de trabajo",
    desc: "El plan propone una frecuencia semanal recomendada para facilitar el seguimiento del proceso y sostener los avances.",
  },
  {
    icon: FileDown,
    title: "Materiales de apoyo",
    desc: "Recursos descargables asociados a las actividades: guías visuales, apoyos imprimibles y materiales complementarios.",
  },
  {
    icon: Bot,
    title: "Acompañamiento de Moholka (30 días)",
    desc: "Nuestra agente de IA especializada responde preguntas exclusivamente relacionadas con la aplicación del Plan durante los primeros 30 días. No responde consultas clínicas ni diagnósticas.",
  },
  {
    icon: Users,
    title: "Membresía",
    desc: "Acceso a una comunidad privada con encuentros grupales periódicos dirigidos por la neuropsicóloga, contenido adicional sobre neurodesarrollo y respuestas a preguntas personalizadas.",
  },
  {
    icon: History,
    title: "Historial",
    desc: "El Plan permanecerá guardado y podrá compararse con futuras evaluaciones del mismo niño para visualizar la evolución del proceso.",
  },
];

const outcomes = [
  {
    icon: Compass,
    text: "Comprender por dónde empezar sin sentirte abrumado.",
  },
  {
    icon: ClipboardList,
    text: "Trabajar las prioridades identificadas en la evaluación con una secuencia organizada.",
  },
  {
    icon: HeartHandshake,
    text: "Contar con una guía práctica y acompañamiento durante las primeras semanas, junto a una comunidad con los mismos intereses.",
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
          Conoce tu Plan Interactivo
        </h1>
        <p className="mt-3 text-sm text-foreground">
          Todo lo que recibirá tu familia para transformar la Hoja de Ruta en un
          plan concreto, semana a semana, con el acompañamiento de{" "}
          <strong>Moholka</strong> y la neuropsicóloga.
        </p>
      </header>

      {/* Secciones */}
      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Qué recibirás
        </p>
        <h2 className="mt-1 font-serif text-2xl text-foreground">
          Un acompañamiento diseñado para tu familia
        </h2>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {sections.map((s) => (
            <li
              key={s.title}
              className="flex gap-3 rounded-2xl border border-border/60 bg-background p-4"
            >
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <s.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="font-medium text-foreground">{s.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Resultados esperados */}
      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Resultados
        </p>
        <h2 className="mt-1 font-serif text-2xl text-foreground">
          ¿Qué lograrás con este plan?
        </h2>

        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {outcomes.map((o) => (
            <li
              key={o.text}
              className="rounded-2xl border border-border/60 bg-background p-4"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <o.icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-sm text-foreground">{o.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Aviso clínico */}
      <p className="rounded-2xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">
        El Plan Interactivo es una herramienta educativa y orientadora. No
        reemplaza la valoración clínica de un profesional.
      </p>

      {/* CTA final */}
      <section className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 text-center shadow-sm ring-1 ring-primary/20">
        <h2 className="font-serif text-2xl leading-tight text-foreground">
          Comienza hoy el acompañamiento personalizado de tu hijo.
        </h2>
        <p className="mt-3 text-sm text-foreground">
          El Plan Interactivo convierte los resultados de la evaluación en
          acciones concretas, organizadas y fáciles de aplicar. Tendrás una guía
          clara para comenzar mientras cuentas con el acompañamiento de
          NEUROPLAN.
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