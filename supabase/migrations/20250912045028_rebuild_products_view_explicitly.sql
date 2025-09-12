-- First, drop the old view to ensure a clean slate
DROP VIEW IF EXISTS public.products_with_quantity;

-- Recreate the view with explicit column aliasing to prevent any ambiguity
-- We are forcing the view to use p.id (the product's UUID) as the primary 'id'
CREATE OR REPLACE VIEW public.products_with_quantity AS
SELECT
    p.id AS id, -- Explicitly select the product's UUID and name it 'id'
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
    p.id, p.name, p.brand, p.purchase_price, p.sale_price, p.category_id, p.user_id, p.created_at;