-- 1. product_variants table mein naya column add karna
ALTER TABLE "public"."product_variants" ADD COLUMN IF NOT EXISTS "low_stock_threshold" integer;

-- 2. RPC function ko update karna taake wo Variant ke hisaab se ginti kare
CREATE OR REPLACE FUNCTION "public"."get_low_stock_product_count"() RETURNS integer
LANGUAGE "sql" SECURITY DEFINER
AS $$
  with user_settings as (
    select p.low_stock_alerts_enabled, p.low_stock_threshold
    from public.profiles p where p.user_id = auth.uid()
  ),
  stock_grouped as (
    select 
      i.product_id, 
      i.variant_id,
      -- Smart Fallback: Pehle Variant ki limit dekhega, phir Product ki, phir Global Settings ki
      COALESCE(
        v.low_stock_threshold, 
        p.low_stock_threshold, 
        (select low_stock_threshold from user_settings)
      ) as active_threshold,
      sum(i.available_qty) as current_quantity
    from public.inventory i
    join public.products p on i.product_id = p.id
    left join public.product_variants v on i.variant_id = v.id
    where i.user_id = auth.uid() and i.status = 'Available'
    group by i.product_id, i.variant_id, v.low_stock_threshold, p.low_stock_threshold
  )
  select count(*)::integer
  from stock_grouped sg
  where exists (select 1 from user_settings where low_stock_alerts_enabled = true)
    and sg.current_quantity <= sg.active_threshold;
$$;