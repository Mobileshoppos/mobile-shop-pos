-- ============================================================================
-- Migration: Update Subscription Plan Limits for Staff & Registers (Counters)
-- Target Environment: Test Project (development-db) -> Live (mobile-shop-pos)
-- ============================================================================
-- Updated Limits:
-- Free Plan   : max_staff = 0, max_counters = 1
-- Growth Plan : max_staff = 1, max_counters = 1
-- Pro Plan    : max_staff = 2, max_counters = 3
-- Scale Plan  : max_staff = 4, max_counters = 10
-- ============================================================================

-- 1. Update Staff Limit Check Function
CREATE OR REPLACE FUNCTION check_staff_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_plan text;
    v_staff_count integer;
    v_max_staff integer;
    v_user_id uuid;
BEGIN
    -- Identify target user_id
    v_user_id := NEW.user_id;

    -- Fetch user's subscription plan tier
    SELECT COALESCE(subscription_tier, plan_tier, 'free') INTO v_plan
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

-- 2. Update Register/Counter Limit Check Function
CREATE OR REPLACE FUNCTION check_register_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_plan text;
    v_register_count integer;
    v_max_registers integer;
    v_user_id uuid;
BEGIN
    -- Identify target user_id
    v_user_id := NEW.user_id;

    -- Fetch user's subscription plan tier
    SELECT COALESCE(subscription_tier, plan_tier, 'free') INTO v_plan
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