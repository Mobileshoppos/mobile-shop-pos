-- 1. Inventory Items Limit Guard
CREATE OR REPLACE FUNCTION "public"."check_user_inventory_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_plan TEXT; v_current INT; v_limit INT;
BEGIN
    SELECT subscription_tier INTO v_plan FROM public.profiles WHERE user_id = auth.uid();
    
    IF v_plan = 'scale' THEN v_limit := 50000;
    ELSIF v_plan = 'pro' THEN v_limit := 15000;
    ELSIF v_plan = 'growth' THEN v_limit := 2500;
    ELSE v_limit := 200; END IF;

    SELECT COALESCE(SUM(available_qty), 0) INTO v_current FROM public.inventory 
    WHERE user_id = auth.uid() AND status = 'Available';

    IF (v_current + COALESCE(NEW.available_qty, 1)) > v_limit THEN
        RAISE EXCEPTION 'Stock Limit Reached: Your % plan allows % available items.', v_plan, v_limit;
    END IF;
    RETURN NEW;
END; $$;

-- 2. Product Models Limit Guard
CREATE OR REPLACE FUNCTION "public"."check_model_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_plan TEXT; v_total INT; v_limit INT;
BEGIN
    SELECT subscription_tier INTO v_plan FROM public.profiles WHERE user_id = auth.uid();
    
    IF v_plan = 'scale' THEN v_limit := 1000;
    ELSIF v_plan = 'pro' THEN v_limit := 300;
    ELSIF v_plan = 'growth' THEN v_limit := 100;
    ELSE v_limit := 20; END IF;

    SELECT COUNT(*) INTO v_total FROM public.products WHERE user_id = auth.uid();

    IF v_total >= v_limit THEN
        RAISE EXCEPTION 'Product Model Limit Reached: Your % plan allows % models.', v_plan, v_limit;
    END IF;
    RETURN NEW;
END; $$;

-- 3. Customers Limit Guard
CREATE OR REPLACE FUNCTION "public"."check_customer_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_plan TEXT; v_total INT; v_limit INT;
BEGIN
    SELECT subscription_tier INTO v_plan FROM public.profiles WHERE user_id = auth.uid();
    
    IF v_plan = 'scale' THEN v_limit := 5000;
    ELSIF v_plan = 'pro' THEN v_limit := 3000;
    ELSIF v_plan = 'growth' THEN v_limit := 1000;
    ELSE v_limit := 2; END IF;

    SELECT COUNT(*) INTO v_total FROM public.customers WHERE user_id = auth.uid();

    IF v_total >= v_limit THEN
        RAISE EXCEPTION 'Customer Limit Reached: Your % plan allows % total customers.', v_plan, v_limit;
    END IF;
    RETURN NEW;
END; $$;

-- 4. Suppliers Limit Guard
CREATE OR REPLACE FUNCTION "public"."check_supplier_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_plan TEXT; v_total INT; v_limit INT;
BEGIN
    SELECT subscription_tier INTO v_plan FROM public.profiles WHERE user_id = auth.uid();
    
    IF v_plan = 'scale' THEN v_limit := 500;
    ELSIF v_plan = 'pro' THEN v_limit := 100;
    ELSIF v_plan = 'growth' THEN v_limit := 20;
    ELSE v_limit := 2; END IF;

    SELECT COUNT(*) INTO v_total FROM public.suppliers WHERE user_id = auth.uid();

    IF v_total >= v_limit THEN
        RAISE EXCEPTION 'Supplier Limit Reached: Your % plan allows % total suppliers.', v_plan, v_limit;
    END IF;
    RETURN NEW;
END; $$;

-- 5. Staff Limit Guard
CREATE OR REPLACE FUNCTION "public"."check_staff_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_plan TEXT; v_active INT; v_total INT; v_limit INT;
BEGIN
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false) THEN
        SELECT subscription_tier INTO v_plan FROM public.profiles WHERE user_id = auth.uid();
        
        IF v_plan = 'scale' THEN v_limit := 10;
        ELSIF v_plan = 'pro' THEN v_limit := 4;
        ELSIF v_plan = 'growth' THEN v_limit := 1;
        ELSE v_limit := 0; END IF;

        SELECT COUNT(*) INTO v_active FROM public.staff_members WHERE user_id = auth.uid() AND is_active = true;
        SELECT COUNT(*) INTO v_total FROM public.staff_members WHERE user_id = auth.uid();

        IF v_active >= v_limit AND NEW.is_active = true THEN
            RAISE EXCEPTION 'Staff Seats Full: Your % plan allows % active staff.', v_plan, v_limit;
        END IF;

        IF v_total >= 500 THEN
            RAISE EXCEPTION 'Safety Limit: Maximum 500 staff records (including archived) allowed.';
        END IF;
    END IF;
    RETURN NEW;
END; $$;

-- 6. Counters (Registers) Limit Guard
CREATE OR REPLACE FUNCTION "public"."check_register_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_plan TEXT; v_total INT; v_limit INT;
BEGIN
    SELECT subscription_tier INTO v_plan FROM public.profiles WHERE user_id = auth.uid();
    
    IF v_plan = 'scale' THEN v_limit := 10;
    ELSIF v_plan = 'pro' THEN v_limit := 4;
    ELSIF v_plan = 'growth' THEN v_limit := 2;
    ELSE v_limit := 1; END IF;

    SELECT COUNT(*) INTO v_total FROM public.registers WHERE user_id = auth.uid();

    IF v_total >= v_limit THEN
        RAISE EXCEPTION 'Counter Limit Reached: Your % plan allows % counters.', COALESCE(v_plan, 'free'), v_limit;
    END IF;
    RETURN NEW;
END; $$;

-- 7. Warranty System Guard (Growth aur Free par block)
CREATE OR REPLACE FUNCTION "public"."check_warranty_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_plan TEXT; 
    v_total INT; 
    v_limit INT := 1000; -- Global Safety Limit
BEGIN
    SELECT subscription_tier INTO v_plan FROM public.profiles WHERE user_id = auth.uid();
    
    -- Agar Free ya Growth plan hai to sakhti se rok dein (Kyunke in par warranty band hai)
    IF v_plan = 'free' OR v_plan = 'growth' OR v_plan IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Warranty System is not available on your current plan. Please upgrade to Pro or Scale.';
    END IF;

    SELECT COUNT(*) INTO v_total FROM public.warranty_claims WHERE user_id = auth.uid();

    IF v_total >= v_limit THEN
        RAISE EXCEPTION 'Safety Limit Reached: Maximum % warranty claims allowed per account to prevent abuse.', v_limit;
    END IF;

    RETURN NEW;
END;$$;