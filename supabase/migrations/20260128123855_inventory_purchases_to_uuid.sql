-- ==========================================
-- 1. DEPENDENCIES KO KHATAM KARNA (Views & Functions)
-- ==========================================
DROP VIEW IF EXISTS "public"."products_display_view" CASCADE;
DROP VIEW IF EXISTS "public"."products_with_quantity" CASCADE;
DROP VIEW IF EXISTS "public"."suppliers_with_balance" CASCADE;
DROP VIEW IF EXISTS "public"."sales_history_view" CASCADE;

-- Tamam purane functions ko drop karte hain taake naye UUID parameters ke sath ban sakein
DROP FUNCTION IF EXISTS "public"."create_new_purchase"(uuid, bigint, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS "public"."update_purchase_inventory"(bigint, bigint, text, numeric, jsonb, uuid) CASCADE;
DROP FUNCTION IF EXISTS "public"."process_purchase_return"(bigint, jsonb, date, text) CASCADE;
DROP FUNCTION IF EXISTS "public"."edit_supplier_payment"(bigint, numeric, text) CASCADE;
DROP FUNCTION IF EXISTS "public"."record_bulk_supplier_payment"(uuid, bigint, numeric, text, timestamptz, text) CASCADE;
DROP FUNCTION IF EXISTS "public"."record_purchase_payment"(uuid, integer, integer, numeric, text, date, text) CASCADE;
DROP FUNCTION IF EXISTS "public"."undo_return_item"(bigint) CASCADE;
DROP FUNCTION IF EXISTS "public"."update_purchase"(integer, text, jsonb) CASCADE;

-- ==========================================
-- 2. PURANE TALLUQAAT (Constraints) KHATAM KARNA
-- ==========================================
ALTER TABLE IF EXISTS "public"."inventory" DROP CONSTRAINT IF EXISTS "fk_inventory_purchase";
ALTER TABLE IF EXISTS "public"."purchase_items" DROP CONSTRAINT IF EXISTS "purchase_items_purchase_id_fkey";
ALTER TABLE IF EXISTS "public"."payment_allocations" DROP CONSTRAINT IF EXISTS "payment_allocations_payment_id_fkey";
ALTER TABLE IF EXISTS "public"."payment_allocations" DROP CONSTRAINT IF EXISTS "payment_allocations_purchase_id_fkey";
ALTER TABLE IF EXISTS "public"."supplier_payments" DROP CONSTRAINT IF EXISTS "supplier_payments_purchase_id_fkey";
ALTER TABLE IF EXISTS "public"."purchase_returns" DROP CONSTRAINT IF EXISTS "purchase_returns_purchase_id_fkey";
ALTER TABLE IF EXISTS "public"."purchase_return_items" DROP CONSTRAINT IF EXISTS "purchase_return_items_return_id_fkey";
ALTER TABLE IF EXISTS "public"."sale_items" DROP CONSTRAINT IF EXISTS "sale_items_inventory_id_fkey";
ALTER TABLE IF EXISTS "public"."sale_return_items" DROP CONSTRAINT IF EXISTS "sale_return_items_inventory_id_fkey";
ALTER TABLE IF EXISTS "public"."warranty_claims" DROP CONSTRAINT IF EXISTS "warranty_claims_inventory_id_fkey";

-- ==========================================
-- 3. IDENTITY PROPERTIES HATANA (UUID ke liye zaroori hai)
-- ==========================================
ALTER TABLE "public"."inventory" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
ALTER TABLE "public"."purchases" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
ALTER TABLE "public"."purchase_items" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
ALTER TABLE "public"."supplier_payments" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
ALTER TABLE "public"."payment_allocations" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
ALTER TABLE "public"."purchase_returns" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
ALTER TABLE "public"."purchase_return_items" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;

-- ==========================================
-- 4. 'NOT NULL' PABANDIYAN HATANA (Conversion ke liye)
-- ==========================================
ALTER TABLE "public"."inventory" ALTER COLUMN "purchase_id" DROP NOT NULL;
ALTER TABLE "public"."purchase_items" ALTER COLUMN "purchase_id" DROP NOT NULL;
ALTER TABLE "public"."supplier_payments" ALTER COLUMN "purchase_id" DROP NOT NULL;
ALTER TABLE "public"."payment_allocations" ALTER COLUMN "payment_id" DROP NOT NULL;
ALTER TABLE "public"."payment_allocations" ALTER COLUMN "purchase_id" DROP NOT NULL;
ALTER TABLE "public"."purchase_returns" ALTER COLUMN "purchase_id" DROP NOT NULL;
ALTER TABLE "public"."purchase_return_items" ALTER COLUMN "return_id" DROP NOT NULL;
ALTER TABLE "public"."sale_items" ALTER COLUMN "inventory_id" DROP NOT NULL;
ALTER TABLE "public"."sale_return_items" ALTER COLUMN "inventory_id" DROP NOT NULL;
ALTER TABLE "public"."warranty_claims" ALTER COLUMN "inventory_id" DROP NOT NULL;

-- ==========================================
-- 5. TYPE BADALNA AUR DEFAULTS SET KARNA
-- ==========================================

-- Inventory
ALTER TABLE "public"."inventory" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid(), ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "public"."inventory" ALTER COLUMN "purchase_id" TYPE uuid USING NULL;

-- Purchases
ALTER TABLE "public"."purchases" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid(), ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Purchase Items
ALTER TABLE "public"."purchase_items" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid(), ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "public"."purchase_items" ALTER COLUMN "purchase_id" TYPE uuid USING NULL;

-- Supplier Payments
ALTER TABLE "public"."supplier_payments" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid(), ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "public"."supplier_payments" ALTER COLUMN "purchase_id" TYPE uuid USING NULL;

-- Payment Allocations
ALTER TABLE "public"."payment_allocations" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid(), ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "public"."payment_allocations" ALTER COLUMN "payment_id" TYPE uuid USING NULL;
ALTER TABLE "public"."payment_allocations" ALTER COLUMN "purchase_id" TYPE uuid USING NULL;

-- Purchase Returns
ALTER TABLE "public"."purchase_returns" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid(), ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "public"."purchase_returns" ALTER COLUMN "purchase_id" TYPE uuid USING NULL;

-- Purchase Return Items
ALTER TABLE "public"."purchase_return_items" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid(), ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "public"."purchase_return_items" ALTER COLUMN "return_id" TYPE uuid USING NULL;

-- Sale Related Tables (Foreign Keys only)
ALTER TABLE "public"."sale_items" ALTER COLUMN "inventory_id" TYPE uuid USING NULL;
ALTER TABLE "public"."sale_return_items" ALTER COLUMN "inventory_id" TYPE uuid USING NULL;
ALTER TABLE "public"."warranty_claims" ALTER COLUMN "inventory_id" TYPE uuid USING NULL;

-- ==========================================
-- 6. TALLUQAAT (Foreign Keys) DOBARA JORTA HAIN
-- ==========================================
ALTER TABLE ONLY "public"."inventory" ADD CONSTRAINT "fk_inventory_purchase" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."supplier_payments" ADD CONSTRAINT "supplier_payments_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."supplier_payments"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."payment_allocations" ADD CONSTRAINT "payment_allocations_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."purchase_returns" ADD CONSTRAINT "purchase_returns_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id");
ALTER TABLE ONLY "public"."purchase_return_items" ADD CONSTRAINT "purchase_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."purchase_returns"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."sale_items" ADD CONSTRAINT "sale_items_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id");
ALTER TABLE ONLY "public"."sale_return_items" ADD CONSTRAINT "sale_return_items_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id");
ALTER TABLE ONLY "public"."warranty_claims" ADD CONSTRAINT "warranty_claims_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id");

