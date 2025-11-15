-- ========= STEP 1: CLEANUP FAULTY OBJECTS FROM PREVIOUS MIGRATION =========
-- We must first drop the function and the types it depends on to redefine them correctly.
DROP FUNCTION IF EXISTS public.get_inventory_details(text, bigint, jsonb, numeric, numeric, text);
DROP TYPE IF EXISTS public.unified_product_type;
DROP TYPE IF EXISTS public.inventory_variant_type;


-- ========= STEP 2: DEFINE THE CORRECT DATA STRUCTURES (TYPES) =========
-- This is the corrected type for a single inventory variant.
-- NOTE: The 'quantity' field has been REMOVED as it does not exist in the 'inventory' table.
CREATE TYPE public.inventory_variant_type AS (
    id bigint,
    imei text,
    item_attributes jsonb,
    purchase_price numeric,
    sale_price numeric
);

-- This is the main product type, which remains the same but needs to be recreated.
CREATE TYPE public.unified_product_type AS (
    id bigint,
    name text,
    brand text,
    category_id bigint,
    category_name text,
    quantity bigint,
    min_sale_price numeric,
    max_sale_price numeric,
    variants jsonb
);


-- ========= STEP 3: CREATE THE CORRECTED "SUPER-FUNCTION" =========
-- This is the corrected version of the function.
-- The SELECT statement inside the jsonb_agg has been fixed to not look for a 'quantity' column.

CREATE OR REPLACE FUNCTION public.get_inventory_details(
    p_search_query text,
    p_category_id bigint DEFAULT NULL,
    p_filter_attributes jsonb DEFAULT '{}'::jsonb,
    p_min_price numeric DEFAULT NULL,
    p_max_price numeric DEFAULT NULL,
    p_sort_by text DEFAULT 'name_asc'
)
RETURNS SETOF public.unified_product_type
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH filtered_products AS (
        -- This filtering logic remains unchanged and is correct.
        SELECT pdv.*
        FROM public.products_display_view AS pdv
        WHERE
            (p_category_id IS NULL OR pdv.category_id = p_category_id)
            AND ((p_min_price IS NULL OR pdv.max_sale_price >= p_min_price) AND (p_max_price IS NULL OR pdv.min_sale_price <= p_max_price))
            AND (p_filter_attributes = '{}'::jsonb OR EXISTS (SELECT 1 FROM public.inventory i WHERE i.product_id = pdv.id AND i.status = 'Available' AND i.item_attributes @> p_filter_attributes))
            AND (p_search_query IS NULL OR p_search_query = '' OR pdv.name ILIKE '%' || p_search_query || '%' OR pdv.brand ILIKE '%' || p_search_query || '%' OR EXISTS (SELECT 1 FROM public.inventory i WHERE i.product_id = pdv.id AND i.status = 'Available' AND (i.imei ILIKE '%' || p_search_query || '%' OR EXISTS (SELECT 1 FROM jsonb_each_text(i.item_attributes) AS t(key, value) WHERE value ILIKE '%' || p_search_query || '%'))))
    )
    -- The main SELECT statement where the variants are aggregated.
    SELECT
        fp.id, fp.name, fp.brand, fp.category_id, fp.category_name, fp.quantity, fp.min_sale_price, fp.max_sale_price,
        (
            SELECT jsonb_agg(v)
            FROM (
                -- THIS IS THE CORRECTED PART: 'i.quantity' has been removed from the SELECT list.
                SELECT
                    i.id, i.imei, i.item_attributes, i.purchase_price, i.sale_price
                FROM public.inventory i
                WHERE i.product_id = fp.id AND i.status = 'Available'
                ORDER BY
                    CASE
                        WHEN p_search_query IS NOT NULL AND p_search_query <> '' AND
                             (i.imei ILIKE '%' || p_search_query || '%' OR EXISTS (SELECT 1 FROM jsonb_each_text(i.item_attributes) AS t(key, value) WHERE value ILIKE '%' || p_search_query || '%'))
                        THEN 0
                        ELSE 1
                    END,
                    i.created_at DESC
            ) v
        ) AS variants
    FROM filtered_products fp
    -- The product-level sorting logic remains unchanged and correct.
    ORDER BY
        CASE
            WHEN p_search_query IS NULL OR p_search_query = '' THEN 0
            WHEN fp.brand ILIKE '%' || p_search_query || '%' THEN 1
            WHEN fp.name ILIKE '%' || p_search_query || '%' THEN 2
            ELSE 3
        END,
        CASE WHEN p_sort_by = 'price_asc' THEN fp.min_sale_price END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'price_desc' THEN fp.max_sale_price END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'quantity_desc' THEN fp.quantity END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'quantity_asc' THEN fp.quantity END ASC NULLS LAST,
        fp.name ASC;
END;
$$;