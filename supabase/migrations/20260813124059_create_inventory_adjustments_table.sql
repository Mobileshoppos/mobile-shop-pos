CREATE TABLE public.inventory_adjustments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    local_id uuid,
    inventory_id uuid REFERENCES public.inventory(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    adjustment_type text NOT NULL, -- 'Damaged', 'Expired', 'Lost', 'Restored'
    quantity integer NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- Hifazat (Security) ke rules
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own adjustments" 
ON public.inventory_adjustments 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);