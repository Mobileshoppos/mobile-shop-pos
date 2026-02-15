-- In purane functions ko khatam kiya ja raha hai kyunke in mein security checks nahi hain
-- Aur in ke naye mehfooz versions (without 'old_' prefix) pehle se mojud hain.

DROP FUNCTION IF EXISTS "public"."old_process_purchase_return"(bigint, bigint[], date, text);
DROP FUNCTION IF EXISTS "public"."old_record_supplier_refund"(bigint, numeric, date, text, text);
DROP FUNCTION IF EXISTS "public"."old_v1_process_purchase_return"(uuid, jsonb, date, text);