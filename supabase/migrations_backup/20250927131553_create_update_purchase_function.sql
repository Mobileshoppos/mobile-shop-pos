-- supabase/migrations/20250927131553_create_update_purchase_function.sql

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
    -- Step 1: Purchase ke notes ko update karein
    UPDATE public.purchases
    SET notes = p_notes
    WHERE id = p_purchase_id;

    -- Step 2: Har inventory item ko loop karke update karein
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

        -- Nayi purchase price ko total mein shamil karein
        new_total_amount := new_total_amount + (item_data->>'purchase_price')::numeric;
    END LOOP;

    -- Step 3: Is purchase ke liye ada shuda raqam (amount paid) haasil karein
    SELECT amount_paid INTO current_amount_paid
    FROM public.purchases
    WHERE id = p_purchase_id;

    -- Step 4: Purchase ke totals (total_amount, balance_due) aur status ko update karein
    UPDATE public.purchases
    SET
        total_amount = new_total_amount,
        balance_due = new_total_amount - current_amount_paid,
        status = CASE
            WHEN new_total_amount - current_amount_paid <= 0 THEN 'paid'::purchase_status
            WHEN current_amount_paid > 0 AND new_total_amount - current_amount_paid > 0 THEN 'partially_paid'::purchase_status
            ELSE 'unpaid'::purchase_status
        END
    WHERE id = p_purchase_id;

END;
$$;