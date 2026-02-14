CREATE OR REPLACE FUNCTION "public"."record_purchase_payment"("p_local_id" "uuid", "p_supplier_id" "uuid", "p_purchase_id" "uuid", "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "text", "p_notes" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_balance_due numeric;
    v_payment_to_apply numeric;
    v_credit_to_add numeric;
    v_current_user_id UUID := auth.uid(); -- [SECURITY LOCK 1]: Asli User ID pakarna
BEGIN
    -- [SECURITY LOCK 2]: Tasdeeq karna ke Purchase aur Supplier dono is user ke hain
    IF NOT EXISTS (
        SELECT 1 FROM public.purchases 
        WHERE id = p_purchase_id AND user_id = v_current_user_id
    ) OR NOT EXISTS (
        SELECT 1 FROM public.suppliers 
        WHERE id = p_supplier_id AND user_id = v_current_user_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Purchase or Supplier record not found for this user.';
    END IF;

    -- Duplicate check: Agar yeh payment pehle hi mojud hai (id ya local_id se) to wapis ho jao
    IF EXISTS (SELECT 1 FROM public.supplier_payments WHERE (local_id = p_local_id OR id = p_local_id) AND user_id = v_current_user_id) THEN
        RETURN;
    END IF;

    -- Purchase ka balance check karein
    SELECT balance_due INTO v_balance_due FROM public.purchases WHERE id = p_purchase_id AND user_id = v_current_user_id;

    -- Hisaab lagayein ke kitni raqam bill par lagani hai aur kitni supplier ke credit mein jayegi
    IF p_amount >= v_balance_due THEN
        v_payment_to_apply := v_balance_due;
        v_credit_to_add := p_amount - v_balance_due;
    ELSE
        v_payment_to_apply := p_amount;
        v_credit_to_add := 0;
    END IF;

    -- Payment record insert karein (id aur local_id dono UUID honge)
    INSERT INTO public.supplier_payments (
        id, 
        local_id, 
        supplier_id, 
        purchase_id, 
        amount, 
        payment_method, 
        payment_date, 
        notes, 
        user_id
    )
    VALUES (
        p_local_id, 
        p_local_id, 
        p_supplier_id, 
        p_purchase_id, 
        p_amount, 
        p_payment_method, 
        p_payment_date::date, -- Text ko date mein convert kar rahe hain
        p_notes, 
        v_current_user_id -- [SECURITY LOCK 3]: Asli User ID ka istemal
    );

    -- Purchase table update karein
    IF v_payment_to_apply > 0 THEN
        UPDATE public.purchases
        SET amount_paid = amount_paid + v_payment_to_apply,
            balance_due = balance_due - v_payment_to_apply
        WHERE id = p_purchase_id AND user_id = v_current_user_id; -- [SECURITY LOCK 4]: User ID check
    END IF;

    -- Agar extra raqam hai to supplier ke account mein credit kar dein
    IF v_credit_to_add > 0 THEN
        UPDATE public.suppliers SET credit_balance = credit_balance + v_credit_to_add 
        WHERE id = p_supplier_id AND user_id = v_current_user_id;
    END IF;

    -- Purchase ka status update karein
    UPDATE public.purchases 
    SET status = CASE WHEN balance_due <= 0 THEN 'paid' ELSE 'partially_paid' END 
    WHERE id = p_purchase_id AND user_id = v_current_user_id;

END; $$;