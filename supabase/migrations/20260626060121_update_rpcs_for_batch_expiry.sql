-- 1. UPDATE: create_new_purchase
CREATE OR REPLACE FUNCTION "public"."create_new_purchase"("p_local_id" "uuid", "p_supplier_id" "uuid", "p_notes" "text", "p_inventory_items" "jsonb", "p_invoice_id" "text" DEFAULT NULL::"text", "p_staff_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
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
    -- NAYA IZAFA: Duplicate check taake slow internet par double entry na ho
    IF EXISTS (SELECT 1 FROM public.purchases WHERE id = p_local_id) THEN
        RETURN p_local_id;
    END IF;

    -- Yahan hum ne 'invoice_id' column add kiya hai (staff_id ka izafa kiya gaya)
    INSERT INTO public.purchases (id, local_id, invoice_id, supplier_id, notes, total_amount, balance_due, status, user_id, staff_id)
    VALUES (new_purchase_id, p_local_id, p_invoice_id, p_supplier_id, p_notes, 0, 0, 'unpaid', auth.uid(), p_staff_id);

    FOR item IN SELECT * FROM jsonb_array_elements(p_inventory_items)
    LOOP
        SELECT id INTO new_variant_id FROM public.product_variants
        WHERE product_id = (item->>'product_id')::UUID AND attributes = (item->'item_attributes')::JSONB;

        IF new_variant_id IS NULL THEN
            new_variant_id := gen_random_uuid();
            INSERT INTO public.product_variants (id, local_id, product_id, user_id, attributes, barcode, purchase_price, sale_price, wholesale_price)
            VALUES (new_variant_id, gen_random_uuid(), (item->>'product_id')::UUID, auth.uid(), (item->'item_attributes')::JSONB, (item->>'barcode')::TEXT, (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, (item->>'wholesale_price')::NUMERIC);
        END IF;

        item_quantity := COALESCE((item->>'quantity')::INT, 1);

        SELECT c.is_imei_based INTO v_is_imei 
        FROM public.categories c 
        JOIN public.products p ON p.category_id = c.id 
        WHERE p.id = (item->>'product_id')::UUID;

        IF v_is_imei THEN
            FOR i IN 1..item_quantity LOOP
                -- FIX: Use ID from JSON if available (ADDED batch_number and expiry_date)
                INSERT INTO public.inventory (id, local_id, product_id, variant_id, user_id, purchase_price, sale_price, wholesale_price, imei, item_attributes, supplier_id, purchase_id, quantity, available_qty, warranty_days, batch_number, expiry_date)
                VALUES (COALESCE((item->>'id')::UUID, gen_random_uuid()), COALESCE((item->>'local_id')::UUID, gen_random_uuid()), (item->>'product_id')::UUID, new_variant_id, auth.uid(), (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, (item->>'wholesale_price')::NUMERIC, (item->>'imei')::TEXT, (item->'item_attributes')::JSONB, p_supplier_id, new_purchase_id, 1, 1, COALESCE((item->>'warranty_days')::INT, 0), (item->>'batch_number')::TEXT, (item->>'expiry_date')::DATE);
            END LOOP;
        ELSE
            -- FIX: Use ID and Local_ID from JSON (ADDED batch_number and expiry_date)
            INSERT INTO public.inventory (id, local_id, product_id, variant_id, user_id, purchase_price, sale_price, wholesale_price, imei, item_attributes, supplier_id, purchase_id, quantity, available_qty, warranty_days, batch_number, expiry_date)
            VALUES (COALESCE((item->>'id')::UUID, gen_random_uuid()), COALESCE((item->>'local_id')::UUID, gen_random_uuid()), (item->>'product_id')::UUID, new_variant_id, auth.uid(), (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, (item->>'wholesale_price')::NUMERIC, NULL, (item->'item_attributes')::JSONB, p_supplier_id, new_purchase_id, item_quantity, item_quantity, COALESCE((item->>'warranty_days')::INT, 0), (item->>'batch_number')::TEXT, (item->>'expiry_date')::DATE);
        END IF;

        total_purchase_amount := total_purchase_amount + ((item->>'purchase_price')::NUMERIC * item_quantity);
    END LOOP;

    UPDATE public.purchases SET total_amount = total_purchase_amount, balance_due = total_purchase_amount WHERE id = new_purchase_id;
    RETURN new_purchase_id;
END;
$$;


-- 2. UPDATE: update_purchase_inventory
CREATE OR REPLACE FUNCTION "public"."update_purchase_inventory"("p_purchase_id" "uuid", "p_supplier_id" "uuid", "p_notes" "text", "p_amount_paid" numeric, "p_items" "jsonb", "p_local_id" "uuid" DEFAULT NULL::"uuid", "p_invoice_id" "text" DEFAULT NULL::"text", "p_staff_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    item JSONB;
    v_inv_id UUID;
    v_new_qty INT;
    v_already_used INT;
    v_total_purchase_amount NUMERIC := 0;
    v_current_user_id UUID := auth.uid(); -- [SECURITY LOCK 1]: Asli User ID pakarna
BEGIN
    -- [SECURITY LOCK 2]: Tasdeeq karna ke Purchase aur Supplier dono is user ke hain
    IF NOT EXISTS (
        SELECT 1 FROM public.purchases 
        WHERE id = p_purchase_id AND user_id = v_current_user_id
    ) OR NOT EXISTS (
        SELECT 1 FROM public.suppliers 
        WHERE id = p_supplier_id AND user_id = v_current_user_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Purchase or Supplier record not found for this user.';
    END IF;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_inv_id := (item->>'id')::UUID;
        v_new_qty := (item->>'quantity')::INT;

        -- [SECURITY LOCK 3]: Inventory update karte waqt user check lagana
        IF EXISTS (SELECT 1 FROM public.inventory WHERE id = v_inv_id AND user_id = v_current_user_id) THEN
            SELECT (sold_qty + returned_qty + damaged_qty) INTO v_already_used 
            FROM public.inventory WHERE id = v_inv_id AND user_id = v_current_user_id;

            UPDATE public.inventory SET
                quantity = v_new_qty,
                available_qty = v_new_qty - v_already_used,
                purchase_price = (item->>'purchase_price')::NUMERIC,
                sale_price = (item->>'sale_price')::NUMERIC,
                wholesale_price = (item->>'wholesale_price')::NUMERIC, -- <--- NAYA IZAFA
                warranty_days = COALESCE((item->>'warranty_days')::INT, 0),
                imei = item->>'imei',                                      -- <--- NAYA IZAFA (Details bachane ke liye)
                item_attributes = (item->>'item_attributes')::JSONB,       -- <--- NAYA IZAFA (Details bachane ke liye)
                batch_number = item->>'batch_number',                      -- <--- NEW IZAFA (Batch)
                expiry_date = (item->>'expiry_date')::DATE,                -- <--- NEW IZAFA (Expiry)
                status = CASE WHEN (v_new_qty - v_already_used) <= 0 AND sold_qty > 0 THEN 'Sold' ELSE 'Available' END
            WHERE id = v_inv_id AND user_id = v_current_user_id;
        ELSE
            -- FIX: Use ID and Local_ID from JSON for newly added items during edit (ADDED batch and expiry)
            INSERT INTO public.inventory (id, local_id, product_id, variant_id, user_id, purchase_price, sale_price, wholesale_price, quantity, available_qty, supplier_id, purchase_id, warranty_days, imei, item_attributes, batch_number, expiry_date) 
            VALUES (v_inv_id, COALESCE((item->>'local_id')::UUID, v_inv_id), (item->>'product_id')::UUID, (item->>'variant_id')::UUID, v_current_user_id, (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, (item->>'wholesale_price')::NUMERIC, v_new_qty, v_new_qty, p_supplier_id, p_purchase_id, COALESCE((item->>'warranty_days')::INT, 0), item->>'imei', (item->>'item_attributes')::JSONB, item->>'batch_number', (item->>'expiry_date')::DATE); 
        END IF;

        v_total_purchase_amount := v_total_purchase_amount + ((item->>'purchase_price')::NUMERIC * v_new_qty);
    END LOOP;

    -- Yahan hum ne 'invoice_id' ko update kiya hai (staff_id ka izafa kiya gaya)
    UPDATE public.purchases SET
        supplier_id = p_supplier_id,
        invoice_id = p_invoice_id, -- <--- NAYA UPDATE
        notes = p_notes,
        total_amount = v_total_purchase_amount,
        amount_paid = p_amount_paid,
        balance_due = v_total_purchase_amount - p_amount_paid,
        status = CASE WHEN (v_total_purchase_amount - p_amount_paid) <= 0 THEN 'paid' ELSE 'partially_paid' END,
        staff_id = p_staff_id -- <--- NAYA IZAFA
    WHERE id = p_purchase_id AND user_id = v_current_user_id; -- [SECURITY LOCK 4]: User check
END;
$$;


-- 3. UPDATE: process_sale_atomic
CREATE OR REPLACE FUNCTION "public"."process_sale_atomic"("p_sale_record" "jsonb", "p_sale_items" "jsonb", "p_inventory_updates" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_sale_id UUID;
    v_item RECORD;
    v_inv RECORD;
    v_current_user_id UUID := auth.uid(); -- [SECURITY LOCK 1]: Asli User ID ko mehfooz karna
BEGIN
    -- [SECURITY LOCK 2]: Tasdeeq karna ke Customer is user ka apna hai
    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = (p_sale_record->>'customer_id')::UUID AND user_id = v_current_user_id) THEN
        RAISE EXCEPTION 'Unauthorized: Customer record not found for this user.';
    END IF;

    -- NAYA IZAFA: Duplicate check taake slow internet par stock do baar minus na ho
    IF EXISTS (SELECT 1 FROM public.sales WHERE id = (p_sale_record->>'id')::UUID) THEN
        RETURN jsonb_build_object('success', true, 'sale_id', (p_sale_record->>'id')::UUID, 'note', 'already_processed');
    END IF;

    -- 1. Sale Record Insert Karein (Ab Invoice ID aur staff_id bhi shamil hai)
    INSERT INTO public.sales (
        id, 
        local_id, 
        invoice_id, -- <--- NAYA COLUMN
        customer_id, 
        subtotal, 
        discount, 
        tax_amount, -- <--- NAYA IZAFA (TAX)
        tax_rate_applied, -- <--- NAYA IZAFA (TAX)
        total_amount, 
        payment_method, 
        amount_paid_at_sale, 
        payment_status, 
        user_id, 
        created_at,
        staff_id, -- <--- NAYA IZAFA (AUDIT TRAIL)
        register_id, -- <--- NAYA IZAFA (MULTI-COUNTER)
        session_id,   -- <--- NAYA IZAFA (MULTI-COUNTER)
        fbr_invoice_number, -- <--- NAYA IZAFA (FBR)
        fbr_fee_applied     -- <--- NAYA IZAFA (FBR)
    ) VALUES (
        (p_sale_record->>'id')::UUID,
        (p_sale_record->>'local_id')::UUID,
        (p_sale_record->>'invoice_id')::TEXT, -- <--- NAYI VALUE
        (p_sale_record->>'customer_id')::UUID,
        (p_sale_record->>'subtotal')::NUMERIC,
        (p_sale_record->>'discount')::NUMERIC,
        COALESCE((p_sale_record->>'tax_amount')::NUMERIC, 0), -- <--- NAYI VALUE (TAX)
        COALESCE((p_sale_record->>'tax_rate_applied')::NUMERIC, 0), -- <--- NAYI VALUE (TAX)
        (p_sale_record->>'total_amount')::NUMERIC,
        (p_sale_record->>'payment_method')::TEXT,
        (p_sale_record->>'amount_paid_at_sale')::NUMERIC,
        (p_sale_record->>'payment_status')::TEXT,
        v_current_user_id, -- [SECURITY FIX]: auth.uid() ki jagah v_current_user_id
        COALESCE((p_sale_record->>'created_at')::TIMESTAMPTZ, now()),
        (p_sale_record->>'staff_id')::UUID, -- <--- NAYA IZAFA (AUDIT TRAIL)
        (p_sale_record->>'register_id')::UUID, -- <--- NAYA IZAFA (MULTI-COUNTER)
        (p_sale_record->>'session_id')::UUID,   -- <--- NAYA IZAFA (MULTI-COUNTER)
        (p_sale_record->>'fbr_invoice_number')::TEXT, -- <--- NAYI VALUE (FBR)
        COALESCE((p_sale_record->>'fbr_fee_applied')::NUMERIC, 0) -- <--- NAYI VALUE (FBR)
    ) 
    ON CONFLICT (id) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_sale_id;

    -- 2. Sale Items Insert Karein (Bilkul purane code jaisa, sirf batch aur expiry ka izafa)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_sale_items) LOOP
        INSERT INTO public.sale_items (
            id, -- Frontend wali UUID
            sale_id, 
            inventory_id, 
            product_id, 
            product_name_snapshot, 
            quantity, 
            price_at_sale, 
            purchase_price, -- <--- NAYA IZAFA (PROFESSIONAL FIX)
            user_id, 
            warranty_expiry, 
            local_id,
            batch_number,   -- <--- NEW IZAFA
            expiry_date     -- <--- NEW IZAFA
        ) VALUES (
            (v_item.value->>'id')::UUID, -- Frontend se aayi hui ID
            v_sale_id,
            (v_item.value->>'inventory_id')::UUID,
            (v_item.value->>'product_id')::UUID,
            (v_item.value->>'product_name_snapshot')::TEXT,
            (v_item.value->>'quantity')::INT,
            (v_item.value->>'price_at_sale')::NUMERIC,
            COALESCE((v_item.value->>'purchase_price')::NUMERIC, 0), -- <--- NAYA IZAFA (PROFESSIONAL FIX)
            v_current_user_id, -- [SECURITY FIX]: auth.uid() ki jagah v_current_user_id
            (v_item.value->>'warranty_expiry')::TIMESTAMPTZ,
            (v_item.value->>'local_id')::UUID,
            v_item.value->>'batch_number',                -- <--- NEW IZAFA
            (v_item.value->>'expiry_date')::DATE          -- <--- NEW IZAFA
        )
        ON CONFLICT (id) DO NOTHING; -- Agar pehle se hai to dubara na dalein
    END LOOP;

    -- 3. Inventory Update Karein (Bilkul purane code jaisa)
    FOR v_inv IN SELECT * FROM jsonb_array_elements(p_inventory_updates) LOOP
        UPDATE public.inventory 
        SET available_qty = available_qty - (v_inv.value->>'qtySold')::INT, 
            sold_qty = sold_qty + (v_inv.value->>'qtySold')::INT, 
            status = CASE WHEN (available_qty - (v_inv.value->>'qtySold')::INT) <= 0 THEN 'Sold' ELSE 'Available' END
        WHERE id = (v_inv.value->>'id')::UUID
        AND user_id = v_current_user_id; --[SECURITY LOCK 3]: Sirf apna stock update karne ka lock
    END LOOP;

    RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id);
END; 
$$;