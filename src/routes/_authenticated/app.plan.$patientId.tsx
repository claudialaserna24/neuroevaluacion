import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  FileText,
  BookOpen,
  Bot,
  ArrowRight,
  Download,
  Loader2,
  Lock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  getInteractivePlan,
  getManualDownloadUrl,
  getPlanPdfDownloadUrl,
  startPlanGeneration,
} from "@/lib/plan/plan.functions";
import { MoholkaFloatingButton } from "@/components/plan/MoholkaFloatingButton";
import { MoholkaPanel } from "@/components/plan/MoholkaPanel";

export const Route = createFileRoute("/_authenticated/app/plan/$patientId")({
  head: () => ({
    meta: [
      { title: "Plan Interactivo NEUROPLAN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlanInteractivoDashboard,
});

function PlanInteractivoDashboard() {
  const { patientId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchPlan = useServerFn(getInteractivePlan);
  const fetchManual = useServerFn(getManualDownloadUrl);
  const fetchPdf = useServerFn(getPlanPdfDownloadUrl);
  const startGeneration = useServerFn(startPlanGeneration);

  const plan = useQuery({
    queryKey: ["interactive-plan", patientId],
    queryFn: () => fetchPlan({ data: { patientId } }),
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d || d.blocked) return false;
      const s = d.roadmap.plan_generation_status;
      // Polling activo mientras la generación esté en curso; se detiene
      // en estados terminales (ready o failed).
      if (s === "ready" || s === "failed") return false;
      return 5_000;
    },
  });

  const [moholkaOpen, setMoholkaOpen] = useState(false);
  const [downloading, setDownloading] = useState<"pdf" | "manual" | null>(null);
  const autoTriggeredRef = useRef(false);

  const triggerMutation = useMutation({
    mutationFn: (opts: { force?: boolean }) =>
      startGeneration({ data: { patientId, force: opts.force } }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["interactive-plan", patientId] });
    },
  });

  useEffect(() => {
    if (plan.data && plan.data.blocked) {
      // Redirige a la landing del producto para desbloquear.
      navigate({
        to: "/app/plan-interactivo",
        search: { patient: patientId },
        replace: true,
      });
    }
  }, [plan.data, navigate, patientId]);

  // Disparo automático: al cargar la pantalla, si el plan está pendiente,
  // failed, o llevaba demasiado tiempo en "generating", lanzamos la Skill.
  // Un useRef evita re-disparos ante re-renders o refetches del polling.
  useEffect(() => {
    if (autoTriggeredRef.current) return;
    if (!plan.data || plan.data.blocked) return;
    const rm = plan.data.roadmap;
    const s = rm.plan_generation_status;
    const stale =
      s === "generating" &&
      (!rm.plan_generation_status_updated_at ||
        Date.now() -
          new Date(rm.plan_generation_status_updated_at).getTime() >=
          3 * 60 * 1000);
    if (s === "pending" || s === "failed" || stale) {
      autoTriggeredRef.current = true;
      triggerMutation.mutate({ force: s === "failed" || stale });
    }
  }, [plan.data, triggerMutation]);

  if (plan.isLoading || !plan.data) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }
  if (plan.data.blocked) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Redirigiendo…
      </div>
    );
  }

  const { patient, roadmap, manual_available } = plan.data;
  const ready = roadmap.plan_generation_status === "ready";
  const failed = roadmap.plan_generation_status === "failed";
  const activatedAt = roadmap.plan_activated_at
    ? new Date(roadmap.plan_activated_at)
    : null;

  const downloadPdf = async () => {
    setDownloading("pdf");
    try {
      const res = await fetchPdf({ data: { patientId } });
      if (res.available) window.open(res.url, "_blank", "noopener");
    } finally {
      setDownloading(null);
    }
  };
  const downloadManual = async () => {
    setDownloading("manual");
    try {
      const res = await fetchManual({ data: { patientId } });
      if (res.available) window.open(res.url, "_blank", "noopener");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <article className="flex flex-col gap-6">
      {/* Encabezado */}
      <header className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 shadow-sm ring-1 ring-primary/20">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Plan Interactivo NEUROPLAN
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-foreground">
          {patient.first_name} {patient.last_name}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              ready
                ? "bg-primary/15 text-primary"
                : failed
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {ready
              ? "Plan Activo"
              : failed
              ? "Generación no completada"
              : "Preparando tu Plan"}
          </span>
          {activatedAt && (
            <span className="text-xs text-muted-foreground">
              Activado el{" "}
              {activatedAt.toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </header>

      {!ready && !failed && (
        <section className="rounded-3xl bg-card p-6 text-center shadow-sm ring-1 ring-border/50">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <h2 className="mt-4 font-serif text-2xl text-foreground">
            Estamos preparando tu Plan Interactivo NEUROPLAN
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Estamos organizando toda la información de la evaluación para construir un programa completamente personalizado para tu hijo. Este proceso se realizará automáticamente en el siguiente paso.
          </p>
        </section>
      )}

      {failed && (
        <section className="rounded-3xl bg-card p-6 text-center shadow-sm ring-1 ring-destructive/30">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <h2 className="mt-4 font-serif text-2xl text-foreground">
            No pudimos terminar de preparar tu plan.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Tu pago está seguro y puedes intentar nuevamente.
          </p>
          <button
            type="button"
            onClick={() => {
              autoTriggeredRef.current = true;
              triggerMutation.mutate({ force: true });
            }}
            disabled={triggerMutation.isPending}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${triggerMutation.isPending ? "animate-spin" : ""}`}
            />
            {triggerMutation.isPending ? "Reintentando…" : "Reintentar generación"}
          </button>
        </section>
      )}

      {/* Cuatro tarjetas */}
      <section className="grid gap-4 sm:grid-cols-2">
        {/* 1. Ver Plan Interactivo */}
        <Card
          icon={<Sparkles className="h-4 w-4" />}
          title="Ver Plan Interactivo"
          desc="Explora las secciones del Plan personalizado para tu hijo/a."
        >
          <Link
            to="/app/plan/$patientId/ver"
            params={{ patientId }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Abrir Plan <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>

        {/* 2. Descargar Plan en PDF */}
        <Card
          icon={<FileText className="h-4 w-4" />}
          title="Descargar Plan en PDF"
          desc="Descarga tu Plan Personalizado en formato PDF."
        >
          <button
            type="button"
            onClick={downloadPdf}
            disabled={!ready || !roadmap.plan_pdf_url || downloading === "pdf"}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {downloading === "pdf" ? "Preparando…" : "Descargar PDF"}
          </button>
          {(!ready || !roadmap.plan_pdf_url) && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Disponible al finalizar la generación.
            </p>
          )}
        </Card>

        {/* 3. Manual Oficial */}
        <Card
          icon={<BookOpen className="h-4 w-4" />}
          title="Manual Oficial de Ejercicios NEUROPLAN"
          desc="Este manual contiene la explicación visual paso a paso de todos los ejercicios mencionados en tu Plan Interactivo."
        >
          <button
            type="button"
            onClick={downloadManual}
            disabled={!manual_available || downloading === "manual"}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <BookOpen className="h-4 w-4" />
            {downloading === "manual" ? "Abriendo…" : "📘 Ver Manual Oficial de Ejercicios"}
          </button>
          {!manual_available && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Próximamente disponible.
            </p>
          )}
        </Card>

        {/* 4. Moholka */}
        <Card
          icon={<Bot className="h-4 w-4" />}
          title="Moholka"
          desc="Durante las primeras cuatro semanas podrás contar con el acompañamiento de Moholka para resolver dudas relacionadas con la aplicación del Plan Interactivo."
        >
          <button
            type="button"
            onClick={() => setMoholkaOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            {ready ? (
              <>
                <Bot className="h-4 w-4" /> Hablar con Moholka
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" /> Ver disponibilidad
              </>
            )}
          </button>
        </Card>
      </section>

      <p className="rounded-2xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">
        El Plan Interactivo es una herramienta educativa y orientadora. No reemplaza la valoración clínica de un profesional.
      </p>

      <MoholkaPanel
        open={moholkaOpen}
        onOpenChange={setMoholkaOpen}
        ready={ready}
        patientId={patientId}
      />
      <MoholkaFloatingButton ready={ready} patientId={patientId} />
    </article>
  );
}

function Card({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border/50">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <p className="font-serif text-lg text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}