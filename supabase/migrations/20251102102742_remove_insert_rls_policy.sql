-- This migration removes the RLS policy for INSERTs on the inventory table.
-- The stock limit check is now handled more reliably inside the 'create_new_purchase' database function.
-- This prevents conflicts and ensures correct calculation for batch inserts.

DROP POLICY IF EXISTS "Allow insert based on ownership and subscription" ON public.inventory;

-- We still need a basic insert policy to allow the function (running as the user) to insert.
-- This policy simply checks for ownership. The stock limit is checked inside the function itself.
CREATE POLICY "Allow insert by owner" ON public.inventory
FOR INSERT
WITH CHECK (auth.uid() = user_id);