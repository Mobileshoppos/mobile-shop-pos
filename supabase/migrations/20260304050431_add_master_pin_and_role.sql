-- Profiles table mein Master PIN aur Role ka izafa
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS master_pin text,
ADD COLUMN IF NOT EXISTS role text DEFAULT 'owner';

-- Security: Owner ko allow karein ke wo apna PIN dekh sake/update kar sake
-- (RLS Policies hum baad mein mazeed sakht karenge, filhal yeh kafi hai)