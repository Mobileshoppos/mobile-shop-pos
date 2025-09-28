-- supabase/migrations/20250927134701_fix_update_purchase_function.sql

-- DROPPING THE OLD FUNCTION TO RECREATE IT
-- It's better to use CREATE OR REPLACE, but this ensures a clean state.
-- Let's stick with CREATE OR REPLACE for simplicity as it handles both creation and replacement.

CREATE OR REPLACE FUNCTION public.update_purchase(
    p_purchase_id integer,
    p_notes text,
    p_inventory_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

    -- Step 4: Update the purchase totals and status with the correct text types
    UPDATE public.purchases
    SET
        total_amount = new_total_amount,
        balance_due = new_total_amount - current_amount_paid,
        status = CASE
            -- THE FIX IS HERE: Removed '::purchase_status' casting
            WHEN new_total_amount - current_amount_paid <= 0 THEN 'paid'
            WHEN current_amount_paid > 0 AND new_total_amount - current_amount_paid > 0 THEN 'partially_paid'
            ELSE 'unpaid'
        END
    WHERE id = p_purchase_id;

END;
$$;