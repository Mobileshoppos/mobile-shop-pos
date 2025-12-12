CREATE OR REPLACE FUNCTION update_purchase_inventory(
    p_purchase_id BIGINT,
    p_supplier_id BIGINT,
    p_notes TEXT,
    p_amount_paid NUMERIC,
    p_items JSONB
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    item JSONB;
    v_item_id BIGINT;
    v_variant_id BIGINT;
    v_product_id BIGINT;
    v_total_amount NUMERIC := 0;
    v_kept_item_ids BIGINT[] := ARRAY[]::BIGINT[];
BEGIN
    -- 1. Purchase Update
    UPDATE purchases
    SET supplier_id = p_supplier_id,
        notes = p_notes
    WHERE id = p_purchase_id;

    -- 2. Items Loop
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_total_amount := v_total_amount + ((item->>'quantity')::INT * (item->>'purchase_price')::NUMERIC);

        IF (item->>'id') IS NOT NULL THEN
            -- OLD ITEM
            v_item_id := (item->>'id')::BIGINT;
            v_kept_item_ids := array_append(v_kept_item_ids, v_item_id); -- Safe List mein daala

            UPDATE inventory
            SET purchase_price = (item->>'purchase_price')::NUMERIC,
                sale_price = (item->>'sale_price')::NUMERIC,
                imei = (item->>'imei')::TEXT,
                item_attributes = (item->'item_attributes')::JSONB
            WHERE id = v_item_id;

            UPDATE product_variants
            SET purchase_price = (item->>'purchase_price')::NUMERIC,
                sale_price = (item->>'sale_price')::NUMERIC
            WHERE id = (SELECT variant_id FROM inventory WHERE id = v_item_id);

        ELSE
            -- NEW ITEM
            v_product_id := (item->>'product_id')::BIGINT;

            SELECT id INTO v_variant_id
            FROM product_variants
            WHERE product_id = v_product_id
            AND attributes = (item->'item_attributes')::JSONB;

            IF v_variant_id IS NULL THEN
                INSERT INTO product_variants (product_id, user_id, attributes, barcode, purchase_price, sale_price)
                VALUES (v_product_id, auth.uid(), (item->'item_attributes')::JSONB, (item->>'barcode')::TEXT, (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC)
                RETURNING id INTO v_variant_id;
            END IF;

            -- FIX: Insert ke baad ID wapis li aur Safe List mein daal di
            INSERT INTO inventory (product_id, variant_id, user_id, purchase_price, sale_price, imei, item_attributes, supplier_id, purchase_id)
            VALUES (v_product_id, v_variant_id, auth.uid(), (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, (item->>'imei')::TEXT, (item->'item_attributes')::JSONB, p_supplier_id, p_purchase_id)
            RETURNING id INTO v_item_id; -- <--- ID pakri

            v_kept_item_ids := array_append(v_kept_item_ids, v_item_id); -- <--- Safe List mein daali
        END IF;
    END LOOP;

    -- 3. Delete Logic
    -- Ab naya item delete nahi hoga kyunke wo v_kept_item_ids mein shamil hai
    DELETE FROM inventory
    WHERE purchase_id = p_purchase_id
    AND id != ALL(v_kept_item_ids)
    AND status = 'Available';

    -- 4. Final Totals
    UPDATE purchases
    SET total_amount = v_total_amount,
        amount_paid = COALESCE(p_amount_paid, 0),
        balance_due = v_total_amount - COALESCE(p_amount_paid, 0),
        status = CASE
            WHEN (v_total_amount - COALESCE(p_amount_paid, 0)) <= 0 THEN 'paid'
            WHEN COALESCE(p_amount_paid, 0) > 0 THEN 'partially_paid'
            ELSE 'unpaid'
        END
    WHERE id = p_purchase_id;

END;
$$;