CREATE OR REPLACE FUNCTION "public"."record_supplier_refund"("p_local_id" "uuid", "p_supplier_id" "uuid", "p_amount" numeric, "p_refund_date" "text", "p_method" "text", "p_notes" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
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
    IF EXISTS (SELECT 1 FROM public.supplier_refunds WHERE (id = p_local_id OR local_id = p_local_id) AND user_id = v_current_user_id) THEN
        RETURN;
    END IF;

    -- Insert Refund Record (Force user_id = auth.uid())
    INSERT INTO public.supplier_refunds (id, local_id, supplier_id, amount, refund_date, payment_method, notes, user_id)
    VALUES (p_local_id, p_local_id, p_supplier_id, p_amount, p_refund_date::date, p_method, p_notes, v_current_user_id); -- [SECURITY LOCK 3]: Asli User ID ka istemal
    
    -- Note: Credit balance trigger (fn_trg_sync_supplier_credit) khud hi update kar dega
END; $$;