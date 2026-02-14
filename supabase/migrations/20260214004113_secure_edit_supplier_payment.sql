CREATE OR REPLACE FUNCTION "public"."edit_supplier_payment"("p_payment_id" "uuid", "p_new_amount" numeric, "p_new_notes" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_supplier_id uuid;
    alloc record;
    v_remaining_amount numeric := p_new_amount;
    v_pay_amount numeric;
    rec record;
    v_current_user_id UUID := auth.uid(); -- [SECURITY LOCK 1]: Asli User ID pakarna
BEGIN
    -- [SECURITY LOCK 2]: Tasdeeq karna ke yeh Payment is user ki apni hai
    SELECT supplier_id INTO v_supplier_id FROM public.supplier_payments 
    WHERE id = p_payment_id AND user_id = v_current_user_id;

    IF v_supplier_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Payment record not found or access denied.';
    END IF;

    -- Rollback: Purani allocations ko khatam karke purchases ka balance wapis pehle jaisa karna
    FOR alloc IN SELECT * FROM payment_allocations WHERE payment_id = p_payment_id LOOP
        UPDATE public.purchases
        SET amount_paid = amount_paid - alloc.amount,
            balance_due = balance_due + alloc.amount,
            status = CASE WHEN (balance_due + alloc.amount) >= total_amount THEN 'unpaid' ELSE 'partially_paid' END,
            notes = COALESCE(notes, '') || ' | Payment Reverted: ' || alloc.amount
        WHERE id = alloc.purchase_id AND user_id = v_current_user_id; -- [SECURITY LOCK 3]
    END LOOP;
    
    DELETE FROM payment_allocations WHERE payment_id = p_payment_id;

    -- Payment record update karein
    UPDATE public.supplier_payments 
    SET amount = p_new_amount, notes = p_new_notes 
    WHERE id = p_payment_id AND user_id = v_current_user_id; -- [SECURITY LOCK 4]

    -- Re-allocate: Nayi raqam ko dobara FIFO ke mutabiq bills par lagana
    FOR rec IN 
        SELECT id, balance_due FROM purchases 
        WHERE supplier_id = v_supplier_id AND balance_due > 0 AND user_id = v_current_user_id -- [SECURITY LOCK 5]
        ORDER BY purchase_date ASC, id ASC
    LOOP
        IF v_remaining_amount <= 0 THEN EXIT; END IF;
        v_pay_amount := LEAST(v_remaining_amount, rec.balance_due);

        UPDATE public.purchases
        SET amount_paid = amount_paid + v_pay_amount,
            balance_due = balance_due - v_pay_amount,
            status = CASE WHEN (balance_due - v_pay_amount) <= 0 THEN 'paid' ELSE 'partially_paid' END,
            notes = COALESCE(notes, '') || ' | Auto-Paid: ' || v_pay_amount || ' via Edited Payment'
        WHERE id = rec.id AND user_id = v_current_user_id; -- [SECURITY LOCK 6]

        INSERT INTO public.payment_allocations (id, payment_id, purchase_id, amount)
        VALUES (gen_random_uuid(), p_payment_id, rec.id, v_pay_amount);
        v_remaining_amount := v_remaining_amount - v_pay_amount;
    END LOOP;

    -- Supplier ka credit balance sync karna
    PERFORM public.fn_sync_supplier_credit_manual(v_supplier_id);
END; $$;