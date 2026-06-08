-- 1. Bulk Supplier Payment RPC Update
CREATE OR REPLACE FUNCTION "public"."record_bulk_supplier_payment"("p_local_id" "uuid", "p_supplier_id" "uuid", "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "text", "p_notes" "text", "p_staff_id" "uuid" DEFAULT NULL::"uuid", "p_register_id" "uuid" DEFAULT NULL::"uuid", "p_session_id" "uuid" DEFAULT NULL::"uuid", "p_voucher_no" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_remaining_amount numeric := p_amount;
    v_pay_amount numeric;
    rec record;
    v_payment_id uuid;
    v_audit_text text;
    v_current_user_id UUID := auth.uid(); 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE id = p_supplier_id AND user_id = v_current_user_id) THEN
        RAISE EXCEPTION 'Unauthorized: Supplier record not found for this user.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.supplier_payments WHERE (local_id = p_local_id OR id = p_local_id) AND user_id = v_current_user_id) THEN
        RETURN;
    END IF;

    INSERT INTO supplier_payments (
        id, local_id, supplier_id, amount, payment_date, payment_method, notes, user_id, staff_id, register_id, session_id, voucher_no
    )
    VALUES (
        p_local_id, p_local_id, p_supplier_id, p_amount, p_payment_date::date, p_payment_method, p_notes, v_current_user_id, p_staff_id, p_register_id, p_session_id, p_voucher_no
    ) 
    RETURNING id INTO v_payment_id;

    FOR rec IN 
        SELECT id, balance_due FROM purchases 
        WHERE supplier_id = p_supplier_id AND balance_due > 0 AND user_id = v_current_user_id
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
        WHERE id = rec.id AND user_id = v_current_user_id;

        INSERT INTO payment_allocations (id, payment_id, purchase_id, amount)
        VALUES (gen_random_uuid(), v_payment_id, rec.id, v_pay_amount);
        
        v_remaining_amount := v_remaining_amount - v_pay_amount;
    END LOOP;
END; 
$$;

-- 2. Purchase Payment RPC Update
CREATE OR REPLACE FUNCTION "public"."record_purchase_payment"("p_local_id" "uuid", "p_supplier_id" "uuid", "p_purchase_id" "uuid", "p_amount" numeric, "p_payment_method" "text", "p_payment_date" "text", "p_notes" "text", "p_staff_id" "uuid" DEFAULT NULL::"uuid", "p_register_id" "uuid" DEFAULT NULL::"uuid", "p_session_id" "uuid" DEFAULT NULL::"uuid", "p_voucher_no" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_balance_due numeric;
    v_payment_to_apply numeric;
    v_credit_to_add numeric;
    v_current_user_id UUID := auth.uid();
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.purchases WHERE id = p_purchase_id AND user_id = v_current_user_id) OR NOT EXISTS (SELECT 1 FROM public.suppliers WHERE id = p_supplier_id AND user_id = v_current_user_id) THEN
        RAISE EXCEPTION 'Unauthorized: Purchase or Supplier record not found for this user.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.supplier_payments WHERE (local_id = p_local_id OR id = p_local_id) AND user_id = v_current_user_id) THEN
        RETURN;
    END IF;

    SELECT balance_due INTO v_balance_due FROM public.purchases WHERE id = p_purchase_id AND user_id = v_current_user_id;

    IF p_amount >= v_balance_due THEN
        v_payment_to_apply := v_balance_due;
        v_credit_to_add := p_amount - v_balance_due;
    ELSE
        v_payment_to_apply := p_amount;
        v_credit_to_add := 0;
    END IF;

    INSERT INTO public.supplier_payments (
        id, local_id, supplier_id, purchase_id, amount, payment_method, payment_date, notes, user_id, staff_id, register_id, session_id, voucher_no
    )
    VALUES (
        p_local_id, p_local_id, p_supplier_id, p_purchase_id, p_amount, p_payment_method, p_payment_date::date, p_notes, v_current_user_id, p_staff_id, p_register_id, p_session_id, p_voucher_no
    );

    IF v_payment_to_apply > 0 THEN
        UPDATE public.purchases
        SET amount_paid = amount_paid + v_payment_to_apply,
            balance_due = balance_due - v_payment_to_apply
        WHERE id = p_purchase_id AND user_id = v_current_user_id; 
    END IF;

    IF v_credit_to_add > 0 THEN
        UPDATE public.suppliers SET credit_balance = credit_balance + v_credit_to_add 
        WHERE id = p_supplier_id AND user_id = v_current_user_id;
    END IF;

    UPDATE public.purchases 
    SET status = CASE WHEN balance_due <= 0 THEN 'paid' ELSE 'partially_paid' END 
    WHERE id = p_purchase_id AND user_id = v_current_user_id;
