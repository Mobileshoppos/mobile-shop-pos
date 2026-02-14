-- Pehle view ko drop karte hain taake naye security options ke sath bana sakein
DROP VIEW IF EXISTS "public"."products_display_view";

-- Ab View dobara banate hain, SECURITY INVOKER ke sath
CREATE OR REPLACE VIEW "public"."products_display_view"
WITH (security_invoker = true) -- [SECURITY LOCK]: Sirf yeh line naya izafa hai
AS
SELECT
  p.id,
  p.name,
  p.brand,
  p.barcode,
  p.category_id,
  p.purchase_price as default_purchase_price,
  p.sale_price as default_sale_price,
  c.name as category_name,
  COALESCE(
    sum(i.available_qty) filter (
      where
        i.status = 'Available'::text
    ),
    0::bigint
  ) as quantity,
  avg(i.purchase_price) filter (
    where
      i.status = 'Available'::text
  ) as avg_purchase_price,
  min(i.sale_price) filter (
    where
      i.status = 'Available'::text
  ) as min_sale_price,
  max(i.sale_price) filter (
    where
      i.status = 'Available'::text
  ) as max_sale_price
FROM
  public.products p
  LEFT JOIN public.inventory i ON p.id = i.product_id
  LEFT JOIN public.categories c ON p.category_id = c.id
WHERE
  p.user_id = auth.uid()
GROUP BY
  p.id,
  c.name;