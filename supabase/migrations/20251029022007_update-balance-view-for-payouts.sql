-- Hum view ko dobara bana rahe hain taake is mein credit payouts ki calculation shamil ho jaye.
CREATE OR REPLACE VIEW public.customers_with_balance
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.name,
  c.phone_number,
  c.address,
  c.user_id,
  -- Formula: (Total Udhaar + Total Payouts) - Total Wusooli
  (COALESCE(sales_total.total_udhaar, 0) + COALESCE(payouts_debit.total_payout, 0)) - COALESCE(payments_total.total_wusooli, 0) AS balance
FROM
  customers c
LEFT JOIN (
  SELECT customer_id, user_id, sum(total_amount - amount_paid_at_sale) AS total_udhaar
  FROM sales
  GROUP BY customer_id, user_id
) sales_total ON c.id = sales_total.customer_id AND c.user_id = sales_total.user_id
LEFT JOIN (
  SELECT customer_id, user_id, sum(abs(amount_paid)) AS total_wusooli
  FROM customer_payments
  GROUP BY customer_id, user_id
) payments_total ON c.id = payments_total.customer_id AND c.user_id = payments_total.user_id
-- --- YEH NAYA HISSA HAI ---
LEFT JOIN (
  -- Hum ne customer ko jo cash wapis kiya, usko yahan جمع kar rahe hain.
  SELECT customer_id, user_id, sum(amount_paid) AS total_payout
  FROM credit_payouts
  GROUP BY customer_id, user_id
) payouts_debit ON c.id = payouts_debit.customer_id AND c.user_id = payouts_debit.user_id;