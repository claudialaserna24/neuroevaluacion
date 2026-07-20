import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, User, ClipboardList, Compass, FileText } from "lucide-react";
import { getFamilyDashboard } from "@/lib/dashboard.functions";
import { computeAgeYears } from "@/lib/patients.functions";

export const Route = createFileRoute("/_authenticated/app/ficha")({
  head: () => ({
    meta: [
      { title: "Ficha Integral — NEUROPLAN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FichaIntegral,
});

function FichaIntegral() {
  const fetchDashboard = useServerFn(getFamilyDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["family-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  if (isLoading || !data) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando…</p>;
  }
  const p = data.patient;
  if (!p) {
    return (
      <div className="rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-border/50">
        <p className="text-sm text-muted-foreground">
          Aún no has registrado a tu hijo(a).
        </p>
        <Link
          to="/app/pacientes"
          search={{ first: "1" }}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <User className="h-4 w-4" /> Registrar paciente
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Ficha Integral
        </p>
        <h1 className="mt-1 font-serif text-2xl leading-tight text-foreground">
          {p.first_name} {p.last_name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {computeAgeYears(p.date_of_birth)} años · Nacimiento{" "}
          {new Date(p.date_of_birth).toLocaleDateString("es-CO")}
          {p.city ? ` · ${p.city}` : ""}
        </p>
      </header>

      <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/50">
        <h2 className="font-serif text-lg text-foreground">Datos clínicos</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Info label="Diagnóstico" value={p.diagnosis} />
          <Info
            label="Última evaluación"
            value={
              data.assessments.lastCompletedAt
                ? new Date(data.assessments.lastCompletedAt).toLocaleDateString("es-CO")
                : null
            }
          />
          <Info
            label="Estado de la evaluación"
            value={
              data.assessments.status === "completed"
                ? "Completada"
                : data.assessments.status === "in_progress"
                  ? "En progreso"
                  : "Sin iniciar"
            }
          />
          <Info
            label="Estado del Plan"
            value={
              data.plan.status === "ready"
                ? "Activo"
                : data.plan.status === "generating" ||
                    data.plan.status === "paid_pending"
                  ? "Preparando"
                  : "No desbloqueado"
            }
          />
        </dl>
      </section>

      <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/50">
        <h2 className="font-serif text-lg text-foreground">Acudiente</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Info label="Nombre" value={p.parent_name} />
          <Info label="Correo" value={p.parent_email} />
          <Info label="Teléfono" value={p.parent_phone} />
          <Info label="Ciudad" value={p.city} />
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          to="/app/evaluaciones"
          className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/50 hover:ring-primary/40"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ClipboardList className="h-4 w-4 text-primary" /> Evaluaciones
          </span>
          <ArrowRight className="h-4 w-4 text-primary" />
        </Link>
        <Link
          to="/app/hoja-de-ruta"
          className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/50 hover:ring-primary/40"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Compass className="h-4 w-4 text-primary" /> Hoja de Ruta
          </span>
          <ArrowRight className="h-4 w-4 text-primary" />
        </Link>
        <Link
          to="/app/mi-plan"
          className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/50 hover:ring-primary/40"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FileText className="h-4 w-4 text-primary" /> Plan Interactivo
          </span>
          <ArrowRight className="h-4 w-4 text-primary" />
        </Link>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-foreground">
        {value && value.trim() ? value : <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}