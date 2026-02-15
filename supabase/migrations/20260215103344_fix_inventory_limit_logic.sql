-- Purane trigger ko hatana taake naya logic lag sake
DROP TRIGGER IF EXISTS trg_check_inventory_limit ON public.inventory;

-- Function ko update karna (Ab ye COUNT ki jagah SUM karega)
CREATE OR REPLACE FUNCTION public.check_user_inventory_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_name TEXT;
    v_total_stock_quantity INT;
    v_incoming_quantity INT;
BEGIN
    -- 1. User ka plan check karein
    SELECT subscription_tier INTO v_plan_name 
    FROM public.profiles 
    WHERE user_id = auth.uid();

    IF v_plan_name = 'pro' THEN
        RETURN NEW;
    END IF;

    -- 2. Naye aane wale item ki quantity kitni hai?
    v_incoming_quantity := COALESCE(NEW.available_qty, 1);

    -- 3. Mojooda tamam items ki quantity ko jama (SUM) karein
    SELECT COALESCE(SUM(available_qty), 0) INTO v_total_stock_quantity 
    FROM public.inventory 
    WHERE user_id = auth.uid() AND status = 'Available';

    -- 4. Faisla: Mojooda stock + Naya stock agar 50 se upar jaye to roko
    IF (v_total_stock_quantity + v_incoming_quantity) > 50 THEN
        RAISE EXCEPTION 'Subscription Limit: Your current stock (%) plus new items (%) exceeds the 50-item limit of the Free Plan. Please upgrade to Pro.', v_total_stock_quantity, v_incoming_quantity;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger ko dobara lagana
CREATE TRIGGER trg_check_inventory_limit
BEFORE INSERT ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.check_user_inventory_limit();