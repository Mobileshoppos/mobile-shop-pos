-- supabase/migrations/20250928104357_secure_supplier_and_purchase_tables.sql (Corrected)

-- =================================================================
-- This migration now only enables RLS and creates the policies.
-- The user_id column is now handled by the 'prepare_existing_data_for_rls' migration.
-- =================================================================

-- Table 1: suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own suppliers" ON public.suppliers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own suppliers" ON public.suppliers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own suppliers" ON public.suppliers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own suppliers" ON public.suppliers FOR DELETE USING (auth.uid() = user_id);

-- Table 2: purchases
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own purchases" ON public.purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own purchases" ON public.purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own purchases" ON public.purchases FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own purchases" ON public.purchases FOR DELETE USING (auth.uid() = user_id);

-- Table 3: supplier_payments
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own payments" ON public.supplier_payments FOR ALL USING (auth.uid() = user_id);

-- Table 4: purchase_returns
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own purchase returns" ON public.purchase_returns FOR ALL USING (auth.uid() = user_id);

-- Table 5: purchase_return_items
ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own return items" ON public.purchase_return_items FOR ALL USING (auth.uid() = user_id);