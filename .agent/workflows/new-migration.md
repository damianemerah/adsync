---
description: Create a new Supabase migration file with correct timestamp naming, RLS policies, indexes, and monetary value conventions for the Sellam database.
---

# /new-migration

Use when creating a new Supabase migration file.

## Steps

1. Generate timestamp: current datetime as YYYYMMDDHHMMSS
2. Filename: supabase/migrations/[timestamp]\_[description].sql
3. Always include in this order:
   - CREATE TABLE statements
   - CREATE INDEX statements
   - ALTER TABLE statements (if extending existing)
   - CREATE OR REPLACE FUNCTION statements
   - ALTER TABLE ENABLE ROW LEVEL SECURITY
   - CREATE POLICY statements for each table
4. Every new table needs at minimum:
   - organization_id reference with RLS
   - created_at TIMESTAMPTZ DEFAULT NOW()
   - UUID primary key DEFAULT gen_random_uuid()
5. After writing migration, confirm:
   - Does it match decisions.md monetary conventions?
   - Does every table have RLS?
   - Are indexes on foreign keys and query columns?
