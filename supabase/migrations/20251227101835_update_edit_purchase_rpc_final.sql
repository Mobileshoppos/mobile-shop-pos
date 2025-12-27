CREATE OR REPLACE FUNCTION public.update_purchase_inventory(
    p_purchase_id bigint, 
    p_supplier_id bigint, 
    p_notes text, 
    p_amount_paid numeric, 
    p_items jsonb,
    p_local_id uuid -- NAYA: Sirf yeh parameter add kiya
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    item JSONB;
    v_item_id BIGINT;
    v_variant_id BIGINT;
    v_product_id BIGINT;
    v_total_amount NUMERIC := 0;
    v_kept_item_ids BIGINT[] := ARRAY[]::BIGINT[];
    v_quantity INT;
    v_new_id BIGINT;
    
    -- Variables for Credit Logic
    v_old_total NUMERIC;
    v_old_paid NUMERIC;
    v_old_balance_due NUMERIC;
    v_old_overpayment NUMERIC;
    v_credit_in_purchase NUMERIC;
    v_credit_in_supplier NUMERIC;
    
    v_new_balance_raw NUMERIC;
    v_credit_to_add NUMERIC;
    v_final_balance_due NUMERIC;
BEGIN
    -- 1. Purana Data lein
    SELECT total_amount, amount_paid, balance_due 
    INTO v_old_total, v_old_paid, v_old_balance_due
    FROM purchases WHERE id = p_purchase_id;

    -- 2. CREDIT REVERSAL (Aap ka asli logic)
    v_old_overpayment := COALESCE(v_old_paid, 0) - COALESCE(v_old_total, 0);
    IF v_old_overpayment > 0 THEN
        v_credit_in_purchase := ABS(LEAST(v_old_balance_due, 0));
        v_credit_in_supplier := v_old_overpayment - v_credit_in_purchase;
        IF v_credit_in_supplier > 0 THEN
            UPDATE suppliers SET credit_balance = credit_balance - v_credit_in_supplier WHERE id = p_supplier_id;
        END IF;
    END IF;

    -- 3. Purchase Update (Basic Info) - local_id update karein
    UPDATE purchases
    SET supplier_id = p_supplier_id,
        notes = p_notes,
        amount_paid = p_amount_paid,
        local_id = p_local_id -- NAYA: local_id yahan save hoga
    WHERE id = p_purchase_id;

    -- 4. Items Loop (Aap ka asli loop)
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_quantity := COALESCE((item->>'quantity')::INT, 1);
        
        IF (item->>'id') IS NOT NULL AND (item->>'id') != 'null' THEN
            v_item_id := (item->>'id')::BIGINT;
            v_kept_item_ids := array_append(v_kept_item_ids, v_item_id);

            UPDATE inventory
            SET purchase_price = (item->>'purchase_price')::NUMERIC,
                sale_price = (item->>'sale_price')::NUMERIC,
                imei = (item->>'imei')::TEXT,
                item_attributes = (item->'item_attributes')::JSONB,
                status = COALESCE((item->>'status'), status)
            WHERE id = v_item_id;

            UPDATE product_variants
            SET purchase_price = (item->>'purchase_price')::NUMERIC,
                sale_price = (item->>'sale_price')::NUMERIC
            WHERE id = (SELECT variant_id FROM inventory WHERE id = v_item_id);

            IF v_quantity > 1 THEN
                FOR i IN 2..v_quantity LOOP
                    -- Naye items ke liye local_id add kiya
                    INSERT INTO inventory (local_id, product_id, variant_id, user_id, purchase_price, sale_price, imei, item_attributes, supplier_id, purchase_id, status)
                    SELECT gen_random_uuid(), product_id, variant_id, user_id, (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, (item->>'imei')::TEXT, (item->'item_attributes')::JSONB, p_supplier_id, p_purchase_id, 'Available'
                    FROM inventory WHERE id = v_item_id
                    RETURNING id INTO v_new_id;
                    v_kept_item_ids := array_append(v_kept_item_ids, v_new_id);
                END LOOP;
            END IF;
        ELSE
            v_product_id := (item->>'product_id')::BIGINT;
            SELECT id INTO v_variant_id FROM product_variants WHERE product_id = v_product_id AND attributes = (item->'item_attributes')::JSONB;
            IF v_variant_id IS NULL THEN
                -- Naya variant banate waqt local_id add kiya
                INSERT INTO product_variants (local_id, product_id, user_id, attributes, barcode, purchase_price, sale_price) 
                VALUES (gen_random_uuid(), v_product_id, auth.uid(), (item->'item_attributes')::JSONB, (item->>'barcode')::TEXT, (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC) 
                RETURNING id INTO v_variant_id;
            END IF;
            FOR i IN 1..v_quantity LOOP
                -- Naya inventory item banate waqt local_id add kiya
                INSERT INTO inventory (local_id, product_id, variant_id, user_id, purchase_price, sale_price, imei, item_attributes, supplier_id, purchase_id, status) 
                VALUES (gen_random_uuid(), v_product_id, v_variant_id, auth.uid(), (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, (item->>'imei')::TEXT, (item->'item_attributes')::JSONB, p_supplier_id, p_purchase_id, 'Available') 
                RETURNING id INTO v_new_id;
                v_kept_item_ids := array_append(v_kept_item_ids, v_new_id);
            END LOOP;
        END IF;
    END LOOP;

    -- 5. Delete Logic (Aap ka asli logic)
    DELETE FROM inventory
    WHERE purchase_id = p_purchase_id
    AND id != ALL(v_kept_item_ids)
    AND status != 'Returned';

    -- 6. TOTAL CALCULATION
    SELECT COALESCE(SUM(purchase_price), 0) INTO v_total_amount
    FROM inventory WHERE purchase_id = p_purchase_id AND status != 'Returned';

    -- 7. CREDIT APPLICATION (Aap ka asli logic)
    v_new_balance_raw := v_total_amount - COALESCE(p_amount_paid, 0);
    IF v_new_balance_raw < 0 THEN
        v_credit_to_add := ABS(v_new_balance_raw);
        UPDATE suppliers SET credit_balance = COALESCE(credit_balance, 0) + v_credit_to_add WHERE id = p_supplier_id;
        v_final_balance_due := 0;
    ELSE
        v_final_balance_due := v_new_balance_raw;
    END IF;

    -- 8. Final Update
    UPDATE purchases
    SET total_amount = v_total_amount,
        balance_due = v_final_balance_due,
        status = CASE WHEN v_final_balance_due <= 0 THEN 'paid' ELSE 'partially_paid' END
    WHERE id = p_purchase_id;
END;
$function$;