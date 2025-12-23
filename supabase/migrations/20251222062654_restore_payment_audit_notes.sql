-- 1. Record Bulk Payment Function (With Audit Notes)
CREATE OR REPLACE FUNCTION public.record_bulk_supplier_payment(
    p_supplier_id bigint,
    p_amount numeric,
    p_payment_method text,
    p_payment_date timestamptz,
    p_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_remaining_amount numeric := p_amount;
    v_pay_amount numeric;
    rec record;
    v_payment_id bigint;
    v_audit_text text;
BEGIN
    INSERT INTO supplier_payments (supplier_id, amount, payment_date, payment_method, notes, user_id)
    VALUES (p_supplier_id, p_amount, p_payment_date, p_payment_method, p_notes, auth.uid())
    RETURNING id INTO v_payment_id;

    FOR rec IN 
        SELECT id, balance_due FROM purchases 
        WHERE supplier_id = p_supplier_id AND balance_due > 0 
        ORDER BY purchase_date ASC, id ASC 
    LOOP
        IF v_remaining_amount <= 0 THEN EXIT; END IF;
        v_pay_amount := LEAST(v_remaining_amount, rec.balance_due);
        
        -- Audit Note tayyar karein
        v_audit_text := ' | Auto-Paid: ' || v_pay_amount || ' via Bulk Payment on ' || CURRENT_DATE;

        UPDATE purchases
        SET amount_paid = amount_paid + v_pay_amount,
            balance_due = balance_due - v_pay_amount,
            status = CASE WHEN (balance_due - v_pay_amount) <= 0 THEN 'paid' ELSE 'partially_paid' END,
            notes = COALESCE(notes, '') || v_audit_text -- Note yahan add ho raha hai
        WHERE id = rec.id;

        INSERT INTO payment_allocations (payment_id, purchase_id, amount)
        VALUES (v_payment_id, rec.id, v_pay_amount);
        v_remaining_amount := v_remaining_amount - v_pay_amount;
    END LOOP;
END;
$$;

-- 2. Edit Payment Function (With Revert & Re-apply Audit Notes)
CREATE OR REPLACE FUNCTION public.edit_supplier_payment(
    p_payment_id bigint,
    p_new_amount numeric,
    p_new_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_supplier_id bigint;
    alloc record;
    v_remaining_amount numeric := p_new_amount;
    v_pay_amount numeric;
    rec record;
BEGIN
    SELECT supplier_id INTO v_supplier_id FROM public.supplier_payments WHERE id = p_payment_id;

    -- Rollback (Purana note bhi add karein ke revert hua hai)
    FOR alloc IN SELECT * FROM payment_allocations WHERE payment_id = p_payment_id LOOP
        UPDATE public.purchases
        SET amount_paid = amount_paid - alloc.amount,
            balance_due = balance_due + alloc.amount,
            status = CASE WHEN (balance_due + alloc.amount) >= total_amount THEN 'unpaid' ELSE 'partially_paid' END,
            notes = COALESCE(notes, '') || ' | Payment Reverted: ' || alloc.amount -- Revert Note
        WHERE id = alloc.purchase_id;
    END LOOP;
    DELETE FROM payment_allocations WHERE payment_id = p_payment_id;

    UPDATE public.supplier_payments SET amount = p_new_amount, notes = p_new_notes WHERE id = p_payment_id;

    -- Re-allocate (Naya note add karein)
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
            notes = COALESCE(notes, '') || ' | Auto-Paid: ' || v_pay_amount || ' via Edited Payment' -- Edit Note
        WHERE id = rec.id;

        INSERT INTO public.payment_allocations (payment_id, purchase_id, amount)
        VALUES (p_payment_id, rec.id, v_pay_amount);
        v_remaining_amount := v_remaining_amount - v_pay_amount;
    END LOOP;

    PERFORM public.fn_sync_supplier_credit_manual(v_supplier_id);
END;
$$;