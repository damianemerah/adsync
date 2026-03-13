-- Enable RLS
ALTER TABLE targeting_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (though we saw none)
DROP POLICY IF EXISTS "Users can create targeting profiles for their org" ON targeting_profiles;
DROP POLICY IF EXISTS "Users can view targeting profiles for their org" ON targeting_profiles;

-- Policy: Users can insert profiles for their organization
CREATE POLICY "Users can create targeting profiles for their org"
ON targeting_profiles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = targeting_profiles.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- Policy: Users can view profiles for their organization
CREATE POLICY "Users can view targeting profiles for their org"
ON targeting_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = targeting_profiles.organization_id
    AND organization_members.user_id = auth.uid()
  )
);
