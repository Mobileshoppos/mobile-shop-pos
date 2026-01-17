-- Step 1: Add 'is_active' column to the customers table
-- Default value is true, so all existing customers stay visible.
ALTER TABLE "public"."customers" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;

-- Step 2: Update the view 'customers_with_balance'
-- We must drop it first because we are adding a new column to it.
DROP VIEW IF EXISTS "public"."customers_with_balance";

-- Recreating the view with all original logic preserved, adding only 'is_active'.
CREATE OR REPLACE VIEW "public"."customers_with_balance" AS
 SELECT "c"."id",
    "c"."name",
    "c"."phone_number",
    "c"."address",
    "c"."user_id",
    "c"."local_id",
    "c"."created_at",
    "c"."updated_at",
    "c"."is_active", -- This is the new column added for Phase 4
    ((COALESCE("sales_total"."total_udhaar", (0)::double precision) + (COALESCE("payouts_debit"."total_payout", (0)::numeric))::double precision) - COALESCE("payments_total"."total_wusooli", (0)::double precision)) AS "balance"
   FROM ((("public"."customers" "c"
     LEFT JOIN ( SELECT "sales"."customer_id",
            "sales"."user_id",
            "sum"(("sales"."total_amount" - ("sales"."amount_paid_at_sale")::double precision)) AS "total_udhaar"
           FROM "public"."sales"
          GROUP BY "sales"."customer_id", "sales"."user_id") "sales_total" ON ((("c"."id" = "sales_total"."customer_id") AND ("c"."user_id" = "sales_total"."user_id"))))
     LEFT JOIN ( SELECT "customer_payments"."customer_id",
            "customer_payments"."user_id",
            "sum"("abs"("customer_payments"."amount_paid")) AS "total_wusooli"
           FROM "public"."customer_payments"
          GROUP BY "customer_payments"."customer_id", "customer_payments"."user_id") "payments_total" ON ((("c"."id" = "payments_total"."customer_id") AND ("c"."user_id" = "payments_total"."user_id"))))
     LEFT JOIN ( SELECT "credit_payouts"."customer_id",
            "credit_payouts"."user_id",
            "sum"("credit_payouts"."amount_paid") AS "total_payout"
           FROM "public"."credit_payouts"
          GROUP BY "credit_payouts"."customer_id", "credit_payouts"."user_id") "payouts_debit" ON ((("c"."id" = "payouts_debit"."customer_id") AND ("c"."user_id" = "payouts_debit"."user_id"))));

-- Step 3: Re-granting permissions for the view
-- This ensures the app can still read the data without issues.
GRANT ALL ON TABLE "public"."customers_with_balance" TO "anon";
GRANT ALL ON TABLE "public"."customers_with_balance" TO "authenticated";
GRANT ALL ON TABLE "public"."customers_with_balance" TO "service_role";