-- 1. Pehle Function banayein jo limit check karega
CREATE OR REPLACE FUNCTION "public"."check_warranty_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_plan TEXT; 
    v_total INT; 
    v_limit INT := 1000; -- Global Safety Limit for Growth/Pro
BEGIN
    -- User ka plan check karein
    SELECT subscription_tier INTO v_plan FROM public.profiles WHERE user_id = auth.uid();
    
    -- A. Agar Free plan hai to sakhti se rok dein
    IF v_plan = 'free' OR v_plan IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Warranty System is not available on the Free plan. Please upgrade to Growth or Pro.';
    END IF;

    -- B. Agar Growth/Pro hai, to total claims ginein
    SELECT COUNT(*) INTO v_total FROM public.warranty_claims WHERE user_id = auth.uid();

    -- C. Safety Check (Bot/Spam Protection)
    IF v_total >= v_limit THEN
        RAISE EXCEPTION 'Safety Limit Reached: Maximum % warranty claims allowed per account to prevent abuse.', v_limit;
    END IF;

    RETURN NEW;
END;$$;

-- 2. Ab is function ko Trigger ke tor par table par laga dein
CREATE TRIGGER "trg_check_warranty_limit"
    BEFORE INSERT ON "public"."warranty_claims"
    FOR EACH ROW EXECUTE FUNCTION "public"."check_warranty_limit"();