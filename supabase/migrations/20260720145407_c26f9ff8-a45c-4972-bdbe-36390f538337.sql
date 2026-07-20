CREATE TABLE public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  subcategory TEXT,
  severity_level TEXT,
  behavioral_condition TEXT,
  intervention_text TEXT NOT NULL,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  version TEXT NOT NULL DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_documents TO authenticated;
GRANT ALL ON public.knowledge_documents TO service_role;

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active knowledge"
  ON public.knowledge_documents FOR SELECT
  TO authenticated
  USING (active = true OR public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can insert knowledge"
  ON public.knowledge_documents FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can update knowledge"
  ON public.knowledge_documents FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can delete knowledge"
  ON public.knowledge_documents FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE INDEX idx_knowledge_module_subcat_sev ON public.knowledge_documents (module, subcategory, severity_level) WHERE active = true;
CREATE INDEX idx_knowledge_module_behavior ON public.knowledge_documents (module, behavioral_condition) WHERE active = true;
CREATE INDEX idx_knowledge_active ON public.knowledge_documents (active);

CREATE TRIGGER trg_knowledge_documents_updated_at
  BEFORE UPDATE ON public.knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage RLS for cerebro-assets bucket (bucket created via storage tool)
CREATE POLICY "Authenticated can read cerebro assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'cerebro-assets');

CREATE POLICY "Admins can upload cerebro assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'cerebro-assets' AND public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can update cerebro assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'cerebro-assets' AND public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (bucket_id = 'cerebro-assets' AND public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can delete cerebro assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'cerebro-assets' AND public.has_role(auth.uid(), 'administrador'));