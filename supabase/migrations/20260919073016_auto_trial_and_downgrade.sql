-- ============================================================================
-- 1. handle_new_user: Naye User ke Signup par 30-Day Scale Trial dena
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_register_id uuid := gen_random_uuid();
  v_session_id uuid := gen_random_uuid();
  v_bank_id uuid := gen_random_uuid(); -- NAYA IZAFA: Bank ki ID
  v_warehouse_id uuid := gen_random_uuid(); -- NAYA IZAFA: Warehouse ki ID
BEGIN
  -- 1. User ki Profile banayein (Google OAuth aur Email dono ke metadata ko support karein + Scale Plan 30-Day Free Trial)
  INSERT INTO public.profiles (user_id, full_name, subscription_tier, subscription_expires_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Shop Owner'),
    'scale',
    (now() + interval '30 days')
  );
  
  -- 2. Default Counter banayein
  INSERT INTO public.registers (id, user_id, name, type, status)
  VALUES (v_register_id, NEW.id, 'Main Counter', 'counter', 'open');

  -- 3. Us counter ki pehli shift (session) khud ba khud shuru kar dein (0 cash ke sath)
  INSERT INTO public.register_sessions (id, user_id, register_id, opened_at, opening_balance)
  VALUES (v_session_id, NEW.id, v_register_id, now(), 0);

  -- 4. Default Bank banayein (NAYA IZAFA - Bilkul Counter ki tarah)
  INSERT INTO public.payment_accounts (id, local_id, user_id, name, type, opening_balance, is_default, is_active)
  VALUES (v_bank_id, v_bank_id, NEW.id, 'Main Bank', 'Bank', 0, true, true);

  -- 5. Default Warehouse banayein (NAYA IZAFA - Main Shop Location)
  INSERT INTO public.warehouses (id, local_id, user_id, name, is_default, created_at, updated_at)
  VALUES (v_warehouse_id, v_warehouse_id, NEW.id, 'Main Shop', true, now(), now());

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "supabase_auth_admin";


-- ============================================================================
-- 2. auto_downgrade_expired_subscriptions: Expired Accounts ko Free par shift karna
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."auto_downgrade_expired_subscriptions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.profiles
    SET subscription_tier = 'free',
        subscription_expires_at = NULL,
        updated_at = now()
    WHERE subscription_expires_at IS NOT NULL
      AND subscription_expires_at < now()
      AND subscription_tier != 'free';
END;
$$;

ALTER FUNCTION "public"."auto_downgrade_expired_subscriptions"() OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."auto_downgrade_expired_subscriptions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_downgrade_expired_subscriptions"() TO "service_role";
GRANT ALL ON FUNCTION "public"."auto_downgrade_expired_subscriptions"() TO "supabase_auth_admin";


-- ============================================================================
-- 3. pg_cron Scheduled Job: Har ghantay background mein auto-downgrade run karna
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto_downgrade_expired_subscriptions_job') THEN
        PERFORM cron.unschedule('auto_downgrade_expired_subscriptions_job');
    END IF;
END $$;

SELECT cron.schedule(
    'auto_downgrade_expired_subscriptions_job',
    '0 * * * *',
    $$SELECT public.auto_downgrade_expired_subscriptions();$$
);