


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."add_to_customer_balance"("customer_id_to_update" integer, "amount_to_add" double precision) RETURNS "void"
    LANGUAGE "sql"
    AS $$
  update public.customers
  set balance = balance + amount_to_add
  where id = customer_id_to_update;
$$;


ALTER FUNCTION "public"."add_to_customer_balance"("customer_id_to_update" integer, "amount_to_add" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_new_purchase"("p_supplier_id" integer, "p_notes" "text", "p_inventory_items" "jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_purchase_id BIGINT;
    item JSONB;
    total_purchase_amount NUMERIC(10, 2) := 0;
BEGIN
    -- Insert a new record into the 'purchases' table.
    INSERT INTO public.purchases (supplier_id, notes, total_amount, balance_due, status, user_id)
    VALUES (p_supplier_id, p_notes, 0, 0, 'unpaid', auth.uid())
    RETURNING id INTO new_purchase_id;

    -- Loop through each item and insert it into the 'inventory' table.
    FOR item IN SELECT * FROM jsonb_array_elements(p_inventory_items)
    LOOP
        INSERT INTO public.inventory (
            product_id, user_id, purchase_price, sale_price, condition,
            imei, color, ram_rom, guaranty, pta_status,
            supplier_id, purchase_id
        ) VALUES (
            (item->>'product_id')::BIGINT, auth.uid(), (item->>'purchase_price')::NUMERIC,
            (item->>'sale_price')::NUMERIC, (item->>'condition')::TEXT, (item->>'imei')::TEXT,
            (item->>'color')::TEXT, (item->>'ram_rom')::TEXT, (item->>'guaranty')::TEXT,
            (item->>'pta_status')::TEXT, p_supplier_id, new_purchase_id
        );

        -- Calculate the total purchase amount.
        total_purchase_amount := total_purchase_amount + (item->>'purchase_price')::NUMERIC;
    END LOOP;

    -- Update the 'purchases' record with the correct total amount AND balance_due.
    UPDATE public.purchases
    SET
        total_amount = total_purchase_amount,
        balance_due = total_purchase_amount
    WHERE id = new_purchase_id;

    -- Return the ID of the newly created purchase record.
    RETURN new_purchase_id;
END;
$$;


ALTER FUNCTION "public"."create_new_purchase"("p_supplier_id" integer, "p_notes" "text", "p_inventory_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_customer_ledger"("p_customer_id" "uuid") RETURNS TABLE("transaction_date" timestamp with time zone, "description" "text", "debit" numeric, "credit" numeric, "balance" numeric, "transaction_type" "text", "reference_id" bigint)
    LANGUAGE "plpgsql"
    AS $$
begin
    return query
    with all_transactions as (
        -- Select all sales for the customer
        select
            s.created_at,
            'Sale (Invoice #' || s.id::text || ')' as description,
            coalesce(s.total_amount, 0) - coalesce(s.amount_paid_at_sale, 0) as debit,
            0 as credit,
            'sale' as transaction_type,
            s.id as reference_id
        from
            public.sales s
        where
            s.customer_id = p_customer_id

        union all

        -- Select all payments for the customer
        select
            cp.created_at,
            'Payment Received' as description,
            0 as debit,
            coalesce(cp.amount_paid, 0) as credit,
            'payment' as transaction_type,
            cp.id as reference_id
        from
            public.customer_payments cp
        where
            cp.customer_id = p_customer_id
    ),
    ordered_transactions as (
        -- Order all transactions by date to calculate running balance correctly
        select
            *,
            sum(at.debit - at.credit) over (order by at.created_at, at.reference_id) as running_balance
        from
            all_transactions at
    )
    -- Select final columns
    select
        ot.created_at as transaction_date,
        ot.description,
        ot.debit,
        ot.credit,
        ot.running_balance as balance,
        ot.transaction_type,
        ot.reference_id
    from
        ordered_transactions ot
    order by
        ot.created_at desc, ot.reference_id desc;
end;
$$;


ALTER FUNCTION "public"."get_customer_ledger"("p_customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_variants"("p_product_id" bigint) RETURNS TABLE("quantity" bigint, "purchase_price" numeric, "sale_price" numeric, "details" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) AS quantity,
        inv.purchase_price,
        inv.sale_price,
        jsonb_build_object(
            'condition', inv.condition,
            'color', inv.color,
            'ram_rom', inv.ram_rom,
            'pta_status', inv.pta_status,
            'guaranty', inv.guaranty
        ) AS details
    FROM
        inventory inv
    WHERE
        inv.product_id = p_product_id
        -- THE FIX IS HERE: We now only group and count items with 'Available' status.
        AND inv.status = 'Available'
    GROUP BY
        inv.purchase_price,
        inv.sale_price,
        inv.condition,
        inv.color,
        inv.ram_rom,
        inv.pta_status,
        inv.guaranty
    ORDER BY
        inv.purchase_price,
        inv.sale_price;
END;
$$;


ALTER FUNCTION "public"."get_product_variants"("p_product_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_products_with_quantity"() RETURNS TABLE("id" bigint, "name" "text", "category_id" bigint, "brand" "text", "purchase_price" numeric, "sale_price" numeric, "user_id" "uuid", "created_at" timestamp with time zone, "quantity" bigint, "categories" json)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.category_id,
        p.brand,
        p.purchase_price,
        p.sale_price,
        p.user_id,
        p.created_at,
        (SELECT count(i.id) FROM public.inventory i WHERE i.product_id = p.id AND i.status = 'Available'::text) AS quantity,
        json_build_object('name', c.name) as categories
    FROM
        public.products p
    LEFT JOIN
        public.categories c ON p.category_id = c.id
    WHERE
        p.user_id = auth.uid(); -- This is the security line that was missing!
END;
$$;


ALTER FUNCTION "public"."get_products_with_quantity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sale_details"("p_sale_id" bigint) RETURNS json
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT json_build_object(
    'shopName', prof.shop_name,
    'shopAddress', prof.address,
    'shopPhone', prof.phone_number,
    'saleId', s.id,
    'saleDate', s.created_at,
    'customerName', COALESCE(c.name, 'Walk-in Customer'),
    'items', (
      SELECT json_agg(
        json_build_object(
          'name', p.name,
          'quantity', si.quantity,
          'price_at_sale', si.price_at_sale
        )
      )
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = s.id
    ),
    'subtotal', s.subtotal,
    'discount', s.discount,
    'grandTotal', s.total_amount,
    'amountPaid', s.amount_paid_at_sale,
    'paymentStatus', s.payment_status
  )
  FROM 
    sales s
  LEFT JOIN 
    customers c ON s.customer_id = c.id
  LEFT JOIN 
    profiles prof ON s.user_id = prof.user_id
  WHERE 
    s.id = p_sale_id;
$$;


ALTER FUNCTION "public"."get_sale_details"("p_sale_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_supplier_purchase_report"("start_date" "date", "end_date" "date") RETURNS TABLE("supplier_name" "text", "total_purchase_amount" numeric, "purchase_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
    SELECT
        s.name AS supplier_name,
        SUM(p.total_amount) AS total_purchase_amount,
        COUNT(p.id) AS purchase_count
    FROM
        public.purchases p
    JOIN
        public.suppliers s ON p.supplier_id = s.id
    WHERE
        p.purchase_date >= start_date AND p.purchase_date <= end_date
    GROUP BY
        s.name
    ORDER BY
        total_purchase_amount DESC;
$$;


ALTER FUNCTION "public"."get_supplier_purchase_report"("start_date" "date", "end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_categories_with_settings"() RETURNS TABLE("id" bigint, "created_at" timestamp with time zone, "name" "text", "user_id" "uuid", "is_visible" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.created_at,
        c.name,
        c.user_id,
        COALESCE(ucs.is_visible, TRUE) as is_visible
    FROM
        categories c
    LEFT JOIN
        user_category_settings ucs ON c.id = ucs.category_id AND ucs.user_id = auth.uid()
    WHERE
        c.user_id IS NULL OR c.user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."get_user_categories_with_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- Insert a new row into public.profiles, setting the user_id to the new user's id
  insert into public.profiles (user_id)
  values (new.id);
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."moddatetime"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


ALTER FUNCTION "public"."moddatetime"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_purchase_return"("p_purchase_id" integer, "p_item_ids" integer[], "p_return_date" "date", "p_notes" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_supplier_id integer;
    v_total_return_amount numeric := 0;
    v_new_return_id bigint;
    item_record record;
    v_purchase_balance_due numeric;
    v_return_to_clear_debt numeric;
    v_credit_to_add numeric;
BEGIN
    -- Get supplier_id and current balance from the purchase
    SELECT supplier_id, balance_due INTO v_supplier_id, v_purchase_balance_due
    FROM public.purchases WHERE id = p_purchase_id;

    -- Calculate the total value of the items being returned
    SELECT COALESCE(SUM(purchase_price), 0) INTO v_total_return_amount
    FROM public.inventory WHERE id = ANY(p_item_ids);

    IF v_total_return_amount <= 0 THEN RETURN; END IF;

    -- Determine how much of the return clears debt and how much becomes credit
    v_return_to_clear_debt := LEAST(v_total_return_amount, v_purchase_balance_due);
    v_credit_to_add := v_total_return_amount - v_return_to_clear_debt;

    -- Create a new record in the purchase_returns table
    INSERT INTO public.purchase_returns (purchase_id, supplier_id, return_date, total_return_amount, notes, user_id)
    VALUES (p_purchase_id, v_supplier_id, p_return_date, v_total_return_amount, p_notes, auth.uid())
    RETURNING id INTO v_new_return_id;

    -- Log returned items and then delete them from active inventory
    FOR item_record IN SELECT * FROM public.inventory WHERE id = ANY(p_item_ids) LOOP
        INSERT INTO public.purchase_return_items (return_id, product_id, inventory_id_original, imei, purchase_price, user_id)
        VALUES (v_new_return_id, item_record.product_id, item_record.id, item_record.imei, item_record.purchase_price, auth.uid());
    END LOOP;
    DELETE FROM public.inventory WHERE id = ANY(p_item_ids);

    -- Update the original purchase record. Balance will not go below zero.
    UPDATE public.purchases
    SET
        total_amount = total_amount - v_total_return_amount,
        balance_due = balance_due - v_return_to_clear_debt
    WHERE id = p_purchase_id;

    -- Add any excess return value to the supplier's credit balance
    IF v_credit_to_add > 0 THEN
        UPDATE public.suppliers
        SET credit_balance = credit_balance + v_credit_to_add
        WHERE id = v_supplier_id;
    END IF;

    -- Finally, update the status of the purchase
    UPDATE public.purchases
    SET status = CASE
        WHEN balance_due <= 0 THEN 'paid'
        ELSE 'partially_paid'
    END
    WHERE id = p_purchase_id;
END;
$$;


ALTER FUNCTION "public"."process_purchase_return"("p_purchase_id" integer, "p_item_ids" integer[], "p_return_date" "date", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_bulk_supplier_payment"("p_supplier_id" integer, "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "date", "p_notes" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    unpaid_purchase RECORD;
    remaining_amount numeric := p_amount;
    payment_to_apply numeric;
BEGIN
    -- Record the full payment in the supplier_payments table
    INSERT INTO public.supplier_payments (supplier_id, amount, payment_method, payment_date, notes, purchase_id, user_id)
    VALUES (p_supplier_id, p_amount, p_payment_method, p_payment_date, p_notes, NULL, auth.uid());

    -- Loop through unpaid purchases (oldest first) to apply the payment
    FOR unpaid_purchase IN
        SELECT id, balance_due FROM public.purchases
        WHERE supplier_id = p_supplier_id AND balance_due > 0
        ORDER BY purchase_date ASC
    LOOP
        IF remaining_amount <= 0 THEN EXIT; END IF;

        payment_to_apply := LEAST(remaining_amount, unpaid_purchase.balance_due);

        UPDATE public.purchases
        SET amount_paid = amount_paid + payment_to_apply,
            balance_due = balance_due - payment_to_apply
        WHERE id = unpaid_purchase.id;

        remaining_amount := remaining_amount - payment_to_apply;
    END LOOP;

    -- Add any leftover amount to the supplier's credit balance
    IF remaining_amount > 0 THEN
        UPDATE public.suppliers
        SET credit_balance = credit_balance + remaining_amount
        WHERE id = p_supplier_id;
    END IF;

    -- Update the status of all purchases for this supplier
    UPDATE public.purchases
    SET status = CASE
        WHEN balance_due <= 0 THEN 'paid'
        WHEN amount_paid > 0 AND balance_due > 0 THEN 'partially_paid'
        ELSE 'unpaid'
    END
    WHERE supplier_id = p_supplier_id;
END;
$$;


ALTER FUNCTION "public"."record_bulk_supplier_payment"("p_supplier_id" integer, "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "date", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_purchase_payment"("p_supplier_id" integer, "p_purchase_id" integer, "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "date", "p_notes" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_balance_due numeric;
    v_payment_to_apply numeric;
    v_credit_to_add numeric;
BEGIN
    -- Get the current balance of the specific purchase
    SELECT balance_due INTO v_balance_due FROM public.purchases WHERE id = p_purchase_id;

    -- Determine how much payment to apply to the purchase and how much becomes credit
    IF p_amount >= v_balance_due THEN
        v_payment_to_apply := v_balance_due;
        v_credit_to_add := p_amount - v_balance_due;
    ELSE
        v_payment_to_apply := p_amount;
        v_credit_to_add := 0;
    END IF;

    -- Record the full payment in the supplier_payments table
    INSERT INTO public.supplier_payments (supplier_id, purchase_id, amount, payment_method, payment_date, notes, user_id)
    VALUES (p_supplier_id, p_purchase_id, p_amount, p_payment_method, p_payment_date, p_notes, auth.uid());

    -- Apply payment to the purchase, ensuring its balance does not go below zero
    IF v_payment_to_apply > 0 THEN
        UPDATE public.purchases
        SET
            amount_paid = amount_paid + v_payment_to_apply,
            balance_due = balance_due - v_payment_to_apply
        WHERE id = p_purchase_id;
    END IF;

    -- Add any overpayment to the supplier's credit balance
    IF v_credit_to_add > 0 THEN
        UPDATE public.suppliers
        SET credit_balance = credit_balance + v_credit_to_add
        WHERE id = p_supplier_id;
    END IF;

    -- Update the status of the affected purchase
    UPDATE public.purchases
    SET status = CASE
        WHEN balance_due <= 0 THEN 'paid'
        ELSE 'partially_paid'
    END
    WHERE id = p_purchase_id;
END;
$$;


ALTER FUNCTION "public"."record_purchase_payment"("p_supplier_id" integer, "p_purchase_id" integer, "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "date", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_supplier_payment"("p_supplier_id" bigint, "p_purchase_id" bigint, "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "date", "p_notes" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_balance_due NUMERIC;
    new_balance_due NUMERIC;
    total_purchase_amount NUMERIC;
BEGIN
    -- Insert the new payment record
    INSERT INTO public.supplier_payments (
        supplier_id, purchase_id, amount, payment_method, payment_date, notes, user_id
    ) VALUES (
        p_supplier_id, p_purchase_id, p_amount, p_payment_method, p_payment_date, p_notes, auth.uid()
    );

    -- Get current financial details of the purchase, locking the row
    SELECT total_amount, balance_due
    INTO total_purchase_amount, current_balance_due
    FROM public.purchases
    WHERE id = p_purchase_id
    FOR UPDATE;

    -- Calculate the new balance
    new_balance_due := current_balance_due - p_amount;
    IF new_balance_due < 0 THEN
        new_balance_due := 0;
    END IF;

    -- Update the purchase record with the new financial status
    UPDATE public.purchases
    SET
        amount_paid = total_purchase_amount - new_balance_due,
        balance_due = new_balance_due,
        status = CASE
            WHEN new_balance_due <= 0 THEN 'paid'
            ELSE 'partially_paid'
        END
    WHERE id = p_purchase_id;

END;
$$;


ALTER FUNCTION "public"."record_supplier_payment"("p_supplier_id" bigint, "p_purchase_id" bigint, "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "date", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_supplier_refund"("p_supplier_id" integer, "p_amount" numeric, "p_refund_method" "text", "p_refund_date" "date", "p_notes" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_credit numeric;
BEGIN
    -- Step 1: Get the current credit balance for the supplier
    SELECT credit_balance INTO current_credit FROM public.suppliers WHERE id = p_supplier_id;

    -- Step 2: Check if the refund amount is valid
    IF p_amount > current_credit THEN
        RAISE EXCEPTION 'Refund amount cannot be greater than the current credit balance.';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Refund amount must be positive.';
    END IF;

    -- Step 3: Decrease the supplier's credit balance
    UPDATE public.suppliers
    SET credit_balance = credit_balance - p_amount
    WHERE id = p_supplier_id;

    -- Step 4: Record this transaction in the supplier_payments table.
    INSERT INTO public.supplier_payments (supplier_id, amount, payment_method, payment_date, notes, purchase_id, user_id)
    VALUES (p_supplier_id, -p_amount, p_refund_method, p_refund_date, p_notes, NULL, auth.uid());

END;
$$;


ALTER FUNCTION "public"."record_supplier_refund"("p_supplier_id" integer, "p_amount" numeric, "p_refund_method" "text", "p_refund_date" "date", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."subtract_from_customer_balance"("customer_id_to_update" integer, "amount_to_subtract" double precision) RETURNS "void"
    LANGUAGE "sql"
    AS $$
  update public.customers
  set balance = balance - amount_to_subtract
  where id = customer_id_to_update;
$$;


ALTER FUNCTION "public"."subtract_from_customer_balance"("customer_id_to_update" integer, "amount_to_subtract" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_purchase"("p_purchase_id" integer, "p_notes" "text", "p_inventory_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    item_data jsonb;
    new_total_amount numeric := 0;
    current_amount_paid numeric;
BEGIN
    -- Step 1: Update the purchase notes
    UPDATE public.purchases
    SET notes = p_notes
    WHERE id = p_purchase_id;

    -- Step 2: Loop through and update each inventory item
    FOR item_data IN SELECT * FROM jsonb_array_elements(p_inventory_items)
    LOOP
        UPDATE public.inventory
        SET
            purchase_price = (item_data->>'purchase_price')::numeric,
            sale_price = (item_data->>'sale_price')::numeric,
            condition = (item_data->>'condition')::text,
            pta_status = (item_data->>'pta_status')::text,
            color = (item_data->>'color')::text,
            ram_rom = (item_data->>'ram_rom')::text,
            guaranty = (item_data->>'guaranty')::text,
            imei = (item_data->>'imei')::text
        WHERE id = (item_data->>'id')::integer;

        -- Add the new purchase price to the running total
        new_total_amount := new_total_amount + (item_data->>'purchase_price')::numeric;
    END LOOP;

    -- Step 3: Get the current amount paid for this purchase
    SELECT amount_paid INTO current_amount_paid
    FROM public.purchases
    WHERE id = p_purchase_id;

    -- Step 4: Update the purchase totals and status
    UPDATE public.purchases
    SET
        total_amount = new_total_amount,
        balance_due = new_total_amount - current_amount_paid,
        status = CASE
            WHEN new_total_amount - current_amount_paid <= 0 THEN 'paid'
            WHEN current_amount_paid > 0 AND new_total_amount - current_amount_paid > 0 THEN 'partially_paid'
            ELSE 'unpaid'
        END
    WHERE id = p_purchase_id;

END;
$$;


ALTER FUNCTION "public"."update_purchase"("p_purchase_id" integer, "p_notes" "text", "p_inventory_items" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


ALTER TABLE "public"."categories" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."customer_payments" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "customer_id" bigint,
    "amount_paid" double precision,
    "payment_method" "text",
    "user_id" "uuid" DEFAULT "auth"."uid"()
);


ALTER TABLE "public"."customer_payments" OWNER TO "postgres";


ALTER TABLE "public"."customer_payments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."customer_payments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "phone_number" "text",
    "address" "text",
    "balance" double precision DEFAULT '0'::double precision,
    "user_id" "uuid" DEFAULT "auth"."uid"()
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


ALTER TABLE "public"."customers" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."customers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "total_amount" double precision,
    "customer_id" bigint,
    "payment_status" "text" DEFAULT 'Paid'::"text",
    "subtotal" numeric DEFAULT '0'::numeric NOT NULL,
    "discount" numeric DEFAULT '0'::numeric NOT NULL,
    "amount_paid_at_sale" numeric DEFAULT '0'::numeric NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"()
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."customers_with_balance" WITH ("security_invoker"='true') AS
 SELECT "c"."id",
    "c"."name",
    "c"."phone_number",
    "c"."address",
    "c"."user_id",
    (COALESCE("sales_total"."total_udhaar", (0)::double precision) - COALESCE("payments_total"."total_wusooli", (0)::double precision)) AS "balance"
   FROM (("public"."customers" "c"
     LEFT JOIN ( SELECT "sales"."customer_id",
            "sales"."user_id",
            "sum"(("sales"."total_amount" - ("sales"."amount_paid_at_sale")::double precision)) AS "total_udhaar"
           FROM "public"."sales"
          GROUP BY "sales"."customer_id", "sales"."user_id") "sales_total" ON ((("c"."id" = "sales_total"."customer_id") AND ("c"."user_id" = "sales_total"."user_id"))))
     LEFT JOIN ( SELECT "customer_payments"."customer_id",
            "customer_payments"."user_id",
            "sum"("customer_payments"."amount_paid") AS "total_wusooli"
           FROM "public"."customer_payments"
          GROUP BY "customer_payments"."customer_id", "customer_payments"."user_id") "payments_total" ON ((("c"."id" = "payments_total"."customer_id") AND ("c"."user_id" = "payments_total"."user_id"))));


ALTER VIEW "public"."customers_with_balance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dummy_test_table" (
    "id" bigint NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dummy_test_table" OWNER TO "postgres";


ALTER TABLE "public"."dummy_test_table" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."dummy_test_table_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."expense_categories" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "public"."expense_categories" OWNER TO "postgres";


ALTER TABLE "public"."expense_categories" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."expense_categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "expense_date" "date" DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category_id" bigint NOT NULL,
    CONSTRAINT "expenses_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


ALTER TABLE "public"."expenses" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."expenses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."inventory" (
    "id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "imei" "text",
    "color" "text",
    "condition" "text",
    "purchase_price" numeric,
    "sale_price" numeric,
    "status" "text" DEFAULT 'Available'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ram_rom" "text",
    "guaranty" "text",
    "pta_status" "text",
    "user_id" "uuid" NOT NULL,
    "supplier_id" bigint,
    "purchase_id" bigint
);


ALTER TABLE "public"."inventory" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory" IS 'Stores individual stock items, linking them to a master product.';



ALTER TABLE "public"."inventory" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."inventory_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "brand" "text",
    "purchase_price" double precision,
    "sale_price" double precision,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "category_id" bigint,
    "is_featured" boolean DEFAULT false NOT NULL,
    "barcode" "text"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."products"."barcode" IS 'Stores the barcode or QR code value associated with the product model.';



CREATE OR REPLACE VIEW "public"."products_display_view" AS
SELECT
    NULL::bigint AS "id",
    NULL::"text" AS "name",
    NULL::"text" AS "brand",
    NULL::"text" AS "barcode",
    NULL::double precision AS "default_purchase_price",
    NULL::double precision AS "default_sale_price",
    NULL::"text" AS "category_name",
    NULL::bigint AS "quantity",
    NULL::numeric AS "min_sale_price",
    NULL::numeric AS "max_sale_price";


ALTER VIEW "public"."products_display_view" OWNER TO "postgres";


ALTER TABLE "public"."products" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."products_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."products_with_quantity" AS
 SELECT "p"."id",
    "p"."name",
    "p"."brand",
    "p"."purchase_price",
    "p"."sale_price",
    "p"."category_id",
    "p"."user_id",
    "p"."created_at",
    "count"("i"."id") AS "quantity"
   FROM ("public"."products" "p"
     LEFT JOIN "public"."inventory" "i" ON (("p"."id" = "i"."product_id")))
  GROUP BY "p"."id", "p"."name", "p"."brand", "p"."purchase_price", "p"."sale_price", "p"."category_id", "p"."user_id", "p"."created_at";


ALTER VIEW "public"."products_with_quantity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "shop_name" "text",
    "phone_number" "text",
    "address" "text",
    "updated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "full_name" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Stores public profile information for each user.';



COMMENT ON COLUMN "public"."profiles"."id" IS 'Primary key for the profile.';



COMMENT ON COLUMN "public"."profiles"."user_id" IS 'Foreign key reference to the auth.users table.';



COMMENT ON COLUMN "public"."profiles"."full_name" IS 'Stores the full name of the user.';



CREATE TABLE IF NOT EXISTS "public"."purchase_items" (
    "id" bigint NOT NULL,
    "purchase_id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "quantity" integer NOT NULL,
    "purchase_price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "purchase_items_purchase_price_check" CHECK (("purchase_price" >= (0)::numeric)),
    CONSTRAINT "purchase_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."purchase_items" OWNER TO "postgres";


ALTER TABLE "public"."purchase_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."purchase_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."purchase_return_items" (
    "id" bigint NOT NULL,
    "return_id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "inventory_id_original" bigint NOT NULL,
    "imei" "text",
    "purchase_price" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."purchase_return_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."purchase_return_items" IS 'Stores the individual items that were part of a purchase return.';



COMMENT ON COLUMN "public"."purchase_return_items"."inventory_id_original" IS 'The ID of the item in the inventory table before it was deleted.';



ALTER TABLE "public"."purchase_return_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."purchase_return_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."purchase_returns" (
    "id" bigint NOT NULL,
    "purchase_id" bigint NOT NULL,
    "supplier_id" bigint NOT NULL,
    "return_date" "date" DEFAULT "now"() NOT NULL,
    "total_return_amount" numeric NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    CONSTRAINT "purchase_returns_total_return_amount_check" CHECK (("total_return_amount" >= (0)::numeric))
);


ALTER TABLE "public"."purchase_returns" OWNER TO "postgres";


COMMENT ON TABLE "public"."purchase_returns" IS 'Stores a record for each purchase return transaction.';



ALTER TABLE "public"."purchase_returns" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."purchase_returns_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."purchases" (
    "id" bigint NOT NULL,
    "supplier_id" bigint,
    "purchase_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "total_amount" numeric(10,2) DEFAULT 0.00,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'unpaid'::"text" NOT NULL,
    "amount_paid" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "balance_due" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "user_id" "uuid" NOT NULL,
    CONSTRAINT "purchases_status_check" CHECK (("status" = ANY (ARRAY['unpaid'::"text", 'partially_paid'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."purchases" OWNER TO "postgres";


ALTER TABLE "public"."purchases" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."purchases_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sale_items" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sale_id" bigint,
    "product_id" bigint,
    "quantity" bigint,
    "price_at_sale" double precision,
    "user_id" "uuid" DEFAULT "auth"."uid"()
);


ALTER TABLE "public"."sale_items" OWNER TO "postgres";


ALTER TABLE "public"."sale_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."sale_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."sales_history_view" WITH ("security_invoker"='true') AS
 SELECT "s"."id" AS "sale_id",
    "s"."created_at",
    "s"."customer_id",
    COALESCE("c"."name", 'Walk-in Customer'::"text") AS "customer_name",
    "s"."total_amount",
    "s"."payment_status",
    "s"."user_id",
    "p"."full_name" AS "salesperson_name",
    ( SELECT "sum"("si"."quantity") AS "sum"
           FROM "public"."sale_items" "si"
          WHERE ("si"."sale_id" = "s"."id")) AS "total_items"
   FROM (("public"."sales" "s"
     LEFT JOIN "public"."customers" "c" ON (("s"."customer_id" = "c"."id")))
     LEFT JOIN "public"."profiles" "p" ON (("s"."user_id" = "p"."id")))
  ORDER BY "s"."created_at" DESC;


ALTER VIEW "public"."sales_history_view" OWNER TO "postgres";


ALTER TABLE "public"."sales" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."sales_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."supplier_payments" (
    "id" bigint NOT NULL,
    "supplier_id" bigint NOT NULL,
    "purchase_id" bigint,
    "amount" numeric(10,2) NOT NULL,
    "payment_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "payment_method" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    CONSTRAINT "supplier_payments_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['Cash'::"text", 'Bank Transfer'::"text", 'Cheque'::"text", 'Other'::"text"])))
);


ALTER TABLE "public"."supplier_payments" OWNER TO "postgres";


ALTER TABLE "public"."supplier_payments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."supplier_payments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "contact_person" "text",
    "phone" "text",
    "address" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "credit_balance" numeric DEFAULT 0 NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    CONSTRAINT "suppliers_credit_balance_check" CHECK (("credit_balance" >= (0)::numeric))
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."suppliers"."credit_balance" IS 'Stores the advance payment or credit amount a supplier owes to us.';



ALTER TABLE "public"."suppliers" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."suppliers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."suppliers_with_balance" WITH ("security_invoker"='true') AS
 SELECT "s"."id",
    "s"."name",
    "s"."contact_person",
    "s"."phone",
    "s"."address",
    "s"."created_at",
    COALESCE("sum"("p"."balance_due"), (0)::numeric) AS "balance_due"
   FROM ("public"."suppliers" "s"
     LEFT JOIN "public"."purchases" "p" ON (("s"."id" = "p"."supplier_id")))
  GROUP BY "s"."id", "s"."name", "s"."contact_person", "s"."phone", "s"."address", "s"."created_at"
  ORDER BY "s"."name";


ALTER VIEW "public"."suppliers_with_balance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_category_settings" (
    "user_id" "uuid" NOT NULL,
    "category_id" bigint NOT NULL,
    "is_visible" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."user_category_settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_payments"
    ADD CONSTRAINT "customer_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dummy_test_table"
    ADD CONSTRAINT "dummy_test_table_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_categories"
    ADD CONSTRAINT "expense_categories_name_user_id_key" UNIQUE ("name", "user_id");



ALTER TABLE ONLY "public"."expense_categories"
    ADD CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_barcode_key" UNIQUE ("barcode");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."purchase_items"
    ADD CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_return_items"
    ADD CONSTRAINT "purchase_return_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_returns"
    ADD CONSTRAINT "purchase_returns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "unique_imei_per_user" UNIQUE ("user_id", "imei");



ALTER TABLE ONLY "public"."user_category_settings"
    ADD CONSTRAINT "user_category_settings_pkey" PRIMARY KEY ("user_id", "category_id");



CREATE INDEX "idx_inventory_user_id" ON "public"."inventory" USING "btree" ("user_id");



CREATE OR REPLACE VIEW "public"."products_display_view" AS
 SELECT "p"."id",
    "p"."name",
    "p"."brand",
    "p"."barcode",
    "p"."purchase_price" AS "default_purchase_price",
    "p"."sale_price" AS "default_sale_price",
    "c"."name" AS "category_name",
    "count"("i"."id") FILTER (WHERE ("i"."status" = 'Available'::"text")) AS "quantity",
    "min"("i"."sale_price") AS "min_sale_price",
    "max"("i"."sale_price") AS "max_sale_price"
   FROM (("public"."products" "p"
     LEFT JOIN "public"."inventory" "i" ON (("p"."id" = "i"."product_id")))
     LEFT JOIN "public"."categories" "c" ON (("p"."category_id" = "c"."id")))
  WHERE ("p"."user_id" = "auth"."uid"())
  GROUP BY "p"."id", "c"."name";



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."moddatetime"();



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_payments"
    ADD CONSTRAINT "customer_payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."expense_categories"
    ADD CONSTRAINT "expense_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "fk_inventory_purchase" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "fk_inventory_supplier" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_items"
    ADD CONSTRAINT "purchase_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."purchase_items"
    ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_return_items"
    ADD CONSTRAINT "purchase_return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."purchase_return_items"
    ADD CONSTRAINT "purchase_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."purchase_returns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_return_items"
    ADD CONSTRAINT "purchase_return_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."purchase_returns"
    ADD CONSTRAINT "purchase_returns_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id");



ALTER TABLE ONLY "public"."purchase_returns"
    ADD CONSTRAINT "purchase_returns_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."purchase_returns"
    ADD CONSTRAINT "purchase_returns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_category_settings"
    ADD CONSTRAINT "user_category_settings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_category_settings"
    ADD CONSTRAINT "user_category_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow authenticated users to manage purchase_items" ON "public"."purchase_items" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow users to manage their own supplier payments" ON "public"."supplier_payments" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow viewing of own and default categories" ON "public"."categories" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Allow viewing of own and default expense categories" ON "public"."expense_categories" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can create categories" ON "public"."categories" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own categories" ON "public"."expense_categories" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own customers" ON "public"."customers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own payments" ON "public"."customer_payments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own products" ON "public"."products" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own sale_items" ON "public"."sale_items" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own sales" ON "public"."sales" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own settings" ON "public"."user_category_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own categories" ON "public"."categories" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own categories" ON "public"."expense_categories" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own customers" ON "public"."customers" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own peyments" ON "public"."customer_payments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own products" ON "public"."products" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own products." ON "public"."products" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own purchases" ON "public"."purchases" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own sale_items" ON "public"."sale_items" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own sales" ON "public"."sales" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own suppliers" ON "public"."suppliers" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own products." ON "public"."products" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own purchases" ON "public"."purchases" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own stock" ON "public"."inventory" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own suppliers" ON "public"."suppliers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage inventory for their own products." ON "public"."inventory" USING (("auth"."uid"() = ( SELECT "products"."user_id"
   FROM "public"."products"
  WHERE ("products"."id" = "inventory"."product_id"))));



CREATE POLICY "Users can manage their own expenses" ON "public"."expenses" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own payments" ON "public"."supplier_payments" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own purchase returns" ON "public"."purchase_returns" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own return items" ON "public"."purchase_return_items" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own categories" ON "public"."categories" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own categories" ON "public"."expense_categories" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own customers" ON "public"."customers" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own peyments" ON "public"."customer_payments" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own products" ON "public"."products" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own products." ON "public"."products" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own purchases" ON "public"."purchases" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own sale_items" ON "public"."sale_items" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own sales" ON "public"."sales" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own settings" ON "public"."user_category_settings" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own suppliers" ON "public"."suppliers" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own customers" ON "public"."customers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own inventory" ON "public"."inventory" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own payments" ON "public"."customer_payments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own products" ON "public"."products" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own products." ON "public"."products" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile." ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own purchase return items." ON "public"."purchase_return_items" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own purchase returns." ON "public"."purchase_returns" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own purchases" ON "public"."purchases" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own purchases." ON "public"."purchases" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own sale_items" ON "public"."sale_items" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own sales" ON "public"."sales" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own settings" ON "public"."user_category_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own supplier payments." ON "public"."supplier_payments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own suppliers" ON "public"."suppliers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own suppliers." ON "public"."suppliers" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expense_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_return_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_returns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sale_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_category_settings" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."add_to_customer_balance"("customer_id_to_update" integer, "amount_to_add" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."add_to_customer_balance"("customer_id_to_update" integer, "amount_to_add" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_to_customer_balance"("customer_id_to_update" integer, "amount_to_add" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_new_purchase"("p_supplier_id" integer, "p_notes" "text", "p_inventory_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_new_purchase"("p_supplier_id" integer, "p_notes" "text", "p_inventory_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_new_purchase"("p_supplier_id" integer, "p_notes" "text", "p_inventory_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_customer_ledger"("p_customer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_customer_ledger"("p_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_customer_ledger"("p_customer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_variants"("p_product_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_variants"("p_product_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_variants"("p_product_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_products_with_quantity"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_products_with_quantity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_products_with_quantity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sale_details"("p_sale_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_sale_details"("p_sale_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sale_details"("p_sale_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_supplier_purchase_report"("start_date" "date", "end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_supplier_purchase_report"("start_date" "date", "end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_supplier_purchase_report"("start_date" "date", "end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_categories_with_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_categories_with_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_categories_with_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."moddatetime"() TO "anon";
GRANT ALL ON FUNCTION "public"."moddatetime"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."moddatetime"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_purchase_return"("p_purchase_id" integer, "p_item_ids" integer[], "p_return_date" "date", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_purchase_return"("p_purchase_id" integer, "p_item_ids" integer[], "p_return_date" "date", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_purchase_return"("p_purchase_id" integer, "p_item_ids" integer[], "p_return_date" "date", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_bulk_supplier_payment"("p_supplier_id" integer, "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "date", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_bulk_supplier_payment"("p_supplier_id" integer, "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "date", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_bulk_supplier_payment"("p_supplier_id" integer, "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "date", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_purchase_payment"("p_supplier_id" integer, "p_purchase_id" integer, "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "date", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_purchase_payment"("p_supplier_id" integer, "p_purchase_id" integer, "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "date", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_purchase_payment"("p_supplier_id" integer, "p_purchase_id" integer, "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "date", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_supplier_payment"("p_supplier_id" bigint, "p_purchase_id" bigint, "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "date", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_supplier_payment"("p_supplier_id" bigint, "p_purchase_id" bigint, "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "date", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_supplier_payment"("p_supplier_id" bigint, "p_purchase_id" bigint, "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "date", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_supplier_refund"("p_supplier_id" integer, "p_amount" numeric, "p_refund_method" "text", "p_refund_date" "date", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_supplier_refund"("p_supplier_id" integer, "p_amount" numeric, "p_refund_method" "text", "p_refund_date" "date", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_supplier_refund"("p_supplier_id" integer, "p_amount" numeric, "p_refund_method" "text", "p_refund_date" "date", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."subtract_from_customer_balance"("customer_id_to_update" integer, "amount_to_subtract" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."subtract_from_customer_balance"("customer_id_to_update" integer, "amount_to_subtract" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subtract_from_customer_balance"("customer_id_to_update" integer, "amount_to_subtract" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_purchase"("p_purchase_id" integer, "p_notes" "text", "p_inventory_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_purchase"("p_purchase_id" integer, "p_notes" "text", "p_inventory_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_purchase"("p_purchase_id" integer, "p_notes" "text", "p_inventory_items" "jsonb") TO "service_role";


















GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."customer_payments" TO "anon";
GRANT ALL ON TABLE "public"."customer_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_payments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."customer_payments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."customer_payments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."customer_payments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."customers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."customers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."customers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."customers_with_balance" TO "anon";
GRANT ALL ON TABLE "public"."customers_with_balance" TO "authenticated";
GRANT ALL ON TABLE "public"."customers_with_balance" TO "service_role";



GRANT ALL ON TABLE "public"."dummy_test_table" TO "anon";
GRANT ALL ON TABLE "public"."dummy_test_table" TO "authenticated";
GRANT ALL ON TABLE "public"."dummy_test_table" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dummy_test_table_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dummy_test_table_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dummy_test_table_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."expense_categories" TO "anon";
GRANT ALL ON TABLE "public"."expense_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."expense_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."expense_categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."expense_categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."expenses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."expenses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."expenses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inventory" TO "anon";
GRANT ALL ON TABLE "public"."inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."products_display_view" TO "anon";
GRANT ALL ON TABLE "public"."products_display_view" TO "authenticated";
GRANT ALL ON TABLE "public"."products_display_view" TO "service_role";



GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."products_with_quantity" TO "anon";
GRANT ALL ON TABLE "public"."products_with_quantity" TO "authenticated";
GRANT ALL ON TABLE "public"."products_with_quantity" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_items" TO "anon";
GRANT ALL ON TABLE "public"."purchase_items" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."purchase_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchase_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchase_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_return_items" TO "anon";
GRANT ALL ON TABLE "public"."purchase_return_items" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_return_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."purchase_return_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchase_return_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchase_return_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_returns" TO "anon";
GRANT ALL ON TABLE "public"."purchase_returns" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_returns" TO "service_role";



GRANT ALL ON SEQUENCE "public"."purchase_returns_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchase_returns_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchase_returns_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."purchases" TO "anon";
GRANT ALL ON TABLE "public"."purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."purchases" TO "service_role";



GRANT ALL ON SEQUENCE "public"."purchases_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchases_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchases_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sale_items" TO "anon";
GRANT ALL ON TABLE "public"."sale_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sale_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sale_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sale_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sales_history_view" TO "anon";
GRANT ALL ON TABLE "public"."sales_history_view" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_history_view" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sales_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sales_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sales_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_payments" TO "anon";
GRANT ALL ON TABLE "public"."supplier_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_payments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."supplier_payments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."supplier_payments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."supplier_payments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."suppliers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."suppliers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."suppliers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers_with_balance" TO "anon";
GRANT ALL ON TABLE "public"."suppliers_with_balance" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers_with_balance" TO "service_role";



GRANT ALL ON TABLE "public"."user_category_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_category_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_category_settings" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";




























RESET ALL;
