-- Add RLS policies for the creatives storage bucket.
-- Restricts all storage operations to authenticated org members only.
-- The first path segment of every file is the org ID (enforced by the server action).

CREATE POLICY "Org members can read creatives"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'creatives' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members can upload creatives"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'creatives' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members can update creatives"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'creatives' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members can delete creatives"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'creatives' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM organization_members WHERE user_id = auth.uid()
  )
);
