CREATE OR REPLACE FUNCTION public.record_purchase_payment(
    p_local_id uuid, -- Naya Parameter
    p_supplier_id integer, 
    p_purchase_id integer, 
    p_amount numeric, 
    p_payment_method text, 
    p_payment_date date, 
    p_notes text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_balance_due numeric;
    v_payment_to_apply numeric;
    v_credit_to_add numeric;
BEGIN
    -- 1. DUPLICATE CHECK: Agar yeh payment pehle se hai to wapis ho jao
    IF EXISTS (SELECT 1 FROM public.supplier_payments WHERE local_id = p_local_id) THEN
        RETURN;
    END IF;

    SELECT balance_due INTO v_balance_due FROM public.purchases WHERE id = p_purchase_id;

    IF p_amount >= v_balance_due THEN
        v_payment_to_apply := v_balance_due;
        v_credit_to_add := p_amount - v_balance_due;
    ELSE
        v_payment_to_apply := p_amount;
        v_credit_to_add := 0;
    END IF;

    -- 2. local_id ke sath insert karein
    INSERT INTO public.supplier_payments (local_id, supplier_id, purchase_id, amount, payment_method, payment_date, notes, user_id)
    VALUES (p_local_id, p_supplier_id, p_purchase_id, p_amount, p_payment_method, p_payment_date, p_notes, auth.uid());

    IF v_payment_to_apply > 0 THEN
        UPDATE public.purchases
        SET amount_paid = amount_paid + v_payment_to_apply,
            balance_due = balance_due - v_payment_to_apply
        WHERE id = p_purchase_id;
    END IF;

    IF v_credit_to_add > 0 THEN
        UPDATE public.suppliers SET credit_balance = credit_balance + v_credit_to_add WHERE id = p_supplier_id;
    END IF;

    UPDATE public.purchases SET status = CASE WHEN balance_due <= 0 THEN 'paid' ELSE 'partially_paid' END WHERE id = p_purchase_id;
END;
$function$;