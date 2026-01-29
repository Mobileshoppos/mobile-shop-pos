-- 1. IDENTITY hatate hain
ALTER TABLE "public"."cash_adjustments" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
ALTER TABLE "public"."daily_closings" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;

-- 2. Type badal kar UUID karte hain
ALTER TABLE "public"."cash_adjustments" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid(), ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "public"."daily_closings" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid(), ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- 3. Grants dobara dete hain
GRANT ALL ON TABLE "public"."cash_adjustments" TO authenticated;
GRANT ALL ON TABLE "public"."daily_closings" TO authenticated;