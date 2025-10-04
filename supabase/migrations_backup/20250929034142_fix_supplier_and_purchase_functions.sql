-- =================================================================
-- Migration to fix supplier creation and purchase function ambiguity.
-- =================================================================

-- =================================================================
-- FIX 1: Add a default value for 'user_id' in the 'suppliers' table.
-- This resolves the "violates not-null constraint" error when a new
-- supplier is created, by automatically assigning the current user's ID.
-- =================================================================
ALTER TABLE public.suppliers
ALTER COLUMN user_id SET DEFAULT auth.uid();


-- =================================================================
-- FIX 2: Re-create the 'create_new_purchase' function.
-- This resolves the "Could not choose the best candidate function" error
-- by removing any conflicting or old versions of the function and
-- establishing a single, correct definition.
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