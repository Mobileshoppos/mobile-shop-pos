-- 1. Sales table mein payment_method add karein
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash';

-- 2. Expenses table mein payment_method add karein
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash';

-- 3. Customer Payments table mein payment_method add karein
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash';

-- 4. Supplier Payments table mein payment_method add karein
ALTER TABLE supplier_payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash';

-- 5. Credit Payouts table mein payment_method add karein
ALTER TABLE credit_payouts ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash';

-- 6. Supplier Refunds table mein payment_method add karein
ALTER TABLE supplier_refunds ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash';