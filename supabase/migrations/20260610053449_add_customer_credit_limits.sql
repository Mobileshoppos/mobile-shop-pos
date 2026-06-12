-- 1. Profiles table mein feature ko ON/OFF karne ke liye column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS enable_customer_credit_limits boolean DEFAULT false;

-- 2. Customers table mein udhaar ki hadd (limit) set karne ke liye column
-- Default NULL rakha hai taake purane customers ka udhaar block na ho (NULL = Unlimited)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_limit numeric DEFAULT NULL;