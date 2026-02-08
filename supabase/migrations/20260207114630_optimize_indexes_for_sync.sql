-- Sync process aur Dashboard queries ko tez karne ke liye indexes
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON public.products (updated_at);
CREATE INDEX IF NOT EXISTS idx_categories_updated_at ON public.categories (updated_at);
CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON public.customers (updated_at);
CREATE INDEX IF NOT EXISTS idx_suppliers_updated_at ON public.suppliers (updated_at);
CREATE INDEX IF NOT EXISTS idx_inventory_updated_at ON public.inventory (updated_at);
CREATE INDEX IF NOT EXISTS idx_purchases_updated_at ON public.purchases (updated_at);
CREATE INDEX IF NOT EXISTS idx_customer_payments_updated_at ON public.customer_payments (updated_at);
CREATE INDEX IF NOT EXISTS idx_sale_returns_updated_at ON public.sale_returns (updated_at);
CREATE INDEX IF NOT EXISTS idx_credit_payouts_updated_at ON public.credit_payouts (updated_at);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_updated_at ON public.warranty_claims (updated_at);
CREATE INDEX IF NOT EXISTS idx_cash_adjustments_created_at ON public.cash_adjustments (created_at);