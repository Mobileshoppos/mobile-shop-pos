-- 1. Purana record_bulk_supplier_payment (6 arguments wala) khatam karna
DROP FUNCTION IF EXISTS public.record_bulk_supplier_payment(uuid, uuid, numeric, text, text, text);

-- 2. Purana record_purchase_payment (7 arguments wala) khatam karna
DROP FUNCTION IF EXISTS public.record_purchase_payment(uuid, uuid, uuid, numeric, text, text, text);

-- 3. Purana record_supplier_refund (6 arguments wala) khatam karna
DROP FUNCTION IF EXISTS public.record_supplier_refund(uuid, uuid, numeric, text, text, text);