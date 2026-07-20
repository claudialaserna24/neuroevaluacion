import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { listAdminPatients } from "@/lib/admin/overview.functions";
import { computeAgeYears } from "@/lib/patients.functions";

export const Route = createFileRoute("/_authenticated/app/admin/pacientes")({
  component: AdminPatientsPage,
});

function AdminPatientsPage() {
  const fn = useServerFn(listAdminPatients);
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["admin-patients", search],
    queryFn: () => fn({ data: { search: search || undefined } }),
  });

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-serif text-2xl">Pacientes</h1>
        <p className="text-sm text-muted-foreground">
          Listado completo. Abre la Ficha Integral para ver toda la información.
        </p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o acudiente…"
          className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-4 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/50">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Edad</th>
              <th className="px-4 py-3">Acudiente</th>
              <th className="px-4 py-3">Última evaluación</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Cargando…
                </td>
              </tr>
            ) : (q.data ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Sin resultados.
                </td>
              </tr>
            ) : (
              (q.data ?? []).map((p) => (
                <tr key={p.id} className="border-t border-border/50">
                  <td className="px-4 py-3">
                    {p.firstName} {p.lastName}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {computeAgeYears(p.dob)} años
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.parentName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.lastAssessmentAt
                      ? new Date(p.lastAssessmentAt).toLocaleDateString("es-CO")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <PlanPill status={p.planStatus} gen={p.planGeneration} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/app/admin/pacientes/$patientId"
                      params={{ patientId: p.id }}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/15"
                    >
                      Ficha Integral
                      <ArrowRight className="h-3 w-3" />
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

function PlanPill({
  status,
  gen,
}: {
  status: string | null;
  gen: string | null;
}) {
  if (status === "unlocked" && gen === "ready")
    return <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">Plan listo</span>;
  if (status === "unlocked")
    return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Generando</span>;
  return <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Sin plan</span>;
}