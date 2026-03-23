-- Allow users to update creatives in their organization
-- Missing policy was preventing inline name editing from saving
CREATE POLICY "Users can update org creatives" 
ON creatives 
FOR UPDATE 
TO authenticated
USING (
  organization_id IN (
    SELECT organization_members.organization_id 
    FROM organization_members 
    WHERE organization_members.user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_members.organization_id 
    FROM organization_members 
    WHERE organization_members.user_id = auth.uid()
  )
);

-- Allow users to update targeting profiles in their organization
-- Adding for consistency as it was also missing
CREATE POLICY "Users can update org targeting profiles" 
ON targeting_profiles 
FOR UPDATE 
TO authenticated
USING (
  organization_id IN (
    SELECT organization_members.organization_id 
    FROM organization_members 
    WHERE organization_members.user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_members.organization_id 
    FROM organization_members 
    WHERE organization_members.user_id = auth.uid()
  )
);

-- Allow users to delete targeting profiles in their organization
CREATE POLICY "Users can delete org targeting profiles" 
ON targeting_profiles 
FOR DELETE 
TO authenticated
USING (
  organization_id IN (
    SELECT organization_members.organization_id 
    FROM organization_members 
    WHERE organization_members.user_id = auth.uid()
  )
);
