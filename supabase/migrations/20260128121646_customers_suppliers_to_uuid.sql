-- 1. Pehle un Views ko hatate hain jo Customers aur Suppliers par depend karte hain
DROP VIEW IF EXISTS "public"."customers_with_balance" CASCADE;
DROP VIEW IF EXISTS "public"."suppliers_with_balance" CASCADE;
DROP VIEW IF EXISTS "public"."sales_history_view" CASCADE;

-- 2. Functions ko hatate hain
DROP FUNCTION IF EXISTS "public"."get_customer_ledger"(uuid);
DROP FUNCTION IF EXISTS "public"."get_supplier_purchase_report"(date, date);

-- 3. Purane Talluqaat (Constraints) khatam karte hain
ALTER TABLE IF EXISTS "public"."sales" DROP CONSTRAINT IF EXISTS "sales_customer_id_fkey";
ALTER TABLE IF EXISTS "public"."customer_payments" DROP CONSTRAINT IF EXISTS "customer_payments_customer_id_fkey";
ALTER TABLE IF EXISTS "public"."purchases" DROP CONSTRAINT IF EXISTS "purchases_supplier_id_fkey";
ALTER TABLE IF EXISTS "public"."supplier_payments" DROP CONSTRAINT IF EXISTS "supplier_payments_supplier_id_fkey";
ALTER TABLE IF EXISTS "public"."sale_returns" DROP CONSTRAINT IF EXISTS "sale_returns_customer_id_fkey";
ALTER TABLE IF EXISTS "public"."credit_payouts" DROP CONSTRAINT IF EXISTS "credit_payouts_customer_id_fkey";
ALTER TABLE IF EXISTS "public"."supplier_refunds" DROP CONSTRAINT IF EXISTS "supplier_refunds_supplier_id_fkey";
ALTER TABLE IF EXISTS "public"."warranty_claims" DROP CONSTRAINT IF EXISTS "warranty_claims_customer_id_fkey";
ALTER TABLE IF EXISTS "public"."inventory" DROP CONSTRAINT IF EXISTS "fk_inventory_supplier";

-- 4. TAMAM mutalliqa tables se 'NOT NULL' pabandi hatate hain (IMPORTANT FIX)
ALTER TABLE "public"."sales" ALTER COLUMN "customer_id" DROP NOT NULL;
ALTER TABLE "public"."purchases" ALTER COLUMN "supplier_id" DROP NOT NULL;
ALTER TABLE "public"."supplier_payments" ALTER COLUMN "supplier_id" DROP NOT NULL;
ALTER TABLE "public"."customer_payments" ALTER COLUMN "customer_id" DROP NOT NULL;
ALTER TABLE "public"."supplier_refunds" ALTER COLUMN "supplier_id" DROP NOT NULL;
ALTER TABLE "public"."credit_payouts" ALTER COLUMN "customer_id" DROP NOT NULL;
ALTER TABLE "public"."sale_returns" ALTER COLUMN "customer_id" DROP NOT NULL;
ALTER TABLE "public"."warranty_claims" ALTER COLUMN "customer_id" DROP NOT NULL;

-- 5. Columns ka type badal kar UUID karte hain
ALTER TABLE "public"."sales" ALTER COLUMN "customer_id" TYPE uuid USING NULL;
ALTER TABLE "public"."purchases" ALTER COLUMN "supplier_id" TYPE uuid USING NULL;
ALTER TABLE "public"."customer_payments" ALTER COLUMN "customer_id" TYPE uuid USING NULL;
ALTER TABLE "public"."supplier_payments" ALTER COLUMN "supplier_id" TYPE uuid USING NULL;
ALTER TABLE "public"."sale_returns" ALTER COLUMN "customer_id" TYPE uuid USING NULL;
ALTER TABLE "public"."credit_payouts" ALTER COLUMN "customer_id" TYPE uuid USING NULL;
ALTER TABLE "public"."supplier_refunds" ALTER COLUMN "supplier_id" TYPE uuid USING NULL;
ALTER TABLE "public"."warranty_claims" ALTER COLUMN "customer_id" TYPE uuid USING NULL;
ALTER TABLE "public"."inventory" ALTER COLUMN "supplier_id" TYPE uuid USING NULL;

-- 6. Customers Table ko UUID ke saath dobara banate hain
DROP TABLE IF EXISTS "public"."customers" CASCADE;
CREATE TABLE "public"."customers" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" text,
    "phone_number" text,
    "address" text,
    "balance" double precision DEFAULT '0'::double precision,
    "user_id" uuid DEFAULT "auth"."uid"(),
    "local_id" uuid,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT "customers_local_id_key" UNIQUE ("local_id")
);

