CREATE OR REPLACE FUNCTION edit_supplier_payment(
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
    v_total_business numeric;
    v_total_paid numeric;
BEGIN
    -- 1. Supplier ID lein
    SELECT supplier_id INTO v_supplier_id FROM supplier_payments WHERE id = p_payment_id;

    -- 2. Rollback
    FOR alloc IN SELECT * FROM payment_allocations WHERE payment_id = p_payment_id LOOP
        UPDATE purchases
        SET amount_paid = amount_paid - alloc.amount,
            balance_due = balance_due + alloc.amount,
            status = CASE WHEN (balance_due + alloc.amount) >= total_amount THEN 'unpaid' ELSE 'partially_paid' END
        WHERE id = alloc.purchase_id;
    END LOOP;
    DELETE FROM payment_allocations WHERE payment_id = p_payment_id;

    -- 3. Update Payment
    UPDATE supplier_payments SET amount = p_new_amount, notes = p_new_notes WHERE id = p_payment_id;

    -- 4. Re-allocate (Bills settle karein)
    FOR rec IN 
        SELECT id, balance_due FROM purchases 
        WHERE supplier_id = v_supplier_id AND balance_due > 0 
        ORDER BY purchase_date ASC, id ASC
    LOOP
        IF v_remaining_amount <= 0 THEN EXIT; END IF;
        v_pay_amount := LEAST(v_remaining_amount, rec.balance_due);
        UPDATE purchases
        SET amount_paid = amount_paid + v_pay_amount,
            balance_due = balance_due - v_pay_amount,
            status = CASE WHEN (balance_due - v_pay_amount) <= 0 THEN 'paid' ELSE 'partially_paid' END
        WHERE id = rec.id;
        INSERT INTO payment_allocations (payment_id, purchase_id, amount)
        VALUES (p_payment_id, rec.id, v_pay_amount);
        v_remaining_amount := v_remaining_amount - v_pay_amount;
    END LOOP;

    -- 5. FINAL SYNC (Supplier ka main balance theek karein)
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_business FROM purchases WHERE supplier_id = v_supplier_id;
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM supplier_payments WHERE supplier_id = v_supplier_id;

    UPDATE suppliers
    SET 
        balance_due = GREATEST(0, v_total_business - v_total_paid),
        credit_balance = GREATEST(0, v_total_paid - v_total_business)
    WHERE id = v_supplier_id;

END;
$$;