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

  -- 6. Default Customer Groups banayein (NAYA IZAFA - Retail, Wholesale, Distributor)
  INSERT INTO public.customer_groups (id, local_id, user_id, name, pricing_tier, is_default, default_credit_limit)
  VALUES 
    (gen_random_uuid(), gen_random_uuid(), NEW.id, 'Retail / Walk-in', 'retail', true, 0),
    (gen_random_uuid(), gen_random_uuid(), NEW.id, 'Wholesale', 'wholesale', false, 100000),
    (gen_random_uuid(), gen_random_uuid(), NEW.id, 'Distributor', 'distributor', false, 500000);

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "supabase_auth_admin";