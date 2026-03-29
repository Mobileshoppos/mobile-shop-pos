CREATE OR REPLACE FUNCTION public.update_purchase_inventory(
    p_purchase_id UUID,
    p_supplier_id UUID,
    p_notes TEXT,
    p_amount_paid NUMERIC,
    p_items JSONB,
    p_local_id UUID DEFAULT NULL,
    p_invoice_id TEXT DEFAULT NULL,
    p_staff_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    item JSONB;
    v_inv_id UUID;
    v_new_qty INT;
    v_already_used INT;
    v_total_purchase_amount NUMERIC := 0;
    v_current_user_id UUID := auth.uid(); -- [SECURITY LOCK 1]: Asli User ID pakarna
BEGIN
    -- [SECURITY LOCK 2]: Tasdeeq karna ke Purchase aur Supplier dono is user ke hain
    IF NOT EXISTS (
        SELECT 1 FROM public.purchases 
        WHERE id = p_purchase_id AND user_id = v_current_user_id
    ) OR NOT EXISTS (
        SELECT 1 FROM public.suppliers 
        WHERE id = p_supplier_id AND user_id = v_current_user_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Purchase or Supplier record not found for this user.';
    END IF;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_inv_id := (item->>'id')::UUID;
        v_new_qty := (item->>'quantity')::INT;

        -- [SECURITY LOCK 3]: Inventory update karte waqt user check lagana
        IF EXISTS (SELECT 1 FROM public.inventory WHERE id = v_inv_id AND user_id = v_current_user_id) THEN
            SELECT (sold_qty + returned_qty + damaged_qty) INTO v_already_used 
            FROM public.inventory WHERE id = v_inv_id AND user_id = v_current_user_id;

            UPDATE public.inventory SET
                quantity = v_new_qty,
                available_qty = v_new_qty - v_already_used,
                purchase_price = (item->>'purchase_price')::NUMERIC,
                sale_price = (item->>'sale_price')::NUMERIC,
                warranty_days = COALESCE((item->>'warranty_days')::INT, 0),
                imei = item->>'imei',                                      -- <--- NAYA IZAFA (Details bachane ke liye)
                item_attributes = (item->>'item_attributes')::JSONB,       -- <--- NAYA IZAFA (Details bachane ke liye)
                status = CASE WHEN (v_new_qty - v_already_used) <= 0 AND sold_qty > 0 THEN 'Sold' ELSE 'Available' END
            WHERE id = v_inv_id AND user_id = v_current_user_id;
        ELSE
            -- FIX: Use ID and Local_ID from JSON for newly added items during edit
            INSERT INTO public.inventory (id, local_id, product_id, variant_id, user_id, purchase_price, sale_price, quantity, available_qty, supplier_id, purchase_id, warranty_days, imei, item_attributes) -- <--- NAYA IZAFA yahan columns mein
            VALUES (v_inv_id, COALESCE((item->>'local_id')::UUID, v_inv_id), (item->>'product_id')::UUID, (item->>'variant_id')::UUID, v_current_user_id, (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, v_new_qty, v_new_qty, p_supplier_id, p_purchase_id, COALESCE((item->>'warranty_days')::INT, 0), item->>'imei', (item->>'item_attributes')::JSONB); -- <--- NAYA IZAFA yahan values mein
        END IF;

        v_total_purchase_amount := v_total_purchase_amount + ((item->>'purchase_price')::NUMERIC * v_new_qty);
    END LOOP;

    -- Yahan hum ne 'invoice_id' ko update kiya hai (staff_id ka izafa kiya gaya)
    UPDATE public.purchases SET
        supplier_id = p_supplier_id,
        invoice_id = p_invoice_id, -- <--- NAYA UPDATE
        notes = p_notes,
        total_amount = v_total_purchase_amount,
        amount_paid = p_amount_paid,
        balance_due = v_total_purchase_amount - p_amount_paid,
        status = CASE WHEN (v_total_purchase_amount - p_amount_paid) <= 0 THEN 'paid' ELSE 'partially_paid' END,
        staff_id = p_staff_id -- <--- NAYA IZAFA
    WHERE id = p_purchase_id AND user_id = v_current_user_id; -- [SECURITY LOCK 4]: User check
END;
$$ LANGUAGE plpgsql;