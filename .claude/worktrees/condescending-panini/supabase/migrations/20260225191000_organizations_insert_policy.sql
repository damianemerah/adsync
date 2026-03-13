-- Allow authenticated users to insert new organizations
CREATE POLICY "Users can create organizations"
ON "public"."organizations"
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (true);
