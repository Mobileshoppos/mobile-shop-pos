-- 1. Supplier Credit Manual Function ko update karte hain
CREATE OR REPLACE FUNCTION "public"."fn_sync_supplier_credit_manual"("p_supplier_id" uuid) RETURNS "void"
    LANGUAGE "plpgsql" AS $$
DECLARE
    v_total_business numeric;
    v_total_paid numeric;
BEGIN
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_business FROM public.purchases WHERE supplier_id = p_supplier_id;
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM public.supplier_payments WHERE supplier_id = p_supplier_id;
    
    UPDATE public.suppliers
    SET credit_balance = GREATEST(0, v_total_paid - v_total_business)
    WHERE id = p_supplier_id;
END; $$;

-- 2. Trigger Function ko update karte hain (YEH HAI ASAL MASLA)
CREATE OR REPLACE FUNCTION "public"."fn_trg_sync_supplier_credit"() RETURNS "trigger"
    LANGUAGE "plpgsql" AS $$
DECLARE
    v_supplier_id uuid; -- Isay bigint se uuid kar diya
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_supplier_id := OLD.supplier_id;
    ELSE
        v_supplier_id := NEW.supplier_id;
    END IF;

    PERFORM public.fn_sync_supplier_credit_manual(v_supplier_id);
    RETURN NULL;
END; $$;

-- 3. Edit Supplier Payment Function ko update karte hain
CREATE OR REPLACE FUNCTION "public"."edit_supplier_payment"("p_payment_id" uuid, "p_new_amount" numeric, "p_new_notes" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE
    v_supplier_id uuid;
    alloc record;
    v_remaining_amount numeric := p_new_amount;
    v_pay_amount numeric;
    rec record;
BEGIN
    SELECT supplier_id INTO v_supplier_id FROM public.supplier_payments WHERE id = p_payment_id;

    -- Rollback
    FOR alloc IN SELECT * FROM payment_allocations WHERE payment_id = p_payment_id LOOP
        UPDATE public.purchases
        SET amount_paid = amount_paid - alloc.amount,
            balance_due = balance_due + alloc.amount,
            status = CASE WHEN (balance_due + alloc.amount) >= total_amount THEN 'unpaid' ELSE 'partially_paid' END,
            notes = COALESCE(notes, '') || ' | Payment Reverted: ' || alloc.amount
        WHERE id = alloc.purchase_id;
    END LOOP;
    DELETE FROM payment_allocations WHERE payment_id = p_payment_id;

    UPDATE public.supplier_payments SET amount = p_new_amount, notes = p_new_notes WHERE id = p_payment_id;

    -- Re-allocate
    FOR rec IN 
        SELECT id, balance_due FROM purchases 
        WHERE supplier_id = v_supplier_id AND balance_due > 0 
        ORDER BY purchase_date ASC, id ASC
    LOOP
        IF v_remaining_amount <= 0 THEN EXIT; END IF;
        v_pay_amount := LEAST(v_remaining_amount, rec.balance_due);

        UPDATE public.purchases
        SET amount_paid = amount_paid + v_pay_amount,
            balance_due = balance_due - v_pay_amount,
            status = CASE WHEN (balance_due - v_pay_amount) <= 0 THEN 'paid' ELSE 'partially_paid' END,
            notes = COALESCE(notes, '') || ' | Auto-Paid: ' || v_pay_amount || ' via Edited Payment'
        WHERE id = rec.id;

        INSERT INTO public.payment_allocations (id, payment_id, purchase_id, amount)
        VALUES (gen_random_uuid(), p_payment_id, rec.id, v_pay_amount);
        v_remaining_amount := v_remaining_amount - v_pay_amount;
    END LOOP;

    PERFORM public.fn_sync_supplier_credit_manual(v_supplier_id);
END; $$;

-- 4. Undo Return Function ko update karte hain
CREATE OR REPLACE FUNCTION "public"."undo_return_item"("p_inventory_id" uuid) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE
    v_inv_record record;
BEGIN
    SELECT * INTO v_inv_record FROM public.inventory WHERE id = p_inventory_id;
    
    IF v_inv_record.imei IS NOT NULL THEN
        UPDATE public.inventory SET status = 'Available', available_qty = 1, returned_qty = 0 WHERE id = p_inventory_id;
    ELSE
        UPDATE public.inventory 
        SET available_qty = available_qty + 1,
            returned_qty = GREATEST(0, returned_qty - 1),
            status = 'Available'
        WHERE id = p_inventory_id;
    END IF;

    DELETE FROM public.purchase_return_items WHERE inventory_id_original = p_inventory_id::text; -- Cast if needed
END; $$;

-- 5. Process Purchase Return (Bulk Fix)
CREATE OR REPLACE FUNCTION "public"."process_purchase_return"("p_purchase_id" uuid, "p_return_items" "jsonb", "p_return_date" "date", "p_notes" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE
    v_supplier_id uuid;
    v_total_return_amount numeric := 0;
    v_new_return_id uuid := gen_random_uuid();
    item_record record;
    v_purchase_balance_due numeric;
    v_return_to_clear_debt numeric;
    v_credit_to_add numeric;
    v_item JSONB;
    v_inv_id UUID;
    v_qty_to_ret INT;
BEGIN
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