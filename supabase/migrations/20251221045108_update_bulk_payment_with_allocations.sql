-- Function: record_bulk_supplier_payment (Updated with Allocations)
-- Maqsad: Payment record karna, Bills clear karna, aur Allocation table mein hisaab rakhna.

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
    v_payment_id bigint; -- Naya variable Payment ID ke liye
BEGIN
    -- 1. Payment Record Save karein aur ID wapis lein (Zaroori step)
    INSERT INTO supplier_payments (supplier_id, purchase_id, amount, payment_date, payment_method, notes, user_id)
    VALUES (p_supplier_id, NULL, p_amount, p_payment_date, p_payment_method, p_notes, auth.uid())
    RETURNING id INTO v_payment_id; -- ID pakar li

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
        -- Agar paise khatam, to ruk jao
        IF v_remaining_amount <= 0 THEN
            EXIT;
        END IF;

        -- Tay karein ke is bill ko kitna dena hai
        v_pay_amount := LEAST(v_remaining_amount, rec.balance_due);

        -- Note tayyar karein
        v_audit_note := ' | Auto-Paid: ' || v_pay_amount || ' via Bulk Payment on ' || p_payment_date;

        -- A. Purchase ko update karein
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

        -- B. ALLOCATION RECORD KAREIN (Yeh Naya Hissa Hai)
        -- Hum likh rahe hain ke: "Payment ID X ne Bill Y ko Z rupay diye"
        INSERT INTO payment_allocations (payment_id, purchase_id, amount)
        VALUES (v_payment_id, rec.id, v_pay_amount);

        -- Bache hue paise kam karein
        v_remaining_amount := v_remaining_amount - v_pay_amount;
    END LOOP;

END;
$$;