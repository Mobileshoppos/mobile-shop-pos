DROP POLICY IF EXISTS "Users can view their own products" ON public.products;

CREATE POLICY "Users can view their own products"
ON public.products
FOR SELECT
USING (auth.uid() = user_id);