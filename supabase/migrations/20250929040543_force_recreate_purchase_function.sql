-- =================================================================
-- Migration to forcefully re-create the 'create_new_purchase' function.
-- This is a definitive fix for the "Could not choose the best candidate function" error.
-- =================================================================

-- =================================================================
-- STEP 1: Drop all possible existing versions of the function.
-- This removes any ambiguous or cached versions from the database,
-- including any old ones that might have slightly different parameter types.
-- =================================================================
DROP FUNCTION IF EXISTS public.create_new_purchase(bigint, text, jsonb);
DROP FUNCTION IF EXISTS public.create_new_purchase(integer, text, jsonb);


-- =================================================================
-- STEP 2: Re-create the function from scratch with the correct signature.
-- This ensures only the single, correct version of the function exists.
-- =================================================================
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
    VALUES (p_supplier_id, p_notes, 0, 0, 'unpaid', auth.uid())
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
        balance_due = total_purchase_amount
    WHERE id = new_purchase_id;

    -- Return the ID of the newly created purchase record.
    RETURN new_purchase_id;
END;
$function$;