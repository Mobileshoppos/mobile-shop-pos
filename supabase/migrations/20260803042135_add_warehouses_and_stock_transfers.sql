-- 1. Create Warehouses Table
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    local_id UUID DEFAULT gen_random_uuid() UNIQUE
);

-- Enable RLS
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own warehouses"
    ON public.warehouses USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Add warehouse_id to inventory table
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL;

-- 3. Create Stock Transfers Log Table (for internal transfers audit history)
CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    from_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
    to_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    notes TEXT,
    staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    local_id UUID DEFAULT gen_random_uuid() UNIQUE
);

-- Enable RLS
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own stock transfers"
    ON public.stock_transfers USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Auto-create "Main Shop" warehouse for users who don't have one
INSERT INTO public.warehouses (user_id, name, is_default)
SELECT DISTINCT user_id, 'Main Shop', true
FROM public.inventory
WHERE user_id NOT IN (SELECT user_id FROM public.warehouses WHERE is_default = true);

-- 5. Backfill existing inventory without warehouse_id to the default warehouse
UPDATE public.inventory i
SET warehouse_id = w.id
FROM public.warehouses w
WHERE i.user_id = w.user_id
  AND w.is_default = true
  AND i.warehouse_id IS NULL;