import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, UserPlus, Users } from "lucide-react";
import { listMyPatients, computeAgeYears } from "@/lib/patients.functions";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Inicio — NEUROPLAN" }, { name: "robots", content: "noindex" }] }),
  component: DashboardHome,
});

function DashboardHome() {
  const fetchPatients = useServerFn(listMyPatients);
  const patients = useQuery({ queryKey: ["my-patients"], queryFn: () => fetchPatients() });

  const list = patients.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Tu proceso</p>
        <h1 className="mt-1 font-serif text-2xl leading-tight text-foreground">
          {list.length === 0 ? "Registra a tu hijo/a" : "Selecciona un paciente"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {list.length === 0
            ? "Antes de iniciar la evaluación, registra los datos de tu hijo/a. Podrás añadir más de uno si es necesario."
            : "Cada paciente tiene su propia evaluación y Hoja de Ruta para el Neurodesarrollo."}
        </p>

        <Link
          to="/app/pacientes"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {list.length === 0 ? (
            <>
              <UserPlus className="h-4 w-4" />
              Registrar paciente
            </>
          ) : (
            <>
              <Users className="h-4 w-4" />
              Ver mis pacientes
            </>
          )}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {list.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {list.map((p) => (
            <li key={p.id}>
              <Link
                to="/app/pacientes/$patientId"
                params={{ patientId: p.id }}
                className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/50 hover:ring-primary/40"
              >
                <div>
                  <p className="font-serif text-lg text-foreground">
                    {p.first_name} {p.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {computeAgeYears(p.date_of_birth)} años
                    {p.diagnosis ? ` · ${p.diagnosis}` : ""}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}