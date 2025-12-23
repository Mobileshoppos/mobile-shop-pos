-- 1. Helper Function: Sirf credit_balance ko update karega
CREATE OR REPLACE FUNCTION public.fn_sync_supplier_credit_manual(p_supplier_id bigint)
RETURNS void AS $$
DECLARE
    v_total_business numeric;
    v_total_paid numeric;
BEGIN
    -- A. Total Business (Purchases)
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_business 
    FROM public.purchases WHERE supplier_id = p_supplier_id;

    -- B. Total Payments
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid 
    FROM public.supplier_payments WHERE supplier_id = p_supplier_id;
    
    -- C. Sirf credit_balance update karein (Jo table mein majood hai)
    UPDATE public.suppliers
    SET credit_balance = GREATEST(0, v_total_paid - v_total_business)
    WHERE id = p_supplier_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger Function
CREATE OR REPLACE FUNCTION public.fn_trg_sync_supplier_credit()
RETURNS TRIGGER AS $$
DECLARE
    v_supplier_id bigint;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_supplier_id := OLD.supplier_id;
    ELSE
        v_supplier_id := NEW.supplier_id;
    END IF;

    PERFORM public.fn_sync_supplier_credit_manual(v_supplier_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger Lagayein
DROP TRIGGER IF EXISTS trg_sync_supplier_credit ON public.supplier_payments;
CREATE TRIGGER trg_sync_supplier_credit
AFTER INSERT OR UPDATE OR DELETE ON public.supplier_payments
FOR EACH ROW EXECUTE FUNCTION public.fn_trg_sync_supplier_credit();

-- 4. Tamam Suppliers ka credit_balance ek baar sahi (repair) kar dein
SELECT public.fn_sync_supplier_credit_manual(id) FROM public.suppliers;