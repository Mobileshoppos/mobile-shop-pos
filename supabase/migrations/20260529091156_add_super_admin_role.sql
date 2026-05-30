-- 1. Profiles table mein ek naya column add karna jo batayega ke yeh Super Admin hai ya nahi
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

-- 2. Aapke account ko Super Admin banana (Aapki email ke zariye)
-- Note: Jab aap login karenge, to system check karega ke kya aap Super Admin hain.
UPDATE public.profiles 
SET is_super_admin = true 
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'shopzamzamhvac@gmail.com'
);