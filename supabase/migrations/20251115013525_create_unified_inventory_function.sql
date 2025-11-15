-- ========= STEP 1: CLEANUP OLD FUNCTIONS =========
-- Drop the functions we are replacing to keep the database clean.
-- We drop them first to avoid any conflicts.
DROP FUNCTION IF EXISTS public.get_filtered_products(text, bigint, jsonb, numeric, numeric, text);
DROP FUNCTION IF EXISTS public.search_product_variants(text, jsonb);


-- ========= STEP 2: DEFINE NEW DATA STRUCTURES (TYPES) =========
-- This custom type defines the structure for a single inventory item (variant).
-- It will be used to create a JSON array of variants for each product.
CREATE TYPE public.inventory_variant_type AS (
    id bigint,
    imei text,
    quantity int,
    item_attributes jsonb,
    purchase_price numeric,
    sale_price numeric
);

-- This custom type defines the final structure of the data our new function will return.
-- It matches our 'products_display_view' but adds a 'variants' JSONB field.
CREATE TYPE public.unified_product_type AS (
    id bigint,
    name text,
    brand text,
    category_id bigint,
    category_name text,
    quantity bigint,
    min_sale_price numeric,
    max_sale_price numeric,
    variants jsonb -- This will hold the array of all inventory items for the product
);


-- ========= STEP 3: CREATE THE NEW "SUPER-FUNCTION" =========
-- This is the final, all-in-one function. It gets products AND their variants
-- in a single database call, eliminating UI flicker and solving all sorting issues.

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
        -- This part is the same as before: it finds all the products that match the user's filters.
        SELECT pdv.*
        FROM public.products_display_view AS pdv
        WHERE
            (p_category_id IS NULL OR pdv.category_id = p_category_id)
            AND (
                (p_min_price IS NULL OR pdv.max_sale_price >= p_min_price) AND
                (p_max_price IS NULL OR pdv.min_sale_price <= p_max_price)
            )
            AND (
                p_filter_attributes = '{}'::jsonb OR
                EXISTS (SELECT 1 FROM public.inventory i WHERE i.product_id = pdv.id AND i.status = 'Available' AND i.item_attributes @> p_filter_attributes)
            )
            AND (
                p_search_query IS NULL OR p_search_query = '' OR
                pdv.name ILIKE '%' || p_search_query || '%' OR
                pdv.brand ILIKE '%' || p_search_query || '%' OR
                EXISTS (SELECT 1 FROM public.inventory i WHERE i.product_id = pdv.id AND i.status = 'Available' AND (i.imei ILIKE '%' || p_search_query || '%' OR EXISTS (SELECT 1 FROM jsonb_each_text(i.item_attributes) AS t(key, value) WHERE value ILIKE '%' || p_search_query || '%')))
            )
    )
    -- This is the main part. It selects the filtered products and, for each one,
    -- it fetches and attaches all its inventory variants as a JSON array.
    SELECT
        fp.id,
        fp.name,
        fp.brand,
        fp.category_id,
        fp.category_name,
        fp.quantity,
        fp.min_sale_price,
        fp.max_sale_price,
        -- This subquery gets all variants for the current product (fp.id)
        -- and aggregates them into a single JSON array called 'variants'.
        (
            SELECT jsonb_agg(v)
            FROM (
                SELECT 
                    i.id, i.imei, i.quantity, i.item_attributes, i.purchase_price, i.sale_price
                FROM public.inventory i
                WHERE i.product_id = fp.id AND i.status = 'Available'
                ORDER BY
                    -- **NEW VARIANT SORTING**: Variants that match the search query are ranked higher. This solves the "a5 vs a6" issue.
                    CASE
                        WHEN p_search_query IS NOT NULL AND p_search_query <> '' AND
                             (i.imei ILIKE '%' || p_search_query || '%' OR EXISTS (SELECT 1 FROM jsonb_each_text(i.item_attributes) AS t(key, value) WHERE value ILIKE '%' || p_search_query || '%'))
                        THEN 0
                        ELSE 1
                    END,
                    i.created_at DESC -- Default sort for variants is newest first.
            ) v
        ) AS variants
    FROM filtered_products fp
    -- This is the "Smart Ranking" for the PRODUCTS themselves, which we created before.
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