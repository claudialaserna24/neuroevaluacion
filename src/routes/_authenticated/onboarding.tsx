import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import {
  getOnboardingState,
  startEvaluationFromOnboarding,
} from "@/lib/onboarding.functions";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Bienvenida — NEUROPLAN" },
      { name: "description", content: "Prepara tu evaluación en NEUROPLAN." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ patient: z.string().uuid().optional() }).parse(s),
  component: Onboarding,
});

function Onboarding() {
  const { patient } = Route.useSearch();
  const navigate = useNavigate();
  const fetchState = useServerFn(getOnboardingState);
  const start = useServerFn(startEvaluationFromOnboarding);
  const [patientId, setPatientId] = useState<string | null>(patient ?? null);
  const [ready, setReady] = useState(!!patient);
  const [starting, setStarting] = useState(false);

  // Safeguard: if the user landed here without ?patient=..., or the state is
  // inconsistent, resolve it against the server and redirect if needed.
  useEffect(() => {
    if (patient) return;
    fetchState().then((s) => {
      if (!s.hasConsent) {
        navigate({ to: "/consentimiento", replace: true });
        return;
      }
      if (!s.activePatientId) {
        navigate({ to: "/app/pacientes", search: { first: "1" }, replace: true });
        return;
      }
      if (s.onboardingCompleted) {
        navigate({ to: "/app", replace: true });
        return;
      }
      setPatientId(s.activePatientId);
      setReady(true);
    });
  }, [patient, fetchState, navigate]);

  if (!ready || !patientId) {
    return (
      <div className="min-h-screen bg-background py-16 text-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto flex max-w-md flex-col items-center gap-8 pt-8 text-center">
        <Logo />
        <div className="rounded-3xl bg-card p-8 shadow-sm ring-1 ring-border/60">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-primary">
            Todo listo
          </span>
          <h1 className="mt-5 font-serif text-3xl leading-tight tracking-tight text-foreground">
            Bienvenido/a a NEUROPLAN.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            La Evaluación Inteligente está compuesta por tres módulos: Perfil
            Cognitivo, Evaluación Funcional y Patrones Asociados a Reflejos
            Primitivos.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Puedes detener la evaluación cuando lo desees; el sistema guardará
            automáticamente tu progreso. Al finalizar recibirás una Hoja de
            Ruta para el Neurodesarrollo.
          </p>
          <button
            type="button"
            disabled={starting}
            onClick={async () => {
              setStarting(true);
              try {
                await start({ data: { patientId } });
                navigate({
                  to: "/app/evaluacion",
                  search: { patient: patientId },
                });
              } catch (err) {
                toast.error(
                  err instanceof Error
                    ? err.message
                    : "No se pudo iniciar la evaluación.",
                );
                setStarting(false);
              }
            }}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {starting ? "Iniciando…" : "Comenzar evaluación"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          NEUROPLAN acompaña, no reemplaza el criterio clínico profesional.
        </p>
      </div>
    </div>
  );
}