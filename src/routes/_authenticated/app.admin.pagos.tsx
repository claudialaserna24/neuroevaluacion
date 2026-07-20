import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAdminPayments } from "@/lib/admin/overview.functions";

export const Route = createFileRoute("/_authenticated/app/admin/pagos")({
  component: AdminPaymentsPage,
});

function AdminPaymentsPage() {
  const fn = useServerFn(listAdminPayments);
  const q = useQuery({ queryKey: ["admin-payments"], queryFn: () => fn() });

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-serif text-2xl">Pagos</h1>
        <p className="text-sm text-muted-foreground">
          Transacciones registradas a través de Wompi. Solo lectura.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/50">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3">Referencia</th>
              <th className="px-4 py-3">Transacción</th>
              <th className="px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Cargando…</td></tr>
            ) : (q.data ?? []).length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Sin pagos registrados.</td></tr>
            ) : (
              (q.data ?? []).map((p) => (
                <tr key={p.id} className="border-t border-border/50">
                  <td className="px-4 py-3">{p.patientName}</td>
                  <td className="px-4 py-3">
                    <PayPill status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {new Intl.NumberFormat("es-CO").format(p.amount)} {p.currency}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.reference ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.transactionId ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.paidAt
                      ? new Date(p.paidAt).toLocaleString("es-CO")
                      : new Date(p.createdAt).toLocaleString("es-CO")}
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

function PayPill({ status }: { status: string }) {
  const cfg =
    status === "paid"
      ? { label: "Pagado", cls: "bg-primary/10 text-primary" }
      : status === "pending"
        ? { label: "Pendiente", cls: "bg-amber-100 text-amber-800" }
        : status === "failed" || status === "rejected"
          ? { label: status, cls: "bg-destructive/10 text-destructive" }
          : { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}