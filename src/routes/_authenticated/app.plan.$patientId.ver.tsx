import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { getInteractivePlan } from "@/lib/plan/plan.functions";
import { MoholkaFloatingButton } from "@/components/plan/MoholkaFloatingButton";

export const Route = createFileRoute("/_authenticated/app/plan/$patientId/ver")({
  head: () => ({
    meta: [
      { title: "Ver Plan Interactivo — NEUROPLAN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerPlanInteractivo,
});

type InstructionCard = {
  name: string;
  priority_level: string;
  purpose: string;
  description: string;
  frequency: string;
  repetitions: string;
  progression: string;
  materials: string;
  sources?: string[];
};

type WeekBlock = { week: number; focus: string; activities: string; adjustments: string };
type TrackingRow = {
  week: number;
  observations_prompt: string;
  achievements_prompt: string;
  difficulties_prompt: string;
};

type PlanContent = {
  context?: {
    child_name: string;
    age: string;
    diagnosis: string;
    reason: string;
    duration_weeks: number;
    intro: string;
  };
  findings?: { body: string; sources?: string[] };
  objectives?: { intro: string; items: string[] };
  instruction_cards?: { intro: string; cards: InstructionCard[] };
  routine_12_weeks?: { intro: string; weeks: WeekBlock[] };
  weekly_tracking?: { intro: string; rows: TrackingRow[] };
  family_recommendations?: { intro: string; items: string[]; sources?: string[] };
  closing?: { body: string };
  legal_notice?: { body: string };
};

const MANUAL_REMINDER =
  "La ejecución correcta de este ejercicio puede consultarse en el Manual Oficial de Ejercicios NEUROPLAN disponible para descarga.";

function VerPlanInteractivo() {
  const { patientId } = Route.useParams();
  const navigate = useNavigate();
  const fetchPlan = useServerFn(getInteractivePlan);

  const plan = useQuery({
    queryKey: ["interactive-plan", patientId],
    queryFn: () => fetchPlan({ data: { patientId } }),
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d || d.blocked) return false;
      return d.roadmap.plan_generation_status === "ready" ? false : 10_000;
    },
  });

  useEffect(() => {
    if (plan.data && plan.data.blocked) {
      navigate({
        to: "/app/plan-interactivo",
        search: { patient: patientId },
        replace: true,
      });
    }
  }, [plan.data, navigate, patientId]);

  if (plan.isLoading || !plan.data || plan.data.blocked) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  const { roadmap } = plan.data;
  const ready = roadmap.plan_generation_status === "ready";
  const content = (roadmap.plan_content ?? null) as PlanContent | null;

  return (
    <article className="flex flex-col gap-6">
      <Link
        to="/app/plan/$patientId"
        params={{ patientId }}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Volver al Plan
      </Link>

      <header className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 shadow-sm ring-1 ring-primary/20">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Plan Interactivo
        </p>
        <h1 className="mt-2 font-serif text-2xl leading-tight text-foreground">
          Plan Interactivo NEUROPLAN
        </h1>
      </header>

      {!ready || !content ? (
        <section className="rounded-3xl bg-card p-6 text-center shadow-sm ring-1 ring-border/50">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <h2 className="mt-4 font-serif text-2xl text-foreground">
            Estamos preparando tu Plan Interactivo NEUROPLAN
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Estamos organizando toda la información de la evaluación para construir un programa completamente personalizado para tu hijo. Este proceso se realizará automáticamente en el siguiente paso.
          </p>
        </section>
      ) : (
        <>
          {content.context && (
            <Section title="Contexto del caso">
              <dl className="grid grid-cols-1 gap-2 text-sm">
                <Row label="Niño/a" value={content.context.child_name} />
                <Row label="Edad" value={content.context.age} />
                <Row label="Diagnóstico" value={content.context.diagnosis} />
                <Row label="Motivo de consulta" value={content.context.reason} />
                <Row label="Duración" value={`${content.context.duration_weeks} semanas`} />
              </dl>
              {content.context.intro && (
                <p className="mt-3 text-sm text-foreground whitespace-pre-line">
                  {content.context.intro}
                </p>
              )}
            </Section>
          )}
          {content.findings?.body && (
            <Section title="Hallazgos de la valoración">
              <p className="text-sm text-foreground whitespace-pre-line">{content.findings.body}</p>
            </Section>
          )}
          {content.objectives && content.objectives.items?.length > 0 && (
            <Section title="Objetivos del programa">
              {content.objectives.intro && (
                <p className="mb-3 text-sm text-muted-foreground whitespace-pre-line">
                  {content.objectives.intro}
                </p>
              )}
              <BulletList items={content.objectives.items} />
            </Section>
          )}
          {content.instruction_cards && content.instruction_cards.cards?.length > 0 && (
            <Section title="Fichas de indicaciones">
              {content.instruction_cards.intro && (
                <p className="mb-4 text-sm text-muted-foreground whitespace-pre-line">
                  {content.instruction_cards.intro}
                </p>
              )}
              <div className="flex flex-col gap-4">
                {content.instruction_cards.cards.map((c, i) => (
                  <div key={i} className="rounded-2xl border border-border/60 bg-background p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-serif text-lg text-foreground">{c.name}</p>
                      <span className="text-xs font-medium uppercase tracking-wide text-primary">
                        Prioridad: {c.priority_level}
                      </span>
                    </div>
                    <dl className="mt-3 grid grid-cols-1 gap-2 text-sm">
                      <Row label="Propósito" value={c.purpose} />
                      <Row label="Descripción" value={c.description} />
                      <Row label="Frecuencia" value={c.frequency} />
                      <Row label="Repeticiones" value={c.repetitions} />
                      <Row label="Progresión" value={c.progression} />
                      <Row label="Materiales" value={c.materials} />
                    </dl>
                    <p className="mt-3 rounded-lg bg-primary/5 p-3 text-xs italic text-muted-foreground">
                      {MANUAL_REMINDER}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}
          {content.routine_12_weeks && content.routine_12_weeks.weeks?.length > 0 && (
            <Section title="Organización de la rutina (12 semanas)">
              {content.routine_12_weeks.intro && (
                <p className="mb-3 text-sm text-muted-foreground whitespace-pre-line">
                  {content.routine_12_weeks.intro}
                </p>
              )}
              <div className="flex flex-col gap-3">
                {content.routine_12_weeks.weeks.map((w) => (
                  <div key={w.week} className="rounded-2xl border border-border/60 bg-background p-4">
                    <p className="font-medium text-foreground">Semana {w.week}</p>
                    <dl className="mt-2 grid grid-cols-1 gap-1.5 text-sm">
                      <Row label="Foco" value={w.focus} />
                      <Row label="Actividades" value={w.activities} />
                      <Row label="Ajustes" value={w.adjustments} />
                    </dl>
                  </div>
                ))}
              </div>
            </Section>
          )}
          {content.weekly_tracking && content.weekly_tracking.rows?.length > 0 && (
            <Section title="Seguimiento semanal">
              {content.weekly_tracking.intro && (
                <p className="mb-3 text-sm text-muted-foreground whitespace-pre-line">
                  {content.weekly_tracking.intro}
                </p>
              )}
              <div className="flex flex-col gap-3">
                {content.weekly_tracking.rows.map((row) => (
                  <div key={row.week} className="rounded-2xl border border-border/60 bg-background p-4">
                    <p className="font-medium text-foreground">Semana {row.week}</p>
                    <dl className="mt-2 grid grid-cols-1 gap-1.5 text-sm">
                      <Row label="Observaciones" value={row.observations_prompt} />
                      <Row label="Logros" value={row.achievements_prompt} />
                      <Row label="Dificultades" value={row.difficulties_prompt} />
                    </dl>
                  </div>
                ))}
              </div>
            </Section>
          )}
          {content.family_recommendations && content.family_recommendations.items?.length > 0 && (
            <Section title="Recomendaciones para la familia">
              {content.family_recommendations.intro && (
                <p className="mb-3 text-sm text-muted-foreground whitespace-pre-line">
                  {content.family_recommendations.intro}
                </p>
              )}
              <BulletList items={content.family_recommendations.items} />
            </Section>
          )}
          {content.closing?.body && (
            <Section title="Finalización del programa">
              <p className="text-sm text-foreground whitespace-pre-line">{content.closing.body}</p>
            </Section>
          )}
          {content.legal_notice?.body && (
            <Section title="Aviso legal">
              <p className="text-xs text-muted-foreground whitespace-pre-line">
                {content.legal_notice.body}
              </p>
            </Section>
          )}
        </>
      )}

      <MoholkaFloatingButton ready={ready} />
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
      <h2 className="font-serif text-xl text-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2 text-sm text-foreground">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground whitespace-pre-line">{value}</dd>
    </div>
  );
}