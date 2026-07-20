
ALTER TABLE public.neurodevelopment_roadmaps
  ADD COLUMN IF NOT EXISTS plan_generation_status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_generation_error text;

UPDATE public.neurodevelopment_roadmaps
SET plan_generation_status_updated_at = COALESCE(plan_generated_at, generated_at, now())
WHERE plan_generation_status_updated_at IS NULL;

CREATE OR REPLACE FUNCTION public.touch_plan_generation_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.plan_generation_status IS DISTINCT FROM OLD.plan_generation_status THEN
    NEW.plan_generation_status_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_plan_generation_status ON public.neurodevelopment_roadmaps;
CREATE TRIGGER trg_touch_plan_generation_status
BEFORE UPDATE ON public.neurodevelopment_roadmaps
FOR EACH ROW
EXECUTE FUNCTION public.touch_plan_generation_status();
