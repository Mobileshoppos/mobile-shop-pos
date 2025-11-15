-- This is a new "all-in-one" function designed to handle all searching, filtering, and sorting for the main inventory page.
-- It replaces the inefficient two-step process (calling search_product_variants then querying products_display_view).
-- This single function improves performance by reducing database calls and centralizing business logic.

CREATE OR REPLACE FUNCTION public.get_filtered_products(
    p_search_query text,
    p_category_id bigint DEFAULT NULL,
    p_filter_attributes jsonb DEFAULT '{}'::jsonb,
    p_min_price numeric DEFAULT NULL,
    p_max_price numeric DEFAULT NULL,
    p_sort_by text DEFAULT 'name_asc' -- e.g., 'name_asc', 'price_asc', 'price_desc', 'quantity_desc'
)
-- Returns data in the same shape as our view for easy frontend integration.
RETURNS SETOF public.products_display_view 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT pdv.*
    FROM public.products_display_view AS pdv
    WHERE
        -- Filter 1: Category Filter
        (p_category_id IS NULL OR pdv.category_id = p_category_id)

        -- Filter 2: Price Range Filter
        -- This checks if the product's sale price range overlaps with the user's specified price range.
        AND (
            (p_min_price IS NULL OR pdv.max_sale_price >= p_min_price) AND
            (p_max_price IS NULL OR pdv.min_sale_price <= p_max_price)
        )

        -- Filter 3: Advanced Attributes Filter (e.g., Color: Blue, Storage: 256GB)
        -- Checks if the product has at least one inventory item whose attributes contain all the specified filters.
        AND (
            p_filter_attributes = '{}'::jsonb OR
            EXISTS (
                SELECT 1
                FROM public.inventory i
                WHERE
                    i.product_id = pdv.id
                    AND i.status = 'Available'
                    AND i.item_attributes @> p_filter_attributes
            )
        )

        -- Filter 4: Search Query Filter (Text search)
        -- This checks the product's own details (name, brand) AND its associated inventory items (IMEI, attributes/tags).
        AND (
            p_search_query IS NULL OR p_search_query = '' OR
            pdv.name ILIKE '%' || p_search_query || '%' OR
            pdv.brand ILIKE '%' || p_search_query || '%' OR
            EXISTS (
                SELECT 1
                FROM public.inventory i
                WHERE
                    i.product_id = pdv.id
                    AND i.status = 'Available'
                    AND (
                        i.imei ILIKE '%' || p_search_query || '%' OR
                        EXISTS (
                            SELECT 1
                            FROM jsonb_each_text(i.item_attributes) AS t(key, value)
                            WHERE value ILIKE '%' || p_search_query || '%'
                        )
                    )
            )
        )

    -- Dynamic Sorting Logic
    ORDER BY
        CASE WHEN p_sort_by = 'price_asc' THEN pdv.min_sale_price END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'price_desc' THEN pdv.max_sale_price END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'quantity_desc' THEN pdv.quantity END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'quantity_asc' THEN pdv.quantity END ASC NULLS LAST,
        -- Default sort by name
        pdv.name ASC;

END;
$$;