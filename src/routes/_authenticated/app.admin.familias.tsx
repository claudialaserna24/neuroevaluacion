import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search } from "lucide-react";
import { listAdminFamilies } from "@/lib/admin/overview.functions";

export const Route = createFileRoute("/_authenticated/app/admin/familias")({
  component: FamiliesPage,
});

function FamiliesPage() {
  const fn = useServerFn(listAdminFamilies);
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["admin-families", search],
    queryFn: () => fn({ data: { search: search || undefined } }),
  });

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-serif text-2xl">Familias</h1>
        <p className="text-sm text-muted-foreground">
          Acudientes registrados en NEUROPLAN.
        </p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre…"
          className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-4 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/50">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Acudiente</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Ciudad</th>
              <th className="px-4 py-3 text-right">Pacientes</th>
              <th className="px-4 py-3">Suscripción</th>
              <th className="px-4 py-3">Último acceso</th>
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
              (q.data ?? []).map((f) => (
                <tr key={f.id} className="border-t border-border/50">
                  <td className="px-4 py-3">{f.fullName ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{f.email ?? "—"}</td>
                  <td className="px-4 py-3">{f.city ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{f.patientCount}</td>
                  <td className="px-4 py-3">
                    <SubscriptionBadge status={f.subscription} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {f.lastSignInAt
                      ? new Date(f.lastSignInAt).toLocaleString("es-CO")
                      : "—"}
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

function SubscriptionBadge({ status }: { status: string }) {
  const cfg =
    status === "unlocked"
      ? { label: "Plan activo", cls: "bg-primary/10 text-primary" }
      : status === "processing"
        ? { label: "En proceso", cls: "bg-amber-100 text-amber-800" }
        : { label: "Sin plan", cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}