-- Create a view to easily get products with their available stock count
CREATE OR REPLACE VIEW public.products_with_quantity AS
SELECT
    p.*,
    COUNT(i.id) FILTER (WHERE i.status = 'Available') AS quantity
FROM
    public.products p
LEFT JOIN
    public.inventory i ON p.id = i.product_id
GROUP BY
    p.id;