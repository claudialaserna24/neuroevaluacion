
-- Conversaciones
CREATE TABLE public.moholka_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  roadmap_id uuid REFERENCES public.neurodevelopment_roadmaps(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.moholka_conversations TO authenticated;
GRANT ALL ON public.moholka_conversations TO service_role;

ALTER TABLE public.moholka_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own conversation"
ON public.moholka_conversations
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
);

CREATE POLICY "Admin reads all conversations"
ON public.moholka_conversations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'administrador'));

CREATE TRIGGER moholka_conversations_touch
BEFORE UPDATE ON public.moholka_conversations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Mensajes
CREATE TABLE public.moholka_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.moholka_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX moholka_messages_conversation_created_idx
  ON public.moholka_messages (conversation_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.moholka_messages TO authenticated;
GRANT ALL ON public.moholka_messages TO service_role;

ALTER TABLE public.moholka_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own messages"
ON public.moholka_messages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.moholka_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.moholka_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Admin reads all messages"
ON public.moholka_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'administrador'));
