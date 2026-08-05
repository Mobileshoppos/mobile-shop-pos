-- 1. Signup ke waqt User ka Full Name save karne ki tabdeeli
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_register_id uuid := gen_random_uuid();
  v_session_id uuid := gen_random_uuid();
  v_bank_id uuid := gen_random_uuid(); -- NAYA IZAFA: Bank ki ID
BEGIN
  -- 1. User ki Profile banayein (YAHAN TABDEELI KI GAYI HAI: full_name ko raw_user_meta_data se pakra gaya hai)
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- 2. Default Counter banayein
  INSERT INTO public.registers (id, user_id, name, type, status)
  VALUES (v_register_id, NEW.id, 'Main Counter', 'counter', 'open');

  -- 3. Us counter ki pehli shift (session) khud ba khud shuru kar dein (0 cash ke sath)
  INSERT INTO public.register_sessions (id, user_id, register_id, opened_at, opening_balance)
  VALUES (v_session_id, NEW.id, v_register_id, now(), 0);

  -- 4. Default Bank banayein (NAYA IZAFA - Bilkul Counter ki tarah)
  INSERT INTO public.payment_accounts (id, local_id, user_id, name, type, opening_balance, is_default, is_active)
  VALUES (v_bank_id, v_bank_id, NEW.id, 'Main Bank', 'Bank', 0, true, true);

  RETURN NEW;
END;
$$;


-- 2. Counter banate waqt ghalat column (plan_tier) ko hatane ki tabdeeli
CREATE OR REPLACE FUNCTION "public"."check_register_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_plan text;
    v_register_count integer;
    v_max_registers integer;
    v_user_id uuid;
BEGIN
    -- Identify target user_id
    v_user_id := NEW.user_id;

    -- Fetch user's subscription plan tier (YAHAN TABDEELI KI GAYI HAI: plan_tier hata diya gaya hai)
    SELECT COALESCE(subscription_tier, 'free') INTO v_plan
    FROM profiles
    WHERE id = v_user_id;

    -- Determine maximum counter/register limit based on updated plan tier
    CASE LOWER(COALESCE(v_plan, 'free'))
        WHEN 'growth' THEN v_max_registers := 1;
        WHEN 'pro'    THEN v_max_registers := 3;
        WHEN 'scale'  THEN v_max_registers := 10;
        ELSE               v_max_registers := 1; -- Free Plan (1 Counter)
    END CASE;

    -- Count existing registers/counters for this store
    SELECT COUNT(*) INTO v_register_count
    FROM registers
    WHERE user_id = v_user_id;

    -- Check if adding new register exceeds allowed limit
    IF v_register_count >= v_max_registers THEN
        RAISE EXCEPTION 'Billing counter limit reached for your plan (% max counters allowed). Please upgrade your plan.', v_max_registers;
    END IF;

    RETURN NEW;
END;
$$;


-- 3. Staff banate waqt bhi yahi ghalat column (plan_tier) hatane ki tabdeeli (Safety ke liye)
CREATE OR REPLACE FUNCTION "public"."check_staff_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_plan text;
    v_staff_count integer;
    v_max_staff integer;
    v_user_id uuid;
BEGIN
    -- Identify target user_id
    v_user_id := NEW.user_id;

    -- Fetch user's subscription plan tier (YAHAN TABDEELI KI GAYI HAI: plan_tier hata diya gaya hai)
    SELECT COALESCE(subscription_tier, 'free') INTO v_plan
    FROM profiles
    WHERE id = v_user_id;

    -- Determine maximum staff limit based on updated plan tier
    CASE LOWER(COALESCE(v_plan, 'free'))
        WHEN 'growth' THEN v_max_staff := 1;
        WHEN 'pro'    THEN v_max_staff := 2;
        WHEN 'scale'  THEN v_max_staff := 4;
        ELSE               v_max_staff := 0; -- Free Plan (Owner Only)
    END CASE;

    -- Count existing staff members for this store
    SELECT COUNT(*) INTO v_staff_count
    FROM staff_members
    WHERE user_id = v_user_id;

    -- Check if adding new staff exceeds allowed limit
    IF v_staff_count >= v_max_staff THEN
        RAISE EXCEPTION 'Staff limit reached for your plan (% max staff allowed). Please upgrade your plan.', v_max_staff;
    END IF;

    RETURN NEW;
END;
$$;