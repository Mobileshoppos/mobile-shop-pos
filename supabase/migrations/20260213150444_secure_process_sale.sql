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

    -- 1. Sale Record Insert Karein (Ab Invoice ID bhi shamil hai)
    INSERT INTO public.sales (
        id, 
        local_id, 
        invoice_id, -- <--- NAYA COLUMN
        customer_id, 
        subtotal, 
        discount, 
        total_amount, 
        payment_method, 
        amount_paid_at_sale, 
        payment_status, 
        user_id, 
        created_at
    ) VALUES (
        (p_sale_record->>'id')::UUID,
        (p_sale_record->>'local_id')::UUID,
        (p_sale_record->>'invoice_id')::TEXT, -- <--- NAYI VALUE
        (p_sale_record->>'customer_id')::UUID,
        (p_sale_record->>'subtotal')::NUMERIC,
        (p_sale_record->>'discount')::NUMERIC,
        (p_sale_record->>'total_amount')::NUMERIC,
        (p_sale_record->>'payment_method')::TEXT,
        (p_sale_record->>'amount_paid_at_sale')::NUMERIC,
        (p_sale_record->>'payment_status')::TEXT,
        v_current_user_id, -- [SECURITY FIX]: auth.uid() ki jagah v_current_user_id
        COALESCE((p_sale_record->>'created_at')::TIMESTAMPTZ, now())
    ) 
    ON CONFLICT (id) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_sale_id;

    -- 2. Sale Items Insert Karein (Bilkul purane code jaisa, sirf purchase_price ka izafa)
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
            local_id
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
            (v_item.value->>'local_id')::UUID
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
        AND user_id = v_current_user_id; -- [SECURITY LOCK 3]: Sirf apna stock update karne ka lock
    END LOOP;

    RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id);
END; 
$$;