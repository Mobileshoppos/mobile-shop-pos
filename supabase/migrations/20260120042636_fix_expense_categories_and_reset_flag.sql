-- 1. Aik "Smart Loop" jo har user ke data ko safe tareeqe se handle karega
DO $$
DECLARE
    user_rec RECORD;
    target_cat_id BIGINT;
BEGIN
    -- Un tamam users ki list nikalen jin ke kharche Default categories se juray hain
    FOR user_rec IN 
        SELECT DISTINCT user_id 
        FROM public.expenses 
        WHERE category_id IN (SELECT id FROM public.expense_categories WHERE user_id IS NULL)
    LOOP
        -- A. Check karein ke kya is user ke paas pehle se 'Others' naam ki category hai?
        SELECT id INTO target_cat_id 
        FROM public.expense_categories 
        WHERE user_id = user_rec.user_id AND name = 'Others' 
        LIMIT 1;

        -- B. Agar 'Others' nahi mili, to naye sirey se bana dein (taake NOT-NULL rule pura ho)
        IF target_cat_id IS NULL THEN
            INSERT INTO public.expense_categories (name, user_id, local_id)
            VALUES ('Others', user_rec.user_id, gen_random_uuid())
            RETURNING id INTO target_cat_id;
        END IF;

        -- C. Ab is user ke tamam purane kharchon ko is nayi 'Others' category mein bhej dein
        UPDATE public.expenses 
        SET category_id = target_cat_id 
        WHERE user_id = user_rec.user_id 
        AND category_id IN (SELECT id FROM public.expense_categories WHERE user_id IS NULL);
    END LOOP;
END $$;

-- 2. Ab jab koi kharcha Default categories se nahi jura, to unhein delete kar dein
DELETE FROM public.expense_categories WHERE user_id IS NULL;

-- 3. Flag Reset Logic: Un users ka flag reset karein jin ke paas abhi apni categories nahi hain
UPDATE public.profiles 
SET categories_initialized = FALSE 
WHERE user_id NOT IN (
    SELECT DISTINCT user_id FROM public.expense_categories WHERE user_id IS NOT NULL
);