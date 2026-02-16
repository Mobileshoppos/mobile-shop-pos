-- 1. Naye users ke liye tamam extra features ko default par disable (false) karein
ALTER TABLE public.profiles ALTER COLUMN receipt_format SET DEFAULT 'none';
ALTER TABLE public.profiles ALTER COLUMN qr_code_enabled SET DEFAULT false;
ALTER TABLE public.profiles ALTER COLUMN warranty_system_enabled SET DEFAULT false;
ALTER TABLE public.profiles ALTER COLUMN pos_discount_enabled SET DEFAULT false;

-- 2. Receipt format ki pabandi (constraint) dobara check karein (Safe side ke liye)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_receipt_format_check;
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_receipt_format_check 
CHECK (receipt_format IN ('pdf', 'thermal', 'none'));