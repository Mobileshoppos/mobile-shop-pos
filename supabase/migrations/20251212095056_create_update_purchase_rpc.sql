-- Function: update_purchase_inventory
-- Maqsad: Purchase ko update karna aur Inventory ko adjust karna (Safe Mode)

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
    v_kept_item_ids BIGINT[] := ARRAY[]::BIGINT[]; -- Wo items jo delete nahi karne
BEGIN
    -- 1. Purchase Table Update
    UPDATE purchases
    SET supplier_id = p_supplier_id,
        notes = p_notes
    WHERE id = p_purchase_id;

    -- 2. Items Loop
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Total Amount jama karein
        v_total_amount := v_total_amount + ((item->>'quantity')::INT * (item->>'purchase_price')::NUMERIC);

        -- Check: Kya yeh purana item hai? (ID number honi chahiye)
        -- SyncContext ne UUIDs ko pehle hi NULL kar diya hai, is liye error nahi aayega.
        IF (item->>'id') IS NOT NULL THEN
            v_item_id := (item->>'id')::BIGINT;
            v_kept_item_ids := array_append(v_kept_item_ids, v_item_id);

            -- Purane item ko update karein
            UPDATE inventory
            SET purchase_price = (item->>'purchase_price')::NUMERIC,
                sale_price = (item->>'sale_price')::NUMERIC,
                imei = (item->>'imei')::TEXT,
                item_attributes = (item->'item_attributes')::JSONB
            WHERE id = v_item_id;

            -- Variant prices bhi update karein
            UPDATE product_variants
            SET purchase_price = (item->>'purchase_price')::NUMERIC,
                sale_price = (item->>'sale_price')::NUMERIC
            WHERE id = (SELECT variant_id FROM inventory WHERE id = v_item_id);

        ELSE
            -- Naya Item (Insert)
            v_product_id := (item->>'product_id')::BIGINT;

            -- Variant dhoondein ya banayein
            SELECT id INTO v_variant_id
            FROM product_variants
            WHERE product_id = v_product_id
            AND attributes = (item->'item_attributes')::JSONB;

            IF v_variant_id IS NULL THEN
                INSERT INTO product_variants (product_id, user_id, attributes, barcode, purchase_price, sale_price)
                VALUES (v_product_id, auth.uid(), (item->'item_attributes')::JSONB, (item->>'barcode')::TEXT, (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC)
                RETURNING id INTO v_variant_id;
            END IF;

            -- Inventory mein daalein
            INSERT INTO inventory (product_id, variant_id, user_id, purchase_price, sale_price, imei, item_attributes, supplier_id, purchase_id)
            VALUES (v_product_id, v_variant_id, auth.uid(), (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, (item->>'imei')::TEXT, (item->'item_attributes')::JSONB, p_supplier_id, p_purchase_id);
        END IF;
    END LOOP;

    -- 3. Delete Logic (Jo items list se nikaal diye gaye hain)
    -- Sirf 'Available' items delete honge. Sold items ko haath nahi lagaya jayega.
    DELETE FROM inventory
    WHERE purchase_id = p_purchase_id
    AND id != ALL(v_kept_item_ids)
    AND status = 'Available';

    -- 4. Final Totals Update
    UPDATE purchases
    SET total_amount = v_total_amount,
        amount_paid = p_amount_paid,
        balance_due = v_total_amount - p_amount_paid,
        status = CASE
            WHEN (v_total_amount - p_amount_paid) <= 0 THEN 'paid'
            WHEN p_amount_paid > 0 THEN 'partially_paid'
            ELSE 'unpaid'
        END
    WHERE id = p_purchase_id;

END;
$$;