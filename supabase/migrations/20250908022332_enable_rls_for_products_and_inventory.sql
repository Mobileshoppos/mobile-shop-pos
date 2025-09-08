-- Step 1: Enable Row Level Security on the tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Step 2: Create policies for the 'products' table
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

-- Step 3: Create policies for the 'inventory' table
-- Note: We check the user_id on the linked product table
CREATE POLICY "Users can manage inventory for their own products."
ON public.inventory FOR ALL
USING (
  auth.uid() = (
    SELECT user_id FROM public.products WHERE id = product_id
  )
);