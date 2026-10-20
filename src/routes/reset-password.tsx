import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/reset-password")({ head: () => pageMeta("Recuperar contraseña"), component: ResetPassword });
function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    const recovery = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") { sessionStorage.setItem("neuroplan-recovery", "true"); setReady(true); } });
    if (recovery) sessionStorage.setItem("neuroplan-recovery", "true");
    if (recovery || sessionStorage.getItem("neuroplan-recovery") === "true") {
      void supabase.auth.getUser().then(({ data }) => setReady(Boolean(data.user)));
    }
    return () => data.subscription.unsubscribe();
  }, []);
  return <main className="mx-auto max-w-md px-5 py-12"><Logo /><h1 className="mt-8 font-serif text-3xl">Nueva contraseña</h1>{done ? <><p className="my-5">Tu contraseña se actualizó.</p><Button asChild><Link to="/app">Continuar</Link></Button></> : ready ? <form className="mt-6 space-y-4" onSubmit={async (e) => {
    e.preventDefault();
    if (password !== confirmation) { setMessage("Las contraseñas no coinciden."); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) setMessage("No pudimos actualizar la contraseña. Solicita un nuevo enlace e intenta nuevamente.");
    else { sessionStorage.removeItem("neuroplan-recovery"); setDone(true); }
  }}><label className="block text-sm">Nueva contraseña<input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 block w-full rounded-lg border border-input bg-background p-3" /></label><label className="block text-sm">Confirmar contraseña<input type="password" required minLength={6} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-2 block w-full rounded-lg border border-input bg-background p-3" /></label><Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar contraseña"}</Button></form> : <p className="my-5 text-sm text-muted-foreground">Abre el enlace de recuperación enviado a tu correo para establecer una nueva contraseña.</p>}{message && <p role="alert" className="mt-4 text-sm text-destructive">{message}</p>}{!done && <Button asChild variant="link" className="mt-5"><Link to="/auth" search={{}}>Volver a ingresar</Link></Button>}</main>;
}