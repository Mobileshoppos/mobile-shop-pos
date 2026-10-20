-- 1. Pehle agar koi duplicates ban chuke hain, to unhein safai se delete karein (Sirf 1 bachay ga)
DELETE FROM public.warehouses a USING public.warehouses b 
WHERE a.user_id = b.user_id AND a.name = b.name AND a.id > b.id;

DELETE FROM public.payment_accounts a USING public.payment_accounts b 
WHERE a.user_id = b.user_id AND a.name = b.name AND a.id > b.id;

DELETE FROM public.registers a USING public.registers b 
WHERE a.user_id = b.user_id AND a.name = b.name AND a.id > b.id;

-- NAYA IZAFA: Customer Groups ke duplicates saaf karna
DELETE FROM public.customer_groups a USING public.customer_groups b 
WHERE a.user_id = b.user_id AND a.name = b.name AND a.id > b.id;

-- 2. Database par SAKHT ROK (Unique Constraint) lagana taake future mein kabhi duplicate na banay
ALTER TABLE "public"."warehouses" ADD CONSTRAINT "warehouses_user_id_name_key" UNIQUE ("user_id", "name");
ALTER TABLE "public"."payment_accounts" ADD CONSTRAINT "payment_accounts_user_id_name_key" UNIQUE ("user_id", "name");
ALTER TABLE "public"."registers" ADD CONSTRAINT "registers_user_id_name_key" UNIQUE ("user_id", "name");

-- NAYA IZAFA: Customer Groups par rok
ALTER TABLE "public"."customer_groups" ADD CONSTRAINT "customer_groups_user_id_name_key" UNIQUE ("user_id", "name");

-- 3. Naye User ke Trigger ko Smart banana taake wo crash na ho aur check karke data daale
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_register_id uuid;
  v_session_id uuid := gen_random_uuid();
  v_bank_id uuid;
  v_warehouse_id uuid;
BEGIN
  -- 1. Profile
  INSERT INTO public.profiles (user_id, full_name, subscription_tier, subscription_expires_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Shop Owner'), 'scale', (now() + interval '30 days'))
  ON CONFLICT (user_id) DO NOTHING;
  
  -- 2. Default Counter (Check if exists)
  SELECT id INTO v_register_id FROM public.registers WHERE user_id = NEW.id AND name = 'Main Counter';
  IF v_register_id IS NULL THEN
      v_register_id := gen_random_uuid();
      INSERT INTO public.registers (id, user_id, name, type, status) VALUES (v_register_id, NEW.id, 'Main Counter', 'counter', 'open');
      INSERT INTO public.register_sessions (id, user_id, register_id, opened_at, opening_balance) VALUES (v_session_id, NEW.id, v_register_id, now(), 0);
  END IF;

  -- 3. Default Bank (Check if exists)
  SELECT id INTO v_bank_id FROM public.payment_accounts WHERE user_id = NEW.id AND name = 'Main Bank';
  IF v_bank_id IS NULL THEN
      v_bank_id := gen_random_uuid();
      INSERT INTO public.payment_accounts (id, local_id, user_id, name, type, opening_balance, is_default, is_active) VALUES (v_bank_id, v_bank_id, NEW.id, 'Main Bank', 'Bank', 0, true, true);
  END IF;

  -- 4. Default Warehouse (Check if exists)
  SELECT id INTO v_warehouse_id FROM public.warehouses WHERE user_id = NEW.id AND name = 'Main Shop';
  IF v_warehouse_id IS NULL THEN
      v_warehouse_id := gen_random_uuid();
      INSERT INTO public.warehouses (id, local_id, user_id, name, is_default, created_at, updated_at) VALUES (v_warehouse_id, v_warehouse_id, NEW.id, 'Main Shop', true, now(), now());
  END IF;

  -- 5. Default Customer Groups (Check if exists)
  IF NOT EXISTS (SELECT 1 FROM public.customer_groups WHERE user_id = NEW.id AND name = 'Retail / Walk-in') THEN
      INSERT INTO public.customer_groups (id, local_id, user_id, name, pricing_tier, is_default, default_credit_limit)
      VALUES 
        (gen_random_uuid(), gen_random_uuid(), NEW.id, 'Retail / Walk-in', 'retail', true, 0),
        (gen_random_uuid(), gen_random_uuid(), NEW.id, 'Wholesale', 'wholesale', false, 100000),
        (gen_random_uuid(), gen_random_uuid(), NEW.id, 'Distributor', 'distributor', false, 500000);
  END IF;

  RETURN NEW;
END;
$$;