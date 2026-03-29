ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS staff_discount_limit NUMERIC DEFAULT 10;