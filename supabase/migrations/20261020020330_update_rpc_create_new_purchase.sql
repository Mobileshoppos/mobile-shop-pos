CREATE OR REPLACE FUNCTION "public"."create_new_purchase"("p_local_id" "uuid", "p_supplier_id" "uuid", "p_notes" "text", "p_inventory_items" "jsonb", "p_invoice_id" "text" DEFAULT NULL::"text", "p_staff_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    new_purchase_id UUID := p_local_id; 
    new_variant_id UUID;
    total_purchase_amount NUMERIC(10, 2) := 0;
    item JSONB;
    item_quantity INT;
    v_is_imei BOOLEAN;
BEGIN
    -- NAYA IZAFA: Duplicate check taake slow internet par double entry na ho
    IF EXISTS (SELECT 1 FROM public.purchases WHERE id = p_local_id) THEN
        RETURN p_local_id;
    END IF;

    -- Yahan hum ne 'invoice_id' column add kiya hai (staff_id ka izafa kiya gaya)
    INSERT INTO public.purchases (id, local_id, invoice_id, supplier_id, notes, total_amount, balance_due, status, user_id, staff_id)
    VALUES (new_purchase_id, p_local_id, p_invoice_id, p_supplier_id, p_notes, 0, 0, 'unpaid', auth.uid(), p_staff_id);

    FOR item IN SELECT * FROM jsonb_array_elements(p_inventory_items)
    LOOP
        SELECT id INTO new_variant_id FROM public.product_variants
        WHERE product_id = (item->>'product_id')::UUID AND attributes = (item->'item_attributes')::JSONB;

        IF new_variant_id IS NULL THEN
            new_variant_id := gen_random_uuid();
            -- NAYA IZAFA: distributor_price shamil kiya gaya hai
            INSERT INTO public.product_variants (id, local_id, product_id, user_id, attributes, barcode, purchase_price, sale_price, wholesale_price, distributor_price)
            VALUES (new_variant_id, gen_random_uuid(), (item->>'product_id')::UUID, auth.uid(), (item->'item_attributes')::JSONB, (item->>'barcode')::TEXT, (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, (item->>'wholesale_price')::NUMERIC, (item->>'distributor_price')::NUMERIC);
        END IF;

        item_quantity := COALESCE((item->>'quantity')::INT, 1);

        SELECT c.is_imei_based INTO v_is_imei 
        FROM public.categories c 
        JOIN public.products p ON p.category_id = c.id 
        WHERE p.id = (item->>'product_id')::UUID;

        IF v_is_imei THEN
            FOR i IN 1..item_quantity LOOP
                -- FIX: Use ID from JSON if available (ADDED batch_number, expiry_date and warehouse_id) + distributor_price
                INSERT INTO public.inventory (id, local_id, product_id, variant_id, user_id, purchase_price, sale_price, wholesale_price, distributor_price, imei, item_attributes, supplier_id, purchase_id, quantity, available_qty, warranty_days, batch_number, expiry_date, warehouse_id)
                VALUES (COALESCE((item->>'id')::UUID, gen_random_uuid()), COALESCE((item->>'local_id')::UUID, gen_random_uuid()), (item->>'product_id')::UUID, new_variant_id, auth.uid(), (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, (item->>'wholesale_price')::NUMERIC, (item->>'distributor_price')::NUMERIC, (item->>'imei')::TEXT, (item->'item_attributes')::JSONB, p_supplier_id, new_purchase_id, 1, 1, COALESCE((item->>'warranty_days')::INT, 0), (item->>'batch_number')::TEXT, (item->>'expiry_date')::DATE, (item->>'warehouse_id')::UUID);
            END LOOP;
        ELSE
            -- FIX: Use ID and Local_ID from JSON (ADDED batch_number, expiry_date and warehouse_id) + distributor_price
            INSERT INTO public.inventory (id, local_id, product_id, variant_id, user_id, purchase_price, sale_price, wholesale_price, distributor_price, imei, item_attributes, supplier_id, purchase_id, quantity, available_qty, warranty_days, batch_number, expiry_date, warehouse_id)
            VALUES (COALESCE((item->>'id')::UUID, gen_random_uuid()), COALESCE((item->>'local_id')::UUID, gen_random_uuid()), (item->>'product_id')::UUID, new_variant_id, auth.uid(), (item->>'purchase_price')::NUMERIC, (item->>'sale_price')::NUMERIC, (item->>'wholesale_price')::NUMERIC, (item->>'distributor_price')::NUMERIC, NULL, (item->'item_attributes')::JSONB, p_supplier_id, new_purchase_id, item_quantity, item_quantity, COALESCE((item->>'warranty_days')::INT, 0), (item->>'batch_number')::TEXT, (item->>'expiry_date')::DATE, (item->>'warehouse_id')::UUID);
        END IF;

        total_purchase_amount := total_purchase_amount + ((item->>'purchase_price')::NUMERIC * item_quantity);
    END LOOP;

    UPDATE public.purchases SET total_amount = total_purchase_amount, balance_due = total_purchase_amount WHERE id = new_purchase_id;
    RETURN new_purchase_id;
END;
$$;

ALTER FUNCTION "public"."create_new_purchase"("p_local_id" "uuid", "p_supplier_id" "uuid", "p_notes" "text", "p_inventory_items" "jsonb", "p_invoice_id" "text", "p_staff_id" "uuid") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."create_new_purchase"("p_local_id" "uuid", "p_supplier_id" "uuid", "p_notes" "text", "p_inventory_items" "jsonb", "p_invoice_id" "text", "p_staff_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_new_purchase"("p_local_id" "uuid", "p_supplier_id" "uuid", "p_notes" "text", "p_inventory_items" "jsonb", "p_invoice_id" "text", "p_staff_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."create_new_purchase"("p_local_id" "uuid", "p_supplier_id" "uuid", "p_notes" "text", "p_inventory_items" "jsonb", "p_invoice_id" "text", "p_staff_id" "uuid") TO "supabase_auth_admin";