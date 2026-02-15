CREATE OR REPLACE FUNCTION public.fn_sync_supplier_credit_manual(p_supplier_id uuid) 
RETURNS void 
LANGUAGE plpgsql 
AS $$
DECLARE
    v_total_business numeric;
    v_total_paid numeric;
    v_total_refunds numeric;
BEGIN
    -- Total Purchases (Business)
    -- [LOCK ADDED]: AND user_id = auth.uid()
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_business FROM public.purchases 
    WHERE supplier_id = p_supplier_id AND user_id = auth.uid();
    
    -- Total Payments
    -- [LOCK ADDED]: AND user_id = auth.uid()
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM public.supplier_payments 
    WHERE supplier_id = p_supplier_id AND user_id = auth.uid();

    -- Total Refunds (Jo supplier ne hamein wapis die)
    -- [LOCK ADDED]: AND user_id = auth.uid()
    SELECT COALESCE(SUM(amount), 0) INTO v_total_refunds FROM public.supplier_refunds 
    WHERE supplier_id = p_supplier_id AND user_id = auth.uid();
    
    -- Formula: (Payments - Refunds) - Business
    -- [LOCK ADDED]: AND user_id = auth.uid()
    UPDATE public.suppliers
    SET credit_balance = GREATEST(0, (v_total_paid - v_total_refunds) - v_total_business)
    WHERE id = p_supplier_id AND user_id = auth.uid();
END;
$$;