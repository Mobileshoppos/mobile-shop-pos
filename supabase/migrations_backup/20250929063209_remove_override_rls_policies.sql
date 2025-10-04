-- =================================================================
-- FINAL RLS FIX: Removing overly permissive 'ALL' policies.
-- This is the definitive fix for the data visibility security issue.
-- =================================================================

-- These policies were allowing any logged-in user to perform ALL actions
-- (SELECT, INSERT, UPDATE, DELETE) on these tables, which overrode our
-- specific, secure policies. By dropping them, we ensure that only the
-- policies checking for 'user_id = auth.uid()' are active.

-- Drop the permissive policy from the 'suppliers' table
DROP POLICY "Allow authenticated users to manage suppliers" ON public.suppliers;

-- Drop the permissive policy from the 'purchases' table
DROP POLICY "Allow authenticated users to manage purchases" ON public.purchases;