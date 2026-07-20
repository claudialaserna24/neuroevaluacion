
-- 1) Nuevo rol
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'neuropsicologo';

-- 2) Tabla de asignaciones
CREATE TABLE IF NOT EXISTS public.patient_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  neuropsicologo_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, neuropsicologo_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_assignments TO authenticated;
GRANT ALL ON public.patient_assignments TO service_role;

ALTER TABLE public.patient_assignments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS patient_assignments_neuro_idx
  ON public.patient_assignments (neuropsicologo_id);
CREATE INDEX IF NOT EXISTS patient_assignments_patient_idx
  ON public.patient_assignments (patient_id);

CREATE TRIGGER trg_patient_assignments_touch
  BEFORE UPDATE ON public.patient_assignments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Helpers
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'administrador'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.can_view_patient(_user_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_admin(_user_id)
    OR EXISTS (SELECT 1 FROM public.patients p WHERE p.id = _patient_id AND p.user_id = _user_id)
    OR EXISTS (
      SELECT 1 FROM public.patient_assignments a
      WHERE a.patient_id = _patient_id AND a.neuropsicologo_id = _user_id
    );
$$;

-- 4) Policies patient_assignments
CREATE POLICY "assignments_admin_all" ON public.patient_assignments
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "assignments_neuro_select_own" ON public.patient_assignments
  FOR SELECT TO authenticated
  USING (neuropsicologo_id = auth.uid());

-- 5) Policies aditivas de admin (SELECT) sobre datos existentes
CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "patients_admin_select" ON public.patients
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "patients_neuro_select" ON public.patients
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patient_assignments a
    WHERE a.patient_id = patients.id AND a.neuropsicologo_id = auth.uid()
  ));

CREATE POLICY "assessments_admin_select" ON public.assessments
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "assessments_neuro_select" ON public.assessments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patient_assignments a
    WHERE a.patient_id = assessments.patient_id AND a.neuropsicologo_id = auth.uid()
  ));

CREATE POLICY "assessment_answers_admin_select" ON public.assessment_answers
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "assessment_answers_neuro_select" ON public.assessment_answers
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessments s
    JOIN public.patient_assignments a ON a.patient_id = s.patient_id
    WHERE s.id = assessment_answers.assessment_id AND a.neuropsicologo_id = auth.uid()
  ));

CREATE POLICY "roadmaps_admin_select" ON public.neurodevelopment_roadmaps
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "roadmaps_admin_update" ON public.neurodevelopment_roadmaps
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "roadmaps_neuro_select" ON public.neurodevelopment_roadmaps
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patient_assignments a
    WHERE a.patient_id = neurodevelopment_roadmaps.patient_id AND a.neuropsicologo_id = auth.uid()
  ));

CREATE POLICY "payments_admin_select" ON public.payments
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "moholka_conversations_admin_select" ON public.moholka_conversations
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "moholka_conversations_neuro_select" ON public.moholka_conversations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patient_assignments a
    WHERE a.patient_id = moholka_conversations.patient_id AND a.neuropsicologo_id = auth.uid()
  ));

CREATE POLICY "moholka_messages_admin_select" ON public.moholka_messages
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "moholka_messages_neuro_select" ON public.moholka_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.moholka_conversations c
    JOIN public.patient_assignments a ON a.patient_id = c.patient_id
    WHERE c.id = moholka_messages.conversation_id AND a.neuropsicologo_id = auth.uid()
  ));

CREATE POLICY "user_consents_admin_select" ON public.user_consents
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "user_roles_admin_select" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- 6) Auditoría regeneración de plan
ALTER TABLE public.neurodevelopment_roadmaps
  ADD COLUMN IF NOT EXISTS regenerated_at timestamptz,
  ADD COLUMN IF NOT EXISTS regenerated_by uuid REFERENCES auth.users(id);
