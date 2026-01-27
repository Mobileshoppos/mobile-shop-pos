-- 1. sale_items table mein local_id column add karein
ALTER TABLE "public"."sale_items" ADD COLUMN IF NOT EXISTS "local_id" uuid UNIQUE DEFAULT gen_random_uuid();

-- 2. Purane records ke liye local_id generate karein (Safety)
UPDATE "public"."sale_items" SET "local_id" = gen_random_uuid() WHERE "local_id" IS NULL;