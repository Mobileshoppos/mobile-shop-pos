-- 1. Purane functions ko delete karein taake naye sahi se install ho sakein
DROP FUNCTION IF EXISTS record_bulk_supplier_payment(uuid, numeric, text, timestamptz, text);
DROP FUNCTION IF EXISTS edit_supplier_payment(bigint, numeric, text);

-- 2. Naya Function: Record Bulk Payment (FIFO Logic)
CREATE OR REPLACE FUNCTION record_bulk_supplier_payment(
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
BEGIN
    -- Payment record insert karein
    INSERT INTO supplier_payments (supplier_id, amount, payment_date, payment_method, notes, user_id)
    VALUES (p_supplier_id, p_amount, p_payment_date, p_payment_method, p_notes, auth.uid())
    RETURNING id INTO v_payment_id;

    -- FIFO: Purane bills pehle pay karein
    FOR rec IN 
        SELECT id, balance_due FROM purchases 
        WHERE supplier_id = p_supplier_id AND balance_due > 0 
        ORDER BY purchase_date ASC, id ASC 
    LOOP
        IF v_remaining_amount <= 0 THEN EXIT; END IF;

        v_pay_amount := LEAST(v_remaining_amount, rec.balance_due);

        UPDATE purchases
        SET 
            amount_paid = amount_paid + v_pay_amount,
            balance_due = balance_due - v_pay_amount,
            status = CASE WHEN (balance_due - v_pay_amount) <= 0 THEN 'paid' ELSE 'partially_paid' END
        WHERE id = rec.id;

        INSERT INTO payment_allocations (payment_id, purchase_id, amount)
        VALUES (v_payment_id, rec.id, v_pay_amount);

        v_remaining_amount := v_remaining_amount - v_pay_amount;
    END LOOP;
END;
$$;

-- 3. Naya Function: Edit Supplier Payment (Rollback & Re-allocate)
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
BEGIN
    -- Payment ki maloomat lein
    SELECT supplier_id INTO v_supplier_id FROM supplier_payments WHERE id = p_payment_id;

    -- ROLLBACK: Purani allocations khatam karke bills ko wapis purani halat mein layein
    FOR alloc IN SELECT * FROM payment_allocations WHERE payment_id = p_payment_id LOOP
        UPDATE purchases
        SET 
            amount_paid = amount_paid - alloc.amount,
            balance_due = balance_due + alloc.amount,
            status = CASE 
                WHEN (balance_due + alloc.amount) >= total_amount THEN 'unpaid' 
                ELSE 'partially_paid' 
            END
        WHERE id = alloc.purchase_id;
    END LOOP;

    -- Purani allocations delete karein
    DELETE FROM payment_allocations WHERE payment_id = p_payment_id;

    -- Payment record update karein
    UPDATE supplier_payments
    SET amount = p_new_amount, notes = p_new_notes
    WHERE id = p_payment_id;

    -- RE-ALLOCATE: Nayi raqam ko dobara FIFO ke tehat distribute karein
    FOR rec IN 
        SELECT id, balance_due FROM purchases 
        WHERE supplier_id = v_supplier_id AND balance_due > 0 
        ORDER BY purchase_date ASC, id ASC
    LOOP
        IF v_remaining_amount <= 0 THEN EXIT; END IF;

        v_pay_amount := LEAST(v_remaining_amount, rec.balance_due);

        UPDATE purchases
        SET 
            amount_paid = amount_paid + v_pay_amount,
            balance_due = balance_due - v_pay_amount,
            status = CASE WHEN (balance_due - v_pay_amount) <= 0 THEN 'paid' ELSE 'partially_paid' END
        WHERE id = rec.id;

        INSERT INTO payment_allocations (payment_id, purchase_id, amount)
        VALUES (p_payment_id, rec.id, v_pay_amount);

        v_remaining_amount := v_remaining_amount - v_pay_amount;
    END LOOP;
END;
$$;