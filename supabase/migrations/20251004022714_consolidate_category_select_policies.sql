-- === For 'categories' table ===

-- Step 1: Drop all old SELECT policies to avoid conflicts.
-- We use "IF EXISTS" for safety.
DROP POLICY IF EXISTS "Users can view their own categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view default categories" ON public.categories;

-- Step 2: Create one new, clean SELECT policy.
CREATE POLICY "Allow viewing of own and default categories"
ON public.categories
FOR SELECT
USING ((auth.uid() = user_id) OR (user_id IS NULL));


-- === For 'expense_categories' table ===

-- Step 3: Drop all old SELECT policies from this table as well.
DROP POLICY IF EXISTS "Users can view their own and default categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Public can view default expense categories" ON public.expense_categories;

-- Step 4: Create one new, clean SELECT policy for it.
CREATE POLICY "Allow viewing of own and default expense categories"
ON public.expense_categories
FOR SELECT
USING ((auth.uid() = user_id) OR (user_id IS NULL));