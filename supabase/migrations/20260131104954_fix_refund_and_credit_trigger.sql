-- 1. record_supplier_refund function ko idempotent (duplication-free) banayein
CREATE OR REPLACE FUNCTION "public"."record_supplier_refund"("p_local_id" "uuid", "p_supplier_id" "uuid", "p_amount" numeric, "p_refund_date" "text", "p_method" "text", "p_notes" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check if refund already exists (Safety Check)
    IF EXISTS (SELECT 1 FROM public.supplier_refunds WHERE id = p_local_id OR local_id = p_local_id) THEN
        RETURN;
    END IF;

    INSERT INTO public.supplier_refunds (id, local_id, supplier_id, amount, refund_date, payment_method, notes, user_id)
    VALUES (p_local_id, p_local_id, p_supplier_id, p_amount, p_refund_date::date, p_method, p_notes, auth.uid());

    -- Credit balance trigger khud hi update kar dega (niche fix kiya gaya hai)
END; $$;

-- 2. Credit Balance Sync Function ko behtar banayein
CREATE OR REPLACE FUNCTION "public"."fn_sync_supplier_credit_manual"("p_supplier_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_total_business numeric;
    v_total_paid numeric;
    v_total_refunds numeric;
BEGIN
    -- Total Purchases (Business)
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_business FROM public.purchases WHERE supplier_id = p_supplier_id;
    
    -- Total Payments
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM public.supplier_payments WHERE supplier_id = p_supplier_id;

    -- Total Refunds (Jo supplier ne hamein wapis die)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_refunds FROM public.supplier_refunds WHERE supplier_id = p_supplier_id;
    
    -- Formula: (Payments - Refunds) - Business
    UPDATE public.suppliers
    SET credit_balance = GREATEST(0, (v_total_paid - v_total_refunds) - v_total_business)
    WHERE id = p_supplier_id;
END; $$;

-- 3. Triggers ko update karein taake wo har tabdeeli par chalein
DROP TRIGGER IF EXISTS trg_sync_supplier_credit ON public.supplier_payments;
CREATE TRIGGER trg_sync_supplier_credit AFTER INSERT OR DELETE OR UPDATE ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION public.fn_trg_sync_supplier_credit();

DROP TRIGGER IF EXISTS trg_sync_supplier_credit_refund ON public.supplier_refunds;
CREATE TRIGGER trg_sync_supplier_credit_refund AFTER INSERT OR DELETE OR UPDATE ON public.supplier_refunds FOR EACH ROW EXECUTE FUNCTION public.fn_trg_sync_supplier_credit();

DROP TRIGGER IF EXISTS trg_sync_supplier_credit_purchase ON public.purchases;
CREATE TRIGGER trg_sync_supplier_credit_purchase AFTER INSERT OR DELETE OR UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.fn_trg_sync_supplier_credit();