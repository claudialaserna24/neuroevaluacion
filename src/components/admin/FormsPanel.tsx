import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, ArrowLeft, ArrowRight } from "lucide-react";
import { getAdminForms } from "@/lib/admin/forms.functions";
import { FORM_LABELS, csvCell } from "@/lib/form-progress";
import { Button } from "@/components/ui/button";

type UserRecord = Awaited<ReturnType<typeof getAdminForms>>[number];
function exportCsv(users: UserRecord[]) {
  const rows: unknown[][] = [["Nombre", "Correo", "Fecha de registro", "Niño/a", "Nacimiento", "Diagnóstico", "Intervenciones", "Antecedentes", "Acudiente", "Correo acudiente", "Teléfono", "Ciudad", "Evaluación", "Fecha evaluación", "Formulario", "Dimensión", "Pregunta", "Descripción", "Respuesta"]];
  for (const u of users) {
    if (!u.children.length) rows.push([u.name, u.email, u.createdAt]);
    for (const c of u.children) {
      const p = c.patient;
      const base = [u.name, u.email, u.createdAt, `${p.first_name} ${p.last_name}`, p.date_of_birth, p.diagnosis, p.interventions, p.developmental_history, p.parent_name, p.parent_email, p.parent_phone, p.city];
      if (!c.histories.length) rows.push(base);
      for (const a of c.histories) for (const m of a.modules) for (const r of m.responses) rows.push([...base, a.id, a.createdAt, m.label, r.dimension, r.question, r.description, r.response]);
    }
  }
  const blob = new Blob(["\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "neuroplan-respuestas.csv"; a.click(); URL.revokeObjectURL(url);
}

export function FormsPanel({ userId }: { userId?: string }) {
  const fn = useServerFn(getAdminForms);
  const q = useQuery({ queryKey: ["admin-forms", userId], queryFn: () => fn({ data: { userId } }) });
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  if (q.isError) return <div role="alert"><p>No pudimos cargar los usuarios. Comprueba que tu cuenta sea administradora.</p><Button variant="outline" onClick={() => q.refetch()}>Reintentar</Button></div>;
  if (!q.data) return <p className="py-12 text-center text-muted-foreground">Cargando…</p>;
  const users = q.data;
  const shown = users.filter((u) => (filter === "all" || (filter === "complete" ? u.complete : !u.complete)) && `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase()));
  const current = userId ? users[0] : undefined;
  return <div className="space-y-6">
    {userId && <Button asChild variant="ghost"><Link to="/app/admin"><ArrowLeft />Usuarios</Link></Button>}
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-primary">Administración</p><h1 className="mt-1 font-serif text-3xl">{current ? current.name || current.email : "Usuarios registrados"}</h1>{current && <p className="mt-2 break-all text-sm text-muted-foreground">{current.email} · {new Date(current.createdAt).toLocaleDateString("es-CO")}</p>}</div><Button onClick={() => exportCsv(users)}><Download />{userId ? "Exportar respuestas CSV" : "Exportar todos CSV"}</Button></header>
    {!userId && <><div className="flex flex-wrap gap-3"><input aria-label="Buscar usuario" placeholder="Buscar nombre o correo" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" /><select aria-label="Filtrar por estado" value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="all">Todos</option><option value="complete">Completo</option><option value="incomplete">Incompleto</option></select></div>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border text-muted-foreground"><tr>{["Nombre", "Correo", "Registro", "Perfil cognitivo", "Evaluación funcional sensorial", "Reflejos primitivos", ""].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead><tbody>{shown.map((u) => <tr key={u.id} className="border-b border-border"><td className="p-3">{u.name || "—"}</td><td className="p-3">{u.email}</td><td className="p-3 whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString("es-CO")}</td>{u.forms.map((f) => <td key={f.module} className="p-3 whitespace-nowrap">{f.status}</td>)}<td className="p-3"><Button asChild variant="outline" size="sm"><Link to="/app/admin/usuarios/$userId" params={{ userId: u.id }}>Abrir<ArrowRight /></Link></Button></td></tr>)}</tbody></table>{shown.length === 0 && <p className="py-8 text-center text-muted-foreground">Sin usuarios para este filtro.</p>}</div></>}
    {current && <><section className="border-b border-border pb-6"><h2 className="font-serif text-xl">Datos iniciales de la familia</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Nombre</dt><dd>{current.name || "—"}</dd></div><div><dt className="text-sm text-muted-foreground">Nombre del niño/a registrado en el perfil</dt><dd>{current.profile?.child_name || "—"}</dd></div><div><dt className="text-sm text-muted-foreground">Nacimiento registrado en el perfil</dt><dd>{current.profile?.child_dob || "—"}</dd></div></dl></section>{!current.children.length && <p>Sin datos del niño o niña ni respuestas registradas.</p>}{current.children.map((c) => <section key={c.patient.id} className="space-y-6 border-b border-border pb-8"><h2 className="font-serif text-2xl">{c.patient.first_name} {c.patient.last_name}</h2><dl className="grid gap-4 sm:grid-cols-2">{Object.entries({ "Nacimiento": c.patient.date_of_birth, "Diagnóstico": c.patient.diagnosis, "Intervenciones": c.patient.interventions, "Antecedentes del desarrollo": c.patient.developmental_history, "Nombre del acudiente": c.patient.parent_name, "Correo del acudiente": c.patient.parent_email, "Teléfono": c.patient.parent_phone, "Ciudad": c.patient.city }).map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value || "—"}</dd></div>)}</dl>{!c.histories.length && <p>Sin respuestas registradas.</p>}{c.histories.map((a) => <div key={a.id} className="space-y-6"><p className="text-sm text-muted-foreground">Registro del {new Date(a.createdAt).toLocaleDateString("es-CO")}</p>{a.modules.map((m) => <section key={m.module}><h3 className="font-serif text-xl">{FORM_LABELS[m.module]}</h3><ol className="mt-4 divide-y divide-border">{m.responses.map((r, i) => <li key={r.id} className="py-4"><p className="font-medium">{i + 1}. {r.question}</p>{r.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{r.description}</p>}<p className="mt-2 text-sm text-primary">{r.response}</p></li>)}</ol></section>)}</div>)}</section>)}</>}
  </div>;
}