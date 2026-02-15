-- 1. sale_return_items ki policy ko mazeed sakht karna
DROP POLICY IF EXISTS "Allow users to manage their own sale return items" ON "public"."sale_return_items";

CREATE POLICY "Allow users to manage their own sale return items" ON "public"."sale_return_items"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sale_returns sr
        WHERE sr.id = sale_return_items.return_id
        AND sr.user_id = auth.uid() -- [SECURITY LOCK]: Parent table ke user_id se tasdeeq
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sale_returns sr
        WHERE sr.id = sale_return_items.return_id
        AND sr.user_id = auth.uid() -- [SECURITY LOCK]: Naya data dalte waqt bhi check
    )
);

-- 2. payment_allocations ki policy ko mazeed sakht karna
DROP POLICY IF EXISTS "Users can manage their own payment allocations" ON "public"."payment_allocations";

CREATE POLICY "Users can manage their own payment allocations" ON "public"."payment_allocations"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.supplier_payments sp
        WHERE sp.id = payment_allocations.payment_id
        AND sp.user_id = auth.uid() -- [SECURITY LOCK]: Sirf apni payment ki allocation dekhein
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.supplier_payments sp
        WHERE sp.id = payment_allocations.payment_id
        AND sp.user_id = auth.uid() -- [SECURITY LOCK]: Sirf apni payment par allocation lagayein
    )
);

-- 3. category_attributes ki policy ko mazeed sakht karna
DROP POLICY IF EXISTS "Users can only view attributes of their own categories" ON "public"."category_attributes";

CREATE POLICY "Users can manage their own category attributes" ON "public"."category_attributes"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.categories c
        WHERE c.id = category_attributes.category_id
        AND (c.user_id = auth.uid() OR c.user_id IS NULL) -- [SECURITY LOCK]: Apni ya default categories
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.categories c
        WHERE c.id = category_attributes.category_id
        AND c.user_id = auth.uid() -- [SECURITY LOCK]: Sirf apni category mein attribute dalein
    )
);