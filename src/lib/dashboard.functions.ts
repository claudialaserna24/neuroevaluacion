import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MANUAL_BUCKET, MANUAL_OBJECT_PATH } from "./plan/constants";

export type FamilyDashboard = {
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    diagnosis: string | null;
    parent_name: string | null;
    parent_email: string | null;
    parent_phone: string | null;
    city: string | null;
  } | null;
  assessments: {
    count: number;
    lastCompletedAt: string | null;
    activeId: string | null;
    status: "none" | "in_progress" | "completed";
  };
  roadmap: {
    id: string;
    generatedAt: string | null;
    cognitiveLevel: string | null;
    topFunctional: string[];
    topReflexes: string[];
  } | null;
  plan: {
    status: "locked" | "paid_pending" | "generating" | "ready" | "error" | null;
    generatedAt: string | null;
    activatedAt: string | null;
    weekNumber: number | null;
    totalWeeks: number | null;
  };
  moholka: {
    lastMessageAt: string | null;
    snippet: string | null;
  };
  manualAvailable: boolean;
  consent: { version: string | null; acceptedAt: string | null };
};

export const getFamilyDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FamilyDashboard> => {
    const { supabase, userId, claims } = context;

    const [
      { data: profile },
      { data: patients },
      { data: consent },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("patients")
        .select(
          "id, first_name, last_name, date_of_birth, diagnosis, parent_name, parent_email, parent_phone, city",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("user_consents")
        .select("policy_version, accepted_at")
        .eq("user_id", userId)
        .eq("policy_kind", "habeas_data")
        .order("accepted_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const patient = patients?.[0] ?? null;

    let assessments: FamilyDashboard["assessments"] = {
      count: 0,
      lastCompletedAt: null,
      activeId: null,
      status: "none",
    };
    let roadmap: FamilyDashboard["roadmap"] = null;
    let plan: FamilyDashboard["plan"] = {
      status: null,
      generatedAt: null,
      activatedAt: null,
      weekNumber: null,
      totalWeeks: null,
    };
    let moholka: FamilyDashboard["moholka"] = {
      lastMessageAt: null,
      snippet: null,
    };

    if (patient) {
      const [aRes, rRes, convRes] = await Promise.all([
        supabase
          .from("assessments")
          .select("id, status, completed_at")
          .eq("patient_id", patient.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("neurodevelopment_roadmaps")
          .select(
            "id, generated_at, cognitive, priorities, plan_status, plan_generation_status, plan_generated_at, plan_activated_at, plan_content, unlocked_at",
          )
          .eq("patient_id", patient.id)
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("moholka_conversations")
          .select("id, updated_at")
          .eq("patient_id", patient.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const list = aRes.data ?? [];
      const completed = list.filter((a) => a.status === "completed");
      const active = list.find((a) => a.status === "in_progress") ?? null;
      assessments = {
        count: list.length,
        lastCompletedAt: completed[0]?.completed_at ?? null,
        activeId: active?.id ?? null,
        status:
          completed.length > 0
            ? "completed"
            : active
              ? "in_progress"
              : "none",
      };

      if (rRes.data) {
        const cognitive = (rRes.data.cognitive ?? null) as {
          level?: string;
        } | null;
        const priorities = (rRes.data.priorities ?? null) as {
          functionalPriorities?: string[];
          reflexPriorities?: string[];
        } | null;
        roadmap = {
          id: rRes.data.id,
          generatedAt: rRes.data.generated_at,
          cognitiveLevel: cognitive?.level ?? null,
          topFunctional: (priorities?.functionalPriorities ?? []).slice(0, 3),
          topReflexes: (priorities?.reflexPriorities ?? []).slice(0, 3),
        };

        const status = rRes.data.plan_status as string | null;
        const gen = rRes.data.plan_generation_status as string | null;
        const activatedAt =
          rRes.data.plan_activated_at ?? rRes.data.unlocked_at ?? null;
        const content = rRes.data.plan_content as {
          rutina?: { semanas?: unknown[] };
        } | null;
        const totalWeeks = content?.rutina?.semanas?.length ?? null;
        let weekNumber: number | null = null;
        if (activatedAt && totalWeeks) {
          const diffDays = Math.floor(
            (Date.now() - new Date(activatedAt).getTime()) / 86400000,
          );
          weekNumber = Math.min(totalWeeks, Math.max(1, Math.floor(diffDays / 7) + 1));
        }

        let planStatus: FamilyDashboard["plan"]["status"] = "locked";
        if (status === "unlocked") {
          if (gen === "ready" || content) planStatus = "ready";
          else if (gen === "error") planStatus = "error";
          else planStatus = "generating";
        } else if (status === "paid" || status === "processing") {
          planStatus = "paid_pending";
        }
        plan = {
          status: planStatus,
          generatedAt: rRes.data.plan_generated_at,
          activatedAt,
          weekNumber,
          totalWeeks,
        };
      }

      if (convRes.data) {
        const { data: lastMsg } = await supabase
          .from("moholka_messages")
          .select("content, created_at, role")
          .eq("conversation_id", convRes.data.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastMsg) {
          moholka = {
            lastMessageAt: lastMsg.created_at,
            snippet:
              typeof lastMsg.content === "string"
                ? lastMsg.content.slice(0, 140)
                : null,
          };
        }
      }
    }

    // Manual availability (public flag — no signed URL yet)
    let manualAvailable = false;
    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const { data: list } = await supabaseAdmin.storage
        .from(MANUAL_BUCKET)
        .list("", { search: MANUAL_OBJECT_PATH, limit: 1 });
      manualAvailable = !!list?.some((o) => o.name === MANUAL_OBJECT_PATH);
    } catch {
      manualAvailable = false;
    }

    const email =
      (claims as { email?: string } | undefined)?.email ?? null;

    return {
      profile: {
        id: userId,
        full_name: profile?.full_name ?? null,
        email,
      },
      patient,
      assessments,
      roadmap,
      plan,
      moholka,
      manualAvailable,
      consent: {
        version: consent?.policy_version ?? null,
        acceptedAt: consent?.accepted_at ?? null,
      },
    };
  });