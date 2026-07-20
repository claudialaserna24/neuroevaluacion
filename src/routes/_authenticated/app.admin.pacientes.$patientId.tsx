import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminPatientFicha } from "@/lib/admin/overview.functions";
import { computeAgeYears } from "@/lib/patients.functions";

export const Route = createFileRoute(
  "/_authenticated/app/admin/pacientes/$patientId",
)({
  component: AdminPatientFicha,
});

function AdminPatientFicha() {
  const { patientId } = Route.useParams();
  const fn = useServerFn(getAdminPatientFicha);
  const q = useQuery({
    queryKey: ["admin-ficha", patientId],
    queryFn: () => fn({ data: { patientId } }),
  });

  if (q.isLoading)
    return <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>;
  if (!q.data)
    return <p className="py-10 text-center text-sm text-muted-foreground">Paciente no encontrado.</p>;
  const { patient, assessments, roadmaps, conversations, payments } = q.data;
  const p = patient as {
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    diagnosis: string | null;
    interventions: string | null;
    developmental_history: string | null;
    parent_name: string | null;
    parent_email: string | null;
    parent_phone: string | null;
    city: string | null;
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Ficha Integral
        </p>
        <h1 className="mt-1 font-serif text-2xl">
          {p.first_name} {p.last_name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {computeAgeYears(p.date_of_birth)} años · Nacimiento{" "}
          {new Date(p.date_of_birth).toLocaleDateString("es-CO")}
          {p.city ? ` · ${p.city}` : ""}
        </p>
      </header>

      <Section title="Datos del niño(a)">
        <Grid>
          <Info label="Diagnóstico" value={p.diagnosis} />
          <Info label="Intervenciones" value={p.interventions} />
          <Info
            label="Antecedentes del desarrollo"
            value={p.developmental_history}
            full
          />
        </Grid>
      </Section>

      <Section title="Acudiente">
        <Grid>
          <Info label="Nombre" value={p.parent_name} />
          <Info label="Correo" value={p.parent_email} />
          <Info label="Teléfono" value={p.parent_phone} />
          <Info label="Ciudad" value={p.city} />
        </Grid>
      </Section>

      <Section title={`Evaluaciones (${assessments.length})`}>
        {assessments.length === 0 ? (
          <Empty />
        ) : (
          <ul className="divide-y divide-border/50">
            {assessments.map((a) => (
              <li key={a.id} className="flex justify-between py-2 text-sm">
                <span>{a.status === "completed" ? "Finalizada" : "En progreso"}</span>
                <span className="text-muted-foreground">
                  {new Date(a.completed_at ?? a.created_at).toLocaleDateString("es-CO")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Hojas de Ruta / Planes (${roadmaps.length})`}>
        {roadmaps.length === 0 ? (
          <Empty />
        ) : (
          <ul className="divide-y divide-border/50">
            {roadmaps.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <span className="font-medium">
                    {r.plan_status === "unlocked" ? "Plan desbloqueado" : "Plan bloqueado"}
                  </span>
                  {r.plan_generation_status ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      generación: {r.plan_generation_status}
                    </span>
                  ) : null}
                </div>
                <span className="text-muted-foreground">
                  {new Date(r.generated_at).toLocaleDateString("es-CO")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Conversaciones Moholka (${conversations.length})`}>
        {conversations.length === 0 ? (
          <Empty />
        ) : (
          <ul className="divide-y divide-border/50">
            {conversations.map((c) => (
              <li key={c.id} className="flex justify-between py-2 text-sm">
                <span>{c.messageCount} mensajes</span>
                <span className="text-muted-foreground">
                  Actualizada {new Date(c.updatedAt).toLocaleDateString("es-CO")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Historial de pagos (${payments.length})`}>
        {payments.length === 0 ? (
          <Empty />
        ) : (
          <ul className="divide-y divide-border/50">
            {payments.map((pay) => (
              <li key={pay.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <span className="font-medium">
                    {new Intl.NumberFormat("es-CO").format(Number(pay.amount))} {pay.currency}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {pay.status}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {new Date(pay.paid_at ?? pay.created_at).toLocaleString("es-CO")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/50">
      <h2 className="font-serif text-lg">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">{children}</dl>;
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
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground">
        {value && value.trim() ? value : <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}
function Empty() {
  return <p className="text-sm text-muted-foreground">Sin registros.</p>;
}