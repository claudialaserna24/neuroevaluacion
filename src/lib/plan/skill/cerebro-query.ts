import type { SupabaseClient } from "@supabase/supabase-js";

export type KnowledgeDoc = {
  id: string;
  module: string;
  subcategory: string | null;
  severity_level: string | null;
  behavioral_condition: string | null;
  intervention_text: string;
  version: string;
};

export type QueryFilter = {
  module: string;
  subcategory?: string | null;
  severity_level?: string | null;
  behavioral_condition?: string | null;
};

export type QueryHit = {
  hits: KnowledgeDoc[];
  matchedLevel: "exact" | "no-condition" | "no-severity" | "module-subcategory" | "module" | "none";
};

const LIMIT_PER_QUERY = 6;

// Búsqueda incremental: nunca carga toda la base.
export async function queryCerebro(
  supabase: SupabaseClient,
  filter: QueryFilter,
): Promise<QueryHit> {
  const base = () =>
    supabase
      .from("knowledge_documents")
      .select(
        "id, module, subcategory, severity_level, behavioral_condition, intervention_text, version",
      )
      .eq("active", true)
      .eq("module", filter.module)
      .order("version", { ascending: false })
      .limit(LIMIT_PER_QUERY);

  // 1. Exacto
  if (filter.subcategory && filter.severity_level && filter.behavioral_condition) {
    const { data } = await base()
      .eq("subcategory", filter.subcategory)
      .eq("severity_level", filter.severity_level)
      .eq("behavioral_condition", filter.behavioral_condition);
    if (data && data.length) return { hits: data, matchedLevel: "exact" };
  }

  // 2. Sin behavioral_condition
  if (filter.subcategory && filter.severity_level) {
    const { data } = await base()
      .eq("subcategory", filter.subcategory)
      .eq("severity_level", filter.severity_level);
    if (data && data.length) return { hits: data, matchedLevel: "no-condition" };
  }

  // 3. Sin severidad
  if (filter.subcategory) {
    const { data } = await base().eq("subcategory", filter.subcategory);
    if (data && data.length) return { hits: data, matchedLevel: "module-subcategory" };
  }

  // 4. Solo módulo
  const { data } = await base();
  if (data && data.length) return { hits: data, matchedLevel: "module" };

  return { hits: [], matchedLevel: "none" };
}

// Formatea los hits para incrustar en el prompt sin dispararse en tokens.
export function formatCerebroForPrompt(label: string, hit: QueryHit): string {
  if (!hit.hits.length) {
    return `# ${label}\n(sin material en CEREBRO)`;
  }
  const lines = hit.hits.map(
    (d) =>
      `- [id: ${d.id}] (${d.subcategory ?? "-"} · ${d.severity_level ?? "-"} · ${d.behavioral_condition ?? "-"}) ${d.intervention_text}`,
  );
  return `# ${label} (match: ${hit.matchedLevel})\n${lines.join("\n")}`;
}
