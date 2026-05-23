CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_register_id uuid := gen_random_uuid();
  v_session_id uuid := gen_random_uuid();
BEGIN
  -- 1. User ki Profile banayein
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  
  -- 2. Default Counter banayein aur usay pehle se 'open' rakhein
  INSERT INTO public.registers (id, user_id, name, type, status)
  VALUES (v_register_id, NEW.id, 'Main Counter', 'counter', 'open');

  -- 3. Us counter ki pehli shift (session) khud ba khud shuru kar dein (0 cash ke sath)
  INSERT INTO public.register_sessions (id, user_id, register_id, opened_at, opening_balance)
  VALUES (v_session_id, NEW.id, v_register_id, now(), 0);

  RETURN NEW;
END;
$$;