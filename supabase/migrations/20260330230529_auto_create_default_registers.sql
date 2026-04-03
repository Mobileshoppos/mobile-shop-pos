-- Naye users ke liye automatic Main Counter aur Main Safe (Vault) banana
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 1. User ki Profile banayein (Purana kaam)
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  
  -- 2. User ke liye aik Default Counter banayein (Naya kaam)
  INSERT INTO public.registers (id, user_id, name, type, status)
  VALUES (gen_random_uuid(), NEW.id, 'Main Counter', 'counter', 'closed');

  -- 3. User ke liye aik Default Vault (Tijori) banayein (Naya kaam)
  INSERT INTO public.registers (id, user_id, name, type, status)
  VALUES (gen_random_uuid(), NEW.id, 'Main Safe (Tijori)', 'vault', 'closed');

  RETURN NEW;
END;
$$;