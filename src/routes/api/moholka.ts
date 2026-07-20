import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import {
  buildMoholkaContext,
  detectManualMention,
} from "@/lib/plan/moholka-context.server";

type ChatBody = {
  patientId?: string;
  message?: string;
};

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/moholka")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        if (!auth.startsWith("Bearer ")) return jsonError(401, "No auth");
        const token = auth.slice("Bearer ".length).trim();
        if (!token) return jsonError(401, "No token");

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !LOVABLE_API_KEY) {
          return jsonError(500, "Missing environment");
        }

        const isNewKey =
          SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_") ||
          SUPABASE_PUBLISHABLE_KEY.startsWith("sb_secret_");
        const supabase = createClient<Database>(
          SUPABASE_URL,
          SUPABASE_PUBLISHABLE_KEY,
          {
            global: {
              fetch: (input, init) => {
                const h = new Headers(init?.headers);
                if (
                  isNewKey &&
                  h.get("Authorization") === `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
                ) {
                  h.delete("Authorization");
                }
                h.set("apikey", SUPABASE_PUBLISHABLE_KEY);
                return fetch(input, { ...init, headers: h });
              },
              headers: { Authorization: `Bearer ${token}` },
            },
            auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
          },
        );

        const { data: claims, error: claimsError } =
          await supabase.auth.getClaims(token);
        if (claimsError || !claims?.claims?.sub) return jsonError(401, "Invalid token");
        const userId = claims.claims.sub as string;

        let body: ChatBody;
        try {
          body = (await request.json()) as ChatBody;
        } catch {
          return jsonError(400, "Invalid JSON");
        }
        const patientId = body.patientId?.trim();
        const message = body.message?.trim();
        if (!patientId || !message) return jsonError(400, "Missing patientId or message");

        // Ownership + unlocked
        const { data: patient } = await supabase
          .from("patients")
          .select("id")
          .eq("id", patientId)
          .eq("user_id", userId)
          .maybeSingle();
        if (!patient) return jsonError(403, "Paciente no encontrado");

        const { data: roadmap } = await supabase
          .from("neurodevelopment_roadmaps")
          .select("id, plan_status")
          .eq("patient_id", patientId)
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!roadmap || roadmap.plan_status !== "unlocked") {
          return jsonError(403, "Plan no desbloqueado");
        }

        // Ensure conversation
        let conversationId: string;
        {
          const { data: existing } = await supabase
            .from("moholka_conversations")
            .select("id")
            .eq("patient_id", patientId)
            .maybeSingle();
          if (existing?.id) {
            conversationId = existing.id as string;
          } else {
            const { data: created, error } = await supabase
              .from("moholka_conversations")
              .insert({
                user_id: userId,
                patient_id: patientId,
                roadmap_id: roadmap.id,
              })
              .select("id")
              .single();
            if (error || !created) return jsonError(500, "No se pudo iniciar la conversación");
            conversationId = created.id as string;
          }
        }

        // Historial reciente (últimos 8)
        const { data: recent } = await supabase
          .from("moholka_messages")
          .select("role, content, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .limit(8);
        const history = (recent ?? [])
          .reverse()
          .map((r) => ({
            role: r.role as "user" | "assistant",
            content: r.content as string,
          }));

        // Guardar mensaje del usuario
        await supabase.from("moholka_messages").insert({
          conversation_id: conversationId,
          role: "user",
          content: message,
        });

        // Contexto acotado (usa admin para leer plan/roadmap sin fricción)
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const ctx = await buildMoholkaContext({
          supabaseAdmin,
          patientId,
          userMessage: message,
        });

        const gateway = createLovableAiGatewayProvider(LOVABLE_API_KEY);
        const model = gateway("openai/gpt-5.5");

        const result = streamText({
          model,
          system: ctx.systemPrompt,
          messages: [
            ...history,
            { role: "user", content: message },
          ],
          onFinish: async ({ text }) => {
            try {
              const showManual = detectManualMention(text, ctx.cardNames);
              await supabase.from("moholka_messages").insert({
                conversation_id: conversationId,
                role: "assistant",
                content: text + (showManual ? "\n\n<!--manual-->" : ""),
              });
            } catch (e) {
              console.error("[moholka] persist assistant failed", e);
            }
          },
        });

        return result.toTextStreamResponse();
      },
    },
  },
});