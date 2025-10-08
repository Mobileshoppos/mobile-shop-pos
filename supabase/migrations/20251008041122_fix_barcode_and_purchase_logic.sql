-- Step 1: Fix the barcode unique constraint on the 'products' table.
-- This makes the barcode unique per user, not across the entire table.

-- First, we drop the old constraint. NOTE: The constraint name 'products_barcode_key' is a default name.
-- If your project has a different name for this constraint, you might need to change it here.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_barcode_key;

-- Second, we create the new composite unique constraint on user_id and barcode.
-- This allows different users to have the same barcode, but one user cannot reuse a barcode.
ALTER TABLE public.products ADD CONSTRAINT products_user_id_barcode_key UNIQUE (user_id, barcode);


-- Step 2: Replace the old 'create_new_purchase' function with an updated version.
-- This new version correctly handles the 'quantity' for non-IMEI items and calculates the total amount accurately.

CREATE OR REPLACE FUNCTION public.create_new_purchase(p_supplier_id bigint, p_notes text, p_inventory_items jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    new_purchase_id BIGINT;
    item JSONB;
    total_purchase_amount NUMERIC(10, 2) := 0;
    item_quantity INT; -- Variable to hold the quantity of each item
BEGIN
    -- Insert a new record into the 'purchases' table.
    INSERT INTO public.purchases (supplier_id, notes, total_amount, balance_due, status, user_id)
    VALUES (p_supplier_id, p_notes, 0, 0, 'unpaid', auth.uid())
    RETURNING id INTO new_purchase_id;

    -- Loop through each item in the provided JSON array.
    FOR item IN SELECT * FROM jsonb_array_elements(p_inventory_items)
    LOOP
        -- Determine the quantity for the current item.
        -- If the 'quantity' field exists and is not null, use its value. Otherwise, default to 1.
        item_quantity := COALESCE((item->>'quantity')::INT, 1);

        -- Use a nested loop to insert the item into the inventory table 'item_quantity' times.
        -- For IMEI items, quantity is 1, so it runs once. For others, it runs 'quantity' times.
        FOR i IN 1..item_quantity LOOP
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
        END LOOP;

        -- Calculate the total purchase amount correctly by multiplying price with quantity.
        total_purchase_amount := total_purchase_amount + ((item->>'purchase_price')::NUMERIC * item_quantity);
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