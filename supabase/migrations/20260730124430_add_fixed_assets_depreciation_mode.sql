-- Depreciation Mode Column Add Karein (Default 'manual' hoga)
ALTER TABLE "public"."fixed_assets" ADD COLUMN IF NOT EXISTS "depreciation_mode" text DEFAULT 'manual';

-- Puranay assets ko 'manual' set karein
UPDATE "public"."fixed_assets" SET "depreciation_mode" = 'manual' WHERE "depreciation_mode" IS NULL;