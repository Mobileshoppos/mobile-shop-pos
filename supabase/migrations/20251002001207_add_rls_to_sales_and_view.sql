-- supabase/migrations/[TIMESTAMP]_add_rls_to_sales_and_view.sql (IMPROVED VERSION)

-- STEP 1: Enable Row Level Security on the 'sales' table.
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- STEP 2: Drop the old policy IF IT EXISTS, then create the new one.
-- This makes the migration re-runnable and prevents errors.
DROP POLICY IF EXISTS "Users can view their own sales" ON public.sales;
CREATE POLICY "Users can view their own sales"
ON public.sales FOR SELECT
USING (auth.uid() = user_id);

-- STEP 3: Drop the old policy IF IT EXISTS, then create the new one.
DROP POLICY IF EXISTS "Users can create their own sales" ON public.sales;
CREATE POLICY "Users can create their own sales"
ON public.sales FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- STEP 4: (VERY IMPORTANT) Alter our view to respect these new policies.
ALTER VIEW public.sales_history_view SET (security_invoker = true);