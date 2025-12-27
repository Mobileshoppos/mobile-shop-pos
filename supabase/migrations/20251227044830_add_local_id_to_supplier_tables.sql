ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS local_id UUID UNIQUE;
ALTER TABLE public.supplier_refunds ADD COLUMN IF NOT EXISTS local_id UUID UNIQUE;