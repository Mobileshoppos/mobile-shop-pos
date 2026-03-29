ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS reprint_button_enabled BOOLEAN DEFAULT TRUE;