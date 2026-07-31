-- 1. Serial / Tag Number column
ALTER TABLE "public"."fixed_assets" ADD COLUMN IF NOT EXISTS "serial_number" text;

-- 2. Location column (e.g. Counter 1, Backroom)
ALTER TABLE "public"."fixed_assets" ADD COLUMN IF NOT EXISTS "location" text;

-- 3. Funding Source column (Cash, Bank, OwnersCapital, ExistingAsset)
ALTER TABLE "public"."fixed_assets" ADD COLUMN IF NOT EXISTS "funding_source" text DEFAULT 'Cash';

-- 4. Useful Life in Years (Default 5 Years)
ALTER TABLE "public"."fixed_assets" ADD COLUMN IF NOT EXISTS "useful_life_years" numeric DEFAULT 5;

-- 5. Salvage / Scrap Value (Default 0)
ALTER TABLE "public"."fixed_assets" ADD COLUMN IF NOT EXISTS "salvage_value" numeric DEFAULT 0;