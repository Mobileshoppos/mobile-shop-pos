-- Products table mein naya column add karna
ALTER TABLE public.products ADD COLUMN low_stock_threshold integer DEFAULT NULL;

-- Low stock count function ko update karna taake wo naye column ko samjhe
CREATE OR REPLACE FUNCTION "public"."get_low_stock_product_count"() RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  with user_settings as (
    select p.low_stock_alerts_enabled, p.low_stock_threshold
    from public.profiles p where p.user_id = auth.uid()
  ),
  product_stock as (
    select p.id as product_id, p.low_stock_threshold as product_threshold, sum(i.available_qty) as current_quantity
    from public.products p
    join public.inventory i on p.id = i.product_id
    where p.user_id = auth.uid() and i.status = 'Available'
    group by p.id, p.low_stock_threshold
  )
  select count(*)::integer
  from product_stock ps
  where exists (select 1 from user_settings where low_stock_alerts_enabled = true)
    and ps.current_quantity <= COALESCE(ps.product_threshold, (select low_stock_threshold from user_settings));
$$;