-- Step 1: Drop the existing function to ensure a clean state and force a schema cache refresh.
-- The parameters must match the ones in the original CREATE FUNCTION statement.
DROP FUNCTION IF EXISTS public.record_supplier_payment(BIGINT, BIGINT, NUMERIC, TEXT, DATE, TEXT);

-- Step 2: Recreate the function with the exact same logic.
-- This ensures the function signature (name and named parameters) is correctly registered.
CREATE OR REPLACE FUNCTION public.record_supplier_payment(
    p_supplier_id BIGINT,
    p_purchase_id BIGINT,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_payment_date DATE,
    p_notes TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance_due NUMERIC;
    new_balance_due NUMERIC;
    total_purchase_amount NUMERIC;
BEGIN
    -- Insert the new payment record
    INSERT INTO public.supplier_payments (
        supplier_id, purchase_id, amount, payment_method, payment_date, notes, user_id
    ) VALUES (
        p_supplier_id, p_purchase_id, p_amount, p_payment_method, p_payment_date, p_notes, auth.uid()
    );

    -- Get current financial details of the purchase, locking the row
    SELECT total_amount, balance_due
    INTO total_purchase_amount, current_balance_due
    FROM public.purchases
    WHERE id = p_purchase_id
    FOR UPDATE;

    -- Calculate the new balance
    new_balance_due := current_balance_due - p_amount;
    IF new_balance_due < 0 THEN
        new_balance_due := 0;
    END IF;

    -- Update the purchase record with the new financial status
    UPDATE public.purchases
    SET
        amount_paid = total_purchase_amount - new_balance_due,
        balance_due = new_balance_due,
        status = CASE
            WHEN new_balance_due <= 0 THEN 'paid'
            ELSE 'partially_paid'
        END
    WHERE id = p_purchase_id;

END;
$$;