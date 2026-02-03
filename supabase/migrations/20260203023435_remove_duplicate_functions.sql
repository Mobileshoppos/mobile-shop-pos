-- 1. Purana 'create_new_purchase' delete karein (Jis mein invoice_id nahi tha)
-- Note: Hum parameters ki types bata rahe hain taake sirf purana wala delete ho
DROP FUNCTION IF EXISTS public.create_new_purchase(uuid, uuid, text, jsonb);

-- 2. Purana 'update_purchase_inventory' delete karein (Jis mein invoice_id nahi tha)
DROP FUNCTION IF EXISTS public.update_purchase_inventory(uuid, uuid, text, numeric, jsonb, uuid);