-- supabase/migrations/20250928110300_prepare_existing_data_for_rls.sql

-- =================================================================
-- This migration prepares existing data for Row Level Security.
-- It adds the user_id column, backfills it for existing rows,
-- and then applies the NOT NULL constraint.
-- =================================================================

-- Function to get the ID of the first authenticated user
-- This is a safe way to assign ownership of existing data in a single-user system.
CREATE OR REPLACE FUNCTION get_first_user_id()
RETURNS uuid AS $$
DECLARE
    first_user_id uuid;
BEGIN
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    RETURN first_user_id;
END;
$$ LANGUAGE plpgsql;

-- Table 1: suppliers
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE public.suppliers SET user_id = get_first_user_id() WHERE user_id IS NULL;
ALTER TABLE public.suppliers ALTER COLUMN user_id SET NOT NULL;

-- Table 2: purchases
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE public.purchases SET user_id = get_first_user_id() WHERE user_id IS NULL;
ALTER TABLE public.purchases ALTER COLUMN user_id SET NOT NULL;

-- Table 3: supplier_payments
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE public.supplier_payments SET user_id = get_first_user_id() WHERE user_id IS NULL;
ALTER TABLE public.supplier_payments ALTER COLUMN user_id SET NOT NULL;

-- Table 4: purchase_returns
ALTER TABLE public.purchase_returns ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE public.purchase_returns SET user_id = get_first_user_id() WHERE user_id IS NULL;
ALTER TABLE public.purchase_returns ALTER COLUMN user_id SET NOT NULL;

-- Table 5: purchase_return_items
ALTER TABLE public.purchase_return_items ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE public.purchase_return_items SET user_id = get_first_user_id() WHERE user_id IS NULL;
ALTER TABLE public.purchase_return_items ALTER COLUMN user_id SET NOT NULL;

-- Clean up the helper function
DROP FUNCTION get_first_user_id;