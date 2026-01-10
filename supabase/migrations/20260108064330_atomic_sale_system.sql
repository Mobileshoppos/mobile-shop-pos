CREATE OR REPLACE FUNCTION public.process_sale_atomic(
    p_sale_record JSONB,
    p_sale_items JSONB,
    p_inventory_updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale_id BIGINT;
    v_item RECORD;
    v_inv RECORD;
BEGIN
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
        (p_sale_record->>'created_at')::TIMESTAMPTZ
    ) RETURNING id INTO v_sale_id;

    -- 2. Sale Items Insert Karein
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_sale_items)
    LOOP
        INSERT INTO public.sale_items (
            sale_id, inventory_id, product_id, product_name_snapshot, 
            quantity, price_at_sale, user_id
        ) VALUES (
            v_sale_id,
            (v_item->>'inventory_id')::BIGINT,
            (v_item->>'product_id')::BIGINT,
            (v_item->>'product_name_snapshot')::TEXT,
            (v_item->>'quantity')::INT,
            (v_item->>'price_at_sale')::NUMERIC,
            auth.uid()
        );
    END LOOP;

    -- 3. Inventory Update Karein
    FOR v_inv IN SELECT * FROM jsonb_array_elements(p_inventory_updates)
    LOOP
        UPDATE public.inventory
        SET 
            available_qty = available_qty - (v_inv->>'qtySold')::INT,
            sold_qty = sold_qty + (v_inv->>'qtySold')::INT,
            status = CASE 
                WHEN (available_qty - (v_inv->>'qtySold')::INT) <= 0 THEN 'Sold' 
                ELSE 'Available' 
            END
        WHERE id = (v_inv->>'id')::BIGINT;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id);

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Sale failed: %', SQLERRM;
END;
$$;