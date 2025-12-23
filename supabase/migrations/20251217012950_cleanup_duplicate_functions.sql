-- Hum purane (Integer wale) functions delete kar rahe hain jo ab use nahi ho rahe.
-- Hum sirf BigInt wale functions rakhna chahte hain.

-- 1. Refund ka purana function delete karein
DROP FUNCTION IF EXISTS public.record_supplier_refund(integer, numeric, date, text, text);

-- 2. Payment ka purana function (agar majood hai) delete karein
DROP FUNCTION IF EXISTS public.record_supplier_payment(integer, bigint, numeric, date, text, text);

-- 3. Bulk Payment ka purana function (agar majood hai) delete karein
DROP FUNCTION IF EXISTS public.record_bulk_supplier_payment(integer, numeric, text, date, text);