-- ==========================================
-- 7. VIEWS DOBARA BANANA (As per original dump)
-- ==========================================
CREATE OR REPLACE VIEW "public"."products_display_view" AS
 SELECT "p"."id", "p"."name", "p"."brand", "p"."barcode", "p"."category_id", "p"."purchase_price" AS "default_purchase_price", "p"."sale_price" AS "default_sale_price", "c"."name" AS "category_name",
    COALESCE("sum"("i"."available_qty") FILTER (WHERE ("i"."status" = 'Available'::"text")), (0)::bigint) AS "quantity",
    "avg"("i"."purchase_price") FILTER (WHERE ("i"."status" = 'Available'::"text")) AS "avg_purchase_price",
    "min"("i"."sale_price") FILTER (WHERE ("i"."status" = 'Available'::"text")) AS "min_sale_price",
    "max"("i"."sale_price") FILTER (WHERE ("i"."status" = 'Available'::"text")) AS "max_sale_price"
   FROM (("public"."products" "p" LEFT JOIN "public"."inventory" "i" ON (("p"."id" = "i"."product_id"))) LEFT JOIN "public"."categories" "c" ON (("p"."category_id" = "c"."id")))
  WHERE ("p"."user_id" = "auth"."uid"())
  GROUP BY "p"."id", "c"."name";

CREATE OR REPLACE VIEW "public"."suppliers_with_balance" AS
 SELECT "s"."id", "s"."name", "s"."contact_person", "s"."phone", "s"."address", "s"."created_at", "s"."credit_balance", "s"."user_id", "s"."local_id", "s"."updated_at", "s"."is_active",
    COALESCE("sum"("p"."balance_due"), (0)::numeric) AS "balance_due"
   FROM ("public"."suppliers" "s" LEFT JOIN "public"."purchases" "p" ON (("s"."id" = "p"."supplier_id")))
  GROUP BY "s"."id", "s"."name", "s"."contact_person", "s"."phone", "s"."address", "s"."created_at", "s"."credit_balance", "s"."user_id", "s"."local_id", "s"."updated_at", "s"."is_active"
  ORDER BY "s"."name";

-- ==========================================
-- 8. ORIGINAL COMMENTS WAPIS LAGANA
-- ==========================================
COMMENT ON TABLE "public"."inventory" IS 'Stores individual stock items, linking them to a master product.';
COMMENT ON COLUMN "public"."inventory"."item_attributes" IS 'Stores dynamic key-value pairs of attributes for an inventory item, e.g., {"Color": "Blue", "Size": "Large"}.';
COMMENT ON COLUMN "public"."inventory"."variant_id" IS 'Links this inventory item to a specific, defined variant.';

-- ==========================================
-- 9. PERMISSIONS (Grants) DOBARA DENA
-- ==========================================
GRANT ALL ON TABLE "public"."inventory" TO "anon", "authenticated", "service_role";
GRANT ALL ON TABLE "public"."purchases" TO "anon", "authenticated", "service_role";
GRANT ALL ON TABLE "public"."purchase_items" TO "anon", "authenticated", "service_role";
GRANT ALL ON TABLE "public"."supplier_payments" TO "anon", "authenticated", "service_role";
GRANT ALL ON TABLE "public"."payment_allocations" TO "anon", "authenticated", "service_role";
GRANT ALL ON TABLE "public"."purchase_returns" TO "anon", "authenticated", "service_role";
GRANT ALL ON TABLE "public"."purchase_return_items" TO "anon", "authenticated", "service_role";