-- 1. Customers View ko Secure karna
DROP VIEW IF EXISTS "public"."customers_with_balance";

CREATE OR REPLACE VIEW "public"."customers_with_balance"
WITH (security_invoker = true) -- [SECURITY LOCK]
AS
SELECT "c"."id",
    "c"."name",
    "c"."phone_number",
    "c"."address",
    "c"."user_id",
    "c"."local_id",
    "c"."created_at",
    "c"."updated_at",
    "c"."is_active",
    ((COALESCE("sales_total"."total_udhaar", (0)::double precision) + (COALESCE("payouts_debit"."total_payout", (0)::numeric))::double precision) - COALESCE("payments_total"."total_wusooli", (0)::double precision)) AS "balance"
   FROM ((("public"."customers" "c"
     LEFT JOIN ( SELECT "sales"."customer_id",
            "sales"."user_id",
            "sum"(("sales"."total_amount" - ("sales"."amount_paid_at_sale")::double precision)) AS "total_udhaar"
           FROM "public"."sales"
          GROUP BY "sales"."customer_id", "sales"."user_id") "sales_total" ON (("c"."id" = "sales_total"."customer_id")))
     LEFT JOIN ( SELECT "customer_payments"."customer_id",
            "customer_payments"."user_id",
            "sum"("abs"("customer_payments"."amount_paid")) AS "total_wusooli"
           FROM "public"."customer_payments"
          GROUP BY "customer_payments"."customer_id", "customer_payments"."user_id") "payments_total" ON (("c"."id" = "payments_total"."customer_id")))
     LEFT JOIN ( SELECT "credit_payouts"."customer_id",
            "credit_payouts"."user_id",
            "sum"("credit_payouts"."amount_paid") AS "total_payout"
           FROM "public"."credit_payouts"
          GROUP BY "credit_payouts"."customer_id", "credit_payouts"."user_id") "payouts_debit" ON (("c"."id" = "payouts_debit"."customer_id")));


-- 2. Suppliers View ko Secure karna
DROP VIEW IF EXISTS "public"."suppliers_with_balance";

CREATE OR REPLACE VIEW "public"."suppliers_with_balance"
WITH (security_invoker = true) -- [SECURITY LOCK]
AS
SELECT "s"."id",
    "s"."name",
    "s"."contact_person",
    "s"."phone",
    "s"."address",
    "s"."created_at",
    "s"."credit_balance",
    "s"."user_id",
    "s"."local_id",
    "s"."updated_at",
    "s"."is_active",
    COALESCE("sum"("p"."balance_due"), (0)::numeric) AS "balance_due"
   FROM ("public"."suppliers" "s"
     LEFT JOIN "public"."purchases" "p" ON (("s"."id" = "p"."supplier_id")))
  GROUP BY "s"."id", "s"."name", "s"."contact_person", "s"."phone", "s"."address", "s"."created_at", "s"."credit_balance", "s"."user_id", "s"."local_id", "s"."updated_at", "s"."is_active";


-- 3. Payment Allocations Table ko Secure karna
ALTER TABLE "public"."payment_allocations" ENABLE ROW LEVEL SECURITY;

-- Policy: User sirf wahi allocations dekh/manage sake jo uski apni Payments se jurri hain
CREATE POLICY "Users can manage their own payment allocations"
ON "public"."payment_allocations"
USING (
  EXISTS (
    SELECT 1 FROM public.supplier_payments sp
    WHERE sp.id = payment_allocations.payment_id
    AND sp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.supplier_payments sp
    WHERE sp.id = payment_allocations.payment_id
    AND sp.user_id = auth.uid()
  )
);