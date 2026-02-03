-- 1. Purchases table mein Invoice ID ka column add karein
ALTER TABLE "public"."purchases" 
ADD COLUMN IF NOT EXISTS "invoice_id" text;

-- 2. Index banayen taake search tez ho
CREATE INDEX IF NOT EXISTS idx_purchases_invoice_id ON "public"."purchases" ("invoice_id");

-- 3. Function 1: create_new_purchase (Updated)
-- Hum ne parameter mein 'p_invoice_id' add kiya hai aur INSERT mein shamil kiya hai.
CREATE OR REPLACE FUNCTION "public"."create_new_purchase"(
    "p_local_id" "uuid", 
    "p_supplier_id" "uuid", 
    "p_notes" "text", 
    "p_inventory_items" "jsonb",
    "p_invoice_id" "text" DEFAULT NULL -- <--- NAYA PARAMETER
) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    new_purchase_id UUID := p_local_id; 
    new_variant_id UUID;
    total_purchase_amount NUMERIC(10, 2) := 0;
    item JSONB;
    item_quantity INT;
    v_is_imei BOOLEAN;
BEGIN
    -- Yahan hum ne 'invoice_id' column add kiya hai
    INSERT INTO public.purchases (id, local_id, invoice_id, supplier_id, notes, total_amount, balance_due, status, user_id)
    VALUES (new_purchase_id, p_local_id, p_invoice_id, p_supplier_id, p_notes, 0, 0, 'unpaid', auth.uid());

    FOR item IN SELECT * FROM jsonb_array_elements(p_inventory_items)
    LOOP
        SELECT id INTO new_variant_id FROM public.product_variants
        WHERE product_id = (item->>'product_id')::UUID AND attributes = (item->'item_attributes')::JSONB;

        IF new_variant_id IS NULL THEN
            new_variant_id := gen_random_uuid();
            INSERT INTO public.product_variants (id, local_id, product_id, user_id, attributes, barcode, purchase_price, sale_price)
            VALUES (new_variant_id, gen_random_uuid(), (item->>'product_id')::UUID, auth.uid(), (item->'item_attributes')::JSONB, (item->>'barcode')::TEXT, (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC);
        END IF;

        item_quantity := COALESCE((item->>'quantity')::INT, 1);

        SELECT c.is_imei_based INTO v_is_imei 
        FROM public.categories c 
        JOIN public.products p ON p.category_id = c.id 
        WHERE p.id = (item->>'product_id')::UUID;

        IF v_is_imei THEN
            FOR i IN 1..item_quantity LOOP
                -- FIX: Use ID from JSON if available
                INSERT INTO public.inventory (id, local_id, product_id, variant_id, user_id, purchase_price, sale_price, imei, item_attributes, supplier_id, purchase_id, quantity, available_qty, warranty_days)
                VALUES (COALESCE((item->>'id')::UUID, gen_random_uuid()), COALESCE((item->>'local_id')::UUID, gen_random_uuid()), (item->>'product_id')::UUID, new_variant_id, auth.uid(), (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, (item->>'imei')::TEXT, (item->'item_attributes')::JSONB, p_supplier_id, new_purchase_id, 1, 1, COALESCE((item->>'warranty_days')::INT, 0));
            END LOOP;
        ELSE
            -- FIX: Use ID and Local_ID from JSON
            INSERT INTO public.inventory (id, local_id, product_id, variant_id, user_id, purchase_price, sale_price, imei, item_attributes, supplier_id, purchase_id, quantity, available_qty, warranty_days)
            VALUES (COALESCE((item->>'id')::UUID, gen_random_uuid()), COALESCE((item->>'local_id')::UUID, gen_random_uuid()), (item->>'product_id')::UUID, new_variant_id, auth.uid(), (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, NULL, (item->'item_attributes')::JSONB, p_supplier_id, new_purchase_id, item_quantity, item_quantity, COALESCE((item->>'warranty_days')::INT, 0));
        END IF;

        total_purchase_amount := total_purchase_amount + ((item->>'purchase_price')::NUMERIC * item_quantity);
    END LOOP;

    UPDATE public.purchases SET total_amount = total_purchase_amount, balance_due = total_purchase_amount WHERE id = new_purchase_id;
    RETURN new_purchase_id;
END;
$$;

-- 4. Function 2: update_purchase_inventory (Updated)
-- Hum ne parameter mein 'p_invoice_id' add kiya hai aur UPDATE mein shamil kiya hai.
CREATE OR REPLACE FUNCTION "public"."update_purchase_inventory"(
    "p_purchase_id" "uuid", 
    "p_supplier_id" "uuid", 
    "p_notes" "text", 
    "p_amount_paid" numeric, 
    "p_items" "jsonb", 
    "p_local_id" "uuid",
    "p_invoice_id" "text" DEFAULT NULL -- <--- NAYA PARAMETER
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    item JSONB;
    v_inv_id UUID;
    v_new_qty INT;
    v_already_used INT;
    v_total_purchase_amount NUMERIC := 0;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_inv_id := (item->>'id')::UUID;
        v_new_qty := (item->>'quantity')::INT;

        IF EXISTS (SELECT 1 FROM public.inventory WHERE id = v_inv_id) THEN
            SELECT (sold_qty + returned_qty + damaged_qty) INTO v_already_used 
            FROM public.inventory WHERE id = v_inv_id;

            UPDATE public.inventory SET
                quantity = v_new_qty,
                available_qty = v_new_qty - v_already_used,
                purchase_price = (item->>'purchase_price')::NUMERIC,
                sale_price = (item->>'sale_price')::NUMERIC,
                warranty_days = COALESCE((item->>'warranty_days')::INT, 0),
                status = CASE WHEN (v_new_qty - v_already_used) <= 0 AND sold_qty > 0 THEN 'Sold' ELSE 'Available' END
            WHERE id = v_inv_id;
        ELSE
            -- FIX: Use ID and Local_ID from JSON for newly added items during edit
            INSERT INTO public.inventory (id, local_id, product_id, variant_id, user_id, purchase_price, sale_price, quantity, available_qty, supplier_id, purchase_id, warranty_days)
            VALUES (v_inv_id, COALESCE((item->>'local_id')::UUID, v_inv_id), (item->>'product_id')::UUID, (item->>'variant_id')::UUID, auth.uid(), (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, v_new_qty, v_new_qty, p_supplier_id, p_purchase_id, COALESCE((item->>'warranty_days')::INT, 0));
        END IF;

        v_total_purchase_amount := v_total_purchase_amount + ((item->>'purchase_price')::NUMERIC * v_new_qty);
    END LOOP;

    -- Yahan hum ne 'invoice_id' ko update kiya hai
    UPDATE public.purchases SET
        supplier_id = p_supplier_id,
        invoice_id = p_invoice_id, -- <--- NAYA UPDATE
        notes = p_notes,
        total_amount = v_total_purchase_amount,
        amount_paid = p_amount_paid,
        balance_due = v_total_purchase_amount - p_amount_paid,
        status = CASE WHEN (v_total_purchase_amount - p_amount_paid) <= 0 THEN 'paid' ELSE 'partially_paid' END
    WHERE id = p_purchase_id;
END;
$$;