-- 7. Suppliers Table ko UUID ke saath dobara banate hain
DROP TABLE IF EXISTS "public"."suppliers" CASCADE;
CREATE TABLE "public"."suppliers" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "contact_person" text,
    "phone" text,
    "address" text,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "credit_balance" numeric DEFAULT 0 NOT NULL,
    "user_id" uuid DEFAULT "auth"."uid"() NOT NULL,
    "local_id" uuid,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT "suppliers_local_id_key" UNIQUE ("local_id"),
    CONSTRAINT "suppliers_credit_balance_check" CHECK (("credit_balance" >= (0)::numeric))
);
COMMENT ON COLUMN "public"."suppliers"."credit_balance" IS 'Stores the advance payment or credit amount a supplier owes to us.';

-- 8. Talluqaat (Foreign Keys) dobara jorte hain
ALTER TABLE ONLY "public"."sales" ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");
ALTER TABLE ONLY "public"."customer_payments" ADD CONSTRAINT "customer_payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");
ALTER TABLE ONLY "public"."purchases" ADD CONSTRAINT "purchases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."sale_returns" ADD CONSTRAINT "sale_returns_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");
ALTER TABLE ONLY "public"."credit_payouts" ADD CONSTRAINT "credit_payouts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");
ALTER TABLE ONLY "public"."supplier_refunds" ADD CONSTRAINT "supplier_refunds_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."warranty_claims" ADD CONSTRAINT "warranty_claims_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");
ALTER TABLE ONLY "public"."inventory" ADD CONSTRAINT "fk_inventory_supplier" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;

-- 9. Views dobara banate hain
CREATE OR REPLACE VIEW "public"."customers_with_balance" AS
 SELECT "c"."id", "c"."name", "c"."phone_number", "c"."address", "c"."user_id", "c"."local_id", "c"."created_at", "c"."updated_at", "c"."is_active",
    ((COALESCE("sales_total"."total_udhaar", (0)::double precision) + (COALESCE("payouts_debit"."total_payout", (0)::numeric))::double precision) - COALESCE("payments_total"."total_wusooli", (0)::double precision)) AS "balance"
   FROM ((("public"."customers" "c"
     LEFT JOIN ( SELECT "sales"."customer_id", "sales"."user_id", "sum"(("sales"."total_amount" - ("sales"."amount_paid_at_sale")::double precision)) AS "total_udhaar" FROM "public"."sales" GROUP BY "sales"."customer_id", "sales"."user_id") "sales_total" ON (("c"."id" = "sales_total"."customer_id")))
     LEFT JOIN ( SELECT "customer_payments"."customer_id", "customer_payments"."user_id", "sum"("abs"("customer_payments"."amount_paid")) AS "total_wusooli" FROM "public"."customer_payments" GROUP BY "customer_payments"."customer_id", "customer_payments"."user_id") "payments_total" ON (("c"."id" = "payments_total"."customer_id")))
     LEFT JOIN ( SELECT "credit_payouts"."customer_id", "credit_payouts"."user_id", "sum"("credit_payouts"."amount_paid") AS "total_payout" FROM "public"."credit_payouts" GROUP BY "credit_payouts"."customer_id", "credit_payouts"."user_id") "payouts_debit" ON (("c"."id" = "payouts_debit"."customer_id")));

CREATE OR REPLACE VIEW "public"."suppliers_with_balance" AS
 SELECT "s"."id", "s"."name", "s"."contact_person", "s"."phone", "s"."address", "s"."created_at", "s"."credit_balance", "s"."user_id", "s"."local_id", "s"."updated_at", "s"."is_active",
    COALESCE("sum"("p"."balance_due"), (0)::numeric) AS "balance_due"
   FROM ("public"."suppliers" "s" LEFT JOIN "public"."purchases" "p" ON (("s"."id" = "p"."supplier_id")))
  GROUP BY "s"."id", "s"."name", "s"."contact_person", "s"."phone", "s"."address", "s"."created_at", "s"."credit_balance", "s"."user_id", "s"."local_id", "s"."updated_at", "s"."is_active"
  ORDER BY "s"."name";

-- 10. RLS, Triggers aur Grants
ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own customers" ON "public"."customers" FOR SELECT USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can create their own customers" ON "public"."customers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can update their own customers" ON "public"."customers" FOR UPDATE USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can delete their own customers" ON "public"."customers" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can view their own suppliers" ON "public"."suppliers" FOR SELECT USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can insert their own suppliers" ON "public"."suppliers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can update their own suppliers" ON "public"."suppliers" FOR UPDATE USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can delete their own suppliers" ON "public"."suppliers" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

GRANT ALL ON TABLE "public"."customers" TO "anon", "authenticated", "service_role";
GRANT ALL ON TABLE "public"."suppliers" TO "anon", "authenticated", "service_role";