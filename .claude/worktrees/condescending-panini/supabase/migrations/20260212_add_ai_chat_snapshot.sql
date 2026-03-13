-- Add ai_chat_snapshot column to campaigns table
ALTER TABLE "public"."campaigns" ADD COLUMN "ai_chat_snapshot" jsonb;
