-- For 'categories' table: Add a new policy to allow viewing of default categories.
-- This will work together with the existing policy that shows user-specific categories.
CREATE POLICY "Public can view default categories"
ON public.categories
FOR SELECT
USING (user_id IS NULL);


-- For 'expense_categories' table: Add a new policy to allow viewing of default expense categories.
-- This will also work together with the existing policy.
CREATE POLICY "Public can view default expense categories"
ON public.expense_categories
FOR SELECT
USING (user_id IS NULL);