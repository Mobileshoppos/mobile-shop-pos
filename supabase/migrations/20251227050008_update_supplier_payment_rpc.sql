CREATE OR REPLACE FUNCTION public.record_bulk_supplier_payment(
    p_local_id uuid, -- Naya Parameter
    p_supplier_id bigint, 
    p_amount numeric, 
    p_payment_method text, 
    p_payment_date timestamp with time zone, 
    p_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_remaining_amount numeric := p_amount;
    v_pay_amount numeric;
    rec record;
    v_payment_id bigint;
    v_audit_text text;
BEGIN
    -- 1. DUPLICATE CHECK: Agar yeh local_id pehle se hai, to yahin se wapis ho jao
    IF EXISTS (SELECT 1 FROM public.supplier_payments WHERE local_id = p_local_id) THEN
        RETURN;
    END IF;

    -- 2. Payment Record mein local_id bhi save karein
    INSERT INTO supplier_payments (local_id, supplier_id, amount, payment_date, payment_method, notes, user_id)
    VALUES (p_local_id, p_supplier_id, p_amount, p_payment_date, p_payment_method, p_notes, auth.uid())
    RETURNING id INTO v_payment_id;

    -- 3. Baqi aap ka purana FIFO logic (Waisa hi rahega)
    FOR rec IN 
        SELECT id, balance_due FROM purchases 
        WHERE supplier_id = p_supplier_id AND balance_due > 0 
        ORDER BY purchase_date ASC, id ASC 
    LOOP
        IF v_remaining_amount <= 0 THEN EXIT; END IF;
        v_pay_amount := LEAST(v_remaining_amount, rec.balance_due);
        
        v_audit_text := ' | Auto-Paid: ' || v_pay_amount || ' via Bulk Payment on ' || CURRENT_DATE;

        UPDATE purchases
        SET amount_paid = amount_paid + v_pay_amount,
            balance_due = balance_due - v_pay_amount,
            status = CASE WHEN (balance_due - v_pay_amount) <= 0 THEN 'paid' ELSE 'partially_paid' END,
            notes = COALESCE(notes, '') || v_audit_text
        WHERE id = rec.id;

        INSERT INTO payment_allocations (payment_id, purchase_id, amount)
        VALUES (v_payment_id, rec.id, v_pay_amount);
        v_remaining_amount := v_remaining_amount - v_pay_amount;
    END LOOP;
END;
$function$;