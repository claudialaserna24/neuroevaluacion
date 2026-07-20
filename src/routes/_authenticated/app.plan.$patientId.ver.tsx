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

type PlanSection = {
  title: string;
  body?: string;
  items?: string[];
};

type PlanContent = {
  context?: string;
  findings?: string[];
  objectives?: string[];
  instruction_cards?: PlanSection[];
  routine_12_weeks?: PlanSection[];
  family_recommendations?: string[];
};

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
              <p className="text-sm text-foreground whitespace-pre-line">{content.context}</p>
            </Section>
          )}
          {content.findings && content.findings.length > 0 && (
            <Section title="Hallazgos">
              <BulletList items={content.findings} />
            </Section>
          )}
          {content.objectives && content.objectives.length > 0 && (
            <Section title="Objetivos">
              <BulletList items={content.objectives} />
            </Section>
          )}
          {content.instruction_cards && content.instruction_cards.length > 0 && (
            <Section title="Fichas de indicaciones">
              <SubSections sections={content.instruction_cards} />
            </Section>
          )}
          {content.routine_12_weeks && content.routine_12_weeks.length > 0 && (
            <Section title="Rutina de 12 semanas">
              <SubSections sections={content.routine_12_weeks} />
            </Section>
          )}
          {content.family_recommendations && content.family_recommendations.length > 0 && (
            <Section title="Recomendaciones para la familia">
              <BulletList items={content.family_recommendations} />
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
function SubSections({ sections }: { sections: { title: string; body?: string; items?: string[] }[] }) {
  return (
    <div className="flex flex-col gap-4">
      {sections.map((s, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-background p-4">
          <p className="font-medium text-foreground">{s.title}</p>
          {s.body && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{s.body}</p>}
          {s.items && s.items.length > 0 && (
            <div className="mt-2">
              <BulletList items={s.items} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}