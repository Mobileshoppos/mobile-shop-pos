-- create_search_variants_function.sql

CREATE OR REPLACE FUNCTION public.search_product_variants(
    search_query TEXT,
    filter_attributes JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    -- Columns that will be returned by the function
    variant_id BIGINT,
    product_id BIGINT,
    product_name TEXT,
    brand TEXT,
    category_name TEXT,
    attributes JSONB,
    purchase_price NUMERIC,
    sale_price NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pv.id AS variant_id,
        p.id AS product_id,
        p.name AS product_name,
        p.brand,
        c.name AS category_name,
        pv.attributes,
        pv.purchase_price,
        pv.sale_price
    FROM
        public.product_variants AS pv
    JOIN
        public.products AS p ON pv.product_id = p.id
    LEFT JOIN
        public.categories AS c ON p.category_id = c.id
    WHERE
        -- Security: Ensure users can only see their own data
        pv.user_id = auth.uid()

        -- Advanced filter for attributes like RAM, Storage, Color etc.
        -- This checks if the variant's attributes contain the filter_attributes
        AND (pv.attributes @> filter_attributes)

        -- General search query logic
        AND (
            search_query IS NULL OR search_query = '' OR
            -- Search in product name
            p.name ILIKE '%' || search_query || '%' OR
            -- Search in product brand
            p.brand ILIKE '%' || search_query || '%' OR
            -- Search for IMEI or Serial inside the attributes JSONB
            pv.attributes->>'imei' ILIKE '%' || search_query || '%' OR
            pv.attributes->>'serial_number' ILIKE '%' || search_query || '%'
        );
END;
$$;