
ALTER TABLE public.neurodevelopment_roadmaps
  ADD COLUMN IF NOT EXISTS plan_content jsonb,
  ADD COLUMN IF NOT EXISTS plan_generation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS plan_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_pdf_url text,
  ADD COLUMN IF NOT EXISTS manual_pdf_url text;

ALTER TABLE public.neurodevelopment_roadmaps
  DROP CONSTRAINT IF EXISTS neurodevelopment_roadmaps_plan_generation_status_check;
ALTER TABLE public.neurodevelopment_roadmaps
  ADD CONSTRAINT neurodevelopment_roadmaps_plan_generation_status_check
  CHECK (plan_generation_status IN ('pending','generating','ready','failed'));
