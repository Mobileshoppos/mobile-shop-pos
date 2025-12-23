-- Function: process_purchase_return
-- Hum purane function ko overwrite kar rahe hain taake items delete na hon.

CREATE OR REPLACE FUNCTION public.process_purchase_return(
    p_purchase_id bigint, 
    p_item_ids bigint[], 
    p_return_date date, 
    p_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_supplier_id bigint;
    v_total_return_amount numeric := 0;
    v_new_return_id bigint;
    item_record record;
    v_purchase_balance_due numeric;
    v_return_to_clear_debt numeric;
    v_credit_to_add numeric;
BEGIN
    -- 1. Purchase ki maloomat layein
    SELECT supplier_id, balance_due INTO v_supplier_id, v_purchase_balance_due
    FROM public.purchases WHERE id = p_purchase_id;

    -- 2. Return honay walay items ki total qeemat calculate karein
    SELECT COALESCE(SUM(purchase_price), 0) INTO v_total_return_amount
    FROM public.inventory WHERE id = ANY(p_item_ids);

    IF v_total_return_amount <= 0 THEN RETURN; END IF;

    -- 3. Hisaab lagayein (Kitna udhaar utrega aur kitna credit milega)
    v_return_to_clear_debt := LEAST(v_total_return_amount, v_purchase_balance_due);
    v_credit_to_add := v_total_return_amount - v_return_to_clear_debt;

    -- 4. Return ka record banayein
    INSERT INTO public.purchase_returns (purchase_id, supplier_id, return_date, total_return_amount, notes, user_id)
    VALUES (p_purchase_id, v_supplier_id, p_return_date, v_total_return_amount, p_notes, auth.uid())
    RETURNING id INTO v_new_return_id;

    -- 5. Items ki history save karein
    FOR item_record IN SELECT * FROM public.inventory WHERE id = ANY(p_item_ids) LOOP
        INSERT INTO public.purchase_return_items (return_id, product_id, inventory_id_original, imei, purchase_price, user_id)
        VALUES (v_new_return_id, item_record.product_id, item_record.id, item_record.imei, item_record.purchase_price, auth.uid());
    END LOOP;

    -- 6. INVENTORY UPDATE (Yahan tabdeeli ki gayi hai)
    -- Pehle yahan DELETE tha, ab hum Status ko 'Returned' kar rahe hain.
    UPDATE public.inventory 
    SET status = 'Returned' 
    WHERE id = ANY(p_item_ids);

    -- 7. Purchase Record Update karein (Total kam karein)
    UPDATE public.purchases
    SET
        total_amount = total_amount - v_total_return_amount,
        balance_due = balance_due - v_return_to_clear_debt
    WHERE id = p_purchase_id;

    -- 8. Supplier ko Credit dein (Agar zaroorat ho)
    IF v_credit_to_add > 0 THEN
        UPDATE public.suppliers
        SET credit_balance = COALESCE(credit_balance, 0) + v_credit_to_add
        WHERE id = v_supplier_id;
    END IF;

    -- 9. Purchase ka Status update karein
    UPDATE public.purchases
    SET status = CASE
        WHEN balance_due <= 0 THEN 'paid'
        ELSE 'partially_paid'
    END
    WHERE id = p_purchase_id;
END;
$function$;