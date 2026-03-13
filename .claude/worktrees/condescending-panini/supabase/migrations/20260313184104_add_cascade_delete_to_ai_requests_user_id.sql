-- Migration: Add ON DELETE CASCADE to ai_requests_user_id_fkey

ALTER TABLE public.ai_requests
  DROP CONSTRAINT IF EXISTS ai_requests_user_id_fkey;

ALTER TABLE public.ai_requests
  ADD CONSTRAINT ai_requests_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;
