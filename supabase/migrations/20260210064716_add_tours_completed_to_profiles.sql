-- Profiles table mein tours_completed column add karna
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tours_completed JSONB DEFAULT '{}'::jsonb;

-- Is column ko update karne ki ijazat dena (RLS pehle se enable hai, bas column add ho raha hai)
COMMENT ON COLUMN public.profiles.tours_completed IS 'Stores which page tours the user has completed, e.g., {"dashboard": true}';