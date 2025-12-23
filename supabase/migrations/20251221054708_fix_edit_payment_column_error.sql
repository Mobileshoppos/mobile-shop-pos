-- Function: edit_supplier_payment (Corrected)
-- Maqsad: Payment edit karna aur bills adjust karna (Bina 'total_payments' column ko chheray).

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
    v_old_amount numeric;
    v_supplier_id bigint;
    alloc record;
    v_remaining_amount numeric;
    v_pay_amount numeric;
    rec record;
    v_audit_note text;
BEGIN
    -- 1. Purani Payment ki maloomat lein
    SELECT amount, supplier_id INTO v_old_amount, v_supplier_id
    FROM supplier_payments WHERE id = p_payment_id;

    IF v_supplier_id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;

    -- 2. ROLLBACK (Purana hisaab wapis lein)
    -- A. Jin Bills ko paise mile thay, unhein wapis 'Unpaid' karein
    FOR alloc IN SELECT * FROM payment_allocations WHERE payment_id = p_payment_id LOOP
        UPDATE purchases
        SET amount_paid = amount_paid - alloc.amount,
            balance_due = balance_due + alloc.amount,
            status = CASE
                WHEN (balance_due + alloc.amount) >= total_amount THEN 'unpaid'
                ELSE 'partially_paid'
            END,
            notes = COALESCE(notes, '') || ' | Payment Edited/Reverted: ' || alloc.amount
        WHERE id = alloc.purchase_id;
    END LOOP;

    -- B. Purani Allocations delete karein
    DELETE FROM payment_allocations WHERE payment_id = p_payment_id;

    -- NOTE: Hum Supplier ka Total Paid update nahi kar rahe (Kyunke column nahi hai).

    -- 3. UPDATE PAYMENT RECORD (Nayi amount save karein)
    UPDATE supplier_payments
    SET amount = p_new_amount, notes = p_new_notes
    WHERE id = p_payment_id;

    -- 4. RE-APPLY (Naya hisaab lagayein)
    -- FIFO Logic (Purane bills pehle)
    v_remaining_amount := p_new_amount;

    FOR rec IN
        SELECT * FROM purchases
        WHERE supplier_id = v_supplier_id
        AND balance_due > 0
        ORDER BY purchase_date ASC
    LOOP
        IF v_remaining_amount <= 0 THEN EXIT; END IF;

        v_pay_amount := LEAST(v_remaining_amount, rec.balance_due);
        v_audit_note := ' | Auto-Paid: ' || v_pay_amount || ' via Edited Payment';

        -- Purchase Update
        UPDATE purchases
        SET
            amount_paid = amount_paid + v_pay_amount,
            balance_due = balance_due - v_pay_amount,
            status = CASE WHEN (balance_due - v_pay_amount) <= 0 THEN 'paid' ELSE 'partially_paid' END,
            notes = COALESCE(notes, '') || v_audit_note
        WHERE id = rec.id;

        -- Nayi Allocation Record karein
        INSERT INTO payment_allocations (payment_id, purchase_id, amount)
        VALUES (p_payment_id, rec.id, v_pay_amount);

        v_remaining_amount := v_remaining_amount - v_pay_amount;
    END LOOP;

END;
$$;