-- Add selected_variant_id to root creatives so users can promote a variant
-- to be the "primary" image shown in the library.
ALTER TABLE creatives
  ADD COLUMN IF NOT EXISTS selected_variant_id uuid REFERENCES creatives(id) ON DELETE SET NULL;

-- Backfill parent_id from generation_context for existing variant records
-- (previously it was only stored inside the JSON, not in the DB column)
UPDATE creatives
SET parent_id = (generation_context->>'parentCreativeId')::uuid
WHERE parent_id IS NULL
  AND generation_context->>'parentCreativeId' IS NOT NULL
  AND (generation_context->>'parentCreativeId') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
