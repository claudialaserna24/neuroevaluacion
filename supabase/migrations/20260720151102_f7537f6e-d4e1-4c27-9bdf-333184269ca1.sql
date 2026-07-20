CREATE UNIQUE INDEX IF NOT EXISTS knowledge_documents_dedupe_idx
  ON public.knowledge_documents (
    module,
    coalesce(subcategory, ''),
    coalesce(severity_level, ''),
    coalesce(behavioral_condition, '')
  )
  WHERE active;