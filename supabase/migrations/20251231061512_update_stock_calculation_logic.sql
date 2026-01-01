-- 1. Main Display View ko update karna (Sum use karein count ki jagah)
CREATE OR REPLACE VIEW public.products_display_view AS
 SELECT p.id,
    p.name,
    p.brand,
    p.barcode,
    p.category_id,
    p.purchase_price AS default_purchase_price,
    p.sale_price AS default_sale_price,
    c.name AS category_name,
    COALESCE(sum(i.available_qty) FILTER (WHERE i.status = 'Available'), 0) AS quantity,
    avg(i.purchase_price) FILTER (WHERE i.status = 'Available') AS avg_purchase_price,
    min(i.sale_price) FILTER (WHERE i.status = 'Available') AS min_sale_price,
    max(i.sale_price) FILTER (WHERE i.status = 'Available') AS max_sale_price
   FROM products p
     LEFT JOIN inventory i ON p.id = i.product_id
     LEFT JOIN categories c ON p.category_id = c.id
  WHERE p.user_id = auth.uid()
  GROUP BY p.id, c.name;

-- 2. Stock Count Function ko update karna
CREATE OR REPLACE FUNCTION public.get_current_user_stock_count()
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT
    COALESCE(sum(available_qty), 0)::bigint
  FROM
    public.inventory
  WHERE
    auth.uid() = inventory.user_id AND inventory.status = 'Available';
$function$;

-- 3. Product Variants Function ko update karna
CREATE OR REPLACE FUNCTION public.get_product_variants(p_product_id bigint)
 RETURNS TABLE(quantity bigint, purchase_price numeric, sale_price numeric, details jsonb)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        SUM(inv.available_qty)::bigint AS quantity,
        inv.purchase_price,
        inv.sale_price,
        jsonb_build_object(
            'condition', inv.condition,
            'color', inv.color,
            'ram_rom', inv.ram_rom,
            'pta_status', inv.pta_status,
            'guaranty', inv.guaranty
        ) AS details
    FROM
        inventory inv
    WHERE
        inv.product_id = p_product_id
        AND inv.status = 'Available'
        AND inv.available_qty > 0
    GROUP BY
        inv.purchase_price,
        inv.sale_price,
        inv.condition,
        inv.color,
        inv.ram_rom,
        inv.pta_status,
        inv.guaranty
    ORDER BY
        inv.purchase_price,
        inv.sale_price;
END;
$function$;

-- 4. Low Stock Count Function ko update karna
CREATE OR REPLACE FUNCTION public.get_low_stock_product_count()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  with user_settings as (
    select p.low_stock_alerts_enabled, p.low_stock_threshold
    from public.profiles p where p.user_id = auth.uid()
  ),
  product_stock as (
    select p.id as product_id, sum(i.available_qty) as current_quantity
    from public.products p
    join public.inventory i on p.id = i.product_id
    where p.user_id = auth.uid() and i.status = 'Available'
    group by p.id
  )
  select count(*)::integer
  from product_stock ps
  where exists (select 1 from user_settings where low_stock_alerts_enabled = true)
    and ps.current_quantity <= (select low_stock_threshold from user_settings);
$function$;