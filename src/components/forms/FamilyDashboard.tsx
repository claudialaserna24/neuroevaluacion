import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { ClipboardList, ArrowRight, CheckCircle2 } from "lucide-react";
import { getFamilyForms } from "@/lib/forms.functions";
import { FORM_LABELS, allFormsCompleted } from "@/lib/form-progress";
import { Button } from "@/components/ui/button";
import { Completion } from "./Completion";

export function FamilyDashboard() {
  const fn = useServerFn(getFamilyForms);
  const q = useQuery({ queryKey: ["family-forms"], queryFn: () => fn(), staleTime: 0 });
  const navigate = useNavigate();
  useEffect(() => {
    if (q.data && !q.data.hasConsent) void navigate({ to: "/consentimiento", replace: true });
  }, [q.data, navigate]);
  if (q.isError) return <div role="alert"><p>No pudimos cargar tus formularios.</p><Button variant="outline" onClick={() => q.refetch()}>Reintentar</Button></div>;
  if (!q.data || !q.data.hasConsent) return <p className="py-12 text-center text-muted-foreground">Cargando…</p>;
  if (q.data.children.length > 0 && q.data.children.every((c) => allFormsCompleted(c.forms))) return <Completion />;
  return <div className="space-y-8">
    <header><p className="text-sm text-primary">NEUROPLAN</p><h1 className="mt-2 font-serif text-3xl">Tus formularios</h1></header>
    {!q.data.children.length ? <section><h2 className="mb-5 font-serif text-xl">Cuéntanos sobre tu hijo o hija</h2><Button asChild><Link to="/app/pacientes" search={{ first: "1" }}>Completar datos iniciales <ArrowRight /></Link></Button></section> : q.data.children.map(({ patient, forms }) => <section key={patient.id} className="space-y-4">
      <h2 className="font-serif text-xl">{patient.first_name} {patient.last_name}</h2>
      <div className="grid gap-4 sm:grid-cols-3">{forms.map((f) => <div key={f.module} className="flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-5">
        {f.status === "Completado" ? <CheckCircle2 className="h-6 w-6 text-primary" /> : <ClipboardList className="h-6 w-6 text-primary" />}
        <h3 className="font-medium">{FORM_LABELS[f.module]}</h3><p className="text-sm text-muted-foreground">{f.status}</p>
        {f.status !== "Completado" && <Button asChild className="mt-auto"><Link to="/app/evaluacion" search={{ patient: patient.id, module: f.module }}>{f.status === "Sin iniciar" ? "Comenzar" : "Continuar"}<ArrowRight /></Link></Button>}
      </div>)}</div>
    </section>)}
  </div>;
}