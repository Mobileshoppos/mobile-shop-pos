-- Purane 8 parameters wale function ko delete karna taake duplicate khatam ho jaye
DROP FUNCTION IF EXISTS public.record_purchase_payment(uuid, uuid, uuid, numeric, text, text, text, uuid);