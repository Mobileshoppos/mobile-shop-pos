-- First, drop the old function that uses the incomplete view.
DROP FUNCTION IF EXISTS public.get_low_stock_products();

-- Now, create the new, more powerful function with the CORRECT column name.
CREATE OR REPLACE FUNCTION public.get_low_stock_products()
RETURNS TABLE(
    id uuid,
    name text,
    brand text,
    category_name text,
    quantity numeric,
    min_sale_price numeric,
    max_sale_price numeric,
    variants jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_low_stock_threshold int;
BEGIN
    -- Get the current user's specific low stock threshold from their profile.
    -- Default to 5 if no setting is found.
    SELECT COALESCE(p.low_stock_threshold, 5)
    INTO v_low_stock_threshold
    FROM public.profiles p
    WHERE p.user_id = v_user_id;

    -- This query builds the full product details, including variants.
    RETURN QUERY
    WITH product_stock AS (
        SELECT
            p.id,
            p.name,
            p.brand,
            c.name AS category_name,
            COALESCE(SUM(CASE WHEN i.status = 'Available' THEN 1 ELSE 0 END), 0) AS quantity,
            COALESCE(MIN(pv.sale_price), 0) AS min_sale_price,
            COALESCE(MAX(pv.sale_price), 0) AS max_sale_price,
            jsonb_agg(
                DISTINCT jsonb_build_object(
                    'id', i.id,
                    'variant_id', pv.id,
                    'purchase_price', i.purchase_price,
                    'sale_price', pv.sale_price,
                    -- THE FIX IS HERE: Use 'pv.attributes' but keep the key as 'item_attributes' for the front-end.
                    'item_attributes', pv.attributes,
                    'imei', i.imei,
                    'barcode', pv.barcode,
                    'category_is_imei_based', c.is_imei_based
                )
            ) FILTER (WHERE i.status = 'Available') AS variants
        FROM
            public.products p
        JOIN
            public.categories c ON p.category_id = c.id
        LEFT JOIN
            public.product_variants pv ON p.id = pv.product_id
        LEFT JOIN
            public.inventory i ON pv.id = i.variant_id
        WHERE
            p.user_id = v_user_id
        GROUP BY
            p.id, c.name
    )
    -- Finally, filter the fully detailed products based on the user's threshold.
    SELECT
        ps.id,
        ps.name,
        ps.brand,
        ps.category_name,
        ps.quantity,
        ps.min_sale_price,
        ps.max_sale_price,
        COALESCE(ps.variants, '[]'::jsonb) AS variants
    FROM
        product_stock ps
    WHERE
        ps.quantity <= v_low_stock_threshold AND ps.quantity > 0;
END;
$$;