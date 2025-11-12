/**
 * This is the crucial fix for our stock counting logic.
 * It updates the 'get_current_user_stock_count' function to ONLY count
 * inventory items that have the status 'Available'.
 * This ensures that when an item is sold, the count correctly decreases.
 */

CREATE OR REPLACE FUNCTION public.get_current_user_stock_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    count(*)
  FROM
    public.inventory
  WHERE
    auth.uid() = inventory.user_id AND inventory.status = 'Available'; -- <-- THIS IS THE CRUCIAL FIX
$$;