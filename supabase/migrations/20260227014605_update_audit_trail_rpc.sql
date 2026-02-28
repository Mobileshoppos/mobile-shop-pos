-- 1. Update process_sale_atomic to save staff_id
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
        total_amount, 
        payment_method, 
        amount_paid_at_sale, 
        payment_status, 
        user_id, 
        created_at,
        staff_id -- <--- NAYA IZAFA (AUDIT TRAIL)
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
        COALESCE((p_sale_record->>'created_at')::TIMESTAMPTZ, now()),
        (p_sale_record->>'staff_id')::UUID -- <--- NAYA IZAFA (AUDIT TRAIL)
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

-- 2. Update process_sale_return_atomic to save staff_id
CREATE OR REPLACE FUNCTION "public"."process_sale_return_atomic"("p_return_record" "jsonb", "p_return_items" "jsonb", "p_payment_record" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_item RECORD;
    v_current_user_id UUID := auth.uid(); -- [SECURITY LOCK 1]: Asli User ID pakarna
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

    -- 2. Return Record Insert Karein (Force user_id = auth.uid())
    INSERT INTO public.sale_returns (
        id, 
        local_id, 
        sale_id, 
        customer_id, 
        total_refund_amount, 
        return_fee, 
        reason, 
        user_id, 
        created_at,
        staff_id -- <--- NAYA IZAFA (AUDIT TRAIL)
    )
    VALUES (
        (p_return_record->>'id')::UUID,
        (p_return_record->>'local_id')::UUID,
        (p_return_record->>'sale_id')::UUID,
        (p_return_record->>'customer_id')::UUID,
        (p_return_record->>'total_refund_amount')::NUMERIC,
        (p_return_record->>'return_fee')::NUMERIC,
        (p_return_record->>'reason')::TEXT,
        v_current_user_id, -- [SECURITY LOCK 3]: Asli User ID
        (p_return_record->>'created_at')::TIMESTAMPTZ,
        (p_return_record->>'staff_id')::UUID -- <--- NAYA IZAFA (AUDIT TRAIL)
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
        AND user_id = v_current_user_id; -- [SECURITY LOCK 4]: User check

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Unauthorized: Inventory item not found or access denied.';
        END IF;
    END LOOP;

    -- 5. Payment (Credit) Record Insert Karein
    INSERT INTO public.customer_payments (id, local_id, customer_id, amount_paid, user_id, remarks, created_at)
    VALUES (
        (p_payment_record->>'id')::UUID,
        (p_payment_record->>'local_id')::UUID,
        (p_payment_record->>'customer_id')::UUID,
        (p_payment_record->>'amount_paid')::NUMERIC,
        v_current_user_id, -- [SECURITY LOCK 5]: Asli User ID
        (p_payment_record->>'remarks')::TEXT,
        (p_payment_record->>'created_at')::TIMESTAMPTZ
    );

END; $$;