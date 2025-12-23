CREATE OR REPLACE FUNCTION public.update_purchase_inventory(
    p_purchase_id BIGINT,
    p_supplier_id BIGINT,
    p_notes TEXT,
    p_amount_paid NUMERIC,
    p_items JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item JSONB;
    v_item_id BIGINT;
    v_variant_id BIGINT;
    v_product_id BIGINT;
    v_total_amount NUMERIC := 0;
    v_old_total NUMERIC;
    v_kept_item_ids BIGINT[] := ARRAY[]::BIGINT[];
    v_quantity INT;
    v_new_id BIGINT;
    v_diff_total NUMERIC;
BEGIN
    -- 1. Purana Total lein (Supplier Balance adjust karne ke liye)
    SELECT total_amount INTO v_old_total FROM purchases WHERE id = p_purchase_id;

    -- 2. Purchase Update (Basic Info)
    UPDATE purchases
    SET supplier_id = p_supplier_id,
        notes = p_notes,
        amount_paid = p_amount_paid
    WHERE id = p_purchase_id;

    -- 3. Items Loop (Aapka purana logic - Variants/Expansion wala)
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_quantity := COALESCE((item->>'quantity')::INT, 1);
        
        -- NOTE: Hum yahan Total calculate nahi karenge, kyunke woh ghalat ho sakta hai.
        
        -- CASE A: OLD ITEM (Update)
        IF (item->>'id') IS NOT NULL AND (item->>'id') != 'null' THEN
            v_item_id := (item->>'id')::BIGINT;
            v_kept_item_ids := array_append(v_kept_item_ids, v_item_id);

            -- Status ko preserve karein (Agar Returned hai to Returned rahe)
            UPDATE inventory
            SET purchase_price = (item->>'purchase_price')::NUMERIC,
                sale_price = (item->>'sale_price')::NUMERIC,
                imei = (item->>'imei')::TEXT,
                item_attributes = (item->'item_attributes')::JSONB,
                -- Agar frontend se status aa raha hai to wo, warna purana status
                status = COALESCE((item->>'status'), status)
            WHERE id = v_item_id;

            -- Variant Price Update
            UPDATE product_variants
            SET purchase_price = (item->>'purchase_price')::NUMERIC,
                sale_price = (item->>'sale_price')::NUMERIC
            WHERE id = (SELECT variant_id FROM inventory WHERE id = v_item_id);

            -- Agar Quantity barhayi gayi hai (Expansion)
            IF v_quantity > 1 THEN
                FOR i IN 2..v_quantity LOOP
                    INSERT INTO inventory (product_id, variant_id, user_id, purchase_price, sale_price, imei, item_attributes, supplier_id, purchase_id, status)
                    SELECT product_id, variant_id, user_id, (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, (item->>'imei')::TEXT, (item->'item_attributes')::JSONB, p_supplier_id, p_purchase_id, 'Available'
                    FROM inventory WHERE id = v_item_id
                    RETURNING id INTO v_new_id;

                    v_kept_item_ids := array_append(v_kept_item_ids, v_new_id);
                END LOOP;
            END IF;

        -- CASE B: NEW ITEM (Insert)
        ELSE
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

            FOR i IN 1..v_quantity LOOP
                INSERT INTO inventory (product_id, variant_id, user_id, purchase_price, sale_price, imei, item_attributes, supplier_id, purchase_id, status)
                VALUES (v_product_id, v_variant_id, auth.uid(), (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, (item->>'imei')::TEXT, (item->'item_attributes')::JSONB, p_supplier_id, p_purchase_id, 'Available')
                RETURNING id INTO v_new_id;

                v_kept_item_ids := array_append(v_kept_item_ids, v_new_id);
            END LOOP;
        END IF;
    END LOOP;

    -- 4. Delete Logic (Jo items list mein nahi hain aur Returned NAHI hain unhein delete karein)
    DELETE FROM inventory
    WHERE purchase_id = p_purchase_id
    AND id != ALL(v_kept_item_ids)
    AND status != 'Returned'; -- Safety: Returned items delete na hon

    -- 5. TOTAL CALCULATION (ASAL FIX)
    -- Ab hum Database se pooch rahe hain: "Sirf Active items ka total batao"
    SELECT COALESCE(SUM(purchase_price), 0)
    INTO v_total_amount
    FROM inventory
    WHERE purchase_id = p_purchase_id
    AND status != 'Returned';

    -- 6. Final Update on Purchase
    UPDATE purchases
    SET total_amount = v_total_amount,
        balance_due = v_total_amount - COALESCE(p_amount_paid, 0),
        status = CASE
            WHEN (v_total_amount - COALESCE(p_amount_paid, 0)) <= 0 THEN 'paid'
            ELSE 'partially_paid'
        END
    WHERE id = p_purchase_id;

    -- 7. Supplier Balance Adjust karein
    v_diff_total := v_total_amount - COALESCE(v_old_total, 0);
    IF v_diff_total <> 0 THEN
        UPDATE suppliers
        SET balance_due = balance_due + v_diff_total
        WHERE id = p_supplier_id;
    END IF;

END;
$$;