-- This migration fixes the RLS policy on the 'product_variants' table.
-- It ensures that a logged-in user can insert a new variant for themselves,
-- which is a necessary permission for the 'create_new_purchase' function to work correctly in 'SECURITY INVOKER' mode.

-- Drop any potentially conflicting old insert policy.
-- Note: Replace 'Your old policy name here' if you know the exact name, otherwise this might show a notice which is okay.
-- For safety, we try dropping a generic name first.
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.product_variants;
DROP POLICY IF EXISTS "Allow authenticated users to insert variants" ON public.product_variants;


-- Create a new, correct policy that checks for ownership.
CREATE POLICY "Allow users to insert their own product variants" 
ON public.product_variants
FOR INSERT
WITH CHECK (auth.uid() = user_id);