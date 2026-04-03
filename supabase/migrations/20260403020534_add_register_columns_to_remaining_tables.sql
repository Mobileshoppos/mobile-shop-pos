-- 1. credit_payouts table ko update karein
ALTER TABLE public.credit_payouts 
ADD COLUMN IF NOT EXISTS register_id uuid REFERENCES public.registers(id),
ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.register_sessions(id);

-- 2. supplier_refunds table ko update karein
ALTER TABLE public.supplier_refunds 
ADD COLUMN IF NOT EXISTS register_id uuid REFERENCES public.registers(id),
ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.register_sessions(id);

-- Indexes (Taake reports fast chalein)
CREATE INDEX IF NOT EXISTS idx_credit_payouts_register_id ON public.credit_payouts(register_id);
CREATE INDEX IF NOT EXISTS idx_credit_payouts_session_id ON public.credit_payouts(session_id);
CREATE INDEX IF NOT EXISTS idx_supplier_refunds_register_id ON public.supplier_refunds(register_id);
CREATE INDEX IF NOT EXISTS idx_supplier_refunds_session_id ON public.supplier_refunds(session_id);