-- ==============================================================================
-- FIX: Change default receipt format from 'none' to 'pdf' for new users
-- ==============================================================================

ALTER TABLE "public"."profiles" 
ALTER COLUMN "receipt_format" SET DEFAULT 'pdf'::text;