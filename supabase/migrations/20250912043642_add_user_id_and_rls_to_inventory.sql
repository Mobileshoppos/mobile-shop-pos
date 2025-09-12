-- Step 1: Add the user_id column to the inventory table, linking it to users
ALTER TABLE public.inventory
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- Step 2: Enable Row Level Security (RLS) on the inventory table
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies to ensure users can only manage their own stock
DROP POLICY IF EXISTS "Allow users to insert their own stock" ON public.inventory;
CREATE POLICY "Allow users to insert their own stock"
ON public.inventory FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to view their own stock" ON public.inventory;
CREATE POLICY "Allow users to view their own stock"
ON public.inventory FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to update their own stock" ON public.inventory;
CREATE POLICY "Allow users to update their own stock"
ON public.inventory FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to delete their own stock" ON public.inventory;
CREATE POLICY "Allow users to delete their own stock"
ON public.inventory FOR DELETE
USING (auth.uid() = user_id);