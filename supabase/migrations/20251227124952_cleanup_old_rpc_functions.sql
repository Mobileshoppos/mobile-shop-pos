-- 1. Purana create_new_purchase khatam karein
DROP FUNCTION IF EXISTS public.create_new_purchase(bigint, text, jsonb);

-- 2. Purana record_bulk_supplier_payment khatam karein
DROP FUNCTION IF EXISTS public.record_bulk_supplier_payment(bigint, numeric, text, timestamp with time zone, text);

-- 3. Purana update_purchase_inventory khatam karein
DROP FUNCTION IF EXISTS public.update_purchase_inventory(bigint, bigint, text, numeric, jsonb);

-- 4. Purana record_purchase_payment khatam karein
DROP FUNCTION IF EXISTS public.record_purchase_payment(integer, integer, numeric, text, date, text);

-- 5. Purana clone_category_for_user khatam karein
DROP FUNCTION IF EXISTS public.clone_category_for_user(bigint);