-- Naye aane wale users ke liye default 5 kar diya
ALTER TABLE public.profiles ALTER COLUMN price_drop_limit SET DEFAULT 5;

-- Jinka pehle se 100 set ho gaya tha, unka bhi 5 kar diya
UPDATE public.profiles SET price_drop_limit = 5 WHERE price_drop_limit = 100;