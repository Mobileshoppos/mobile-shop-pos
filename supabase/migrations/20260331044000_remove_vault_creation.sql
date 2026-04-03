CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- 1. User ki Profile banayein (Purana kaam)
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  
  -- 2. User ke liye aik Default Counter banayein
  INSERT INTO public.registers (id, user_id, name, type, status)
  VALUES (gen_random_uuid(), NEW.id, 'Main Counter', 'counter', 'closed');

  -- Tijori (Vault) banane wala code yahan se khatam kar diya gaya hai.

  RETURN NEW;
END;
$$;