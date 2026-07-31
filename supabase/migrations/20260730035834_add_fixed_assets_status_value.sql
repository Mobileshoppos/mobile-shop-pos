-- 1. Status ka column add karein (Default 'Active' hoga)
ALTER TABLE "public"."fixed_assets" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'Active';

-- 2. Current Value (Mojooda Qeemat) ka column add karein
ALTER TABLE "public"."fixed_assets" ADD COLUMN IF NOT EXISTS "current_value" numeric(12,2);

-- 3. Jo assets pehle se database mein hain, unki current_value ko unki khareed qeemat (cost_amount) ke barabar set kar dein taake purana data kharab na ho
UPDATE "public"."fixed_assets" 
SET "current_value" = "cost_amount" 
WHERE "current_value" IS NULL;