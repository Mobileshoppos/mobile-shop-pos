-- Products table mein 'is_active' column add karein
-- Default value 'true' hogi taake purane saaray products active rahein
ALTER TABLE public.products 
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Hum index bhi bana dete hain taake filtering teez ho
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);