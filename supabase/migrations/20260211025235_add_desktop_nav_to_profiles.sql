-- Profiles table mein desktop navigation shortcuts ke liye column add karna
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS desktop_nav_items JSONB;

-- Aik choti si wazahat (Comment)
COMMENT ON COLUMN public.profiles.desktop_nav_items IS 'Stores the user selected shortcuts for the desktop floating navigation bar.';