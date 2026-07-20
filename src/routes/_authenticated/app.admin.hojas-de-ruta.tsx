import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAdminRoadmaps } from "@/lib/admin/overview.functions";

export const Route = createFileRoute("/_authenticated/app/admin/hojas-de-ruta")({
  component: AdminRoadmapsPage,
});

function AdminRoadmapsPage() {
  const fn = useServerFn(listAdminRoadmaps);
  const q = useQuery({ queryKey: ["admin-roadmaps"], queryFn: () => fn() });

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-serif text-2xl">Hojas de Ruta</h1>
        <p className="text-sm text-muted-foreground">
          Informes generados tras la evaluación.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/50">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Estado del Plan</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">Cargando…</td></tr>
            ) : (q.data ?? []).length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">Sin hojas de ruta generadas.</td></tr>
            ) : (
              (q.data ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="px-4 py-3">{r.patientName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.planStatus === "unlocked" ? "Desbloqueado" : "Bloqueado"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(r.generatedAt).toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/app/admin/pacientes/$patientId"
                      params={{ patientId: r.patientId }}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Ver Hoja de Ruta
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}