-- Naya column add karna 3 options ke sath aur default 'dark' rakhna
ALTER TABLE public.profiles 
ADD COLUMN theme_mode TEXT DEFAULT 'dark' CHECK (theme_mode IN ('light', 'dark', 'system'));