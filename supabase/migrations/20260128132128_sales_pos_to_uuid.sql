-- 1. Pehle un Views ko hatate hain jo in tables par depend karte hain
DROP VIEW IF EXISTS "public"."sales_history_view" CASCADE;
DROP VIEW IF EXISTS "public"."customers_with_balance" CASCADE;

-- 2. Purane Functions ko drop karte hain (UUID parameters ke liye)
DROP FUNCTION IF EXISTS "public"."process_sale_atomic"(jsonb, jsonb, jsonb) CASCADE;

-- 3. Un Policies ko hatate hain jo columns par depend karti hain
DROP POLICY IF EXISTS "Allow users to manage their own sale return items" ON "public"."sale_return_items";
DROP POLICY IF EXISTS "Allow users to manage their own sale returns" ON "public"."sale_returns";
DROP POLICY IF EXISTS "Users can create their own sales" ON "public"."sales";
DROP POLICY IF EXISTS "Users can view their own sales" ON "public"."sales";
DROP POLICY IF EXISTS "Users can update their own sales" ON "public"."sales";
DROP POLICY IF EXISTS "Users can delete their own sales" ON "public"."sales";
DROP POLICY IF EXISTS "Allow users to manage their own credit payouts" ON "public"."credit_payouts";
DROP POLICY IF EXISTS "Users can view their own payments" ON "public"."customer_payments";
DROP POLICY IF EXISTS "Users can create their own payments" ON "public"."customer_payments";
DROP POLICY IF EXISTS "Users can update their own peyments" ON "public"."customer_payments";
DROP POLICY IF EXISTS "Users can delete their own peyments" ON "public"."customer_payments";

-- 4. Purane Talluqaat (Constraints) khatam karte hain
ALTER TABLE IF EXISTS "public"."sale_items" DROP CONSTRAINT IF EXISTS "sale_items_sale_id_fkey";
ALTER TABLE IF EXISTS "public"."sale_return_items" DROP CONSTRAINT IF EXISTS "sale_return_items_return_id_fkey";
ALTER TABLE IF EXISTS "public"."sale_returns" DROP CONSTRAINT IF EXISTS "sale_returns_sale_id_fkey";

-- 5. IDENTITY property hatate hain (IMPORTANT: Taake UUID error na de)
ALTER TABLE "public"."sales" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
ALTER TABLE "public"."sale_items" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
ALTER TABLE "public"."sale_returns" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
ALTER TABLE "public"."sale_return_items" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
ALTER TABLE "public"."customer_payments" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
ALTER TABLE "public"."credit_payouts" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;

-- 6. 'NOT NULL' pabandiyan hatate hain conversion ke liye
ALTER TABLE "public"."sale_items" ALTER COLUMN "sale_id" DROP NOT NULL;
ALTER TABLE "public"."sale_returns" ALTER COLUMN "sale_id" DROP NOT NULL;
ALTER TABLE "public"."sale_return_items" ALTER COLUMN "return_id" DROP NOT NULL;

-- 7. Columns ka type badal kar UUID karte hain aur Defaults set karte hain
ALTER TABLE "public"."sales" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid(), ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."sale_items" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid(), ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "public"."sale_items" ALTER COLUMN "sale_id" TYPE uuid USING NULL;

ALTER TABLE "public"."sale_returns" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid(), ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "public"."sale_returns" ALTER COLUMN "sale_id" TYPE uuid USING NULL;

ALTER TABLE "public"."sale_return_items" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid(), ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "public"."sale_return_items" ALTER COLUMN "return_id" TYPE uuid USING NULL;

ALTER TABLE "public"."customer_payments" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid(), ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."credit_payouts" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid(), ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- 8. Talluqaat (Foreign Keys) dobara jorte hain
ALTER TABLE ONLY "public"."sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."sale_returns" ADD CONSTRAINT "sale_returns_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."sale_return_items" ADD CONSTRAINT "sale_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."sale_returns"("id") ON DELETE CASCADE;

