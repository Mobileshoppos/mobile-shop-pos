-- 1. Tamam zaroori tables mein 'is_dummy' ka nishan (column) add karna
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN DEFAULT false;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN DEFAULT false;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN DEFAULT false;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN DEFAULT false;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN DEFAULT false;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN DEFAULT false;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN DEFAULT false;

-- 2. Ek safe function banana jo sirf is user ka dummy data delete karega
CREATE OR REPLACE FUNCTION public.clear_dummy_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Sirf wo data delete hoga jis par is_dummy = true hai aur jo is logged-in user ka hai
    DELETE FROM public.sale_items WHERE user_id = auth.uid() AND is_dummy = true;
    DELETE FROM public.sales WHERE user_id = auth.uid() AND is_dummy = true;
    DELETE FROM public.inventory WHERE user_id = auth.uid() AND is_dummy = true;
    DELETE FROM public.product_variants WHERE user_id = auth.uid() AND is_dummy = true;
    DELETE FROM public.products WHERE user_id = auth.uid() AND is_dummy = true;
    DELETE FROM public.purchases WHERE user_id = auth.uid() AND is_dummy = true;
    DELETE FROM public.suppliers WHERE user_id = auth.uid() AND is_dummy = true;
    DELETE FROM public.customers WHERE user_id = auth.uid() AND is_dummy = true;
END;
$$;