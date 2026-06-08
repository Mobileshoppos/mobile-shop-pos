-- Customers table mein naya column add karna
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS customer_group text;

-- View ko update karna taake balance ke sath naya column bhi aaye
DROP VIEW IF EXISTS public.customers_with_balance;
CREATE OR REPLACE VIEW public.customers_with_balance WITH (security_invoker='true') AS
 SELECT c.id,
    c.name,
    c.phone_number,
    c.address,
    c.city,
    c.country,
    c.tax_id,
    c.email,
    c.customer_group, -- <--- NAYA IZAFA
    c.user_id,
    c.local_id,
    c.created_at,
    c.updated_at,
    c.is_active,
    ((COALESCE(sales_total.total_udhaar, (0)::double precision) + (COALESCE(payouts_debit.total_payout, (0)::numeric))::double precision) - COALESCE(payments_total.total_wusooli, (0)::double precision)) AS balance
   FROM (((public.customers c
     LEFT JOIN ( SELECT sales.customer_id,
            sales.user_id,
            sum((sales.total_amount - (sales.amount_paid_at_sale)::double precision)) AS total_udhaar
           FROM public.sales
          GROUP BY sales.customer_id, sales.user_id) sales_total ON ((c.id = sales_total.customer_id)))
     LEFT JOIN ( SELECT customer_payments.customer_id,
            customer_payments.user_id,
            sum(abs(customer_payments.amount_paid)) AS total_wusooli
           FROM public.customer_payments
          GROUP BY customer_payments.customer_id, customer_payments.user_id) payments_total ON ((c.id = payments_total.customer_id)))
     LEFT JOIN ( SELECT credit_payouts.customer_id,
            credit_payouts.user_id,
            sum(credit_payouts.amount_paid) AS total_payout
           FROM public.credit_payouts
          GROUP BY credit_payouts.customer_id, credit_payouts.user_id) payouts_debit ON ((c.id = payouts_debit.customer_id)));