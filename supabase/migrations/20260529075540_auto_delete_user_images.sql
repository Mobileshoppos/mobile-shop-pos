-- 1. Ek function (Robot) banana jo Storage se tasveerein delete karega
CREATE OR REPLACE FUNCTION public.delete_user_storage_files()
RETURNS TRIGGER AS $$
BEGIN
  -- storage.objects (Bucket) se wo tamam files delete kar do jin ka malik (owner) yeh delete hone wala user tha
  DELETE FROM storage.objects WHERE owner = OLD.user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Agar pehle se koi purana trigger hai to usay hata do
DROP TRIGGER IF EXISTS on_profile_delete_remove_files ON public.profiles;

-- 3. Is Robot ko 'profiles' table par bitha dena. (Jaise hi user delete hoga, uski profile delete hogi, aur yeh robot chal parega)
CREATE TRIGGER on_profile_delete_remove_files
AFTER DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.delete_user_storage_files();