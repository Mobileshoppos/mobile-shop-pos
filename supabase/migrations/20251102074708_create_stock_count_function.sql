/**
 * Creates a function to count the number of inventory items for the currently authenticated user.
 * This function will be used in the RLS policy to enforce the stock limit for the 'free' tier.
 */
create or replace function public.get_current_user_stock_count()
returns bigint
language sql
security definer
as $$
  select
    count(*)
  from
    public.inventory
  where
    auth.uid() = inventory.user_id;
$$;

-- Grant execute permission to the 'authenticated' role so that RLS policies can use it.
grant execute
on function public.get_current_user_stock_count()
to authenticated;