import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const patientInput = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  date_of_birth: z.string().min(4), // ISO date
  diagnosis: z.string().optional().nullable(),
  interventions: z.string().optional().nullable(),
  developmental_history: z.string().optional().nullable(),
  parent_name: z.string().optional().nullable(),
  parent_email: z.string().email().optional().or(z.literal("")).nullable().optional(),
  parent_phone: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
});

export const listMyPatients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("patients")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const getPatient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patientId: string }) =>
    z.object({ patientId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("patients")
      .select("*")
      .eq("id", data.patientId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

export const createPatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof patientInput>) => patientInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("patients")
      .insert({ ...data, user_id: context.userId })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const updatePatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patientId: string } & z.infer<typeof patientInput>) =>
    z.object({ patientId: z.string().uuid() }).merge(patientInput).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { patientId, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("patients")
      .update(rest)
      .eq("id", patientId)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export function computeAgeYears(dob: string | Date): number {
  const d = typeof dob === "string" ? new Date(dob) : dob;
  if (isNaN(d.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return Math.max(0, age);
}