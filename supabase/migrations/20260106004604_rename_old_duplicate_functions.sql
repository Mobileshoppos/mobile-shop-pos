DROP FUNCTION IF EXISTS public.process_purchase_return(p_purchase_id bigint, p_item_ids bigint[], p_return_date date, p_notes text);

CREATE OR REPLACE FUNCTION public.old_process_purchase_return(p_purchase_id bigint, p_item_ids bigint[], p_return_date date, p_notes text)
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
    SELECT supplier_id, balance_due INTO v_supplier_id, v_purchase_balance_due
    FROM public.purchases WHERE id = p_purchase_id;

    -- Return Record banayein
    INSERT INTO public.purchase_returns (purchase_id, supplier_id, return_date, total_return_amount, notes, user_id)
    VALUES (p_purchase_id, v_supplier_id, p_return_date, 0, p_notes, auth.uid())
    RETURNING id INTO v_new_return_id;

    -- Items Loop
    FOR item_record IN SELECT * FROM public.inventory WHERE id = ANY(p_item_ids) LOOP
        -- History save karein
        INSERT INTO public.purchase_return_items (return_id, product_id, inventory_id_original, imei, purchase_price, user_id)
        VALUES (v_new_return_id, item_record.product_id, item_record.id, item_record.imei, item_record.purchase_price, auth.uid());

        -- INVENTORY UPDATE (Bulk Logic)
        IF item_record.imei IS NOT NULL THEN
            -- IMEI Based: Purana tareeqa
            UPDATE public.inventory SET status = 'Returned', available_qty = 0, returned_qty = 1 WHERE id = item_record.id;
            v_total_return_amount := v_total_return_amount + item_record.purchase_price;
        ELSE
            -- Bulk Based: Sirf 1 unit return kar rahe hain (UI se 1-1 karke select hota hai)
            UPDATE public.inventory 
            SET 
                available_qty = GREATEST(0, available_qty - 1),
                returned_qty = returned_qty + 1,
                status = CASE WHEN (available_qty - 1) <= 0 AND sold_qty <= 0 THEN 'Returned' ELSE status END
            WHERE id = item_record.id;
            v_total_return_amount := v_total_return_amount + item_record.purchase_price;
        END IF;
    END LOOP;

    -- Hisaab lagayein
    v_return_to_clear_debt := LEAST(v_total_return_amount, v_purchase_balance_due);
    v_credit_to_add := v_total_return_amount - v_return_to_clear_debt;

    -- Totals update karein
    UPDATE public.purchase_returns SET total_return_amount = v_total_return_amount WHERE id = v_new_return_id;
    UPDATE public.purchases SET 
        total_amount = total_amount - v_total_return_amount,
        balance_due = balance_due - v_return_to_clear_debt,
        status = CASE WHEN (balance_due - v_return_to_clear_debt) <= 0 THEN 'paid' ELSE 'partially_paid' END
    WHERE id = p_purchase_id;

    IF v_credit_to_add > 0 THEN
        UPDATE public.suppliers SET credit_balance = COALESCE(credit_balance, 0) + v_credit_to_add WHERE id = v_supplier_id;
    END IF;
END;
$function$;

DROP FUNCTION IF EXISTS public.record_supplier_refund(p_supplier_id bigint, p_amount numeric, p_refund_date date, p_method text, p_notes text);

CREATE OR REPLACE FUNCTION public.old_record_supplier_refund(p_supplier_id bigint, p_amount numeric, p_refund_date date, p_method text, p_notes text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- A. Refund ka record save karein
  INSERT INTO supplier_refunds (supplier_id, amount, refund_date, payment_method, notes)
  VALUES (p_supplier_id, p_amount, p_refund_date, p_method, p_notes);

  -- B. Supplier ka Credit Balance kam karein (Minus)
  UPDATE suppliers
  SET credit_balance = credit_balance - p_amount
  WHERE id = p_supplier_id;
END;
$function$;