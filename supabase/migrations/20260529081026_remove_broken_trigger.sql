-- 1. Jo trigger (Robot) humne profiles table par lagaya tha, usay khatam kar do
DROP TRIGGER IF EXISTS on_profile_delete_remove_files ON public.profiles;

-- 2. Jo function (kam) humne us robot ko sikhaya tha, usay bhi database se nikal do
DROP FUNCTION IF EXISTS public.delete_user_storage_files();