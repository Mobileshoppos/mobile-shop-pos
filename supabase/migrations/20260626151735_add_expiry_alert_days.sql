-- Profiles table mein 'Expiry Alert Days' ki setting add karna (Default 30 din)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS expiry_alert_days INT DEFAULT 30;