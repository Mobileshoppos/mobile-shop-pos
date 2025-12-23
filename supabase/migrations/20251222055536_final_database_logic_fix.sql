-- 1. Sab se pehle purane functions ko saaf karein
DROP FUNCTION IF EXISTS public.edit_supplier_payment(bigint, numeric, text);
DROP FUNCTION IF EXISTS public.fn_sync_supplier_credit_manual(bigint);

-- 2. Sahi Manual Sync Function (Sirf credit_balance ko chherega)
CREATE OR REPLACE FUNCTION public.fn_sync_supplier_credit_manual(p_supplier_id bigint)
RETURNS void AS $$
DECLARE
    v_total_business numeric;
    v_total_paid numeric;
BEGIN
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_business FROM public.purchases WHERE supplier_id = p_supplier_id;
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM public.supplier_payments WHERE supplier_id = p_supplier_id;
    
    UPDATE public.suppliers
    SET credit_balance = GREATEST(0, v_total_paid - v_total_business)
    WHERE id = p_supplier_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Sahi Edit Payment Function (Jo server par error de raha tha)
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

    -- Rollback purani allocations
    FOR alloc IN SELECT * FROM public.payment_allocations WHERE payment_id = p_payment_id LOOP
        UPDATE public.purchases
        SET amount_paid = amount_paid - alloc.amount,
            balance_due = balance_due + alloc.amount,
            status = CASE WHEN (balance_due + alloc.amount) >= total_amount THEN 'unpaid' ELSE 'partially_paid' END
        WHERE id = alloc.purchase_id;
    END LOOP;
    DELETE FROM public.payment_allocations WHERE payment_id = p_payment_id;

    -- Update Payment Record
    UPDATE public.supplier_payments SET amount = p_new_amount, notes = p_new_notes WHERE id = p_payment_id;

    -- Re-allocate (FIFO)
    FOR rec IN 
        SELECT id, balance_due FROM public.purchases 
        WHERE supplier_id = v_supplier_id AND balance_due > 0 
        ORDER BY purchase_date ASC, id ASC
    LOOP
        IF v_remaining_amount <= 0 THEN EXIT; END IF;
        v_pay_amount := LEAST(v_remaining_amount, rec.balance_due);
        UPDATE public.purchases
        SET amount_paid = amount_paid + v_pay_amount,
            balance_due = balance_due - v_pay_amount,
            status = CASE WHEN (balance_due - v_pay_amount) <= 0 THEN 'paid' ELSE 'partially_paid' END
        WHERE id = rec.id;
        INSERT INTO public.payment_allocations (payment_id, purchase_id, amount)
        VALUES (p_payment_id, rec.id, v_pay_amount);
        v_remaining_amount := v_remaining_amount - v_pay_amount;
    END LOOP;

    -- AHEM: Supplier ka balance update karein (Sirf credit_balance)
    PERFORM public.fn_sync_supplier_credit_manual(v_supplier_id);
END;
$$;