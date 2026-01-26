-- 1. sale_items table mein updated_at column add karein
ALTER TABLE "public"."sale_items" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();

-- 2. Purane records ko aaj ki date dein taake wo download ho sakein
UPDATE "public"."sale_items" SET "updated_at" = now() WHERE "updated_at" IS NULL;

-- 3. Trigger lagayein taake aage bhi updated_at khud badalta rahe
CREATE TRIGGER "set_sale_items_updated_at" BEFORE UPDATE ON "public"."sale_items" 
FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();