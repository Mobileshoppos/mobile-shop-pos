CREATE OR REPLACE FUNCTION public.create_new_purchase(
    p_local_id uuid, -- Naya Parameter
    p_supplier_id bigint, 
    p_notes text, 
    p_inventory_items jsonb
)
 RETURNS bigint
 LANGUAGE plpgsql
AS $function$
DECLARE
    user_tier TEXT;
    current_stock_count BIGINT;
    new_items_count INT := 0;
    item JSONB;
    new_purchase_id BIGINT;
    new_variant_id BIGINT;
    total_purchase_amount NUMERIC(10, 2) := 0;
    item_quantity INT;
BEGIN
    -- 1. DUPLICATE CHECK: Agar yeh Purchase pehle se hai, to wapis ho jao
    IF EXISTS (SELECT 1 FROM public.purchases WHERE local_id = p_local_id) THEN
        SELECT id INTO new_purchase_id FROM public.purchases WHERE local_id = p_local_id;
        RETURN new_purchase_id;
    END IF;

    -- 2. Stock Limit Check (Aap ka purana logic)
    SELECT subscription_tier INTO user_tier FROM public.profiles WHERE user_id = auth.uid();
    IF user_tier = 'free' THEN
        FOR item IN SELECT * FROM jsonb_array_elements(p_inventory_items) LOOP
            new_items_count := new_items_count + COALESCE((item->>'quantity')::INT, 1);
        END LOOP;
        current_stock_count := public.get_current_user_stock_count();
        IF (current_stock_count + new_items_count) > 50 THEN
            RAISE EXCEPTION 'violates row-level security policy';
        END IF;
    END IF;

    -- 3. Create Purchase Record with local_id
    INSERT INTO public.purchases (local_id, supplier_id, notes, total_amount, balance_due, status, user_id)
    VALUES (p_local_id, p_supplier_id, p_notes, 0, 0, 'unpaid', auth.uid())
    RETURNING id INTO new_purchase_id;

    -- 4. Loop through items
    FOR item IN SELECT * FROM jsonb_array_elements(p_inventory_items)
    LOOP
        SELECT id INTO new_variant_id FROM public.product_variants
        WHERE product_id = (item->>'product_id')::BIGINT AND attributes = (item->'item_attributes')::JSONB;

        IF new_variant_id IS NULL THEN
            INSERT INTO public.product_variants (product_id, user_id, attributes, barcode, purchase_price, sale_price)
            VALUES ((item->>'product_id')::BIGINT, auth.uid(), (item->'item_attributes')::JSONB, (item->>'barcode')::TEXT, (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC)
            RETURNING id INTO new_variant_id;
        ELSE
            UPDATE public.product_variants SET purchase_price = (item->>'purchase_price')::NUMERIC, sale_price = (item->>'sale_price')::NUMERIC
            WHERE id = new_variant_id;
        END IF;

        item_quantity := COALESCE((item->>'quantity')::INT, 1);

        FOR i IN 1..item_quantity LOOP
            -- Inventory mein bhi local_id dalna zaroori hai (UUID generate karke)
            INSERT INTO public.inventory (local_id, product_id, variant_id, user_id, purchase_price, sale_price, imei, item_attributes, supplier_id, purchase_id)
            VALUES (gen_random_uuid(), (item->>'product_id')::BIGINT, new_variant_id, auth.uid(), (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, (item->>'imei')::TEXT, (item->'item_attributes')::JSONB, p_supplier_id, new_purchase_id);
        END LOOP;

        total_purchase_amount := total_purchase_amount + ((item->>'purchase_price')::NUMERIC * item_quantity);
    END LOOP;

    UPDATE public.purchases SET total_amount = total_purchase_amount, balance_due = total_purchase_amount
    WHERE id = new_purchase_id;

    RETURN new_purchase_id;
END;
$function$;