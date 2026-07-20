import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  User,
  ClipboardList,
  Compass,
  FileText,
  Bot,
  BookOpen,
  TrendingUp,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { getOnboardingState } from "@/lib/onboarding.functions";
import { getFamilyDashboard } from "@/lib/dashboard.functions";
import { getManualDownloadUrl } from "@/lib/plan/plan.functions";
import { computeAgeYears } from "@/lib/patients.functions";
import { SummaryCard } from "@/components/dashboard/SummaryCard";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [{ title: "Inicio — NEUROPLAN" }, { name: "robots", content: "noindex" }],
  }),
  component: DashboardHome,
});

function DashboardHome() {
  const fetchOnboarding = useServerFn(getOnboardingState);
  const fetchDashboard = useServerFn(getFamilyDashboard);
  const fetchManualUrl = useServerFn(getManualDownloadUrl);
  const navigate = useNavigate();
  const [openingManual, setOpeningManual] = useState(false);

  const onboarding = useQuery({
    queryKey: ["onboarding-state"],
    queryFn: () => fetchOnboarding(),
  });
  const dashboard = useQuery({
    queryKey: ["family-dashboard"],
    queryFn: () => fetchDashboard(),
    enabled: !!onboarding.data,
  });

  useEffect(() => {
    if (!onboarding.data) return;
    const s = onboarding.data;
    if (!s.hasConsent) {
      navigate({ to: "/consentimiento", replace: true });
      return;
    }
    if (!s.activePatientId) return; // dashboard will offer register CTA
    if (!s.onboardingCompleted) {
      navigate({ to: "/onboarding", search: { patient: s.activePatientId }, replace: true });
      return;
    }
    // Do NOT auto-redirect to evaluation; dashboard is the primary hub.
  }, [onboarding.data, navigate]);

  if (!onboarding.data || !dashboard.data) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando…</p>;
  }

  const d = dashboard.data;
  const parentName =
    d.profile.full_name?.split(" ")[0] ||
    d.patient?.parent_name?.split(" ")[0] ||
    "";

  async function openManual() {
    if (!d.patient) return;
    try {
      setOpeningManual(true);
      const res = await fetchManualUrl({ data: { patientId: d.patient.id } });
      if (!res.available) throw new Error("Manual no disponible");
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo abrir el manual",
      );
    } finally {
      setOpeningManual(false);
    }
  }

  const p = d.patient;
  const hasPatient = !!p;
  const planStatus = d.plan.status;
  const evalStatus = d.assessments.status;

  // Primary CTA
  let ctaLabel = "Continuar Plan";
  let ctaTo: string | null = null;
  let ctaParams: Record<string, string> | undefined;
  let ctaSearch: Record<string, string> | undefined;
  let ctaIcon = ArrowRight;
  let ctaDisabled = false;

  if (!hasPatient) {
    ctaLabel = "Registrar paciente";
    ctaTo = "/app/pacientes";
    ctaSearch = { first: "1" };
  } else if (evalStatus === "in_progress") {
    ctaLabel = "Continuar evaluación";
    ctaTo = "/app/evaluacion";
    ctaSearch = { patient: p!.id };
    ctaIcon = ClipboardList;
  } else if (evalStatus === "none") {
    ctaLabel = "Iniciar evaluación";
    ctaTo = "/app/evaluacion";
    ctaSearch = { patient: p!.id };
    ctaIcon = ClipboardList;
  } else if (planStatus === "locked" || planStatus === null) {
    ctaLabel = "Desbloquear Plan";
    ctaTo = "/app/plan-interactivo";
    ctaSearch = { patient: p!.id };
    ctaIcon = Lock;
  } else if (planStatus === "paid_pending" || planStatus === "generating") {
    ctaLabel = "Estamos preparando tu Plan…";
    ctaIcon = Loader2;
    ctaDisabled = true;
  } else if (planStatus === "ready") {
    ctaLabel = "Continuar Plan";
    ctaTo = "/app/plan/$patientId";
    ctaParams = { patientId: p!.id };
    ctaIcon = Sparkles;
  } else if (planStatus === "error") {
    ctaLabel = "Reintentar generación";
    ctaTo = "/app/plan/$patientId";
    ctaParams = { patientId: p!.id };
  }

  const CTAIcon = ctaIcon;

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome */}
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Tu centro de acompañamiento
        </p>
        <h1 className="mt-1 font-serif text-3xl leading-tight text-foreground">
          Bienvenido(a){parentName ? `, ${parentName}` : ""}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Aquí verás el estado completo del proceso de tu hijo(a) y podrás
          acceder a cada etapa del programa NEUROPLAN.
        </p>
      </header>

      {/* Hero summary */}
      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        {hasPatient ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Programa activo · NEUROPLAN
                </p>
                <h2 className="mt-1 font-serif text-2xl leading-tight text-foreground">
                  {p!.first_name} {p!.last_name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {computeAgeYears(p!.date_of_birth)} años
                  {p!.diagnosis ? ` · ${p!.diagnosis}` : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <PlanBadge status={planStatus} />
                {d.plan.weekNumber && d.plan.totalWeeks ? (
                  <p className="text-xs text-muted-foreground">
                    Semana {d.plan.weekNumber} de {d.plan.totalWeeks}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-5">
              {ctaTo ? (
                <Link
                  to={ctaTo}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  params={ctaParams as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  search={ctaSearch as any}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  <CTAIcon className="h-4 w-4" />
                  {ctaLabel}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={ctaDisabled}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground opacity-70"
                >
                  <CTAIcon
                    className={`h-4 w-4 ${ctaDisabled ? "animate-spin" : ""}`}
                  />
                  {ctaLabel}
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="font-serif text-2xl leading-tight text-foreground">
              Registra a tu hijo(a) para comenzar
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Necesitamos algunos datos básicos para personalizar el proceso.
            </p>
            <Link
              to="/app/pacientes"
              search={{ first: "1" }}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <User className="h-4 w-4" />
              Registrar paciente
            </Link>
          </>
        )}
      </section>

      {/* Summary grid */}
      {hasPatient ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            icon={User}
            eyebrow="Ficha Integral"
            title={`${p!.first_name} ${p!.last_name}`}
            description={
              p!.diagnosis ?? `${computeAgeYears(p!.date_of_birth)} años`
            }
            cta="Ver ficha integral"
            to="/app/ficha"
          />

          <SummaryCard
            icon={ClipboardList}
            eyebrow="Evaluaciones"
            title={
              evalStatus === "completed"
                ? `${d.assessments.count} realizada${d.assessments.count === 1 ? "" : "s"}`
                : evalStatus === "in_progress"
                  ? "Evaluación en progreso"
                  : "Aún sin evaluación"
            }
            description={
              d.assessments.lastCompletedAt
                ? `Última: ${formatDate(d.assessments.lastCompletedAt)}`
                : null
            }
            cta="Ver historial"
            to="/app/evaluaciones"
          />

          <SummaryCard
            icon={Compass}
            eyebrow="Hoja de Ruta"
            title={
              d.roadmap
                ? `Nivel ${d.roadmap.cognitiveLevel ?? "general"}`
                : "Aún no disponible"
            }
            description={
              d.roadmap && d.roadmap.topFunctional.length
                ? `Prioridades: ${d.roadmap.topFunctional.slice(0, 2).join(", ")}`
                : "Completa la evaluación para verla"
            }
            cta={d.roadmap ? "Ver Hoja de Ruta" : undefined}
            to={d.roadmap ? "/app/hoja-de-ruta" : undefined}
          />

          <SummaryCard
            icon={FileText}
            eyebrow="Plan Interactivo"
            title={planTitle(planStatus)}
            description={
              d.plan.generatedAt
                ? `Generado ${formatDate(d.plan.generatedAt)}`
                : "Se genera tras el pago"
            }
            cta={planCta(planStatus)}
            to={
              planStatus === "ready"
                ? "/app/mi-plan"
                : planStatus === "locked" || planStatus === null
                  ? "/app/plan-interactivo"
                  : undefined
            }
            search={
              planStatus === "locked" || planStatus === null
                ? { patient: p!.id }
                : undefined
            }
            tone={planStatus === "ready" ? "primary" : "default"}
            disabled={planStatus === "paid_pending" || planStatus === "generating"}
          />

          {planStatus === "ready" ? (
            <SummaryCard
              icon={Bot}
              eyebrow="Moholka"
              title={
                d.moholka.lastMessageAt
                  ? "Continuar conversación"
                  : "Habla con Moholka"
              }
              description={
                d.moholka.snippet
                  ? `"${d.moholka.snippet}"`
                  : "Tu asistente para las primeras 4 semanas"
              }
              cta="Abrir chat"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("moholka:open"))
              }
            />
          ) : null}

          {d.manualAvailable ? (
            <SummaryCard
              icon={BookOpen}
              eyebrow="Manual Oficial"
              title="Manual de Ejercicios NEUROPLAN"
              description={
                planStatus === "ready"
                  ? "PDF con todos los ejercicios"
                  : "Disponible tras desbloquear el Plan"
              }
              cta={planStatus === "ready" ? "Ver Manual Oficial" : undefined}
              onClick={planStatus === "ready" ? openManual : undefined}
              disabled={planStatus !== "ready" || openingManual}
            />
          ) : null}

          <SummaryCard
            icon={TrendingUp}
            eyebrow="Seguimiento"
            title={
              d.plan.weekNumber
                ? `Semana ${d.plan.weekNumber} en curso`
                : "Aún sin seguimiento"
            }
            description={
              d.plan.weekNumber
                ? "Revisa tu avance semanal"
                : "Se activa con tu Plan Interactivo"
            }
            cta="Ver seguimiento"
            to="/app/seguimiento"
          />
        </section>
      ) : null}
    </div>
  );
}

function planTitle(s: string | null): string {
  switch (s) {
    case "ready":
      return "Plan listo";
    case "generating":
    case "paid_pending":
      return "Preparando tu Plan…";
    case "error":
      return "Error en generación";
    default:
      return "Aún no desbloqueado";
  }
}
function planCta(s: string | null): string | undefined {
  switch (s) {
    case "ready":
      return "Abrir Plan";
    case "locked":
    case null:
      return "Desbloquear Plan";
    default:
      return undefined;
  }
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PlanBadge({ status }: { status: string | null }) {
  const cfg =
    status === "ready"
      ? { label: "Plan activo", cls: "bg-primary/10 text-primary" }
      : status === "generating" || status === "paid_pending"
        ? { label: "Generando…", cls: "bg-amber-100 text-amber-800" }
        : status === "error"
          ? { label: "Error", cls: "bg-destructive/10 text-destructive" }
          : { label: "Sin desbloquear", cls: "bg-muted text-muted-foreground" };
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}