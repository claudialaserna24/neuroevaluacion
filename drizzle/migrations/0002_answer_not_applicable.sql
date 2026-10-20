ALTER TABLE public.assessment_answers ALTER COLUMN value DROP NOT NULL;
ALTER TABLE public.assessment_answers ADD COLUMN text_value text;
ALTER TABLE public.assessment_answers ADD CONSTRAINT assessment_answers_value_or_text CHECK ((value IS NOT NULL AND text_value IS NULL) OR (value IS NULL AND text_value = 'No aplica / No observable'));