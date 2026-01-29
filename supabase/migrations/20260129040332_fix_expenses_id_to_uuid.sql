-- 1. Pehle Identity (Auto-increment) hatate hain
ALTER TABLE "public"."expenses" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;

-- 2. Phir ID ka type badal kar UUID karte hain
ALTER TABLE "public"."expenses" 
ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid(), 
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();