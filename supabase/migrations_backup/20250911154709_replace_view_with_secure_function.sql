-- Step 1: Drop the old, insecure VIEW completely.
DROP VIEW IF EXISTS public.products_with_quantity;

-- Step 2: Create a new, secure FUNCTION.
-- This function will only return products that belong to the currently logged-in user.
CREATE OR REPLACE FUNCTION get_products_with_quantity()
RETURNS TABLE (
    id bigint,
    name text,
    category_id bigint,
    brand text,
    purchase_price numeric,
    sale_price numeric,
    user_id uuid,
    created_at timestamptz,
    quantity bigint,
    categories json -- We return the category as a JSON object
)
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.category_id,
        p.brand,
        p.purchase_price,
        p.sale_price,
        p.user_id,
        p.created_at,
        (SELECT count(i.id) FROM public.inventory i WHERE i.product_id = p.id AND i.status = 'Available'::text) AS quantity,
        json_build_object('name', c.name) as categories
    FROM
        public.products p
    LEFT JOIN
        public.categories c ON p.category_id = c.id
    WHERE
        p.user_id = auth.uid(); -- This is the security line that was missing!
END;
$$ LANGUAGE plpgsql;