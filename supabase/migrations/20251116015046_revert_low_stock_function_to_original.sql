-- This migration reverts the get_low_stock_products function to its original state
-- to resolve the column error and restore previous functionality.

-- First, drop the function to ensure a clean state.
DROP FUNCTION IF EXISTS public.get_low_stock_products();

-- Now, recreate the function exactly as it was before.
CREATE OR REPLACE FUNCTION public.get_low_stock_products()
RETURNS SETOF public.products_display_view
LANGUAGE sql
AS $$
  with user_settings as (
    select
      p.low_stock_alerts_enabled,
      p.low_stock_threshold
    from
      public.profiles p
    where
      p.user_id = auth.uid()
  )
  select
    pdv.*
  from
    public.products_display_view as pdv,
    user_settings
  where
    user_settings.low_stock_alerts_enabled = true
    and pdv.quantity <= user_settings.low_stock_threshold
    and pdv.quantity > 0;
$$;