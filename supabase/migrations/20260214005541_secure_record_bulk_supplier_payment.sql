CREATE OR REPLACE FUNCTION "public"."record_bulk_supplier_payment"("p_local_id" "uuid", "p_supplier_id" "uuid", "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "text", "p_notes" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_remaining_amount numeric := p_amount;
    v_pay_amount numeric;
    rec record;
    v_payment_id uuid;
    v_audit_text text;
    v_current_user_id UUID := auth.uid(); -- [SECURITY LOCK 1]: Asli User ID pakarna
BEGIN
    -- [SECURITY LOCK 2]: Tasdeeq karna ke Supplier is user ka apna hai
    IF NOT EXISTS (
        SELECT 1 FROM public.suppliers 
        WHERE id = p_supplier_id AND user_id = v_current_user_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Supplier record not found for this user.';
    END IF;

    -- Duplicate Check
    IF EXISTS (SELECT 1 FROM public.supplier_payments WHERE (local_id = p_local_id OR id = p_local_id) AND user_id = v_current_user_id) THEN
        RETURN;
    END IF;

    -- Insert Payment Record
    INSERT INTO supplier_payments (id, local_id, supplier_id, amount, payment_date, payment_method, notes, user_id)
    VALUES (p_local_id, p_local_id, p_supplier_id, p_amount, p_payment_date::date, p_payment_method, p_notes, v_current_user_id) -- [SECURITY LOCK 3]: Asli User ID ka istemal
    RETURNING id INTO v_payment_id;

    -- FIFO Logic: Purane bills pehle pay karein
    FOR rec IN 
        SELECT id, balance_due FROM purchases 
        WHERE supplier_id = p_supplier_id AND balance_due > 0 AND user_id = v_current_user_id -- [SECURITY LOCK 4]: User check
        ORDER BY purchase_date ASC, created_at ASC 
    LOOP
        IF v_remaining_amount <= 0 THEN EXIT; END IF;
        v_pay_amount := LEAST(v_remaining_amount, rec.balance_due);
        
        v_audit_text := ' | Auto-Paid: ' || v_pay_amount || ' via Bulk Payment';

        UPDATE purchases
        SET amount_paid = amount_paid + v_pay_amount,
            balance_due = balance_due - v_pay_amount,
            status = CASE WHEN (balance_due - v_pay_amount) <= 0 THEN 'paid' ELSE 'partially_paid' END,
            notes = COALESCE(notes, '') || v_audit_text
        WHERE id = rec.id AND user_id = v_current_user_id; -- [SECURITY LOCK 5]: User check

        -- Allocation Record (Link payment to purchase)
        INSERT INTO payment_allocations (id, payment_id, purchase_id, amount)
        VALUES (gen_random_uuid(), v_payment_id, rec.id, v_pay_amount);
        
        v_remaining_amount := v_remaining_amount - v_pay_amount;
    END LOOP;
    
    -- Note: Supplier ka Credit Balance trigger (fn_trg_sync_supplier_credit) khud update kar dega
END; $$;