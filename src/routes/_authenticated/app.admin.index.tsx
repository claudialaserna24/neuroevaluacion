import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  Baby,
  ClipboardList,
  Compass,
  FileText,
  Unlock,
  Bot,
  CreditCard,
  Wallet,
  Activity,
} from "lucide-react";
import { getAdminOverview } from "@/lib/admin/overview.functions";

export const Route = createFileRoute("/_authenticated/app/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const fn = useServerFn(getAdminOverview);
  const q = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fn(),
  });

  if (q.isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-3xl bg-card ring-1 ring-border/50"
          />
        ))}
      </div>
    );
  }
  if (q.isError) {
    return (
      <div className="rounded-3xl bg-card p-6 text-sm ring-1 ring-border/50">
        <p className="text-destructive">
          No pudimos cargar el resumen del panel.
        </p>
        <button
          onClick={() => q.refetch()}
          className="mt-3 inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          Reintentar
        </button>
      </div>
    );
  }
  if (!q.data) return null;
  const d = q.data;
  const revenue = Object.entries(d.revenueByCurrency)
    .map(([c, v]) => `${new Intl.NumberFormat("es-CO").format(Math.round(v))} ${c}`)
    .join(" · ") || "—";

  const cards = [
    { icon: Users, label: "Familias registradas", value: d.families },
    { icon: Baby, label: "Pacientes registrados", value: d.patients },
    {
      icon: ClipboardList,
      label: "Evaluaciones",
      value: d.assessments.total,
      sub: `${d.assessments.completed} finalizadas`,
    },
    { icon: Compass, label: "Hojas de Ruta", value: d.plansGenerated },
    { icon: FileText, label: "Planes generados", value: d.plansGenerated },
    { icon: Unlock, label: "Planes desbloqueados", value: d.plansUnlocked },
    { icon: Bot, label: "Conversaciones Moholka", value: d.moholkaConversations },
    { icon: CreditCard, label: "Pagos aprobados", value: d.paymentsApproved },
    { icon: Wallet, label: "Recaudo total", value: revenue, isString: true },
    {
      icon: Activity,
      label: "Usuarios activos (30d)",
      value: d.activeUsers30d ?? "—",
      isString: d.activeUsers30d === null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          CRM NEUROPLAN
        </p>
        <h1 className="mt-1 font-serif text-3xl leading-tight">Panel del administrador</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Vista general del estado clínico, operativo y financiero de la plataforma.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="flex flex-col gap-2 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border/50"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <c.icon className="h-4 w-4" />
            </span>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {c.label}
            </p>
            <p className="font-serif text-3xl leading-none tabular-nums text-foreground">
              {c.isString ? c.value : new Intl.NumberFormat("es-CO").format(Number(c.value))}
            </p>
            {"sub" in c && c.sub ? (
              <p className="text-xs text-muted-foreground">{c.sub}</p>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  );
}