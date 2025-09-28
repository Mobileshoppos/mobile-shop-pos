-- supabase/migrations/20250928042944_update_payment_functions_for_credit_balance.sql

-- =================================================================
-- FUNCTION 1: record_supplier_payment (For single purchase payments)
-- =================================================================
-- This function is called from the Purchase Details page.
-- It now handles overpayments by adding extra amount to the supplier's credit balance.
CREATE OR REPLACE FUNCTION public.record_supplier_payment(
    p_supplier_id integer,
    p_purchase_id integer,
    p_amount numeric,
    p_payment_method text,
    p_payment_date date,
    p_notes text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_balance_due numeric;
    v_payment_to_apply numeric;
    v_credit_to_add numeric;
BEGIN
    -- Get the current balance of the specific purchase
    SELECT balance_due INTO v_balance_due FROM public.purchases WHERE id = p_purchase_id;

    -- Determine how much payment to apply to the purchase and how much becomes credit
    IF p_amount >= v_balance_due THEN
        v_payment_to_apply := v_balance_due;
        v_credit_to_add := p_amount - v_balance_due;
    ELSE
        v_payment_to_apply := p_amount;
        v_credit_to_add := 0;
    END IF;

    -- Record the full payment in the supplier_payments table
    INSERT INTO public.supplier_payments (supplier_id, purchase_id, amount, payment_method, payment_date, notes)
    VALUES (p_supplier_id, p_purchase_id, p_amount, p_payment_method, p_payment_date, p_notes);

    -- Apply payment to the purchase, ensuring its balance does not go below zero
    IF v_payment_to_apply > 0 THEN
        UPDATE public.purchases
        SET
            amount_paid = amount_paid + v_payment_to_apply,
            balance_due = balance_due - v_payment_to_apply
        WHERE id = p_purchase_id;
    END IF;

    -- Add any overpayment to the supplier's credit balance
    IF v_credit_to_add > 0 THEN
        UPDATE public.suppliers
        SET credit_balance = credit_balance + v_credit_to_add
        WHERE id = p_supplier_id;
    END IF;

    -- Update the status of the affected purchase
    UPDATE public.purchases
    SET status = CASE
        WHEN balance_due <= 0 THEN 'paid'
        ELSE 'partially_paid'
    END
    WHERE id = p_purchase_id;
END;
$$;


-- =================================================================
-- FUNCTION 2: record_bulk_supplier_payment (For general supplier payments)
-- =================================================================
-- This function is called from the Supplier Details page.
-- It now adds any leftover payment amount to the supplier's credit balance after clearing all debts.
CREATE OR REPLACE FUNCTION public.record_bulk_supplier_payment(
    p_supplier_id integer,
    p_amount numeric,
    p_payment_method text,
    p_payment_date date,
    p_notes text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    unpaid_purchase RECORD;
    remaining_amount numeric := p_amount;
    payment_to_apply numeric;
BEGIN
    -- Record the full payment in the supplier_payments table
    INSERT INTO public.supplier_payments (supplier_id, amount, payment_method, payment_date, notes, purchase_id)
    VALUES (p_supplier_id, p_amount, p_payment_method, p_payment_date, p_notes, NULL);

    -- Loop through unpaid purchases (oldest first) to apply the payment
    FOR unpaid_purchase IN
        SELECT id, balance_due FROM public.purchases
        WHERE supplier_id = p_supplier_id AND balance_due > 0
        ORDER BY purchase_date ASC
    LOOP
        IF remaining_amount <= 0 THEN EXIT; END IF;

        payment_to_apply := LEAST(remaining_amount, unpaid_purchase.balance_due);

        UPDATE public.purchases
        SET amount_paid = amount_paid + payment_to_apply,
            balance_due = balance_due - payment_to_apply
        WHERE id = unpaid_purchase.id;

        remaining_amount := remaining_amount - payment_to_apply;
    END LOOP;

    -- Add any leftover amount to the supplier's credit balance
    IF remaining_amount > 0 THEN
        UPDATE public.suppliers
        SET credit_balance = credit_balance + remaining_amount
        WHERE id = p_supplier_id;
    END IF;

    -- Update the status of all purchases for this supplier
    UPDATE public.purchases
    SET status = CASE
        WHEN balance_due <= 0 THEN 'paid'
        WHEN amount_paid > 0 AND balance_due > 0 THEN 'partially_paid'
        ELSE 'unpaid'
    END
    WHERE supplier_id = p_supplier_id;
END;
$$;


-- =================================================================
-- FUNCTION 3: process_purchase_return (For returning items)
-- =================================================================
-- This function now handles cases where a return's value is more than the purchase's balance.
-- The extra value is added to the supplier's credit balance.
CREATE OR REPLACE FUNCTION public.process_purchase_return(
    p_purchase_id integer,
    p_item_ids integer[],
    p_return_date date,
    p_notes text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_supplier_id integer;
    v_total_return_amount numeric := 0;
    v_new_return_id bigint;
    item_record record;
    v_purchase_balance_due numeric;
    v_return_to_clear_debt numeric;
    v_credit_to_add numeric;
BEGIN
    -- Get supplier_id and current balance from the purchase
    SELECT supplier_id, balance_due INTO v_supplier_id, v_purchase_balance_due
    FROM public.purchases WHERE id = p_purchase_id;

    -- Calculate the total value of the items being returned
    SELECT COALESCE(SUM(purchase_price), 0) INTO v_total_return_amount
    FROM public.inventory WHERE id = ANY(p_item_ids);

    IF v_total_return_amount <= 0 THEN RETURN; END IF;

    -- Determine how much of the return clears debt and how much becomes credit
    v_return_to_clear_debt := LEAST(v_total_return_amount, v_purchase_balance_due);
    v_credit_to_add := v_total_return_amount - v_return_to_clear_debt;

    -- Create a new record in the purchase_returns table
    INSERT INTO public.purchase_returns (purchase_id, supplier_id, return_date, total_return_amount, notes)
    VALUES (p_purchase_id, v_supplier_id, p_return_date, v_total_return_amount, p_notes)
    RETURNING id INTO v_new_return_id;

    -- Log returned items and then delete them from active inventory
    FOR item_record IN SELECT * FROM public.inventory WHERE id = ANY(p_item_ids) LOOP
        INSERT INTO public.purchase_return_items (return_id, product_id, inventory_id_original, imei, purchase_price)
        VALUES (v_new_return_id, item_record.product_id, item_record.id, item_record.imei, item_record.purchase_price);
    END LOOP;
    DELETE FROM public.inventory WHERE id = ANY(p_item_ids);

    -- Update the original purchase record. Balance will not go below zero.
    UPDATE public.purchases
    SET
        total_amount = total_amount - v_total_return_amount,
        balance_due = balance_due - v_return_to_clear_debt
    WHERE id = p_purchase_id;

    -- Add any excess return value to the supplier's credit balance
    IF v_credit_to_add > 0 THEN
        UPDATE public.suppliers
        SET credit_balance = credit_balance + v_credit_to_add
        WHERE id = v_supplier_id;
    END IF;

    -- Finally, update the status of the purchase
    UPDATE public.purchases
    SET status = CASE
        WHEN balance_due <= 0 THEN 'paid'
        ELSE 'partially_paid'
    END
    WHERE id = p_purchase_id;
END;
$$;