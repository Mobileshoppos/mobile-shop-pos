CREATE OR REPLACE FUNCTION "public"."undo_return_item"("p_inventory_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_inv_record record;
    v_current_user_id UUID := auth.uid(); -- [SECURITY FIX]: User ID pakarna
BEGIN
    -- [SECURITY FIX]: Pehle tasdeeq karein ke yeh item isi user ka hai
    SELECT * INTO v_inv_record FROM public.inventory 
    WHERE id = p_inventory_id AND user_id = v_current_user_id;
    
    -- Agar item nahi mila ya kisi aur ka hai to function yahin ruk jaye
    IF v_inv_record.id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Inventory item not found or access denied.';
    END IF;

    IF v_inv_record.imei IS NOT NULL THEN
        UPDATE public.inventory SET status = 'Available', available_qty = 1, returned_qty = 0 
        WHERE id = p_inventory_id AND user_id = v_current_user_id; -- [SECURITY FIX]
    ELSE
        UPDATE public.inventory 
        SET available_qty = available_qty + 1,
            returned_qty = GREATEST(0, returned_qty - 1),
            status = 'Available'
        WHERE id = p_inventory_id AND user_id = v_current_user_id; -- [SECURITY FIX]
    END IF;

    -- [SECURITY FIX]: Sirf apni dukan ke return items delete karein
    DELETE FROM public.purchase_return_items 
    WHERE inventory_id_original = p_inventory_id 
    AND user_id = v_current_user_id;
END; $$;

-- Permissions set karna
ALTER FUNCTION "public"."undo_return_item"("p_inventory_id" "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."undo_return_item"("p_inventory_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."undo_return_item"("p_inventory_id" "uuid") TO "service_role";