-- 1. Ek naya function jo inventory ki limit check karega
CREATE OR REPLACE FUNCTION public.check_user_inventory_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_name TEXT;
    v_current_stock_count INT;
BEGIN
    -- User ka mojooda plan pata karein (Profiles table se)
    SELECT subscription_tier INTO v_plan_name 
    FROM public.profiles 
    WHERE user_id = auth.uid();

    -- AGAR PLAN 'PRO' HAI: To koi rok tok nahi, agay barhne dein
    IF v_plan_name = 'pro' THEN
        RETURN NEW;
    END IF;

    -- AGAR PLAN 'FREE' HAI: To ginti check karein
    IF v_plan_name = 'free' THEN
        -- Sirf wo items ginein jo abhi dukan mein majood hain (Available)
        SELECT COUNT(*) INTO v_current_stock_count 
        FROM public.inventory 
        WHERE user_id = auth.uid() AND status = 'Available';

        -- Agar ginti 50 ya us se zyada hai, to error bhej dein
        IF v_current_stock_count >= 50 THEN
            RAISE EXCEPTION 'Subscription Limit: Free plan is limited to 50 items. Please upgrade to Pro to add more stock.';
        END IF;
    END IF;

    -- Note for Future: Agar koi naya plan (e.g. 'silver') aaye, to bas yahan ek aur IF block add karna hoga.

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Is function ko Inventory table par lagana (Tala Lagana)
-- Jab bhi koi naya item dalke save karne ki koshish karega, ye trigger chalega
CREATE TRIGGER trg_check_inventory_limit
BEFORE INSERT ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.check_user_inventory_limit();