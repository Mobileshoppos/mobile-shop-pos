-- Step 1: Drop the problematic function forever.
DROP FUNCTION IF EXISTS public.get_products_with_price_range();

-- Step 2: Create a simple and reliable VIEW to get all the data we need.
-- A VIEW is like a virtual table and is much more stable for Supabase queries.
CREATE OR REPLACE VIEW public.products_display_view AS
SELECT
    p.id,
    p.name,
    p.brand,
    p.purchase_price AS default_purchase_price,
    p.sale_price AS default_sale_price,
    c.name AS category_name,
    COUNT(i.id) AS quantity,
    MIN(i.sale_price) AS min_sale_price,
    MAX(i.sale_price) AS max_sale_price
FROM
    products p
LEFT JOIN
    inventory i ON p.id = i.product_id
LEFT JOIN
    categories c ON p.category_id = c.id
GROUP BY
    p.id,
    c.name;