-- 1. Pehle purane constraints hatate hain (Safety ke liye)
ALTER TABLE IF EXISTS "public"."purchase_returns" DROP CONSTRAINT IF EXISTS "purchase_returns_supplier_id_fkey";
ALTER TABLE IF EXISTS "public"."supplier_refunds" DROP CONSTRAINT IF EXISTS "supplier_refunds_supplier_id_fkey";

-- 2. NOT NULL pabandi hatate hain taake conversion ho sakay
ALTER TABLE "public"."purchase_returns" ALTER COLUMN "supplier_id" DROP NOT NULL;
ALTER TABLE "public"."supplier_refunds" ALTER COLUMN "supplier_id" DROP NOT NULL;

-- 3. Columns ko UUID mein convert karte hain (ASAL FIX)
ALTER TABLE "public"."purchase_returns" ALTER COLUMN "supplier_id" TYPE uuid USING NULL;
ALTER TABLE "public"."supplier_refunds" ALTER COLUMN "supplier_id" TYPE uuid USING NULL;

-- 4. Foreign Keys dobara lagate hain (Suppliers table se jorne ke liye)
ALTER TABLE ONLY "public"."purchase_returns"
    ADD CONSTRAINT "purchase_returns_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");

ALTER TABLE ONLY "public"."supplier_refunds"
    ADD CONSTRAINT "supplier_refunds_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;