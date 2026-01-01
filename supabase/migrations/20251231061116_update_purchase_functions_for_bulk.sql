-- 1. Naya Kharidari (Purchase) Function
CREATE OR REPLACE FUNCTION public.create_new_purchase(p_local_id uuid, p_supplier_id bigint, p_notes text, p_inventory_items jsonb)
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
    v_is_imei BOOLEAN;
BEGIN
    -- Duplicate Check
    IF EXISTS (SELECT 1 FROM public.purchases WHERE local_id = p_local_id) THEN
        SELECT id INTO new_purchase_id FROM public.purchases WHERE local_id = p_local_id;
        RETURN new_purchase_id;
    END IF;

    -- Create the main purchase record
    INSERT INTO public.purchases (local_id, supplier_id, notes, total_amount, balance_due, status, user_id)
    VALUES (p_local_id, p_supplier_id, p_notes, 0, 0, 'unpaid', auth.uid())
    RETURNING id INTO new_purchase_id;

    -- Loop through each item in the purchase
    FOR item IN SELECT * FROM jsonb_array_elements(p_inventory_items)
    LOOP
        -- Variant handling (Same as before)
        SELECT id INTO new_variant_id FROM public.product_variants
        WHERE product_id = (item->>'product_id')::BIGINT AND attributes = (item->'item_attributes')::JSONB;

        IF new_variant_id IS NULL THEN
            INSERT INTO public.product_variants (local_id, product_id, user_id, attributes, barcode, purchase_price, sale_price)
            VALUES (gen_random_uuid(), (item->>'product_id')::BIGINT, auth.uid(), (item->'item_attributes')::JSONB, (item->>'barcode')::TEXT, (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC)
            RETURNING id INTO new_variant_id;
        END IF;

        item_quantity := COALESCE((item->>'quantity')::INT, 1);

        -- Check if product is IMEI based
        SELECT c.is_imei_based INTO v_is_imei 
        FROM public.categories c 
        JOIN public.products p ON p.category_id = c.id 
        WHERE p.id = (item->>'product_id')::BIGINT;

        IF v_is_imei THEN
            -- IMEI Based: Purana tareeqa (Har item ki alag row)
            FOR i IN 1..item_quantity LOOP
                INSERT INTO public.inventory (local_id, product_id, variant_id, user_id, purchase_price, sale_price, imei, item_attributes, supplier_id, purchase_id, quantity, available_qty)
                VALUES (gen_random_uuid(), (item->>'product_id')::BIGINT, new_variant_id, auth.uid(), (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, (item->>'imei')::TEXT, (item->'item_attributes')::JSONB, p_supplier_id, new_purchase_id, 1, 1);
            END LOOP;
        ELSE
            -- Bulk Based: Naya tareeqa (Sirf 1 row poori quantity ke sath)
            INSERT INTO public.inventory (local_id, product_id, variant_id, user_id, purchase_price, sale_price, imei, item_attributes, supplier_id, purchase_id, quantity, available_qty)
            VALUES (gen_random_uuid(), (item->>'product_id')::BIGINT, new_variant_id, auth.uid(), (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, NULL, (item->'item_attributes')::JSONB, p_supplier_id, new_purchase_id, item_quantity, item_quantity);
        END IF;

        total_purchase_amount := total_purchase_amount + ((item->>'purchase_price')::NUMERIC * item_quantity);
    END LOOP;

    UPDATE public.purchases SET total_amount = total_purchase_amount, balance_due = total_purchase_amount WHERE id = new_purchase_id;
    RETURN new_purchase_id;
END;
$function$;

-- 2. Purchase Edit Function (update_purchase_inventory) ko bhi update karna zaroori hai
CREATE OR REPLACE FUNCTION public.update_purchase_inventory(p_purchase_id bigint, p_supplier_id bigint, p_notes text, p_amount_paid numeric, p_items jsonb, p_local_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    item JSONB;
    v_is_imei BOOLEAN;
    v_variant_id BIGINT;
    v_total_amount NUMERIC := 0;
    v_quantity INT;
BEGIN
    -- Pehle purani inventory saaf karein (Jo returned nahi hain)
    DELETE FROM public.inventory WHERE purchase_id = p_purchase_id AND status != 'Returned';

    -- Naye items insert karein bulk logic ke sath
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_quantity := COALESCE((item->>'quantity')::INT, 1);
        
        SELECT c.is_imei_based INTO v_is_imei 
        FROM public.categories c 
        JOIN public.products p ON p.category_id = c.id 
        WHERE p.id = (item->>'product_id')::BIGINT;

        -- Variant ID dhoondein ya banayein
        SELECT id INTO v_variant_id FROM product_variants WHERE product_id = (item->>'product_id')::BIGINT AND attributes = (item->'item_attributes')::JSONB;
        
        IF v_variant_id IS NULL THEN
            INSERT INTO product_variants (local_id, product_id, user_id, attributes, purchase_price, sale_price) 
            VALUES (gen_random_uuid(), (item->>'product_id')::BIGINT, auth.uid(), (item->'item_attributes')::JSONB, (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC) 
            RETURNING id INTO v_variant_id;
        END IF;

        IF v_is_imei THEN
            FOR i IN 1..v_quantity LOOP
                INSERT INTO inventory (local_id, product_id, variant_id, user_id, purchase_price, sale_price, imei, item_attributes, supplier_id, purchase_id, status, quantity, available_qty)
                VALUES (gen_random_uuid(), (item->>'product_id')::BIGINT, v_variant_id, auth.uid(), (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, (item->>'imei')::TEXT, (item->'item_attributes')::JSONB, p_supplier_id, p_purchase_id, 'Available', 1, 1);
            END LOOP;
        ELSE
            INSERT INTO inventory (local_id, product_id, variant_id, user_id, purchase_price, sale_price, imei, item_attributes, supplier_id, purchase_id, status, quantity, available_qty)
            VALUES (gen_random_uuid(), (item->>'product_id')::BIGINT, v_variant_id, auth.uid(), (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, NULL, (item->'item_attributes')::JSONB, p_supplier_id, p_purchase_id, 'Available', v_quantity, v_quantity);
        END IF;
    END LOOP;

    -- Purchase totals update karein
    SELECT COALESCE(SUM(purchase_price * quantity), 0) INTO v_total_amount FROM inventory WHERE purchase_id = p_purchase_id AND status != 'Returned';
    
    UPDATE purchases SET 
        supplier_id = p_supplier_id, notes = p_notes, amount_paid = p_amount_paid, 
        total_amount = v_total_amount, balance_due = v_total_amount - p_amount_paid,
        status = CASE WHEN (v_total_amount - p_amount_paid) <= 0 THEN 'paid' ELSE 'partially_paid' END
    WHERE id = p_purchase_id;
END;
$function$;