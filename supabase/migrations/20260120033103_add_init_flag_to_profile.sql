-- Profiles table mein flag add karein
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS categories_initialized BOOLEAN DEFAULT FALSE;

-- Mojooda users (aap) ke liye isay true kar dete hain taake mazeed duplicates na banien
UPDATE public.profiles SET categories_initialized = TRUE;