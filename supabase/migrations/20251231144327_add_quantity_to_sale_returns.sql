-- 1. Sale Return Items mein quantity column add karein
ALTER TABLE public.sale_return_items 
ADD COLUMN IF NOT EXISTS quantity int4 DEFAULT 1;

-- 2. Purana data update karein
UPDATE public.sale_return_items SET quantity = 1 WHERE quantity IS NULL;