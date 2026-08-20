-- Update clear_dummy_data to also delete test sales made using demo products (like A1001)
CREATE OR REPLACE FUNCTION public.clear_dummy_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_demo_product_ids UUID[];
    v_demo_sale_ids UUID[];
BEGIN
    -- 1. Tamam demo products ki IDs nikalna
    SELECT COALESCE(array_agg(id), ARRAY[]::UUID[]) INTO v_demo_product_ids 
    FROM public.products 
    WHERE user_id = auth.uid() AND (is_dummy = true OR name ILIKE '%Demo%');

    -- 2. Wo tamam sales dhoondna jin mein demo products beche gaye (e.g. A1001)
    SELECT COALESCE(array_agg(DISTINCT sale_id), ARRAY[]::UUID[]) INTO v_demo_sale_ids 
    FROM public.sale_items 
    WHERE user_id = auth.uid() AND (product_id = ANY(v_demo_product_ids) OR is_dummy = true);

    -- 3. In sales aur inke items ko delete karna
    DELETE FROM public.sale_items 
    WHERE user_id = auth.uid() AND (sale_id = ANY(v_demo_sale_ids) OR product_id = ANY(v_demo_product_ids) OR is_dummy = true);

    DELETE FROM public.sales 
    WHERE user_id = auth.uid() AND (id = ANY(v_demo_sale_ids) OR is_dummy = true OR invoice_id ILIKE 'DEMO-%');

    -- 4. Inventory, variants aur products delete karna
    DELETE FROM public.inventory WHERE user_id = auth.uid() AND (product_id = ANY(v_demo_product_ids) OR is_dummy = true);
    DELETE FROM public.product_variants WHERE user_id = auth.uid() AND (product_id = ANY(v_demo_product_ids) OR is_dummy = true);
    DELETE FROM public.products WHERE user_id = auth.uid() AND (id = ANY(v_demo_product_ids) OR is_dummy = true OR name ILIKE '%Demo%');

    -- 5. Purchases, suppliers aur customers delete karna
    DELETE FROM public.purchases WHERE user_id = auth.uid() AND is_dummy = true;
    DELETE FROM public.suppliers WHERE user_id = auth.uid() AND is_dummy = true;
    DELETE FROM public.customers WHERE user_id = auth.uid() AND (is_dummy = true OR name ILIKE '%(Demo)%');
    DELETE FROM public.categories WHERE user_id = auth.uid() AND (is_dummy = true OR name ILIKE '%Demo%');
END;
$$;