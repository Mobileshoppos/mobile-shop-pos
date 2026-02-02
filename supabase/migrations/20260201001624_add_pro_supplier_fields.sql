-- Suppliers table mein professional fields shamil karein
ALTER TABLE "public"."suppliers" 
ADD COLUMN IF NOT EXISTS "email" text,
ADD COLUMN IF NOT EXISTS "tax_id" text,
ADD COLUMN IF NOT EXISTS "city" text,
ADD COLUMN IF NOT EXISTS "country" text,
ADD COLUMN IF NOT EXISTS "bank_name" text,
ADD COLUMN IF NOT EXISTS "bank_account_title" text,
ADD COLUMN IF NOT EXISTS "bank_account_no" text;