
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('usuario', 'administrador');
CREATE TYPE public.assessment_module AS ENUM ('cognitive', 'functional', 'reflex');
CREATE TYPE public.answer_scale AS ENUM ('cog3', 'func10', 'reflex5');
CREATE TYPE public.assessment_status AS ENUM ('in_progress', 'completed');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  child_name TEXT,
  child_dob DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self_all" ON public.profiles FOR ALL TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ USER_ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ USER_CONSENTS ============
CREATE TABLE public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_kind TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT
);
CREATE INDEX idx_user_consents_user ON public.user_consents(user_id, policy_kind);
GRANT SELECT, INSERT ON public.user_consents TO authenticated;
GRANT ALL ON public.user_consents TO service_role;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consents_self_read" ON public.user_consents FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "consents_self_insert" ON public.user_consents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============ ASSESSMENT_QUESTIONS (catalog) ============
CREATE TABLE public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module public.assessment_module NOT NULL,
  dimension TEXT NOT NULL,
  category TEXT,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  scale public.answer_scale NOT NULL,
  UNIQUE(module, order_index)
);
GRANT SELECT ON public.assessment_questions TO authenticated;
GRANT ALL ON public.assessment_questions TO service_role;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_read_all_auth" ON public.assessment_questions FOR SELECT TO authenticated USING (true);

-- ============ ASSESSMENTS (session) ============
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  status public.assessment_status NOT NULL DEFAULT 'in_progress',
  current_question_id UUID REFERENCES public.assessment_questions(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessments_self_all" ON public.assessments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ ASSESSMENT_ANSWERS ============
CREATE TABLE public.assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.assessment_questions(id),
  value INTEGER NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, question_id)
);
CREATE INDEX idx_answers_assessment ON public.assessment_answers(assessment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_answers TO authenticated;
GRANT ALL ON public.assessment_answers TO service_role;
ALTER TABLE public.assessment_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answers_self_all" ON public.assessment_answers FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid()));

-- ============ INITIAL_REPORTS ============
CREATE TABLE public.initial_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  cognitive JSONB NOT NULL,
  functional JSONB NOT NULL,
  reflexes JSONB NOT NULL,
  priorities JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.initial_reports TO authenticated;
GRANT ALL ON public.initial_reports TO service_role;
ALTER TABLE public.initial_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_self_all" ON public.initial_reports FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  requested_role public.app_role;
BEGIN
  requested_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'usuario');

  INSERT INTO public.profiles (id, full_name, child_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'child_name'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, requested_role) ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_assessments_touch BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ SEED: 367 QUESTIONS (placeholders) ============
-- Módulo 1: Perfil Cognitivo (197 = 99 HD + 98 HI), escala cog3
INSERT INTO public.assessment_questions (module, dimension, category, order_index, title, scale)
SELECT 'cognitive', 'Hemisferio Derecho', 'General', i,
  'Perfil Cognitivo · HD · Pregunta ' || i::text, 'cog3'
FROM generate_series(1, 99) i;

INSERT INTO public.assessment_questions (module, dimension, category, order_index, title, scale)
SELECT 'cognitive', 'Hemisferio Izquierdo', 'General', 99 + i,
  'Perfil Cognitivo · HI · Pregunta ' || i::text, 'cog3'
FROM generate_series(1, 98) i;

-- Módulo 2: Evaluación Funcional (80 = 10x8), escala func10
INSERT INTO public.assessment_questions (module, dimension, category, order_index, title, scale)
SELECT 'functional', area, NULL,
  ((area_idx - 1) * 10) + q,
  'Evaluación Funcional · ' || area || ' · Pregunta ' || q::text,
  'func10'
FROM (
  VALUES
    (1, 'Vestibular'), (2, 'Auditiva'), (3, 'Visual'), (4, 'Propioceptiva'),
    (5, 'Táctil hipo'), (6, 'Táctil hiper'), (7, 'Olfativa hiper'), (8, 'Olfativa hipo')
) AS areas(area_idx, area)
CROSS JOIN generate_series(1, 10) q;

-- Módulo 3: Reflejos Primitivos (90 = 10x9), escala reflex5
INSERT INTO public.assessment_questions (module, dimension, category, order_index, title, scale)
SELECT 'reflex', reflex_name, NULL,
  ((r_idx - 1) * 10) + q,
  'Reflejos · ' || reflex_name || ' · Pregunta ' || q::text,
  'reflex5'
FROM (
  VALUES
    (1, 'Parálisis del Miedo'), (2, 'Moro'), (3, 'TLR'), (4, 'Galant'),
    (5, 'ATNR'), (6, 'STNR'), (7, 'Búsqueda y Succión'), (8, 'Palmar'), (9, 'Babinski')
) AS reflexes(r_idx, reflex_name)
CROSS JOIN generate_series(1, 10) q;
