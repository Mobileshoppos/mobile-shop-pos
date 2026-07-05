-- Profiles table mein timezone ka column add karna
-- Default 'Asia/Karachi' rakha hai taake purane users ka data kharab na ho
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Asia/Karachi';