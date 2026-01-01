-- Sale Returns table mein local_id add karein taake sync sahi chale
ALTER TABLE public.sale_returns 
ADD COLUMN IF NOT EXISTS local_id uuid DEFAULT gen_random_uuid();

-- Purani rows ke liye unique local_id generate karein
UPDATE public.sale_returns SET local_id = gen_random_uuid() WHERE local_id IS NULL;