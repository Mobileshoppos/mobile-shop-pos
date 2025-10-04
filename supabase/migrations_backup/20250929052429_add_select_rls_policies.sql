
-- =================================================================
-- Migration to add SELECT (view) policies for Row Level Security.
-- This is a critical security fix to ensure users can only see their own data.
-- =================================================================

-- Policy for 'suppliers' table
-- Allows users to view only the suppliers they have created.
CREATE POLICY "Users can view their own suppliers."
ON public.suppliers FOR SELECT
USING (auth.uid() = user_id);

-- Policy for 'purchases' table
-- Allows users to view only their own purchase records.
CREATE POLICY "Users can view their own purchases."
ON public.purchases FOR SELECT
USING (auth.uid() = user_id);

-- Policy for 'supplier_payments' table
-- Allows users to view only their own payment records.
CREATE POLICY "Users can view their own supplier payments."
ON public.supplier_payments FOR SELECT
USING (auth.uid() = user_id);

-- Policy for 'purchase_returns' table
-- Allows users to view only their own return records.
CREATE POLICY "Users can view their own purchase returns."
ON public.purchase_returns FOR SELECT
USING (auth.uid() = user_id);

-- Policy for 'purchase_return_items' table
-- Allows users to view only the items from their own returns.
CREATE POLICY "Users can view their own purchase return items."
ON public.purchase_return_items FOR SELECT
USING (auth.uid() = user_id);

-- =================================================================
-- Cleanup: Remove the old, conflicting 'record_supplier_payment' function.
-- This function was renamed to 'record_purchase_payment', but an old version
-- with a 'bigint' parameter might still exist, causing issues.
-- This DROP statement cleans it up permanently.
-- =================================================================
DROP FUNCTION IF EXISTS public.record_supplier_payment(bigint, integer, numeric, text, date, text);