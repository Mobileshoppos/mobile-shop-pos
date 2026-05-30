-- Dobara se is email wale account ko Super Admin ka darja (status) dena
UPDATE public.profiles 
SET is_super_admin = true 
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'shopzamzamhvac@gmail.com'
);