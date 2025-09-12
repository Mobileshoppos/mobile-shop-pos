DROP VIEW IF EXISTS public.products_with_quantity;

CREATE VIEW public.products_with_quantity AS
SELECT
    p.id,
    p.name,
    p.category_id,
    p.brand,
    p.purchase_price,
    p.sale_price,
    p.user_id,
    p.created_at,
    count(i.id) AS quantity
FROM
    products p
    LEFT JOIN inventory i ON p.id = i.product_id AND i.status = 'Available'::text
GROUP BY
    p.id;