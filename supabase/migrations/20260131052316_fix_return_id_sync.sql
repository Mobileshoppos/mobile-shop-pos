-- process_purchase_return function ko update kiya ja raha hai taake yeh frontend ki ID use kare
CREATE OR REPLACE FUNCTION "public"."process_purchase_return"("p_return_id" "uuid", "p_purchase_id" "uuid", "p_return_items" "jsonb", "p_return_date" "date", "p_notes" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_supplier_id uuid;
    v_total_return_amount numeric := 0;
    -- FIX: gen_random_uuid() ki jagah frontend se aayi hui ID use karein
    v_new_return_id uuid := p_return_id; 
    item_record record;
    v_purchase_balance_due numeric;
    v_return_to_clear_debt numeric;
    v_credit_to_add numeric;
    v_item JSONB;
    v_inv_id UUID;
    v_qty_to_ret INT;
BEGIN
    -- Check if return already exists to prevent duplication on retry
    IF EXISTS (SELECT 1 FROM public.purchase_returns WHERE id = v_new_return_id) THEN
        RETURN;
    END IF;

    SELECT supplier_id, balance_due INTO v_supplier_id, v_purchase_balance_due
    FROM public.purchases WHERE id = p_purchase_id;

    INSERT INTO public.purchase_returns (id, purchase_id, supplier_id, return_date, total_return_amount, notes, user_id)
    VALUES (v_new_return_id, p_purchase_id, v_supplier_id, p_return_date, 0, p_notes, auth.uid());

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_return_items) LOOP
        v_inv_id := (v_item->>'inventory_id')::UUID;
        v_qty_to_ret := (v_item->>'qty')::INT;

        SELECT * INTO item_record FROM public.inventory WHERE id = v_inv_id;

        INSERT INTO public.purchase_return_items (id, return_id, product_id, inventory_id_original, imei, purchase_price, user_id)
        VALUES (gen_random_uuid(), v_new_return_id, item_record.product_id, v_inv_id, item_record.imei, item_record.purchase_price, auth.uid());

        IF item_record.imei IS NOT NULL THEN
            UPDATE public.inventory SET status = 'Returned', available_qty = 0, returned_qty = 1 WHERE id = v_inv_id;
            v_total_return_amount := v_total_return_amount + item_record.purchase_price;
        ELSE
            UPDATE public.inventory 
            SET available_qty = GREATEST(0, available_qty - v_qty_to_ret),
                returned_qty = returned_qty + v_qty_to_ret,
                status = CASE WHEN (available_qty - v_qty_to_ret) <= 0 AND sold_qty <= 0 THEN 'Returned' ELSE status END
            WHERE id = v_inv_id;
            v_total_return_amount := v_total_return_amount + (item_record.purchase_price * v_qty_to_ret);
        END IF;
    END LOOP;

    v_return_to_clear_debt := LEAST(v_total_return_amount, v_purchase_balance_due);
    v_credit_to_add := v_total_return_amount - v_return_to_clear_debt;

    UPDATE public.purchase_returns SET total_return_amount = v_total_return_amount WHERE id = v_new_return_id;
    UPDATE public.purchases SET 
        total_amount = total_amount - v_total_return_amount,
        balance_due = balance_due - v_return_to_clear_debt,
        status = CASE WHEN (balance_due - v_return_to_clear_debt) <= 0 THEN 'paid' ELSE 'partially_paid' END
    WHERE id = p_purchase_id;

    IF v_credit_to_add > 0 THEN
        UPDATE public.suppliers SET credit_balance = COALESCE(credit_balance, 0) + v_credit_to_add WHERE id = v_supplier_id;
    END IF;
END; $$;