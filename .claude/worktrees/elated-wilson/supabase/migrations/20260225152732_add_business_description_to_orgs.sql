-- Migration: add_business_description_to_orgs
-- Description: Adds business_description column to organizations table.

ALTER TABLE "public"."organizations"
ADD COLUMN "business_description" text;
