CREATE OR REPLACE FUNCTION public.create_new_purchase(
  p_supplier_id bigint,
  p_notes text,
  p_inventory_items jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
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
    -- ====================================================================
    -- NEW PRE-CHECK BLOCK: Check stock limit before doing anything else.
    -- ====================================================================
    SELECT subscription_tier INTO user_tier FROM public.profiles WHERE user_id = auth.uid();

    IF user_tier = 'free' THEN
        -- Calculate how many new items are being added in this purchase.
        FOR item IN SELECT * FROM jsonb_array_elements(p_inventory_items) LOOP
            new_items_count := new_items_count + COALESCE((item->>'quantity')::INT, 1);
        END LOOP;

        -- Get the user's current stock count.
        current_stock_count := public.get_current_user_stock_count();

        -- If current stock + new items exceeds 50, raise an error.
        IF (current_stock_count + new_items_count) > 50 THEN
            -- We use this specific error message because our DataService.js is already looking for it.
            RAISE EXCEPTION 'violates row-level security policy';
        END IF;
    END IF;
    -- ====================================================================
    -- END OF NEW PRE-CHECK BLOCK
    -- ====================================================================

    -- Step 1: Create the main purchase record.
    INSERT INTO public.purchases (supplier_id, notes, total_amount, balance_due, status, user_id)
    VALUES (p_supplier_id, p_notes, 0, 0, 'unpaid', auth.uid())
    RETURNING id INTO new_purchase_id;

    -- Step 2: Loop through each item from the React app.
    FOR item IN SELECT * FROM jsonb_array_elements(p_inventory_items)
    LOOP
        -- Step 3: Check if this exact variant already exists.
        SELECT id INTO new_variant_id
        FROM public.product_variants
        WHERE product_id = (item->>'product_id')::BIGINT
          AND attributes = (item->'item_attributes')::JSONB;

        -- Step 4: If the variant doesn't exist, create it.
        IF new_variant_id IS NULL THEN
            INSERT INTO public.product_variants (product_id, user_id, attributes, barcode, purchase_price, sale_price)
            VALUES ((item->>'product_id')::BIGINT, auth.uid(), (item->'item_attributes')::JSONB, (item->>'barcode')::TEXT, (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC)
            RETURNING id INTO new_variant_id;
        ELSE
            -- Step 5: If variant exists, update its prices.
            UPDATE public.product_variants SET purchase_price = (item->>'purchase_price')::NUMERIC, sale_price = (item->>'sale_price')::NUMERIC
            WHERE id = new_variant_id;
        END IF;

        -- Step 6: Get the quantity for this variant.
        item_quantity := COALESCE((item->>'quantity')::INT, 1);

        -- Step 7: Loop to insert individual items into inventory.
        FOR i IN 1..item_quantity LOOP
            INSERT INTO public.inventory (product_id, variant_id, user_id, purchase_price, sale_price, imei, item_attributes, supplier_id, purchase_id)
            VALUES ((item->>'product_id')::BIGINT, new_variant_id, auth.uid(), (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, (item->>'imei')::TEXT, (item->'item_attributes')::JSONB, p_supplier_id, new_purchase_id);
        END LOOP;

        -- Step 8: Calculate the total purchase amount.
        total_purchase_amount := total_purchase_amount + ((item->>'purchase_price')::NUMERIC * item_quantity);
    END LOOP;

    -- Step 9: Update the 'purchases' record with the correct total.
    UPDATE public.purchases SET total_amount = total_purchase_amount, balance_due = total_purchase_amount
    WHERE id = new_purchase_id;

    -- Step 10: Return the ID of the new purchase.
    RETURN new_purchase_id;
END;
$$;