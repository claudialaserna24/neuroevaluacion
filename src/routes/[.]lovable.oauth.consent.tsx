import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/logo";

// Beta `auth.oauth` namespace: keep a small local type surface so TS accepts
// the three helper calls without grepping node_modules.
type OAuthDetails = {
  client?: { name?: string; redirect_uri?: string } | null;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult = { data: OAuthDetails | null; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails(id: string): Promise<OAuthResult>;
  approveAuthorization(id: string): Promise<OAuthResult>;
  denyAuthorization(id: string): Promise<OAuthResult>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Browser-only: Supabase session lives in localStorage.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Falta authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: ConsentPage,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-6 text-sm text-foreground">
      <h1 className="font-serif text-xl">No pudimos cargar esta solicitud</h1>
      <p className="mt-2 text-muted-foreground">
        {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function ConsentPage() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const res = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (res.error) {
      setBusy(false);
      setError(res.error.message);
      return;
    }
    const target = res.data?.redirect_url ?? res.data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("La autorización no devolvió una URL de retorno.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "una aplicación externa";

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto flex max-w-md flex-col gap-6 rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/60">
        <Logo />
        <div>
          <h1 className="font-serif text-2xl leading-tight text-foreground">
            Conectar {clientName} a NEUROPLAN
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {clientName} podrá usar NEUROPLAN actuando como tú para consultar el
            estado de tu evaluación, tu Hoja de Ruta y tu perfil.
          </p>
        </div>

        <div className="rounded-2xl bg-background p-4 text-sm ring-1 ring-border/60">
          <p className="font-medium text-foreground">Se otorgará acceso a:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Tu perfil básico (nombre y datos del niño si los registraste).</li>
            <li>Estado y progreso de tu Evaluación Inteligente.</li>
            <li>Tu Hoja de Ruta / Informe Inicial cuando esté generado.</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Esto no elimina las políticas de privacidad ni las reglas de acceso de
            NEUROPLAN. Puedes revocar el acceso desde tu perfil en cualquier momento.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(true)}
            className="rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Procesando…" : "Aprobar conexión"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(false)}
            className="rounded-full border border-border bg-background py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </div>
    </main>
  );
}