ALTER TABLE public.cash_adjustments ADD COLUMN IF NOT EXISTS local_id UUID UNIQUE;
ALTER TABLE public.daily_closings ADD COLUMN IF NOT EXISTS local_id UUID UNIQUE;