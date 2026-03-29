ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS quotation_validity_days INT DEFAULT 3;