CREATE TABLE meta_oauth_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  accounts jsonb NOT NULL,
  access_token text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);

ALTER TABLE meta_oauth_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner access" ON meta_oauth_pending
  USING (user_id = auth.uid());
