-- 1. Purani Default Categories delete karein (Jinka user_id null hai)
-- Inke attributes CASCADE delete ki wajah se khud hi khatam ho jayenge
DELETE FROM public.categories WHERE user_id IS NULL;

-- 2. Purane Functions aur Triggers delete karein (Jinki ab zaroorat nahi)
DROP FUNCTION IF EXISTS public.clone_category_for_user(uuid, bigint);

-- 3. Sync Logic ko mazeed mehfooz banayein
-- Ab hum system ko batayenge ke sirf user ka apna data dikhaye
ALTER POLICY "Allow viewing of own and default categories" ON "public"."categories"
USING (auth.uid() = user_id);

ALTER POLICY "Allow viewing of own and default expense categories" ON "public"."expense_categories"
USING (auth.uid() = user_id);