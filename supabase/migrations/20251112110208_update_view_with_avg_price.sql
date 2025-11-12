-- Step 1: Purani view ko hatayein taake koi masla na ho
DROP VIEW IF EXISTS public.products_display_view;

-- Step 2: Nayi aur behtar view banayein
CREATE VIEW public.products_display_view AS
SELECT
  p.id,
  p.name,
  p.brand,
  p.barcode,
  p.category_id,
  p.purchase_price AS default_purchase_price,
  p.sale_price AS default_sale_price,
  c.name AS category_name,
  count(i.id) FILTER (WHERE i.status = 'Available'::text) AS quantity,
  
  -- YEH NAYI LINE HAI JO INVENTORY SE ASAL PURCHASE PRICE KI AVERAGE NIKALTI HAI
  avg(i.purchase_price) FILTER (WHERE i.status = 'Available'::text) AS avg_purchase_price,
  
  -- Min aur Max Sale Price
  min(i.sale_price) FILTER (WHERE i.status = 'Available'::text) AS min_sale_price,
  max(i.sale_price) FILTER (WHERE i.status = 'Available'::text) AS max_sale_price
FROM
  products p
  LEFT JOIN inventory i ON p.id = i.product_id
  LEFT JOIN categories c ON p.category_id = c.id
WHERE
  p.user_id = auth.uid()
GROUP BY
  p.id,
  c.name;