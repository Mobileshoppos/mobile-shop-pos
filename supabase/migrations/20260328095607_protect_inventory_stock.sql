-- 1. Pehle mojooda ghalti ko theek karein (Safai)
-- Jahan bhi stock 0 se kam hai, usay 0 kar dein taake qanoon lagaya ja sakay
UPDATE public.inventory 
SET available_qty = 0 
WHERE available_qty < 0;

-- 2. Ab wo sakht qanoon (Constraint) lagayein
-- Ab database mana nahi karega kyunke hum ne minus wala data saaf kar diya hai
ALTER TABLE public.inventory 
ADD CONSTRAINT check_stock_not_negative 
CHECK (available_qty >= 0);