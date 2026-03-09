-- 1. Purana create_new_purchase (baghair staff_id wala) khatam karna
DROP FUNCTION IF EXISTS public.create_new_purchase(uuid, uuid, text, jsonb, text);

-- 2. Purana update_purchase_inventory (baghair staff_id wala) khatam karna
DROP FUNCTION IF EXISTS public.update_purchase_inventory(uuid, uuid, text, numeric, jsonb, uuid, text);