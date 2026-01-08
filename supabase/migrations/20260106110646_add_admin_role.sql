-- 1. Profiles table mein is_admin ka column shamil karein
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Purani email wali policies khatam karein
DROP POLICY IF EXISTS "Admin can view all logs" ON public.system_logs;

-- 3. Nayi Professional Policy: Jo admin hai wo sab dekh sakta hai
CREATE POLICY "Admin can view all logs" 
ON public.system_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = TRUE
  )
);