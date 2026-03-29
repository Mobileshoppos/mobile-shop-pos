-- 1. Quick Reprint ko default mein OFF karein
ALTER TABLE public.profiles 
ALTER COLUMN reprint_button_enabled SET DEFAULT FALSE;

-- 2. Theme ko default mein DARK karein
ALTER TABLE public.profiles 
ALTER COLUMN theme_mode SET DEFAULT 'dark';