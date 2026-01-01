CREATE OR REPLACE FUNCTION public.update_purchase_inventory(p_purchase_id bigint, p_supplier_id bigint, p_notes text, p_amount_paid numeric, p_items jsonb, p_local_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    item JSONB;
    v_inv_id BIGINT;
    v_new_qty INT;
    v_already_used INT;
    v_total_purchase_amount NUMERIC := 0;
BEGIN
    -- Loop through items sent from the form
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_inv_id := (item->>'id')::BIGINT; -- Inventory Row ID
        v_new_qty := (item->>'quantity')::INT;

        -- 1. Check karein ke yeh item pehle se inventory mein hai?
        IF EXISTS (SELECT 1 FROM public.inventory WHERE id = v_inv_id) THEN
            
            -- Hisaab lagayein ke kitne bik chuke ya wapis ho chuke hain
            SELECT (sold_qty + returned_qty + damaged_qty) INTO v_already_used 
            FROM public.inventory WHERE id = v_inv_id;

            -- Safety Check: Agar naya total bikay hue maal se kam hai to error dein
            IF v_new_qty < v_already_used THEN
                RAISE EXCEPTION 'Cannot reduce quantity to % because % units are already sold/returned.', v_new_qty, v_already_used;
            END IF;

            -- Update existing row
            UPDATE public.inventory SET
                quantity = v_new_qty,
                available_qty = v_new_qty - v_already_used,
                purchase_price = (item->>'purchase_price')::NUMERIC,
                sale_price = (item->>'sale_price')::NUMERIC,
                status = CASE WHEN (v_new_qty - v_already_used) <= 0 AND sold_qty > 0 THEN 'Sold' ELSE 'Available' END
            WHERE id = v_inv_id;

        ELSE
            -- Agar naya item add kiya hai edit ke doran (New Row)
            INSERT INTO public.inventory (local_id, product_id, variant_id, user_id, purchase_price, sale_price, quantity, available_qty, supplier_id, purchase_id)
            VALUES (gen_random_uuid(), (item->>'product_id')::BIGINT, (item->>'variant_id')::BIGINT, auth.uid(), (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, v_new_qty, v_new_qty, p_supplier_id, p_purchase_id);
        END IF;

        v_total_purchase_amount := v_total_purchase_amount + ((item->>'purchase_price')::NUMERIC * v_new_qty);
    END LOOP;

    -- Purchase record update karein
    UPDATE public.purchases SET
        supplier_id = p_supplier_id,
        notes = p_notes,
        total_amount = v_total_purchase_amount,
        amount_paid = p_amount_paid,
        balance_due = v_total_purchase_amount - p_amount_paid,
        status = CASE WHEN (v_total_purchase_amount - p_amount_paid) <= 0 THEN 'paid' ELSE 'partially_paid' END
    WHERE id = p_purchase_id;

END;
$function$;