-- 9. Atomic Sale Function ko UUID ke liye dobara banate hain
CREATE OR REPLACE FUNCTION "public"."process_sale_atomic"("p_sale_record" "jsonb", "p_sale_items" "jsonb", "p_inventory_updates" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_sale_id UUID;
    v_item RECORD;
    v_inv RECORD;
BEGIN
    INSERT INTO public.sales (id, local_id, customer_id, subtotal, discount, total_amount, payment_method, amount_paid_at_sale, payment_status, user_id, created_at)
    VALUES ((p_sale_record->>'id')::UUID, (p_sale_record->>'local_id')::UUID, (p_sale_record->>'customer_id')::UUID, (p_sale_record->>'subtotal')::NUMERIC, (p_sale_record->>'discount')::NUMERIC, (p_sale_record->>'total_amount')::NUMERIC, (p_sale_record->>'payment_method')::TEXT, (p_sale_record->>'amount_paid_at_sale')::NUMERIC, (p_sale_record->>'payment_status')::TEXT, auth.uid(), COALESCE((p_sale_record->>'created_at')::TIMESTAMPTZ, now()))
    RETURNING id INTO v_sale_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_sale_items) LOOP
        INSERT INTO public.sale_items (id, sale_id, inventory_id, product_id, product_name_snapshot, quantity, price_at_sale, user_id, warranty_expiry, local_id)
        VALUES (gen_random_uuid(), v_sale_id, (v_item.value->>'inventory_id')::UUID, (v_item.value->>'product_id')::UUID, (v_item.value->>'product_name_snapshot')::TEXT, (v_item.value->>'quantity')::INT, (v_item.value->>'price_at_sale')::NUMERIC, auth.uid(), (v_item.value->>'warranty_expiry')::TIMESTAMPTZ, (v_item.value->>'local_id')::UUID);
    END LOOP;

    FOR v_inv IN SELECT * FROM jsonb_array_elements(p_inventory_updates) LOOP
        UPDATE public.inventory SET available_qty = available_qty - (v_inv.value->>'qtySold')::INT, sold_qty = sold_qty + (v_inv.value->>'qtySold')::INT, status = CASE WHEN (available_qty - (v_inv.value->>'qtySold')::INT) <= 0 THEN 'Sold' ELSE 'Available' END
        WHERE id = (v_inv.value->>'id')::UUID;
    END LOOP;
    RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id);
END; $$;

-- 10. Views dobara banate hain
CREATE OR REPLACE VIEW "public"."sales_history_view" WITH ("security_invoker"='true') AS
 SELECT s.id AS sale_id, s.created_at, s.customer_id, COALESCE(c.name, 'Walk-in Customer'::text) AS customer_name, s.total_amount, s.payment_status, s.user_id, p.full_name AS salesperson_name,
    (SELECT sum(si.quantity) FROM public.sale_items si WHERE si.sale_id = s.id) AS total_items
   FROM public.sales s LEFT JOIN public.customers c ON s.customer_id = c.id LEFT JOIN public.profiles p ON s.user_id = p.user_id
  ORDER BY s.created_at DESC;

CREATE OR REPLACE VIEW "public"."customers_with_balance" AS
 SELECT "c"."id", "c"."name", "c"."phone_number", "c"."address", "c"."user_id", "c"."local_id", "c"."created_at", "c"."updated_at", "c"."is_active",
    ((COALESCE("sales_total"."total_udhaar", (0)::double precision) + (COALESCE("payouts_debit"."total_payout", (0)::numeric))::double precision) - COALESCE("payments_total"."total_wusooli", (0)::double precision)) AS "balance"
   FROM ((("public"."customers" "c"
     LEFT JOIN ( SELECT "sales"."customer_id", "sales"."user_id", "sum"(("sales"."total_amount" - ("sales"."amount_paid_at_sale")::double precision)) AS "total_udhaar" FROM "public"."sales" GROUP BY "sales"."customer_id", "sales"."user_id") "sales_total" ON (("c"."id" = "sales_total"."customer_id")))
     LEFT JOIN ( SELECT "customer_payments"."customer_id", "customer_payments"."user_id", "sum"("abs"("customer_payments"."amount_paid")) AS "total_wusooli" FROM "public"."customer_payments" GROUP BY "customer_payments"."customer_id", "customer_payments"."user_id") "payments_total" ON (("c"."id" = "payments_total"."customer_id")))
     LEFT JOIN ( SELECT "credit_payouts"."customer_id", "credit_payouts"."user_id", "sum"("credit_payouts"."amount_paid") AS "total_payout" FROM "public"."credit_payouts" GROUP BY "credit_payouts"."customer_id", "credit_payouts"."user_id") "payouts_debit" ON (("c"."id" = "payouts_debit"."customer_id")));

-- 11. Policies dobara lagate hain
ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sale_returns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sale_return_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."customer_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."credit_payouts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own sales" ON "public"."sales" FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view their own sales" ON "public"."sales" FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Allow users to manage their own sale returns" ON "public"."sale_returns" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Allow users to manage their own sale return items" ON "public"."sale_return_items" TO authenticated USING ((auth.uid() = ( SELECT sale_returns.user_id FROM public.sale_returns WHERE (sale_returns.id = sale_return_items.return_id)))) WITH CHECK ((auth.uid() = ( SELECT sale_returns.user_id FROM public.sale_returns WHERE (sale_returns.id = sale_return_items.return_id))));
CREATE POLICY "Allow users to manage their own credit payouts" ON "public"."credit_payouts" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can view their own payments" ON "public"."customer_payments" FOR SELECT USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can create their own payments" ON "public"."customer_payments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can update their own peyments" ON "public"."customer_payments" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can delete their own peyments" ON "public"."customer_payments" FOR DELETE USING (("auth"."uid"() = "user_id"));

-- 12. Permissions
GRANT ALL ON TABLE "public"."sales" TO anon, authenticated, service_role;
GRANT ALL ON TABLE "public"."sale_items" TO anon, authenticated, service_role;
GRANT ALL ON TABLE "public"."customer_payments" TO anon, authenticated, service_role;
GRANT ALL ON TABLE "public"."credit_payouts" TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION "public"."process_sale_atomic" TO authenticated;