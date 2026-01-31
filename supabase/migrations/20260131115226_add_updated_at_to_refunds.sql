-- 1. supplier_refunds table mein updated_at column shamil karein
ALTER TABLE "public"."supplier_refunds" 
ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();

-- 2. Is table par bhi updated_at ka trigger lagayein taake sync sahi kaam kare
CREATE OR REPLACE TRIGGER "set_updated_at" 
BEFORE UPDATE ON "public"."supplier_refunds" 
FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();