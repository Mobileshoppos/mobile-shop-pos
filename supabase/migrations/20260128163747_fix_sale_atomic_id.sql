-- Purane function ko drop karte hain
DROP FUNCTION IF EXISTS "public"."process_sale_atomic"(jsonb, jsonb, jsonb) CASCADE;

-- Naya function jo frontend se aayi hui ID hi istemal karega
CREATE OR REPLACE FUNCTION "public"."process_sale_atomic"(
    "p_sale_record" jsonb, 
    "p_sale_items" jsonb, 
    "p_inventory_updates" jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_sale_id UUID;
    v_item RECORD;
    v_inv RECORD;
BEGIN
    -- 1. Sale Record Insert Karein (Agar pehle se hai to update karein - Idempotency)
    INSERT INTO public.sales (
        id, local_id, customer_id, subtotal, discount, total_amount, 
        payment_method, amount_paid_at_sale, payment_status, user_id, created_at
    ) VALUES (
        (p_sale_record->>'id')::UUID,
        (p_sale_record->>'local_id')::UUID,
        (p_sale_record->>'customer_id')::UUID,
        (p_sale_record->>'subtotal')::NUMERIC,
        (p_sale_record->>'discount')::NUMERIC,
        (p_sale_record->>'total_amount')::NUMERIC,
        (p_sale_record->>'payment_method')::TEXT,
        (p_sale_record->>'amount_paid_at_sale')::NUMERIC,
        (p_sale_record->>'payment_status')::TEXT,
        auth.uid(),
        COALESCE((p_sale_record->>'created_at')::TIMESTAMPTZ, now())
    ) 
    ON CONFLICT (id) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_sale_id;

    -- 2. Sale Items Insert Karein (Yahan tabdeeli ki hai: gen_random_uuid() hata diya)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_sale_items) LOOP
        INSERT INTO public.sale_items (
            id, -- Frontend wali UUID
            sale_id, 
            inventory_id, 
            product_id, 
            product_name_snapshot, 
            quantity, 
            price_at_sale, 
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
            auth.uid(),
            (v_item.value->>'warranty_expiry')::TIMESTAMPTZ,
            (v_item.value->>'local_id')::UUID
        )
        ON CONFLICT (id) DO NOTHING; -- Agar pehle se hai to dubara na dalein
    END LOOP;

    -- 3. Inventory Update Karein
    FOR v_inv IN SELECT * FROM jsonb_array_elements(p_inventory_updates) LOOP
        UPDATE public.inventory 
        SET available_qty = available_qty - (v_inv.value->>'qtySold')::INT, 
            sold_qty = sold_qty + (v_inv.value->>'qtySold')::INT, 
            status = CASE WHEN (available_qty - (v_inv.value->>'qtySold')::INT) <= 0 THEN 'Sold' ELSE 'Available' END
        WHERE id = (v_inv.value->>'id')::UUID;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id);
END; $$;

-- Permissions
GRANT ALL ON FUNCTION "public"."process_sale_atomic" TO "authenticated";