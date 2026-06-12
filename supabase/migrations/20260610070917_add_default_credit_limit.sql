-- Profiles table mein default limit save karne ke liye
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_credit_limit numeric DEFAULT 0;