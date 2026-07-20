import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (data ?? []).map((r) => r.role as string);
    return {
      isAdmin: roles.includes("administrador"),
      isNeuropsicologo: roles.includes("neuropsicologo"),
      roles,
    };
  });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const s = context.supabase;
    const count = (q: { count: number | null }) => q.count ?? 0;

    const [
      families,
      patients,
      assessmentsTotal,
      assessmentsCompleted,
      roadmaps,
      roadmapsUnlocked,
      moholkaConvs,
      paymentsApproved,
      totalRevenue,
    ] = await Promise.all([
      s.from("profiles").select("*", { count: "exact", head: true }),
      s.from("patients").select("*", { count: "exact", head: true }),
      s.from("assessments").select("*", { count: "exact", head: true }),
      s
        .from("assessments")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed"),
      s.from("neurodevelopment_roadmaps").select("*", { count: "exact", head: true }),
      s
        .from("neurodevelopment_roadmaps")
        .select("*", { count: "exact", head: true })
        .eq("plan_status", "unlocked"),
      s.from("moholka_conversations").select("*", { count: "exact", head: true }),
      s
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved"),
      s
        .from("payments")
        .select("amount, currency, status")
        .eq("status", "approved"),
    ]);

    const revenueByCurrency: Record<string, number> = {};
    for (const p of totalRevenue.data ?? []) {
      const c = (p.currency as string) ?? "USD";
      revenueByCurrency[c] =
        (revenueByCurrency[c] ?? 0) + Number(p.amount ?? 0);
    }

    // Active users: sign-ins in last 30 days (needs admin API)
    let activeUsers30d = 0;
    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const now = Date.now();
      const cutoff = now - 30 * 86400000;
      let page = 1;
      const perPage = 200;
      // Iterate up to a reasonable cap to avoid runaway loops.
      for (let i = 0; i < 20; i++) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        });
        if (error) break;
        const users = data?.users ?? [];
        for (const u of users) {
          const ts = u.last_sign_in_at
            ? new Date(u.last_sign_in_at).getTime()
            : 0;
          if (ts >= cutoff) activeUsers30d++;
        }
        if (users.length < perPage) break;
        page++;
      }
    } catch {
      activeUsers30d = 0;
    }

    return {
      families: count(families),
      patients: count(patients),
      assessments: {
        total: count(assessmentsTotal),
        completed: count(assessmentsCompleted),
      },
      plansGenerated: count(roadmaps),
      plansUnlocked: count(roadmapsUnlocked),
      moholkaConversations: count(moholkaConvs),
      paymentsApproved: count(paymentsApproved),
      revenueByCurrency,
      activeUsers30d,
    };
  });

export const listAdminFamilies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string } | undefined) =>
    z
      .object({ search: z.string().trim().max(120).optional() })
      .default({})
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const s = context.supabase;

    const q = s
      .from("profiles")
      .select("id, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.search)
      q.ilike("full_name", `%${data.search}%`);
    const { data: profiles, error } = await q;
    if (error) throw error;
    const ids = (profiles ?? []).map((p) => p.id);
    if (!ids.length) return [];

    const [{ data: patients }, { data: roadmaps }] = await Promise.all([
      s
        .from("patients")
        .select("id, user_id, city, first_name, last_name")
        .in("user_id", ids),
      s
        .from("neurodevelopment_roadmaps")
        .select("patient_id, plan_status, user_id")
        .in("user_id", ids),
    ]);

    // last sign-in and email via admin API (best-effort, per-id lookup)
    const emailByUser = new Map<string, string | null>();
    const lastSignInByUser = new Map<string, string | null>();
    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      await Promise.all(
        ids.map(async (uid) => {
          const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
          const u = data?.user;
          emailByUser.set(uid, u?.email ?? null);
          lastSignInByUser.set(uid, u?.last_sign_in_at ?? null);
        }),
      );
    } catch {
      // ignore
    }

    return (profiles ?? []).map((p) => {
      const ps = (patients ?? []).filter((x) => x.user_id === p.id);
      const rms = (roadmaps ?? []).filter((r) => r.user_id === p.id);
      const anyUnlocked = rms.some((r) => r.plan_status === "unlocked");
      const anyPaid = rms.some(
        (r) => r.plan_status === "paid" || r.plan_status === "processing",
      );
      return {
        id: p.id,
        fullName: p.full_name,
        email: emailByUser.get(p.id) ?? null,
        city: ps[0]?.city ?? null,
        patientCount: ps.length,
        subscription: anyUnlocked
          ? "unlocked"
          : anyPaid
            ? "processing"
            : "locked",
        lastSignInAt: lastSignInByUser.get(p.id) ?? null,
        createdAt: p.created_at,
      };
    });
  });

