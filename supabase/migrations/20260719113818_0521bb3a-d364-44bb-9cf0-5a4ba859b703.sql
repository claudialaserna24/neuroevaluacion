
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  diagnosis text,
  interventions text,
  developmental_history text,
  parent_name text,
  parent_email text,
  parent_phone text,
  city text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY patients_self_all ON public.patients
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX patients_user_id_idx ON public.patients(user_id);

CREATE TRIGGER patients_touch_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.assessments ADD COLUMN patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE;

WITH users_needing_patient AS (
  SELECT DISTINCT user_id FROM public.assessments WHERE patient_id IS NULL
),
inserted AS (
  INSERT INTO public.patients (user_id, first_name, last_name, date_of_birth, parent_name)
  SELECT user_id, 'Paciente', 'sin registrar', CURRENT_DATE, 'Pendiente'
  FROM users_needing_patient
  RETURNING id, user_id
)
UPDATE public.assessments a
SET patient_id = i.id
FROM inserted i
WHERE a.user_id = i.user_id AND a.patient_id IS NULL;

ALTER TABLE public.assessments ALTER COLUMN patient_id SET NOT NULL;
CREATE INDEX assessments_patient_id_idx ON public.assessments(patient_id);

ALTER TABLE public.initial_reports RENAME TO neurodevelopment_roadmaps;

ALTER TABLE public.neurodevelopment_roadmaps ADD COLUMN patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE;

UPDATE public.neurodevelopment_roadmaps r
SET patient_id = a.patient_id
FROM public.assessments a
WHERE a.id = r.assessment_id AND r.patient_id IS NULL;

ALTER TABLE public.neurodevelopment_roadmaps ALTER COLUMN patient_id SET NOT NULL;

DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.neurodevelopment_roadmaps'::regclass AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.neurodevelopment_roadmaps DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.neurodevelopment_roadmaps
  ADD CONSTRAINT neurodevelopment_roadmaps_patient_assessment_key UNIQUE (patient_id, assessment_id);

CREATE INDEX neurodevelopment_roadmaps_patient_id_idx ON public.neurodevelopment_roadmaps(patient_id);
