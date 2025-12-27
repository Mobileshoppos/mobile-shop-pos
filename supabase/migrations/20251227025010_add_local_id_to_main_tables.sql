-- Sab se ahem tables mein local_id ka column add karna
-- UNIQUE ka matlab hai ke Supabase khud duplicates ko rokega

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS local_id UUID UNIQUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS local_id UUID UNIQUE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS local_id UUID UNIQUE;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS local_id UUID UNIQUE;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS local_id UUID UNIQUE;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS local_id UUID UNIQUE;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS local_id UUID UNIQUE;
ALTER TABLE public.customer_payments ADD COLUMN IF NOT EXISTS local_id UUID UNIQUE;