-- 1. Registers Table (Counters aur Safe)
CREATE TABLE IF NOT EXISTS public.registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('counter', 'vault')),
    status TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Register Sessions Table (Shifts)
CREATE TABLE IF NOT EXISTS public.register_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    register_id UUID REFERENCES public.registers(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    opened_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ,
    opening_balance NUMERIC DEFAULT 0,
    expected_closing NUMERIC DEFAULT 0,
    actual_closing NUMERIC DEFAULT 0,
    difference NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Mojooda Tables mein Columns ka Izafa
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES public.registers(id);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.register_sessions(id);

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES public.registers(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.register_sessions(id);

ALTER TABLE public.customer_payments ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES public.registers(id);
ALTER TABLE public.customer_payments ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.register_sessions(id);

ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES public.registers(id);
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.register_sessions(id);

ALTER TABLE public.cash_adjustments ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES public.registers(id);
ALTER TABLE public.cash_adjustments ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.register_sessions(id);

ALTER TABLE public.supplier_refunds ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES public.registers(id);
ALTER TABLE public.supplier_refunds ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.register_sessions(id);

ALTER TABLE public.held_bills ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES public.registers(id);

-- 4. RLS Policies (Security)
ALTER TABLE public.registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own registers" ON public.registers
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions" ON public.register_sessions
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Auto-Enable RLS for New Tables
