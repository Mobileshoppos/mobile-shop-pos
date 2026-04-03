-- Updating process_sale_return_atomic to include register_id and session_id (Multi-Counter System)
CREATE OR REPLACE FUNCTION public.process_sale_return_atomic(p_return_record jsonb, p_return_items jsonb, p_payment_record jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_current_user_id UUID := auth.uid(); --[SECURITY LOCK 1]: Asli User ID pakarna
BEGIN
    -- [SECURITY LOCK 2]: Tasdeeq karna ke Sale aur Customer dono is user ke hain
    IF NOT EXISTS (
        SELECT 1 FROM public.sales 
        WHERE id = (p_return_record->>'sale_id')::UUID AND user_id = v_current_user_id
    ) OR NOT EXISTS (
        SELECT 1 FROM public.customers 
        WHERE id = (p_return_record->>'customer_id')::UUID AND user_id = v_current_user_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Sale or Customer record not found for this user.';
    END IF;

    -- 1. Check karein ke kya yeh Return pehle hi process ho chuka hai? (Idempotency)
    IF EXISTS (SELECT 1 FROM public.sale_returns WHERE id = (p_return_record->>'id')::UUID AND user_id = v_current_user_id) THEN
        RETURN;
    END IF;

    -- 2. Return Record Insert Karein (staff_id pehle se json mein mojood hai)
    INSERT INTO public.sale_returns (
        id, 
        local_id, 
        sale_id, 
        customer_id, 
        total_refund_amount, 
        tax_refunded, 
        return_fee, 
        reason, 
        user_id, 
        created_at,
        staff_id,
        register_id, -- <--- NAYA IZAFA (MULTI-COUNTER)
        session_id   -- <--- NAYA IZAFA (MULTI-COUNTER)
    )
    VALUES (
        (p_return_record->>'id')::UUID,
        (p_return_record->>'local_id')::UUID,
        (p_return_record->>'sale_id')::UUID,
        (p_return_record->>'customer_id')::UUID,
        (p_return_record->>'total_refund_amount')::NUMERIC,
        COALESCE((p_return_record->>'tax_refunded')::NUMERIC, 0), 
        (p_return_record->>'return_fee')::NUMERIC,
        (p_return_record->>'reason')::TEXT,
        v_current_user_id, 
        (p_return_record->>'created_at')::TIMESTAMPTZ,
        (p_return_record->>'staff_id')::UUID,
        (p_return_record->>'register_id')::UUID, -- <--- DATA YAHAN SE AAYEGA
        (p_return_record->>'session_id')::UUID   -- <--- DATA YAHAN SE AAYEGA
    );

    -- 3. Return Items Insert Karein
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_return_items) LOOP
        INSERT INTO public.sale_return_items (id, return_id, inventory_id, product_id, price_at_return, quantity)
        VALUES (
            (v_item.value->>'id')::UUID,
            (p_return_record->>'id')::UUID,
            (v_item.value->>'inventory_id')::UUID,
            (v_item.value->>'product_id')::UUID,
            (v_item.value->>'price_at_return')::NUMERIC,
            (v_item.value->>'quantity')::INT
        );

        -- 4. Inventory Update (Stock wapis jama karein - Sirf is user ka stock)
        UPDATE public.inventory 
        SET available_qty = available_qty + (v_item.value->>'quantity')::INT,
            sold_qty = GREATEST(0, sold_qty - (v_item.value->>'quantity')::INT),
            status = 'Available'
        WHERE id = (v_item.value->>'inventory_id')::UUID 
        AND user_id = v_current_user_id; 

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Unauthorized: Inventory item not found or access denied.';
        END IF;
    END LOOP;

    -- 5. Payment (Credit) Record Insert Karein (staff_id shamil kiya gaya hai)
    INSERT INTO public.customer_payments (
        id, 
        local_id, 
        customer_id, 
        amount_paid, 
        user_id, 
        staff_id, 
        remarks, 
        created_at,
        register_id, -- <--- NAYA IZAFA (MULTI-COUNTER)
        session_id   -- <--- NAYA IZAFA (MULTI-COUNTER)
    )
    VALUES (
        (p_payment_record->>'id')::UUID,
        (p_payment_record->>'local_id')::UUID,
        (p_payment_record->>'customer_id')::UUID,
        (p_payment_record->>'amount_paid')::NUMERIC,
        v_current_user_id, 
        (p_payment_record->>'staff_id')::UUID, -- <--- NAYA IZAFA
        (p_payment_record->>'remarks')::TEXT,
        (p_payment_record->>'created_at')::TIMESTAMPTZ,
        (p_payment_record->>'register_id')::UUID, -- <--- DATA YAHAN SE AAYEGA
        (p_payment_record->>'session_id')::UUID   -- <--- DATA YAHAN SE AAYEGA
    );

END; 
$$;