-- Add register_id and session_id to sale_returns table
ALTER TABLE public.sale_returns 
ADD COLUMN IF NOT EXISTS register_id uuid REFERENCES public.registers(id),
ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.register_sessions(id);

-- Optional: Index add karna taake reports tez chalein
CREATE INDEX IF NOT EXISTS idx_sale_returns_register_id ON public.sale_returns(register_id);
CREATE INDEX IF NOT EXISTS idx_sale_returns_session_id ON public.sale_returns(session_id);