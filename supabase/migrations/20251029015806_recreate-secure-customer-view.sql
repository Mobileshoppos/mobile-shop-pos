-- Hum view ko dobara bana rahe hain, lekin is baar aek khaas hidayat ke saath.
CREATE OR REPLACE VIEW public.customers_with_balance
-- --- YEH SAB SE AHAM HIDAYAT HAI ---
-- Yeh line view ko kehti hai ke 'Tumhare maalik ke paas master key ho sakti hai, 
-- lekin jab aam user tumse data maange, to tum us aam user ke rules hi follow karoge'.
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.name,
  c.phone_number,
  c.address,
  c.user_id,
  COALESCE(sales_total.total_udhaar, 0::double precision) - COALESCE(payments_total.total_wusooli, 0::double precision) AS balance
FROM
  customers c
LEFT JOIN (
  SELECT
    sales.customer_id,
    sales.user_id,
    sum(sales.total_amount - sales.amount_paid_at_sale::double precision) AS total_udhaar
  FROM
    sales
  GROUP BY
    sales.customer_id,
    sales.user_id
) sales_total ON c.id = sales_total.customer_id AND c.user_id = sales_total.user_id
LEFT JOIN (
  SELECT
    customer_payments.customer_id,
    customer_payments.user_id,
    sum(abs(customer_payments.amount_paid)) AS total_wusooli
  FROM
    customer_payments
  GROUP BY
    customer_payments.customer_id,
    customer_payments.user_id
) payments_total ON c.id = payments_total.customer_id AND c.user_id = payments_total.user_id;