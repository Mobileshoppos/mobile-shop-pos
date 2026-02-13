-- 1. Purana sakht qanoon (Constraint) khatam karein
ALTER TABLE public.supplier_payments 
DROP CONSTRAINT IF EXISTS supplier_payments_payment_method_check;

-- 2. Naya qanoon banayein jo 'Bank' aur 'Bank Transfer' dono ko qabool kare
ALTER TABLE public.supplier_payments 
ADD CONSTRAINT supplier_payments_payment_method_check 
CHECK (payment_method = ANY (ARRAY['Cash'::text, 'Bank'::text, 'Bank Transfer'::text, 'Cheque'::text, 'Other'::text]));