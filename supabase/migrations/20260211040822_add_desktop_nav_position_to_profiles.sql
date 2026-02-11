-- Profiles table mein desktop navigation position ke liye column add karna
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS desktop_nav_position TEXT DEFAULT 'bottom';

-- Aik choti si wazahat (Comment)
COMMENT ON COLUMN public.profiles.desktop_nav_position IS 'Stores the position of the desktop floating navigation bar (bottom, left, right).';