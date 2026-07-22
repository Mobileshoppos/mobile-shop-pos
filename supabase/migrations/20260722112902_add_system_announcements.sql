-- 1. System Announcements table banayein jahan notifications save honge
CREATE TABLE IF NOT EXISTS public.system_announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- 2. Row Level Security (RLS) ko active karein taake data safe rahe
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Tamam authenticated dukan-dar active announcements ko parh (select) sakein
CREATE POLICY "Allow authenticated users to read active announcements" 
ON public.system_announcements 
FOR SELECT 
TO authenticated 
USING (is_active = true);

-- 4. Policy: Sirf Super Admin announcements ko manage (Insert, Update, Delete) kar sake
CREATE POLICY "Allow super admins to manage announcements" 
ON public.system_announcements 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.is_super_admin = true
  )
);