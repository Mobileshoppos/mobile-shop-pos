-- =================================================================
-- Migration to ENABLE Row Level Security on all relevant tables.
-- This is the final and most critical step to activate the RLS policies.
-- Without this, all previously created policies are ignored by the database.
-- =================================================================

-- Enable RLS for the 'suppliers' table
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Enable RLS for the 'purchases' table
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Enable RLS for the 'supplier_payments' table
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

-- Enable RLS for the 'purchase_returns' table
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;

-- Enable RLS for the 'purchase_return_items' table
ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;

-- Note: The 'inventory' table likely already has RLS enabled, which is why it was working correctly.
-- This migration ensures all other tables are now also secured.