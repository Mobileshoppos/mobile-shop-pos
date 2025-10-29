-- Step 1: Naya table banayein jahan hum customer ko ki gayi adaigi ka record rakhenge.
CREATE TABLE public.credit_payouts (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    customer_id BIGINT NOT NULL REFERENCES public.customers(id),
    amount_paid NUMERIC NOT NULL CHECK (amount_paid > 0),
    remarks TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: Is naye table ke liye Row Level Security on karein.
ALTER TABLE public.credit_payouts ENABLE ROW LEVEL SECURITY;

-- Step 3: Security policy lagayein taake har user sirf apne hi payouts dekh aur bana sake.
CREATE POLICY "Allow users to manage their own credit payouts"
ON public.credit_payouts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);