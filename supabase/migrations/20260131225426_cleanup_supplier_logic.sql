-- 1. record_supplier_refund ko theek karein (Manual Update khatam)
CREATE OR REPLACE FUNCTION "public"."record_supplier_refund"("p_local_id" "uuid", "p_supplier_id" "uuid", "p_amount" numeric, "p_refund_date" "text", "p_method" "text", "p_notes" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.supplier_refunds WHERE id = p_local_id OR local_id = p_local_id) THEN
        RETURN;
    END IF;

    INSERT INTO public.supplier_refunds (id, local_id, supplier_id, amount, refund_date, payment_method, notes, user_id)
    VALUES (p_local_id, p_local_id, p_supplier_id, p_amount, p_refund_date::date, p_method, p_notes, auth.uid());
    
    -- Note: Credit balance trigger (fn_trg_sync_supplier_credit) khud hi update kar dega
END; $$;

-- 2. process_purchase_return ko theek karein (Manual Update khatam)
CREATE OR REPLACE FUNCTION "public"."process_purchase_return"("p_return_id" "uuid", "p_purchase_id" "uuid", "p_return_items" "jsonb", "p_return_date" "date", "p_notes" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_supplier_id uuid;
    v_total_return_amount numeric := 0;
    v_new_return_id uuid := p_return_id; 
    item_record record;
    v_purchase_balance_due numeric;
    v_return_to_clear_debt numeric;
    v_item JSONB;
    v_inv_id UUID;
    v_qty_to_ret INT;
BEGIN
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

    UPDATE public.purchase_returns SET total_return_amount = v_total_return_amount WHERE id = v_new_return_id;
    
    -- Jab yeh update hoga, to Trigger khud hi Supplier ka balance sahi kar dega
    UPDATE public.purchases SET 
        total_amount = total_amount - v_total_return_amount,
        balance_due = balance_due - v_return_to_clear_debt,
        status = CASE WHEN (balance_due - v_return_to_clear_debt) <= 0 THEN 'paid' ELSE 'partially_paid' END
    WHERE id = p_purchase_id;

END; $$;

-- 3. Aakhri kaam: Tamam suppliers ka balance aik baar sahi recalculate karein
DO $$ 
DECLARE 
    sup_id uuid;
BEGIN
    FOR sup_id IN SELECT id FROM public.suppliers LOOP
        PERFORM public.fn_sync_supplier_credit_manual(sup_id);
    END LOOP;
END $$;