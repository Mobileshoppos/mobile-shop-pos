-- =================================================================
-- FINAL SECURITY FIX for Reports.
-- Reverting the report function back to SECURITY INVOKER.
-- =================================================================

-- The 'get_supplier_purchase_report' function was incorrectly set to
-- SECURITY DEFINER, which caused it to bypass RLS policies and show
-- data from all users.
-- By changing it back to SECURITY INVOKER (the default and correct setting
-- for read-only functions), we ensure it respects RLS and only shows
-- data belonging to the currently logged-in user.

CREATE OR REPLACE FUNCTION public.get_supplier_purchase_report(start_date date, end_date date)
 RETURNS TABLE(supplier_name text, total_purchase_amount numeric, purchase_count bigint)
 LANGUAGE sql
 STABLE
 SECURITY INVOKER -- THE FIX IS HERE: Changed from DEFINER to INVOKER
AS $$
    SELECT
        s.name AS supplier_name,
        SUM(p.total_amount) AS total_purchase_amount,
        COUNT(p.id) AS purchase_count
    FROM
        public.purchases p
    JOIN
        public.suppliers s ON p.supplier_id = s.id
    WHERE
        p.purchase_date >= start_date AND p.purchase_date <= end_date
    GROUP BY
        s.name
    ORDER BY
        total_purchase_amount DESC;
$$;