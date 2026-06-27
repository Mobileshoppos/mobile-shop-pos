-- Profiles table mein 'Block Expired Sales' ki setting add karna
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS block_expired_sales BOOLEAN DEFAULT false;