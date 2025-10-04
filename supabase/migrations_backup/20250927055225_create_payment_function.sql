-- This function handles the entire process of recording a payment to a supplier.
-- It creates a payment record and updates the corresponding purchase record's financial details.
-- This ensures data consistency within a single transaction.

CREATE OR REPLACE FUNCTION public.record_supplier_payment(
    p_supplier_id BIGINT,
    p_purchase_id BIGINT,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_payment_date DATE,
    p_notes TEXT
)
RETURNS VOID -- This function doesn't need to return any value
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance_due NUMERIC;
    new_balance_due NUMERIC;
    total_purchase_amount NUMERIC;
BEGIN
    -- Step 1: Insert the new payment record into the 'supplier_payments' table.
    INSERT INTO public.supplier_payments (
        supplier_id,
        purchase_id,
        amount,
        payment_method,
        payment_date,
        notes,
        user_id
    ) VALUES (
        p_supplier_id,
        p_purchase_id,
        p_amount,
        p_payment_method,
        p_payment_date,
        p_notes,
        auth.uid()
    );

    -- Step 2: Get the current financial details of the purchase.
    -- We lock the row for update to prevent race conditions.
    SELECT total_amount, balance_due
    INTO total_purchase_amount, current_balance_due
    FROM public.purchases
    WHERE id = p_purchase_id
    FOR UPDATE;

    -- Step 3: Calculate the new balance.
    new_balance_due := current_balance_due - p_amount;

    -- Ensure balance doesn't go below zero.
    IF new_balance_due < 0 THEN
        new_balance_due := 0;
    END IF;

    -- Step 4: Update the purchase record with the new financial status.
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