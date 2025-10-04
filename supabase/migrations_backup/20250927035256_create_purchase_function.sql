-- This function handles the entire process of creating a new purchase record
-- and adding the associated inventory items in a single, atomic transaction.
-- It takes the supplier_id, notes for the purchase, and a JSON array of inventory items as input.

CREATE OR REPLACE FUNCTION public.create_new_purchase(
    p_supplier_id BIGINT,
    p_notes TEXT,
    p_inventory_items JSONB
)
RETURNS BIGINT -- Returns the ID of the new purchase record
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with the permissions of the function owner
AS $$
DECLARE
    new_purchase_id BIGINT;
    item JSONB;
    total_purchase_amount NUMERIC(10, 2) := 0;
BEGIN
    -- Step 1: Insert a new record into the 'purchases' table.
    -- The total_amount is initially 0 and will be updated later.
    INSERT INTO public.purchases (supplier_id, notes, total_amount)
    VALUES (p_supplier_id, p_notes, 0)
    RETURNING id INTO new_purchase_id;

    -- Step 2: Loop through each item in the JSON array and insert it into the 'inventory' table.
    FOR item IN SELECT * FROM jsonb_array_elements(p_inventory_items)
    LOOP
        INSERT INTO public.inventory (
            product_id,
            user_id,
            purchase_price,
            sale_price,
            condition,
            imei,
            color,
            ram_rom,
            guaranty,
            pta_status,
            supplier_id, -- Link to the supplier
            purchase_id  -- Link to the new purchase record
        )
        VALUES (
            (item->>'product_id')::BIGINT,
            auth.uid(), -- Automatically get the current user's ID
            (item->>'purchase_price')::NUMERIC,
            (item->>'sale_price')::NUMERIC,
            (item->>'condition')::TEXT,
            (item->>'imei')::TEXT,
            (item->>'color')::TEXT,
            (item->>'ram_rom')::TEXT,
            (item->>'guaranty')::TEXT,
            (item->>'pta_status')::TEXT,
            p_supplier_id,
            new_purchase_id
        );

        -- Step 3: Calculate the total purchase amount.
        -- This assumes 'quantity' is 1 for each item in the loop.
        total_purchase_amount := total_purchase_amount + (item->>'purchase_price')::NUMERIC;
    END LOOP;

    -- Step 4: Update the 'purchases' record with the calculated total amount.
    UPDATE public.purchases
    SET total_amount = total_purchase_amount
    WHERE id = new_purchase_id;

    -- Step 5: Return the ID of the newly created purchase record.
    RETURN new_purchase_id;
END;
$$;