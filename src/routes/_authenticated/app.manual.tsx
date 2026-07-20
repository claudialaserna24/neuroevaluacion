import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getFamilyDashboard } from "@/lib/dashboard.functions";
import { getManualDownloadUrl } from "@/lib/plan/plan.functions";

export const Route = createFileRoute("/_authenticated/app/manual")({
  head: () => ({
    meta: [
      { title: "Manual Oficial — NEUROPLAN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ManualPage,
});

function ManualPage() {
  const fetchDashboard = useServerFn(getFamilyDashboard);
  const fetchUrl = useServerFn(getManualDownloadUrl);
  const [loading, setLoading] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["family-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  if (isLoading || !data) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando…</p>;
  }

  const canOpen = data.plan.status === "ready" && !!data.patient;

  async function open() {
    if (!data?.patient) return;
    try {
      setLoading(true);
      const res = await fetchUrl({ data: { patientId: data.patient.id } });
      if (!res.available) throw new Error("Manual no disponible");
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo abrir el manual");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Manual Oficial
        </p>
        <h1 className="mt-1 font-serif text-2xl leading-tight text-foreground">
          Manual Oficial de Ejercicios
        </h1>
      </header>

      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Documento con la ejecución detallada de cada ejercicio del Plan
              Interactivo NEUROPLAN.
            </p>
            {!canOpen ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Disponible únicamente para familias con el Plan Interactivo
                desbloqueado.
              </p>
            ) : null}
          </div>
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
        <button
          type="button"
          onClick={open}
          disabled={!canOpen || loading}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          <BookOpen className="h-4 w-4" />
          {loading ? "Abriendo…" : "📘 Ver Manual Oficial"}
        </button>
      </section>
    </div>
  );
}