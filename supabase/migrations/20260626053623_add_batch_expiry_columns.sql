-- 1. Profiles table mein settings ka button (Toggle) add karna
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS enable_batch_expiry BOOLEAN DEFAULT false;

-- 2. Inventory table mein Batch aur Expiry ki jagah banana
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS batch_number TEXT,
ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- 3. Sale Items table mein bhi record rakhna (Taake kal ko pata ho kaunsa batch becha tha)
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS batch_number TEXT,
ADD COLUMN IF NOT EXISTS expiry_date DATE;