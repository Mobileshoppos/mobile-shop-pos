-- supabase/migrations/[TIMESTAMP]_create_sales_history_view.sql

CREATE OR REPLACE VIEW sales_history_view AS
SELECT
    s.id AS sale_id,
    s.created_at,
    s.customer_id,
    COALESCE(c.name, 'Walk-in Customer') AS customer_name,
    s.total_amount,
    s.payment_status,
    s.user_id,
    p.full_name AS salesperson_name,
    (SELECT SUM(si.quantity) FROM sale_items si WHERE si.sale_id = s.id) AS total_items
FROM
    sales s
LEFT JOIN
    customers c ON s.customer_id = c.id
LEFT JOIN
    profiles p ON s.user_id = p.id
ORDER BY
    s.created_at DESC;