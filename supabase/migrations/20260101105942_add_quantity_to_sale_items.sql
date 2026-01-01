-- Sale Items table mein quantity column add karein taake bulk sales track ho sakein
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS quantity int4 DEFAULT 1;

-- Purana data update karein (taake purani sales 1 qty par rahein)
UPDATE public.sale_items SET quantity = 1 WHERE quantity IS NULL;

-- Aik aur choti si touching: sale_items mein product_name_snapshot ka column bhi confirm kar lein
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS product_name_snapshot text;