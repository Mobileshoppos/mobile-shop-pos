-- Profiles table mein naya column add karna taake pata chale setup ho gaya ya nahi
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_setup_completed BOOLEAN DEFAULT FALSE;