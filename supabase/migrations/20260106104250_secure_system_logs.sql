-- 1. Purani SELECT policy khatam karein
DROP POLICY IF EXISTS "Only authenticated users can view logs" ON public.system_logs;

-- 2. Nayi Policy: User sirf apne logs dekh sakta hai
CREATE POLICY "Users can view their own logs" 
ON public.system_logs FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Nayi Policy: Admin (Aap) sab ke logs dekh sakte hain
-- Hum aap ki email ke zariye aap ko Admin banayenge
CREATE POLICY "Admin can view all logs" 
ON public.system_logs FOR SELECT 
USING (
  auth.jwt() ->> 'email' = 'test1@gmail.com' -- Yahan apni asli email likhein
);