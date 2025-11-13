-- This function returns a complete list of products that are considered low in stock
-- based on the current user's profile settings.

create or replace function public.get_low_stock_products()
returns setof public.products_display_view -- Returns a table with the same structure as our display view
language sql
stable
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
  )
  -- Now, select all products from the display view that match the low stock criteria.
  select
    pdv.*
  from
    public.products_display_view as pdv,
    user_settings
  where
    -- This condition ensures we only return results if the user has alerts enabled.
    user_settings.low_stock_alerts_enabled = true
    -- This is the main filter: product quantity must be less than or equal to the user's threshold.
    and pdv.quantity <= user_settings.low_stock_threshold
    -- Also, we should only consider products that are actually in stock.
    and pdv.quantity > 0;
$$;