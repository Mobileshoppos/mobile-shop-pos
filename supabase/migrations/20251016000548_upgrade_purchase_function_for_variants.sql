-- First, drop the old function so we can replace it with the upgraded version.
DROP FUNCTION IF EXISTS public.create_new_purchase(p_supplier_id bigint, p_notes text, p_inventory_items jsonb);

-- Now, create the new, variant-aware version of the function.
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
    new_variant_id BIGINT;
    item JSONB;
    total_purchase_amount NUMERIC(10, 2) := 0;
    item_quantity INT;
BEGIN
    -- Step 1: Create the main purchase record (no change).
    INSERT INTO public.purchases (supplier_id, notes, total_amount, balance_due, status, user_id)
    VALUES (p_supplier_id, p_notes, 0, 0, 'unpaid', auth.uid())
    RETURNING id INTO new_purchase_id;

    -- Step 2: Loop through each item (which now represents a variant) from the React app.
    FOR item IN SELECT * FROM jsonb_array_elements(p_inventory_items)
    LOOP
        -- Step 3: Check if this exact variant (same product + same attributes) already exists.
        SELECT id INTO new_variant_id
        FROM public.product_variants
        WHERE product_id = (item->>'product_id')::BIGINT
          AND attributes = (item->'item_attributes')::JSONB;

        -- Step 4: If the variant doesn't exist, create it.
        IF new_variant_id IS NULL THEN
            INSERT INTO public.product_variants (
                product_id,
                user_id,
                attributes,
                barcode,
                purchase_price,
                sale_price
            ) VALUES (
                (item->>'product_id')::BIGINT,
                auth.uid(),
                (item->'item_attributes')::JSONB,
                (item->>'barcode')::TEXT, -- The client app must send a 'barcode' field now.
                (item->>'purchase_price')::NUMERIC,
                (item->>'sale_price')::NUMERIC
            ) RETURNING id INTO new_variant_id;
        ELSE
            -- Step 5 (Optional but good practice): If variant exists, update its prices to the latest ones.
            UPDATE public.product_variants
            SET
                purchase_price = (item->>'purchase_price')::NUMERIC,
                sale_price = (item->>'sale_price')::NUMERIC
            WHERE id = new_variant_id;
        END IF;

        -- Step 6: Get the quantity for this variant.
        item_quantity := COALESCE((item->>'quantity')::INT, 1);

        -- Step 7: Loop to insert the individual physical items into inventory.
        FOR i IN 1..item_quantity LOOP
            INSERT INTO public.inventory (
                product_id,
                variant_id, -- This is the new, crucial link to the variant 'supervisor'.
                user_id,
                purchase_price,
                sale_price,
                imei,
                item_attributes, -- Still useful for historical data.
                supplier_id,
                purchase_id
            ) VALUES (
                (item->>'product_id')::BIGINT,
                new_variant_id, -- Link to the variant we found or created.
                auth.uid(),
                (item->>'purchase_price')::NUMERIC,
                (item->>'sale_price')::NUMERIC,
                (item->>'imei')::TEXT,
                (item->'item_attributes')::JSONB,
                p_supplier_id,
                new_purchase_id
            );
        END LOOP;

        -- Step 8: Calculate the total purchase amount.
        total_purchase_amount := total_purchase_amount + ((item->>'purchase_price')::NUMERIC * item_quantity);
    END LOOP;

    -- Step 9: Update the 'purchases' record with the correct total amount.
    UPDATE public.purchases
    SET
        total_amount = total_purchase_amount,
        balance_due = total_purchase_amount
    WHERE id = new_purchase_id;

    -- Step 10: Return the ID of the newly created purchase record.
    RETURN new_purchase_id;
END;
$BODY$;

COMMENT ON FUNCTION public.create_new_purchase(bigint, text, jsonb) IS 'Creates a purchase, finds/creates product variants, and populates inventory linked to those variants.';