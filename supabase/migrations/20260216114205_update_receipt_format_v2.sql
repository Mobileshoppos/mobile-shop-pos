-- 1. Naye users ke liye default value 'none' set karein
ALTER TABLE public.profiles ALTER COLUMN receipt_format SET DEFAULT 'none';

-- 2. Pabandi (Constraint) lagayein taake sirf sahi values save hon
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_receipt_format_check;
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_receipt_format_check 
CHECK (receipt_format IN ('pdf', 'thermal', 'none'));