import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  Loader2,
  CheckCircle2,
  BookOpen,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getManualStatus } from "@/lib/plan/plan.functions";
import { MANUAL_BUCKET, MANUAL_OBJECT_PATH } from "@/lib/plan/constants";

export const Route = createFileRoute("/_authenticated/app/admin/manual")({
  head: () => ({
    meta: [
      { title: "Manual Oficial — Administración" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) throw redirect({ to: "/auth" });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: uid,
      _role: "administrador",
    });
    if (!isAdmin) throw redirect({ to: "/app" });
  },
  component: ManualAdminPage,
});

function ManualAdminPage() {
  const statusFn = useServerFn(getManualStatus);
  const status = useQuery({
    queryKey: ["manual-status"],
    queryFn: () => statusFn(),
  });

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const onUpload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const { error } = await supabase.storage
        .from(MANUAL_BUCKET)
        .upload(MANUAL_OBJECT_PATH, file, {
          upsert: true,
          contentType: "application/pdf",
        });
      if (error) throw error;
      toast.success("Manual actualizado correctamente");
      setFile(null);
      status.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al subir el Manual");
    } finally {
      setBusy(false);
    }
  };

  const updated = status.data?.available
    ? status.data.updated_at
      ? new Date(status.data.updated_at).toLocaleString("es-CO", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null
    : null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/app"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Volver
      </Link>

      <header className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Administración
        </p>
        <h1 className="mt-1 font-serif text-2xl">
          Manual Oficial de Ejercicios NEUROPLAN
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sube o reemplaza el PDF único que las familias con Plan desbloqueado
          podrán descargar desde su Plan Interactivo. Al reemplazarlo, todas las
          descargas futuras usarán la nueva versión automáticamente.
        </p>
      </header>

      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BookOpen className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Estado actual</p>
            {status.isLoading ? (
              <p className="mt-1 text-sm text-muted-foreground">Consultando…</p>
            ) : status.data?.available ? (
              <div className="mt-1 space-y-1 text-sm">
                <p className="inline-flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Manual disponible
                </p>
                {updated && (
                  <p className="text-xs text-muted-foreground">
                    Última actualización: {updated}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Todavía no hay Manual cargado.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <h2 className="text-sm font-semibold">
          {status.data?.available ? "Reemplazar Manual" : "Subir Manual"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Formato requerido: PDF. El archivo se guarda con nombre único y
          reemplaza automáticamente al anterior.
        </p>

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-8 text-center transition hover:bg-muted/50">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm font-medium">
            {file ? file.name : "Selecciona un archivo .pdf"}
          </span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFile(f);
            }}
          />
        </label>

        <button
          onClick={onUpload}
          disabled={!file || busy}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {status.data?.available ? "Reemplazar Manual" : "Subir Manual"}
        </button>
      </section>
    </div>
  );
}