END; 
$$;

-- 3. Supplier Refund RPC Update
CREATE OR REPLACE FUNCTION "public"."record_supplier_refund"("p_local_id" "uuid", "p_supplier_id" "uuid", "p_amount" numeric, "p_refund_date" "text", "p_method" "text", "p_notes" "text", "p_staff_id" "uuid" DEFAULT NULL::"uuid", "p_register_id" "uuid" DEFAULT NULL::"uuid", "p_session_id" "uuid" DEFAULT NULL::"uuid", "p_voucher_no" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE id = p_supplier_id AND user_id = v_current_user_id) THEN
        RAISE EXCEPTION 'Unauthorized: Supplier record not found for this user.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.supplier_refunds WHERE (id = p_local_id OR local_id = p_local_id) AND user_id = v_current_user_id) THEN
        RETURN;
    END IF;

    INSERT INTO public.supplier_refunds (
        id, local_id, supplier_id, amount, refund_date, payment_method, notes, user_id, staff_id, register_id, session_id, voucher_no
    )
    VALUES (
        p_local_id, p_local_id, p_supplier_id, p_amount, p_refund_date::date, p_method, p_notes, v_current_user_id, p_staff_id, p_register_id, p_session_id, p_voucher_no
    ); 
END; 
$$;

-- 4. Sale Return Atomic RPC Update (Extract voucher_no from JSON)
CREATE OR REPLACE FUNCTION "public"."process_sale_return_atomic"("p_return_record" "jsonb", "p_return_items" "jsonb", "p_payment_record" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_item RECORD;
    v_current_user_id UUID := auth.uid();
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.sales WHERE id = (p_return_record->>'sale_id')::UUID AND user_id = v_current_user_id) OR NOT EXISTS (SELECT 1 FROM public.customers WHERE id = (p_return_record->>'customer_id')::UUID AND user_id = v_current_user_id) THEN
        RAISE EXCEPTION 'Unauthorized: Sale or Customer record not found for this user.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.sale_returns WHERE id = (p_return_record->>'id')::UUID AND user_id = v_current_user_id) THEN
        RETURN;
    END IF;

    INSERT INTO public.sale_returns (
        id, local_id, sale_id, customer_id, total_refund_amount, tax_refunded, return_fee, reason, user_id, created_at, staff_id, register_id, session_id, fbr_invoice_number
    )
    VALUES (
        (p_return_record->>'id')::UUID, (p_return_record->>'local_id')::UUID, (p_return_record->>'sale_id')::UUID, (p_return_record->>'customer_id')::UUID, (p_return_record->>'total_refund_amount')::NUMERIC, COALESCE((p_return_record->>'tax_refunded')::NUMERIC, 0), (p_return_record->>'return_fee')::NUMERIC, (p_return_record->>'reason')::TEXT, v_current_user_id, (p_return_record->>'created_at')::TIMESTAMPTZ, (p_return_record->>'staff_id')::UUID, (p_return_record->>'register_id')::UUID, (p_return_record->>'session_id')::UUID, (p_return_record->>'fbr_invoice_number')::TEXT
    );

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_return_items) LOOP
        INSERT INTO public.sale_return_items (id, return_id, inventory_id, product_id, price_at_return, quantity)
        VALUES ((v_item.value->>'id')::UUID, (p_return_record->>'id')::UUID, (v_item.value->>'inventory_id')::UUID, (v_item.value->>'product_id')::UUID, (v_item.value->>'price_at_return')::NUMERIC, (v_item.value->>'quantity')::INT);

        UPDATE public.inventory 
        SET available_qty = available_qty + (v_item.value->>'quantity')::INT,
            sold_qty = GREATEST(0, sold_qty - (v_item.value->>'quantity')::INT),
            status = 'Available'
        WHERE id = (v_item.value->>'inventory_id')::UUID AND user_id = v_current_user_id; 

        IF NOT FOUND THEN RAISE EXCEPTION 'Unauthorized: Inventory item not found or access denied.'; END IF;
    END LOOP;

    INSERT INTO public.customer_payments (
        id, local_id, customer_id, amount_paid, user_id, staff_id, remarks, created_at, register_id, session_id, voucher_no
    )
    VALUES (
        (p_payment_record->>'id')::UUID, (p_payment_record->>'local_id')::UUID, (p_payment_record->>'customer_id')::UUID, (p_payment_record->>'amount_paid')::NUMERIC, v_current_user_id, (p_payment_record->>'staff_id')::UUID, (p_payment_record->>'remarks')::TEXT, (p_payment_record->>'created_at')::TIMESTAMPTZ, (p_payment_record->>'register_id')::UUID, (p_payment_record->>'session_id')::UUID, (p_payment_record->>'voucher_no')::TEXT
    );
END; 
$$;