export const listAdminPatients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string } | undefined) =>
    z
      .object({ search: z.string().trim().max(120).optional() })
      .default({})
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const s = context.supabase;
    const q = s
      .from("patients")
      .select(
        "id, first_name, last_name, date_of_birth, diagnosis, parent_name, parent_email, city, user_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.search)
      q.or(
        `first_name.ilike.%${data.search}%,last_name.ilike.%${data.search}%,parent_name.ilike.%${data.search}%`,
      );
    const { data: patients, error } = await q;
    if (error) throw error;
    if (!patients?.length) return [];

    const ids = patients.map((p) => p.id);
    const [{ data: assessments }, { data: roadmaps }] = await Promise.all([
      s
        .from("assessments")
        .select("patient_id, status, completed_at, created_at, updated_at")
        .in("patient_id", ids),
      s
        .from("neurodevelopment_roadmaps")
        .select("patient_id, plan_status, plan_generation_status, generated_at")
        .in("patient_id", ids),
    ]);

    return patients.map((p) => {
      const as = (assessments ?? []).filter((x) => x.patient_id === p.id);
      const completed = as
        .filter((x) => x.status === "completed")
        .sort((a, b) =>
          (b.completed_at ?? "").localeCompare(a.completed_at ?? ""),
        );
      const rm = (roadmaps ?? []).find((x) => x.patient_id === p.id) ?? null;
      return {
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        dob: p.date_of_birth,
        diagnosis: p.diagnosis,
        parentName: p.parent_name,
        parentEmail: p.parent_email,
        city: p.city,
        assessmentsCount: as.length,
        lastAssessmentAt: completed[0]?.completed_at ?? null,
        planStatus: rm?.plan_status ?? null,
        planGeneration: rm?.plan_generation_status ?? null,
        userId: p.user_id,
      };
    });
  });

export const listAdminAssessments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const s = context.supabase;
    const { data: rows, error } = await s
      .from("assessments")
      .select(
        "id, patient_id, status, created_at, updated_at, completed_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    if (!rows?.length) return [];

    const pids = Array.from(new Set(rows.map((r) => r.patient_id)));
    const [{ data: patients }, { data: totalQ }, { data: answers }] =
      await Promise.all([
        s
          .from("patients")
          .select("id, first_name, last_name")
          .in("id", pids),
        s
          .from("assessment_questions")
          .select("id", { count: "exact" }),
        s
          .from("assessment_answers")
          .select("assessment_id")
          .in(
            "assessment_id",
            rows.map((r) => r.id),
          ),
      ]);

    const totalQuestions = (totalQ as unknown as { length?: number })?.length ?? 0;
    const answeredByAssessment = new Map<string, number>();
    for (const a of answers ?? []) {
      answeredByAssessment.set(
        a.assessment_id,
        (answeredByAssessment.get(a.assessment_id) ?? 0) + 1,
      );
    }

    const pmap = new Map(
      (patients ?? []).map((p) => [
        p.id,
        `${p.first_name} ${p.last_name}`.trim(),
      ]),
    );

    return rows.map((r) => {
      const answered = answeredByAssessment.get(r.id) ?? 0;
      const pct = totalQuestions
        ? Math.round((answered / totalQuestions) * 100)
        : 0;
      const start = new Date(r.created_at).getTime();
      const end = new Date(r.completed_at ?? r.updated_at).getTime();
      const durationMin = Math.max(0, Math.round((end - start) / 60000));
      return {
        id: r.id,
        patientId: r.patient_id,
        patientName: pmap.get(r.patient_id) ?? "—",
        status: r.status,
        createdAt: r.created_at,
        completedAt: r.completed_at,
        percentage: pct,
        durationMin,
      };
    });
  });

