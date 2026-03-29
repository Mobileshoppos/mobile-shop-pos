ALTER TABLE public.held_bills 
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;