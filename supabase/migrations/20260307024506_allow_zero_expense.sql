-- Purana check khatam karein jo 0 ko rokta tha
ALTER TABLE public.expenses 
DROP CONSTRAINT IF EXISTS expenses_amount_check;

-- Naya check lagayein jo 0 ya us se zyada (> = 0) ko allow kare
ALTER TABLE public.expenses 
ADD CONSTRAINT expenses_amount_check CHECK (amount >= 0);