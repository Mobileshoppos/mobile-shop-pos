-- THE ZERO DISTURBANCE TRICK (Fixing old NULL data for Multi-Counter System)
DO $$
DECLARE
    v_user RECORD;
    v_default_register UUID;
BEGIN
    -- Har dukan (user) ke liye loop chalayen
    FOR v_user IN SELECT DISTINCT id FROM auth.users LOOP
        
        -- Pehle check karein ke kya is user ka koi Counter pehle se hai?
        SELECT id INTO v_default_register FROM public.registers WHERE user_id = v_user.id AND type = 'counter' ORDER BY created_at ASC LIMIT 1;
        
        -- Agar koi bhi counter nahi hai, to aik naya "Main Counter (Auto)" bana dein
        IF v_default_register IS NULL THEN
            v_default_register := gen_random_uuid();
            INSERT INTO public.registers (id, user_id, name, type, status)
            VALUES (v_default_register, v_user.id, 'Main Counter (Auto)', 'counter', 'closed');
        END IF;

        -- Ab purani saari transactions ko is counter ke naam par daal dein jahan register_id khali (NULL) hai
        UPDATE public.sales SET register_id = v_default_register WHERE user_id = v_user.id AND register_id IS NULL;
        UPDATE public.expenses SET register_id = v_default_register WHERE user_id = v_user.id AND register_id IS NULL;
        UPDATE public.cash_adjustments SET register_id = v_default_register WHERE user_id = v_user.id AND register_id IS NULL;
        UPDATE public.customer_payments SET register_id = v_default_register WHERE user_id = v_user.id AND register_id IS NULL;
        UPDATE public.supplier_payments SET register_id = v_default_register WHERE user_id = v_user.id AND register_id IS NULL;
        UPDATE public.supplier_refunds SET register_id = v_default_register WHERE user_id = v_user.id AND register_id IS NULL;
        
    END LOOP;
END;
$$;