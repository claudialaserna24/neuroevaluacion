import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, FileText, Sparkles, Bot } from "lucide-react";
import { getPatient, computeAgeYears } from "@/lib/patients.functions";
import { getRoadmap } from "@/lib/assessment.functions";

export const Route = createFileRoute("/_authenticated/app/pacientes/$patientId")({
  head: () => ({
    meta: [{ title: "Paciente — NEUROPLAN" }, { name: "robots", content: "noindex" }],
  }),
  component: PatientDetail,
});

function PatientDetail() {
  const { patientId } = Route.useParams();
  const fetchPatient = useServerFn(getPatient);
  const fetchRoadmap = useServerFn(getRoadmap);

  const patient = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => fetchPatient({ data: { patientId } }),
  });
  const roadmap = useQuery({
    queryKey: ["roadmap", patientId],
    queryFn: () => fetchRoadmap({ data: { patientId } }),
  });

  if (patient.isLoading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando…</p>;
  }
  const p = patient.data;
  if (!p) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Paciente no encontrado.
      </p>
    );
  }

  const hasRoadmap = !!roadmap.data;
  const planUnlocked =
    (roadmap.data as { plan_status?: string } | null)?.plan_status === "unlocked";

  return (
    <div className="flex flex-col gap-5">
      <header className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Paciente
        </p>
        <h1 className="mt-1 font-serif text-2xl leading-tight text-foreground">
          {p.first_name} {p.last_name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {computeAgeYears(p.date_of_birth)} años · Nacimiento{" "}
          {new Date(p.date_of_birth).toLocaleDateString()}
          {p.city ? ` · ${p.city}` : ""}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          to="/app/evaluacion"
          search={{ patient: p.id }}
          className="flex items-center justify-between rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm hover:opacity-95"
        >
          <div>
            <p className="text-xs uppercase tracking-wide opacity-80">Evaluación</p>
            <p className="font-serif text-lg">Iniciar / continuar</p>
          </div>
          <ArrowRight className="h-5 w-5" />
        </Link>

        <Link
          to="/app/informe"
          search={{ patient: p.id }}
          className="flex items-center justify-between rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/50 hover:ring-primary/40"
        >
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Hoja de Ruta
            </p>
            <p className="font-serif text-lg text-foreground">
              {hasRoadmap ? "Ver Hoja de Ruta" : "Aún no disponible"}
            </p>
          </div>
          {hasRoadmap ? (
            <Sparkles className="h-5 w-5 text-primary" />
          ) : (
            <FileText className="h-5 w-5 text-muted-foreground" />
          )}
        </Link>
      </section>

      {planUnlocked && (
        <Link
          to="/app/plan/$patientId"
          params={{ patientId: p.id }}
          className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5 shadow-sm ring-1 ring-primary/30 hover:ring-primary/50"
        >
          <div>
            <p className="text-xs uppercase tracking-wide text-primary">
              Plan Interactivo NEUROPLAN
            </p>
            <p className="font-serif text-lg text-foreground">
              Abrir Plan Interactivo
            </p>
          </div>
          <Bot className="h-5 w-5 text-primary" />
        </Link>
      )}

      <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/50">
        <h2 className="font-serif text-lg text-foreground">Datos clínicos</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Info label="Diagnóstico" value={p.diagnosis} />
          <Info label="Intervenciones" value={p.interventions} />
          <Info
            label="Antecedentes del desarrollo"
            value={p.developmental_history}
            full
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
    </div>
  );
}

function Info({
  label,
  value,
  full,
}: {
  label: string;
  value: string | null | undefined;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-foreground">
        {value && value.trim() ? value : <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}