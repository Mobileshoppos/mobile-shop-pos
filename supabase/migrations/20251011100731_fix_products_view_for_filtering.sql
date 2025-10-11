-- This migration fixes the products_display_view by adding the category_id.
-- It first DROPS the existing view and then CREATES the new version
-- to avoid issues with column reordering.

-- Step 1: Drop the old view if it exists.
DROP VIEW IF EXISTS public.products_display_view;

-- Step 2: Create the new, corrected view with category_id included.
CREATE VIEW public.products_display_view AS
SELECT
  p.id,
  p.name,
  p.brand,
  p.barcode,
  p.category_id, -- category_id ko yahan shamil kiya gaya hai
  p.purchase_price AS default_purchase_price,
  p.sale_price AS default_sale_price,
  c.name AS category_name,
  count(i.id) FILTER (
    WHERE
      i.status = 'Available'::text
  ) AS quantity,
  min(i.sale_price) AS min_sale_price,
  max(i.sale_price) AS max_sale_price
FROM
  products p
  LEFT JOIN inventory i ON p.id = i.product_id
  LEFT JOIN categories c ON p.category_id = c.id
WHERE
  (p.user_id = auth.uid ())
GROUP BY
  p.id,
  c.name;