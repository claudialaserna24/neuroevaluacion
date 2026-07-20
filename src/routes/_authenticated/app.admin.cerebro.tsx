import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Upload, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import {
  getKnowledgeStats,
  importKnowledgeCsv,
} from "@/lib/cerebro/knowledge.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/admin/cerebro")({
  head: () => ({
    meta: [
      { title: "CEREBRO — Base de conocimiento" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) throw redirect({ to: "/auth" });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: uid,
      _role: "administrador",
    });
    if (!isAdmin) throw redirect({ to: "/app" });
  },
  component: CerebroAdminPage,
});

type CsvRow = {
  modulo?: string;
  subcategoria?: string;
  nivel_severidad?: string;
  condicion_conductual?: string;
  plan_accion_texto?: string;
};

const REQUIRED = ["modulo", "plan_accion_texto"] as const;
const KNOWN = [
  "modulo",
  "subcategoria",
  "nivel_severidad",
  "condicion_conductual",
  "plan_accion_texto",
] as const;

function CerebroAdminPage() {
  const statsFn = useServerFn(getKnowledgeStats);
  const importFn = useServerFn(importKnowledgeCsv);
  const stats = useQuery({
    queryKey: ["cerebro-stats"],
    queryFn: () => statsFn(),
  });

  const [rows, setRows] = useState<CsvRow[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [version, setVersion] = useState("v1");
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [busy, setBusy] = useState(false);

  const unknownCols = headers.filter(
    (h) => !KNOWN.includes(h as (typeof KNOWN)[number]),
  );
  const missingRequired = REQUIRED.filter((c) => !headers.includes(c));
  const canImport =
    rows !== null && missingRequired.length === 0 && !busy;

  const onFile = (file: File) => {
    setFileName(file.name);
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setHeaders(result.meta.fields ?? []);
        setRows(result.data);
      },
      error: (err) => toast.error(`No se pudo leer el CSV: ${err.message}`),
    });
  };

  const onImport = async () => {
    if (!rows) return;
    setBusy(true);
    try {
      const payload = rows
        .filter((r) => r.modulo && r.plan_accion_texto)
        .map((r) => ({
          module: r.modulo!,
          subcategory: r.subcategoria ?? null,
          severity_level: r.nivel_severidad ?? null,
          behavioral_condition: r.condicion_conductual ?? null,
          intervention_text: r.plan_accion_texto!,
        }));
      const res = await importFn({ data: { rows: payload, version, mode } });
      toast.success(
        `Importación completa · ${res.inserted} insertadas · ${res.skipped} duplicadas`,
      );
      setRows(null);
      setHeaders([]);
      setFileName("");
      stats.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          CEREBRO
        </p>
        <h1 className="mt-1 font-serif text-2xl">Base de conocimiento clínico</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Importa el CSV con reglas de intervención. Cada fila del archivo se
          convierte en una regla independiente que la Skill del Plan Interactivo
          consultará según el perfil del paciente.
        </p>
      </header>

      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <h2 className="text-sm font-semibold">Reglas activas</h2>
        {stats.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            <p className="text-sm">
              Total: <span className="font-semibold">{stats.data?.total ?? 0}</span>
            </p>
            <ul className="mt-2 divide-y divide-border/60 rounded-2xl bg-muted/40">
              {(stats.data?.byModule ?? []).map((m) => (
                <li
                  key={m.module}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span className="text-foreground/80">{m.module}</span>
                  <span className="font-semibold tabular-nums">{m.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <h2 className="text-sm font-semibold">Importar CSV</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Columnas esperadas: modulo, subcategoria, nivel_severidad,
          condicion_conductual, plan_accion_texto.
        </p>

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-8 text-center transition hover:bg-muted/50">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm font-medium">
            {fileName || "Selecciona un archivo .csv"}
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>

        {rows && (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-muted/40 p-4 text-sm">
              <p className="font-medium">
                {rows.length} filas detectadas · columnas: {headers.join(", ")}
              </p>
              {missingRequired.length > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Falta la columna requerida: {missingRequired.join(", ")}
                </p>
              )}
              {unknownCols.length > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Columnas no reconocidas (se ignorarán): {unknownCols.join(", ")}
                </p>
              )}
              {missingRequired.length === 0 && unknownCols.length === 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Mapeo correcto
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  Versión
                </span>
                <input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  Modo
                </span>
                <select
                  value={mode}
                  onChange={(e) =>
                    setMode(e.target.value as "append" | "replace")
                  }
                  className="rounded-xl border border-border bg-background px-3 py-2"
                >
                  <option value="append">Append (omitir duplicadas)</option>
                  <option value="replace">Reemplazar versión</option>
                </select>
              </label>
            </div>

            <details className="rounded-2xl bg-muted/30 p-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                Vista previa de primeras 3 filas
              </summary>
              <pre className="mt-2 overflow-x-auto text-[11px] leading-snug">
                {JSON.stringify(rows.slice(0, 3), null, 2)}
              </pre>
            </details>

            <button
              onClick={onImport}
              disabled={!canImport}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Importar {rows.length} filas
            </button>
          </div>
        )}
      </section>
    </div>
  );
}