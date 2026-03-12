-- Migration: Update ai_requests request_type constraint to allow refinement types
-- Date: 2026-03-04
-- Purpose: Fix check constraint violation when logging copy refinements

ALTER TABLE ai_requests DROP CONSTRAINT IF EXISTS ai_requests_request_type_check;

ALTER TABLE ai_requests ADD CONSTRAINT ai_requests_request_type_check
CHECK (request_type IN (
  'text_generation',
  'image_generation',
  'image_edit',
  'copy_refinement',
  'context_refinement',
  'chat',
  'triage',
  'policy_check'
));
