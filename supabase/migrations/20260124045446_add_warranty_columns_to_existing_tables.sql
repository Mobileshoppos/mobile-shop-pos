-- Products table mein default warranty ka column add karein
ALTER TABLE "public"."products" ADD COLUMN IF NOT EXISTS "default_warranty_days" integer DEFAULT 0;

-- Inventory table mein supplier warranty ka column add karein
ALTER TABLE "public"."inventory" ADD COLUMN IF NOT EXISTS "warranty_days" integer DEFAULT 0;

-- Sale items table mein warranty expiry date ka column add karein (POS ke liye)
ALTER TABLE "public"."sale_items" ADD COLUMN IF NOT EXISTS "warranty_expiry" timestamp with time zone;