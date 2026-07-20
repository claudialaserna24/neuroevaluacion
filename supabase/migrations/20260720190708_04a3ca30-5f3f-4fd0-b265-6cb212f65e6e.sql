
-- RLS on storage.objects for manual-assets bucket
-- SELECT is intentionally NOT granted to authenticated/anon; the backend signs URLs with service_role.
CREATE POLICY "manual_assets_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'manual-assets' AND public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "manual_assets_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'manual-assets' AND public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (bucket_id = 'manual-assets' AND public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "manual_assets_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'manual-assets' AND public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "manual_assets_admin_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'manual-assets' AND public.has_role(auth.uid(), 'administrador'));
