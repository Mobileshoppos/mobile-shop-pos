-- Step 1: Explicitly drop the old function to avoid conflicts with the return type.
-- This is the safest way to handle changes to a function's signature (its return columns).
DROP FUNCTION public.search_product_variants(text, jsonb);

-- Step 2: Create the new, improved function from scratch.
-- This version correctly searches the 'inventory' table and includes product name, brand, IMEI, and all 'item_attributes' (tags).
CREATE OR REPLACE FUNCTION public.search_product_variants(
    search_query text,
    filter_attributes jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(
    id bigint,
    product_id bigint,
    imei text,
    item_attributes jsonb,
    purchase_price numeric,
    sale_price numeric,
    status text,
    created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
        i.product_id,
        i.imei,
        i.item_attributes,
        i.purchase_price,
        i.sale_price,
        i.status,
        i.created_at
    FROM
        public.inventory AS i
    LEFT JOIN
        public.products AS p ON i.product_id = p.id
    WHERE
        -- Security: Ensure users can only see their own data.
        i.user_id = auth.uid()
        
        -- We only want to search for items that are available.
        AND i.status = 'Available'

        -- Advanced filter for attributes like RAM, Storage, Color etc.
        -- This checks if the inventory item's attributes contain the filter_attributes.
        AND (i.item_attributes @> filter_attributes)

        -- General search query logic.
        AND (
            search_query IS NULL OR search_query = '' OR
            
            -- Search in the main product name.
            p.name ILIKE '%' || search_query || '%' OR
            
            -- Search in the main product brand.
            p.brand ILIKE '%' || search_query || '%' OR
            
            -- Search for the specific IMEI number.
            i.imei ILIKE '%' || search_query || '%' OR
            
            -- **NEW & IMPROVED**: Search within all values of the item_attributes (tags).
            -- This converts the JSONB values to text and checks if any of them match the search query.
            EXISTS (
                SELECT 1
                FROM jsonb_each_text(i.item_attributes) AS t(key, value)
                WHERE value ILIKE '%' || search_query || '%'
            )
        );
END;
$$;