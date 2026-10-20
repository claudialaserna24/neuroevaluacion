import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getConsentStatus, revokeMyData } from "@/lib/consent.functions";
import { HABEAS_DATA_VERSION } from "@/lib/legal/habeas-data";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/perfil")({
  head: () => pageMeta("Mi cuenta"),
  component: PerfilPage,
});

function PerfilPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [consent, setConsent] = useState<{ policy_version: string; accepted_at: string } | null>(null);
  const fetchConsent = useServerFn(getConsentStatus);
  const revoke = useServerFn(revokeMyData);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
    fetchConsent().then((r) => setConsent(r as typeof consent));
  }, [fetchConsent]);

  async function handleRevoke() {
    if (!confirm("¿Retirar tu autorización? Se eliminarán tus respuestas y tu Hoja de Ruta. Esta acción no se puede deshacer.")) return;
    try {
      await revoke();
      await supabase.auth.signOut();
      toast.success("Autorización retirada. Se cerró tu sesión.");
      navigate({ to: "/", replace: true });
    } catch {
      toast.error("No se pudo retirar la autorización. Intenta de nuevo.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-2xl text-foreground">Mi Perfil</h1>

      <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/50">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Cuenta</p>
        <p className="mt-1 text-sm font-medium text-foreground">{email}</p>
      </section>

      <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/50">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Autorización HABEAS DATA
        </p>
        {consent ? (
          <p className="mt-1 text-sm text-foreground">
            Aceptada el{" "}
            {new Date(consent.accepted_at).toLocaleDateString("es-CO", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            (versión {consent.policy_version}).
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Aún no has aceptado la política. Versión actual: {HABEAS_DATA_VERSION}.
          </p>
        )}

        <button
          onClick={handleRevoke}
          className="mt-4 rounded-full border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/10"
        >
          Retirar mi autorización
        </button>
      </section>

      <p className="px-2 text-xs text-muted-foreground">
        Derechos ARCO-S conforme a la Ley 1581/2012 de Colombia. Ejerce tus derechos desde esta pantalla o escribiendo al correo de contacto.
      </p>
    </div>
  );
}