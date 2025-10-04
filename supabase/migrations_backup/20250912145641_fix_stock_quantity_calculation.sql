-- First, drop the old view
DROP VIEW IF EXISTS public.products_display_view;

-- Recreate the view with the corrected stock counting logic.
CREATE OR REPLACE VIEW public.products_display_view AS
SELECT
    p.id,
    p.name,
    p.brand,
    p.purchase_price AS default_purchase_price,
    p.sale_price AS default_sale_price,
    c.name AS category_name,
    -- THE FIX IS HERE: We now only count items with 'Available' status.
    COUNT(i.id) FILTER (WHERE i.status = 'Available') AS quantity,
    MIN(i.sale_price) AS min_sale_price,
    MAX(i.sale_price) AS max_sale_price
FROM
    products p
LEFT JOIN
    inventory i ON p.id = i.product_id
LEFT JOIN
    categories c ON p.category_id = c.id
WHERE
    p.user_id = auth.uid()
GROUP BY
    p.id,
    c.name;