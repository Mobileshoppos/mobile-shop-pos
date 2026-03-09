-- 1. Expenses table mein staff_id add karna
ALTER TABLE public.expenses 
ADD COLUMN staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;

-- 2. Customer Payments (Wusooli) table mein staff_id add karna
ALTER TABLE public.customer_payments 
ADD COLUMN staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;

-- 3. Supplier Payments (Adayigi) table mein staff_id add karna
ALTER TABLE public.supplier_payments 
ADD COLUMN staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;

-- 4. Supplier Refunds (Wapsi) table mein staff_id add karna
ALTER TABLE public.supplier_refunds 
ADD COLUMN staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;

-- 5. Cash Adjustments table mein staff_id add karna
ALTER TABLE public.cash_adjustments 
ADD COLUMN staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;

-- 6. Credit Payouts (Customer Refund) table mein staff_id add karna
ALTER TABLE public.credit_payouts 
ADD COLUMN staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;

-- 7. Daily Closings table mein staff_id add karna
ALTER TABLE public.daily_closings 
ADD COLUMN staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;