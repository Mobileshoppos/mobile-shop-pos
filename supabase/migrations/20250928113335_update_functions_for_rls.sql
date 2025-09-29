-- =================================================================
-- This migration re-creates all RPC functions with 'SECURITY DEFINER'.
-- This is crucial for them to work correctly with Row Level Security.
-- A SECURITY DEFINER function runs with the permissions of the user who created it (the owner),
-- allowing it to bypass RLS policies when performing trusted operations.
-- =================================================================

-- Function 1: create_new_purchase
CREATE OR REPLACE FUNCTION public.create_new_purchase(p_supplier_id integer, p_notes text, p_inventory_items jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    new_purchase_id BIGINT;
    item JSONB;
    total_purchase_amount NUMERIC(10, 2) := 0;
BEGIN
    -- Insert a new record into the 'purchases' table.
    INSERT INTO public.purchases (supplier_id, notes, total_amount, balance_due, status, user_id)
    VALUES (p_supplier_id, p_notes, 0, 0, 'unpaid', auth.uid()) -- Initially set to 0
    RETURNING id INTO new_purchase_id;

    -- Loop through each item and insert it into the 'inventory' table.
    FOR item IN SELECT * FROM jsonb_array_elements(p_inventory_items)
    LOOP
        INSERT INTO public.inventory (
            product_id, user_id, purchase_price, sale_price, condition,
            imei, color, ram_rom, guaranty, pta_status,
            supplier_id, purchase_id
        ) VALUES (
            (item->>'product_id')::BIGINT, auth.uid(), (item->>'purchase_price')::NUMERIC,
            (item->>'sale_price')::NUMERIC, (item->>'condition')::TEXT, (item->>'imei')::TEXT,
            (item->>'color')::TEXT, (item->>'ram_rom')::TEXT, (item->>'guaranty')::TEXT,
            (item->>'pta_status')::TEXT, p_supplier_id, new_purchase_id
        );

        -- Calculate the total purchase amount.
        total_purchase_amount := total_purchase_amount + (item->>'purchase_price')::NUMERIC;
    END LOOP;

    -- Update the 'purchases' record with the correct total amount AND balance_due.
    UPDATE public.purchases
    SET
        total_amount = total_purchase_amount,
        balance_due = total_purchase_amount -- This ensures the initial balance is correct
    WHERE id = new_purchase_id;

    -- Return the ID of the newly created purchase record.
    RETURN new_purchase_id;
END;
$function$;

-- Function 2: record_supplier_payment
CREATE OR REPLACE FUNCTION public.record_supplier_payment(p_supplier_id integer, p_purchase_id integer, p_amount numeric, p_payment_method text, p_payment_date date, p_notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    INSERT INTO public.supplier_payments (supplier_id, purchase_id, amount, payment_method, payment_date, notes, user_id)
    VALUES (p_supplier_id, p_purchase_id, p_amount, p_payment_method, p_payment_date, p_notes, auth.uid());

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
$function$;

-- Function 3: update_purchase
CREATE OR REPLACE FUNCTION public.update_purchase(p_purchase_id integer, p_notes text, p_inventory_items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    item_data jsonb;
    new_total_amount numeric := 0;
    current_amount_paid numeric;
BEGIN
    -- Step 1: Update the purchase notes
    UPDATE public.purchases
    SET notes = p_notes
    WHERE id = p_purchase_id;

    -- Step 2: Loop through and update each inventory item
    FOR item_data IN SELECT * FROM jsonb_array_elements(p_inventory_items)
    LOOP
        UPDATE public.inventory
        SET
            purchase_price = (item_data->>'purchase_price')::numeric,
            sale_price = (item_data->>'sale_price')::numeric,
            condition = (item_data->>'condition')::text,
            pta_status = (item_data->>'pta_status')::text,
            color = (item_data->>'color')::text,
            ram_rom = (item_data->>'ram_rom')::text,
            guaranty = (item_data->>'guaranty')::text,
            imei = (item_data->>'imei')::text
        WHERE id = (item_data->>'id')::integer;

        -- Add the new purchase price to the running total
        new_total_amount := new_total_amount + (item_data->>'purchase_price')::numeric;
    END LOOP;

    -- Step 3: Get the current amount paid for this purchase
    SELECT amount_paid INTO current_amount_paid
    FROM public.purchases
    WHERE id = p_purchase_id;

    -- Step 4: Update the purchase totals and status
    UPDATE public.purchases
    SET
        total_amount = new_total_amount,
        balance_due = new_total_amount - current_amount_paid,
        status = CASE
            WHEN new_total_amount - current_amount_paid <= 0 THEN 'paid'
            WHEN current_amount_paid > 0 AND new_total_amount - current_amount_paid > 0 THEN 'partially_paid'
            ELSE 'unpaid'
        END
    WHERE id = p_purchase_id;

END;
$function$;

-- Function 4: record_bulk_supplier_payment
CREATE OR REPLACE FUNCTION public.record_bulk_supplier_payment(p_supplier_id integer, p_amount numeric, p_payment_method text, p_payment_date date, p_notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    unpaid_purchase RECORD;
    remaining_amount numeric := p_amount;
    payment_to_apply numeric;
BEGIN
    -- Record the full payment in the supplier_payments table
    INSERT INTO public.supplier_payments (supplier_id, amount, payment_method, payment_date, notes, purchase_id, user_id)
    VALUES (p_supplier_id, p_amount, p_payment_method, p_payment_date, p_notes, NULL, auth.uid());

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
$function$;

-- Function 5: process_purchase_return
CREATE OR REPLACE FUNCTION public.process_purchase_return(p_purchase_id integer, p_item_ids integer[], p_return_date date, p_notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    INSERT INTO public.purchase_returns (purchase_id, supplier_id, return_date, total_return_amount, notes, user_id)
    VALUES (p_purchase_id, v_supplier_id, p_return_date, v_total_return_amount, p_notes, auth.uid())
    RETURNING id INTO v_new_return_id;

    -- Log returned items and then delete them from active inventory
    FOR item_record IN SELECT * FROM public.inventory WHERE id = ANY(p_item_ids) LOOP
        INSERT INTO public.purchase_return_items (return_id, product_id, inventory_id_original, imei, purchase_price, user_id)
        VALUES (v_new_return_id, item_record.product_id, item_record.id, item_record.imei, item_record.purchase_price, auth.uid());
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
$function$;

-- Function 6: record_supplier_refund
CREATE OR REPLACE FUNCTION public.record_supplier_refund(p_supplier_id integer, p_amount numeric, p_refund_method text, p_refund_date date, p_notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    INSERT INTO public.supplier_payments (supplier_id, amount, payment_method, payment_date, notes, purchase_id, user_id)
    VALUES (p_supplier_id, -p_amount, p_refund_method, p_refund_date, p_notes, NULL, auth.uid());

END;
$function$;

-- Function 7: get_supplier_purchase_report
CREATE OR REPLACE FUNCTION public.get_supplier_purchase_report(start_date date, end_date date)
 RETURNS TABLE(supplier_name text, total_purchase_amount numeric, purchase_count bigint)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
AS $function$
    SELECT
        s.name AS supplier_name,
        SUM(p.total_amount) AS total_purchase_amount,
        COUNT(p.id) AS purchase_count
    FROM
        public.purchases p
    JOIN
        public.suppliers s ON p.supplier_id = s.id
    WHERE
        p.purchase_date >= start_date AND p.purchase_date <= end_date
    GROUP BY
        s.name
    ORDER BY
        total_purchase_amount DESC;
$function$;