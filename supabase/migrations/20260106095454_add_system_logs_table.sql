-- System Logs table jo errors track karega
CREATE TABLE IF NOT EXISTS public.system_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    level TEXT NOT NULL, -- 'error', 'warning', 'info'
    category TEXT NOT NULL, -- 'sync', 'database', 'auth'
    message TEXT NOT NULL,
    details JSONB, -- Pura error object ya stack trace yahan save hoga
    device_info JSONB, -- User kaunsa browser ya mobile use kar raha hai
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies (Taake users sirf apne errors bhej sakein lekin dekh na sakein)
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own logs" 
ON public.system_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only authenticated users can view logs" 
ON public.system_logs FOR SELECT 
USING (auth.role() = 'authenticated');