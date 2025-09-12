-- First, remove the old, potentially incorrect view
DROP VIEW IF EXISTS public.products_with_quantity;

-- Then, create it again with an explicit and correct structure
CREATE OR REPLACE VIEW public.products_with_quantity
AS
SELECT
    p.id, -- This ensures the product's correct UUID is always used as the 'id'
    p.name,
    p.brand,
    p.purchase_price,
    p.sale_price,
    p.category_id,
    p.user_id,
    p.created_at,
    count(i.id) AS quantity
FROM
    products p
LEFT JOIN
    inventory i ON p.id = i.product_id
GROUP BY
    p.id;