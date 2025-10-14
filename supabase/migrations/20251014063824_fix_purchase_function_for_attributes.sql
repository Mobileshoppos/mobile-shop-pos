-- First, drop the old function so we can replace it.
DROP FUNCTION IF EXISTS public.create_new_purchase(p_supplier_id bigint, p_notes text, p_inventory_items jsonb);

-- Now, create the new, corrected version of the function.
CREATE OR REPLACE FUNCTION public.create_new_purchase(
    p_supplier_id bigint,
    p_notes text,
    p_inventory_items jsonb
)
RETURNS bigint
LANGUAGE 'plpgsql'
SECURITY DEFINER
AS $BODY$
DECLARE
    new_purchase_id BIGINT;
    item JSONB;
    total_purchase_amount NUMERIC(10, 2) := 0;
    item_quantity INT;
BEGIN
    -- Insert a new record into the 'purchases' table.
    INSERT INTO public.purchases (supplier_id, notes, total_amount, balance_due, status, user_id)
    VALUES (p_supplier_id, p_notes, 0, 0, 'unpaid', auth.uid())
    RETURNING id INTO new_purchase_id;

    -- Loop through each item in the provided JSON array.
    FOR item IN SELECT * FROM jsonb_array_elements(p_inventory_items)
    LOOP
        item_quantity := COALESCE((item->>'quantity')::INT, 1);

        -- This loop handles both IMEI items (runs once) and non-IMEI items (runs 'quantity' times).
        FOR i IN 1..item_quantity LOOP
            -- =================================================================
            -- === YAHAN AHEM TABDEELI KI GAYI HAI ===
            -- We are now inserting the 'item_attributes' JSON object directly
            -- and have removed the old, separate text columns.
            -- =================================================================
            INSERT INTO public.inventory (
                product_id,
                user_id,
                purchase_price,
                sale_price,
                imei,           -- IMEI is still a separate column
                item_attributes,-- This is the new, important column
                supplier_id,
                purchase_id
            ) VALUES (
                (item->>'product_id')::BIGINT,
                auth.uid(),
                (item->>'purchase_price')::NUMERIC,
                (item->>'sale_price')::NUMERIC,
                (item->>'imei')::TEXT,
                (item->'item_attributes')::JSONB, -- Get the JSON object, not text
                p_supplier_id,
                new_purchase_id
            );
        END LOOP;

        -- Calculate the total purchase amount.
        total_purchase_amount := total_purchase_amount + ((item->>'purchase_price')::NUMERIC * item_quantity);
    END LOOP;

    -- Update the 'purchases' record with the correct total amount.
    UPDATE public.purchases
    SET
        total_amount = total_purchase_amount,
        balance_due = total_purchase_amount
    WHERE id = new_purchase_id;

    -- Return the ID of the newly created purchase record.
    RETURN new_purchase_id;
END;
$BODY$;

-- Add a comment to describe the function's purpose.
COMMENT ON FUNCTION public.create_new_purchase(bigint, text, jsonb) IS 'Creates a new purchase, populates inventory with items (including dynamic attributes), and calculates the total amount.';