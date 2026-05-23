-- Counters (Registers) Limit (max_counters: Free 1, Growth 3, Pro 10)
CREATE OR REPLACE FUNCTION "public"."check_register_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_plan TEXT; v_total INT; v_limit INT;
BEGIN
    SELECT subscription_tier INTO v_plan FROM public.profiles WHERE user_id = auth.uid();
    
    IF v_plan = 'pro' THEN v_limit := 10;
    ELSIF v_plan = 'growth' THEN v_limit := 3;
    ELSE v_limit := 1; END IF;

    SELECT COUNT(*) INTO v_total FROM public.registers WHERE user_id = auth.uid();

    IF v_total >= v_limit THEN
        RAISE EXCEPTION 'Counter Limit Reached: Your % plan allows % counters.', COALESCE(v_plan, 'free'), v_limit;
    END IF;
    RETURN NEW;
END; $$;

-- Trigger lagana
DROP TRIGGER IF EXISTS "trg_check_register_limit" ON "public"."registers";
CREATE TRIGGER "trg_check_register_limit" BEFORE INSERT ON "public"."registers" FOR EACH ROW EXECUTE FUNCTION "public"."check_register_limit"();