import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const rowSchema = z.object({
  module: z.string().min(1),
  subcategory: z.string().nullable().optional(),
  severity_level: z.string().nullable().optional(),
  behavioral_condition: z.string().nullable().optional(),
  intervention_text: z.string().min(1),
});

const importSchema = z.object({
  rows: z.array(rowSchema).min(1).max(5000),
  version: z.string().min(1).max(32).default("v1"),
  mode: z.enum(["append", "replace"]).default("append"),
});

async function assertAdmin(context: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
}) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "administrador",
  });
  if (error) throw error;
  if (!data) throw new Error("Forbidden: se requiere rol administrador");
}

export const getKnowledgeStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("knowledge_documents")
      .select("module")
      .eq("active", true);
    if (error) throw error;
    const counts = new Map<string, number>();
    for (const r of data ?? []) {
      counts.set(r.module, (counts.get(r.module) ?? 0) + 1);
    }
    return {
      total: data?.length ?? 0,
      byModule: Array.from(counts.entries())
        .map(([module, count]) => ({ module, count }))
        .sort((a, b) => b.count - a.count),
    };
  });

export const importKnowledgeCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => importSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    if (data.mode === "replace") {
      const { error: deErr } = await context.supabase
        .from("knowledge_documents")
        .update({ active: false })
        .eq("active", true)
        .eq("version", data.version);
      if (deErr) throw deErr;
    }

    const payload = data.rows.map((r) => ({
      module: r.module.trim(),
      subcategory: r.subcategory?.trim() || null,
      severity_level: r.severity_level?.trim() || null,
      behavioral_condition: r.behavioral_condition?.trim() || null,
      intervention_text: r.intervention_text,
      active: true,
      version: data.version,
    }));

    // Insert in chunks to keep payloads reasonable.
    const chunkSize = 200;
    let inserted = 0;
    for (let i = 0; i < payload.length; i += chunkSize) {
      const chunk = payload.slice(i, i + chunkSize);
      const { data: rows, error } = await context.supabase
        .from("knowledge_documents")
        .upsert(chunk, {
          onConflict:
            "module,subcategory,severity_level,behavioral_condition",
          ignoreDuplicates: true,
        })
        .select("id");
      if (error) throw error;
      inserted += rows?.length ?? 0;
    }

    return {
      requested: data.rows.length,
      inserted,
      skipped: data.rows.length - inserted,
      mode: data.mode,
      version: data.version,
    };
  });