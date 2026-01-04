-- 1. Purane views ko khatam karein
DROP VIEW IF EXISTS public.customers_with_balance;
DROP VIEW IF EXISTS public.suppliers_with_balance;

-- 2. Naya customers_with_balance (Columns ko wazeh likha gaya hai taake balance double na ho)
CREATE VIEW public.customers_with_balance AS
SELECT 
    c.id, 
    c.name, 
    c.phone_number, 
    c.address, 
    c.user_id, 
    c.local_id, 
    c.created_at, 
    c.updated_at, -- Delta Sync ke liye zaroori
    ((COALESCE(sales_total.total_udhaar, (0)::double precision) + (COALESCE(payouts_debit.total_payout, (0)::numeric))::double precision) - COALESCE(payments_total.total_wusooli, (0)::double precision)) AS balance
FROM public.customers c
LEFT JOIN ( 
    SELECT sales.customer_id, sales.user_id,
    sum((sales.total_amount - (sales.amount_paid_at_sale)::double precision)) AS total_udhaar
    FROM public.sales GROUP BY sales.customer_id, sales.user_id
) sales_total ON c.id = sales_total.customer_id AND c.user_id = sales_total.user_id
LEFT JOIN ( 
    SELECT customer_payments.customer_id, customer_payments.user_id,
    sum(abs(customer_payments.amount_paid)) AS total_wusooli
    FROM public.customer_payments GROUP BY customer_payments.customer_id, customer_payments.user_id
) payments_total ON c.id = payments_total.customer_id AND c.user_id = payments_total.user_id
LEFT JOIN ( 
    SELECT credit_payouts.customer_id, credit_payouts.user_id,
    sum(credit_payouts.amount_paid) AS total_payout
    FROM public.credit_payouts GROUP BY credit_payouts.customer_id, credit_payouts.user_id
) payouts_debit ON c.id = payouts_debit.customer_id AND c.user_id = payouts_debit.user_id;

-- 3. Naya suppliers_with_balance
CREATE VIEW public.suppliers_with_balance AS
SELECT 
    s.id, 
    s.name, 
    s.contact_person, 
    s.phone, 
    s.address, 
    s.created_at, 
    s.credit_balance, 
    s.user_id, 
    s.local_id, 
    s.updated_at, -- Delta Sync ke liye zaroori
    COALESCE(sum(p.balance_due), (0)::numeric) AS balance_due
FROM public.suppliers s
LEFT JOIN public.purchases p ON s.id = p.supplier_id
GROUP BY s.id, s.name, s.contact_person, s.phone, s.address, s.created_at, s.credit_balance, s.user_id, s.local_id, s.updated_at
ORDER BY s.name;