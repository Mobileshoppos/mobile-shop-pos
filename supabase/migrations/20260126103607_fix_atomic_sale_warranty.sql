CREATE OR REPLACE FUNCTION "public"."process_sale_atomic"("p_sale_record" "jsonb", "p_sale_items" "jsonb", "p_inventory_updates" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_sale_id BIGINT;
    v_item RECORD;
    v_inv RECORD;
BEGIN
    -- === STEP 0: IDEMPOTENCY CHECK (Gatekeeper) ===
    -- Pehle check karein ke kya is local_id wali sale pehle se mojood hai?
    SELECT id INTO v_sale_id 
    FROM public.sales 
    WHERE local_id = (p_sale_record->>'local_id')::UUID;

    -- Agar mojood hai, to error dene ke bajaye purani ID return karein
    IF v_sale_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true, 
            'sale_id', v_sale_id, 
            'message', 'Duplicate request handled safely'
        );
    END IF;

    -- 1. Sale Record Insert Karein
    INSERT INTO public.sales (
        id, local_id, customer_id, subtotal, discount, total_amount, 
        payment_method, amount_paid_at_sale, payment_status, user_id, created_at
    ) VALUES (
        (p_sale_record->>'id')::BIGINT,
        (p_sale_record->>'local_id')::UUID,
        (p_sale_record->>'customer_id')::BIGINT,
        (p_sale_record->>'subtotal')::NUMERIC,
        (p_sale_record->>'discount')::NUMERIC,
        (p_sale_record->>'total_amount')::NUMERIC,
        (p_sale_record->>'payment_method')::TEXT,
        (p_sale_record->>'amount_paid_at_sale')::NUMERIC,
        (p_sale_record->>'payment_status')::TEXT,
        auth.uid(),
        COALESCE((p_sale_record->>'created_at')::TIMESTAMPTZ, now())
    ) RETURNING id INTO v_sale_id;

    -- 2. Sale Items Insert Karein
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_sale_items)
    LOOP
        INSERT INTO public.sale_items (
            sale_id, inventory_id, product_id, product_name_snapshot, 
            quantity, price_at_sale, user_id, 
            warranty_expiry -- <--- NEW COLUMN ADDED
        ) VALUES (
            v_sale_id,
            (v_item.value->>'inventory_id')::BIGINT,
            (v_item.value->>'product_id')::BIGINT,
            (v_item.value->>'product_name_snapshot')::TEXT,
            (v_item.value->>'quantity')::INT,
            (v_item.value->>'price_at_sale')::NUMERIC,
            auth.uid(),
            (v_item.value->>'warranty_expiry')::TIMESTAMPTZ -- <--- NEW VALUE ADDED
        );
    END LOOP;

    -- 3. Inventory Update Karein
    FOR v_inv IN SELECT * FROM jsonb_array_elements(p_inventory_updates)
    LOOP
        UPDATE public.inventory
        SET 
            available_qty = available_qty - (v_inv.value->>'qtySold')::INT,
            sold_qty = sold_qty + (v_inv.value->>'qtySold')::INT,
            status = CASE 
                WHEN (available_qty - (v_inv.value->>'qtySold')::INT) <= 0 THEN 'Sold' 
                ELSE 'Available' 
            END
        WHERE id = (v_inv.value->>'id')::BIGINT;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id);

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Sale failed: %', SQLERRM;
END;
$$;