export const listAdminRoadmaps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const s = context.supabase;
    const { data, error } = await s
      .from("neurodevelopment_roadmaps")
      .select(
        "id, patient_id, generated_at, plan_status, plan_generation_status, plan_generated_at",
      )
      .order("generated_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    if (!data?.length) return [];
    const pids = Array.from(new Set(data.map((r) => r.patient_id)));
    const { data: patients } = await s
      .from("patients")
      .select("id, first_name, last_name")
      .in("id", pids);
    const pmap = new Map(
      (patients ?? []).map((p) => [
        p.id,
        `${p.first_name} ${p.last_name}`.trim(),
      ]),
    );
    return data.map((r) => ({
      id: r.id,
      patientId: r.patient_id,
      patientName: pmap.get(r.patient_id) ?? "—",
      generatedAt: r.generated_at,
      planStatus: r.plan_status,
      planGeneration: r.plan_generation_status,
      planGeneratedAt: r.plan_generated_at,
    }));
  });

export const listAdminPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const s = context.supabase;
    const { data, error } = await s
      .from("payments")
      .select(
        "id, patient_id, amount, currency, status, wompi_reference, wompi_transaction_id, paid_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    if (!data?.length) return [];
    const pids = Array.from(new Set(data.map((r) => r.patient_id)));
    const { data: patients } = await s
      .from("patients")
      .select("id, first_name, last_name")
      .in("id", pids);
    const pmap = new Map(
      (patients ?? []).map((p) => [
        p.id,
        `${p.first_name} ${p.last_name}`.trim(),
      ]),
    );
    return data.map((r) => ({
      id: r.id,
      patientId: r.patient_id,
      patientName: pmap.get(r.patient_id) ?? "—",
      amount: Number(r.amount),
      currency: r.currency,
      status: r.status,
      reference: r.wompi_reference,
      transactionId: r.wompi_transaction_id,
      paidAt: r.paid_at,
      createdAt: r.created_at,
    }));
  });

export const getAdminPatientFicha = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patientId: string }) =>
    z.object({ patientId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const s = context.supabase;
    const [
      { data: patient },
      { data: assessments },
      { data: roadmaps },
      { data: conversations },
      { data: payments },
    ] = await Promise.all([
      s.from("patients").select("*").eq("id", data.patientId).maybeSingle(),
      s
        .from("assessments")
        .select("id, status, created_at, updated_at, completed_at")
        .eq("patient_id", data.patientId)
        .order("created_at", { ascending: false }),
      s
        .from("neurodevelopment_roadmaps")
        .select(
          "id, generated_at, plan_status, plan_generation_status, plan_generated_at, plan_activated_at, cognitive, priorities",
        )
        .eq("patient_id", data.patientId)
        .order("generated_at", { ascending: false }),
      s
        .from("moholka_conversations")
        .select("id, updated_at, created_at")
        .eq("patient_id", data.patientId)
        .order("updated_at", { ascending: false }),
      s
        .from("payments")
        .select(
          "id, amount, currency, status, wompi_reference, paid_at, created_at",
        )
        .eq("patient_id", data.patientId)
        .order("created_at", { ascending: false }),
    ]);

    if (!patient) return null;

    // Enrich conversations with message counts
    const convIds = (conversations ?? []).map((c) => c.id);
    const msgCountByConv = new Map<string, number>();
    if (convIds.length) {
      const { data: msgs } = await s
        .from("moholka_messages")
        .select("conversation_id")
        .in("conversation_id", convIds);
      for (const m of msgs ?? []) {
        msgCountByConv.set(
          m.conversation_id,
          (msgCountByConv.get(m.conversation_id) ?? 0) + 1,
        );
      }
    }

    return {
      patient,
      assessments: assessments ?? [],
      roadmaps: roadmaps ?? [],
      conversations: (conversations ?? []).map((c) => ({
        id: c.id,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        messageCount: msgCountByConv.get(c.id) ?? 0,
      })),
      payments: payments ?? [],
    };
  });

export const getAdminConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string }) =>
    z.object({ conversationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: conv } = await context.supabase
      .from("moholka_conversations")
      .select("id, patient_id, created_at, updated_at")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conv) return null;
    const { data: msgs } = await context.supabase
      .from("moholka_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    return { conversation: conv, messages: msgs ?? [] };
  });