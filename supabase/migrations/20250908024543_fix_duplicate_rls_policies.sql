-- Step 1: Drop all existing policies on the tables to ensure a clean slate
DROP POLICY IF EXISTS "Users can view their own products." ON public.products;
DROP POLICY IF EXISTS "Users can insert their own products." ON public.products;
DROP POLICY IF EXISTS "Users can update their own products." ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products." ON public.products;
DROP POLICY IF EXISTS "Users can manage inventory for their own products." ON public.inventory;

-- Step 2: Re-create the policies correctly

-- Policies for 'products' table
CREATE POLICY "Users can view their own products."
ON public.products FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products."
ON public.products FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products."
ON public.products FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products."
ON public.products FOR DELETE
USING (auth.uid() = user_id);

-- Policy for 'inventory' table
CREATE POLICY "Users can manage inventory for their own products."
ON public.inventory FOR ALL
USING (
  auth.uid() = (
    SELECT user_id FROM public.products WHERE id = product_id
  )
);