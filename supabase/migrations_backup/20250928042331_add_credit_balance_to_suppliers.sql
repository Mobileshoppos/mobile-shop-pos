-- supabase/migrations/20250928042331_add_credit_balance_to_suppliers.sql

-- Step 1: Add a new column to the suppliers table to store their credit balance
ALTER TABLE public.suppliers
ADD COLUMN credit_balance numeric NOT NULL DEFAULT 0 CHECK (credit_balance >= 0);

-- Step 2: Add a comment to explain the new column's purpose
COMMENT ON COLUMN public.suppliers.credit_balance IS 'Stores the advance payment or credit amount a supplier owes to us.';