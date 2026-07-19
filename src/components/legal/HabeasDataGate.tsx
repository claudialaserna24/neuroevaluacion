import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getConsentStatus, acceptHabeasData } from "@/lib/consent.functions";
import { HABEAS_DATA_VERSION, HABEAS_DATA_SECTIONS } from "@/lib/legal/habeas-data";
import { toast } from "sonner";

/**
 * Bloquea el contenido hasta que el usuario acepte la política HABEAS DATA
 * en la versión vigente. Ley 1581/2012 (Colombia).
 */
export function HabeasDataGate({ children }: { children: React.ReactNode }) {
  const fetchConsent = useServerFn(getConsentStatus);
  const accept = useServerFn(acceptHabeasData);
  const [status, setStatus] = useState<"loading" | "needs" | "ok">("loading");
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchConsent().then((c) => {
      if (c && c.policy_version === HABEAS_DATA_VERSION) setStatus("ok");
      else setStatus("needs");
    });
  }, [fetchConsent]);

  if (status === "loading") {
    return <div className="py-16 text-center text-sm text-muted-foreground">Cargando…</div>;
  }
  if (status === "ok") return <>{children}</>;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="habeas-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center"
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-background shadow-xl ring-1 ring-border sm:rounded-3xl">
        <div className="border-b border-border/70 px-6 pb-4 pt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Antes de continuar
          </p>
          <h2 id="habeas-title" className="mt-1 font-serif text-xl leading-tight text-foreground">
            Política de Tratamiento de Datos Personales
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Ley 1581 de 2012 — Colombia · Versión {HABEAS_DATA_VERSION}
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-foreground">
          {HABEAS_DATA_SECTIONS.map((s) => (
            <section key={s.heading}>
              <h3 className="text-sm font-semibold text-foreground">{s.heading}</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">{s.body}</p>
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
              Como padre / madre / acudiente, autorizo expresamente el tratamiento de los
              datos sensibles del menor descritos en esta política, con las finalidades
              indicadas.
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
                setStatus("ok");
              } catch {
                toast.error("No se pudo registrar tu autorización. Intenta de nuevo.");
              } finally {
                setSubmitting(false);
              }
            }}
            className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Registrando…" : "Aceptar y continuar"}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Puedes retirar tu autorización en cualquier momento desde Mi Perfil.
          </p>
        </div>
      </div>
    </div>
  );
}