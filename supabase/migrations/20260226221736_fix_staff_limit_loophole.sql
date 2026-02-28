-- 1. Function ko update karna (Isay mazeed smart banaya gaya hai)
CREATE OR REPLACE FUNCTION "public"."check_staff_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_plan_name TEXT;
    v_current_staff_count INT;
    v_limit INT;
BEGIN
    -- Sirf tab check karein jab NAYA insert ho raha ho YA purana staff RESTORE (false se true) ho raha ho
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false) THEN
        
        -- User ka plan check karein
        SELECT subscription_tier INTO v_plan_name 
        FROM public.profiles 
        WHERE user_id = auth.uid();

        -- Limits set karein (Wohi purana code)
        IF v_plan_name = 'pro' THEN
            v_limit := 3;
        ELSIF v_plan_name = 'growth' THEN
            v_limit := 1;
        ELSE
            v_limit := 0; 
        END IF;

        -- Mojooda Active Staff ginein
        SELECT COUNT(*) INTO v_current_staff_count 
        FROM public.staff_members 
        WHERE user_id = auth.uid() AND is_active = true;

        -- Check karein
        IF v_current_staff_count >= v_limit THEN
            RAISE EXCEPTION 'Staff Limit Reached: Your plan (%) allows % staff members. Please upgrade.', v_plan_name, v_limit;
        END IF;
        
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Trigger ko update karna taake woh UPDATE par bhi nazar rakhe
DROP TRIGGER IF EXISTS "trg_check_staff_limit" ON "public"."staff_members";

CREATE TRIGGER "trg_check_staff_limit"
    BEFORE INSERT OR UPDATE ON "public"."staff_members"
    FOR EACH ROW EXECUTE FUNCTION "public"."check_staff_limit"();