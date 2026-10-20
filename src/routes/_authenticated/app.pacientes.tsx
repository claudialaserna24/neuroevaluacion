import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  listMyPatients,
  createPatient,
  computeAgeYears,
} from "@/lib/patients.functions";

export const Route = createFileRoute("/_authenticated/app/pacientes")({
  head: () => pageMeta("Datos iniciales"),
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ first: z.literal("1").optional() }).parse(s),
  component: PacientesPage,
});

function PacientesPage() {
  const { first } = Route.useSearch();
  const fetchPatients = useServerFn(listMyPatients);
  const patients = useQuery({
    queryKey: ["my-patients"],
    queryFn: () => fetchPatients(),
  });
  const [showForm, setShowForm] = useState(first === "1");

  const list = patients.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        {first === "1" ? (
          <>
            <h1 className="font-serif text-2xl leading-tight text-foreground">
              Cuéntanos sobre tu hijo...
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Para comenzar la evaluación necesitamos conocer algunos datos
              básicos de tu hijo. Esta información quedará guardada junto a tus formularios.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              Pacientes
            </p>
            <h1 className="mt-1 font-serif text-2xl leading-tight text-foreground">
              Mis pacientes
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Cada niño o niña tiene sus propios formularios.
            </p>
            {!showForm && (
              <Button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Añadir paciente
              </Button>
            )}
          </>
        )}
      </header>

      {showForm && (
        <NewPatientForm
          onDone={() => setShowForm(false)}
          onboarding={first === "1"}
        />
      )}

      {list.length === 0 && !showForm ? (
        <div className="rounded-2xl bg-muted/40 p-5 text-center text-sm text-muted-foreground">
          Aún no has registrado a ningún paciente.
        </div>
      ) : (
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
                    {p.city ? ` · ${p.city}` : ""}
                    {p.diagnosis ? ` · ${p.diagnosis}` : ""}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewPatientForm({
  onDone,
  onboarding,
}: {
  onDone: () => void;
  onboarding?: boolean;
}) {
  const navigate = useNavigate();
  const create = useServerFn(createPatient);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      first_name: String(fd.get("first_name") ?? "").trim(),
      last_name: String(fd.get("last_name") ?? "").trim(),
      date_of_birth: String(fd.get("date_of_birth") ?? ""),
      diagnosis: (String(fd.get("diagnosis") ?? "") || null) as string | null,
      interventions: (String(fd.get("interventions") ?? "") || null) as
        | string
        | null,
      developmental_history: (String(fd.get("developmental_history") ?? "") ||
        null) as string | null,
      parent_name: (String(fd.get("parent_name") ?? "") || null) as string | null,
      parent_email: (String(fd.get("parent_email") ?? "") || null) as
        | string
        | null,
      parent_phone: (String(fd.get("parent_phone") ?? "") || null) as
        | string
        | null,
      city: (String(fd.get("city") ?? "") || null) as string | null,
    };

    if (!payload.first_name || !payload.last_name || !payload.date_of_birth) {
      toast.error("Nombres, apellidos y fecha de nacimiento son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      const row = await create({ data: payload });
      await queryClient.invalidateQueries({ queryKey: ["family-forms"] });
      await queryClient.invalidateQueries({ queryKey: ["my-patients"] });
      toast.success("Paciente registrado");
      onDone();
      if (row?.id) {
        if (onboarding) {
          navigate({ to: "/app" });
        } else {
          navigate({ to: "/app" });
        }
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo registrar el paciente",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50"
    >
      <h2 className="font-serif text-lg text-foreground">
        Información de tu hijo (a)
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nombres *" name="first_name" required />
        <Field label="Apellidos *" name="last_name" required />
        <Field
          label="Fecha de nacimiento *"
          name="date_of_birth"
          type="date"
          required
        />
        <Field label="Ciudad" name="city" />
      </div>

      <TextArea
        label="Diagnóstico (si lo tiene)"
        name="diagnosis"
        placeholder="Ej. TEA nivel 1, TDAH, retraso del lenguaje…"
      />
      <TextArea
        label="Intervenciones realizadas"
        name="interventions"
        placeholder="Terapias y protocolos recibidos"
      />
      <TextArea
        label="Antecedentes importantes en el desarrollo"
        name="developmental_history"
        placeholder="Embarazo, parto, hitos, antecedentes familiares…"
      />

      <div className="mt-1 border-t border-border/60 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Datos del acudiente
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nombre del padre / acudiente" name="parent_name" />
          <Field label="Correo electrónico" name="parent_email" type="email" />
          <Field label="Teléfono" name="parent_phone" type="tel" />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          onClick={onDone}
          className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Continuando…" : "Continuar con la evaluación"}
          {!saving && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <textarea
        name={name}
        placeholder={placeholder}
        rows={3}
        className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}