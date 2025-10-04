-- supabase/migrations/20250928050121_create_supplier_refund_function.sql

CREATE OR REPLACE FUNCTION public.record_supplier_refund(
    p_supplier_id integer,
    p_amount numeric,
    p_refund_method text,
    p_refund_date date,
    p_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_credit numeric;
BEGIN
    -- Step 1: Get the current credit balance for the supplier
    SELECT credit_balance INTO current_credit FROM public.suppliers WHERE id = p_supplier_id;

    -- Step 2: Check if the refund amount is valid
    IF p_amount > current_credit THEN
        RAISE EXCEPTION 'Refund amount cannot be greater than the current credit balance.';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Refund amount must be positive.';
    END IF;

    -- Step 3: Decrease the supplier's credit balance
    UPDATE public.suppliers
    SET credit_balance = credit_balance - p_amount
    WHERE id = p_supplier_id;

    -- Step 4: Record this transaction in the supplier_payments table.
    -- We will store the refund as a NEGATIVE amount to correctly balance the ledger.
    -- This is a standard accounting practice.
    INSERT INTO public.supplier_payments (supplier_id, amount, payment_method, payment_date, notes, purchase_id)
    VALUES (p_supplier_id, -p_amount, p_refund_method, p_refund_date, p_notes, NULL);

END;
$$;