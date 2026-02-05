CREATE OR REPLACE FUNCTION "public"."process_sale_return_atomic"("p_return_record" "jsonb", "p_return_items" "jsonb", "p_payment_record" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_item RECORD;
BEGIN
    -- 1. Check karein ke kya yeh Return pehle hi process ho chuka hai? (Idempotency)
    IF EXISTS (SELECT 1 FROM public.sale_returns WHERE id = (p_return_record->>'id')::UUID) THEN
        RETURN;
    END IF;

    -- 2. Return Record Insert Karein
    INSERT INTO public.sale_returns (id, local_id, sale_id, customer_id, total_refund_amount, return_fee, reason, user_id, created_at)
    VALUES (
        (p_return_record->>'id')::UUID,
        (p_return_record->>'local_id')::UUID,
        (p_return_record->>'sale_id')::UUID,
        (p_return_record->>'customer_id')::UUID,
        (p_return_record->>'total_refund_amount')::NUMERIC,
        (p_return_record->>'return_fee')::NUMERIC,
        (p_return_record->>'reason')::TEXT,
        auth.uid(),
        (p_return_record->>'created_at')::TIMESTAMPTZ
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

        -- 4. Inventory Update (Stock wapis jama karein)
        UPDATE public.inventory 
        SET available_qty = available_qty + (v_item.value->>'quantity')::INT,
            sold_qty = GREATEST(0, sold_qty - (v_item.value->>'quantity')::INT),
            status = 'Available'
        WHERE id = (v_item.value->>'inventory_id')::UUID;
    END LOOP;

    -- 5. Payment (Credit) Record Insert Karein
    INSERT INTO public.customer_payments (id, local_id, customer_id, amount_paid, user_id, remarks, created_at)
    VALUES (
        (p_payment_record->>'id')::UUID,
        (p_payment_record->>'local_id')::UUID,
        (p_payment_record->>'customer_id')::UUID,
        (p_payment_record->>'amount_paid')::NUMERIC,
        auth.uid(),
        (p_payment_record->>'remarks')::TEXT,
        (p_payment_record->>'created_at')::TIMESTAMPTZ
    );

END; $$;