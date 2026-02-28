-- 1. Inventory Limit Function Update (Purana function replace ho raha hai)
-- Is mein hum ne 'Growth' plan ki logic add kar di hai.

CREATE OR REPLACE FUNCTION "public"."check_user_inventory_limit"() 
RETURNS "trigger"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
    v_plan_name TEXT;
    v_total_stock_quantity INT;
    v_incoming_quantity INT;
    v_limit INT;
BEGIN
    -- User ka plan check karein
    SELECT subscription_tier INTO v_plan_name 
    FROM public.profiles 
    WHERE user_id = auth.uid();

    -- Plan ke mutabiq limit set karein (Yeh numbers React config se match hone chahiye)
    IF v_plan_name = 'pro' THEN
        RETURN NEW; -- Pro walon ke liye koi rok tok nahi
    ELSIF v_plan_name = 'growth' THEN
        v_limit := 500;
    ELSE
        v_limit := 50; -- Free plan (Default)
    END IF;

    -- Naye aane wale item ki quantity
    v_incoming_quantity := COALESCE(NEW.available_qty, 1);

    -- Mojooda stock ginein
    SELECT COALESCE(SUM(available_qty), 0) INTO v_total_stock_quantity 
    FROM public.inventory 
    WHERE user_id = auth.uid() AND status = 'Available';

    -- Check karein
    IF (v_total_stock_quantity + v_incoming_quantity) > v_limit THEN
        RAISE EXCEPTION 'Subscription Limit Reached: Your plan (%) allows % items. You currently have %. Please upgrade.', v_plan_name, v_limit, v_total_stock_quantity;
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Staff Limit Function (Yeh Naya Function hai)
-- Yeh check karega ke user kitne staff members add kar sakta hai.

CREATE OR REPLACE FUNCTION "public"."check_staff_limit"() 
RETURNS "trigger"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
    v_plan_name TEXT;
    v_current_staff_count INT;
    v_limit INT;
BEGIN
    -- User ka plan check karein
    SELECT subscription_tier INTO v_plan_name 
    FROM public.profiles 
    WHERE user_id = auth.uid();

    -- Limits set karein
    IF v_plan_name = 'pro' THEN
        v_limit := 3;
    ELSIF v_plan_name = 'growth' THEN
        v_limit := 1;
    ELSE
        v_limit := 0; -- Free plan mein 0 staff allowed
    END IF;

    -- Mojooda Active Staff ginein
    SELECT COUNT(*) INTO v_current_staff_count 
    FROM public.staff_members 
    WHERE user_id = auth.uid() AND is_active = true;

    -- Check karein (Note: >= lagaya hai kyunke abhi naya insert hone wala hai)
    IF v_current_staff_count >= v_limit THEN
        RAISE EXCEPTION 'Staff Limit Reached: Your plan (%) allows % staff members. Please upgrade.', v_plan_name, v_limit;
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Staff Trigger Lagana
-- Agar pehle se trigger majood hai to drop karke dubara lagayenge taake error na aye.
DROP TRIGGER IF EXISTS "trg_check_staff_limit" ON "public"."staff_members";

CREATE TRIGGER "trg_check_staff_limit"
BEFORE INSERT ON "public"."staff_members"
FOR EACH ROW EXECUTE FUNCTION "public"."check_staff_limit"();