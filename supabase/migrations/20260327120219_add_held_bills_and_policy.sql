-- 1. Profiles table mein Quotation Policy ka column add karein
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS quotation_policy TEXT DEFAULT '1. This is only a price estimate and not a final tax invoice.\n2. Prices are subject to change based on market availability.';

-- 2. Held Bills (Drafts) ke liye naya table banayein
CREATE TABLE IF NOT EXISTS public.held_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    cart JSONB NOT NULL,
    discount NUMERIC DEFAULT 0,
    discount_type TEXT DEFAULT 'Amount',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS Policies (Security)
ALTER TABLE public.held_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own held bills" 
ON public.held_bills FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 4. Local Database (Dexie) ko update karne ke liye version barhana hoga (Hum agle step mein karenge)