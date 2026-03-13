-- Add draft columns to campaigns table
ALTER TABLE "public"."campaigns" ADD COLUMN "targeting_snapshot" jsonb;
ALTER TABLE "public"."campaigns" ADD COLUMN "creative_snapshot" jsonb;

-- Make daily_budget_cents nullable
ALTER TABLE "public"."campaigns" ALTER COLUMN "daily_budget_cents" DROP NOT NULL;

-- Update status check constraint if exists, or just allow 'draft' if it's a text column (it is text based on types)
-- If there is a check constraint, we might need to drop/add it.
-- Assuming no strict enum type in DB as types shows 'string | null'.
