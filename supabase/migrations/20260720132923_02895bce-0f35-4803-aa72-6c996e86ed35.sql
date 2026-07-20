DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
  ) THEN
    ALTER TYPE public.payment_status ADD VALUE 'rejected';
  END IF;
END$$;

GRANT UPDATE ON public.neurodevelopment_roadmaps TO service_role;
GRANT UPDATE ON public.payments TO service_role;
GRANT SELECT ON public.payments TO service_role;