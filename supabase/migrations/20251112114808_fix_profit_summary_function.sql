-- Function ko dobara banayein (CREATE OR REPLACE) taake update ho jaye
CREATE OR REPLACE FUNCTION public.get_daily_profit_summary(start_date date, end_date date)
RETURNS TABLE(report_date date, total_revenue numeric, total_cost numeric, total_expenses numeric, net_profit numeric)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(start_date, end_date, '1 day'::interval)::date AS day
    ),
    daily_sales AS (
        SELECT
            date_trunc('day', created_at)::date AS day,
            SUM(total_amount)::numeric AS revenue
        FROM sales
        WHERE created_at::date BETWEEN start_date AND end_date
        AND user_id = auth.uid() -- User ID ka check shamil kiya gaya hai
        GROUP BY 1
    ),
    daily_costs AS (
        SELECT
            date_trunc('day', si.created_at)::date AS day,
            -- === YEH LINE THEEK HO GAYI HAI ===
            -- Ab hum inventory se asal purchase_price le rahe hain
            SUM(si.quantity * i.purchase_price)::numeric AS cost
        FROM sale_items si
        -- === AUR YEH JOIN BHI THEEK HO GAYA HAI ===
        -- products table ke bajaye ab inventory table se join kar rahe hain
        JOIN inventory i ON si.inventory_id = i.id
        WHERE si.created_at::date BETWEEN start_date AND end_date
        AND si.user_id = auth.uid() -- User ID ka check shamil kiya gaya hai
        GROUP BY 1
    ),
    daily_expenses AS (
        SELECT
            expense_date AS day,
            SUM(amount) AS expenses
        FROM expenses
        WHERE expense_date BETWEEN start_date AND end_date
        AND user_id = auth.uid() -- User ID ka check shamil kiya gaya hai
        GROUP BY 1
    )
    SELECT
        ds.day AS report_date,
        COALESCE(s.revenue, 0) AS total_revenue,
        COALESCE(c.cost, 0) AS total_cost,
        COALESCE(e.expenses, 0) AS total_expenses,
        (COALESCE(s.revenue, 0) - COALESCE(c.cost, 0) - COALESCE(e.expenses, 0)) AS net_profit
    FROM date_series ds
    LEFT JOIN daily_sales s ON ds.day = s.day
    LEFT JOIN daily_costs c ON ds.day = c.day
    LEFT JOIN daily_expenses e ON ds.day = e.day
    ORDER BY ds.day;
END;
$$;