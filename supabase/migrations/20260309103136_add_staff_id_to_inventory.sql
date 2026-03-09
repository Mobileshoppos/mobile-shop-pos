-- Inventory table mein staff_id add karna taake adjustments ka pata chale
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;