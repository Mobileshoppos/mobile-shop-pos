CREATE OR REPLACE FUNCTION public.record_bulk_supplier_payment(
    p_supplier_id bigint,
    p_amount numeric,
    p_payment_method text,
    p_payment_date date,
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
    v_audit_note text;
BEGIN
    -- 1. Payment Record Save karein
    INSERT INTO supplier_payments (supplier_id, purchase_id, amount, payment_date, payment_method, notes, user_id)
    VALUES (p_supplier_id, NULL, p_amount, p_payment_date, p_payment_method, p_notes, auth.uid());

    -- 2. Supplier ka Total Paid update karein
    UPDATE suppliers
    SET total_payments = COALESCE(total_payments, 0) + p_amount
    WHERE id = p_supplier_id;

    -- 3. SMART LOGIC: Purane Bills ko dhoondo aur pay karo (FIFO)
    FOR rec IN 
        SELECT * FROM purchases 
        WHERE supplier_id = p_supplier_id 
        AND balance_due > 0 
        ORDER BY purchase_date ASC 
    LOOP
        IF v_remaining_amount <= 0 THEN
            EXIT;
        END IF;

        v_pay_amount := LEAST(v_remaining_amount, rec.balance_due);
        v_audit_note := ' | Auto-Paid: ' || v_pay_amount || ' via Bulk Payment on ' || p_payment_date;

        UPDATE purchases
        SET 
            amount_paid = amount_paid + v_pay_amount,
            balance_due = balance_due - v_pay_amount,
            status = CASE 
                WHEN (balance_due - v_pay_amount) <= 0 THEN 'paid' 
                ELSE 'partially_paid' 
            END,
            notes = COALESCE(notes, '') || v_audit_note
        WHERE id = rec.id;

        v_remaining_amount := v_remaining_amount - v_pay_amount;
    END LOOP;
END;
$$;