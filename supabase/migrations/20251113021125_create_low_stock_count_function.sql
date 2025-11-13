-- This function counts the number of products with low stock for the current user.
-- It joins products with inventory, groups by product, and checks against the user's profile settings.

create or replace function public.get_low_stock_product_count()
returns integer
language sql
security definer
as $$
  with user_settings as (
    -- First, get the current user's alert settings from their profile.
    select
      p.low_stock_alerts_enabled,
      p.low_stock_threshold
    from
      public.profiles p
    where
      p.user_id = auth.uid()
  ),
  product_stock as (
    -- Next, calculate the current stock for each product for the logged-in user.
    -- We only count items that are 'Available'.
    select
      p.id as product_id,
      count(i.id) as current_quantity
    from
      public.products p
      join public.inventory i on p.id = i.product_id
    where
      p.user_id = auth.uid()
      and i.status = 'Available'
    group by
      p.id
  )
  -- Finally, count how many products have a stock level at or below the user's threshold.
  -- The query will only return a count if alerts are enabled for the user.
  select
    count(*)::integer
  from
    product_stock ps
  where
    exists (select 1 from user_settings where low_stock_alerts_enabled = true)
    and ps.current_quantity <= (select low_stock_threshold from user_settings);
$$;