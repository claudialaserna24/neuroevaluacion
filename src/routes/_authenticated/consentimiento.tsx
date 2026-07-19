import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import {
  acceptHabeasData,
  getConsentStatus,
} from "@/lib/consent.functions";
import {
  HABEAS_DATA_VERSION,
  HABEAS_DATA_SECTIONS,
} from "@/lib/legal/habeas-data";

export const Route = createFileRoute("/_authenticated/consentimiento")({
  head: () => ({
    meta: [
      { title: "Consentimiento informado — NEUROPLAN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConsentimientoPage,
});

function ConsentimientoPage() {
  const navigate = useNavigate();
  const fetchConsent = useServerFn(getConsentStatus);
  const accept = useServerFn(acceptHabeasData);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetchConsent().then((c) => {
      if (c && c.policy_version === HABEAS_DATA_VERSION) {
        navigate({ to: "/app", replace: true });
      } else {
        setReady(true);
      }
    });
  }, [fetchConsent, navigate]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-muted/30 py-16 text-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <div className="mx-auto">
          <Logo />
        </div>
        <div className="flex flex-col rounded-3xl bg-background shadow-sm ring-1 ring-border">
          <div className="border-b border-border/70 px-6 pb-4 pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              Antes de continuar
            </p>
            <h1 className="mt-1 font-serif text-xl leading-tight text-foreground">
              Política de Tratamiento de Datos Personales
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Ley 1581 de 2012 — Colombia · Versión {HABEAS_DATA_VERSION}
            </p>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-foreground">
            {HABEAS_DATA_SECTIONS.map((s) => (
              <section key={s.heading}>
                <h2 className="text-sm font-semibold text-foreground">
                  {s.heading}
                </h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {s.body}
                </p>
              </section>
            ))}
          </div>
          <div className="border-t border-border/70 bg-muted/40 px-6 py-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <span className="text-foreground">
                Como padre / madre / acudiente, autorizo expresamente el
                tratamiento de los datos sensibles del menor descritos en esta
                política, con las finalidades indicadas.
              </span>
            </label>
            <button
              disabled={!checked || submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  await accept({
                    data: {
                      version: HABEAS_DATA_VERSION,
                      userAgent: navigator.userAgent,
                    },
                  });
                  navigate({ to: "/app", replace: true });
                } catch {
                  toast.error(
                    "No se pudo registrar tu autorización. Intenta de nuevo.",
                  );
                } finally {
                  setSubmitting(false);
                }
              }}
              className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Registrando…" : "Aceptar y continuar"}
            </button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Puedes retirar tu autorización en cualquier momento desde Mi
              Perfil.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}