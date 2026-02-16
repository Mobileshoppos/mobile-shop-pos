-- 1. Desktop Navigation toggle ke liye naya column add karein
ALTER TABLE public.profiles ADD COLUMN desktop_nav_enabled boolean DEFAULT true;

-- 2. Naye users ke liye isay bhi default par disable (false) rakhein
ALTER TABLE public.profiles ALTER COLUMN desktop_nav_enabled SET DEFAULT false;