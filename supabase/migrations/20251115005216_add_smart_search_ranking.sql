-- This migration updates the "all-in-one" function to introduce "Smart Search Ranking".
-- It prioritizes search results based on relevance:
-- Rank 1: Match in Product Brand (Most relevant)
-- Rank 2: Match in Product Name
-- Rank 3: Match in Inventory (IMEI or Tags)
-- This makes the search experience much more intuitive for the user.

CREATE OR REPLACE FUNCTION public.get_filtered_products(
    p_search_query text,
    p_category_id bigint DEFAULT NULL,
    p_filter_attributes jsonb DEFAULT '{}'::jsonb,
    p_min_price numeric DEFAULT NULL,
    p_max_price numeric DEFAULT NULL,
    p_sort_by text DEFAULT 'name_asc'
)
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
        AND (
            (p_min_price IS NULL OR pdv.max_sale_price >= p_min_price) AND
            (p_max_price IS NULL OR pdv.min_sale_price <= p_max_price)
        )

        -- Filter 3: Advanced Attributes Filter
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

    -- === NAYI "SMART RANKING" LOGIC START ===
    ORDER BY
        -- Primary Sorting: Relevance Ranking
        CASE
            -- Agar search khali hai, to ranking nahi hogi
            WHEN p_search_query IS NULL OR p_search_query = '' THEN 0
            -- Rank 1: Brand match (sab se ahem)
            WHEN pdv.brand ILIKE '%' || p_search_query || '%' THEN 1
            -- Rank 2: Name match
            WHEN pdv.name ILIKE '%' || p_search_query || '%' THEN 2
            -- Rank 3: IMEI ya Tags match (sab se kam ahem)
            ELSE 3
        END,

        -- Secondary Sorting: User's Choice (jo pehle se thi)
        CASE WHEN p_sort_by = 'price_asc' THEN pdv.min_sale_price END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'price_desc' THEN pdv.max_sale_price END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'quantity_desc' THEN pdv.quantity END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'quantity_asc' THEN pdv.quantity END ASC NULLS LAST,
        
        -- Default sort by name agar user kuch na chune
        pdv.name ASC;
    -- === NAYI "SMART RANKING" LOGIC END ===

END;
$$;