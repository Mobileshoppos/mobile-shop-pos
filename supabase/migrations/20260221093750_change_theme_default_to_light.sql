-- Profiles table mein theme_mode ka default 'dark' se badal kar 'light' kar rahe hain
ALTER TABLE public.profiles 
ALTER COLUMN theme_mode SET DEFAULT 'light'::text;