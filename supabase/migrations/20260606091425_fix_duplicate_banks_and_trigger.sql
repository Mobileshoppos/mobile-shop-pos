-- 1. KACHRA SAFAI: Har user ke paas sirf ek 'Main Bank' chhor kar baqi sab duplicate delete kar dein
DELETE FROM public.payment_accounts
WHERE id NOT IN (
  SELECT (MIN(id::text))::uuid
  FROM public.payment_accounts
  WHERE name = 'Main Bank'
  GROUP BY user_id
) AND name = 'Main Bank';

-- 2. PROFESSIONAL TRIGGER UPDATE: Ab server khud naye user ke liye Main Bank banayega
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_register_id uuid := gen_random_uuid();
  v_session_id uuid := gen_random_uuid();
  v_bank_id uuid := gen_random_uuid(); -- NAYA IZAFA: Bank ki ID
BEGIN
  -- 1. User ki Profile banayein
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  
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