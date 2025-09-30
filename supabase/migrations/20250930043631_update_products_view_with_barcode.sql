-- Drop the existing view first to avoid column order issues with CREATE OR REPLACE.
DROP VIEW IF EXISTS public.products_display_view;

-- Recreate the view with the new 'barcode' column included.
CREATE VIEW public.products_display_view AS
SELECT
  p.id,
  p.name,
  p.brand,
  p.barcode, -- Barcode column is now included
  p.purchase_price AS default_purchase_price,
  p.sale_price AS default_sale_price,
  c.name AS category_name,
  count(i.id) FILTER (
    WHERE
      i.status = 'Available' :: text
  ) AS quantity,
  min(i.sale_price) AS min_sale_price,
  max(i.sale_price) AS max_sale_price
FROM
  products p
  LEFT JOIN inventory i ON p.id = i.product_id
  LEFT JOIN categories c ON p.category_id = c.id
WHERE
  (p.user_id = auth.uid())
GROUP BY
  p.id,
  c.name;