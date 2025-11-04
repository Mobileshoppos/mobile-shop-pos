/**
 * This migration updates the RLS policies on the 'inventory' table.
 * It removes the old, generic policies and replaces them with more specific ones
 * that include the subscription-based stock limit check for INSERTs.
 */

-- Step 1: Drop the old policies to avoid conflicts.
-- We drop the generic "ALL" policy and the simple "INSERT" policy.
DROP POLICY IF EXISTS "Users can manage inventory for their own..." ON public.inventory;
DROP POLICY IF EXISTS "Users can insert their own stock" ON public.inventory;
-- We also drop the simple select policy, as we will create a more explicit one.
DROP POLICY IF EXISTS "Users can view their own inventory" ON public.inventory;


-- Step 2: Ensure RLS is enabled on the table.
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;


-- Step 3: Create the new, combined INSERT policy.
-- This policy checks BOTH that the user owns the record AND that they are within their subscription limit.
CREATE POLICY "Allow insert based on ownership and subscription" ON public.inventory
FOR INSERT
WITH CHECK (
  -- Condition 1: The user must be the owner of the new row.
  auth.uid() = user_id 
  AND 
  (
    -- Condition 2: The user must either be 'pro' OR have less than 50 items.
    (
      SELECT subscription_tier
      FROM public.profiles
      WHERE user_id = auth.uid()
    ) = 'pro' 
    OR 
    public.get_current_user_stock_count() < 50
  )
);


-- Step 4: Re-create specific policies for SELECT, UPDATE, and DELETE to ensure users can manage their own data.
-- These ensure that even with the new insert policy, basic operations still work correctly.

CREATE POLICY "Allow users to view their own inventory" ON public.inventory
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own inventory" ON public.inventory
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own inventory" ON public.inventory
FOR DELETE
USING (auth.uid() = user_id);