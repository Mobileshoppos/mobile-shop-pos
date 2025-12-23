-- 1. DYNAMIC DROP: Yeh block database mein 'record_bulk_supplier_payment' 
-- aur 'edit_supplier_payment' naam ke jitne bhi functions hain, un sab ko dhoond kar delete kar dega.
DO $$
DECLARE
    _sql text;
BEGIN
    SELECT INTO _sql
        string_agg(format('DROP FUNCTION %s(%s);', oid::regproc, pg_get_function_identity_arguments(oid)), E'\n')
    FROM pg_proc
    WHERE proname IN ('record_bulk_supplier_payment', 'edit_supplier_payment')
      AND pronamespace = 'public'::regnamespace;

    IF _sql IS NOT NULL THEN
        EXECUTE _sql;
    END IF;
END $$;

-- 2. RE-CREATE: Ab bilkul saaf maidaan mein naye aur sahi functions banayein
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
        UPDATE purchases
        SET amount_paid = amount_paid + v_pay_amount,
            balance_due = balance_due - v_pay_amount,
            status = CASE WHEN (balance_due - v_pay_amount) <= 0 THEN 'paid' ELSE 'partially_paid' END
        WHERE id = rec.id;
        INSERT INTO payment_allocations (payment_id, purchase_id, amount)
        VALUES (v_payment_id, rec.id, v_pay_amount);
        v_remaining_amount := v_remaining_amount - v_pay_amount;
    END LOOP;
END;
$$;

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
    SELECT supplier_id INTO v_supplier_id FROM supplier_payments WHERE id = p_payment_id;
    FOR alloc IN SELECT * FROM payment_allocations WHERE payment_id = p_payment_id LOOP
        UPDATE purchases
        SET amount_paid = amount_paid - alloc.amount,
            balance_due = balance_due + alloc.amount,
            status = CASE WHEN (balance_due + alloc.amount) >= total_amount THEN 'unpaid' ELSE 'partially_paid' END
        WHERE id = alloc.purchase_id;
    END LOOP;
    DELETE FROM payment_allocations WHERE payment_id = p_payment_id;
    UPDATE supplier_payments SET amount = p_new_amount, notes = p_new_notes WHERE id = p_payment_id;
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
END;
$$;