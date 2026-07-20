import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAdminAssessments } from "@/lib/admin/overview.functions";

export const Route = createFileRoute("/_authenticated/app/admin/evaluaciones")({
  component: AdminAssessmentsPage,
});

function AdminAssessmentsPage() {
  const fn = useServerFn(listAdminAssessments);
  const q = useQuery({
    queryKey: ["admin-assessments"],
    queryFn: () => fn(),
  });

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-serif text-2xl">Evaluaciones</h1>
        <p className="text-sm text-muted-foreground">
          Historial de evaluaciones realizadas por las familias.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/50">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">% completado</th>
              <th className="px-4 py-3 text-right">Duración</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Cargando…</td></tr>
            ) : (q.data ?? []).length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Sin evaluaciones aún.</td></tr>
            ) : (
              (q.data ?? []).map((a) => (
                <tr key={a.id} className="border-t border-border/50">
                  <td className="px-4 py-3">{a.patientName}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{a.percentage}%</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {a.durationMin} min
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/app/admin/pacientes/$patientId"
                      params={{ patientId: a.patientId }}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Ver ficha
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

function StatusPill({ status }: { status: string }) {
  const cfg =
    status === "completed"
      ? { label: "Finalizada", cls: "bg-primary/10 text-primary" }
      : status === "in_progress"
        ? { label: "En progreso", cls: "bg-amber-100 text-amber-800" }
        : { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}