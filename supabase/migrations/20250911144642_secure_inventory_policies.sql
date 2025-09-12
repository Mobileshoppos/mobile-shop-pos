-- Step 1: Drop the old, insecure "ALL" policy if it exists.
-- NOTE: Make sure the name matches EXACTLY what is in your dashboard.
DROP POLICY IF EXISTS "Users can manage inventory for the..." ON public.inventory;

-- Step 2: Create a new, secure policy for viewing (SELECT).
-- This ensures users can only see their own inventory items.
DROP POLICY IF EXISTS "Users can view their own inventory" ON public.inventory;
CREATE POLICY "Users can view their own inventory"
ON public.inventory
FOR SELECT
USING (auth.uid() = user_id);